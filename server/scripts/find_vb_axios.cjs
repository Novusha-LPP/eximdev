const fs = require('fs');
const content = fs.readFileSync('C:/Users/india/Desktop/projects/eximdev/client/src/components/Import-billing/VirtualBalanceList.js', 'utf8');

const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('axios.') || l.includes('Delete') || l.includes('delete')) {
    console.log(`${i+1}: ${l}`);
  }
});
