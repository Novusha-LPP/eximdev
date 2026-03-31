import { readFileSync, writeFileSync } from 'fs';

const path = 'C:/Users/india/Desktop/Projects/eximdev/server/controllers/attendance/HOD.controller.js';
let content = readFileSync(path, 'utf8');

const target1 = `const { date } = req.query;`;
const insert1 = `const { date, teamId } = req.query;`;
content = content.replace(target1, insert1);

const target2 = `        if (hod.role === 'ADMIN') {
            // Admin sees all employees
            const userQuery = { 
                company_id: companyId, 
                isActive: true,
                role: { $in: ['EMPLOYEE', 'HOD', 'ADMIN'] }
            };
            employees = await User.find(userQuery).select('_id first_name last_name username email role department_id');
            debugLog.push(\`Admin mode: Found \${employees.length} total employees\`);
        } else {`;
const insert2 = `        let availableTeams = [];
        if (hod.role === 'ADMIN') {
            // Admin can see all teams
            availableTeams = await TeamModel.find({ isActive: { $ne: false } }).select('_id name');
            debugLog.push(\`Admin mode: Found \${availableTeams.length} teams\`);
            
            // If teamId is passed, filter by that team
            if (teamId && teamId !== 'all') {
                const team = await TeamModel.findById(teamId);
                if (team && team.members) {
                    const memberUserIds = team.members.map(m => m.userId).filter(Boolean);
                    employees = await User.find({
                        _id: { $in: memberUserIds },
                        isActive: true
                    }).select('_id first_name last_name username email role department_id');
                    debugLog.push(\`Admin filtered by team \${teamId}: Found \${employees.length} employees\`);
                } else {
                    employees = []; // empty team
                }
            } else {
                const userQuery = { 
                    company_id: companyId, 
                    isActive: true,
                    role: { $in: ['EMPLOYEE', 'HOD', 'ADMIN'] }
                };
                employees = await User.find(userQuery).select('_id first_name last_name username email role department_id');
                debugLog.push(\`Admin mode: Found \${employees.length} total employees\`);
            }
        } else {`;
content = content.replace(target2, insert2);

content = content.replace(
    `            // 2. Get attendance records for the date`,
    `            // Fetch team to pass available teams for HOD if needed (mostly they manage their own multiple teams if any, but we can pass them)
            availableTeams = await TeamModel.find({ hodId: hod._id, isActive: { $ne: false } }).select('_id name');
            
            // 2. Get attendance records for the date`
);

// We need to return availableTeams in the payload
// Find the `return res.json({ success: true, data: { summary:` part.
content = content.replace(
    `        return res.json({
            success: true,
            data: {
                summary: {`,
    `        return res.json({
            success: true,
            data: {
                availableTeams,
                summary: {`
);

// Replace pendingLeaves limit from limit(10) to limit(100) or .limit(999) to get them all
content = content.replace(
    /const pendingLeaves = await LeaveApplication\.find\(\{[\s\S]*?\.limit\(10\);/,
    `const pendingLeaves = await LeaveApplication.find({
            employee_id: { $in: employeeIds },
            approval_status: 'pending'
        })
            .populate('employee_id', 'first_name last_name username')
            .populate('leave_policy_id', 'leave_type policy_name')
            .sort({ createdAt: -1 })
            .limit(100);`
);

// Same for recentProcessedLeaves
content = content.replace(
    /const recentProcessedLeaves = await LeaveApplication\.find\(\{[\s\S]*?\.limit\(10\);/,
    `const recentProcessedLeaves = await LeaveApplication.find({
            employee_id: { $in: employeeIds },
            approval_status: { $in: ['approved', 'rejected'] }
        })
            .populate('employee_id', 'first_name last_name username')
            .populate('leave_policy_id', 'leave_type policy_name')
            .sort({ updatedAt: -1 })
            .limit(50);`
);

writeFileSync(path, content, 'utf8');

console.log('Script written.');
