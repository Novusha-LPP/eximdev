
import moment from 'moment';

const ATTENDANCE_TIME_ZONE = 'Asia/Kolkata';

const getTimeZoneParts = (date, timeZone = ATTENDANCE_TIME_ZONE) => {
  if (!date) return null;

  const dateObj = new Date(date);

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(dateObj);

  return parts.reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
};

const getAttendanceDateKey = (date, timeZone = ATTENDANCE_TIME_ZONE) => {
  const parts = getTimeZoneParts(date, timeZone);
  if (!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}`;
};

// Test with a date in April 2026
const testDate = '2026-04-01T00:00:00.000Z'; // Midnight UTC
console.log('Test Date:', testDate);
console.log('Result:', getAttendanceDateKey(testDate));

const testDate2 = '2026-04-01T05:30:00.000Z'; // 5:30 AM UTC (11 AM IST)
console.log('Test Date 2:', testDate2);
console.log('Result 2:', getAttendanceDateKey(testDate2));

const momentDate = moment([2026, 3, 1]).format('YYYY-MM-DD');
console.log('Moment Result:', momentDate);
