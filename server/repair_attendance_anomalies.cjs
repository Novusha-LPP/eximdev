const mongoose = require('mongoose');
const moment = require('moment-timezone');

async function repairAttendance() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect('mongodb://exim:I9y5bcMUHkGHpgq2@ac-oqmvpdw-shard-00-00.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-01.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-02.xya3qh0.mongodb.net:27017/exim?ssl=true&replicaSet=atlas-103rb8-shard-0&authSource=admin&retryWrites=true&w=majority');
    const db = mongoose.connection.db;

    // --- STEP 1: Fix Shift Configuration Anomalies ---
    console.log('\n--- Step 1: Checking for incorrectly marked cross-day shifts ---');
    const shifts = await db.collection('shifts').find({ is_cross_day: true }).toArray();
    let shiftFixCount = 0;

    for (const shift of shifts) {
      const [startH, startM] = shift.start_time.split(':').map(Number);
      const [endH, endM] = shift.end_time.split(':').map(Number);
      
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      // If start is before end, it's NOT a cross-day shift (unless it's a very specific night shift logic not used here)
      if (startMin < endMin) {
        console.log(`Fixing Shift: ${shift.shift_name} (${shift.start_time} - ${shift.end_time}). is_cross_day should be false.`);
        await db.collection('shifts').updateOne(
          { _id: shift._id },
          { $set: { is_cross_day: false, updated_by: 'system_repair_script' } }
        );
        shiftFixCount++;
      }
    }
    console.log(`Fixed ${shiftFixCount} shifts.`);

    // --- STEP 2: Fix Anomalous Attendance Records ---
    console.log('\n--- Step 2: Repairing anomalous Early Exit records (> 10 hours) ---');
    
    // We look for early_exit_minutes > 600 (10 hours) which usually indicates a calculation error 
    // involving 24-hour wrap-arounds or cross-day misinterpretation.
    const anomalousRecords = await db.collection('attendancerecords').find({
      early_exit_minutes: { $gt: 600 },
      attendance_date: { $gte: new Date('2026-04-01') } // Focus on recent records
    }).toArray();

    console.log(`Found ${anomalousRecords.length} anomalous records.`);
    let recordFixCount = 0;

    for (const record of anomalousRecords) {
      const user = await db.collection('users').findOne({ _id: record.employee_id });
      if (!user) continue;

      const shift = await db.collection('shifts').findOne({ _id: record.shift_id });
      if (!shift) continue;

      const tz = 'Asia/Kolkata'; // Standard project TZ
      const dateStr = moment(record.attendance_date).format('YYYY-MM-DD');
      
      // Calculate what shiftEnd should actually be
      const shiftEnd = moment.tz(`${dateStr} ${shift.end_time}`, 'YYYY-MM-DD HH:mm', tz);
      // Only add a day if the shift is genuinely cross-day (start > end)
      const [sH, sM] = shift.start_time.split(':').map(Number);
      const [eH, eM] = shift.end_time.split(':').map(Number);
      if (sH * 60 + sM > eH * 60 + eM) {
          shiftEnd.add(1, 'days');
      }

      if (record.last_out) {
        const punchOut = moment.tz(record.last_out, tz);
        
        // Normalize punchOut to be relative to shiftEnd (same as the engine does, but correctly)
        const candidates = [
            punchOut.clone(),
            punchOut.clone().add(1, 'days'),
            punchOut.clone().subtract(1, 'days')
        ];
        candidates.sort((a, b) => Math.abs(a.diff(shiftEnd, 'minutes')) - Math.abs(b.diff(shiftEnd, 'minutes')));
        const normPunchOut = candidates[0];

        const buffer = shift.early_leave_allowed_minutes || 0;
        let newIsEarlyExit = false;
        let newEarlyExitMinutes = 0;

        if (normPunchOut.isBefore(shiftEnd.clone().subtract(buffer, 'minutes'))) {
            newIsEarlyExit = true;
            newEarlyExitMinutes = Math.max(0, shiftEnd.diff(normPunchOut, 'minutes'));
        }

        console.log(`Repairing ${user.username} on ${dateStr}: early_exit ${record.early_exit_minutes}m -> ${newEarlyExitMinutes}m`);
        
        await db.collection('attendancerecords').updateOne(
          { _id: record._id },
          { $set: { 
              is_early_exit: newIsEarlyExit,
              early_exit_minutes: newEarlyExitMinutes,
              remarks: (record.remarks || '') + ' [System fix: anomalous early exit correction]'
          }}
        );
        recordFixCount++;
      }
    }

    console.log(`\nSuccessfully repaired ${recordFixCount} attendance records.`);
    console.log('Done.');
    process.exit(0);

  } catch (err) {
    console.error('Repair failed:', err);
    process.exit(1);
  }
}

repairAttendance();
