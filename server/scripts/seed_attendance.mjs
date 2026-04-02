import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Make sure to match the `.js` and `.mjs` extensions correctly for your project setup
import User from '../model/userModel.mjs';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';

const mongoURI = 'mongodb://127.0.0.1:27017/exim';

const seedAttendance = async () => {
    try {
        await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to DB');

        const activeUsers = await User.find({ isActive: true });
        console.log(`Found ${activeUsers.length} active users.`);

        const todayStr = moment().format('YYYY-MM-DD');
        const todayDate = new Date(todayStr);
        const yearMonth = moment().format('YYYY-MM');

        let presentCount = 0;
        let halfDayCount = 0;
        let lateCount = 0;

        console.log(`Seeding attendance for date: ${todayStr}...`);
        
        for (const user of activeUsers) {
            // Delete existing record for today if exists to prevent duplicate errors
            await AttendanceRecord.deleteOne({ employee_id: user._id, attendance_date: todayDate });

            const rand = Math.random();
            let status = 'absent';
            let first_in = null;
            let last_out = null;
            let total_work_hours = 0;
            let is_half_day = false;
            let is_late = false;

            if (rand < 0.6) {
                // 60% Present
                status = 'present';
                first_in = moment(todayDate).add(9, 'hours').toDate();
                last_out = moment(todayDate).add(18, 'hours').toDate();
                total_work_hours = 9;
                presentCount++;
            } else if (rand < 0.8) {
                // 20% Half Day
                status = 'half_day';
                first_in = moment(todayDate).add(9, 'hours').toDate();
                last_out = moment(todayDate).add(13, 'hours').toDate();
                total_work_hours = 4;
                is_half_day = true;
                halfDayCount++;
            } else if (rand < 0.9) {
                // 10% Late
                status = 'late';
                first_in = moment(todayDate).add(10, 'hours').add(15, 'minutes').toDate();
                last_out = moment(todayDate).add(18, 'hours').toDate();
                total_work_hours = 7.75;
                is_late = true;
                lateCount++;
            } else {
                // 10% Absent (do nothing, no record means absent automatically)
                continue; 
            }

            const rec = new AttendanceRecord({
                employee_id: user._id,
                company_id: user.company_id,
                department_id: user.department_id,
                team_id: user.team_id,
                shift_id: user.shift_id,
                attendance_date: todayDate,
                year_month: yearMonth,
                first_in,
                last_out,
                status,
                total_punches: 2,
                total_work_hours,
                net_work_hours: total_work_hours,
                is_half_day,
                is_late,
                processed_at: new Date()
            });

            await rec.save();
        }

        console.log(`\n✅ Seeding complete!`);
        console.log(`- Present: ${presentCount}`);
        console.log(`- Half Day: ${halfDayCount}`);
        console.log(`- Late: ${lateCount}`);
        console.log(`- Absent: ${activeUsers.length - (presentCount + halfDayCount + lateCount)}`);

        process.exit(0);
    } catch (e) {
        console.error('Error seeding attendance:', e);
        process.exit(1);
    }
};

seedAttendance();
