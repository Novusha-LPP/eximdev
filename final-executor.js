#!/usr/bin/env node
/**
 * Final Refactoring Executor
 * This script executes the refactor-attendance.mjs using Node's module system
 */

const path = require('path');
const fs = require('fs');
const { fileURLToPath } = require('url');

// Change to project directory first
const projectDir = 'C:\\Users\\india\\Desktop\\Projects\\eximdev';
process.chdir(projectDir);

console.log('\n' + '='.repeat(80));
console.log('🚀 ATTENDANCE MODULE REFACTORING EXECUTOR');
console.log('='.repeat(80));
console.log(`\nWorking Directory: ${process.cwd()}`);
console.log(`Node Version: ${process.version}`);
console.log('');

// Import and run the refactor script
(async () => {
  try {
    // Dynamic import of the ESM module
    const refactor = await import('./refactor-attendance.mjs');
    console.log('✅ Refactoring script executed successfully!');
    console.log('\n' + '='.repeat(80));
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during refactoring:');
    console.error(error.message);
    console.error(error.stack);
    console.log('\n' + '='.repeat(80));
    process.exit(1);
  }
})();
