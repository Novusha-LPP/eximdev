import os
import re

files = [
    r"client\src\components\import-do\ImportCompletedBilling.js",
    r"client\src\components\submission\SubmissionCompleted.js",
    r"client\src\components\import-do\DoPlanning.js",
    r"client\src\components\import-do\DoCompleted.js",
    r"client\src\components\import-do\BillingSheet.js",
    r"client\src\components\Import-billing\PaymentRequested.js",
    r"client\src\components\Import-billing\PaymentCompleted.js",
    r"client\src\components\Import-billing\ImportCompletedBilling.js",
    r"client\src\components\Import-billing\ClearanceCompleted.js",
    r"client\src\components\eSanchit\ESanchitCompleted.js",
    r"client\src\components\documentation\DocumentationCompleted.js"
]

base_dir = r"d:\eximdev"

for file_path in files:
    full_path = os.path.join(base_dir, file_path)
    if not os.path.exists(full_path):
        print(f"File not found: {full_path}")
        continue
        
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    modified = content

    # 1. Update column size to 250
    modified = re.sub(
        r'(accessorKey:\s*["\']job_no["\'],\s*header:\s*["\']Job No["\'],[\s\S]*?size:\s*)(\d+)',
        r'\g<1>250',
        modified
    )

    # 2. Add job_number to the destructuring inside Cell for job_no
    # We look for "Cell: ({ cell }) => {\n const {\n job_no," and add job_number
    # Wait, sometimes it's "const { job_no, year,"
    # Safe fallback: replace "job_no" inside "const { " when it's part of cell.row.original
    # Since we can't easily parse that safely, we'll just replace "{job_no} <br />" directly.
    
    # 3. Add whiteSpace: "nowrap" to the anchor/Link style
    if "whiteSpace: \"nowrap\"" not in modified:
        modified = re.sub(
            r'textDecoration:\s*["\']none["\']',
            'textDecoration: "none", whiteSpace: "nowrap"',
            modified
        )

    # 4. Replace {job_no} <br /> with {cell.row.original.job_number || job_no} <br />
    # This avoids needing to destructure job_number, we can just access it from row original 
    # if it's not destructured. Wait, Cell might only have `row` or `cell`. We know cell is passed as property.
    # Actually, simpler: replace `{job_no} <br />` with `{cell.row.original.job_number || job_no} <br />`
    
    # Or just replace `{job_no} <br />` with `{ (cell.row.original.job_number || job_no) } <br />`
    # Let's check how many times `{job_no} <br />` appears.
    modified = re.sub(
        r'\{job_no\}\s*<br\s*/>',
        r'{cell.row.original.job_number || job_no} <br />',
        modified
    )

    if content != modified:
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(modified)
        print(f"Patched {file_path}")
    else:
        print(f"Skipped {file_path} (No modifications made)")
