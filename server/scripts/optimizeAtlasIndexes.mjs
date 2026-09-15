import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '/home/aiserver/eximdev/server/.env' });

const uri = process.env.PROD_MONGODB_URI;

if (!uri) {
  console.error("❌ PROD_MONGODB_URI not found in .env");
  process.exit(1);
}

async function optimize() {
  console.log("🚀 Connecting to MongoDB Atlas...");
  const conn = await mongoose.createConnection(uri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 15000,
  }).asPromise();
  console.log("✅ Connected successfully!\n");

  const db = conn.db;

  // 1. CREATE SUGGESTED INDEX ON jobs
  console.log("==================================================");
  console.log("1. CREATING SUGGESTED INDEXES");
  console.log("==================================================");
  try {
    const jobsCol = db.collection("jobs");
    console.log("⏳ Creating index on [jobs]: { type_of_b_e: 1 }...");
    const res = await jobsCol.createIndex({ type_of_b_e: 1 }, { background: true, name: "type_of_b_e_1" });
    console.log(`✅ Created index: ${res}`);
  } catch (err) {
    console.error(`❌ Error creating type_of_b_e_1 index: ${err.message}`);
  }

  // 2. DROP REDUNDANT INDEXES
  console.log("\n==================================================");
  console.log("2. DROPPING REDUNDANT INDEXES");
  console.log("==================================================");

  const redundantIndexes = [
    // [collectionName, indexName]
    ["jobs", "branch_id_1"],
    ["audittrails", "action_1"],
    ["audittrails", "branchId_1"],
    ["audittrails", "branch_code_1"],
    ["audittrails", "documentId_1"],
    ["audittrails", "documentType_1"],
    ["audittrails", "job_no_1"],
    ["audittrails", "username_1"],
    ["cashregisters", "status_1"],
    ["clientqueries", "job_no_1"],
    ["prdatas", "branch_1"],
    ["prdatas", "containers.elock_assign_status_1"],
    ["paymentrequests", "branch_1"],
    ["paymentrequests", "containers.elock_assign_status_1"]
  ];

  for (const [colName, idxName] of redundantIndexes) {
    try {
      const col = db.collection(colName);
      // Check if collection exists
      const indexes = await col.indexes().catch(() => []);
      const exists = indexes.some(idx => idx.name === idxName);
      if (exists) {
        console.log(`⏳ Dropping redundant index [${colName}]: ${idxName}...`);
        await col.dropIndex(idxName);
        console.log(`✅ Dropped [${colName}]: ${idxName}`);
      } else {
        console.log(`ℹ️ [${colName}]: Index '${idxName}' does not exist or already dropped.`);
      }
    } catch (err) {
      console.warn(`⚠️ [${colName}]: Could not drop '${idxName}': ${err.message}`);
    }
  }

  console.log("\n==================================================");
  console.log("3. VERIFYING CURRENT INDEXES ON [jobs]");
  console.log("==================================================");
  const jobsIndexes = await db.collection("jobs").indexes();
  console.log(`Total indexes on 'jobs': ${jobsIndexes.length}`);
  const hasTypeOfBE = jobsIndexes.some(idx => idx.name === "type_of_b_e_1");
  const hasBranchId1 = jobsIndexes.some(idx => idx.name === "branch_id_1");
  console.log(`- type_of_b_e_1 index exists: ${hasTypeOfBE ? '✅ YES' : '❌ NO'}`);
  console.log(`- branch_id_1 (redundant) exists: ${hasBranchId1 ? '⚠️ YES' : '✅ NO (Successfully Removed)'}`);

  await conn.close();
  console.log("\n🎉 Optimization complete! Database connection closed.");
}

optimize().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
