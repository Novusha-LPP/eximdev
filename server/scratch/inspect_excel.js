import XLSX from "xlsx";
import path from "path";

const filePath = "/home/aiserver/eximdev/RM_Procurement_SOP for Exim.xlsx";

try {
  const workbook = XLSX.readFile(filePath);
  console.log("Sheet Names:", workbook.SheetNames);
  
  workbook.SheetNames.forEach((sheetName) => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    // Print first 20 rows
    data.slice(0, 20).forEach((row, index) => {
      console.log(`Row ${index + 1}:`, row);
    });
  });
} catch (error) {
  console.error("Error reading file:", error);
}
