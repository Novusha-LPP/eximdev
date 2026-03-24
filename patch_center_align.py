import os
import re

base_dir = r"d:\eximdev\client\src"
patched_count = 0

for root, dirs, files in os.walk(base_dir):
    for f in files:
        if f.endswith('.js') or f.endswith('.jsx'):
            full_path = os.path.join(root, f)
            try:
                with open(full_path, 'r', encoding='utf-8') as file:
                    content = file.read()
            except Exception as e:
                continue
            
            modified = content
            
            # 1. Material React Table files: 
            # Look for header: "Job No", and insert muiTableHeadCellProps and muiTableBodyCellProps
            # Also handle if they use single quotes: header: 'Job No'
            if re.search(r'header:\s*["\']Job No["\']', modified):
                if 'muiTableHeadCellProps: { align: "center" }' not in modified:
                    modified = re.sub(
                        r'(header:\s*["\']Job No["\'],)',
                        r'\1 muiTableHeadCellProps: { align: "center" }, muiTableBodyCellProps: { align: "center" },',
                        modified
                    )
            
            # 2. Add textAlign: "center", display: "block" (or inline-block) to the style of the <a> or <Link> inside Job No cell if not present
            # Actually, the cell alignment will center the contents. But if the <a> has padding and background color, we may need it to occupy space or just be text-aligned.
            # Let's add textAlign: "center" to the anchor tag styles just in case.
            if 'job_no' in modified and 'whiteSpace: "nowrap"' in modified:
                if 'textAlign: "center"' not in modified and 'textAlign: \'center\'' not in modified:
                    modified = re.sub(
                        r'whiteSpace:\s*["\']nowrap["\']',
                        r'whiteSpace: "nowrap", textAlign: "center", display: "inline-block", width: "100%"',
                        modified
                    )

            if modified != content:
                with open(full_path, 'w', encoding='utf-8') as file:
                    file.write(modified)
                print(f"Patched {os.path.relpath(full_path, base_dir)}")
                patched_count += 1

print(f"Total files patched: {patched_count}")
