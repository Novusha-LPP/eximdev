import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import moment from 'moment-timezone';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

// Register models
import User from '../model/userModel.mjs';
import Shift from '../model/attendance/Shift.js';
import AttendancePunch from '../model/attendance/AttendancePunch.js';
import ActiveSession from '../model/attendance/ActiveSession.js';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';
import Company from '../model/attendance/Company.js';
import PolicyResolver from '../services/attendance/PolicyResolver.js';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    const user = await User.findOne({ username: 'ajay_singh' }).lean();
    if (!user) {
      console.error('User ajay_singh not found');
      process.exit(1);
    }

    const tz = 'Asia/Kolkata'; // India timezone
    const nowTime = moment.tz('2026-08-17 19:00', 'YYYY-MM-DD HH:mm', tz).toDate();
    const shiftDate = '2026-08-17';

    console.log(`Resolving shift using actual PolicyResolver for ${user.username} at 19:00...`);
    const resolvedShift = await PolicyResolver.resolveShift(user, shiftDate, nowTime);

    if (resolvedShift) {
      console.log('Resolved Shift:');
      console.log(` - ID: ${resolvedShift._id}`);
      console.log(` - Name: ${resolvedShift.shift_name}`);
      console.log(` - Start Time: ${resolvedShift.start_time}`);
      console.log(` - End Time: ${resolvedShift.end_time}`);
      console.log(` - Cross Day: ${resolvedShift.is_cross_day}`);
    } else {
      console.log('No shift resolved.');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
