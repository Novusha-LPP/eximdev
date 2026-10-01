const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      if (file === 'node_modules' || file === '.git') return;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(searchDir(fullPath, query));
      } else if (file.endsWith('.js') || file.endsWith('.mjs')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.toLowerCase().includes(query.toLowerCase())) {
          results.push(fullPath);
        }
      }
    });
  } catch (e) {
    console.error(e.message);
  }
  return results;
}

console.log('Virtual balance in Exim-Export/server:');
console.log(searchDir('C:/Users/india/Desktop/projects/Exim-Export/server', 'virtual-balance'));
console.log('Cashflow in Exim-Export/server:');
console.log(searchDir('C:/Users/india/Desktop/projects/Exim-Export/server', 'cashflow'));
