import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import moment from 'moment-timezone';

// Import models
import User from '../model/userModel.mjs';
import Company from '../model/attendance/Company.js';
import Shift from '../model/attendance/Shift.js';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';
import PayrollLock from '../model/attendance/PayrollLock.js';
import EmployeePayrollConfig from '../model/attendance/EmployeePayrollConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/exim';

async function seedData() {
  console.log('[SEED] Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('[SEED] Connected successfully.');

  const companyId = new mongoose.Types.ObjectId("69cd1e3b50e6c73acc73a926"); // RABS
  const shiftId = new mongoose.Types.ObjectId("69cd1e3c50e6c73acc73a927"); // Standard Shift (STD)

  const ajithId = new mongoose.Types.ObjectId("6937e569b367c7f6e9119342");
  const afzalId = new mongoose.Types.ObjectId("6a059ab3d065f33262fa04fe");

  // 1. Assign Standard Shift to Ajith and Afzal, ensure they are active
  console.log('[SEED] Ensuring users have correct shift and active status...');
  await User.findByIdAndUpdate(ajithId, {
    shift_id: shiftId,
    isActive: true
  });
  await User.findByIdAndUpdate(afzalId, {
    shift_id: shiftId,
    isActive: true,
    is_operator: true
  });

  // 2. Setup/Verify active EmployeePayrollConfigs
  console.log('[SEED] Verifying/creating employee payroll configs...');
  
  // For Ajith (Management, Monthly, Overtime Eligible but no overtime hours seeded)
  let ajithConfig = await EmployeePayrollConfig.findOne({ employee_id: ajithId, status: 'ACTIVE' });
  if (!ajithConfig) {
    ajithConfig = await EmployeePayrollConfig.create({
      employee_id: ajithId,
      company_id: companyId,
      is_operator: false,
      payroll_type: 'MONTHLY',
      monthly_salary: 20000,
      daily_wage: 0,
      overtime_rate_per_hour: 0,
      overtime_eligible: true,
      overtime_grace_minutes: 20,
      effective_from: new Date('2026-01-01'),
      status: 'ACTIVE',
      revision_reason: 'Initial setup for test'
    });
  } else {
    ajithConfig.is_operator = false;
    ajithConfig.payroll_type = 'MONTHLY';
    ajithConfig.monthly_salary = 20000;
    ajithConfig.overtime_eligible = true;
    await ajithConfig.save();
  }

  // For Afzal (Operator, Daily Wage, Overtime Eligible)
  let afzalConfig = await EmployeePayrollConfig.findOne({ employee_id: afzalId, status: 'ACTIVE' });
  if (!afzalConfig) {
    afzalConfig = await EmployeePayrollConfig.create({
      employee_id: afzalId,
      company_id: companyId,
      is_operator: true,
      payroll_type: 'DAILY_WAGE',
      monthly_salary: 0,
      daily_wage: 900,
      overtime_rate_per_hour: 0, // Fallback to daily_wage / 8 = 112.5
      overtime_eligible: true,
      overtime_grace_minutes: 20,
      effective_from: new Date('2026-01-01'),
      status: 'ACTIVE',
      revision_reason: 'Initial setup for test'
    });
  } else {
    afzalConfig.is_operator = true;
    afzalConfig.payroll_type = 'DAILY_WAGE';
    afzalConfig.daily_wage = 900;
    afzalConfig.overtime_eligible = true;
    await afzalConfig.save();
  }

  // 3. Clear existing attendance records for May 2026
  console.log('[SEED] Clearing May 2026 attendance records for Ajith and Afzal...');
  await AttendanceRecord.deleteMany({
    employee_id: { $in: [ajithId, afzalId] },
    year_month: '2026-05'
  });

  // 4. Generate records for May 2026 (May 1 to May 31, 2026)
  console.log('[SEED] Seeding new attendance records for May 2026...');
  const daysInMonth = 31;
  const companyTz = 'Asia/Kolkata';

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `2026-05-${String(day).padStart(2, '0')}`;
    const date = moment.tz(dateStr, 'YYYY-MM-DD', companyTz);
    const dayOfWeek = date.day(); // 0 = Sunday, 6 = Saturday
    
    // Sundays are Weekly Offs
    if (dayOfWeek === 0) {
      // Seed weekly off for both
      await AttendanceRecord.create({
        employee_id: ajithId,
        company_id: companyId,
        shift_id: shiftId,
        attendance_date: date.toDate(),
        attendance_date_str: dateStr,
        year_month: '2026-05',
        status: 'weekly_off',
        is_weekly_off: true,
        net_work_hours: 0,
        total_work_hours: 0,
        overtime_hours: 0
      });
      await AttendanceRecord.create({
        employee_id: afzalId,
        company_id: companyId,
        shift_id: shiftId,
        attendance_date: date.toDate(),
        attendance_date_str: dateStr,
        year_month: '2026-05',
        status: 'weekly_off',
        is_weekly_off: true,
        net_work_hours: 0,
        total_work_hours: 0,
        overtime_hours: 0
      });
      continue;
    }

    // May 1st is seeded as Holiday
    if (day === 1) {
      await AttendanceRecord.create({
        employee_id: ajithId,
        company_id: companyId,
        shift_id: shiftId,
        attendance_date: date.toDate(),
        attendance_date_str: dateStr,
        year_month: '2026-05',
        status: 'holiday',
        is_holiday: true,
        holiday_type: 'national',
        net_work_hours: 0,
        total_work_hours: 0,
        overtime_hours: 0
      });
      await AttendanceRecord.create({
        employee_id: afzalId,
        company_id: companyId,
        shift_id: shiftId,
        attendance_date: date.toDate(),
        attendance_date_str: dateStr,
        year_month: '2026-05',
        status: 'holiday',
        is_holiday: true,
        holiday_type: 'national',
        net_work_hours: 0,
        total_work_hours: 0,
        overtime_hours: 0
      });
      continue;
    }

    // Regular days (Monday to Saturday)
    // Ajith works exactly 8 hours every day (standard shift, no OT)
    await AttendanceRecord.create({
      employee_id: ajithId,
      company_id: companyId,
      shift_id: shiftId,
      attendance_date: date.toDate(),
      attendance_date_str: dateStr,
      year_month: '2026-05',
      status: 'present',
      first_in: moment.tz(`${dateStr} 10:00`, 'YYYY-MM-DD HH:mm', companyTz).toDate(),
      last_out: moment.tz(`${dateStr} 18:00`, 'YYYY-MM-DD HH:mm', companyTz).toDate(),
      total_punches: 2,
      net_work_hours: 8,
      total_work_hours: 8,
      overtime_hours: 0
    });

    // Afzal works 8 hours standard, but let's add 3 hours overtime on 5 specific days: May 11, 12, 13, 14, 15
    const isOtDay = [11, 12, 13, 14, 15].includes(day);
    const workHours = isOtDay ? 11 : 8;
    const otHours = isOtDay ? 3 : 0;
    
    await AttendanceRecord.create({
      employee_id: afzalId,
      company_id: companyId,
      shift_id: shiftId,
      attendance_date: date.toDate(),
      attendance_date_str: dateStr,
      year_month: '2026-05',
      status: 'present',
      first_in: moment.tz(`${dateStr} 10:00`, 'YYYY-MM-DD HH:mm', companyTz).toDate(),
      last_out: moment.tz(`${dateStr} ${isOtDay ? '21:00' : '18:00'}`, 'YYYY-MM-DD HH:mm', companyTz).toDate(),
      total_punches: 2,
      net_work_hours: workHours,
      total_work_hours: workHours,
      overtime_hours: otHours
    });
  }

  // 5. Ensure Attendance is locked for 2026-05
  console.log('[SEED] Creating manual Attendance Lock (PayrollLock) for May 2026...');
  await PayrollLock.findOneAndUpdate(
    { company_id: companyId, year_month: '2026-05' },
    {
      is_locked: true,
      locked_by: ajithId,
      locked_at: new Date()
    },
    { upsert: true, new: true }
  );

  console.log('[SEED] Test seeding completed successfully!');
  await mongoose.disconnect();
}

seedData().catch(err => {
  console.error('[SEED] Seeding failed:', err);
  process.exit(1);
});
