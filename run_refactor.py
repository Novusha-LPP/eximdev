#!/usr/bin/env python3
import subprocess
import sys
import os

os.chdir('C:\\Users\\india\\Desktop\\Projects\\eximdev')

try:
    result = subprocess.run(
        [sys.executable, '-m', 'subprocess', 'node', 'refactor-attendance.mjs'],
        capture_output=False
    )
    sys.exit(result.returncode)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
