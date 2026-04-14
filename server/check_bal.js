import mongoose from 'mongoose';
import LeaveBalance from './model/attendance/LeaveBalance.js';

async function check() {
    await mongoose.connect('mongodb://localhost:27017/eximdev');
    const bal = await LeaveBalance.find({ employee_id: '6672a2501aa931b68b091fa9' });
    console.log(JSON.stringify(bal, null, 2));
    process.exit(0);
}
check();
