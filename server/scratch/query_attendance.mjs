import mongoose from 'mongoose';
import dotenv from 'dotenv';
import moment from 'moment-timezone';

dotenv.config({ path: 'c:/Users/india/Desktop/Projects/eximdev/server/.env' });

const DEV_MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/exim";

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

const attendanceRecordSchema = new mongoose.Schema({}, { strict: false });
const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema, 'attendancerecords');

async function run() {
  try {
    await mongoose.connect(DEV_MONGODB_URI);
    console.log("Connected to MongoDB.");

    const startUTC = moment.tz('2026-06-01', 'Asia/Kolkata').startOf('day').toDate();
    const endUTC = moment.tz('2026-06-30', 'Asia/Kolkata').endOf('day').toDate();

    // 1. Total active users in DB
    const activeUsersCount = await User.countDocuments({ isActive: true });
    console.log("Total active users in DB:", activeUsersCount);

    // 2. Total attendance records in June 2026
    const totalRecords = await AttendanceRecord.countDocuments({
      attendance_date: { $gte: startUTC, $lte: endUTC }
    });
    console.log("Total attendance records in June 2026:", totalRecords);

    // 3. Find unique employee IDs having records in June 2026
    const employeeIdsWithRecords = await AttendanceRecord.distinct('employee_id', {
      attendance_date: { $gte: startUTC, $lte: endUTC }
    });
    console.log("Number of employees with attendance records in June 2026:", employeeIdsWithRecords.length);

    // 4. Print names and details of some of these employees
    const sampleEmployees = await User.find({ _id: { $in: employeeIdsWithRecords } }).limit(10).lean();
    console.log("Sample employees with records:");
    sampleEmployees.forEach(emp => {
      console.log(`- ${emp._id}: ${emp.username} (Company ID: ${emp.company_id}, Active: ${emp.isActive})`);
    });

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
