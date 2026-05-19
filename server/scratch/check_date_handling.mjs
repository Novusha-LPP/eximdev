import mongoose from 'mongoose';
import dotenv from 'dotenv';
import moment from 'moment';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';

dotenv.config({ path: '../.env' });

async function checkDateHandling() {
    try {
        const uri = 'mongodb://localhost:27017/exim';
        await mongoose.connect(uri);
        console.log('Connected to Local MongoDB');

        const dateStr = '2026-05-08';
        const record = await AttendanceRecord.findOne({ attendance_date_str: dateStr });
        
        if (record) {
            console.log(`Record for ${dateStr}:`);
            console.log(`attendance_date_str: ${record.attendance_date_str}`);
            console.log(`attendance_date (Date object): ${record.attendance_date.toISOString()}`);
            
        const momentDate = moment(dateStr).startOf('day').toDate();
        console.log(`Querying with moment('${dateStr}').toDate(): ${momentDate.toISOString()}`);
        
        const nativeDate = new Date(dateStr);
        console.log(`Querying with new Date('${dateStr}'): ${nativeDate.toISOString()}`);

        const matchMoment = await AttendanceRecord.findOne({ attendance_date: momentDate });
        console.log(`Match found with moment Date object? ${matchMoment ? 'YES' : 'NO'}`);

        const matchNative = await AttendanceRecord.findOne({ attendance_date: nativeDate });
        console.log(`Match found with native Date object? ${matchNative ? 'YES' : 'NO'}`);
        } else {
            console.log(`No record found for ${dateStr} in local DB`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkDateHandling();
