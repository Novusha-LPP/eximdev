#!/usr/bin/env node
console.log('Starting refactor...');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = __dirname;
const serverDir = path.join(projectRoot, 'server');

// Test if we can access the directories
const testPath = path.join(serverDir, 'routes', 'attendance', 'models');
console.log('Checking path:', testPath);
console.log('Path exists:', fs.existsSync(testPath));

if (fs.existsSync(testPath)) {
  console.log('Files in models:', fs.readdirSync(testPath).length);
}
