const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectDir = 'C:\\Users\\india\\Desktop\\Projects\\eximdev';
const outputFile = path.join(projectDir, 'refactor-output.txt');

console.log('🚀 Starting Attendance Module Refactoring...\n');

// Execute the refactor script and capture output
exec('cd /d ' + projectDir + ' && node refactor-attendance.mjs', (error, stdout, stderr) => {
  let fullOutput = '';
  
  if (stdout) {
    fullOutput += stdout;
    console.log(stdout);
  }
  
  if (stderr) {
    fullOutput += '\nSTDERR:\n' + stderr;
    console.error(stderr);
  }
  
  // Save to file
  fs.writeFileSync(outputFile, fullOutput, 'utf8');
  
  if (error) {
    console.error('\n❌ Error:', error.message);
    console.log(`\nOutput saved to: ${outputFile}`);
    process.exit(1);
  } else {
    console.log('\n✅ Refactoring completed successfully!');
    console.log(`Output saved to: ${outputFile}`);
    process.exit(0);
  }
});
