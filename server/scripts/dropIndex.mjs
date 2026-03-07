import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI;

async function dropIndex() {
    try {
        await mongoose.connect(MONGODB_URI);
        const JobModel = mongoose.model('Job', new mongoose.Schema({}, { strict: false }));

        console.log("🔍 Checking indexes...");
        const indexes = await JobModel.collection.getIndexes();
        console.log("Current Indexes:", JSON.stringify(indexes, null, 2));

        if (indexes["year_1_job_no_1"]) {
            console.log("🗑️ Dropping index year_1_job_no_1...");
            await JobModel.collection.dropIndex("year_1_job_no_1");
            console.log("✅ Successfully dropped index year_1_job_no_1");
        } else {
            console.log("ℹ️ Index year_1_job_no_1 not found.");
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ Error dropping index:", error);
        process.exit(1);
    }
}

dropIndex();
