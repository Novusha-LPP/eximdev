const { execFileSync, spawnSync } = require('child_process');
const path = require('path');

const cwd = 'C:\\Users\\india\\Desktop\\Projects\\eximdev';

console.log('🚀 Executing Refactoring Script...\n');
console.log('=' .repeat(80));

try {
  // Use spawnSync to run node directly
  const result = spawnSync('node', ['refactor-inline.mjs'], {
    cwd: cwd,
    stdio: 'inherit', // This will print directly to console
    encoding: 'utf8'
  });

  console.log('=' .repeat(80));

  if (result.error) {
    console.error('\n❌ Error:', result.error.message);
    process.exit(1);
  }

  if (result.status === 0) {
    console.log('\n✅ Refactoring completed successfully!');
  } else {
    console.log(`\n⚠️  Process exited with code: ${result.status}`);
    process.exit(result.status);
  }
} catch (error) {
  console.error('\n❌ Error executing refactor:', error.message);
  process.exit(1);
}
