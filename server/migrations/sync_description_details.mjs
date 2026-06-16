import mongoose from "mongoose";
import JobModel from "../model/jobModel.mjs";
import dotenv from "dotenv";

dotenv.config();

const BATCH_SIZE = 100;

async function migrate() {
  try {
    console.log("Starting description sync migration (cursor-based)...");

    const MONGODB_URI =
      process.env.MONGO_URI ||
      process.env.PROD_MONGODB_URI ||
      process.env.SERVER_MONGODB_URI ||
      process.env.DEV_MONGODB_URI ||
      "mongodb://localhost:27017/eximNew";

    console.log("Connecting to DB:", MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    const count = await JobModel.countDocuments({
      "description_details.0": { $exists: true }
    });
    console.log(`Found ${count} jobs with description_details to check.`);

    let checked = 0;
    let updated = 0;
    const cursor = JobModel.find({
      "description_details.0": { $exists: true }
    }).cursor();

    let bulkOps = [];

    for await (const doc of cursor) {
      checked++;
      if (checked % 500 === 0) {
        console.log(`Checked ${checked}/${count} jobs...`);
      }

      const firstRow = doc.description_details[0];
      if (!firstRow) continue;

      const firstDesc = (firstRow.description || "").trim();
      const firstCth = (firstRow.cth_no || "").trim();

      const currentDesc = (doc.description || "").trim();
      const currentCth = (doc.cth_no || "").trim();

      let shouldUpdateDesc = false;
      let shouldUpdateCth = false;

      if (firstDesc) {
        if (!currentDesc || currentDesc.length <= 1 || currentDesc !== firstDesc) {
          shouldUpdateDesc = true;
        }
      }

      if (firstCth) {
        if (!currentCth || currentCth.length <= 1 || currentCth !== firstCth) {
          shouldUpdateCth = true;
        }
      }

      if (shouldUpdateDesc || shouldUpdateCth) {
        const updateDoc = {};
        if (shouldUpdateDesc) {
          updateDoc.description = firstDesc;
        }
        if (shouldUpdateCth) {
          updateDoc.cth_no = firstCth;
        }

        console.log(`Job [No: ${doc.job_no}, Year: ${doc.year}, Mode: ${doc.mode}]:`);
        if (shouldUpdateDesc) {
          console.log(`  Description: "${currentDesc}" -> "${firstDesc}"`);
        }
        if (shouldUpdateCth) {
          console.log(`  CTH:         "${currentCth}" -> "${firstCth}"`);
        }

        bulkOps.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: updateDoc }
          }
        });
        updated++;

        if (bulkOps.length >= BATCH_SIZE) {
          await JobModel.bulkWrite(bulkOps);
          bulkOps = [];
          console.log(`Saved batch of updates. Total updated so far: ${updated}`);
        }
      }
    }

    if (bulkOps.length > 0) {
      await JobModel.bulkWrite(bulkOps);
      console.log(`Saved final batch of updates. Total updated: ${updated}`);
    }

    console.log(`Migration finished. Checked: ${checked}, Updated: ${updated}`);
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
