const XLSX = require('xlsx');
const workbook = XLSX.readFile('../Fleet Insurance Proposal List_Policy Portal (2).xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
for(let i=0; i<10; i++) {
  console.log(`Row ${i}:`, data[i]);
}
