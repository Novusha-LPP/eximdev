import XLSX from "xlsx";

const filePath = "/home/aiserver/eximdev/RM_Procurement_SOP for Exim.xlsx";
const workbook = XLSX.readFile(filePath);

for (let i = 0; i < 3; i++) {
  const sheetName = workbook.SheetNames[i];
  console.log(`\n================ ${sheetName} ================`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  data.forEach((row, idx) => {
    if (row.some(val => val !== "")) {
      console.log(`Row ${idx + 1}:`, row);
    }
  });
}
