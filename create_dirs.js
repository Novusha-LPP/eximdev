const fs = require('fs');
const path = require('path');

const dirs = [
  'C:\\Users\\india\\Desktop\\Projects\\eximdev\\server\\model\\attendance',
  'C:\\Users\\india\\Desktop\\Projects\\eximdev\\server\\controllers\\attendance',
  'C:\\Users\\india\\Desktop\\Projects\\eximdev\\server\\services\\attendance'
];

console.log('Creating directories...\n');

dirs.forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('✓ Created: ' + dir);
    } else {
      console.log('✓ Already exists: ' + dir);
    }
  } catch (err) {
    console.log('✗ Error creating ' + dir + ': ' + err.message);
  }
});

console.log('\n\nVerifying directories...\n');

// Verify model
console.log('=== Contents of server/model ===');
fs.readdirSync('C:\\Users\\india\\Desktop\\Projects\\eximdev\\server\\model').forEach(file => {
  const stat = fs.statSync(path.join('C:\\Users\\india\\Desktop\\Projects\\eximdev\\server\\model', file));
  console.log((stat.isDirectory() ? '[DIR] ' : '      ') + file);
});

// Verify controllers
console.log('\n=== Contents of server/controllers ===');
fs.readdirSync('C:\\Users\\india\\Desktop\\Projects\\eximdev\\server\\controllers').forEach(file => {
  const stat = fs.statSync(path.join('C:\\Users\\india\\Desktop\\Projects\\eximdev\\server\\controllers', file));
  console.log((stat.isDirectory() ? '[DIR] ' : '      ') + file);
});

// Verify services
console.log('\n=== Contents of server/services ===');
fs.readdirSync('C:\\Users\\india\\Desktop\\Projects\\eximdev\\server\\services').forEach(file => {
  const stat = fs.statSync(path.join('C:\\Users\\india\\Desktop\\Projects\\eximdev\\server\\services', file));
  console.log((stat.isDirectory() ? '[DIR] ' : '      ') + file);
});
