const fs = require('fs');
const eximApp = fs.readFileSync('C:/Users/india/Desktop/projects/eximdev/server/app.mjs', 'utf8');
const exportApp = fs.readFileSync('C:/Users/india/Desktop/projects/Exim-Export/server/app.js', 'utf8');

function extractCors(str) {
  const idx = str.indexOf('cors({');
  if (idx !== -1) {
    return str.slice(idx, idx + 500);
  }
  return 'not found';
}

console.log('eximdev cors:\n', extractCors(eximApp));
console.log('\nexport cors:\n', extractCors(exportApp));
