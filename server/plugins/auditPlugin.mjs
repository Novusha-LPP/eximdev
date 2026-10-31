import mongoose from "mongoose";
import { getContext } from "../utils/context.mjs";
import { findChanges, logAuditTrail, generateHeading } from "../services/auditTrailService.mjs";

/**
 * Mongoose Plugin for Audit Trail
 * Automatically logs changes on save(), findOneAndUpdate(), updateOne() and updateMany().
 *
 * Every entry is an append-only record of ONE write, diffed against the document as it was
 * immediately before that write, and stamped with the acting user (or "system" for background work).
 * Model.bulkWrite() has no middleware in Mongoose 6, so callers of bulkWrite must log explicitly.
 */

// updateMany beyond this many documents is logged as a single bulk entry instead of per-document diffs
const MAX_DIFFED_DOCS = 200;

const toPlain = (doc) => (doc && typeof doc.toObject === "function" ? doc.toObject() : doc);
const topSegment = (path) => String(path || "").split(".")[0];

export default function auditPlugin(schema, options = {}) {
    // trackQueryUpdates: also log updateOne/updateMany; logSystem: keep writes made outside a user request
    const { documentType = "Unknown", trackQueryUpdates = false, logSystem = false } = options;

    const actor = () => {
        const ctx = getContext();
        return {
            ctx,
            username: ctx?.user?.username || "system",
            role: ctx?.user?.role || (ctx?.user ? undefined : "System"),
        };
    };

    const logChanges = async (doc, docAction, originalDoc = null, onlyTopLevel = null) => {
        const { ctx, username, role } = actor();
        if (!ctx?.user && !logSystem) return;
        const docObj = toPlain(doc);
        // Identifiers may be missing from a projected document; fall back to the pre-write copy
        const ident = { ...(originalDoc || {}), ...docObj };
        if (ident._id && ident.job_no === undefined && ident.branch_code === undefined && schema.path("job_no")) {
            const extra = await doc.constructor.findById(ident._id).select("job_no year trade_type mode branch_code branch_id").lean();
            Object.assign(ident, extra);
        }
        const changes = [];
        const action = docAction;

        if (action === "CREATE") {
            Object.keys(docObj).forEach((key) => {
                if (key.startsWith("_") || key === "__v" || key === "updatedAt" || key === "createdAt") return;
                changes.push({ field: key, fieldPath: key, oldValue: null, newValue: docObj[key], changeType: "ADDED" });
            });
            if (changes.length === 0) {
                changes.push({ field: "document", fieldPath: "", oldValue: null, newValue: `${documentType} created`, changeType: "ADDED" });
            }
        } else if (action === "UPDATE") {
            if (!originalDoc) return;
            let diffs = findChanges(originalDoc, docObj);
            // When the loaded document was a projection, fields that were never selected look "added";
            // restrict the diff to what this write actually touched.
            if (onlyTopLevel) diffs = diffs.filter((d) => onlyTopLevel.has(topSegment(d.fieldPath)));
            if (diffs.length === 0) return;
            changes.push(...diffs);
        } else if (action === "DELETE") {
            changes.push({ field: "document", fieldPath: "", oldValue: "Existed", newValue: null, changeType: "REMOVED" });
        }

        if (changes.length === 0) return;

        await logAuditTrail({
            documentId: docObj._id,
            documentType,
            job_no: ident.job_no,
            year: ident.year,
            trade_type: ident.trade_type,
            mode: ident.mode,
            branchId: ident.branch_id || ident.branchId,
            branch_code: ident.branch_code,
            userId: username,
            username,
            userRole: role,
            action,
            heading: generateHeading(documentType, action, ident, changes),
            changes,
            endpoint: ctx?.req?.originalUrl || "Mongoose Plugin",
            method: ctx?.req?.method || (action === "DELETE" ? "DELETE" : "SAVE"),
            userAgent: ctx?.req?.get?.("User-Agent"),
            reason: ctx?.req?.body?.reason || ctx?.req?.query?.reason,
            timestamp: new Date(),
        });
    };

    // --- Document hooks ---

    schema.post("init", function () {
        this._originalDoc = this.toObject();
    });

    schema.pre("save", function (next) {
        this._isNewDoc = this.isNew;
        this._auditTouched = this.isNew ? null : new Set(this.modifiedPaths().map(topSegment));
        next();
    });

    schema.post("save", async function (doc) {
        try {
            await logChanges(doc, this._isNewDoc ? "CREATE" : "UPDATE", this._originalDoc, this._auditTouched);
        } catch (err) {
            console.error(`❌ AuditPlugin(${documentType}): save log failed`, err);
        }
        // Next save() on this same instance must diff against what was just written
        this._originalDoc = doc.toObject();
    });

    // --- Query hooks ---

    schema.pre("findOneAndUpdate", async function () {
        this._originalDoc = await this.model.findOne(this.getFilter()).session(this.getOptions().session || null).lean();
    });

    schema.post("findOneAndUpdate", async function (doc) {
        try {
            // With { new: false } the returned doc is the pre-image; always re-read the stored result
            const after = this._originalDoc
                ? await this.model.findById(this._originalDoc._id).session(this.getOptions().session || null).lean()
                : doc;
            if (after && this._originalDoc) await logChanges(after, "UPDATE", this._originalDoc);
        } catch (err) {
            console.error(`❌ AuditPlugin(${documentType}): findOneAndUpdate log failed`, err);
        }
    });

    for (const op of trackQueryUpdates ? ["updateOne", "updateMany"] : []) {
        schema.pre(op, async function () {
            const session = this.getOptions().session || null;
            const filter = this.getFilter();
            const matched = await this.model.countDocuments(filter).session(session);
            this._auditBulk = matched > MAX_DIFFED_DOCS ? matched : 0;
            this._auditBefore =
                !this._auditBulk && matched > 0
                    ? await this.model.find(filter).limit(op === "updateOne" ? 1 : MAX_DIFFED_DOCS).session(session).lean()
                    : [];
        });

        schema.post(op, async function () {
            try {
                if (this._auditBulk) {
                    const { ctx, username, role } = actor();
                    await logAuditTrail({
                        documentType,
                        userId: username,
                        username,
                        userRole: role,
                        action: "BULK_CREATE_UPDATE",
                        heading: `${documentType} bulk update (${this._auditBulk} documents)`,
                        changes: [{ field: "update", fieldPath: "", oldValue: null, newValue: this.getUpdate(), changeType: "BULK_OPERATION" }],
                        endpoint: ctx?.req?.originalUrl || "Mongoose Plugin",
                        method: ctx?.req?.method || "SAVE",
                        timestamp: new Date(),
                    });
                    return;
                }
                const before = this._auditBefore || [];
                if (before.length === 0) return;
                const session = this.getOptions().session || null;
                const afterDocs = await this.model.find({ _id: { $in: before.map((d) => d._id) } }).session(session).lean();
                const afterById = new Map(afterDocs.map((d) => [String(d._id), d]));
                for (const orig of before) {
                    const after = afterById.get(String(orig._id));
                    if (after) await logChanges(after, "UPDATE", orig);
                }
            } catch (err) {
                console.error(`❌ AuditPlugin(${documentType}): ${op} log failed`, err);
            }
        });
    }

    if (trackQueryUpdates) {
        // insertMany() runs no per-document hooks
        schema.post("insertMany", function (docs) {
            const list = Array.isArray(docs) ? docs : [docs];
            setImmediate(async () => {
                for (const d of list) {
                    try {
                        await logChanges(d, "CREATE");
                    } catch (err) {
                        console.error(`❌ AuditPlugin(${documentType}): insertMany log failed`, err);
                    }
                }
            });
        });

        // bulkWrite() has no middleware either: snapshot the targeted documents, run the real write,
        // then diff each document against its snapshot. Wrapping it here covers every caller
        // (Excel import, reconciliation, backfills, migrations) without touching them.
        schema.statics.bulkWrite = async function (ops, opts) {
            const run = () => mongoose.Model.bulkWrite.call(this, ops, opts);
            if (!Array.isArray(ops) || ops.length === 0) return run();

            let before = new Map();
            try {
                const filters = ops.map((op) => (op.updateOne || op.updateMany || op.replaceOne || op.deleteOne || op.deleteMany)?.filter);
                const idOnly = (f) => f && Object.keys(f).length === 1 && f._id !== undefined && typeof f._id !== "object";
                const found = [];
                if (filters.every((f) => f === undefined || idOnly(f))) {
                    const ids = filters.filter(Boolean).map((f) => f._id);
                    for (let i = 0; i < ids.length; i += 500) {
                        found.push(...(await this.find({ _id: { $in: ids.slice(i, i + 500) } }).lean()));
                    }
                } else {
                    const real = filters.map((f, i) => ({ f, many: !!(ops[i].updateMany || ops[i].deleteMany) })).filter((x) => x.f);
                    for (let i = 0; i < real.length; i += 25) {
                        const batch = await Promise.all(
                            real.slice(i, i + 25).map(({ f, many }) => this.find(f).limit(many ? MAX_DIFFED_DOCS : 1).lean())
                        );
                        batch.forEach((b) => found.push(...b));
                    }
                }
                before = new Map(found.map((d) => [String(d._id), d]));
            } catch (err) {
                console.error(`❌ AuditPlugin(${documentType}): bulkWrite snapshot failed`, err);
            }

            const result = await run();

            try {
                const created = [
                    ...Object.values(result?.insertedIds || {}),
                    ...Object.values(result?.upsertedIds || {}),
                ].map(String);
                const ids = [...new Set([...before.keys(), ...created])];
                const after = new Map();
                for (let i = 0; i < ids.length; i += 500) {
                    (await this.find({ _id: { $in: ids.slice(i, i + 500) } }).lean()).forEach((d) => after.set(String(d._id), d));
                }
                setImmediate(async () => {
                    for (const id of ids) {
                        try {
                            const prev = before.get(id);
                            const next = after.get(id);
                            if (!prev && next) await logChanges(next, "CREATE");
                            else if (prev && !next) await logChanges(prev, "DELETE");
                            else if (prev && next) await logChanges(next, "UPDATE", prev);
                        } catch (err) {
                            console.error(`❌ AuditPlugin(${documentType}): bulkWrite log failed`, err);
                        }
                    }
                });
            } catch (err) {
                console.error(`❌ AuditPlugin(${documentType}): bulkWrite diff failed`, err);
            }
            return result;
        };
    }

    schema.post("findOneAndDelete", async function (doc) {
        if (!doc) return;
        try {
            await logChanges(doc, "DELETE");
        } catch (err) {
            console.error(`❌ AuditPlugin(${documentType}): delete log failed`, err);
        }
    });

    schema.post("remove", async function (doc) {
        try {
            await logChanges(doc, "DELETE");
        } catch (err) {
            console.error(`❌ AuditPlugin(${documentType}): remove log failed`, err);
        }
    });
}
