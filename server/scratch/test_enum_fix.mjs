import mongoose from "mongoose";
import dotenv from "dotenv";
import TyreProcurementSopModel from "../model/accounts/tyreProcurementSop.mjs";

dotenv.config();

const mongoUri = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/eximdev";

async function test() {
  console.log("Connecting to Mongo...");
  await mongoose.connect(mongoUri);
  console.log("Connected.");

  const doc = new TyreProcurementSopModel({
    prNumber: "TEST-ENUM-PR-" + Date.now(),
    stage1: {
      hodValidation: {
        approvalMode: "WHATSAPP",
      },
    },
    stage3: {
      reviewChecklist: {
        budgetAvailable: "YES",
        priceReasonable: "YES",
        gstVerified: "YES",
        paymentTermsAccepted: "YES",
        docsAttached: "YES",
      },
    },
  });

  const err = doc.validateSync();
  if (err) {
    console.error("Validation failed:", err.message);
  } else {
    console.log("Validation passed successfully!");
  }

  await mongoose.disconnect();
}

test().catch(console.error);
