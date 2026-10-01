const fs = require('fs');
const parser = require('@babel/parser');

function optimizeTablePaddings(content) {
  // Add py: 0.5, px: 0.8 to TableCell header styles if not already present
  content = content.replace(
    /sx=\{\{\s*backgroundColor:\s*"#FFFF00",\s*color:\s*"#000",\s*fontWeight:\s*700,\s*fontSize:\s*"11px",\s*whiteSpace:\s*"nowrap",\s*border:\s*"1px solid #dcdcdc"/g,
    'sx={{ backgroundColor: "#FFFF00", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc", py: 0.5, px: 0.8'
  );
  content = content.replace(
    /sx=\{\{\s*backgroundColor:\s*"#A8D5A2",\s*color:\s*"#000",\s*fontWeight:\s*700,\s*fontSize:\s*"11px",\s*whiteSpace:\s*"nowrap",\s*border:\s*"1px solid #dcdcdc"/g,
    'sx={{ backgroundColor: "#A8D5A2", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc", py: 0.5, px: 0.8'
  );

  // Add py: 0.4, px: 0.8 to TableBody TableCell
  content = content.replace(
    /<TableCell sx=\{\{\s*fontSize:\s*"11px",\s*whiteSpace:\s*"nowrap",\s*border:\s*"1px solid #e2e8f0"/g,
    '<TableCell sx={{ fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #e2e8f0", py: 0.4, px: 0.8'
  );
  content = content.replace(
    /<TableCell align="right" sx=\{\{\s*fontSize:\s*"11px",\s*whiteSpace:\s*"nowrap",\s*border:\s*"1px solid #e2e8f0"/g,
    '<TableCell align="right" sx={{ fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #e2e8f0", py: 0.4, px: 0.8'
  );
  return content;
}

// 1. eximdev CashflowTracker
const p1 = 'C:/Users/india/Desktop/projects/eximdev/client/src/components/Import-billing/CashflowTracker.jsx';
let c1 = fs.readFileSync(p1, 'utf8');
c1 = optimizeTablePaddings(c1);
parser.parse(c1, { sourceType: 'module', plugins: ['jsx'] });
fs.writeFileSync(p1, c1, 'utf8');
console.log('Optimized eximdev CashflowTracker table padding!');

// 2. Exim-Export CashflowTracker
const p2 = 'C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/CashflowTracker.jsx';
let c2 = fs.readFileSync(p2, 'utf8');
c2 = optimizeTablePaddings(c2);
parser.parse(c2, { sourceType: 'module', plugins: ['jsx'] });
fs.writeFileSync(p2, c2, 'utf8');
console.log('Optimized Exim-Export CashflowTracker table padding!');

// 3. eximdev VirtualBalanceList
const p3 = 'C:/Users/india/Desktop/projects/eximdev/client/src/components/Import-billing/VirtualBalanceList.js';
let c3 = fs.readFileSync(p3, 'utf8');
c3 = c3.replace(
  '<Box sx={{ p: 2, backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>',
  '<Box sx={{ p: 1, backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>'
);
c3 = c3.replace(
  'spacing={2}\n        sx={{\n          mb: 3,\n          p: 2,',
  'spacing={1}\n        sx={{\n          mb: 1,\n          p: 1,'
);
c3 = c3.replace('maxHeight: 650,', 'maxHeight: "calc(100vh - 230px)",');
parser.parse(c3, { sourceType: 'module', plugins: ['jsx'] });
fs.writeFileSync(p3, c3, 'utf8');
console.log('Optimized eximdev VirtualBalanceList compactness!');

// 4. Exim-Export VirtualBalanceList
const p4 = 'C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/VirtualBalanceList.jsx';
let c4 = fs.readFileSync(p4, 'utf8');
c4 = c4.replace(
  '<Box sx={{ p: 2, backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>',
  '<Box sx={{ p: 1, backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>'
);
c4 = c4.replace(
  'spacing={2}\n        sx={{\n          mb: 3,\n          p: 2,',
  'spacing={1}\n        sx={{\n          mb: 1,\n          p: 1,'
);
c4 = c4.replace('maxHeight: 650,', 'maxHeight: "calc(100vh - 230px)",');
parser.parse(c4, { sourceType: 'module', plugins: ['jsx'] });
fs.writeFileSync(p4, c4, 'utf8');
console.log('Optimized Exim-Export VirtualBalanceList compactness!');
