import mongoose from 'mongoose';
import UserModel from '../model/userModel.mjs';
import LeavePolicy from '../model/attendance/LeavePolicy.js';
import LeaveBalance from '../model/attendance/LeaveBalance.js';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.PROD_MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const users = await UserModel.find({ first_name: /Arpit/i });
        console.log(`Found ${users.length} users with "Arpit" in name`);

        for (const user of users) {
            console.log('\n----------------------------------------');
            console.log('User Name:', user.first_name, user.last_name);
            console.log('User ID:', user._id);
            console.log('Username:', user.username);
            console.log('Current Special Policies:', user.leave_settings?.special_leave_policies);

            const balances = await LeaveBalance.find({ employee_id: user._id });
            
            console.log(`Balances for user ${user.username}:`);
            for (const bal of balances) {
                const policy = await LeavePolicy.findById(bal.leave_policy_id);
                console.log(`- Policy: ${policy?.policy_name} (ID: ${bal.leave_policy_id})`);
                console.log(`  Year: ${bal.year}, Type: ${bal.leave_type}`);
                console.log(`  Opening: ${bal.opening_balance}, Used: ${bal.used}, Available: ${bal.available}, Closing: ${bal.closing_balance}`);
            }

            const assignedPolicies = await LeavePolicy.find({ _id: { $in: user.leave_settings?.special_leave_policies || [] } });
            console.log('Assigned Policies in User Settings:');
            for (const p of assignedPolicies) {
                console.log(`- ${p.policy_name} (ID: ${p._id}), Type: ${p.leave_type}, Quota: ${p.annual_quota}, Company: ${p.company_id}`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
