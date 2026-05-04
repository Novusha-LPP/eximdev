
import mongoose from 'mongoose';
import moment from 'moment-timezone';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '../.env' });

const PROD_MONGODB_URI = process.env.PROD_MONGODB_URI;

// Mock models or just use raw collection
async function run() {
    try {
        await mongoose.connect(PROD_MONGODB_URI);
        console.log('Connected to DB');

        const userId = '6852538cfecca8549389c9a4';
        const leave = await mongoose.connection.db.collection('leaveapplications').findOne({
            employee_id: new mongoose.Types.ObjectId(userId),
            approval_status: 'approved'
        });

        if (!leave) {
            console.log('No approved leave found');
            return;
        }

        console.log('Leave found:', {
            from_date: leave.from_date,
            to_date: leave.to_date,
            total_days: leave.total_days
        });

        const tz = 'Asia/Kolkata';
        
        // Simulating buildPolicyAwareReportRow logic
        const startDate = '2026-04-20';
        const endDate = '2026-05-10';

        const findLeaveForDate = (leave, dayMomentUtc) => {
            const leaveStart = moment.utc(leave.from_date).startOf('day');
            const leaveEnd = moment.utc(leave.to_date).endOf('day');
            const isMatch = dayMomentUtc.isSameOrAfter(leaveStart) && dayMomentUtc.isSameOrBefore(leaveEnd);
            return isMatch;
        };

        let curr = moment.utc(startDate).startOf('day');
        const stop = moment.utc(endDate).endOf('day');

        console.log('\nSimulation of UTC reporting logic:');
        while (curr.isSameOrBefore(stop, 'day')) {
            const isLeave = findLeaveForDate(leave, curr);
            if (isLeave) {
                console.log(`Date ${curr.format('YYYY-MM-DD')} is marked as LEAVE (UTC Logic)`);
            }
            curr.add(1, 'day');
        }

        // Correct logic simulation
        const findLeaveForDateCorrect = (leave, dayMomentLocal, tz) => {
            const leaveStartStr = moment(leave.from_date).tz(tz).format('YYYY-MM-DD');
            const leaveEndStr = moment(leave.to_date).tz(tz).format('YYYY-MM-DD');
            const dayStr = dayMomentLocal.format('YYYY-MM-DD');
            return dayStr >= leaveStartStr && dayStr <= leaveEndStr;
        };

        curr = moment.tz(startDate, tz).startOf('day');
        const stopLocal = moment.tz(endDate, tz).endOf('day');

        console.log('\nSimulation of Correct (IST) reporting logic:');
        while (curr.isSameOrBefore(stopLocal, 'day')) {
            const isLeave = findLeaveForDateCorrect(leave, curr, tz);
            if (isLeave) {
                console.log(`Date ${curr.format('YYYY-MM-DD')} is marked as LEAVE (Correct Logic)`);
            }
            curr.add(1, 'day');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
