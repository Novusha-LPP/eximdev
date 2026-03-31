#!/usr/bin/env node
/**
 * Inline Refactoring Executor
 * Directly runs the refactoring logic with full output capture
 */

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

let outputLog = '';

function log(...args) {
  const message = args.join(' ');
  outputLog += message + '\n';
  console.log(...args);
}

function logSeparator(char = '=', length = 80) {
  const sep = char.repeat(length);
  outputLog += sep + '\n';
  console.log(sep);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`✓ Created directory: ${dir}`);
  }
}

function copyFile(src, dest) {
  fs.copyFileSync(src, dest);
  log(`✓ Copied: ${path.relative(__dirname, src)} → ${path.relative(__dirname, dest)}`);
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
    log(`✓ Removed directory: ${dir}`);
  }
}

function updateFileImports(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  replacements.forEach(({ old, new: newPath }) => {
    const regex = new RegExp(
      `require\\(['"](${old.replace(/\\/g, '\\\\').replace(/\./g, '\\.')})['"\\)]|import\\s+.*from\\s+['"](${old.replace(/\\/g, '\\\\').replace(/\./g, '\\.')})['"\\)]`,
      'g'
    );
    
    if (regex.test(content)) {
      content = content.replace(
        /require\(['"]([^'"]*)\1['"\)]/g,
        (match) => match.replace(old, newPath)
      );
      content = content.replace(
        /from\s+['"]([^'"]*)\1['"]/g,
        (match) => match.replace(old, newPath)
      );
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

// Main execution
try {
  logSeparator('=', 80);
  log('🚀 Starting Attendance Module Refactoring...\n');
  logSeparator('=', 80);

  // Step 1: Create new directories
  log('\n📁 Step 1: Creating new directories...');
  log('');
  ensureDir(paths.newModels);
  ensureDir(paths.newControllers);
  ensureDir(paths.newServices);
  log('');

  // Step 2: Copy files to new locations
  log('📋 Step 2: Copying files...');
  log('\n  Models:');
  if (fs.existsSync(paths.oldModels)) {
    copyDir(paths.oldModels, paths.newModels);
  } else {
    log(`  ⚠️  Old models directory not found: ${paths.oldModels}`);
  }
  
  log('\n  Controllers:');
  if (fs.existsSync(paths.oldControllers)) {
    copyDir(paths.oldControllers, paths.newControllers);
  } else {
    log(`  ⚠️  Old controllers directory not found: ${paths.oldControllers}`);
  }
  
  log('\n  Services:');
  if (fs.existsSync(paths.oldServices)) {
    copyDir(paths.oldServices, paths.newServices);
  } else {
    log(`  ⚠️  Old services directory not found: ${paths.oldServices}`);
  }
  log('');

  // Step 3: Update imports in route files
  log('🔄 Step 3: Updating imports in route files...');
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
        log(`✓ Updated: ${path.relative(serverDir, file)}`);
      }
    }
  });
  log('');

  // Step 4: Update imports in controllers for models and User
  log('🔧 Step 4: Updating imports in controllers...');
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
        log(`✓ Updated: ${path.relative(serverDir, file)}`);
      }
    }
  });
  log('');

  // Step 5: Update imports in services
  log('🔧 Step 5: Updating imports in services...');
  if (fs.existsSync(paths.newServices)) {
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
        log(`✓ Updated: ${path.relative(serverDir, file)}`);
      }
    });
  }
  log('');

  // Step 6: Remove old directories
  log('🗑️  Step 6: Removing old nested structure...');
  removeDir(paths.oldModels);
  removeDir(paths.oldControllers);
  removeDir(paths.oldServices);
  log('');

  logSeparator('=', 80);
  log('\n✅ Refactoring complete!\n');
  log('New structure:');
  log('  server/model/attendance/ - All attendance models');
  log('  server/controllers/attendance/ - All attendance controllers');
  log('  server/services/attendance/ - All attendance services');
  log('  server/routes/attendance/ - Route files only');
  logSeparator('=', 80);

  // Save log to file
  const logFilePath = path.join(__dirname, 'refactor-output.txt');
  fs.writeFileSync(logFilePath, outputLog, 'utf8');
  log(`\n📝 Full output saved to: ${logFilePath}`);

  process.exit(0);
} catch (error) {
  log(`\n❌ Error during refactoring: ${error.message}`);
  log(error.stack);
  
  // Save error log
  const logFilePath = path.join(__dirname, 'refactor-output.txt');
  fs.writeFileSync(logFilePath, outputLog, 'utf8');
  log(`\n📝 Error log saved to: ${logFilePath}`);
  
  process.exit(1);
}
