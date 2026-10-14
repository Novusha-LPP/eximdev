const fs = require('fs');
const parser = require('@babel/parser');
const content = fs.readFileSync('C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/VirtualBalanceList.jsx', 'utf8');
try {
  parser.parse(content, { sourceType: 'module', plugins: ['jsx'] });
  console.log('Exim-Export VirtualBalanceList.jsx syntax is 100% valid!');
} catch (e) {
  console.error('Syntax error in Exim-Export VirtualBalanceList:', e.message);
}
