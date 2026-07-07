import XLSX from "xlsx";

const filePath = "/home/aiserver/eximdev/RM_Procurement_SOP for Exim.xlsx";
const workbook = XLSX.readFile(filePath);

workbook.SheetNames.forEach((sheetName) => {
  console.log(`\n================ ${sheetName} ================`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  data.forEach((row, rIdx) => {
    row.forEach((cell, cIdx) => {
      if (cell !== undefined && cell !== null && cell !== "") {
        // Only print cells that are not just standard column headers
        const cellStr = String(cell).trim();
        if (cellStr.length > 0) {
          console.log(`Cell [Row ${rIdx + 1}, Col ${cIdx + 1}]:`, cellStr);
        }
      }
    });
  });
});
