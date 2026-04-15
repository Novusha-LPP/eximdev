import mongoose from 'mongoose';
import LeaveApplication from '../model/attendance/LeaveApplication.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    try {
        await mongoose.connect('mongodb://localhost:27017/exim');
        const apps = await LeaveApplication.find({ 
            employee_id: '6672a2501aa931b68b091fa9',
            approval_status: 'pending'
        });
        
        console.log(`Found ${apps.length} pending applications:`);
        apps.forEach(app => {
            console.log(`- From: ${app.from_date}, To: ${app.to_date}, Days: ${app.total_days}, Type: ${app.leave_type}`);
        });

        const totalPendingDays = apps.reduce((sum, app) => sum + (app.total_days || 0), 0);
        console.log(`\nTotal Pending Days in Applications: ${totalPendingDays}`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
