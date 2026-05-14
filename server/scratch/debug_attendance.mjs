import mongoose from 'mongoose';
import dotenv from 'dotenv';
import moment from 'moment-timezone';
dotenv.config();

async function check() {
    try {
        await mongoose.connect('mongodb://localhost:27017/exim');
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
        const users = await User.find({ $or: [
            { username: /jeeya/i },
            { first_name: /jeeya/i }
        ]});
        console.log('Users found:', users.length);
        users.forEach(u => console.log(`User: ${u.username}, ID: ${u._id}, Code: ${u.employee_code}`));

        const user = users.find(u => u.username.toLowerCase().includes('jeeya_inamdar')) || users[0];
        if (!user) {
            console.log('User not found');
            return;
        }
        console.log('User ID:', user._id);
        console.log('User Name:', user.first_name, user.last_name);

        const AttendanceRecord = mongoose.model('AttendanceRecord', new mongoose.Schema({}, { strict: false }), 'attendancerecords');
        const Holiday = mongoose.model('Holiday', new mongoose.Schema({}, { strict: false }), 'holidays');
        const holidays = await Holiday.find({
            company_id: user.company_id,
            holiday_date: { 
                $gte: moment.utc('2026-05-08').startOf('day').toDate(),
                $lte: moment.utc('2026-05-08').endOf('day').toDate()
            }
        });
        console.log('Holidays for 2026-05-08:', JSON.stringify(holidays, null, 2));

        const records = await AttendanceRecord.find({ 
            employee_id: user._id, 
            attendance_date_str: '2026-05-08' 
        });
        console.log('Records for 2026-05-08:', JSON.stringify(records, null, 2));

        const allMayRecords = await AttendanceRecord.find({
            employee_id: user._id,
            attendance_date_str: { $regex: /^2026-05/ }
        }).sort({ attendance_date: -1 });
        
        console.log('All May Records count:', allMayRecords.length);
        allMayRecords.forEach(r => {
            console.log(`${r.attendance_date_str} - ${r.status} - ID: ${r._id}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

check();
