import mongoose from "mongoose";
import AuditTrailModel from "../model/auditTrailModel.mjs";
import router from "../routes/audit/auditTrail.mjs";

await mongoose.connect("mongodb://localhost:27017/audit_scratch_test");
await mongoose.connection.dropDatabase();
const A = new mongoose.Types.ObjectId(), B = new mongoose.Types.ObjectId();
const mk = (documentId, job_no, year, username, t, branch_code = "AMD") => ({ documentId, documentType: "Job", job_no, year, branch_code, userId: username, username, action: "UPDATE", heading: "h", timestamp: new Date(t), changes: [{ field: "status", fieldPath: "status", changeType: "MODIFIED", oldValue: "a", newValue: "b" }] });
await AuditTrailModel.insertMany([mk(A, "101", "25-26", "bob", "2026-01-01"), mk(A, "101", "25-26", "carol", "2026-01-02"), mk(B, "101", "24-25", "bob", "2025-01-01", "MUM"), mk(B, "102", "24-25", "dave", "2025-02-01", "MUM")]);

const call = (path, query) => new Promise((resolve) => {
  const layer = router.stack.find((l) => l.route?.path === path && l.route.methods.get);
  const handlers = layer.route.stack;
  const req = { query, params: {}, user: { role: "Admin" } };
  handlers[handlers.length - 1].handle(req, { json: resolve, status: (c) => ({ json: (b) => resolve({ status: c, ...b }) }) });
});
const jobs = await call("/api/audit-trail/jobs", { year: "25-26" });
console.log("jobs 25-26:", JSON.stringify(jobs.jobs.map((j) => [j.job_no, j.year, j.totalActions, j.lastUser, j.users.sort()])), "years:", jobs.years);
const same = await call("/api/audit-trail/jobs", { search: "101" });
console.log("search 101 -> distinct jobs:", same.jobs.length, "(same job_no, different year/branch kept apart)");
const tl = await call("/api/audit-trail/job-timeline", { documentId: String(A) });
console.log("timeline order:", tl.entries.map((e) => e.username), "users:", tl.users, "total:", tl.pagination.totalItems);
const f = await call("/api/audit-trail/job-timeline", { documentId: String(A), username: "bob" });
console.log("filtered by bob:", f.entries.length, "users list still:", f.users);
console.log("no id:", (await call("/api/audit-trail/job-timeline", {})).status);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
