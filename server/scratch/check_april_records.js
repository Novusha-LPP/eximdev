import mongoose from 'mongoose';
import moment from 'moment-timezone';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: './server/.env' });

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/exim";

const AttendanceRecordSchema = new mongoose.Schema({
    employee_id: mongoose.Schema.Types.ObjectId,
    attendance_date: Date,
    status: String,
    company_id: mongoose.Schema.Types.ObjectId
}, { strict: false });

const AttendanceRecord = mongoose.model('AttendanceRecord', AttendanceRecordSchema, 'attendancerecords');
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

async function checkRecords() {
    try {
        console.log('Connecting to:', MONGODB_URI);
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        const username = 'atul_nagose';
        const user = await User.findOne({ username });
        if (!user) {
            console.log('User not found');
            return;
        }

        console.log(`Checking records for ${username} (${user._id})`);
        console.log(`Current user company_id: ${user.company_id}`);

        const start = moment.tz('2026-04-01', 'Asia/Kolkata').startOf('month').toDate();
        const end = moment.tz('2026-04-01', 'Asia/Kolkata').endOf('month').toDate();

        const records = await AttendanceRecord.find({
            employee_id: user._id,
            attendance_date: { $gte: start, $lte: end }
        });

        console.log(`Found ${records.length} records for April 2026`);
        records.forEach(r => {
            console.log(`Date: ${r.attendance_date.toISOString()} | Status: ${r.status} | Company: ${r.company_id}`);
        });

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkRecords();
