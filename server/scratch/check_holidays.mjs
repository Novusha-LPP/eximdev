import mongoose from 'mongoose';
import HolidayPolicy from './SERVER/model/attendance/HolidayPolicy.js';
import User from './SERVER/model/userModel.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: './SERVER/.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const year = new Date().getFullYear();
        const policies = await HolidayPolicy.find({ year, status: 'active' });
        console.log(`Found ${policies.length} active policies for year ${year}`);

        for (const p of policies) {
            console.log(`- Policy: ${p.policy_name}, Company: ${p.company_id}, Holidays: ${p.holidays.length}`);
            console.log(`  Applicability: Teams: ${p.applicability?.teams?.all}, Depts: ${p.applicability?.departments?.all}`);
        }

        const users = await User.find({ holiday_policy_id: { $exists: true } }).limit(5);
        console.log(`\nUsers with explicit holiday policy: ${users.length}`);
        for (const u of users) {
            console.log(`- User: ${u.username}, PolicyID: ${u.holiday_policy_id}, CompanyID: ${u.company_id}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
