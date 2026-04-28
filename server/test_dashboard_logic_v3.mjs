import mongoose from 'mongoose';
import dotenv from 'dotenv';
import moment from 'moment-timezone';
import User from './model/userModel.mjs';
import Company from './model/attendance/Company.js';
import PolicyResolver from './services/attendance/PolicyResolver.js';
import WorkingDayEngine from './services/attendance/WorkingDayEngine.js';
import AttendanceRecord from './model/attendance/AttendanceRecord.js';

dotenv.config();

async function testDashboard() {
  try {
    await mongoose.connect('mongodb://localhost:27017/exim');
    const user = await User.findOne({ username: 'jeeya_inamdar' });
    const company = await Company.findById(user.company_id);
    const tz = company?.timezone || 'Asia/Kolkata';
    const queryYear = 2026;
    const queryMonth = 4;
    const currentYearMonth = '2026-04';
    const companyId = company?._id;

    const [resolvedWeekOffPolicy, resolvedHolidayPolicy] = await Promise.all([
      PolicyResolver.resolveWeekOffPolicy(user),
      PolicyResolver.resolveHolidayPolicy(user, queryYear)
    ]);

    console.log(`[DEBUG] Policy: ${resolvedWeekOffPolicy?.policy_name || 'NONE'}`);

    for (let i = 1; i <= 30; i++) {
      const dateStr = `${currentYearMonth}-${String(i).padStart(2, '0')}`;
      const dayMoment = moment.tz(dateStr, 'YYYY-MM-DD', tz);
      const dayDate = dayMoment.toDate();
      
      const holidayStatus = await WorkingDayEngine.getHolidayInfo(dayMoment, companyId, resolvedHolidayPolicy);
      const weekOffStatus = PolicyResolver.resolveWeeklyOffStatus(dayDate, resolvedWeekOffPolicy);

      if (dateStr === '2026-04-11' || dateStr === '2026-04-25') {
          console.log(`--- ${dateStr} ---`);
          console.log(`  Holiday: ${holidayStatus?.isHoliday}`);
          console.log(`  WeekOff: ${weekOffStatus?.isOff}`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testDashboard();
