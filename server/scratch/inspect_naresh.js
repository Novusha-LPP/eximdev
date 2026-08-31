import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/eximNew';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const EmployeePayrollConfig = mongoose.model('EmployeePayrollConfig', new mongoose.Schema({}, { strict: false }));
  const PayrollSummary = mongoose.model('PayrollSummary', new mongoose.Schema({}, { strict: false }));
  const AttendanceRecord = mongoose.model('AttendanceRecord', new mongoose.Schema({}, { strict: false }));

  const user = await User.findOne({ username: 'naresh_chauhan' }).lean();
  if (!user) {
    console.log('User not found');
    await mongoose.disconnect();
    return;
  }

  console.log('--- User Info ---');
  console.log(`ID: ${user._id}`);
  console.log(`Name: ${user.first_name} ${user.last_name}`);
  console.log(`Company ID: ${user.company_id}`);

  const config = await EmployeePayrollConfig.findOne({ employee_id: user._id, status: 'ACTIVE' }).lean();
  console.log('\n--- Active Config ---');
  console.log(JSON.stringify(config, null, 2));

  const summary = await PayrollSummary.findOne({ employee_id: user._id, payroll_month: '08', payroll_year: 2026 }).lean();
  console.log('\n--- Payroll Summary for 08/2026 ---');
  console.log(JSON.stringify(summary, null, 2));

  const attendanceCount = await AttendanceRecord.countDocuments({ employee_id: user._id, year_month: '2026-08' });
  console.log(`\nAttendance records count for 2026-08: ${attendanceCount}`);

  const records = await AttendanceRecord.find({ employee_id: user._id, year_month: '2026-08' }).lean();
  console.log('\n--- Attendance Records for 2026-08 ---');
  records.forEach(r => {
    console.log(`Date: ${r.attendance_date_str} | Status: ${r.status} | Net Hours: ${r.net_work_hours} | OT: ${r.overtime_hours}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
