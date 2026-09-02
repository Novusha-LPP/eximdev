import XLSX from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.resolve(__dirname, "../..");

// ── Read all three Excel files ──
const files = [
  { name: "Fleet Insurance", file: "Fleet Insurance Proposal List_Policy Portal (2).xlsx" },
  { name: "RM Procurement SOP", file: "RM_Procurement_SOP for Exim.xlsx" },
  { name: "Tyre SOP", file: "Tyre_SOP_Complete for Exim.xlsx" },
];

for (const { name, file } of files) {
  const filePath = path.join(baseDir, file);
  console.log(`\n${"=".repeat(80)}`);
  console.log(`FILE: ${name}`);
  console.log(`PATH: ${filePath}`);
  console.log(`${"=".repeat(80)}`);

  try {
    const wb = XLSX.readFile(filePath);
    console.log(`Sheet Names: ${JSON.stringify(wb.SheetNames)}`);

    for (const sheetName of wb.SheetNames) {
      console.log(`\n--- Sheet: "${sheetName}" ---`);
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      
      // Print all rows (up to 80 rows per sheet to keep output manageable)
      const maxRows = Math.min(data.length, 80);
      for (let r = 0; r < maxRows; r++) {
        const row = data[r];
        // Filter out completely empty rows
        if (row.every(cell => cell === "" || cell === null || cell === undefined)) continue;
        // Truncate very long cell values
        const truncatedRow = row.map(cell => {
          const s = String(cell);
          return s.length > 60 ? s.substring(0, 57) + "..." : s;
        });
        console.log(`  Row ${r + 1}: ${JSON.stringify(truncatedRow)}`);
      }
      if (data.length > maxRows) {
        console.log(`  ... (${data.length - maxRows} more rows)`);
      }
      console.log(`  Total rows: ${data.length}`);
    }
  } catch (err) {
    console.error(`  ERROR reading file: ${err.message}`);
  }
}
