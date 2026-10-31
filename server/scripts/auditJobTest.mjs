import mongoose from "mongoose";
import { context } from "../utils/context.mjs";
import auditPlugin from "../plugins/auditPlugin.mjs";
import AuditTrailModel from "../model/auditTrailModel.mjs";

await mongoose.connect("mongodb://localhost:27017/audit_scratch_test", { serverSelectionTimeoutMS: 4000 });
await mongoose.connection.dropDatabase();

const schema = new mongoose.Schema({
  job_no: String, year: String, branch_code: String, trade_type: String, mode: String, status: String,
  containers: [{ no: String, size: String }],
});
schema.plugin(auditPlugin, { documentType: "Job", trackQueryUpdates: true, logSystem: true });
const Job = mongoose.model("Job", schema);
const as = (username, fn) => context.run({ user: { username, role: "User" }, req: { originalUrl: "/x", method: "PUT", get: () => "ua" } }, fn);
const log = async (label) => {
  const rows = await AuditTrailModel.find({ documentType: "Job" }).sort({ timestamp: 1, _id: 1 }).lean();
  console.log(`\n== ${label} (${rows.length} entries)`);
  rows.forEach((r) => console.log(r.username.padEnd(7), r.action.padEnd(6), r.job_no + "/" + r.year, r.changes.map((c) => `${c.fieldPath}: ${JSON.stringify(c.oldValue)} -> ${JSON.stringify(c.newValue)}`).join(" | ")));
};

let job;
await as("alice", async () => { job = await Job.create({ job_no: "101", year: "25-26", branch_code: "AMD", trade_type: "IMP", mode: "SEA", status: "Pending", containers: [{ no: "A1" }, { no: "B2" }, { no: "C3" }] }); });
await as("bob", async () => { const j = await Job.findById(job._id); j.status = "Done"; await j.save(); });
await as("carol", async () => { await Job.findOneAndUpdate({ _id: job._id }, { $set: { mode: "AIR" } }); });
await as("dave", async () => { await Job.updateOne({ _id: job._id }, { $set: { status: "Billing" } }); });
// projected load + save: must not report unselected fields as added
await as("erin", async () => { const j = await Job.findById(job._id).select("status"); j.status = "Closed"; await j.save(); });
// remove the middle container: must be ONE removal, not B2/C3 cascading
await as("frank", async () => { const j = await Job.findById(job._id); j.containers.pull(j.containers[1]._id); await j.save(); });
// no user context: logged as system
await Job.updateOne({ _id: job._id }, { $set: { status: "Archived" } });
await log("timeline");

for (const op of [() => AuditTrailModel.updateOne({}, { $set: { username: "x" } }), () => AuditTrailModel.deleteMany({ documentType: "Job" }), () => AuditTrailModel.deleteMany({})]) {
  try { await op(); console.log("NOT BLOCKED"); } catch (e) { console.log("blocked:", e.message); }
}
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
