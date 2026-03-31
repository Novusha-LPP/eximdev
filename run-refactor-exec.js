const { execSync } = require('child_process');
const path = require('path');

const cwd = __dirname;
console.log(`Running from: ${cwd}\n`);

try {
  const output = execSync('node refactor-attendance.mjs', {
    cwd: cwd,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log(output);
  console.log('\n✅ Refactoring completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Error during refactoring:');
  console.error(error.stdout);
  console.error(error.stderr);
  console.error(error.message);
  process.exit(1);
}
