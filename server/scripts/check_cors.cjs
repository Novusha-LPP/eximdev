const fs = require('fs');
const eximApp = fs.readFileSync('C:/Users/india/Desktop/projects/eximdev/server/app.mjs', 'utf8');
const exportApp = fs.readFileSync('C:/Users/india/Desktop/projects/Exim-Export/server/app.js', 'utf8');

const getCors = (content) => content.split('\n').filter(l => l.toLowerCase().includes('cors')).slice(0, 15).join('\n');
console.log('eximdev cors:');
console.log(getCors(eximApp));
console.log('\nexport cors:');
console.log(getCors(exportApp));
