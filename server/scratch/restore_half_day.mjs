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

        // Rule: If records (punches) are there and total_work_hours >= 4, it should show 'half_day'
        // EXCEPT for May 15th which the user specifically wanted as 'incomplete' for missing punches.
        
        const dates = ['2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14'];
        
        for (const date of dates) {
            console.log(`\n--- Processing ${date} ---`);
            const records = await AttendanceRecord.find({ 
                attendance_date_str: date,
                status: 'incomplete',
                first_in: { $ne: null },
                total_work_hours: { $gte: 4 }
            });

            if (records.length > 0) {
                console.log(`Restoring ${records.length} records to 'half_day' from 'incomplete'.`);
                for (const r of records) {
                    r.status = 'half_day';
                    await r.save();
                }
            } else {
                console.log('No records to restore for this date.');
            }
        }

        console.log('\n--- Final Stats ---');
        const allDates = ['2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15'];
        for (const date of allDates) {
             const stats = await AttendanceRecord.aggregate([
                { $match: { attendance_date_str: date } },
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]);
            console.log(`Date: ${date}`, stats);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
