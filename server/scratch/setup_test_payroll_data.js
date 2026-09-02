import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

// Inline schema definitions
const companySchema = new mongoose.Schema({
  company_name: String,
  company_code: String,
  payroll_config: {
    include_holidays_in_payable: Boolean,
    include_weekly_offs_in_payable: Boolean,
    lop_calculation: String,
    overtime_rate: Number
  },
  settings: {
    standard_work_hours: Number
  }
});
const Company = mongoose.model('Company', companySchema);

const shiftSchema = new mongoose.Schema({
  company_id: mongoose.Schema.Types.ObjectId,
  shift_name: String,
  shift_code: String,
  start_time: String,
  end_time: String,
  full_day_hours: Number,
  half_day_hours: Number,
  overtime_threshold_minutes: Number,
  status: String
});
const Shift = mongoose.model('Shift', shiftSchema);

const attendanceRecordSchema = new mongoose.Schema({
  employee_id: mongoose.Schema.Types.ObjectId,
  company_id: mongoose.Schema.Types.ObjectId,
  attendance_date: Date,
  attendance_date_str: String,
  year_month: String,
  status: String,
  net_work_hours: Number,
  overtime_hours: Number
});
const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const companyId = new mongoose.Types.ObjectId("69cd1e3b50e6c73acc73a926");
  const company = await Company.findById(companyId);
  console.log('Company Payroll Config & Settings:', JSON.stringify(company, null, 2));

  const shifts = await Shift.find({ company_id: companyId });
  console.log('Available Shifts for Company:');
  shifts.forEach(s => console.log(`- Shift: ${s.shift_name} (${s.shift_code}) ID: ${s._id} Times: ${s.start_time}-${s.end_time}`));

  const ajithId = new mongoose.Types.ObjectId("6937e569b367c7f6e9119342");
  const afzalId = new mongoose.Types.ObjectId("6a059ab3d065f33262fa04fe");

  const ajithRecords = await AttendanceRecord.countDocuments({ employee_id: ajithId, year_month: '2026-05' });
  const afzalRecords = await AttendanceRecord.countDocuments({ employee_id: afzalId, year_month: '2026-05' });

  console.log(`May 2026 records for Ajith: ${ajithRecords}`);
  console.log(`May 2026 records for Afzal: ${afzalRecords}`);

  await mongoose.disconnect();
}

main().catch(console.error);
