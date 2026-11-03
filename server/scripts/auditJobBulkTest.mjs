import mongoose from "mongoose";
import { context } from "../utils/context.mjs";
import auditPlugin from "../plugins/auditPlugin.mjs";
import AuditTrailModel from "../model/auditTrailModel.mjs";

await mongoose.connect("mongodb://localhost:27017/audit_scratch_test", { serverSelectionTimeoutMS: 4000 });
await mongoose.connection.dropDatabase();
const schema = new mongoose.Schema({ job_no: String, year: String, branch_code: String, status: String });
schema.plugin(auditPlugin, { documentType: "Job", trackQueryUpdates: true, logSystem: true });
const Job = mongoose.model("Job", schema);
const as = (u, fn) => context.run({ user: { username: u, role: "User" }, req: { originalUrl: "/import", method: "POST", get: () => "ua" } }, fn);
const wait = () => new Promise((r) => setTimeout(r, 400));

let ins;
await as("importer", async () => { ins = await Job.insertMany([{ job_no: "1", year: "25", status: "New" }, { job_no: "2", year: "25", status: "New" }]); });
await as("importer", () => Job.bulkWrite([
  { updateOne: { filter: { job_no: "1", year: "25" }, update: { $set: { status: "Imported" } }, upsert: true } },   // updates existing
  { updateOne: { filter: { job_no: "3", year: "25" }, update: { $set: { status: "Fresh", branch_code: "AMD" } }, upsert: true } }, // creates
  { updateMany: { filter: { year: "25", status: "New" }, update: { $set: { status: "Swept" } } } },
]));
await wait();
await Job.bulkWrite([{ updateOne: { filter: { _id: ins[1]._id }, update: { $set: { status: "Reconciled" } } } }]); // no user => system
await wait();
await as("admin", () => Job.bulkWrite([{ deleteOne: { filter: { job_no: "3" } } }]));
await wait();
const rows = await AuditTrailModel.find({}).sort({ timestamp: 1, _id: 1 }).lean();
rows.forEach((r) => console.log(r.username.padEnd(9), r.action.padEnd(7), (r.job_no || "?") + "/" + r.year, r.changes.map((c) => `${c.fieldPath}:${JSON.stringify(c.oldValue)}->${JSON.stringify(c.newValue)}`).join(" | ").slice(0, 110)));
console.log("total", rows.length);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
