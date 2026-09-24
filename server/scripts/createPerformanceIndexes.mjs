import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const uri =
  process.env.PROD_MONGODB_URI ||
  process.env.SERVER_MONGODB_URI ||
  process.env.DEV_MONGODB_URI;

if (!uri) {
  console.error("❌ No MongoDB URI found in environment variables.");
  process.exit(1);
}

async function runIndexOptimization() {
  try {
    console.log("🚀 Connecting to MongoDB...");
    await mongoose.connect(uri, {
      maxPoolSize: 10,
    });
    console.log("✅ Connected successfully!\n");

    const eximDb = mongoose.connection.useDb("exim");
    const exportDb = mongoose.connection.useDb("export");

    // ==========================================
    // 1. EXIM DATABASE INDEXES
    // ==========================================
    console.log("==============================================");
    console.log("📦 Optimizing Database: [exim]");
    console.log("==============================================\n");

    // A. graph_notifications
    console.log("--- 1. Collection: graph_notifications ---");
    const graphCol = eximDb.collection("graph_notifications");
    try {
      console.log('  ⏳ Creating index on [graph_notifications]: {"message_id":1}...');
      const res = await graphCol.createIndex({ message_id: 1 }, { background: true });
      console.log(`  ✅ Successfully created index: ${res}`);
    } catch (e) {
      console.log(`  ℹ️  ${e.message}`);
    }

    // B. jobs (Import jobs)
    console.log("\n--- 2. Collection: jobs ---");
    const jobsCol = eximDb.collection("jobs");
    const jobsIndexes = [
      { spec: { "charges._id": 1 }, name: "charges._id_1" },
      { spec: { mode: 1, be_no: 1, status: 1, out_of_charge: 1 }, name: "mode_be_status_ooc" },
      { spec: { branch_id: 1, year: 1, detailed_status: 1 }, name: "branch_year_detailed_status" },
      { spec: { importer: 1, year: 1, status: 1 }, name: "importer_year_status" },
      { spec: { custom_house: 1, year: 1, status: 1 }, name: "custom_house_year_status" }
    ];

    for (const idx of jobsIndexes) {
      try {
        console.log(`  ⏳ Creating index on [jobs]: ${JSON.stringify(idx.spec)}...`);
        const res = await jobsCol.createIndex(idx.spec, { background: true, name: idx.name });
        console.log(`  ✅ Successfully created index: ${res}`);
      } catch (e) {
        console.log(`  ℹ️  ${e.message}`);
      }
    }

    // C. paymentrequests (prdatas)
    console.log("\n--- 3. Collection: paymentrequests ---");
    const prCol = eximDb.collection("paymentrequests");
    const prIndexes = [
      { spec: { isApproved: 1, isRejected: 1, createdAt: -1 }, name: "pr_approval_date" },
      { spec: { jobNo: 1 }, name: "jobNo_1" },
      { spec: { importer: 1 }, name: "importer_1" }
    ];

    for (const idx of prIndexes) {
      try {
        console.log(`  ⏳ Creating index on [paymentrequests]: ${JSON.stringify(idx.spec)}...`);
        const res = await prCol.createIndex(idx.spec, { background: true, name: idx.name });
        console.log(`  ✅ Successfully created index: ${res}`);
      } catch (e) {
        console.log(`  ℹ️  ${e.message}`);
      }
    }

    // D. audittrails
    console.log("\n--- 4. Collection: audittrails ---");
    const auditCol = eximDb.collection("audittrails");
    const auditIndexes = [
      { spec: { createdAt: -1 }, name: "createdAt_-1" },
      { spec: { documentType: 1, createdAt: -1 }, name: "docType_createdAt" }
    ];

    for (const idx of auditIndexes) {
      try {
        console.log(`  ⏳ Creating index on [audittrails]: ${JSON.stringify(idx.spec)}...`);
        const res = await auditCol.createIndex(idx.spec, { background: true, name: idx.name });
        console.log(`  ✅ Successfully created index: ${res}`);
      } catch (e) {
        console.log(`  ℹ️  ${e.message}`);
      }
    }

    // ==========================================
    // 2. EXPORT DATABASE INDEXES
    // ==========================================
    console.log("\n==============================================");
    console.log("📦 Optimizing Database: [export]");
    console.log("==============================================\n");

    // A. exportjobs
    console.log("--- 1. Collection: exportjobs ---");
    const exportJobsCol = exportDb.collection("exportjobs");
    const exportJobsIndexes = [
      {
        spec: {
          branch_code: 1,
          custom_house: 1,
          status: 1,
          year: 1,
          detailedStatus: 1,
          isGeneralJob: 1,
          isJobCanceled: 1,
          job_no: 1
        },
        name: "export_custom_house_filter"
      },
      {
        spec: {
          branch_code: 1,
          port_of_loading: 1,
          status: 1,
          year: 1,
          detailedStatus: 1,
          isGeneralJob: 1,
          isJobCanceled: 1,
          job_no: 1
        },
        name: "export_pol_filter"
      },
      { spec: { jobNumber: 1 }, name: "jobNumber_1" },
      { spec: { job_no: 1, year: 1 }, name: "job_no_year" },
      { spec: { "containers.containerNo": 1 }, name: "containers_containerNo_1" },
      { spec: { "container_nos.container_number": 1 }, name: "container_nos_container_number_1" },
      { spec: { container_no: 1 }, name: "container_no_1" },
      { spec: { parent_club_job: 1 }, name: "parent_club_job_1" },
      { spec: { exporter: 1, year: 1, status: 1 }, name: "exporter_year_status" }
    ];

    for (const idx of exportJobsIndexes) {
      try {
        console.log(`  ⏳ Creating index on [exportjobs]: ${JSON.stringify(idx.spec)}...`);
        const res = await exportJobsCol.createIndex(idx.spec, { background: true, name: idx.name });
        console.log(`  ✅ Successfully created index: ${res}`);
      } catch (e) {
        console.log(`  ℹ️  ${e.message}`);
      }
    }

    // B. apilogs
    console.log("\n--- 2. Collection: apilogs ---");
    const apiLogsCol = exportDb.collection("apilogs");
    try {
      console.log('  ⏳ Creating index on [apilogs]: {"createdAt":-1}...');
      const res = await apiLogsCol.createIndex({ createdAt: -1 }, { background: true });
      console.log(`  ✅ Successfully created index: ${res}`);
    } catch (e) {
      console.log(`  ℹ️  ${e.message}`);
    }

    console.log("\n==============================================");
    console.log("🎉 All Performance Indexes Created Successfully!");
    console.log("==============================================\n");
  } catch (error) {
    console.error("❌ Error running index optimization:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
    process.exit(0);
  }
}

runIndexOptimization();
