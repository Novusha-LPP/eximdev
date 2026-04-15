import mongoose from 'mongoose';
import LeaveBalance from '../model/attendance/LeaveBalance.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    try {
        await mongoose.connect('mongodb://localhost:27017/exim');
        const bal = await LeaveBalance.findOne({ 
            employee_id: '6672a2501aa931b68b091fa9', 
            year: 2026, 
            leave_type: 'privilege' 
        });
        console.log('Balance found:', JSON.stringify(bal, null, 2));
        
        if (bal) {
            const opening = Number(bal.opening_balance || 0);
            const used = Number(bal.used || 0);
            const pending = Number(bal.pending_approval || 0);
            const actualClosing = Math.max(0, opening - used);
            const available = Math.max(0, actualClosing - pending);
            
            console.log('\nCalculated:');
            console.log('Opening:', opening);
            console.log('Used:', used);
            console.log('Pending:', pending);
            console.log('Actual Closing (Opening - Used):', actualClosing);
            console.log('Available (Actual Closing - Pending):', available);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
