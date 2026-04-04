import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import JobModel from "../model/jobModel.mjs";
import PaymentRequestModel from "../model/paymentRequestModel.mjs";

const MONGO_URI =process.env.PROD_MONGODB_URI;

async function syncTransactionTypes() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Find all requests to use as a mapping
    const requests = await PaymentRequestModel.find({}, { requestNo: 1, transactionType: 1 }).lean();
    const typeMap = new Map();
    requests.forEach(r => {
      if (r.requestNo) typeMap.set(r.requestNo, r.transactionType);
    });

    console.log(`Found ${typeMap.size} payment requests. Syncing to jobs...`);

    // Find jobs that have charges with payment_request_no
    const jobs = await JobModel.find({ "charges.payment_request_no": { $exists: true, $ne: "" } });
    console.log(`Found ${jobs.length} jobs with payment requests.`);

    let updatedCount = 0;
    for (const job of jobs) {
      let jobModified = false;
      job.charges.forEach(charge => {
        if (charge.payment_request_no && !charge.payment_request_transaction_type) {
          const type = typeMap.get(charge.payment_request_no);
          if (type) {
            charge.payment_request_transaction_type = type;
            jobModified = true;
          }
        }
      });

      if (jobModified) {
        await job.save();
        updatedCount++;
        if (updatedCount % 50 === 0) console.log(`Updated ${updatedCount} jobs...`);
      }
    }

    console.log(`Migration complete. Total jobs updated: ${updatedCount}`);
    process.exit(0);
  } catch (err) {
    console.error("Migration Error:", err);
    process.exit(1);
  }
}

syncTransactionTypes();
