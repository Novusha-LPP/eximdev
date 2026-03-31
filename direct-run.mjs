#!/usr/bin/env node
/**
 * Direct Refactor Executor - Calls the main refactor script
 */

import { execSync } from 'child_process';

try {
  execSync('node refactor-attendance.mjs', {
    stdio: 'inherit',
    cwd: new URL('.', import.meta.url).pathname.slice(0, -1)
  });
} catch (error) {
  console.error('Execution failed:', error.message);
  process.exit(1);
}
