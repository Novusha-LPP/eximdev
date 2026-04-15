import mongoose from 'mongoose';
import LeavePolicy from '../model/attendance/LeavePolicy.js';
import LeaveBalance from '../model/attendance/LeaveBalance.js';
import UserModel from '../model/userModel.mjs';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.PROD_MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const policies = await LeavePolicy.find({ 
            $or: [
                { annual_quota: 25 },
                { annual_quota: 23 },
                { policy_name: /Privilege/i }
            ]
        });
        
        console.log('Found policies:');
        policies.forEach(p => {
            console.log(`- ${p.policy_name} (ID: ${p._id}), Quota: ${p.annual_quota}, Status: ${p.status}, Company: ${p.company_id}`);
        });

        const policyIds = policies.map(p => p._id);
        const balances = await LeaveBalance.find({ leave_policy_id: { $in: policyIds } }).limit(50);
        console.log('\nSample balances for these policies:');
        for (const bal of balances) {
            const user = await UserModel.findById(bal.employee_id);
            console.log(`- User: ${user?.first_name} ${user?.last_name} (${user?.username}), Year: ${bal.year}, Opening: ${bal.opening_balance}, Policy ID: ${bal.leave_policy_id}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
