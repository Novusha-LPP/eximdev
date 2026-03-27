const fs = require('fs');
const path = require('path');

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            const relPath = path.relative(path.join(process.cwd(), 'src/components/attendance'), fullPath);
            const depth = relPath.split(path.sep).length - 1;
            
            let prefix = '../../api/attendance/';
            if (depth === 1) prefix = '../../../api/attendance/';
            if (depth === 2) prefix = '../../../../api/attendance/';
            if (fullPath.includes('common\\FloatingPunchButton') || fullPath.includes('common/FloatingPunchButton')) {
                prefix = '../../../api/attendance/';
            }

            if (content.includes('$(importPathPrefix)')) {
                // Let's replace literally
                // Replace globally
                content = content.split('$(importPathPrefix)').join(prefix);
                fs.writeFileSync(fullPath, content);
                console.log('Fixed prefix in', relPath);
            }
        }
    });
}

processDir(path.join(process.cwd(), 'src/components/attendance'));
