const fs = require('fs');

console.log('--- EXIMDEV CASHFLOW ROUTES ---');
console.log(fs.readFileSync('C:/Users/india/Desktop/projects/eximdev/server/routes/import-billing/cashflowRoutes.mjs', 'utf8').slice(0, 1500));

console.log('\n--- EXPORT CASHFLOW ROUTES ---');
console.log(fs.readFileSync('C:/Users/india/Desktop/projects/Exim-Export/server/routes/export-dsr/cashflowRoutes.mjs', 'utf8').slice(0, 1500));
