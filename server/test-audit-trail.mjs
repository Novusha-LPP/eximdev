import mongoose from "mongoose";
import dotenv from "dotenv";
import AuditTrailModel from "./model/auditTrailModel.mjs";
import JobModel from "./model/jobModel.mjs";
import { getOrCreateUserId } from "./utils/userIdManager.mjs";

dotenv.config();

// Test function to verify audit trail functionality
async function testAuditTrail() {
  try {
    console.log("🚀 Starting audit trail test...");
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
    
    // Test 1: Check if audit trail model can create entries
    console.log("\n📝 Test 1: Creating a test audit trail entry...");
    
    const testUserId = await getOrCreateUserId("test-user");
    console.log(`👤 Test user ID: ${testUserId}`);
    
    const testAuditEntry = new AuditTrailModel({
      documentId: new mongoose.Types.ObjectId(),
      documentType: "Job",
      job_no: "TEST001",
      year: "2025",
      userId: testUserId,
      username: "test-user",
      userRole: "admin",
      action: "CREATE",
      changes: [{
        field: "test_field",
        fieldPath: "test_field",
        oldValue: null,
        newValue: "test_value",
        changeType: "ADDED"
      }],
      endpoint: "/api/test",
      method: "POST",
      ipAddress: "127.0.0.1"
    });
    
    const savedEntry = await testAuditEntry.save();
    console.log(`✅ Test audit entry created with ID: ${savedEntry._id}`);
    
    // Test 2: Query the audit trail
    console.log("\n🔍 Test 2: Querying audit trail entries...");
    
    const auditEntries = await AuditTrailModel.find({ 
      username: "test-user" 
    }).limit(5);
    
    console.log(`📊 Found ${auditEntries.length} audit entries for test-user`);
    auditEntries.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.action} on ${entry.documentType} - ${entry.job_no}/${entry.year}`);
    });
    
    // Test 3: Check if there are any existing job records for testing
    console.log("\n🔍 Test 3: Checking existing job records...");
    
    const sampleJob = await JobModel.findOne().limit(1);
    if (sampleJob) {
      console.log(`📋 Sample job found: ${sampleJob.job_no}/${sampleJob.year} (ID: ${sampleJob._id})`);
      
      // Test 4: Create an audit entry for the existing job
      console.log("\n📝 Test 4: Creating audit entry for existing job...");
      
      const jobAuditEntry = new AuditTrailModel({
        documentId: sampleJob._id,
        documentType: "Job",
        job_no: sampleJob.job_no,
        year: sampleJob.year,
        userId: testUserId,
        username: "test-user",
        userRole: "admin",
        action: "UPDATE",
        changes: [{
          field: "status",
          fieldPath: "status",
          oldValue: "old_status",
          newValue: "new_status",
          changeType: "MODIFIED"
        }],
        endpoint: "/api/jobs/update",
        method: "PATCH",
        ipAddress: "127.0.0.1"
      });
      
      const jobAuditSaved = await jobAuditEntry.save();
      console.log(`✅ Job audit entry created with ID: ${jobAuditSaved._id}`);
      
      // Query audit entries for this specific job
      const jobAuditEntries = await AuditTrailModel.find({
        job_no: sampleJob.job_no,
        year: sampleJob.year
      });
      
      console.log(`📊 Found ${jobAuditEntries.length} audit entries for job ${sampleJob.job_no}/${sampleJob.year}`);
    } else {
      console.log("❌ No existing jobs found for testing");
    }
    
    // Test 5: Check audit trail statistics
    console.log("\n📊 Test 5: Audit trail statistics...");
    
    const totalAuditEntries = await AuditTrailModel.countDocuments();
    const createActions = await AuditTrailModel.countDocuments({ action: "CREATE" });
    const updateActions = await AuditTrailModel.countDocuments({ action: "UPDATE" });
    const deleteActions = await AuditTrailModel.countDocuments({ action: "DELETE" });
    
    console.log(`📈 Total audit entries: ${totalAuditEntries}`);
    console.log(`📈 CREATE actions: ${createActions}`);
    console.log(`📈 UPDATE actions: ${updateActions}`);
    console.log(`📈 DELETE actions: ${deleteActions}`);
    
    // Cleanup test entries
    console.log("\n🧹 Cleaning up test entries...");
    await AuditTrailModel.deleteMany({ username: "test-user" });
    console.log("✅ Test entries cleaned up");
    
    console.log("\n🎉 Audit trail test completed successfully!");
    
  } catch (error) {
    console.error("❌ Audit trail test failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed");
    process.exit(0);
  }
}

// Run the test
testAuditTrail();
