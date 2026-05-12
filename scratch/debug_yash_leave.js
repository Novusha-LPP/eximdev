import mongoose from 'mongoose';
import LeaveApplication from './server/model/attendance/LeaveApplication.js';
import User from './server/model/userModel.mjs';

async function debug() {
    try {
        await mongoose.connect('mongodb://localhost:27017/eximdev');
        console.log('Connected');

        const user = await User.findOne({ username: /yash_gupta/i });
        if (!user) {
            console.log('User not found');
            return;
        }
        console.log('User ID:', user._id);

        const leaves = await LeaveApplication.find({ employee_id: user._id }).lean();
        console.log('Total leaves found:', leaves.length);
        leaves.forEach(l => {
            console.log(`- From: ${l.from_date}, To: ${l.to_date}, Status: ${l.approval_status}, Stage: ${l.approval_stage}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

debug();
