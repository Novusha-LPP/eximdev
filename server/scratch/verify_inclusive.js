
import moment from 'moment';

const from = '2026-04-09';
const to = '2026-04-13';

const start = moment(from).startOf('day');
const end = moment(to).startOf('day');

console.log('From:', from);
console.log('To:', to);

let days = 0;
let curr = moment(start);
while (curr.isSameOrBefore(end, 'day')) {
    days++;
    console.log(' - Day:', curr.format('YYYY-MM-DD'));
    curr.add(1, 'day');
}

console.log('Total Days (Inclusive):', days);
