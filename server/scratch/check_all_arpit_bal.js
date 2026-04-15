import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/exim_erp_attendance';

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        const LeaveBalance = mongoose.model('LeaveBalance', new mongoose.Schema({}, { strict: false }), 'leavebalances');
        const balances = await LeaveBalance.find({ employee_id: new mongoose.Types.ObjectId('6672a2501aa931b68b091fa9') });
        console.log('Balances per policy:');
        balances.forEach(b => {
            console.log(`Policy: ${b.leave_type} (${b.leave_policy_id}), Pending: ${b.pending_approval}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
