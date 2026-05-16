import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
    try {
        const uri = process.env.MONGODB_URI || process.env.PROD_MONGODB_URI || process.env.SERVER_MONGODB_URI || process.env.DEV_MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const dates = ['2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15'];
        
        for (const date of dates) {
            console.log(`\n--- Checking ${date} ---`);
            const records = await AttendanceRecord.find({ 
                attendance_date_str: date,
                first_in: { $ne: null },
                last_out: null,
                status: { $ne: 'incomplete' }
            });

            if (records.length > 0) {
                console.log(`Updating ${records.length} records to 'incomplete'.`);
                for (const r of records) {
                    r.status = 'incomplete';
                    await r.save();
                }
            } else {
                console.log('All records look correct.');
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
