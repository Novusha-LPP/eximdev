const fs = require('fs');
const path = 'c:\\Users\\india\\Desktop\\Projects\\eximdev\\server\\controllers\\attendance\\attendance.controller.js';

let content = fs.readFileSync(path, 'utf8');

// Find and replace the date normalization with more robust checks
const oldDates = "        // Normalize dates safely\r\n        let start = moment(startDate || new Date()).startOf('day').toDate();\r\n        let end = moment(endDate || new Date()).endOf('day').toDate();";

const newDates = "        // Normalize dates safely - handle malformed strings like 'Invalid date' from frontend\r\n        const isValidStart = startDate && startDate !== 'Invalid date';\r\n        const isValidEnd = endDate && endDate !== 'Invalid date';\r\n        let start = moment(isValidStart ? startDate : new Date()).startOf('day').toDate();\r\n        let end = moment(isValidEnd ? endDate : new Date()).endOf('day').toDate();";

if (content.includes(oldDates)) {
    content = content.replace(oldDates, newDates);
    console.log('Backend date normalization updated with defensive checks.');
} else {
    // If exact lines not found, try a version with potentially different newlines
    const altOldDates = "        // Normalize dates safely\n        let start = moment(startDate || new Date()).startOf('day').toDate();\n        let end = moment(endDate || new Date()).endOf('day').toDate();";
    if (content.includes(altOldDates)) {
        content = content.replace(altOldDates, newDates.replace(/\r\n/g, '\n'));
        console.log('Backend date normalization updated (LF mode).');
    } else {
        console.log('WARN: Backend date normalization lines not found.');
    }
}

fs.writeFileSync(path, content);
console.log('Done.');
