import mongoose from "mongoose";
import { getContext } from "../utils/context.mjs";
import { publishJobChange } from "../services/jobChangeBus.mjs";

/**
 * Mongoose plugin that publishes a job change event after every write,
 * so open job pages, job lists, caches and status reconciliation update in real time.
 *
 * Model.bulkWrite() has no middleware in Mongoose 6; callers of bulkWrite publish explicitly.
 */

const currentUsername = () => getContext()?.user?.username || null;

const isObjectIdLike = (value) =>
  value instanceof mongoose.Types.ObjectId || value?._bsontype === "ObjectID" || value?._bsontype === "ObjectId";

// _id values targeted by a query filter, or null when the filter does not pin documents by _id
const idsFromFilter = (filter) => {
  const idCond = filter?._id;
  if (idCond === undefined || idCond === null) return null;
  if (typeof idCond === "string" || isObjectIdLike(idCond)) return [idCond];
  if (Array.isArray(idCond.$in)) return idCond.$in;
  if (idCond.$eq !== undefined) return [idCond.$eq];
  return null;
};

// Document-level calls of these hooks have no query; never let publishing break a write
const isQuery = (ctx) => typeof ctx?.getFilter === "function";

const yearsFromFilter = (filter) => (typeof filter?.year === "string" ? [filter.year] : []);

const modifiedCountOf = (result) =>
  result?.modifiedCount ?? result?.nModified ?? result?.result?.nModified;

// Defer publishing until a transaction finishes, so listeners never read uncommitted data
const publishAfterCommit = (session, change) => {
  if (session && typeof session.inTransaction === "function" && session.inTransaction()) {
    session.once("ended", () => publishJobChange(change));
    return;
  }
  publishJobChange(change);
};

export default function jobChangePlugin(schema) {
  schema.post("save", function (doc) {
    publishAfterCommit(doc.$session?.(), {
      ids: [doc._id],
      years: [doc.year],
      by: currentUsername(),
      source: "save",
    });
  });

  schema.post("insertMany", function (docs) {
    const list = Array.isArray(docs) ? docs : [docs];
    publishJobChange({
      ids: list.map((d) => d?._id),
      years: list.map((d) => d?.year),
      by: currentUsername(),
      source: "insert",
    });
  });

  const publishForDocResult = function (result) {
    if (!isQuery(this)) return;
    // rawResult: true returns { value, ok }; otherwise the document itself
    const doc = result && result.ok !== undefined && "value" in result ? result.value : result;
    const filter = this.getFilter();
    const by = currentUsername();
    const session = this.getOptions()?.session;
    if (doc?._id) {
      publishAfterCommit(session, { ids: [doc._id], years: [doc.year], by, source: "update" });
    } else if (idsFromFilter(filter)) {
      publishAfterCommit(session, { ids: idsFromFilter(filter), years: yearsFromFilter(filter), by, source: "update" });
    }
  };

  schema.post("findOneAndUpdate", publishForDocResult);
  schema.post("findOneAndReplace", publishForDocResult);
  schema.post("findOneAndDelete", publishForDocResult);
  schema.post("findOneAndRemove", publishForDocResult);

  const publishForUpdateResult = function (result) {
    if (!isQuery(this) || modifiedCountOf(result) === 0) return;
    const filter = this.getFilter();
    const by = currentUsername();
    const session = this.getOptions()?.session;
    const ids = idsFromFilter(filter);
    if (ids) {
      publishAfterCommit(session, { ids, years: yearsFromFilter(filter), by, source: "update" });
      return;
    }
    // Filter does not name the job by _id: resolve it without delaying the request
    const model = this.model;
    const years = yearsFromFilter(filter);
    model
      .find(filter)
      .select("_id year")
      .limit(50)
      .lean()
      .then((docs) => {
        if (docs.length > 0) {
          publishAfterCommit(session, {
            ids: docs.map((d) => d._id),
            years: docs.map((d) => d.year),
            by,
            source: "update",
          });
        } else {
          publishAfterCommit(session, { ids: null, years, by, source: "update" });
        }
      })
      .catch(() => publishAfterCommit(session, { ids: null, years, by, source: "update" }));
  };

  schema.post("updateOne", publishForUpdateResult);
  schema.post("update", publishForUpdateResult);
  schema.post("replaceOne", publishForUpdateResult);

  schema.post("updateMany", function (result) {
    if (!isQuery(this) || modifiedCountOf(result) === 0) return;
    const filter = this.getFilter();
    publishAfterCommit(this.getOptions()?.session, {
      ids: idsFromFilter(filter),
      years: yearsFromFilter(filter),
      by: currentUsername(),
      source: "update",
    });
  });

  const publishForDelete = function () {
    if (!isQuery(this)) return;
    const filter = this.getFilter();
    publishAfterCommit(this.getOptions()?.session, {
      ids: idsFromFilter(filter),
      years: yearsFromFilter(filter),
      by: currentUsername(),
      source: "delete",
    });
  };

  schema.post("deleteOne", publishForDelete);
  schema.post("deleteMany", publishForDelete);
}
