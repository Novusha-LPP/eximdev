import mongoose from "mongoose";
import AuditTrailModel from "../model/auditTrailModel.mjs";
import router from "../routes/audit/auditTrail.mjs";

await mongoose.connect("mongodb://localhost:27017/audit_scratch_test", { serverSelectionTimeoutMS: 4000 });
await mongoose.connection.dropDatabase();
const mk = (iso, username) => ({ documentType: "Job", job_no: "1", year: "25-26", userId: username, username, action: "UPDATE", heading: "h", timestamp: new Date(iso), changes: [{ field: "s", fieldPath: "s", changeType: "MODIFIED", oldValue: "a", newValue: "b" }] });
await AuditTrailModel.insertMany([
  mk("2026-10-30T19:00:00Z", "late"),   // 31 Oct 00:30 IST
  mk("2026-10-30T18:29:00Z", "edge1"),  // 30 Oct 23:59 IST
  mk("2026-10-30T18:30:00Z", "edge2"),  // 31 Oct 00:00 IST
  mk("2026-10-29T05:00:00Z", "early"),  // 29 Oct 10:30 IST
]);
const call = (path, query) => new Promise((resolve) => {
  const layer = router.stack.find((l) => l.route?.path === path && l.route.methods.get);
  const hs = layer.route.stack;
  hs[hs.length - 1].handle({ query, params: {}, user: { role: "Admin" } }, { json: resolve, status: (c) => ({ json: (b) => resolve({ status: c, ...b }) }) });
});
const tl = await call("/api/audit-trail/activity-timeline", { fromDate: "2026-10-29", toDate: "2026-10-31" });
console.log("timeline:", JSON.stringify(tl.dailyActivity.map((d) => `${d.date}=${d.actions}`)));
const st = await call("/api/audit-trail/stats", { fromDate: "2026-10-31", toDate: "2026-10-31", groupBy: "day" });
console.log("stats 31 Oct only:", st.summary.totalActions, "(expect 2: edge2 + late) ", JSON.stringify(st.dailyActivity));
const feed = await call("/api/audit-trail", { fromDate: "2026-10-30", toDate: "2026-10-30" });
console.log("feed 30 Oct only:", feed.auditTrail.map((e) => e.username).sort().join(","), "(expect early excluded; edge1 only)");
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
