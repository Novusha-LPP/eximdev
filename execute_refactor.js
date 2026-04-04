const { execSync } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'refactor_attendance.py');

try {
    const output = execSync(`python "${scriptPath}"`, {
        cwd: __dirname,
        encoding: 'utf-8',
        stdio: 'pipe'
    });
    console.log(output);
} catch (error) {
    console.error('STDOUT:', error.stdout);
    console.error('STDERR:', error.stderr);
    console.error('Error:', error.message);
    process.exit(error.status || 1);
}
