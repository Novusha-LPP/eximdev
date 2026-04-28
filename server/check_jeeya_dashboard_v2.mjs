import mongoose from 'mongoose';
import dotenv from 'dotenv';
import moment from 'moment-timezone';

dotenv.config();

// We'll import the real models to be safe
import User from './model/userModel.mjs';
import WeekOffPolicy from './model/attendance/WeekOffPolicy.js';
import AttendanceRecord from './model/attendance/AttendanceRecord.js';
import Company from './model/attendance/Company.js';
import PolicyResolver from './services/attendance/PolicyResolver.js';

async function checkDashboard() {
  try {
    await mongoose.connect('mongodb://localhost:27017/exim');
    console.log('Connected to MongoDB');

    const user = await User.findOne({ username: 'jeeya_inamdar' });
    if (!user) {
      console.log('User not found');
      return;
    }
    console.log('User found:', user._id, user.username);

    const company = await Company.findById(user.company_id);
    const tz = company?.timezone || 'Asia/Kolkata';
    console.log('Company Timezone:', tz);

    const weekOffPolicy = await PolicyResolver.resolveWeekOffPolicy(user);
    if (!weekOffPolicy) {
      console.log('No WeekOff policy found for user');
    } else {
      console.log('Policy Name:', weekOffPolicy.policy_name);
    }

    const datesToCheck = ['2026-04-25', '2026-04-26'];
    for (const dateStr of datesToCheck) {
      const dayMoment = moment.tz(dateStr, 'YYYY-MM-DD', tz);
      const dayDate = dayMoment.toDate();
      
      const weekOffStatus = PolicyResolver.resolveWeeklyOffStatus(dayDate, weekOffPolicy, tz);
      console.log(`${dateStr} (Local): Weekly Off = ${weekOffStatus.isOff}`);
      
      const record = await AttendanceRecord.findOne({
        employee_id: user._id,
        attendance_date: moment.utc(dateStr).startOf('day').toDate()
      });
      if (record) {
        console.log(`  Attendance Record: ${record.status}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDashboard();
