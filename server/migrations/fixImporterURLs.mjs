import mongoose from "mongoose";
import JobModel from "../model/jobModel.mjs";
import dotenv from "dotenv";

dotenv.config();

const BATCH_SIZE = 500;

async function migrate() {
  try {
    console.log("Starting migration to fix importerURL fields...");

    const MONGODB_URI =
      process.env.MONGO_URI ||
      process.env.PROD_MONGODB_URI ||
      process.env.SERVER_MONGODB_URI ||
      process.env.DEV_MONGODB_URI;

    if (!MONGODB_URI) {
      console.error("No MongoDB URI found in environment variables.");
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    const count = await JobModel.countDocuments({});
    console.log(`Found ${count} total jobs to inspect.`);

    let processed = 0;
    let updatedCount = 0;
    const cursor = JobModel.find({}, { importer: 1, importerURL: 1 }).cursor();

    let bulkOps = [];

    for await (const doc of cursor) {
      processed++;
      if (!doc.importer) continue;

      const expectedURL = doc.importer
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^\w&.]+/g, "")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

      if (doc.importerURL !== expectedURL) {
        bulkOps.push({
          updateOne: {
            filter: { _id: doc._id },
            update: {
              $set: { importerURL: expectedURL },
            },
          },
        });
        updatedCount++;
      }

      if (bulkOps.length >= BATCH_SIZE) {
        await JobModel.bulkWrite(bulkOps);
        console.log(`Bulk wrote ${bulkOps.length} updates. Total processed: ${processed}/${count}`);
        bulkOps = [];
      }
    }

    if (bulkOps.length > 0) {
      await JobModel.bulkWrite(bulkOps);
      console.log(`Bulk wrote remaining ${bulkOps.length} updates.`);
    }

    console.log(`Migration completed successfully. Total processed: ${processed}, Total updated: ${updatedCount}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(1);
  }
}

migrate();
