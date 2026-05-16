import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';
import User from '../model/userModel.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
    try {
        const uri = process.env.MONGODB_URI || process.env.PROD_MONGODB_URI || process.env.SERVER_MONGODB_URI || process.env.DEV_MONGODB_URI;
        await mongoose.connect(uri);
        
        const dates = ['2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15'];
        
        console.log('# Attendance Synchronization Report (User-Wise)');
        console.log('\nThe following users have been synchronized to "Missed Punch" (incomplete) status due to missing OUT punches:\n');

        for (const date of dates) {
            const records = await AttendanceRecord.find({ 
                attendance_date_str: date,
                status: 'incomplete'
            }).populate('employee_id', 'first_name last_name username');

            console.log(`### Date: ${date} (${records.length} Users)`);
            if (records.length === 0) {
                console.log('- No missed punches.');
            } else {
                const names = records.map(r => {
                    const u = r.employee_id;
                    if (!u) return 'Unknown User';
                    return `${u.first_name || ''} ${u.last_name || ''} (${u.username})`.trim();
                });
                console.log('- ' + names.join('\n- '));
            }
            console.log('');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
