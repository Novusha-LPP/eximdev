import mongoose from "mongoose";
import ProcurementRequest from "../model/it-helpdesk/procurementModel.mjs";
import ITUnifiedAsset from "../model/it-helpdesk/unifiedAssetModel.mjs";

const MONGO_URI = process.env.DEV_MONGODB_URI || "mongodb://127.0.0.1:27017/eximdev";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Count existing PRs
    const count = await ProcurementRequest.countDocuments();
    console.log("Current ProcurementRequest count:", count);

    // Test query next PR sequence logic
    const currentYear = new Date().getFullYear();
    const regex = new RegExp(`^PR-${currentYear}-([0-9]+)$`, "i");
    const items = await ProcurementRequest.find({ pr_number: regex }, { pr_number: 1 }).lean();
    console.log(`Found ${items.length} PRs matching year ${currentYear}`);

    console.log("Procurement Model schema & DB connection test PASSED");
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

run();
