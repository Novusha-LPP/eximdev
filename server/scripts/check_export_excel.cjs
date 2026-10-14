const fs = require('fs');
const content = fs.readFileSync('C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/VirtualBalanceList.jsx', 'utf8');

const idx = content.indexOf('handleExportExcel');
if (idx !== -1) {
  console.log(content.slice(idx, idx + 800));
}
