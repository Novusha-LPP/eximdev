import os
import re

base_dir = r"d:\eximdev\server\routes"
patched_count = 0

for root, dirs, files in os.walk(base_dir):
    for f in files:
        if f.endswith('.js') or f.endswith('.mjs'):
            full_path = os.path.join(root, f)
            try:
                with open(full_path, 'r', encoding='utf-8') as file:
                    content = file.read()
            except Exception as e:
                print(f"Error reading {full_path}: {e}")
                continue
            
            modified = content
            
            def replacer(match):
                inner_str = match.group(2)
                if 'job_no' in inner_str and 'job_number' not in inner_str:
                    # replace job_no with job_number job_no
                    new_inner = re.sub(r'\bjob_no\b', 'job_number job_no', inner_str)
                    return match.group(0).replace(inner_str, new_inner)
                return match.group(0)

            # Match .select("...") or .select('...') or .select(`...`)
            modified = re.sub(r'\.select\(\s*([\'"`])([\s\S]*?)\1\s*\)', replacer, modified)

            if modified != content:
                with open(full_path, 'w', encoding='utf-8') as file:
                    file.write(modified)
                print(f"Patched {os.path.relpath(full_path, base_dir)}")
                patched_count += 1

print(f"Total files patched: {patched_count}")
