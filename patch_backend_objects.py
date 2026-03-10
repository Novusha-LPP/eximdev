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
            
            # 1. Patch object property style: job_no: 1
            # We look for job_no:\s*1 and replace with job_number: 1, job_no: 1
            # But only if job_number is not already nearby
            def obj_replacer(match):
                # check if the file already has job_number in it around the same block, or just globally.
                # Actually, safe to just replace if job_number is not in the match line?
                # Better: just replace all `job_no: 1` with `job_number: 1, job_no: 1` if `job_number: 1` is not in the file.
                return 'job_number: 1, ' + match.group(0)

            # Let's count occurrences first
            if 'job_no: 1' in modified and 'job_number: 1' not in modified:
                modified = re.sub(r'\bjob_no:\s*1\b', obj_replacer, modified)

            if modified != content:
                with open(full_path, 'w', encoding='utf-8') as file:
                    file.write(modified)
                print(f"Patched {os.path.relpath(full_path, base_dir)}")
                patched_count += 1

print(f"Total files patched: {patched_count}")
