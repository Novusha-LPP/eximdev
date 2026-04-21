import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function analyze() {
    try {
        const uri = process.env.DEV_MONGODB_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/exim";
        await mongoose.connect(uri);
        const LeaveApplication = mongoose.model('LeaveApplication', new mongoose.Schema({}, { strict: false }), 'leaveapplications');

        const app = await LeaveApplication.findById('69df2403ade7660e63519b45').lean();
        console.log(JSON.stringify(app, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

analyze();
