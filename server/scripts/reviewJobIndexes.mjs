/**
 * Review (and optionally drop) indexes on the jobs collection, based on real usage.
 *
 * Read-only by default:
 *   NODE_ENV=production node scripts/reviewJobIndexes.mjs
 *     -> lists every index with its usage count since the database last restarted,
 *        and whether the job schema still declares it.
 *
 * Drop one index (only if it is unused AND no longer declared in the schema, so Mongoose
 * will not recreate it):
 *   NODE_ENV=production node scripts/reviewJobIndexes.mjs --drop <indexName>
 *
 * Usage counts reset when MongoDB restarts; check how long the database has been up
 * (shown below) before trusting a zero. On Atlas, run it against the primary.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import JobModel from "../model/jobModel.mjs";

dotenv.config();

const MONGODB_URI =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_MONGODB_URI
    : process.env.NODE_ENV === "server"
      ? process.env.SERVER_MONGODB_URI
      : process.env.DEV_MONGODB_URI;

const dropIndex = process.argv.includes("--drop") ? process.argv[process.argv.indexOf("--drop") + 1] : null;

const keyOf = (key) => JSON.stringify(key);
// Text indexes are stored as { _fts: "text", _ftsx: 1 }; compare them by their weights instead
const declaredKeys = new Set(
  JobModel.schema.indexes().map(([key]) =>
    Object.values(key).includes("text") ? "text:" + Object.keys(key).sort().join(",") : keyOf(key)
  )
);
const isDeclared = (index) =>
  index.key._fts ? declaredKeys.has("text:" + Object.keys(index.weights || {}).sort().join(",")) : declaredKeys.has(keyOf(index.key));

await mongoose.connect(MONGODB_URI);
try {
  const collection = JobModel.collection;
  const [indexes, stats, serverStatus] = await Promise.all([
    collection.indexes(),
    collection.aggregate([{ $indexStats: {} }]).toArray(),
    mongoose.connection.db.admin().command({ serverStatus: 1 }).catch(() => null),
  ]);
  const usage = new Map(stats.map((s) => [s.name, s.accesses]));

  if (serverStatus?.uptime) {
    console.log(`Database up for ${(serverStatus.uptime / 86400).toFixed(1)} days (usage counts cover this period)\n`);
  }
  console.log(`jobs collection: ${indexes.length} indexes (MongoDB limit: 64)\n`);
  const rows = indexes
    .map((index) => ({
      name: index.name,
      uses: usage.get(index.name)?.ops ?? 0,
      since: usage.get(index.name)?.since,
      inSchema: index.name === "_id_" || isDeclared(index),
    }))
    .sort((a, b) => a.uses - b.uses);
  for (const row of rows) {
    console.log(
      `${String(row.uses).padStart(10)} uses  ${row.inSchema ? "in schema    " : "NOT in schema"}  ${row.name}`
    );
  }
  console.log("\nCandidates to review: indexes with 0 uses over a representative period.");

  if (dropIndex) {
    const row = rows.find((r) => r.name === dropIndex);
    if (!row) throw new Error(`No index named ${dropIndex}`);
    if (row.name === "_id_") throw new Error("Refusing to drop the _id index");
    if (row.inSchema) throw new Error(`${dropIndex} is still declared in the job schema; remove it there first or Mongoose will recreate it`);
    if (row.uses > 0) throw new Error(`${dropIndex} has been used ${row.uses} times; refusing to drop it`);
    await collection.dropIndex(dropIndex);
    console.log(`\nDropped ${dropIndex}`);
  }
} finally {
  await mongoose.disconnect();
}
