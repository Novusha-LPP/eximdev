import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'C:/Users/india/Desktop/Projects/eximdev/server/.env' });

async function debug() {
    try {
        await mongoose.connect(process.env.PROD_MONGODB_URI);
        console.log('Connected to DB');

        const user = await mongoose.connection.db.collection('users').findOne({ username: /prem_chaudhry/i });
        if (!user) {
            console.log('User not found');
            return;
        }

        const applications = await mongoose.connection.db.collection('leaveapplications').find({ 
            employee_id: user._id
        }).sort({ from_date: -1 }).toArray();

        applications.forEach(a => {
            console.log(`\n==========================================`);
            console.log(`ID: ${a._id}`);
            console.log(`Date range: ${a.from_date_str} to ${a.to_date_str}`);
            console.log(`Days: ${a.total_days}, Leave Type: ${a.leave_type}`);
            console.log(`Status: ${a.approval_status}, Stage: ${a.approval_stage}`);
            console.log(`Current Approver ID: ${a.current_approver_id}`);
            console.log(`Approval Chain:`, JSON.stringify(a.approval_chain, null, 2));
            console.log(`Approval History:`, JSON.stringify(a.approval_history, null, 2));
            console.log(`HOD Reviewed By: ${a.hod_reviewed_by}, HOD Reviewed At: ${a.hod_reviewed_at}`);
            console.log(`Final Reviewed By: ${a.final_reviewed_by}, Final Reviewed At: ${a.final_reviewed_at}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

debug();
