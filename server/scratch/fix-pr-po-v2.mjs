import fs from 'fs';
import path from 'path';

const rmDir = '/home/aiserver/eximdev/client/src/components/accounts/rmProcurementSop';
const tyreDir = '/home/aiserver/eximdev/client/src/components/accounts/tyreProcurementSop';

// For RM
const rmEditablePr = 'Stage2PurchaseRequest.js';
const rmEditablePo = 'Stage7OrderDispatch.js';

// For Tyre
const tyreEditablePr = 'Stage1PurchaseRequest.js';
const tyreEditablePo = 'Stage2SupplierQuotation.js'; // Based on grep, PO is first seen here

function processFile(filePath, isEditablePr, isEditablePo) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add globalData, onGlobalChange to props
  content = content.replace(/function Stage([a-zA-Z0-9_]+)\(\{\s*data,\s*onChange\s*\}\)/g, 'function Stage$1({ data, onChange, globalData, onGlobalChange })');

  // PR Number replacement
  if (isEditablePr) {
    content = content.replace(
      /value=\{data\.prNumber\s*\|\|\s*""\}\s*onChange=\{\(e\)\s*=>\s*updateField\("prNumber",\s*e\.target\.value\)\}/g,
      `value={globalData?.prNumber || ""}\n            onChange={(e) => onGlobalChange("prNumber", e.target.value)}`
    );
  } else {
    content = content.replace(
      /value=\{data\.prNumber\s*\|\|\s*""\}\s*onChange=\{\(e\)\s*=>\s*updateField\("prNumber",\s*e\.target\.value\)\}/g,
      `value={globalData?.prNumber || ""}\n            onChange={() => {}}\n            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}`
    );
  }

  // PO Number replacement (poNumber, poNumberDate, poOrderReferenceNo)
  const poRegex = /value=\{data\.(poNumber|poNumberDate|poOrderReferenceNo)\s*\|\|\s*""\}\s*onChange=\{\(e\)\s*=>\s*updateField\("(poNumber|poNumberDate|poOrderReferenceNo)",\s*e\.target\.value\)\}/g;
  
  if (isEditablePo) {
    content = content.replace(
      poRegex,
      `value={globalData?.poNumber || ""}\n            onChange={(e) => onGlobalChange("poNumber", e.target.value)}`
    );
  } else {
    content = content.replace(
      poRegex,
      `value={globalData?.poNumber || ""}\n            onChange={() => {}}\n            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}`
    );
  }

  fs.writeFileSync(filePath, content);
}

// Process RM
fs.readdirSync(rmDir).filter(f => f.startsWith('Stage')).forEach(f => {
  processFile(path.join(rmDir, f), f === rmEditablePr, f === rmEditablePo);
});

// Process Tyre
fs.readdirSync(tyreDir).filter(f => f.startsWith('Stage')).forEach(f => {
  processFile(path.join(tyreDir, f), f === tyreEditablePr, f === tyreEditablePo);
});

console.log("Processed all stage files for v2.");
