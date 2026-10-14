const fs = require('fs');
const content = fs.readFileSync('C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/CashflowTracker.jsx', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(75, 110).join('\n'));
