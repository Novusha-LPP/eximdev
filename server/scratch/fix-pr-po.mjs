import fs from 'fs';
import path from 'path';

const rmDir = '/home/aiserver/eximdev/client/src/components/accounts/rmProcurementSop';
const tyreDir = '/home/aiserver/eximdev/client/src/components/accounts/tyreProcurementSop';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add globalData to props
  content = content.replace(/function Stage([a-zA-Z0-9_]+)\(\{\s*data,\s*onChange\s*\}\)/g, 'function Stage$1({ data, onChange, globalData })');

  // Fix PR Number
  content = content.replace(
    /value=\{data\.prNumber\s*\|\|\s*""\}\s*onChange=\{\(e\)\s*=>\s*updateField\("prNumber",\s*e\.target\.value\)\}/g,
    `value={globalData?.prNumber || ""}\n            onChange={() => {}}\n            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}`
  );

  // Fix PO Number
  content = content.replace(
    /value=\{data\.poNumber\s*\|\|\s*""\}\s*onChange=\{\(e\)\s*=>\s*updateField\("poNumber",\s*e\.target\.value\)\}/g,
    `value={globalData?.poNumber || ""}\n            onChange={() => {}}\n            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}`
  );
  
  content = content.replace(
    /value=\{data\.poNumberDate\s*\|\|\s*""\}\s*onChange=\{\(e\)\s*=>\s*updateField\("poNumberDate",\s*e\.target\.value\)\}/g,
    `value={globalData?.poNumber || ""}\n            onChange={() => {}}\n            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}`
  );
  
  content = content.replace(
    /value=\{data\.poOrderReferenceNo\s*\|\|\s*""\}\s*onChange=\{\(e\)\s*=>\s*updateField\("poOrderReferenceNo",\s*e\.target\.value\)\}/g,
    `value={globalData?.poNumber || ""}\n            onChange={() => {}}\n            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}`
  );

  fs.writeFileSync(filePath, content);
}

[...fs.readdirSync(rmDir).filter(f => f.startsWith('Stage')), 
 ...fs.readdirSync(tyreDir).filter(f => f.startsWith('Stage'))].forEach(f => {
  const dir = fs.existsSync(path.join(rmDir, f)) ? rmDir : tyreDir;
  processFile(path.join(dir, f));
});

console.log("Processed all stage files.");
