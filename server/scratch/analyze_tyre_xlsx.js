import XLSX from 'xlsx';
import fs from 'fs';

const filePath = '/home/aiserver/eximdev/Tyre_SOP_Complete for Exim.xlsx';

if (!fs.existsSync(filePath)) {
  console.error('File does not exist:', filePath);
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach((sheetName) => {
  console.log(`\n========================================`);
  console.log(`SHEET: ${sheetName}`);
  console.log(`========================================`);
  const sheet = workbook.Sheets[sheetName];
  const csv = XLSX.utils.sheet_to_csv(sheet);
  
  // Print first 60 lines of each sheet to understand structure
  const lines = csv.split('\n').slice(0, 60);
  lines.forEach((line, index) => {
    if (line.replace(/,/g, '').trim()) {
      console.log(`${index + 1}: ${line}`);
    }
  });
});
