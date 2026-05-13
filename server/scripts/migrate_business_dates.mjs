import mongoose from 'mongoose';
import moment from 'moment-timezone';
import dotenv from 'dotenv';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';
import AttendancePunch from '../model/attendance/AttendancePunch.js';
import LeaveApplication from '../model/attendance/LeaveApplication.js';

dotenv.config();

const IST_TIMEZONE = 'Asia/Kolkata';

async function migrate() {
    try {
        console.log('Connecting to database...');
        const dbUri = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';
        await mongoose.connect(dbUri);
        console.log(`Connected to ${dbUri}`);

        // 1. Migrate AttendanceRecords
        console.log('Migrating AttendanceRecords...');
        const records = await AttendanceRecord.find({ attendance_date_str: { $exists: false } });
        console.log(`Found ${records.length} records to migrate.`);

        let count = 0;
        for (const record of records) {
            const dateStr = moment.utc(record.attendance_date).tz(IST_TIMEZONE).format('YYYY-MM-DD');
            // Using .collection to bypass Mongoose middleware
            await AttendanceRecord.collection.updateOne({ _id: record._id }, { $set: { attendance_date_str: dateStr } });
            count++;
            if (count % 100 === 0) console.log(`Processed ${count} records...`);
        }
        console.log(`Successfully migrated ${count} AttendanceRecords.`);

        // 2. Migrate AttendancePunches
        console.log('Migrating AttendancePunches...');
        const punches = await AttendancePunch.find({ punch_date_str: { $exists: false } });
        console.log(`Found ${punches.length} punches to migrate.`);

        count = 0;
        for (const punch of punches) {
            const dateStr = moment.utc(punch.punch_date).tz(IST_TIMEZONE).format('YYYY-MM-DD');
            // CRITICAL: Using .collection to bypass SECURITY EXCEPTION (Immutability hooks)
            await AttendancePunch.collection.updateOne({ _id: punch._id }, { $set: { punch_date_str: dateStr } });
            count++;
            if (count % 100 === 0) console.log(`Processed ${count} punches...`);
        }
        console.log(`Successfully migrated ${count} AttendancePunches.`);

        // 3. Migrate LeaveApplications
        console.log('Migrating LeaveApplications...');
        const leaves = await LeaveApplication.find({ from_date_str: { $exists: false } });
        console.log(`Found ${leaves.length} leaves to migrate.`);

        count = 0;
        for (const leave of leaves) {
            const fromStr = moment.utc(leave.from_date).tz(IST_TIMEZONE).format('YYYY-MM-DD');
            const toStr = moment.utc(leave.to_date).tz(IST_TIMEZONE).format('YYYY-MM-DD');
            await LeaveApplication.collection.updateOne({ _id: leave._id }, { $set: { from_date_str: fromStr, to_date_str: toStr } });
            count++;
            if (count % 100 === 0) console.log(`Processed ${count} leaves...`);
        }
        console.log(`Successfully migrated ${count} LeaveApplications.`);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
