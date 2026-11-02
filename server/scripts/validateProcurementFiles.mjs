import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToCheck = [
  "client/src/components/accounts/tyreProcurementSop/companyProfiles.js",
  "client/src/components/accounts/tyreProcurementSop/Stage1PurchaseRequest.js",
  "client/src/components/accounts/tyreProcurementSop/Stage2SupplierQuotation.js",
  "client/src/components/accounts/tyreProcurementSop/PoLandscapePdfGenerator.js",
  "client/src/components/accounts/tyreProcurementSop/TyreProcurementList.js",
  "client/src/components/accounts/tyreProcurementSop/ProcurementPulseModal.js",
  "client/src/components/accounts/tyreProcurementSop/ProcurementExcelReportModal.js",
  "client/src/components/accounts/tyreProcurementSop/CompanyDirectoryModal.js",
];

let allOk = true;
for (const rel of filesToCheck) {
  const full = path.resolve(__dirname, "../../", rel);
  if (!fs.existsSync(full)) {
    console.error("Missing file:", rel);
    allOk = false;
  } else {
    const text = fs.readFileSync(full, "utf8");
    // Simple bracket & brace balanced check
    const stack = [];
    let line = 1;
    let col = 0;
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let inLineComment = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      col++;
      if (ch === '\n') {
        line++;
        col = 0;
        inLineComment = false;
      }
      if (inLineComment) continue;
      if (inComment) {
        if (ch === '*' && text[i+1] === '/') {
          inComment = false;
          i++;
        }
        continue;
      }
      if (!inString && ch === '/' && text[i+1] === '/') {
        inLineComment = true;
        i++;
        continue;
      }
      if (!inString && ch === '/' && text[i+1] === '*') {
        inComment = true;
        i++;
        continue;
      }
      if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
        inString = true;
        stringChar = ch;
        continue;
      }
      if (inString && ch === stringChar && text[i-1] !== '\\\\') {
        inString = false;
        continue;
      }
      if (inString) continue;

      if (ch === '{' || ch === '(' || ch === '[') {
        stack.push({ ch, line, col });
      } else if (ch === '}' || ch === ')' || ch === ']') {
        if (stack.length === 0) {
          console.error(`Unmatched closing ${ch} at ${rel}:${line}:${col}`);
          allOk = false;
          break;
        }
        const top = stack.pop();
        if ((ch === '}' && top.ch !== '{') || (ch === ')' && top.ch !== '(') || (ch === ']' && top.ch !== '[')) {
          console.error(`Mismatched ${top.ch} and ${ch} at ${rel}:${line}:${col}`);
          allOk = false;
          break;
        }
      }
    }
    if (stack.length > 0) {
      console.error(`Unclosed ${stack[stack.length - 1].ch} opened at line ${stack[stack.length - 1].line} in ${rel}`);
      allOk = false;
    } else {
      console.log(`OK: ${rel}`);
    }
  }
}

if (allOk) {
  console.log("All procurement frontend files passed balance & existence check!");
}
