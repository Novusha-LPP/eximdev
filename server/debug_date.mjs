import moment from 'moment';

const start = moment('2026-04-06T00:00:00.000Z').startOf('day').toDate();
const end = moment('2026-04-10T00:00:00.000Z').endOf('day').toDate();
let dayCursor = moment(start).startOf('day');
const dayEnd = moment(end).endOf('day');

console.log('Today moment():', moment().format());
console.log('Is 8th before today?', moment('2026-04-08').isSameOrBefore(moment(), 'day'));

while (dayCursor.isSameOrBefore(dayEnd, 'day')) {
    const dayStr = dayCursor.format('YYYY-MM-DD');
    let status = '';
    
    if (dayStr === '2026-04-06') status = 'incomplete';
    else if (dayStr === '2026-04-07') status = 'present';
    else if (dayStr === '2026-04-09') status = 'present';
    else if (dayCursor.isSameOrBefore(moment(), 'day')) {
        status = 'absent';
    } else {
        status = 'skipped/future';
    }
    
    console.log(dayStr, status);
    dayCursor.add(1, 'day');
}
