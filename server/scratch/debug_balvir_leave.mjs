import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'C:/Users/india/Desktop/Projects/eximdev/SERVER/.env' });

async function debug() {
    try {
        await mongoose.connect(process.env.PROD_MONGODB_URI);
        console.log('Connected to DB');

        const user = await mongoose.connection.db.collection('users').findOne({ username: /balvir/i });
        if (!user) {
            console.log('User not found');
            return;
        }
        console.log('User found:', user._id, user.username);

        const attendance = await mongoose.connection.db.collection('attendancerecords').find({ 
            employee_id: user._id
        }).sort({ attendance_date: -1 }).limit(10).toArray();

        console.log('Attendance Records:');
        attendance.forEach(a => {
            console.log(`- Date: ${a.attendance_date.toISOString()} Status: ${a.status}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

debug();
