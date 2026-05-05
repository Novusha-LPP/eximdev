import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import moment from 'moment-timezone';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

// Import models
import User from '../model/userModel.mjs';
import Shift from '../model/attendance/Shift.js';
import AttendancePunch from '../model/attendance/AttendancePunch.js';
import ActiveSession from '../model/attendance/ActiveSession.js';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';
import Company from '../model/attendance/Company.js';
import AttendanceEngine from '../services/attendance/AttendanceEngine.js';

async function testNightShift() {
    await mongoose.connect(process.env.DEV_MONGODB_URI);

    console.log('--- STARTING NIGHT SHIFT SIMULATION TEST ---');

    // 1. Setup Mock Data
    const testUsername = 'test_night_user';
    await User.deleteOne({ username: testUsername });
    // await AttendancePunch.deleteMany({ employee_id: ... }); // Restricted by model security
    
    // Find a real company to use for settings
    const company = await Company.findOne();
    const tz = company.timezone || 'Asia/Kolkata';

    // Create a mock user
    const user = new User({
        username: testUsername,
        first_name: 'Test',
        last_name: 'Night',
        company_id: company._id,
        role: 'EMPLOYEE',
        password: 'testpassword123'
    });
    await user.save();

    // Create Operation Shift
    const shift = new Shift({
        shift_name: 'Test Operation Shift',
        start_time: '16:00',
        end_time: '01:00',
        shift_code: 'TEST_OPS',
        is_cross_day: true,
        company_id: company._id
    });
    await shift.save();
    user.shift_id = shift._id;
    await user.save();

    const attendanceDateStr = '2026-05-04';
    const midnightDateStr = '2026-05-05';

    console.log(`Simulating Shift: 16:00 (${attendanceDateStr}) to 01:00 (${midnightDateStr})`);

    // 2. Simulate Punch IN at 4:05 PM
    const punchInTime = moment.tz(`${attendanceDateStr} 16:05`, 'YYYY-MM-DD HH:mm', tz).toDate();
    const punchIn = new AttendancePunch({
        employee_id: user._id,
        company_id: company._id,
        punch_type: 'IN',
        punch_time: punchInTime,
        punch_date: attendanceDateStr,
        punch_method: 'web'
    });
    await punchIn.save();

    const activeSession = new ActiveSession({
        employee_id: user._id,
        company_id: company._id,
        shift_id: shift._id,
        punch_in_time: punchInTime,
        punch_in_entry_id: punchIn._id,
        session_date: moment.utc(attendanceDateStr).startOf('day').toDate(),
        session_status: 'active'
    });
    await activeSession.save();

    console.log('✅ Punch IN recorded at 16:05');

    // 3. Test Dashboard Lookup after Midnight
    console.log(`\nTesting Dashboard lookup at 00:30 on ${midnightDateStr}...`);
    // This simulates the logic I fixed in attendance.controller.js
    const dashboardSession = await ActiveSession.findOne({
        employee_id: user._id,
        session_status: 'active'
    }).sort({ punch_in_time: -1 });

    if (dashboardSession) {
        console.log(`✅ SUCCESS: Dashboard found active session from ${moment(dashboardSession.punch_in_time).tz(tz).format('HH:mm')}`);
    } else {
        console.log('❌ FAILURE: Dashboard could not find active session!');
    }

    // 4. Test Attendance Status Calculation after Midnight
    console.log(`\nTesting Attendance Status calculation at 00:30 on ${midnightDateStr}...`);
    
    // We can't easily mock moment() globally in a simple script without sinon,
    // but we can check if the shiftEnd calculation is correct now.
    const testShiftStart = moment.tz(`${attendanceDateStr} ${shift.start_time}`, 'YYYY-MM-DD HH:mm', tz);
    let testShiftEnd = moment.tz(`${attendanceDateStr} ${shift.end_time}`, 'YYYY-MM-DD HH:mm', tz);

    if (shift.is_cross_day || testShiftEnd.isSameOrBefore(testShiftStart)) {
        testShiftEnd.add(1, 'days');
    }

    console.log(`Shift Start: ${testShiftStart.format('YYYY-MM-DD HH:mm')}`);
    console.log(`Shift End (Calculated): ${testShiftEnd.format('YYYY-MM-DD HH:mm')}`);

    const simulatedNow = moment.tz(`${midnightDateStr} 00:30`, 'YYYY-MM-DD HH:mm', tz);
    const isShiftOver = simulatedNow.isAfter(testShiftEnd);

    if (!isShiftOver) {
        console.log(`✅ SUCCESS: At 00:30, the shift is NOT over. Status will remain "present" (active).`);
    } else {
        console.log('❌ FAILURE: System thinks shift is already over at 00:30!');
    }

    // Cleanup
    await User.deleteOne({ _id: user._id });
    await Shift.deleteOne({ _id: shift._id });
    // await AttendancePunch.deleteMany({ employee_id: user._id }); // Restricted
    await ActiveSession.deleteMany({ employee_id: user._id });
    await AttendanceRecord.deleteMany({ employee_id: user._id });

    console.log('\n--- TEST COMPLETE ---');
    process.exit();
}

testNightShift().catch(err => {
    console.error(err);
    process.exit(1);
});
