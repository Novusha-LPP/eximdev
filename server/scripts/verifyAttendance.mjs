import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import moment from 'moment-timezone';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function verify() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        // 1. Explicitly load all models to ensure they are registered
        const modelDir = path.resolve(__dirname, '../routes/attendance/models');
        require(path.join(modelDir, 'Company.js'));
        require(path.join(modelDir, 'Shift.js'));
        require(path.join(modelDir, 'Department.js'));
        require(path.join(modelDir, 'AttendancePunch.js'));
        require(path.join(modelDir, 'AttendanceRecord.js'));
        
        // Load User model from its own location
        const { default: createRequireUser } = await import('module');
        const requireUser = createRequireUser(import.meta.url);
        // Assuming userModel.mjs is ESM, so we might need a different approach if it's not registered
        // But we can just use the registered name if it was loaded elsewhere, 
        // or just access the collection.
        const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

        // 2. Load Engine
        const AttendanceEngine = require('../routes/attendance/services/AttendanceEngine');
        
        // Access models
        const Company = mongoose.models.Company;
        const Shift = mongoose.models.Shift;
        const AttendancePunch = mongoose.models.AttendancePunch;
        const AttendanceRecord = mongoose.models.AttendanceRecord;

        // 3. Find a test user
        const user = await User.findOne({ company_id: { $ne: null } });
        if (!user) {
            console.error('No mapped user found!');
            process.exit(1);
        }
        console.log(`Testing with user: ${user.username} (${user._id})`);

        const company = await Company.findById(user.company_id);
        const shift = await Shift.findById(user.shift_id);
        
        const tz = company?.timezone || 'Asia/Kolkata';
        const today = moment().tz(tz).format('YYYY-MM-DD');

        // 4. Create a test punch
        console.log('Creating test IN punch...');
        const punch = new AttendancePunch({
            employee_id: user._id,
            company_id: user.company_id,
            punch_type: 'IN',
            punch_time: new Date(),
            punch_date: today,
            punch_method: 'test_script'
        });
        await punch.save();

        console.log('Running AttendanceEngine.processDaily...');
        const record = await AttendanceEngine.processDaily(user, today, company, shift);

        console.log('--- VERIFICATION SUCCESS ---');
        console.log('Employee:', user.username);
        console.log('Record Status:', record.status);
        console.log('First In:', record.first_in);
        console.log('Work Hours:', record.total_work_hours);
        console.log('---------------------------');

        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verify();
