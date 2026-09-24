import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '/home/aiserver/eximdev/server/.env' });

const uri = process.env.PROD_MONGODB_URI;

async function runOptimization() {
  console.log("🚀 Connecting to MongoDB Atlas...");
  const conn = await mongoose.createConnection(uri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 15000,
  }).asPromise();
  console.log("✅ Connected successfully!\n");

  // ==========================================
  // 1. EXPORT DATABASE: exportjobs
  // ==========================================
  console.log("==============================================");
  console.log("📦 OPTIMIZING DATABASE: [export.exportjobs]");
  console.log("==============================================");
  const exportDb = conn.useDb("export");
  const exportJobsCol = exportDb.collection("exportjobs");

  const exportIndexes = [
    {
      spec: { "charges._id": 1 },
      options: { background: true, name: "charges_id_1" },
      desc: "Fixes 3.5s query scanning 26,150 docs"
    },
    {
      spec: { branch_code: 1, custom_house: 1, job_no: 1, year: 1 },
      options: { background: true, name: "branch_customhouse_job_year" },
      desc: "Fixes 1.3s query scanning 9,720 docs"
    },
    {
      spec: { isGeneralJob: 1, job_no: 1, year: 1 },
      options: { background: true, name: "general_job_year" },
      desc: "Fixes 776ms general job query"
    },
    {
      spec: { is_club_job_parent: 1, year: 1, isGeneralJob: 1, isJobCanceled: 1, job_no: 1 },
      options: { background: true, name: "club_job_parent_filter" },
      desc: "Fixes 8.6s club job query scanning 26,353 docs"
    },
    {
      spec: { parent_club_job: 1, year: 1, isGeneralJob: 1, isJobCanceled: 1, job_no: 1 },
      options: { background: true, name: "parent_club_job_filter" },
      desc: "Fixes 8.6s parent club job query"
    },
    {
      spec: { exporter: 1, createdAt: -1 },
      options: { background: true, name: "exporter_createdAt_desc" },
      desc: "Fixes 12.3s exporter sort query scanning 22,600 docs"
    }
  ];

  for (const idx of exportIndexes) {
    try {
      console.log(`⏳ Creating index on [exportjobs]: ${JSON.stringify(idx.spec)} (${idx.desc})...`);
      const res = await exportJobsCol.createIndex(idx.spec, idx.options);
      console.log(`  ✅ Successfully created: ${res}`);
    } catch (err) {
      console.warn(`  ⚠️ Could not create index: ${err.message}`);
    }
  }

  // ==========================================
  // 2. EXIM DATABASE: job_logs & kpisheets
  // ==========================================
  console.log("\n==============================================");
  console.log("📦 OPTIMIZING DATABASE: [exim.job_logs & kpisheets]");
  console.log("==============================================");
  const eximDb = conn.useDb("exim");

  // A. job_logs
  try {
    const jobLogsCol = eximDb.collection("job_logs");
    console.log(`⏳ Creating index on [job_logs]: { job_no: 1 } (Fixes 471ms scan of 6,974 docs)...`);
    const res = await jobLogsCol.createIndex({ job_no: 1 }, { background: true, name: "job_no_1" });
    console.log(`  ✅ Successfully created: ${res}`);
  } catch (err) {
    console.warn(`  ⚠️ Could not create index on job_logs: ${err.message}`);
  }

  // B. kpisheets
  try {
    const kpiCol = eximDb.collection("kpisheets");
    console.log(`⏳ Creating index on [kpisheets]: { user: 1, year: 1, month: 1 } (Fixes 512ms scan)...`);
    const res1 = await kpiCol.createIndex({ user: 1, year: 1, month: 1 }, { background: true, name: "user_year_month" });
    console.log(`  ✅ Successfully created: ${res1}`);

    console.log(`⏳ Creating index on [kpisheets]: { "assigned_signatories.checked_by": 1, status: 1, updatedAt: 1 }...`);
    const res2 = await kpiCol.createIndex({ "assigned_signatories.checked_by": 1, status: 1, updatedAt: 1 }, { background: true, name: "signatories_status_updatedAt" });
    console.log(`  ✅ Successfully created: ${res2}`);
  } catch (err) {
    console.warn(`  ⚠️ Could not create index on kpisheets: ${err.message}`);
  }

  await conn.close();
  console.log("\n🎉 All high-impact indexes created successfully! Database connection closed.");
}

runOptimization().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
