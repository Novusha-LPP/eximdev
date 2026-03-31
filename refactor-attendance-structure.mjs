import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = path.join(__dirname, 'server');
const ATTENDANCE_ROUTES = path.join(BASE_DIR, 'routes', 'attendance');

// Source directories
const SRC_MODELS = path.join(ATTENDANCE_ROUTES, 'models');
const SRC_CONTROLLERS = path.join(ATTENDANCE_ROUTES, 'controllers');
const SRC_SERVICES = path.join(ATTENDANCE_ROUTES, 'services');

// Destination directories
const DEST_MODELS = path.join(BASE_DIR, 'model', 'attendance');
const DEST_CONTROLLERS = path.join(BASE_DIR, 'controllers', 'attendance');
const DEST_SERVICES = path.join(BASE_DIR, 'services', 'attendance');

console.log('🔍 LISTING SOURCE FILES\n');
console.log('Models in', SRC_MODELS);
const models = fs.readdirSync(SRC_MODELS);
console.log('  ', models.join(', '));

console.log('\nControllers in', SRC_CONTROLLERS);
const controllers = fs.readdirSync(SRC_CONTROLLERS);
console.log('  ', controllers.join(', '));

console.log('\nServices in', SRC_SERVICES);
const services = fs.readdirSync(SRC_SERVICES);
console.log('  ', services.join(', '));

console.log('\n📁 CREATING DESTINATION DIRECTORIES\n');

// Create destination directories
[DEST_MODELS, DEST_CONTROLLERS, DEST_SERVICES].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('✓ Created:', dir);
  } else {
    console.log('✓ Already exists:', dir);
  }
});

console.log('\n📋 COPYING FILES\n');

// Function to copy file
function copyFile(src, dest, type) {
  const content = fs.readFileSync(src, 'utf8');
  fs.writeFileSync(dest, content);
  console.log(`✓ Copied ${type}: ${path.basename(src)}`);
  return dest;
}

// Copy models
const copiedModels = models.map(file => 
  copyFile(path.join(SRC_MODELS, file), path.join(DEST_MODELS, file), 'model')
);

// Copy controllers
const copiedControllers = controllers.map(file =>
  copyFile(path.join(SRC_CONTROLLERS, file), path.join(DEST_CONTROLLERS, file), 'controller')
);

// Copy services
const copiedServices = services.map(file =>
  copyFile(path.join(SRC_SERVICES, file), path.join(DEST_SERVICES, file), 'service')
);

console.log('\n🔧 UPDATING IMPORT PATHS\n');

// Function to update imports in a file
function updateImports(filePath, type) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Replace relative model imports
  if (type === 'model' || type === 'controller' || type === 'service') {
    // Match patterns like require('../models/X') or require('./models/X')
    const modelImportRegex = /require\(['"`]\.\.\/models\/([^'"`]+)['"`]\)/g;
    if (modelImportRegex.test(content)) {
      content = content.replace(modelImportRegex, "require('../../model/attendance/$1')");
      updated = true;
    }

    // Special case for User model
    const userImportRegex = /require\(['"`]\.\.\/models\/User['"`]\)/g;
    if (userImportRegex.test(content)) {
      content = content.replace(userImportRegex, "require('../../model/userModel.mjs')");
      updated = true;
    }
  }

  if (updated) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ Updated imports in: ${path.basename(filePath)}`);
  }
}

// Update imports in copied files
copiedModels.forEach(file => updateImports(file, 'model'));
copiedControllers.forEach(file => updateImports(file, 'controller'));
copiedServices.forEach(file => updateImports(file, 'service'));

console.log('\n🔄 UPDATING ROUTE FILES\n');

// Update route files to import controllers from new location
const routeFiles = [
  path.join(ATTENDANCE_ROUTES, 'attendanceRoutes.mjs'),
  path.join(ATTENDANCE_ROUTES, 'hodRoutes.mjs'),
  path.join(ATTENDANCE_ROUTES, 'leaveRoutes.mjs'),
  path.join(ATTENDANCE_ROUTES, 'masterRoutes.mjs')
];

routeFiles.forEach(routeFile => {
  if (fs.existsSync(routeFile)) {
    let content = fs.readFileSync(routeFile, 'utf8');
    let updated = false;

    // Update controller imports: change ./controllers/X to ../../../controllers/attendance/X
    const controllerRegex = /require\(['"`]\.\/controllers\/([^'"`]+)['"`]\)/g;
    if (controllerRegex.test(content)) {
      content = content.replace(controllerRegex, "require('../../../controllers/attendance/$1')");
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(routeFile, content);
      console.log(`✓ Updated: ${path.basename(routeFile)}`);
    } else {
      console.log('○ No changes needed in: ' + path.basename(routeFile));
    }
  } else {
    console.log('⚠ File not found:', routeFile);
  }
});

console.log('\n🗑️  CLEANING UP OLD DIRECTORIES\n');

// Remove old directories
[SRC_MODELS, SRC_CONTROLLERS, SRC_SERVICES].forEach(dir => {
  try {
    // Remove files first
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        fs.unlinkSync(path.join(dir, file));
      });
      fs.rmdirSync(dir);
      console.log('✓ Deleted:', dir);
    }
  } catch (err) {
    console.log('⚠ Error deleting', dir, ':', err.message);
  }
});

console.log('\n✅ REFACTORING COMPLETE!\n');
console.log('Summary:');
console.log(`  - Copied ${models.length} model files`);
console.log(`  - Copied ${controllers.length} controller files`);
console.log(`  - Copied ${services.length} service files`);
console.log(`  - Updated imports in all copied files`);
console.log(`  - Updated ${routeFiles.filter(f => fs.existsSync(f)).length} route files`);
console.log(`  - Deleted old attendance subdirectories`);
