
import mongoose from 'mongoose';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';
import User from '../model/userModel.mjs';
import dotenv from 'dotenv';
import path from 'path';
import moment from 'moment';

import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

async function repairAnomalies() {
    try {
        const mongoUri = process.env.DEV_MONGODB_URI || process.env.MONGODB_URI || process.env.SERVER_MONGODB_URI;
        if (!mongoUri) {
            console.error('DEV_MONGODB_URI or MONGODB_URI not found in .env at', envPath);
            process.exit(1);
        }
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const anomalies = await AttendanceRecord.find({
            total_work_hours: { $gt: 24 }
        }).populate('employee_id', 'username');

        console.log(`Found ${anomalies.length} records to repair`);

        for (const rec of anomalies) {
            const oldHours = rec.total_work_hours;
            
            // Repair strategy: 
            // 1. Cap total_work_hours and net_work_hours at 9.0 (standard shift)
            // 2. Adjust last_out to be exactly 9 hours after first_in
            
            const firstInMoment = moment(rec.first_in);
            const repairedLastOut = firstInMoment.clone().add(9, 'hours').toDate();
            
            rec.total_work_hours = 9.0;
            rec.net_work_hours = 9.0;
            rec.last_out = repairedLastOut;
            rec.remarks = (rec.remarks || '') + ` [Auto-Repaired: Capped extreme hours from ${oldHours.toFixed(1)}h to 9.0h]`;
            
            await rec.save();
            console.log(`- Repaired User: ${rec.employee_id?.username || 'Unknown'}, Date: ${rec.attendance_date.toISOString().split('T')[0]}, Old: ${oldHours.toFixed(1)}h -> New: 9.0h`);
        }

        console.log('Repair complete!');
        process.exit(0);
    } catch (err) {
        console.error('Repair failed:', err);
        process.exit(1);
    }
}

repairAnomalies();
