import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.PROD_MONGODB_URI || process.env.SERVER_MONGODB_URI;

const jobSchema = new mongoose.Schema({
    awb_bl_no: String,
    awb_bl_date: String,
}, { strict: false });

const Job = mongoose.model('job', jobSchema);

async function inspect() {
    if (!MONGODB_URI) {
        console.error("MONGODB_URI is not defined in .env");
        process.exit(1);
    }
    await mongoose.connect(MONGODB_URI);
    const jobs = await Job.find({ awb_bl_date: { $exists: true, $ne: "" } }).limit(5).lean();
    console.log("Sample Jobs:", JSON.stringify(jobs, null, 2));
    await mongoose.disconnect();
}

inspect();
