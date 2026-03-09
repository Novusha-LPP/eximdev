import { getContext } from "../utils/context.mjs";
import { findChanges, logAuditTrail, generateHeading } from "../services/auditTrailService.mjs";
import mongoose from "mongoose";

/**
 * Mongoose Plugin for Audit Trail
 * Automatically logs changes on save() and findOneAndUpdate()
 */
export default function auditPlugin(schema, options = {}) {
    const { documentType = "Unknown" } = options;

    const logChanges = async (doc, docAction, originalDoc = null) => {
        const ctx = getContext();
        if (!ctx?.user) return;

        const changes = [];
        let action = docAction;

        if (action === "CREATE") {
            const docObj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
            Object.keys(docObj).forEach(key => {
                if (key.startsWith('_') || key === '__v' || key === 'updatedAt' || key === 'createdAt') return;
                changes.push({
                    field: key,
                    fieldPath: key,
                    oldValue: null,
                    newValue: docObj[key],
                    changeType: "ADDED"
                });
            });
            if (changes.length === 0) {
                changes.push({ field: "document", fieldPath: "", oldValue: null, newValue: `${documentType} created`, changeType: "ADDED" });
            }
        } else if (action === "UPDATE") {
            if (!originalDoc) return;
            const diffs = findChanges(originalDoc, typeof doc.toObject === 'function' ? doc.toObject() : doc);
            if (diffs.length === 0) return;
            changes.push(...diffs);
        } else if (action === "DELETE") {
            changes.push({ field: "document", fieldPath: "", oldValue: "Existed", newValue: null, changeType: "REMOVED" });
        }

        if (changes.length > 0) {
            const heading = generateHeading(documentType, action, doc, changes);
            await logAuditTrail({
                documentId: doc._id,
                documentType,
                job_no: doc.job_no,
                year: doc.year,
                branchId: doc.branch_id || doc.branchId,
                branch_code: doc.branch_code,
                userId: ctx.user.username,
                username: ctx.user.username,
                userRole: ctx.user.role,
                action,
                heading,
                changes,
                endpoint: ctx.req?.originalUrl || "Mongoose Plugin",
                method: ctx.req?.method || (action === "DELETE" ? "DELETE" : "SAVE"),
                userAgent: ctx.req?.get("User-Agent"),
            });
        }
    };

    // --- Hooks ---

    schema.post('init', function () {
        this._originalDoc = this.toObject();
    });

    schema.pre('save', function (next) {
        if (this.isNew) {
            this._isNewDoc = true;
        }
        next();
    });

    schema.post('save', async function (doc) {
        const action = this._isNewDoc ? "CREATE" : "UPDATE";
        await logChanges(doc, action, this._originalDoc);
        this._originalDoc = doc.toObject();
    });

    schema.pre('findOneAndUpdate', async function () {
        this._originalDoc = await this.model.findOne(this.getQuery()).lean();
    });

    schema.post('findOneAndUpdate', async function (doc) {
        if (doc) {
            await logChanges(doc, "UPDATE", this._originalDoc);
        }
    });

    schema.post('findOneAndDelete', async function (doc) {
        if (doc) {
            await logChanges(doc, "DELETE");
        }
    });

    schema.post('remove', async function (doc) {
        await logChanges(doc, "DELETE");
    });
}
