#!/usr/bin/env node
/**
 * Direct refactoring execution wrapper
 * This runs refactor-attendance.mjs directly and captures all output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = __dirname;
const outputFile = path.join(projectDir, 'refactor-output.txt');

console.log('🚀 Starting Attendance Module Refactoring Script Execution...\n');
console.log(`Working directory: ${projectDir}\n`);
console.log('=' .repeat(80));
console.log('');

let allOutput = '';

// Spawn the node process for refactor-attendance.mjs
const child = spawn('node', ['refactor-attendance.mjs'], {
  cwd: projectDir,
  stdio: 'pipe',
  shell: true
});

// Capture all output
child.stdout.on('data', (data) => {
  const str = data.toString('utf8');
  process.stdout.write(str);
  allOutput += str;
});

child.stderr.on('data', (data) => {
  const str = data.toString('utf8');
  process.stderr.write(str);
  allOutput += str;
});

// Handle completion
child.on('close', (code) => {
  console.log('');
  console.log('=' .repeat(80));
  
  // Save output to file
  fs.writeFileSync(outputFile, allOutput, 'utf8');
  
  if (code === 0) {
    console.log('\n✅ Refactoring Script Completed Successfully!');
    console.log(`Output also saved to: ${outputFile}`);
    process.exit(0);
  } else {
    console.log(`\n❌ Script exited with code: ${code}`);
    console.log(`Output also saved to: ${outputFile}`);
    process.exit(code);
  }
});

// Handle errors
child.on('error', (error) => {
  console.error('\n❌ Failed to execute refactor script:');
  console.error(error.message);
  allOutput += `\nError: ${error.message}`;
  fs.writeFileSync(outputFile, allOutput, 'utf8');
  process.exit(1);
});
