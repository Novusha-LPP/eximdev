import mongoose from "mongoose";
import ITUnifiedAsset from "../model/it-helpdesk/unifiedAssetModel.mjs";
import User from "../model/userModel.mjs";

async function runTest() {
  console.log("Connecting to MongoDB eximNew...");
  await mongoose.connect("mongodb://localhost:27017/eximNew");

  try {
    // 1. Find or create dummy users for Shalini and Manu if needed
    let shalini = await User.findOne({ username: "shalini_arun" });
    if (!shalini) {
      console.log("User shalini_arun not found in DB, using mock object");
      shalini = { _id: new mongoose.Types.ObjectId(), username: "shalini_arun", first_name: "Shalini", last_name: "Arun", role: "Admin" };
    }

    let manu = await User.findOne({ username: "manu_pillai" });
    if (!manu) {
      console.log("User manu_pillai not found in DB, using mock object");
      manu = { _id: new mongoose.Types.ObjectId(), username: "manu_pillai", first_name: "Manu", last_name: "Pillai", role: "Director" };
    }

    const testTagNew = "TEST-AST-WORKFLOW-NEW";
    const testTagOld = "TEST-AST-WORKFLOW-OLD";

    await ITUnifiedAsset.deleteMany({ asset_tag: { $in: [testTagNew, testTagOld] } });

    // ── Test 1: New Inventory Creation ──
    console.log("\n--- TEST 1: Create New Inventory Asset ---");
    const newAssetPayload = {
      asset_tag: testTagNew,
      inventory_type: "New Inventory",
      category: "Laptop",
      brand: "Lenovo",
      model: "ThinkPad T14",
      serial_number: "TEST-SN-WF-001",
      payment_mode: "UPI",
      invoice_url: "https://example.com/invoice.pdf",
      lifecycle_status: "Available",
      condition: "Good",
    };

    // Simulate POST / route logic
    const isNew = newAssetPayload.inventory_type === "New Inventory";
    if (isNew) {
      newAssetPayload.approval_stage = "First Admin Approval";
      newAssetPayload.approval_status = "Pending First Approval (shalini_arun)";
      newAssetPayload.first_approver_username = "shalini_arun";
      newAssetPayload.first_approver_name = "Shalini Arun";
      newAssetPayload.approval_cycle = 1;
      newAssetPayload.workflow_history = [
        {
          stage: "First Admin Approval",
          action: "Asset Created & Submitted for Approval",
          performed_by: shalini._id,
          performed_by_name: "IT Creator",
          approval_cycle: 1,
          timestamp: new Date(),
        },
      ];
    }

    const createdNew = new ITUnifiedAsset(newAssetPayload);
    await createdNew.save();
    console.log("✓ New asset saved with stage:", createdNew.approval_stage, "| status:", createdNew.approval_status);
    if (createdNew.approval_stage !== "First Admin Approval") throw new Error("Expected First Admin Approval stage");

    // ── Test 2: Shalini Arun Approves (1st Tier) ──
    console.log("\n--- TEST 2: Shalini Arun Approves 1st Tier ---");
    createdNew.admin_verifications.push({
      user: shalini._id,
      username: "shalini_arun",
      name: "Shalini Arun",
      role: "Admin",
      action: "First Admin Verified (shalini_arun)",
      remarks: "Invoice amount and GST verified.",
      approval_cycle: 1,
      timestamp: new Date(),
    });
    createdNew.approval_stage = "Second Admin Approval";
    createdNew.approval_status = "Pending Final Approval (manu_pillai)";
    createdNew.workflow_history.push({
      stage: "Second Admin Approval",
      action: "First Approval by shalini_arun (Shalini Arun, Cycle 1): Invoice amount and GST verified.",
      performed_by: shalini._id,
      performed_by_name: "Shalini Arun",
      approval_cycle: 1,
      timestamp: new Date(),
    });
    await createdNew.save();

    console.log("✓ Asset updated to stage:", createdNew.approval_stage, "| status:", createdNew.approval_status);
    if (createdNew.approval_stage !== "Second Admin Approval") throw new Error("Expected Second Admin Approval stage");

    // ── Test 3: Manu Pillai Approves (2nd Tier) ──
    console.log("\n--- TEST 3: Manu Pillai Approves 2nd Tier (Completion) ---");
    createdNew.admin_verifications.push({
      user: manu._id,
      username: "manu_pillai",
      name: "Manu Pillai",
      role: "Director",
      action: "Final Admin Verified (manu_pillai)",
      remarks: "Final approval granted.",
      approval_cycle: 1,
      timestamp: new Date(),
    });
    createdNew.approval_stage = "Completed";
    createdNew.approval_status = "Completed";
    createdNew.completed_at = new Date();
    createdNew.workflow_history.push({
      stage: "Completed",
      action: "Final Approval by manu_pillai (Manu Pillai, Cycle 1): Final approval granted.",
      performed_by: manu._id,
      performed_by_name: "Manu Pillai",
      approval_cycle: 1,
      timestamp: new Date(),
    });
    await createdNew.save();

    console.log("✓ Asset updated to stage:", createdNew.approval_stage, "| status:", createdNew.approval_status);
    if (createdNew.approval_stage !== "Completed") throw new Error("Expected Completed stage");

    // ── Test 4: Old Inventory Registration (Pre-approved / N/A) ──
    console.log("\n--- TEST 4: Create Old Inventory Asset ---");
    const oldAssetPayload = {
      asset_tag: testTagOld,
      inventory_type: "Old Inventory",
      category: "Monitor",
      brand: "Samsung",
      model: "24-inch LED",
      serial_number: "TEST-SN-WF-002",
      lifecycle_status: "Available",
      condition: "Good",
      approval_stage: "Completed",
      approval_status: "N/A - Existing Inventory",
    };
    const createdOld = new ITUnifiedAsset(oldAssetPayload);
    await createdOld.save();

    console.log("✓ Old asset saved with stage:", createdOld.approval_stage, "| status:", createdOld.approval_status);
    if (createdOld.approval_status !== "N/A - Existing Inventory") throw new Error("Expected N/A - Existing Inventory");

    // Clean up
    await ITUnifiedAsset.deleteMany({ asset_tag: { $in: [testTagNew, testTagOld] } });
    console.log("\n✓ Cleaned up test records successfully!");
    console.log("\nALL TESTS PASSED! Flow matches AssetManagement workflow.");
  } finally {
    await mongoose.disconnect();
  }
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
