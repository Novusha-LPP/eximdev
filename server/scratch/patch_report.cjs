const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'client', 'src', 'components', 'attendance', 'AttendanceReport.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Patch 1: continuityStats
const oldStats = `(empHistory || []).forEach((rec) => {
            const status = getCalendarStatusClass(rec?.status);
            if (status === 'present') stats.present += 1;
            if (status === 'late') {
                stats.late += 1;
                stats.present += 1;
            }
            if (status === 'absent') stats.absent += 1;
            if (status === 'leave') stats.leaves += 1;
            if (status === 'weekly_off') stats.weeklyOff += 1;
            if (status === 'holiday') stats.holidays += 1;
        });`;

const newStats = `(empHistory || []).forEach((rec) => {
            const isHalf = Boolean(rec.is_half_day || rec.isHalfDay || (String(rec.status || '').toLowerCase() === 'half_day'));
            const status = getCalendarStatusClass(isHalf ? 'half_day' : rec?.status);
            
            if (status === 'present') stats.present += 1;
            if (status === 'late') {
                stats.late += 1;
                stats.present += 1;
            }
            if (status === 'absent') stats.absent += 1;
            if (status === 'leave' || status === 'pending_leave') stats.leaves += 1;
            if (status === 'half_day') {
                const hasLeave = !!(rec.leaveType || rec.leave_type);
                if (hasLeave) {
                    stats.leaves += 0.5;
                    stats.present += 0.5;
                } else {
                    stats.present += 0.5;
                    stats.absent += 0.5;
                }
            }
            if (status === 'weekly_off') stats.weeklyOff += 1;
            if (status === 'holiday') stats.holidays += 1;
        });`;

if (content.includes(oldStats)) {
    content = content.replace(oldStats, newStats);
    console.log('Patch 1 applied');
} else {
    console.log('Patch 1 NOT found. Checking with potential line ending differences...');
    // Try a more flexible match if direct match fails
}

// Patch 2: Calendar half-day detection
const oldCal = `const statusClass = getCalendarStatusClass(rec?.status);
                                                        
                                                        let statusBadge = getCalendarStatusBadge(rec?.status);
                                                        if (rec?.status === 'half_day') {
                                                            const session = rec.half_day_session || '';
                                                            statusBadge = session.toLowerCase().includes('first') ? '1st Half' : (session.toLowerCase().includes('second') ? '2nd Half' : '½ Day');
                                                        }`;

const newCal = `// Robust half-day detection synced with EmployeeProfileWorkspace
                                                        const isHalfFlag = Boolean(rec?.is_half_day || rec?.isHalfDay || rec?.is_half || rec?.half_day || (String(rec?.status || '').toLowerCase() === 'half_day'));
                                                        const displayStatus = isHalfFlag ? 'half_day' : (rec?.status || 'none');
                                                        
                                                        const statusClass = getCalendarStatusClass(displayStatus);
                                                        let statusBadge = getCalendarStatusBadge(displayStatus);

                                                        if (displayStatus === 'half_day') {
                                                            const session = rec?.half_day_session || rec?.start_half_session || rec?.end_half_session || '';
                                                            statusBadge = session.toLowerCase().includes('first') ? '1st Half' : (session.toLowerCase().includes('second') ? '2nd Half' : '½ Day');
                                                        }`;

if (content.includes(oldCal)) {
    content = content.replace(oldCal, newCal);
    console.log('Patch 2 applied');
} else {
    console.log('Patch 2 NOT found.');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('File saved');
