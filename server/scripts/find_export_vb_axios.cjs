const fs = require('fs');
const content = fs.readFileSync('C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/VirtualBalanceList.jsx', 'utf8');

const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('axios.') || l.includes('Delete') || l.includes('delete')) {
    console.log(`${i+1}: ${l}`);
  }
});
