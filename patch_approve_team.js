import { readFileSync, writeFileSync } from 'fs';

const path = 'C:/Users/india/Desktop/Projects/eximdev/server/controllers/attendance/HOD.controller.js';
let content = readFileSync(path, 'utf8');

const target = `            // 2. HOD can only approve leaves within their department
            if (hod.role === 'HOD') {
                const hodDeptId = hod.department_id?._id || hod.department_id;
                const empDeptId = application.employee_id?.department_id?._id || application.employee_id?.department_id;

                debug.push(\`Comparing: HOD Dept \${hodDeptId} vs Emp Dept \${empDeptId}\`);

                if (!empDeptId || !hodDeptId || empDeptId.toString() !== hodDeptId.toString()) {
                    debug.push('AUTHORIZATION FAILED (Dept Mismatch)');
                    fs.writeFileSync('hod_approve_debug.log', debug.join('\\n'));
                    return res.status(403).json({ message: 'Unauthorized: Not your department' });
                }
            }`;

const insert = `            // 2. HOD can only approve leaves within their Team(s)
            if (hod.role === 'HOD') {
                const teamRecord = await TeamModel.findOne({
                    hodId: hodId,
                    'members.userId': requesterId,
                    isActive: { $ne: false }
                });

                if (!teamRecord) {
                    debug.push('AUTHORIZATION FAILED (Team Mismatch)');
                    fs.writeFileSync('hod_approve_debug.log', debug.join('\\n'));
                    return res.status(403).json({ message: 'Unauthorized: User is not in any of your teams' });
                }
            }`;

content = content.replace(target, insert);

writeFileSync(path, content, 'utf8');
console.log('Approve logic patched.');