import mongoose from "mongoose";

async function main() {
  await mongoose.connect("mongodb://localhost:27017/eximNew");
  const db = mongoose.connection.db;

  const legacy = await db.collection("itassets").findOne({ asset_tag: "AST-0001" });
  if (legacy) {
    const res = await db.collection("it_unified_assets").updateOne(
      { asset_tag: "AST-0001" },
      {
        $set: {
          approval_stage: legacy.approval_stage || "Second Admin Approval",
          approval_status: legacy.approval_status || "Pending Final Approval (manu_pillai)",
          assigned_first_approver: legacy.assigned_first_approver,
          first_approver_name: legacy.first_approver_name,
          first_approver_username: legacy.first_approver_username,
          approval_cycle: legacy.approval_cycle || 1,
          admin_verifications: legacy.admin_verifications || [],
          workflow_history: legacy.workflow_history || [],
        },
      }
    );
    console.log("UPDATED AST-0001:", res.modifiedCount);
  }

  const updated = await db.collection("it_unified_assets").findOne({ asset_tag: "AST-0001" });
  console.log("NEW AST-0001 STATE:");
  console.log("approval_stage:", updated.approval_stage);
  console.log("approval_status:", updated.approval_status);
  console.log("admin_verifications count:", updated.admin_verifications?.length);
  console.log("workflow_history count:", updated.workflow_history?.length);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(console.error);
