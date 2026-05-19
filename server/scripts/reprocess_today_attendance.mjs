import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import Models
import User from '../model/userModel.mjs';
import Company from '../model/attendance/Company.js';
import AttendanceEngine from '../services/attendance/AttendanceEngine.js';
import PolicyResolver from '../services/attendance/PolicyResolver.js';

const mongoURI = process.env.PROD_MONGODB_URI || 'mongodb://127.0.0.1:27017/exim';

const reprocessToday = async () => {
    try {
        console.log('🚀 Starting Attendance Reprocessing for Today...');
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');

        const IST_TIMEZONE = 'Asia/Kolkata';
        const today = moment().tz(IST_TIMEZONE).format('YYYY-MM-DD');
        console.log(`📅 Target Date: ${today}`);

        const activeUsers = await User.find({ isActive: { $ne: false } });
        console.log(`📊 Found ${activeUsers.length} active users.`);

        let count = 0;
        let updated = 0;
        let halfDayBefore = 0;
        let presentAfter = 0;

        for (const user of activeUsers) {
            count++;
            
            // Fetch dependencies for this user
            const company = await Company.findById(user.company_id);
            const shift = await PolicyResolver.resolveShift(user);

            // Process using the updated engine
            const result = await AttendanceEngine.processDaily(user, today, company, shift);
            
            if (result) {
                updated++;
                if (result.status === 'present') presentAfter++;
            }

            if (count % 20 === 0) {
                console.log(`⏳ Processed ${count}/${activeUsers.length} users...`);
            }
        }

        console.log('\n✨ Reprocessing Complete!');
        console.log(`- Total Users: ${activeUsers.length}`);
        console.log(`- Records Processed: ${updated}`);
        console.log(`- Final 'Present' count: ${presentAfter}`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during reprocessing:', err);
        process.exit(1);
    }
};

reprocessToday();
