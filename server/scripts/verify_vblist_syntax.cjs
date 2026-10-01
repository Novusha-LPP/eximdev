const fs = require('fs');
const parser = require('@babel/parser');

const content = fs.readFileSync('C:/Users/india/Desktop/projects/eximdev/client/src/components/Import-billing/VirtualBalanceList.js', 'utf8');
try {
  parser.parse(content, {
    sourceType: 'module',
    plugins: ['jsx'],
  });
  console.log('VirtualBalanceList.js parsed successfully with zero syntax errors!');
} catch (e) {
  console.error('Syntax error:', e.message);
}
