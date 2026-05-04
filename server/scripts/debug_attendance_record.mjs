import mongoose from 'mongoose';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';
import User from '../model/userModel.mjs';

async function run() {
    try {
        await mongoose.connect('mongodb://localhost:27017/exim');
        const employeeId = '6672a2501aa931b68b091fd0';
        
        const user = await User.findById(employeeId);
        console.log(`Employee: ${user.username} (${employeeId})`);
        console.log(`Current Company ID: ${user.company_id}\n`);

        const recs = await AttendanceRecord.find({ 
            employee_id: employeeId, 
            year_month: '2026-04'
        }).sort({ attendance_date: 1 });
        
        console.log('Date       | Status   | Company ID               | Match?');
        console.log('-----------|----------|--------------------------|-------');
        recs.forEach(r => {
            const dateStr = r.attendance_date.toISOString().split('T')[0];
            const match = String(r.company_id) === String(user.company_id);
            console.log(`${dateStr} | ${r.status.padEnd(8)} | ${String(r.company_id).padEnd(24)} | ${match}`);
        });

    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
