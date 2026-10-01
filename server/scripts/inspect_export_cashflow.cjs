const fs = require('fs');
const content = fs.readFileSync('C:/Users/india/Desktop/projects/Exim-Export/server/routes/export-dsr/cashflowRoutes.mjs', 'utf8');
console.log(content.slice(0, 2000));
