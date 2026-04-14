import mongoose from 'mongoose';
import UserModel from './model/userModel.mjs';
import LeavePolicy from './model/attendance/LeavePolicy.js';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.PROD_MONGODB_URI;

async function check() {
    await mongoose.connect(uri);
    console.log('Connected to', uri.split('@').pop().split('/')[0]);
    
    const user = await UserModel.findById('696f7ae5e2e6cdb81b34f7ce');
    console.log('User Name:', user?.first_name, user?.last_name);
    console.log('User Company:', user?.company_id);
    console.log('User Leave Settings:', JSON.stringify(user?.leave_settings, null, 2));
    
    const policies = await LeavePolicy.find({ status: 'active' });
    console.log('Active Policies:', policies.map(p => ({ 
        id: p._id, 
        name: p.policy_name, 
        type: p.leave_type, 
        company: p.company_id
    })));
    
    process.exit(0);
}
check();
