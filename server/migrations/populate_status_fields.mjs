
import mongoose from "mongoose";
import JobModel from "../model/jobModel.mjs";
import { determineDetailedStatus } from "../utils/determineDetailedStatus.mjs";
import { getRowColorFromStatus } from "../utils/statusColorMapper.mjs";
import { getJobStatusRank, getJobSortDate } from "../utils/jobRanking.mjs";
import dotenv from "dotenv";

dotenv.config();

const BATCH_SIZE = 500;

async function migrate() {
    try {
        console.log("Starting migration...");

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
        console.log(`Found ${count} jobs to process.`);

        let processed = 0;
        // Use cursor to stream efficiently
        const cursor = JobModel.find({}).cursor();

        let bulkOps = [];

        for await (const doc of cursor) {
            const jobObj = doc.toObject();

            // Calculate fields
            const detStatus = determineDetailedStatus(jobObj);
            const rowColor = getRowColorFromStatus(detStatus);
            const rank = getJobStatusRank(detStatus);
            const sortDate = getJobSortDate(jobObj, detStatus);

            bulkOps.push({
                updateOne: {
                    filter: { _id: doc._id },
                    update: {
                        $set: {
                            detailed_status: detStatus,
                            row_color: rowColor,
                            status_rank: rank,
                            status_sort_date: sortDate,
                        },
                    },
                },
            });

            if (bulkOps.length >= BATCH_SIZE) {
                await JobModel.bulkWrite(bulkOps);
                processed += bulkOps.length;
                console.log(`Processed ${processed}/${count}`);
                bulkOps = [];
            }
        }

        if (bulkOps.length > 0) {
            await JobModel.bulkWrite(bulkOps);
            processed += bulkOps.length;
        }

        console.log(`Migration completed. Total processed: ${processed}`);
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
