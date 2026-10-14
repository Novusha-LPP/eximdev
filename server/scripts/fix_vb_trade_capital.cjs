const fs = require('fs');

const p1 = 'C:/Users/india/Desktop/projects/eximdev/client/src/components/Import-billing/VirtualBalanceList.js';
let c1 = fs.readFileSync(p1, 'utf8');
c1 = c1.replace('<TableCell sx={s.headerCell}>Trade</TableCell>', '<TableCell sx={s.headerCell}>TRADE</TableCell>');
c1 = c1.replace('"Trade": row.tradeType', '"TRADE": row.tradeType');
fs.writeFileSync(p1, c1, 'utf8');

const p2 = 'C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/VirtualBalanceList.jsx';
let c2 = fs.readFileSync(p2, 'utf8');
c2 = c2.replace('<TableCell sx={s.headerCell}>Trade</TableCell>', '<TableCell sx={s.headerCell}>TRADE</TableCell>');
c2 = c2.replace('"Trade": row.tradeType', '"TRADE": row.tradeType');
fs.writeFileSync(p2, c2, 'utf8');

console.log('Updated Trade to TRADE in both VirtualBalanceList files!');
