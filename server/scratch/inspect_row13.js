import XLSX from 'xlsx';
const workbook = XLSX.readFile('/home/aiserver/eximdev/RM_Procurement_SOP for Exim.xlsx');
const sheet = workbook.Sheets['1. Sales Order & RM Estimate'];

console.log('Keys in row 12:', Object.keys(sheet).filter(k => k.endsWith('12')));
console.log('Keys in row 13:', Object.keys(sheet).filter(k => k.endsWith('13')));

Object.keys(sheet).filter(k => k.endsWith('12') || k.endsWith('13')).sort().forEach(k => {
  console.log(`${k}:`, sheet[k]);
});
