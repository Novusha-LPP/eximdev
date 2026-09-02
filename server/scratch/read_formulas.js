import XLSX from 'xlsx';
import fs from 'fs';

const filePath = '/home/aiserver/eximdev/RM_Procurement_SOP for Exim.xlsx';

if (!fs.existsSync(filePath)) {
  console.error('File does not exist:', filePath);
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);

workbook.SheetNames.forEach((sheetName) => {
  const sheet = workbook.Sheets[sheetName];
  console.log(`\n========================================`);
  console.log(`SHEET: ${sheetName}`);
  console.log(`========================================`);
  
  for (const cellRef in sheet) {
    if (cellRef[0] === '!') continue; // Skip metadata
    const cell = sheet[cellRef];
    if (cell.f) {
      console.log(`${cellRef}: formula = "${cell.f}", value = ${cell.v}`);
    }
  }
});
