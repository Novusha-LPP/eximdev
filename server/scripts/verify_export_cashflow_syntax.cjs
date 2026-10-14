const fs = require('fs');
const parser = require('@babel/parser');
const content = fs.readFileSync('C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/CashflowTracker.jsx', 'utf8');
try {
  parser.parse(content, { sourceType: 'module', plugins: ['jsx'] });
  console.log('Exim-Export CashflowTracker.jsx is 100% valid syntax!');
} catch (e) {
  console.error(e.message);
}
