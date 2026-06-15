import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RegularizationRequest from '../model/attendance/RegularizationRequest.js';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';

dotenv.config({ path: './server/.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    const pendingRequests = await RegularizationRequest.find({ status: 'pending' });
    console.log(`Found ${pendingRequests.length} pending regularization requests.`);

    let resolvedCount = 0;
    for (const req of pendingRequests) {
      const attDate = new Date(req.attendance_date);
      const attRecord = await AttendanceRecord.findOne({
        employee_id: req.employee_id,
        attendance_date: attDate
      });

      if (attRecord && attRecord.status === 'present') {
        req.status = 'approved';
        req.is_resolved = true;
        req.resolved_at = new Date();
        req.resolution_source = 'admin_manual_correction';
        req.remarks = 'Auto-resolved via database verification (marked present in calendar)';
        await req.save();
        console.log(`Resolved request ID ${req._id} for date ${req.attendance_date} (employee: ${req.employee_id})`);
        resolvedCount++;
      }
    }

    console.log(`Successfully auto-resolved ${resolvedCount} regularization requests.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
