import mongoose from 'mongoose';
import LeavePolicy from '../model/attendance/LeavePolicy.js';
import LeaveBalance from '../model/attendance/LeaveBalance.js';
import UserModel from '../model/userModel.mjs';
import dotenv from 'dotenv';

dotenv.config();

const uris = [
    process.env.PROD_MONGODB_URI,
    process.env.DEV_MONGODB_URI,
    process.env.SERVER_MONGODB_URI,
    "mongodb://exim:I9y5bcMUHkGHpgq2@ac-oqmvpdw-shard-00-00.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-01.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-02.xya3qh0.mongodb.net:27017/exim-gandhidham?ssl=true&replicaSet=atlas-103rb8-shard-0&authSource=admin&retryWrites=true&w=majority"
];

async function run() {
    for (const uri of uris) {
        if (!uri) continue;
        try {
            console.log('\n========================================');
            console.log('Testing URI:', uri.split('@').pop().split('?')[0]);
            await mongoose.connect(uri);
            
            const user = await UserModel.findOne({ first_name: /Arpit/i, last_name: /Singhal/i });
            if (user) {
                console.log('FOUND ARPIT SINGHAL!');
                console.log('User ID:', user._id);
                console.log('Username:', user.username);
                console.log('Company ID:', user.company_id);
                
                const balances = await LeaveBalance.find({ employee_id: user._id });
                console.log('Balances:', JSON.stringify(balances.map(b => ({
                    year: b.year,
                    policy_id: b.leave_policy_id,
                    type: b.leave_type,
                    opening: b.opening_balance,
                    used: b.used,
                    available: b.available,
                    closing: b.closing_balance
                })), null, 2));

                const policies = await LeavePolicy.find({ _id: { $in: user.leave_settings?.special_leave_policies || [] } });
                console.log('Assigned Policies:', policies.map(p => p.policy_name));
            } else {
                console.log('Not found in this DB');
            }
            await mongoose.disconnect();
        } catch (err) {
            console.error('Error with URI:', uri);
        }
    }
}

run();
