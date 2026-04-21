import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const TZ = 'Asia/Kolkata';

async function analyze() {
    try {
        const uri = process.env.DEV_MONGODB_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/exim";
        console.log(`Connecting to ${uri}...`);
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const LeaveApplication = mongoose.model('LeaveApplication', new mongoose.Schema({}, { strict: false }), 'leaveapplications');

        const applications = await LeaveApplication.find().lean();
        const total = await LeaveApplication.countDocuments();
        console.log(`Total leave applications: ${total}`);

        // Find leaves where total_days is 1 or 0.5
        const singleDayLeaves = applications.filter(l => Number(l.total_days) === 1 || Number(l.total_days) === 0.5).slice(0, 20);

        console.log('\nSample 1-day or 0.5-day leaves:');
        singleDayLeaves.forEach(l => {
            console.log(`ID: ${l._id} | User: ${l.employeeName || l.username || l.employee_id} | Type: ${l.leave_type || l.leaveType}`);
            console.log(`  from_date: ${l.from_date} (${moment(l.from_date).format('YYYY-MM-DD HH:mm:ss')})`);
            console.log(`  to_date:   ${l.to_date} (${moment(l.to_date).format('YYYY-MM-DD HH:mm:ss')})`);
            console.log(`  total_days: ${l.total_days}`);
            console.log(`  is_half_day: ${l.is_half_day}`);
            console.log('---');
        });

        // Find leaves where from_date and to_date are NOT on the same day in IST but total_days is 1
        const inconsistent = applications.filter(l => {
            if (Number(l.total_days) !== 1) return false;
            const d1 = moment(l.from_date).tz(TZ).format('YYYY-MM-DD');
            const d2 = moment(l.to_date).tz(TZ).format('YYYY-MM-DD');
            return d1 !== d2;
        });

        console.log(`\nFound ${inconsistent.length} leaves with total_days=1 but spanning multiple calendar days (IST).`);
        if (inconsistent.length > 0) {
            console.log('Sample inconsistent leaves:');
            inconsistent.slice(0, 10).forEach(l => {
                console.log(`ID: ${l._id} | From: ${moment(l.from_date).tz(TZ).format('ddd MMM DD YYYY HH:mm:ss')} | To: ${moment(l.to_date).tz(TZ).format('ddd MMM DD YYYY HH:mm:ss')}`);
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

analyze();
