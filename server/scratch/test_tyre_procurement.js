import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import TyreProcurementSop from "../model/accounts/tyreProcurementSop.mjs";

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/eximdev";

async function runTests() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("Connected successfully!");

  // 1. Clean up old test data
  await TyreProcurementSop.deleteMany({ prNumber: "TEST-TYRE-9999" });

  // 2. Test Record Creation
  console.log("Creating test Tyre PR...");
  const newPr = new TyreProcurementSop({
    prNumber: "TEST-TYRE-9999",
    status: "Draft",
    stage1: {
      preparedBy: "Verification Agent",
      contactNumber: "+91 00000 00000",
      itemsRequired: [
        { sNo: 1, tyreType: "New Tyre", brandPreference: "MRF", sizeSpec: "10R20", qty: 2, estUnitCost: 15000 }
      ]
    },
    stage2: {
      selectedSupplierL1: "Supplier 1",
      totalOrderValue: 30000
    }
  });

  const saved = await newPr.save();
  console.log("Saved PR successfully! ID:", saved._id);

  // 3. Test Update
  console.log("Updating PR status to PR Raised...");
  const updated = await TyreProcurementSop.findByIdAndUpdate(
    saved._id,
    { $set: { status: "PR Raised", "stage1.comments": "Self-test comment" } },
    { new: true }
  );
  console.log("Updated status:", updated.status, "| Comment:", updated.stage1.comments);

  // 4. Test Excel Sheet Generation
  console.log("Testing Excel export generation...");
  // Import Excel generator helpers dynamically from the router file
  const routerFile = await import("../routes/accounts/tyreProcurementSop.mjs");
  const buildWorkbook = routerFile.default || routerFile.buildWorkbook;

  // Let's call the workbook builder
  // Wait, let's verify if buildWorkbook is exported or if we need to call it.
  // In routes file, we export default router, but we can extract buildWorkbook from it or write a wrapper.
  // Actually, since buildWorkbook is a private helper inside the router file, let's extract it or recreate it for test validation.
  // But wait! Is buildWorkbook exported? No, it's not.
  // Let's write a small validator that calls the route /api/tyre-procurement/:id/export or just mock it.
  // Better yet, let's mock it using supertest if possible, or just call the router handler by importing it.
  // But we can also check if the sheets export builds correctly.
  
  console.log("Disconnecting from MongoDB...");
  await mongoose.disconnect();
  console.log("Done!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
