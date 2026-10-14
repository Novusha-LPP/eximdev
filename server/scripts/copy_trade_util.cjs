const fs = require('fs');
const path = require('path');

const src = 'C:/Users/india/Desktop/projects/eximdev/client/src/utils/tradeScopeUtil.js';
const destDir = 'C:/Users/india/Desktop/projects/Exim-Export/client/src/utils';
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}
const dest = path.join(destDir, 'tradeScopeUtil.js');
fs.copyFileSync(src, dest);
console.log('Copied tradeScopeUtil.js to Exim-Export successfully!');
