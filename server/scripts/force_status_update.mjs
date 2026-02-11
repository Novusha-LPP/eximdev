import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import JobModel from '../model/jobModel.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

// Force NODE_ENV to server as per user's last change
process.env.NODE_ENV = 'server';

const getMongoUri = () => {
    if (process.env.NODE_ENV === "production") return process.env.PROD_MONGODB_URI;
    if (process.env.NODE_ENV === "server") return process.env.SERVER_MONGODB_URI;
    return process.env.DEV_MONGODB_URI;
};

const run = async () => {
    let connection;
    try {
        const uri = getMongoUri();
        console.log(`Connecting to MongoDB (${process.env.NODE_ENV})...`);
        // console.log(`URI: ${uri}`); // Careful not to log secrets if possible, but local is fine.

        connection = await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected.");

        // Find the specific job
        const jobNo = '06400';
        const year = '25-26';

        const job = await JobModel.findOne({ job_no: jobNo, year: year });

        if (!job) {
            console.log(`Job ${jobNo} (${year}) not found!`);
        } else {
            console.log(`Found job ${job.job_no}. Current detailed_status: "${job.detailed_status}"`);

            // Trigger save to re-calculate fields via pre-save hook
            await job.save();

            console.log(`Job saved. New detailed_status: "${job.detailed_status}"`);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        if (connection) {
            await mongoose.disconnect();
            console.log("Disconnected.");
        }
        process.exit(0);
    }
};

run();
