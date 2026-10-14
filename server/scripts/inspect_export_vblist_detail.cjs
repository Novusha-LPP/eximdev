const fs = require('fs');
const content = fs.readFileSync('C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/VirtualBalanceList.jsx', 'utf8');
const lines = content.split('\n');

console.log('--- LINES 75-125 ---');
console.log(lines.slice(75, 125).join('\n'));

console.log('\n--- FETCH ENTRIES ---');
const fIdx = lines.findIndex(l => l.includes('fetchEntries = useCallback'));
if (fIdx !== -1) {
  console.log(lines.slice(fIdx, fIdx + 45).join('\n'));
}
