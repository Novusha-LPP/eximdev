#!/usr/bin/env python3
"""
Attendance Module Refactoring Script
=====================================
This script moves attendance module files from nested structure to centralized locations:
- server/routes/attendance/models/ -> server/model/attendance/
- server/routes/attendance/controllers/ -> server/controllers/attendance/
- server/routes/attendance/services/ -> server/services/attendance/

It also updates all import paths in the moved files and route files.
"""

import os
import sys
import shutil
import re
from pathlib import Path

# Define base paths
base_dir = Path(r"C:\Users\india\Desktop\Projects\eximdev")
server_dir = base_dir / "server"

old_models = server_dir / "routes" / "attendance" / "models"
old_controllers = server_dir / "routes" / "attendance" / "controllers"
old_services = server_dir / "routes" / "attendance" / "services"

new_models = server_dir / "model" / "attendance"
new_controllers = server_dir / "controllers" / "attendance"
new_services = server_dir / "services" / "attendance"

def ensure_dir(path):
    """Create directory if it doesn't exist."""
    path.mkdir(parents=True, exist_ok=True)
    print(f"✓ Created directory: {path.relative_to(base_dir)}")

def copy_file(src, dest):
    """Copy file and print status."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    print(f"✓ Copied: {src.relative_to(base_dir)} → {dest.relative_to(base_dir)}")

def copy_tree(src, dest):
    """Copy entire directory tree."""
    ensure_dir(dest)
    for src_file in src.rglob("*"):
        if src_file.is_file():
            rel_path = src_file.relative_to(src)
            dest_file = dest / rel_path
            dest_file.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_file, dest_file)
            print(f"✓ Copied: {src_file.relative_to(base_dir)} → {dest_file.relative_to(base_dir)}")

def update_imports_in_file(filepath):
    """Update import paths in a file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Fix User model import in controllers and services
        content = content.replace(
            "require('../models/User')",
            "require('../../model/userModel.mjs')"
        )
        content = content.replace(
            "require('../models/User.js')",
            "require('../../model/userModel.mjs')"
        )
        
        # Update attendance model imports from ../models/ to ../../model/attendance/
        # This regex handles: require('../models/ModelName') -> require('../../model/attendance/ModelName')
        import re
        content = re.sub(
            r"require\(['\"]\.\./models/([^'\"]+)['\"]\)",
            r"require('../../model/attendance/\1')",
            content
        )
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Updated imports: {filepath.relative_to(base_dir)}")
            return True
        return False
    except Exception as e:
        print(f"⚠ Error updating {filepath}: {e}")
        return False

def remove_tree(path):
    """Remove directory tree."""
    if path.exists():
        shutil.rmtree(path)
        print(f"✓ Removed directory: {path.relative_to(base_dir)}")

print("🚀 Starting Attendance Module Refactoring...\n")

# Step 1: Create new directories
print("📁 Step 1: Creating new directories...")
ensure_dir(new_models)
ensure_dir(new_controllers)
ensure_dir(new_services)
print()

# Step 2: Copy files
print("📋 Step 2: Copying files...")
print("\n  Models:")
copy_tree(old_models, new_models)
print("\n  Controllers:")
copy_tree(old_controllers, new_controllers)
print("\n  Services:")
copy_tree(old_services, new_services)
print()

# Step 3: Update route file imports
print("🔄 Step 3: Updating imports in route files...")
route_files = [
    server_dir / "routes" / "attendance" / "attendanceRoutes.mjs",
    server_dir / "routes" / "attendance" / "leaveRoutes.mjs",
    server_dir / "routes" / "attendance" / "hodRoutes.mjs",
    server_dir / "routes" / "attendance" / "masterRoutes.mjs",
]

for route_file in route_files:
    if route_file.exists():
        with open(route_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Update controller imports from './controllers/...' to '../../../controllers/attendance/...'
        import re
        content = re.sub(
            r"require\(['\"]\./controllers/([^'\"]+)['\"]\)",
            r"require('../../../controllers/attendance/\1')",
            content
        )
        
        if content != original:
            with open(route_file, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Updated: {route_file.relative_to(server_dir)}")

print()

# Step 4: Update controller imports
print("🔧 Step 4: Updating imports in controllers...")
controller_files = [
    new_controllers / "attendance.controller.js",
    new_controllers / "leave.controller.js",
    new_controllers / "master.controller.js",
    new_controllers / "HOD.controller.js",
]

for ctrl_file in controller_files:
    if ctrl_file.exists():
        update_imports_in_file(ctrl_file)

print()

# Step 5: Update service imports
print("🔧 Step 5: Updating imports in services...")
for service_file in new_services.glob("*.js"):
    update_imports_in_file(service_file)

print()

# Step 6: Update service imports for cross-references
print("🔧 Step 6: Updating service cross-references...")
for service_file in new_services.glob("*.js"):
    with open(service_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Update service imports referencing other services (they are now in same directory)
    # No need to change ./WorkingDayEngine etc since they're in same dir
    
    # Update model imports for services
    content = re.sub(
        r"require\(['\"]\.\./models/User['\"]\)",
        "require('../../model/userModel.mjs')",
        content
    )
    content = re.sub(
        r"require\(['\"]\.\./models/([^'\"]+)['\"]\)",
        r"require('../../model/attendance/\1')",
        content
    )
    
    if content != original:
        with open(service_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Updated: {service_file.name}")

print()

# Step 7: Update controller imports for services (they moved to new location)
print("🔧 Step 7: Updating controller service imports...")
for ctrl_file in controller_files:
    if ctrl_file.exists():
        with open(ctrl_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Update service imports from '../services/' to '../../services/attendance/'
        content = re.sub(
            r"require\(['\"]\.\./services/([^'\"]+)['\"]\)",
            r"require('../../services/attendance/\1')",
            content
        )
        
        # Update Team model import path (it was ../../../model/teamModel.mjs)
        # Now it needs to be ../../model/teamModel.mjs (from controllers/attendance/)
        content = re.sub(
            r"import\(['\"]\.\./\.\./\.\./model/teamModel\.mjs['\"]\)",
            "import('../../model/teamModel.mjs')",
            content
        )
        
        if content != original:
            with open(ctrl_file, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Updated service imports: {ctrl_file.name}")

print()

# Step 8: Remove old directories
print("🗑️  Step 8: Removing old nested structure...")
remove_tree(old_models)
remove_tree(old_controllers)
remove_tree(old_services)
print()

print("✅ Refactoring complete!")
print("\nNew structure:")
print("  server/model/attendance/ - All attendance models")
print("  server/controllers/attendance/ - All attendance controllers")
print("  server/services/attendance/ - All attendance services")
print("  server/routes/attendance/ - Route files only")
