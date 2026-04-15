import mongoose from 'mongoose';
import UserModel from '../model/userModel.mjs';
import LeavePolicy from '../model/attendance/LeavePolicy.js';
import LeaveBalance from '../model/attendance/LeaveBalance.js';
import dotenv from 'dotenv';

dotenv.config();

const uri = "mongodb://localhost:27017/exim";

async function run() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const user = await UserModel.findOne({ username: 'arpit_singhal' });
        if (!user) {
            console.log('User not found');
            return;
        }

        const policyIds = user.leave_settings.special_leave_policies;
        console.log('Assigned Policy IDs:', policyIds);

        const policies = await LeavePolicy.find({ _id: { $in: policyIds } });
        console.log('Policies Info:');
        policies.forEach(p => {
            console.log(`- ID: ${p._id}, Name: ${p.policy_name}, Quota: ${p.annual_quota}`);
        });

        // Identify the one to remove: Name is 'Privilege Leave' AND Quota is 25
        const toRemove = policies.find(p => p.policy_name === 'Privilege Leave' && p.annual_quota === 25);
        if (toRemove) {
            console.log('\nFound policy to remove:', toRemove._id, toRemove.policy_name, toRemove.annual_quota);
            
            // Remove from special_leave_policies
            const newPolicies = user.leave_settings.special_leave_policies.filter(id => id.toString() !== toRemove._id.toString());
            user.leave_settings.special_leave_policies = newPolicies;
            
            // Update user
            await UserModel.updateOne(
                { _id: user._id },
                { $set: { 'leave_settings.special_leave_policies': newPolicies } }
            );
            console.log('Successfully removed policy from user settings.');

            // Also check if there's a balance record for this problematic policy and delete it if it exists
            const balanceResult = await LeaveBalance.deleteMany({
                employee_id: user._id,
                leave_policy_id: toRemove._id
            });
            console.log(`Deleted ${balanceResult.deletedCount} balance records for the removed policy.`);

        } else {
            console.log('Policy with Quota 25 not found in assigned policies.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
