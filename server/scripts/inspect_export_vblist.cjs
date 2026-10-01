const fs = require('fs');
const content = fs.readFileSync('C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/VirtualBalanceList.jsx', 'utf8');

const idx = content.indexOf('fetchEntries = useCallback');
if (idx !== -1) {
  console.log(content.slice(idx, idx + 1000));
} else {
  const idx2 = content.indexOf('fetchEntries');
  console.log(content.slice(idx2, idx2 + 1000));
}
