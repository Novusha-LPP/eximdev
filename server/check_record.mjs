import mongoose from 'mongoose';
import dotenv from 'dotenv';
import moment from 'moment-timezone';

dotenv.config();

import AttendanceRecord from './model/attendance/AttendanceRecord.js';
import User from './model/userModel.mjs';

async function checkRecord() {
  try {
    await mongoose.connect('mongodb://localhost:27017/exim');
    const user = await User.findOne({ username: 'jeeya_inamdar' });
    if (!user) {
      console.log('User not found');
      return;
    }
    
    const dateStr = '2026-04-25';
    const startDate = moment.utc(dateStr).startOf('day').toDate();
    const endDate = moment.utc(dateStr).endOf('day').toDate();

    const record = await AttendanceRecord.findOne({
      employee_id: user._id,
      attendance_date: { $gte: startDate, $lte: endDate }
    });

    if (record) {
      console.log('Record found:', JSON.stringify(record, null, 2));
    } else {
      console.log('No record found for 2026-04-25');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkRecord();
