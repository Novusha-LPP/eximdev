const fs = require('fs');
const parser = require('@babel/parser');

function polishVB(filePath) {
  let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  content = content.replace(
    '<Box sx={{ p: 1, backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>',
    '<Box sx={{ p: 2, backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>'
  );
  content = content.replace(
    'spacing={1}\n        sx={{\n          mb: 1,\n          p: 1,',
    'spacing={1.5}\n        sx={{\n          mb: 1.5,\n          p: 1.5,'
  );
  parser.parse(content, { sourceType: 'module', plugins: ['jsx'] });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Polished ${filePath}`);
}

polishVB('C:/Users/india/Desktop/projects/eximdev/client/src/components/Import-billing/VirtualBalanceList.js');
polishVB('C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/VirtualBalanceList.jsx');
