const fs = require('fs');
const path = require('path');

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // Normalize the path manually
            const rootAttendanceDir = path.join(process.cwd(), 'src/components/attendance');
            const relPath = path.relative(rootAttendanceDir, fullPath);
            const depth = relPath.split(path.sep).length - 1;
            
            // Base prefix to get from current file to src/api/attendance/
            // if depth is 0 (Dashboard.jsx), it's ../../api/attendance/
            // if depth is 1 (common/FloatingPunch.jsx or admin/Settings.jsx), it's ../../../api/attendance/
            let correctPrefix = '../../api/attendance/';
            if (depth === 1) correctPrefix = '../../../api/attendance/';
            if (depth === 2) correctPrefix = '../../../../api/attendance/';

            const apiFiles = [
                'attendance.api', 
                'master.api', 
                'leave.api', 
                'HOD.api', 
                'admin.api', 
                'auth.api'
            ];
            
            apiFiles.forEach(apiFile => {
                // regex to match imports like import attendanceAPI from '.../api/attendance/attendance.api';
                // or the broken double-prefixed one: import attendanceAPI from '.../api/attendance/api/attendance/attendance.api';
                const regexPattern = `import\\s+(\\w+)API\\s+from\\s+['"].*${apiFile.replace(/\./g, '\\.')}['"];?`;
                const regex = new RegExp(regexPattern, 'g');
                
                content = content.replace(regex, (match, apiVarName) => {
                    return `import ${apiVarName}API from '${correctPrefix}${apiFile}';`;
                });
            });

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed imports in ' + relPath);
            }
        }
    });
}

processDir(path.join(process.cwd(), 'src/components/attendance'));
