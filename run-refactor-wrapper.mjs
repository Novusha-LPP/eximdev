#!/usr/bin/env node
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  console.log('🚀 Running attendance refactor script...\n');
  const result = execSync('node refactor-attendance.mjs', {
    cwd: __dirname,
    stdio: 'inherit',
    encoding: 'utf8'
  });
  console.log('\n✅ Script completed successfully');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Script failed:', error.message);
  process.exit(1);
}
