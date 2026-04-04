#!/usr/bin/env node
import { execSync, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logFile = path.join(__dirname, 'refactor-output.log');

// Redirect stdout to capture it
const originalLog = console.log;
const originalError = console.error;
let logBuffer = '';

function captureLog(...args) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  logBuffer += message + '\n';
  originalLog(...args);
}

function captureError(...args) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  logBuffer += message + '\n';
  originalError(...args);
}

console.log = captureLog;
console.error = captureError;

try {
  // Run the refactor script
  const result = spawnSync('node', ['refactor-attendance.mjs'], {
    cwd: __dirname,
    encoding: 'utf8',
    stdio: 'pipe'
  });

  if (result.stdout) {
    captureLog(result.stdout);
  }
  
  if (result.stderr) {
    captureError(result.stderr);
  }

  // Write to file
  fs.writeFileSync(logFile, logBuffer, 'utf8');
  
  if (result.status === 0) {
    originalLog('\n✅ Refactoring completed successfully!');
    originalLog(`Output saved to: ${logFile}`);
    process.exit(0);
  } else {
    originalError(`\n❌ Script exited with code: ${result.status}`);
    originalError(`Output saved to: ${logFile}`);
    process.exit(1);
  }
} catch (error) {
  captureError('Error:', error.message);
  fs.writeFileSync(logFile, logBuffer, 'utf8');
  originalError('\n❌ Error during execution');
  originalError(`Output saved to: ${logFile}`);
  process.exit(1);
}
