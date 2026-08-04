import XLSX from 'xlsx';

try {
    const workbook = XLSX.readFile("C:\\Users\\NCP-1\\Downloads\\5s Audit check sheet (HR).xlsx");
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    console.log("=== Dumping all non-empty cells ===");
    
    // Sort keys alphabetically/numerically by cell reference
    const keys = Object.keys(sheet).filter(k => !k.startsWith('!')).sort((a, b) => {
        const colA = a.replace(/[0-9]/g, '');
        const colB = b.replace(/[0-9]/g, '');
        const rowA = parseInt(a.replace(/[^0-9]/g, ''), 10);
        const rowB = parseInt(b.replace(/[^0-9]/g, ''), 10);
        if (rowA !== rowB) return rowA - rowB;
        return colA.localeCompare(colB);
    });
    
    keys.forEach(key => {
        const cell = sheet[key];
        if (cell.v !== undefined) {
            console.log(`${key}: val=${cell.v}${cell.f ? `, formula=${cell.f}` : ""}`);
        }
    });
} catch (error) {
    console.error("Error reading excel file:", error);
}
