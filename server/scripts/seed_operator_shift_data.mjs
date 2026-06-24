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
import PayrollGenerator from '../services/payroll/payrollCalculation.service.js';
import PayrollSummary from '../model/attendance/PayrollSummary.js';
import PayrollRun from '../model/attendance/PayrollRun.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/exim';

async function main() {
  console.log('[SEED] Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('[SEED] Connected successfully.');

  const companyId = new mongoose.Types.ObjectId("69cd1e3b50e6c73acc73a926"); // RABS Industries India Private Limited
  const ajithId = new mongoose.Types.ObjectId("6937e569b367c7f6e9119342");
  const afzalId = new mongoose.Types.ObjectId("6a059ab3d065f33262fa04fe");

  // 1. Create or Find the custom Shift (9:00 AM to 5:30 PM, 8.5 full day hours)
  console.log('[SEED] Setting up custom Operator Shift (09:00 - 17:30)...');
  let operatorShift = await Shift.findOne({ company_id: companyId, shift_code: 'OP_SHIFT' });
  if (!operatorShift) {
    operatorShift = await Shift.create({
      company_id: companyId,
      shift_name: 'Operator Shift',
      shift_code: 'OP_SHIFT',
      start_time: '09:00',
      end_time: '17:30',
      full_day_hours: 8.5,
      half_day_hours: 4.0,
      overtime_threshold_minutes: 20,
      status: 'active'
    });
    console.log('[SEED] Created new Operator Shift.');
  } else {
    operatorShift.start_time = '09:00';
    operatorShift.end_time = '17:30';
    operatorShift.full_day_hours = 8.5;
    await operatorShift.save();
    console.log('[SEED] Updated existing Operator Shift.');
  }
  const shiftId = operatorShift._id;

  // 2. Assign Shift to Ajith and Afzal
  console.log('[SEED] Assigning new shift to users...');
  await User.findByIdAndUpdate(ajithId, { shift_id: shiftId, isActive: true });
  await User.findByIdAndUpdate(afzalId, { shift_id: shiftId, isActive: true, is_operator: true });

  // 3. Clear existing attendance records for May 2026
  console.log('[SEED] Clearing May 2026 attendance records for Ajith and Afzal...');
  await AttendanceRecord.deleteMany({
    employee_id: { $in: [ajithId, afzalId] },
    year_month: '2026-05'
  });

  // 4. Generate records for May 2026 (May 1 to May 31, 2026)
  console.log('[SEED] Seeding new attendance records for May 2026 with new shift times...');
  const daysInMonth = 31;
  const companyTz = 'Asia/Kolkata';

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `2026-05-${String(day).padStart(2, '0')}`;
    const date = moment.tz(dateStr, 'YYYY-MM-DD', companyTz);
    const dayOfWeek = date.day(); // 0 = Sunday, 6 = Saturday
    
    // Sundays are Weekly Offs
    if (dayOfWeek === 0) {
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
    // Ajith works exactly 8.5 hours every day (09:00 to 17:30, no OT)
    await AttendanceRecord.create({
      employee_id: ajithId,
      company_id: companyId,
      shift_id: shiftId,
      attendance_date: date.toDate(),
      attendance_date_str: dateStr,
      year_month: '2026-05',
      status: 'present',
      first_in: moment.tz(`${dateStr} 09:00`, 'YYYY-MM-DD HH:mm', companyTz).toDate(),
      last_out: moment.tz(`${dateStr} 17:30`, 'YYYY-MM-DD HH:mm', companyTz).toDate(),
      total_punches: 2,
      net_work_hours: 8.5,
      total_work_hours: 8.5,
      overtime_hours: 0
    });

    // Afzal works 8.5 hours standard, but works until 19:30 (10.5 hours) on 5 specific days: May 11, 12, 13, 14, 15
    const isOtDay = [11, 12, 13, 14, 15].includes(day);
    const workHours = isOtDay ? 10.5 : 8.5;
    const otHours = isOtDay ? 2 : 0;
    
    await AttendanceRecord.create({
      employee_id: afzalId,
      company_id: companyId,
      shift_id: shiftId,
      attendance_date: date.toDate(),
      attendance_date_str: dateStr,
      year_month: '2026-05',
      status: 'present',
      first_in: moment.tz(`${dateStr} 09:00`, 'YYYY-MM-DD HH:mm', companyTz).toDate(),
      last_out: moment.tz(`${dateStr} ${isOtDay ? '19:30' : '17:30'}`, 'YYYY-MM-DD HH:mm', companyTz).toDate(),
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

  console.log('[SEED] Test seeding completed. Running payroll generation validation...');
  
  // 6. Delete old payroll run draft to force complete re-evaluation
  await PayrollRun.deleteOne({ company_id: companyId, payroll_year: 2026, payroll_month: '05' });

  // Generate payroll for May 2026
  const result = await PayrollGenerator.generate({
    companyId: companyId,
    year: 2026,
    month: 5,
    generatedBy: ajithId
  });

  const summaries = await PayrollSummary.find({
    payroll_run_id: result.payrollRun._id,
    employee_id: { $in: [ajithId, afzalId] }
  }).populate('employee_id');

  for (const s of summaries) {
    console.log(`\n========================================`);
    console.log(`Employee: ${s.employee_id.first_name} ${s.employee_id.last_name} (${s.employee_id.username})`);
    console.log(`Type: ${s.payroll_type} (Is Operator: ${s.is_operator})`);
    console.log(`----------------------------------------`);
    console.log(`Payable Days: ${s.payable_days}`);
    console.log(`Total Regular Hours: ${s.total_regular_hours}`);
    console.log(`Total Overtime Hours: ${s.total_overtime_hours}`);
    console.log(`----------------------------------------`);
    console.log(`Basic Amount Calculated: ${s.basic_amount}`);
    console.log(`Overtime Amount Calculated: ${s.overtime_amount}`);
    console.log(`Net Payable Amount: ${s.net_payable_amount}`);
    console.log(`========================================`);
  }

  console.log('[SEED] Seeding script finished successfully.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('[SEED] Execution failed:', err);
  process.exit(1);
});
