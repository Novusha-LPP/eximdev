import moment from 'moment-timezone';
import { applyManualCorrectionTimes, buildDateTimeFromShift } from '../controllers/attendance/attendance.controller.js';

const tz = 'Asia/Kolkata';
const attendanceDate = moment.tz('2026-04-06', 'YYYY-MM-DD', tz).toDate();
const shift = { start_time: '10:00', end_time: '19:00', half_day_hours: 4 };

const record = {};

applyManualCorrectionTimes(record, attendanceDate, 'half_day', shift, tz, undefined, undefined, 'second_half');

console.log('first_in (UTC):', moment(record.first_in).utc().format('YYYY-MM-DD HH:mm:ss [UTC]'));
console.log('first_in (local):', moment(record.first_in).tz(tz).format('YYYY-MM-DD HH:mm z'));
console.log('last_out (UTC):', moment(record.last_out).utc().format('YYYY-MM-DD HH:mm:ss [UTC]'));
console.log('last_out (local):', moment(record.last_out).tz(tz).format('YYYY-MM-DD HH:mm z'));

const firstLocal = moment(record.first_in).tz(tz).format('HH:mm');
const lastLocal = moment(record.last_out).tz(tz).format('HH:mm');

if (firstLocal === '15:00' && lastLocal === '19:00') {
  console.log('PASS: second-half times set correctly');
  process.exit(0);
} else {
  console.error('FAIL: expected 15:00-19:00, got', firstLocal, lastLocal);
  process.exit(2);
}
