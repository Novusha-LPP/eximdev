import XLSX from "xlsx";

const filePath = "/home/aiserver/eximdev/RM_Procurement_SOP for Exim.xlsx";
const workbook = XLSX.readFile(filePath);

workbook.SheetNames.forEach((sheetName) => {
  console.log(`\n================ ${sheetName} ================`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  data.slice(0, 15).forEach((row, i) => {
    console.log(`Row ${i + 1}:`, row);
  });
});
