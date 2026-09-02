import XLSX from 'xlsx';
import fs from 'fs';

const filePath = '/home/aiserver/eximdev/RM_Procurement_SOP for Exim.xlsx';
const workbook = XLSX.readFile(filePath);

const sheetsToInspect = ['1. Sales Order & RM Estimate', '4. Pricing Validation', '8. RM Goods Received Note'];

sheetsToInspect.forEach((sheetName) => {
  console.log(`\n========================================`);
  console.log(`SHEET: ${sheetName}`);
  console.log(`========================================`);
  const sheet = workbook.Sheets[sheetName];
  
  // Find range
  const range = XLSX.utils.decode_range(sheet['!ref']);
  for (let r = range.s.r; r <= range.e.r; r++) {
    let rowStr = `Row ${r + 1}: `;
    let hasValue = false;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellRef];
      if (cell) {
        hasValue = true;
        const colLetter = XLSX.utils.encode_col(c);
        rowStr += `[${colLetter}:${cell.v || ''}${cell.f ? ' (formula: ' + cell.f + ')' : ''}] `;
      }
    }
    // Print rows around headers and formulas
    if (hasValue && (r < 18 || (r >= 22 && r <= 35))) {
      console.log(rowStr);
    }
  }
});
