import os
import shutil
from pathlib import Path

BASE_DIR = Path("C:\\Users\\india\\Desktop\\Projects\\eximdev\\server")

# Source directories
SRC_MODELS = BASE_DIR / "routes" / "attendance" / "models"
SRC_CONTROLLERS = BASE_DIR / "routes" / "attendance" / "controllers"
SRC_SERVICES = BASE_DIR / "routes" / "attendance" / "services"

# Destination directories
DEST_MODELS = BASE_DIR / "model" / "attendance"
DEST_CONTROLLERS = BASE_DIR / "controllers" / "attendance"
DEST_SERVICES = BASE_DIR / "services" / "attendance"

print("🔍 LISTING SOURCE FILES\n")

print(f"Models in {SRC_MODELS}")
models = list(SRC_MODELS.glob("*"))
model_names = [m.name for m in models if m.is_file()]
print("  ", ", ".join(model_names))

print(f"\nControllers in {SRC_CONTROLLERS}")
controllers = list(SRC_CONTROLLERS.glob("*"))
controller_names = [c.name for c in controllers if c.is_file()]
print("  ", ", ".join(controller_names))

print(f"\nServices in {SRC_SERVICES}")
services = list(SRC_SERVICES.glob("*"))
service_names = [s.name for s in services if s.is_file()]
print("  ", ", ".join(service_names))

print("\n📁 CREATING DESTINATION DIRECTORIES\n")

# Create destination directories
for dest_dir in [DEST_MODELS, DEST_CONTROLLERS, DEST_SERVICES]:
    if not dest_dir.exists():
        dest_dir.mkdir(parents=True, exist_ok=True)
        print(f"✓ Created: {dest_dir}")
    else:
        print(f"✓ Already exists: {dest_dir}")

print("\n📋 COPYING FILES\n")

copied_models = []
for model_file in models:
    if model_file.is_file():
        dest_file = DEST_MODELS / model_file.name
        shutil.copy2(model_file, dest_file)
        copied_models.append(dest_file)
        print(f"✓ Copied model: {model_file.name}")

copied_controllers = []
for controller_file in controllers:
    if controller_file.is_file():
        dest_file = DEST_CONTROLLERS / controller_file.name
        shutil.copy2(controller_file, dest_file)
        copied_controllers.append(dest_file)
        print(f"✓ Copied controller: {controller_file.name}")

copied_services = []
for service_file in services:
    if service_file.is_file():
        dest_file = DEST_SERVICES / service_file.name
        shutil.copy2(service_file, dest_file)
        copied_services.append(dest_file)
        print(f"✓ Copied service: {service_file.name}")

print("\n🔧 UPDATING IMPORT PATHS\n")

def update_imports(file_path):
    """Update relative imports in copied files"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Replace model imports: ../models/X -> ../../model/attendance/X
        import re
        
        # Pattern 1: require('../models/X') or similar
        content = re.sub(
            r"require\(['\"`]\.\.\/models\/([^'\""`]+)['\""`]\)",
            r"require('../../model/attendance/\1')",
            content
        )
        
        # Pattern 2: Special case for User model
        content = re.sub(
            r"require\(['\"`]\.\.\/models\/User['\""`]\)",
            r"require('../../model/userModel.mjs')",
            content
        )
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Updated imports in: {file_path.name}")
    except Exception as e:
        print(f"⚠ Error updating {file_path.name}: {e}")

# Update imports in copied files
for f in copied_models + copied_controllers + copied_services:
    update_imports(f)

print("\n🔄 UPDATING ROUTE FILES\n")

route_files = [
    BASE_DIR / "routes" / "attendance" / "attendanceRoutes.mjs",
    BASE_DIR / "routes" / "attendance" / "hodRoutes.mjs",
    BASE_DIR / "routes" / "attendance" / "leaveRoutes.mjs",
    BASE_DIR / "routes" / "attendance" / "masterRoutes.mjs"
]

for route_file in route_files:
    if route_file.exists():
        try:
            with open(route_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            import re
            # Update controller imports: ./controllers/X -> ../../../controllers/attendance/X
            content = re.sub(
                r"require\(['\"`]\.\/controllers\/([^'\""`]+)['\""`]\)",
                r"require('../../../controllers/attendance/\1')",
                content
            )
            
            if content != original_content:
                with open(route_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✓ Updated: {route_file.name}")
            else:
                print(f"○ No changes needed in: {route_file.name}")
        except Exception as e:
            print(f"⚠ Error updating {route_file.name}: {e}")
    else:
        print(f"⚠ File not found: {route_file}")

print("\n🗑️  CLEANING UP OLD DIRECTORIES\n")

# Remove old directories
for old_dir in [SRC_MODELS, SRC_CONTROLLERS, SRC_SERVICES]:
    try:
        if old_dir.exists():
            shutil.rmtree(old_dir)
            print(f"✓ Deleted: {old_dir}")
    except Exception as e:
        print(f"⚠ Error deleting {old_dir}: {e}")

print("\n✅ REFACTORING COMPLETE!\n")
print("Summary:")
print(f"  - Copied {len(model_names)} model files")
print(f"  - Copied {len(controller_names)} controller files")
print(f"  - Copied {len(service_names)} service files")
print(f"  - Updated imports in all copied files")
print(f"  - Updated route files")
print(f"  - Deleted old attendance subdirectories")
