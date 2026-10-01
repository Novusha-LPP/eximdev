const fs = require('fs');
const content = fs.readFileSync('C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/VirtualBalanceList.jsx', 'utf8');

function showAround(str, label) {
  const idx = content.indexOf(str);
  console.log(`--- ${label} (idx: ${idx}) ---`);
  if (idx !== -1) {
    console.log(content.slice(idx, idx + 300));
  }
}

showAround('export default function VirtualBalanceList', 'header');
showAround('const fetchEntries = useCallback', 'fetchEntries');
showAround('const handleExportExcel', 'exportExcel');
showAround('<FormControl size="small" sx={{ width: 140 }}>', 'filterStack');
