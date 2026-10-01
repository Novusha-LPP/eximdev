const fs = require('fs');
const content = fs.readFileSync('C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/VirtualBalanceList.jsx', 'utf8');
const lines = content.split('\n');

const stackIdx = lines.findIndex(l => l.includes('Top Filter and Search Bar'));
console.log('--- FILTER BAR ---');
console.log(lines.slice(stackIdx, stackIdx + 60).join('\n'));

const thIdx = lines.findIndex(l => l.includes('<TableHead>'));
console.log('\n--- TABLE HEAD ---');
console.log(lines.slice(thIdx, thIdx + 30).join('\n'));
