import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './model/userModel.mjs';
import LeaveApplication from './model/attendance/LeaveApplication.js';
import AttendanceRecord from './model/attendance/AttendanceRecord.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  await mongoose.connect('mongodb://localhost:27017/exim');
  const user = await User.findOne({ $or: [{ username: 'uday.zope' }, { username: 'uday_zope' }, { first_name: 'Uday', last_name: 'Zope' }] });
  if (!user) { console.log('User not found'); return; }
  console.log('User:', user.username, user.first_name, user.last_name);
  const leaves = await LeaveApplication.find({ employee_id: user._id, approval_status: { $in: ['approved', 'pending', 'pending_hod', 'pending_shalini', 'pending_final', 'hod_approved_pending_admin', 'in_review'] } }).sort({ from_date: 1 });
  console.log('Leave applications:');
  leaves.forEach(l => console.log(`ID: ${l._id}, From: ${l.from_date}, To: ${l.to_date}, Status: ${l.approval_status}`));

  // Check attendance on 6th
  const attendanceDate6 = new Date('2026-04-06T00:00:00.000Z');
  const record6 = await AttendanceRecord.findOne({ employee_id: user._id, attendance_date: attendanceDate6 });
  if (record6) {
    console.log('Attendance on 6th:', record6.status, record6.is_on_leave, record6.first_in, record6.last_out, record6.total_punches, record6.total_work_hours);
  } else {
    console.log('No attendance record on 6th');
  }

  // Check attendance on 23rd
  const attendanceDate23 = new Date('2026-04-23T00:00:00.000Z');
  const record23 = await AttendanceRecord.findOne({ employee_id: user._id, attendance_date: attendanceDate23 });
  if (record23) {
    console.log('Attendance on 23rd:', record23.status, record23.is_on_leave, record23.first_in, record23.last_out, record23.total_punches, record23.total_work_hours);
  } else {
    console.log('No attendance record on 23rd');
  }
  await mongoose.disconnect();
}
main().catch(console.error);