#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(__dirname, 'server');

// Define paths
const paths = {
  oldModels: path.join(serverDir, 'routes', 'attendance', 'models'),
  oldControllers: path.join(serverDir, 'routes', 'attendance', 'controllers'),
  oldServices: path.join(serverDir, 'routes', 'attendance', 'services'),
  newModels: path.join(serverDir, 'model', 'attendance'),
  newControllers: path.join(serverDir, 'controllers', 'attendance'),
  newServices: path.join(serverDir, 'services', 'attendance'),
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ Created directory: ${dir}`);
  }
}

function copyFile(src, dest) {
  fs.copyFileSync(src, dest);
  console.log(`✓ Copied: ${path.relative(__dirname, src)} → ${path.relative(__dirname, dest)}`);
}

function copyDir(src, dest) {
  ensureDir(dest);
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  });
}

function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`✓ Removed directory: ${dir}`);
  }
}

console.log('🚀 Starting Attendance Module Refactoring...\n');

// Step 1: Create new directories
console.log('📁 Step 1: Creating new directories...');
ensureDir(paths.newModels);
ensureDir(paths.newControllers);
ensureDir(paths.newServices);
console.log();

// Step 2: Copy files to new locations
console.log('📋 Step 2: Copying files...');
console.log('\n  Models:');
copyDir(paths.oldModels, paths.newModels);
console.log('\n  Controllers:');
copyDir(paths.oldControllers, paths.newControllers);
console.log('\n  Services:');
copyDir(paths.oldServices, paths.newServices);
console.log();

// Step 3: Update imports in route files
console.log('🔄 Step 3: Updating imports in route files...');
const routeFiles = [
  path.join(serverDir, 'routes', 'attendance', 'attendanceRoutes.mjs'),
  path.join(serverDir, 'routes', 'attendance', 'leaveRoutes.mjs'),
  path.join(serverDir, 'routes', 'attendance', 'hodRoutes.mjs'),
  path.join(serverDir, 'routes', 'attendance', 'masterRoutes.mjs'),
];

routeFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Update controller imports
    content = content.replace(
      /require\(['"]\.\/controllers\/([^'"]+)['"]\)/g,
      "require('../../../controllers/attendance/$1')"
    );

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✓ Updated: ${path.relative(serverDir, file)}`);
    }
  }
});
console.log();

// Step 4: Update imports in controllers for models and User
console.log('🔧 Step 4: Updating imports in controllers...');
const controllerFiles = [
  path.join(paths.newControllers, 'attendance.controller.js'),
  path.join(paths.newControllers, 'leave.controller.js'),
  path.join(paths.newControllers, 'master.controller.js'),
  path.join(paths.newControllers, 'HOD.controller.js'),
];

controllerFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Fix User model import
    content = content.replace(
      /require\(['"]\.\.\/models\/User['"\)]/g,
      "require('../../model/userModel.mjs')"
    );

    // Update attendance model imports
    content = content.replace(
      /require\(['"]\.\.\/models\/([^'"]+)['"\)]/g,
      "require('../../model/attendance/$1')"
    );

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✓ Updated: ${path.relative(serverDir, file)}`);
    }
  }
});
console.log();

// Step 5: Update imports in services
console.log('🔧 Step 5: Updating imports in services...');
const serviceFiles = fs.readdirSync(paths.newServices)
  .filter(f => f.endsWith('.js'))
  .map(f => path.join(paths.newServices, f));

serviceFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Fix User model import
  content = content.replace(
    /require\(['"]\.\.\/models\/User['"\)]/g,
    "require('../../model/userModel.mjs')"
  );

  // Update attendance model imports (relative path fix)
  content = content.replace(
    /require\(['"]\.\.\/models\/([^'"]+)['"\)]/g,
    "require('../../model/attendance/$1')"
  );

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✓ Updated: ${path.relative(serverDir, file)}`);
  }
});
console.log();

// Step 6: Remove old directories
console.log('🗑️  Step 6: Removing old nested structure...');
removeDir(paths.oldModels);
removeDir(paths.oldControllers);
removeDir(paths.oldServices);
console.log();

console.log('✅ Refactoring complete!');
console.log('\nNew structure:');
console.log('  server/model/attendance/ - All attendance models');
console.log('  server/controllers/attendance/ - All attendance controllers');
console.log('  server/services/attendance/ - All attendance services');
console.log('  server/routes/attendance/ - Route files only');
