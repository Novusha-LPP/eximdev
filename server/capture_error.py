import subprocess

with open('error_log.txt', 'w') as f:
    process = subprocess.Popen(['node', 'app.mjs'], stdout=f, stderr=f)
    process.wait()
