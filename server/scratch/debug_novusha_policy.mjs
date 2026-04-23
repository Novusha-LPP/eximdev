import mongoose from 'mongoose';
import WeekOffPolicy from '../model/attendance/WeekOffPolicy.js';
import User from '../model/userModel.mjs';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || process.env.PROD_MONGODB_URI;

async function debug() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to database');

        // 1. Find the Novusha policy
        const policies = await WeekOffPolicy.find({ policy_name: /Novusha/i }).lean();
        console.log('--- Novusha Policies ---');
        console.log(JSON.stringify(policies, null, 2));

        // 2. Find the users mentioned
        const users = await User.find({
            $or: [
                { first_name: /jeeya/i },
                { first_name: /uday/i },
                { employee_id: '12345678' }
            ]
        }).select('first_name last_name employee_id weekoff_policy_id company_id').lean();

        console.log('\n--- Users ---');
        console.log(JSON.stringify(users, null, 2));

        // 3. Check applicability for each user
        for (const user of users) {
            console.log(`\nChecking for user: ${user.first_name} ${user.last_name} (${user.employee_id})`);
            console.log(`Assigned weekoff_policy_id: ${user.weekoff_policy_id}`);
            
            const resolvedPolicy = policies.find(p => String(p._id) === String(user.weekoff_policy_id));
            if (resolvedPolicy) {
                console.log(`Directly assigned policy: ${resolvedPolicy.policy_name}`);
            } else {
                console.log('No direct policy match. Checking applicability...');
                // Simplified applicability check from PolicyResolver
                const match = policies.find(p => p.applicability.teams?.all !== false);
                if (match) {
                    console.log(`Fallback policy match: ${match.policy_name}`);
                } else {
                    console.log('No policy found for user.');
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debug();
