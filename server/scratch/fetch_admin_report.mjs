import mongoose from 'mongoose';
import dotenv from 'dotenv';
import moment from 'moment-timezone';
import { getRestrictedEmployeeIds } from '../utils/attendance/allowedAdminRestriction.mjs';
import User from '../model/userModel.mjs';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';
import LeaveApplication from '../model/attendance/LeaveApplication.js';
import Company from '../model/attendance/Company.js';

dotenv.config({ path: 'c:/Users/india/Desktop/Projects/eximdev/server/.env' });

const DEV_MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/exim";

async function run() {
  try {
    await mongoose.connect(DEV_MONGODB_URI);
    console.log("Connected to MongoDB.");

    const udayUserId = '69609c79427cdad46a2b5fdb';
    const udayUser = await User.findById(udayUserId).lean();
    if (!udayUser) {
      console.log("uday_zope not found!");
      await mongoose.disconnect();
      return;
    }
    
    const userPlain = {
      ...udayUser,
      role: 'ADMIN'
    };

    const userQuery = {
      isActive: true,
      role: { $nin: ['driver', 'Driver'] }
    };
    
    const restrictedIds = await getRestrictedEmployeeIds(userPlain);
    if (restrictedIds) {
      userQuery._id = { $in: restrictedIds.map(id => new mongoose.Types.ObjectId(id)) };
    }

    const employees = await User.find(userQuery).select('_id username').lean();
    console.log(`Employees matching userQuery: ${employees.length}`);

    // Let's run a quick mock of getAdminAttendanceReport controller's main query:
    const start = moment('2026-06-01').startOf('day').toDate();
    const end = moment('2026-06-30').endOf('day').toDate();
    const employeeIds = employees.map(e => e._id);

    const [attendanceRecords, approvedLeaves] = await Promise.all([
      AttendanceRecord.find({
        employee_id: { $in: employeeIds },
        attendance_date: { $gte: start, $lte: end }
      }).select('_id employee_id').lean(),
      LeaveApplication.find({
        employee_id: { $in: employeeIds },
        approval_status: { $in: ['approved', 'pending'] },
        $or: [
          { from_date: { $lte: end }, to_date: { $gte: start } }
        ]
      }).select('_id employee_id').lean()
    ]);

    console.log(`AttendanceRecords count for these employees: ${attendanceRecords.length}`);
    console.log(`ApprovedLeaves count for these employees: ${approvedLeaves.length}`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
