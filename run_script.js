const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('🚀 Running refactor-attendance.mjs...\n');
  
  const result = execSync('node refactor-attendance.mjs', {
    cwd: __dirname,
    stdio: 'inherit',
    encoding: 'utf8'
  });
  
  console.log('\n✅ Refactor script completed successfully');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Error during execution:', error.message);
  process.exit(1);
}
