import AttendanceRecord from '../../model/attendance/AttendanceRecord.js';
import LeaveApplication from '../../model/attendance/LeaveApplication.js';
import Holiday from '../../model/attendance/Holiday.js';
import moment from 'moment';
import fs from 'fs';
import TeamModel from '../../model/teamModel.mjs';
import User from '../../model/userModel.mjs';
import LeaveBalance from '../../model/attendance/LeaveBalance.js';
import LeavePolicy from '../../model/attendance/LeavePolicy.js';
import RegularizationRequest from '../../model/attendance/RegularizationRequest.js';
import mongoose from 'mongoose';
import { ALLOWED_USERNAMES } from '../../middleware/requireAllowedAdmin.mjs';
import PolicyResolver from '../../services/attendance/PolicyResolver.js';
import ActivityLog from '../../model/attendance/ActivityLog.js';

const normalizeRole = (role) => String(role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
const isAdminRole = (role) => normalizeRole(role) === 'ADMIN';
const isHodRole = (role) => {
    const n = normalizeRole(role);
    return n === 'HOD' || n === 'HEADOFDEPARTMENT';
};

const STAGE_2_APPROVER_USERNAME = 'shalini_arun';
const FINAL_APPROVER_USERNAMES = new Set(['manu_pillai', 'suraj_rajan', 'rajan_aranamkatte']);
const REQUIRED_ADMIN_SELF_APPROVAL_USERNAMES = new Set([
    STAGE_2_APPROVER_USERNAME,
    ...FINAL_APPROVER_USERNAMES
]);

const LEAVE_STAGE = {
    HOD: 'stage_1_hod',
    SHALINI: 'stage_2_shalini',
    FINAL: 'stage_3_final'
};

const LEAVE_STAGE_LABELS = {
    [LEAVE_STAGE.HOD]: 'Team HOD',
    [LEAVE_STAGE.SHALINI]: 'shalini_arun',
    [LEAVE_STAGE.FINAL]: 'Final approver'
};

const STAGE_READABLE_LABELS = {
    [LEAVE_STAGE.HOD]: 'HOD',
    [LEAVE_STAGE.SHALINI]: 'Shalini Arun',
    [LEAVE_STAGE.FINAL]: 'Final approver'
};

const formatPersonName = (person) => {
    if (!person) return null;
    if (typeof person === 'string') return person;
    return person.first_name
        ? `${person.first_name} ${person.last_name || ''}`.trim()
        : person.username || null;
};

const toIdString = (value) => {
    if (!value) return null;
    const candidate = value?._id || value;
    try {
        return candidate.toString();
    } catch {
        return String(candidate);
    }
};

const isAssignedToActor = (leave, actor) => {
    const actorId = toIdString(actor?._id);
    const actorUsername = String(actor?.username || '').toLowerCase();

    const currentApprover = leave?.current_approver_id;
    const currentApproverId = toIdString(currentApprover);
    const currentApproverUsername = String(currentApprover?.username || '').toLowerCase();

    if (actorId && currentApproverId && actorId === currentApproverId) {
        return true;
    }

    if (actorUsername && currentApproverUsername && actorUsername === currentApproverUsername) {
        return true;
    }

    return false;
};

const buildApprovalTrail = (leave) => {
    const chainByStage = new Map((leave.approval_chain || []).map((entry) => [entry?.stage, entry]));
    const trail = [];

    const hodStage = chainByStage.get(LEAVE_STAGE.HOD);
    if (hodStage?.action === 'approved') {
        trail.push('Approved by HOD');
    }

    const shaliniStage = chainByStage.get(LEAVE_STAGE.SHALINI);
    if (shaliniStage?.action === 'approved') {
        trail.push('Approved by Shalini Arun');
    }

    if (leave.approval_status === 'rejected') {
        trail.push('Rejected');
        return trail;
    }

    if (leave.approval_status === 'approved') {
        trail.push('Approved');
        return trail;
    }

    if (leave.approval_status === 'pending') {
        const pendingStage = leave.approval_stage || LEAVE_STAGE.HOD;
        trail.push(`Pending approval (${STAGE_READABLE_LABELS[pendingStage] || 'Pending'})`);
    }

    return trail;
};

const canActorActOnLeave = (leave, actor) => {
    if (String(leave.approval_status || '') !== 'pending') return false;

    const stage = leave.approval_stage || LEAVE_STAGE.HOD;
    const actorId = toIdString(actor._id);
    const actorUsername = String(actor.username || '').toLowerCase();
    const currentApproverId = toIdString(leave.current_approver_id);

    if (stage === LEAVE_STAGE.HOD) {
        return isAssignedToActor(leave, actor);
    }

    if (stage === LEAVE_STAGE.SHALINI) {
        if (actorUsername !== STAGE_2_APPROVER_USERNAME) return false;
        return !currentApproverId || actorId === currentApproverId;
    }

    if (stage === LEAVE_STAGE.FINAL) {
        if (!FINAL_APPROVER_USERNAMES.has(actorUsername)) return false;
        return !currentApproverId || actorId === currentApproverId;
    }

    return false;
};

const getPendingRemarkForActor = (leave, actor) => {
    const actorUsername = String(actor.username || '').toLowerCase();
    const stage = leave.approval_stage || LEAVE_STAGE.HOD;
    const currentApproverName = formatPersonName(leave.current_approver_id);

    if (canActorActOnLeave(leave, actor)) return null;

    if (actorUsername === STAGE_2_APPROVER_USERNAME && stage === LEAVE_STAGE.HOD) {
        return 'Pending - needs HOD approval first';
    }

    if (FINAL_APPROVER_USERNAMES.has(actorUsername)) {
        if (stage === LEAVE_STAGE.HOD) return 'Pending - needs HOD approval first';
        if (stage === LEAVE_STAGE.SHALINI) return 'Pending - needs Shalini Arun approval';
    }

    if (currentApproverName) {
        return `Pending - assigned to ${currentApproverName}`;
    }

    return `Pending - awaiting ${STAGE_READABLE_LABELS[stage] || 'approval'}`;
};

const isTerminalLeaveStatus = (status) => ['approved', 'rejected', 'cancelled', 'withdrawn'].includes(String(status || ''));

const appendApprovalHistoryEntry = (application, actorObjectId, actorName, actorRole, action, comment = '') => {
    if (!Array.isArray(application.approval_history)) {
        application.approval_history = [];
    }
    application.approval_history.push({
        actor_id: actorObjectId,
        actor_name: actorName,
        actor_role: actorRole,
        action,
        comment,
        timestamp: new Date()
    });
};

const markApprovalChainStage = (application, stage, status, comments) => {
    if (!Array.isArray(application.approval_chain)) {
        application.approval_chain = [];
    }
    const chainItem = application.approval_chain.find((entry) => entry?.stage === stage);
    if (chainItem) {
        chainItem.action = status;
        chainItem.action_date = new Date();
        if (comments) {
            chainItem.comments = comments;
        }
    }
};

const setPendingStage = (application, stage, approverId, approverRole = 'ADMIN', approverUsername = '') => {
    application.approval_status = 'pending';
    application.approval_stage = stage;
    application.current_approver_id = approverId || undefined;

    if (!Array.isArray(application.approval_chain)) {
        application.approval_chain = [];
    }

    const existing = application.approval_chain.find((entry) => entry?.stage === stage);
    if (existing) {
        existing.action = 'pending';
        existing.action_date = undefined;
        existing.comments = undefined;
        existing.approver_id = approverId || undefined;
        if (approverRole) existing.approver_role = approverRole;
        if (approverUsername) existing.approver_username = approverUsername;
        return;
    }

    application.approval_chain.push({
        level: stage === LEAVE_STAGE.HOD ? 1 : (stage === LEAVE_STAGE.SHALINI ? 2 : 3),
        stage,
        approver_id: approverId || undefined,
        approver_role: approverRole,
        approver_username: approverUsername || undefined,
        action: 'pending'
    });
};

const PENDING_STATUSES = ['pending', 'pending_hod', 'pending_shalini', 'pending_final'];

const getActorPendingLeaveQuery = (actor) => {
    const actorId = actor._id?._id || actor._id;
    const actorUsername = String(actor.username || '').toLowerCase();

    if (actorUsername === STAGE_2_APPROVER_USERNAME) {
        return {
            approval_status: { $in: PENDING_STATUSES },
            approval_stage: { $in: [LEAVE_STAGE.HOD, LEAVE_STAGE.SHALINI] }
        };
    }

    if (FINAL_APPROVER_USERNAMES.has(actorUsername)) {
        return {
            approval_status: { $in: PENDING_STATUSES }
        };
    }

    return {
        approval_status: { $in: PENDING_STATUSES },
        current_approver_id: actorId
    };
};

const getShaliniApprover = async (companyId) => {
    const companyScoped = await User.findOne({
        username: STAGE_2_APPROVER_USERNAME,
        company_id: companyId,
        isActive: true
    }).select('_id username role');

    if (companyScoped) {
        return companyScoped;
    }

    return User.findOne({
        username: STAGE_2_APPROVER_USERNAME,
        isActive: true
    }).select('_id username role');
};

const migrateLegacyPendingHodForCompany = async (companyId) => {
    if (!companyId) return;

    const legacy = await LeaveApplication.find({
        company_id: companyId,
        approval_status: 'pending_hod'
    }).select('_id team_id employee_id');

    if (!legacy.length) return;

    const teamIds = [...new Set(legacy.map((l) => l.team_id?.toString()).filter(Boolean))].map((id) => new mongoose.Types.ObjectId(id));
    const teamDocs = await TeamModel.find({ _id: { $in: teamIds } }).select('_id hodId members').lean();
    const teamMap = new Map(teamDocs.map((t) => [t._id.toString(), t]));

    const updates = [];
    for (const leave of legacy) {
        let hodId = null;
        const team = leave.team_id ? teamMap.get(leave.team_id.toString()) : null;
        if (team?.hodId) {
            hodId = team.hodId;
        } else if (leave.employee_id) {
            const fallbackTeam = teamDocs.find((t) => (t.members || []).some((m) => m.userId?.toString() === leave.employee_id.toString()));
            if (fallbackTeam?.hodId) {
                hodId = fallbackTeam.hodId;
            }
        }

        if (!hodId) continue;

        updates.push({
            updateOne: {
                filter: { _id: leave._id },
                update: {
                    $set: {
                        approval_status: 'pending',
                        approval_stage: LEAVE_STAGE.HOD,
                        current_approver_id: hodId
                    }
                }
            }
        });
    }

    if (updates.length) {
        await LeaveApplication.bulkWrite(updates);
    }
};

const logApprovalActivity = async (req, module, action, details, metadata = {}) => {
    try {
        const companyId = req.query?.company_id || req.body?.company_id || req.user?.company_id?._id || req.user?.company_id;
        await new ActivityLog({
            company_id: companyId,
            user_id: req.user?._id,
            module,
            action,
            details,
            metadata,
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        }).save();
    } catch (err) {
        console.error('Approval activity log error:', err.message);
    }
};


// Get HOD Dashboard Data
export const getDashboard = async (req, res) => {
    try {
        const hod = req.user;
        const { date, teamId } = req.query;
        // Use UTC for date-only comparison to match AttendanceEngine
        const targetDate = date ? moment.utc(date).startOf('day') : moment.utc().startOf('day');

        // Extract Company ID
        // Note: For admins, we should also look at req.query.company_id to allow switching contexts
        const companyId = req.query.company_id || (hod.company_id?._id || hod.company_id);

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'Unable to resolve company context. Please ensure your user profile is complete or provide a company ID.' });
        }

        await migrateLegacyPendingHodForCompany(companyId);

        const debugLog = [];
        debugLog.push(`--- HOD DASHBOARD DEBUG ${new Date().toISOString()} ---`);
        debugLog.push(`HOD: ${hod.username} ID: ${hod._id} Role: ${hod.role}`);
        debugLog.push(`Company: ${companyId}`);

        // 1. Get team members for this HOD (TEAM-BASED FILTERING)
        let employeeIds = [];
        let employees = [];
        let allTeamsForHOD = [];

        if (isAdminRole(hod.role)) {
            // Admin sees all employees, optionally filtered by teamId
            if (teamId) {
                // Admin filtered by a specific team
                const team = await TeamModel.findOne({ _id: teamId, isActive: { $ne: false } });
                if (team && team.members && team.members.length > 0) {
                    const memberIds = team.members.map(m => m.userId).filter(Boolean);
                    employees = await User.find({
                        _id: { $in: memberIds },
                        isActive: true
                    }).select('_id first_name last_name username email role department_id');
                    debugLog.push(`Admin filtered by teamId ${teamId}: Found ${employees.length} team members`);
                } else {
                    employees = [];
                    debugLog.push(`Admin filtered by teamId ${teamId}: Team not found or empty`);
                }
            } else {
                const userQuery = {
                    company_id: companyId,
                    isActive: true
                };
                employees = await User.find(userQuery).select('_id first_name last_name username email role department_id');
                debugLog.push(`Admin mode (all): Found ${employees.length} total employees`);
            }
        } else {
            // HOD sees only their team members
            debugLog.push(`Loading teams for HOD: ${hod.username}`);
            
            // Get all teams where this user is the HOD
            const teams = await TeamModel.find({ 
                hodId: hod._id,
                isActive: { $ne: false }
            });
            allTeamsForHOD = teams; // Capture for mapping later
            
            debugLog.push(`Found ${teams.length} teams for HOD`);
            
            // Extract all member user IDs from all teams
            const memberUserIds = new Set();
            teams.forEach(team => {
                if (team.members && Array.isArray(team.members)) {
                    team.members.forEach(member => {
                        if (member.userId) {
                            memberUserIds.add(member.userId.toString());
                        }
                    });
                }
            });
            
            debugLog.push(`Total unique team members: ${memberUserIds.size}`);
            
            if (memberUserIds.size === 0) {
                debugLog.push(`No team members found for HOD`);
                // Return empty dashboard
                return res.json({
                    success: true,
                    data: {
                        summary: {
                            totalEmployees: 0,
                            present: 0,
                            absent: 0,
                            onLeave: 0,
                            late: 0
                        },
                        employees: [],
                        teamCalendar: [],
                        pendingLeaves: [],
                        recentProcessedLeaves: [],
                        pendingRegularizations: [],
                        lateEmployees: [],
                        earlyOutEmployees: [],
                        halfDayEmployees: [],
                        absentEmployees: [],
                        date: targetDate.format('YYYY-MM-DD')
                    }
                });
            }
            
            // Convert Set to Array of ObjectIds
            employeeIds = Array.from(memberUserIds).map(id => id);
            
            // Fetch full employee details
            employees = await User.find({
                _id: { $in: employeeIds },
                isActive: true
            }).select('_id first_name last_name username email role department_id');
            
            debugLog.push(`Loaded ${employees.length} active team member details`);
        }

        // Helper to resolve team name for an employee (used in HOD dashboard)
        const getTeamNameForMember = (empId) => {
            const sid = empId?.toString();
            // In HOD mode, we already have employees from specific teams.
            // But let's check which team they belong to if we have multiple teams.
            // (Only for HOD role; for Admin it shows all)
            const matchedTeam = (allTeamsForHOD || []).find(t => 
                t.members && t.members.some(m => m.userId?.toString() === sid)
            );
            return matchedTeam ? matchedTeam.name : null;
        };

        employeeIds = employees.map(e => e._id);
        const totalEmployees = employees.length;

        const dateStr = targetDate.format('YYYY-MM-DD');
        debugLog.push(`Searching for attendance on: ${dateStr} for ${employeeIds.length} employees`);

        // 2. Get attendance records for the date
        const dayStart = targetDate.clone().startOf('day').toDate();
        const dayEnd = targetDate.clone().endOf('day').toDate();
        const attendanceRecords = await AttendanceRecord.find({
            employee_id: { $in: employeeIds },
            attendance_date: { $gte: dayStart, $lte: dayEnd }
        }).populate('employee_id', 'first_name last_name username');

        debugLog.push(`Found attendance records: ${attendanceRecords.length}`);
        if (attendanceRecords.length > 0) {
            attendanceRecords.forEach(r => debugLog.push(`Record for: ${r.employee_id?.username} Status: ${r.status}`));
        }

        // 3. Get approved leaves for the date
        const approvedLeaves = await LeaveApplication.find({
            employee_id: { $in: employeeIds },
            approval_status: 'approved',
            from_date: { $lte: targetDate.toDate() },
            to_date: { $gte: targetDate.toDate() }
        })
            .populate('employee_id', 'first_name last_name username')
            .populate('leave_policy_id', 'leave_type policy_name');

        debugLog.push(`Found approved leaves: ${approvedLeaves.length}`);

        // 4. Calculate Summary
        const presentEmployees = new Set();
        const lateEmployees = [];
        const earlyOutEmployees = [];
        const halfDayEmployees = [];
        const absentEmployees = [];

        // Process attendance
        attendanceRecords.forEach(record => {
            const empName = record.employee_id.first_name ? `${record.employee_id.first_name} ${record.employee_id.last_name || ''}`.trim() : record.employee_id.username;

            if (record.first_in || record.status === 'present' || record.status === 'half_day') {
                // Employee has punched in — they are present (not absent)
                presentEmployees.add(record.employee_id._id.toString());

                if (record.is_late) {
                    lateEmployees.push({
                        name: empName,
                        inTime: record.first_in,
                        reason: record.late_reason || null,
                        lateBy: record.late_by_minutes || 0
                    });
                }

                if (record.is_early_exit) {
                    earlyOutEmployees.push({
                        name: empName,
                        inTime: record.first_in,
                        outTime: record.last_out,
                        reason: record.early_exit_reason || null,
                        earlyBy: record.early_exit_minutes || 0
                    });
                }

                if (record.status === 'half_day') {
                    halfDayEmployees.push({
                        name: empName,
                        inTime: record.first_in,
                        outTime: record.last_out,
                        workHours: record.total_work_hours || 0
                    });
                }
            } else if (record.status === 'absent') {
                // Explicitly absent (no punch recorded)
                absentEmployees.push({
                    name: empName,
                    reason: 'No punch recorded',
                    onLeave: false
                });
                // Mark as processed so we don't add again below
                presentEmployees.add(record.employee_id._id.toString());
            }
        });

        // Find absent employees (no attendance record and not on leave)
        const onLeaveIds = new Set(approvedLeaves.map(l => l.employee_id._id.toString()));

        employees.forEach(emp => {
            const empId = emp._id.toString();
            const isPresent = presentEmployees.has(empId);
            const isOnLeave = onLeaveIds.has(empId);

            if (!isPresent && !isOnLeave) {
                absentEmployees.push({
                    name: emp.first_name ? `${emp.first_name} ${emp.last_name || ''}`.trim() : emp.username,
                    reason: 'No punch recorded',
                    onLeave: false
                });
            } else if (isOnLeave) {
                const leaveRecord = approvedLeaves.find(l => l.employee_id._id.toString() === empId);
                absentEmployees.push({
                    name: emp.first_name ? `${emp.first_name} ${emp.last_name || ''}`.trim() : emp.username,
                    reason: `On leave`,
                    onLeave: true,
                    leaveType: leaveRecord?.leave_policy_id?.leave_type || 'Leave'
                });
            }
        });

        // 5. Get pending leave requests
        const actorPendingQuery = getActorPendingLeaveQuery(hod);

        const pendingLeaves = await LeaveApplication.find({
            employee_id: { $in: employeeIds },
            ...actorPendingQuery
        })
            .populate('employee_id', 'first_name last_name username')
            .populate('current_approver_id', 'first_name last_name username role')
            .populate('leave_policy_id', 'leave_type policy_name')
            .sort({ createdAt: -1 })
            .limit(100);

        // 5a. Get recently processed leave requests (History)
        const recentProcessedLeaves = await LeaveApplication.find({
            employee_id: { $in: employeeIds },
            approval_status: { $in: ['approved', 'rejected'] }
        })
            .populate('employee_id', 'first_name last_name username')
            .populate('current_approver_id', 'first_name last_name username role')
            .populate('leave_policy_id', 'leave_type policy_name')
            .sort({ updatedAt: -1 })
            .limit(50);

        const mapLeave = (leave) => {
            const currentApprover = leave.current_approver_id;
            const approvalStage = leave.approval_stage || LEAVE_STAGE.HOD;
            const approvalStageLabel = LEAVE_STAGE_LABELS[approvalStage] || approvalStage;
            return {
                id: leave._id,
                employeeName: leave.employee_id?.first_name
                    ? `${leave.employee_id.first_name} ${leave.employee_id.last_name || ''}`.trim()
                    : leave.employee_id?.username || 'Unknown',
                employeeId: leave.employee_id?._id || leave.employee_id,
                leaveType: leave.leave_policy_id?.leave_type || leave.leave_type || 'Unknown',
                fromDate: leave.from_date,
                toDate: leave.to_date,
                totalDays: leave.total_days,
                is_half_day: leave.is_half_day,
                half_day_session: leave.half_day_session,
                attachment_urls: leave.attachment_urls || [],
                reason: leave.reason,
                status: leave.approval_status,
                approvalStage,
                approvalStageLabel,
                approvalTrail: buildApprovalTrail(leave),
                canAct: canActorActOnLeave(leave, hod),
                pendingRemark: getPendingRemarkForActor(leave, hod),
                currentApproverName: formatPersonName(currentApprover),
                currentApproverRole: currentApprover?.role ? normalizeRole(currentApprover.role) : null,
                currentApproverUsername: currentApprover?.username || null,
                approvedBy: leave.approval_status === 'approved' ? formatPersonName(leave.final_reviewed_by || leave.hod_reviewed_by) : null,
                rejectedBy: leave.approval_status === 'rejected' ? formatPersonName(leave.rejected_by || leave.final_reviewed_by || leave.hod_reviewed_by) : null,
                approverRole: leave.approval_status === 'approved' ? normalizeRole((leave.final_reviewed_by || leave.hod_reviewed_by)?.role) : null,
                decisionRemark: leave.rejection_reason || leave.final_review_comment || leave.hod_review_comment || leave.comments || null,
                rejectionReason: leave.rejection_reason || null,
                actionDate: leave.updatedAt
            };
        };

        // 6. Get pending regularizations
        const pendingRegularizations = await RegularizationRequest.find({
            employee_id: { $in: employeeIds },
            status: 'pending'
        })
            .populate('employee_id', 'first_name last_name username')
            .sort({ createdAt: -1 })
            .limit(10);

        // Department data is not used in attendance reporting.

        // 8. Build Team Calendar (7 days view)
        // Get current week's date range
        const startOfWeek = moment().startOf('week').add(1, 'day'); // Monday
        const endOfWeek = moment(startOfWeek).add(6, 'days'); // Sunday

        debugLog.push(`Calendar range: ${startOfWeek.format('YYYY-MM-DD')} to ${endOfWeek.format('YYYY-MM-DD')}`);

        const weekHolidays = await Holiday.find({
            company_id: companyId,
            holiday_date: {
                $gte: startOfWeek.toDate(),
                $lte: endOfWeek.toDate()
            }
        });

        // --- FIX START: Use .toDate() for accurate MongoDB querying ---
        const weekAttendance = await AttendanceRecord.find({
            employee_id: { $in: employeeIds },
            attendance_date: {
                $gte: startOfWeek.startOf('day').toDate(),
                $lte: endOfWeek.endOf('day').toDate()
            }
        });
        // --- FIX END ---

        // Fetch approved leaves for the week
        const weekLeaves = await LeaveApplication.find({
            employee_id: { $in: employeeIds },
            approval_status: 'approved',
            $or: [
                {
                    from_date: { $lte: endOfWeek.toDate() },
                    to_date: { $gte: startOfWeek.toDate() }
                }
            ]
        });

        const calendarPolicies = new Map(
            await Promise.all(employees.map(async (emp) => {
                const [weekOffPolicy, holidayPolicy] = await Promise.all([
                    PolicyResolver.resolveWeekOffPolicy(emp),
                    PolicyResolver.resolveHolidayPolicy(emp, startOfWeek.year())
                ]);
                return [emp._id.toString(), { weekOffPolicy, holidayPolicy }];
            }))
        );

        // Build team calendar
        const teamCalendar = employees.map(emp => {
            const empId = emp._id.toString();
            const attendance = {};

            // Generate 7 days of data
            for (let i = 0; i < 7; i++) {
                const currentDate = moment(startOfWeek).add(i, 'days');
                const dateStr = currentDate.format('YYYY-MM-DD');

                // Check if employee is on leave
                const leaveRecord = weekLeaves.find(leave =>
                    leave.employee_id.toString() === empId &&
                    moment(leave.from_date).isSameOrBefore(currentDate, 'day') &&
                    moment(leave.to_date).isSameOrAfter(currentDate, 'day')
                );

                if (leaveRecord) {
                    attendance[dateStr] = leaveRecord.is_half_day ? 'half_day' : 'leave';
                    if (leaveRecord.is_half_day) {
                        attendance[`${dateStr}_session`] = leaveRecord.half_day_session;
                    }
                    continue;
                }

                const empPolicy = calendarPolicies.get(empId) || { weekOffPolicy: null, holidayPolicy: null };
                const holidayStatus = PolicyResolver.resolveHolidayStatus(currentDate.toDate(), empPolicy.holidayPolicy);
                const weekOffStatus = PolicyResolver.resolveWeeklyOffStatus(currentDate.toDate(), empPolicy.weekOffPolicy);

                if (holidayStatus?.isHoliday) {
                    attendance[dateStr] = 'holiday';
                    continue;
                }

                if (weekOffStatus?.isOff) {
                    attendance[dateStr] = 'weekly_off';
                    continue;
                }

                // Check attendance record
                // --- FIX START: Compare formatted strings instead of Date Object vs String ---
                const attRecord = weekAttendance.find(att => {
                    const attDateStr = moment(att.attendance_date).format('YYYY-MM-DD');
                    return att.employee_id.toString() === empId && attDateStr === dateStr;
                });
                // --- FIX END ---

                if (attRecord) {
                    // Send status + late/early flags for the frontend to show proper indicator
                    if (attRecord.status === 'half_day') {
                        attendance[dateStr] = 'half_day';
                        attendance[`${dateStr}_session`] = attRecord.half_day_session;
                    } else if (attRecord.is_late && attRecord.is_early_exit) {
                        attendance[dateStr] = 'late_early';
                    } else if (attRecord.is_late) {
                        attendance[dateStr] = 'present_late';
                    } else if (attRecord.is_early_exit) {
                        attendance[dateStr] = 'present_early';
                    } else {
                        attendance[dateStr] = attRecord.status;
                    }
                    // Add lateness info as a separate key
                    if (attRecord.is_late) {
                        attendance[`${dateStr}_late_by`] = attRecord.late_by_minutes;
                    }
                } else {
                    // No record - could be future date or genuinely absent
                    if (currentDate.isAfter(moment(), 'day')) {
                        attendance[dateStr] = null; // Future date
                    } else {
                        attendance[dateStr] = 'absent';
                    }
                }
            }

            return {
                name: emp.first_name ? `${emp.first_name} ${emp.last_name || ''}`.trim() : emp.username,
                role: 'Team Member',
                attendance
            };
        });

        // ... existing code ...

        debugLog.push(`Team calendar built with ${teamCalendar.length} members`);

        // Write debug file
        fs.writeFileSync('hod_dashboard_debug.log', debugLog.join('\n'));

        // Response
        res.json({
            data: {
                summary: {
                    present: presentEmployees.size,
                    absent: absentEmployees.filter(a => !a.onLeave).length,
                    late: lateEmployees.length,
                    earlyOut: earlyOutEmployees.length,
                    halfDay: halfDayEmployees.length,
                    onLeave: approvedLeaves.length
                },
                absent: absentEmployees,
                late: lateEmployees,
                earlyOut: earlyOutEmployees,
                halfDay: halfDayEmployees,
                pendingLeaves: await Promise.all(pendingLeaves.map(async leave => {
                    // Fetch current balance for this specific leave type
                    const balance = await LeaveBalance.findOne({
                        employee_id: leave.employee_id._id,
                        leave_policy_id: leave.leave_policy_id._id,
                        year: new Date().getFullYear()
                    });

                    const currentApprover = leave.current_approver_id;
                    const approvalStage = leave.approval_stage || LEAVE_STAGE.HOD;
                    const currentApproverName = formatPersonName(currentApprover);
                    const approvalTrail = buildApprovalTrail(leave);
                    const canAct = canActorActOnLeave(leave, hod);

                    return {
                        id: leave._id,
                        employeeName: leave.employee_id.first_name ? `${leave.employee_id.first_name} ${leave.employee_id.last_name || ''}`.trim() : leave.employee_id.username,
                        leaveType: leave.leave_policy_id?.leave_type || 'Unknown',
                        policyName: leave.leave_policy_id?.policy_name || 'Standard Policy',
                        fromDate: leave.from_date,
                        toDate: leave.to_date,
                        totalDays: leave.total_days,
                        is_half_day: leave.is_half_day,
                        half_day_session: leave.half_day_session,
                        attachment_urls: leave.attachment_urls || [],
                        reason: leave.reason,
                        approvalStage,
                        approvalStageLabel: LEAVE_STAGE_LABELS[approvalStage] || approvalStage,
                        approvalTrail,
                        canAct,
                        pendingRemark: getPendingRemarkForActor(leave, hod),
                        currentApproverName,
                        currentApproverRole: currentApprover?.role ? normalizeRole(currentApprover.role) : null,
                        currentBalance: {
                            available: balance?.closing_balance || 0,
                            used: balance?.used || 0,
                            pending: balance?.pending_approval || 0
                        },
                        teamName: getTeamNameForMember(leave.employee_id._id)
                    };
                })),
                recentProcessedLeaves: recentProcessedLeaves.map(leave => ({
                    id: leave._id,
                    employeeName: leave.employee_id.first_name ? `${leave.employee_id.first_name} ${leave.employee_id.last_name || ''}`.trim() : leave.employee_id.username,
                    employeeId: leave.employee_id._id,
                    teamName: getTeamNameForMember(leave.employee_id._id),
                    leaveType: leave.leave_policy_id?.leave_type || 'Unknown',
                    fromDate: leave.from_date,
                    toDate: leave.to_date,
                    totalDays: leave.total_days,
                    is_half_day: leave.is_half_day,
                    half_day_session: leave.half_day_session,
                    attachment_urls: leave.attachment_urls || [],
                    status: leave.approval_status,
                    approvalStage: leave.approval_stage || LEAVE_STAGE.HOD,
                    approvalStageLabel: LEAVE_STAGE_LABELS[leave.approval_stage || LEAVE_STAGE.HOD] || leave.approval_stage,
                    approvalTrail: buildApprovalTrail(leave),
                    currentApproverName: formatPersonName(leave.current_approver_id),
                    actionDate: leave.updatedAt
                })),
                pendingRegularization: pendingRegularizations.map(reg => ({
                    id: reg._id,
                    employeeName: reg.employee_id.first_name ? `${reg.employee_id.first_name} ${reg.employee_id.last_name || ''}`.trim() : reg.employee_id.username,
                    date: reg.attendance_date,
                    type: reg.regularization_type,
                    reason: reg.reason
                })),
                // department: {
                //     name: department?.department_name || 'Department',
                //     hodName: hod.first_name ? `${hod.first_name} ${hod.last_name || ''}`.trim() : (hod.name || hod.username)
                // },
                upcomingHolidays: (await Holiday.find({
                    company_id: companyId,
                    holiday_date: { $gte: moment().startOf('day').toDate() }
                }).sort({ holiday_date: 1 }).limit(5)).map(h => ({
                    id: h._id,
                    holiday_name: h.holiday_name,
                    holiday_date: h.holiday_date,
                    holiday_type: h.holiday_type
                })),
                teamCalendar: teamCalendar,
                holidays: weekHolidays.reduce((acc, h) => {
                    acc[moment(h.holiday_date).format('YYYY-MM-DD')] = h.holiday_name;
                    return acc;
                }, {}),
                debug: {
                    hodId: hod._id,
                    hodComp: companyId,
                    employeeCount: totalEmployees,
                    attendanceCount: attendanceRecords.length,
                    calendarWeek: `${startOfWeek.format('YYYY-MM-DD')} to ${endOfWeek.format('YYYY-MM-DD')}`
                },
                timestamp: new Date()
            }
        });
    } catch (err) {
        console.error('Error in getDashboard:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Unified Approve/Reject function (HOD & Admin)
export const approveRequest = async (req, res) => {
    const debug = [];
    debug.push(`--- APPROVE REQUEST START ${new Date().toISOString()} ---`);
    try {
        const { id, type, status, comments } = req.body;
        const actor = req.user; // Can be HOD or ADMIN

        debug.push(`Body: ${JSON.stringify(req.body)}`);
        debug.push(`Actor: ${actor.username} Role: ${actor.role}`);

        if (type === 'leave') {
            if (!['approved', 'rejected'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status transition' });
            }

            const commentText = String(comments || '').trim();
            if (status === 'rejected' && !commentText) {
                return res.status(400).json({ message: 'Rejection reason is required' });
            }

            const application = await LeaveApplication.findById(id)
                .populate('current_approver_id', 'first_name last_name username role');
            if (!application) {
                debug.push(`Application not found: ${id}`);
                fs.writeFileSync('hod_approve_debug.log', debug.join('\n'));
                return res.status(404).json({ message: 'Application not found' });
            }

            debug.push(`Found Application: ${application._id}`);

            const requesterId = application.employee_id?.toString();
            const actorId = (actor._id?._id || actor._id).toString();
            const actorRole = normalizeRole(actor.role);
            const actorObjectId = actor._id?._id || actor._id;
            const actorName = actor.first_name
                ? `${actor.first_name} ${actor.last_name || ''}`.trim()
                : (actor.name || actor.username || 'Unknown');

            const actorUsername = String(actor.username || '').toLowerCase();
            const canSelfApprove = REQUIRED_ADMIN_SELF_APPROVAL_USERNAMES.has(actorUsername);
            if (requesterId === actorId && !canSelfApprove) {
                debug.push('SELF APPROVAL DENIED');
                fs.writeFileSync('hod_approve_debug.log', debug.join('\n'));
                return res.status(403).json({ message: 'Unauthorized: You cannot process your own leave application' });
            }

            try {
                if (application.approval_status === 'pending_hod') {
                    application.approval_status = 'pending';
                    if (!application.approval_stage) {
                        application.approval_stage = LEAVE_STAGE.HOD;
                    }
                }

                if (isTerminalLeaveStatus(application.approval_status)) {
                    return res.status(400).json({ message: 'Request is already finalized' });
                }

                const currentYear = new Date().getFullYear();
                let balanceRecord = await LeaveBalance.findOne({
                    employee_id: application.employee_id,
                    leave_policy_id: application.leave_policy_id,
                    year: currentYear
                });

                if (!balanceRecord) {
                    const policy = await LeavePolicy.findById(application.leave_policy_id);
                    const defaultQuota = 24;
                    const quota = policy?.annual_quota || defaultQuota;

                    balanceRecord = new LeaveBalance({
                        employee_id: application.employee_id,
                        company_id: application.company_id,
                        leave_policy_id: application.leave_policy_id,
                        leave_type: application.leave_type,
                        year: currentYear,
                        opening_balance: quota,
                        used: 0,
                        closing_balance: quota,
                        pending_approval: 0
                    });
                }

                const isUnpaid = String(application.leave_type || '').toLowerCase() === 'lwp';
                const stage = application.approval_stage || LEAVE_STAGE.HOD;
                const currentApproverId = toIdString(application.current_approver_id);

                const applyLeaveAttendance = async (processedBy) => {
                    const start = moment(application.from_date).startOf('day');
                    const end = moment(application.to_date).startOf('day');
                    let curr = moment(start);

                    while (curr.isSameOrBefore(end)) {
                        const dateStr = curr.format('YYYY-MM-DD');
                        const attDate = moment.utc(dateStr).startOf('day').toDate();

                        await AttendanceRecord.findOneAndUpdate(
                            { employee_id: application.employee_id, attendance_date: attDate },
                            {
                                status: application.is_half_day ? 'half_day' : 'leave',
                                is_half_day: application.is_half_day || false,
                                half_day_session: application.half_day_session,
                                year_month: curr.format('YYYY-MM'),
                                processed_by: processedBy
                            },
                            { upsert: true }
                        );
                        curr.add(1, 'day');
                    }
                };

                const addBackPendingBalance = () => {
                    if (!isUnpaid) {
                        balanceRecord.pending_approval = Number(balanceRecord.pending_approval || 0) + Number(application.total_days || 0);
                    }
                    balanceRecord.pending_approval = Math.max(0, Number(balanceRecord.pending_approval || 0));
                };

                const finalizeRejection = async () => {
                    application.approval_status = 'rejected';
                    application.approval_stage = null;
                    application.current_approver_id = undefined;
                    application.rejected_by = actorObjectId;
                    application.rejected_at = new Date();
                    application.rejection_reason = commentText;
                    application.final_reviewed_by = actorObjectId;
                    application.final_reviewed_at = new Date();
                    application.final_review_comment = commentText;
                    application.comments = commentText;

                    if (stage === LEAVE_STAGE.HOD) {
                        application.hod_reviewed_by = actorObjectId;
                        application.hod_reviewed_at = new Date();
                        application.hod_review_comment = commentText;
                    }

                    markApprovalChainStage(application, stage, 'rejected', commentText);
                    appendApprovalHistoryEntry(application, actorObjectId, actorName, actorRole, 'rejected', commentText);
                    await application.save();

                    addBackPendingBalance();
                    balanceRecord.closing_balance = Math.max(0, Number(balanceRecord.opening_balance || 0) - Number(balanceRecord.used || 0));
                    await balanceRecord.save();

                    await logApprovalActivity(
                        req,
                        'APPROVAL',
                        'LEAVE_REJECTED',
                        `${actorName} rejected leave request for ${application.employee_id}`,
                        {
                            leave_application_id: application._id,
                            employee_id: application.employee_id,
                            source_stage: stage,
                            comments: commentText || ''
                        }
                    );

                    fs.writeFileSync('hod_approve_debug.log', debug.join('\n'));
                    return res.json({ message: 'Leave rejected successfully' });
                };

                const finalizeApproval = async () => {
                    application.approval_status = 'approved';
                    application.approval_stage = null;
                    application.current_approver_id = undefined;
                    application.final_reviewed_by = actorObjectId;
                    application.final_reviewed_at = new Date();
                    application.final_review_comment = commentText || application.final_review_comment;
                    application.rejected_by = undefined;
                    application.rejected_at = undefined;
                    application.rejection_reason = undefined;
                    if (commentText) {
                        application.comments = commentText;
                    }

                    markApprovalChainStage(application, LEAVE_STAGE.FINAL, 'approved', commentText);
                    appendApprovalHistoryEntry(application, actorObjectId, actorName, actorRole, 'approved', commentText);
                    await application.save();

                    await applyLeaveAttendance('admin');

                    // Balance was already deducted from pending_approval at application stage
                    if (!isUnpaid) {
                        balanceRecord.used = Number(balanceRecord.used || 0) + Number(application.total_days || 0);
                    }
                    balanceRecord.closing_balance = Math.max(0, Number(balanceRecord.opening_balance || 0) - Number(balanceRecord.used || 0));
                    await balanceRecord.save();

                    await logApprovalActivity(
                        req,
                        'APPROVAL',
                        'LEAVE_APPROVED',
                        `${actorName} approved leave request for ${application.employee_id}`,
                        {
                            leave_application_id: application._id,
                            employee_id: application.employee_id,
                            source_stage: LEAVE_STAGE.FINAL,
                            comments: commentText || ''
                        }
                    );

                    fs.writeFileSync('hod_approve_debug.log', debug.join('\n'));
                    return res.json({ message: 'Leave approved successfully' });
                };

                if (stage === LEAVE_STAGE.HOD) {
                    if (!isAssignedToActor(application, actor)) {
                        return res.status(403).json({ message: 'Unauthorized: You are not the assigned HOD approver' });
                    }

                    if (status === 'rejected') {
                        return finalizeRejection();
                    }

                    markApprovalChainStage(application, LEAVE_STAGE.HOD, 'approved', commentText);
                    application.hod_reviewed_by = actorObjectId;
                    application.hod_reviewed_at = new Date();
                    application.hod_review_comment = commentText || application.hod_review_comment;
                    appendApprovalHistoryEntry(application, actorObjectId, actorName, actorRole, 'approved', commentText);

                    const shaliniApprover = await getShaliniApprover(application.company_id);
                    if (!shaliniApprover) {
                        return res.status(400).json({ message: `Unable to route approval: ${STAGE_2_APPROVER_USERNAME} not configured` });
                    }

                    setPendingStage(application, LEAVE_STAGE.SHALINI, shaliniApprover._id, 'ADMIN', STAGE_2_APPROVER_USERNAME);
                    await application.save();
                    return res.json({ message: 'Leave approved by HOD and forwarded to shalini_arun' });
                }

                if (stage === LEAVE_STAGE.SHALINI) {
                    if (actorUsername !== STAGE_2_APPROVER_USERNAME) {
                        return res.status(403).json({ message: 'Only shalini_arun can process this stage' });
                    }
                    if (currentApproverId && currentApproverId !== actorId) {
                        return res.status(403).json({ message: 'Unauthorized: You are not the assigned stage-2 approver' });
                    }

                    if (status === 'rejected') {
                        return finalizeRejection();
                    }

                    markApprovalChainStage(application, LEAVE_STAGE.SHALINI, 'approved', commentText);
                    appendApprovalHistoryEntry(application, actorObjectId, actorName, actorRole, 'approved', commentText);
                    setPendingStage(application, LEAVE_STAGE.FINAL, undefined, 'ADMIN');
                    await application.save();
                    return res.json({ message: 'Leave approved by shalini_arun and forwarded for final approval' });
                }

                if (stage === LEAVE_STAGE.FINAL) {
                    if (!isAdminRole(actorRole) || !FINAL_APPROVER_USERNAMES.has(actorUsername)) {
                        return res.status(403).json({ message: 'Final leave approval is restricted to designated final approvers' });
                    }

                    if (status === 'rejected') {
                        return finalizeRejection();
                    }

                    return finalizeApproval();
                }

                return res.status(400).json({ message: 'Invalid leave approval stage' });

            } catch (error) {
                throw error;
            }

        } else if (type === 'regularization') {
            const request = await RegularizationRequest.findById(id);
            if (!request) return res.status(404).json({ message: 'Request not found' });

            // Admin bypasses team check
            if (!isAdminRole(actor.role)) {
                // HOD: verify employee is in their team
                const hodTeams = await TeamModel.find({
                    hodId: actor._id,
                    isActive: { $ne: false }
                });

                const teamMemberIds = new Set();
                hodTeams.forEach(team => {
                    if (team.members && Array.isArray(team.members)) {
                        team.members.forEach(m => {
                            if (m.userId) teamMemberIds.add(m.userId.toString());
                        });
                    }
                });

                const requestEmpId = (request.employee_id?._id || request.employee_id).toString();
                if (!teamMemberIds.has(requestEmpId)) {
                    return res.status(403).json({ message: 'Unauthorized: Employee is not in your team' });
                }
            }

            request.status = status;
            if (comments) request.remarks = comments;
            await request.save();

            // If approved, update attendance record
            if (status === 'approved') {
                const empId = request.employee_id?._id || request.employee_id;

                await AttendanceRecord.findOneAndUpdate(
                    { employee_id: empId, attendance_date: moment(request.attendance_date).startOf('day').toDate() },
                    {
                        first_in: request.requested_in_time || request.expected_in,
                        last_out: request.requested_out_time || request.expected_out,
                        status: 'present',
                        is_regularized: true,
                        processed_at: new Date(),
                        processed_by: actor.role === 'ADMIN' ? 'admin' : 'hod'
                    },
                    { upsert: true }
                );
            }

            await logApprovalActivity(
                req,
                'APPROVAL',
                status === 'approved' ? 'REGULARIZATION_APPROVED' : 'REGULARIZATION_REJECTED',
                `${actor.username || actor.role} ${status} regularization request ${request._id}`,
                {
                    regularization_id: request._id,
                    employee_id: request.employee_id,
                    comments: comments || ''
                }
            );

            return res.json({ message: `Regularization ${status} successfully` });
        }

        res.status(400).json({ message: 'Invalid request type' });
    } catch (err) {
        debug.push(`FATAL ERROR: ${err.message}`);
        debug.push(err.stack);
        fs.writeFileSync('hod_approve_debug.log', debug.join('\n'));
        console.error('Error in approveRequest:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Team Attendance Report (formerly Department)
export const getDepartmentAttendanceReport = async (req, res) => {
    try {
        const hod = req.user;
        const { month } = req.query; // YYYY-MM

        if (!month) return res.status(400).json({ message: 'Month is required' });

        const startOfMonth = moment(month, 'YYYY-MM').startOf('month');
        const endOfMonth = moment(month, 'YYYY-MM').endOf('month');
        const companyId = req.query.company_id || (hod.company_id?._id || hod.company_id);

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'Unable to resolve company context. Please ensure your user profile is complete or provide a company ID.' });
        }

        // 1. Get team members for this HOD (TEAM-BASED FILTERING)
        let employeeIds = [];
        let employees = [];

        if (isAdminRole(hod.role)) {
            const actorUsername = String(hod.username || '').toLowerCase();
            const isAllowedAdmin = ALLOWED_USERNAMES.has(actorUsername);

            if (isAllowedAdmin) {
                // Allowlisted admins can view all employees in company scope.
                const userQuery = {
                    company_id: companyId,
                    isActive: true
                };
                employees = await User.find(userQuery).select('_id first_name last_name username');
            } else {
                // Non-allowlisted admins can only view teams where they are the HOD.
                const teams = await TeamModel.find({
                    hodId: hod._id,
                    isActive: { $ne: false }
                });

                const memberUserIds = new Set();
                teams.forEach(team => {
                    if (team.members && Array.isArray(team.members)) {
                        team.members.forEach(member => {
                            if (member.userId) {
                                memberUserIds.add(member.userId.toString());
                            }
                        });
                    }
                });

                if (memberUserIds.size === 0) {
                    return res.json({ data: [] });
                }

                employeeIds = Array.from(memberUserIds).map(id => id);
                employees = await User.find({
                    _id: { $in: employeeIds },
                    isActive: true
                }).select('_id first_name last_name username');
            }
        } else {
            // HOD sees only their team members
            const teams = await TeamModel.find({ 
                hodId: hod._id,
                isActive: { $ne: false }
            });
            
            // Extract all member user IDs from all teams
            const memberUserIds = new Set();
            teams.forEach(team => {
                if (team.members && Array.isArray(team.members)) {
                    team.members.forEach(member => {
                        if (member.userId) {
                            memberUserIds.add(member.userId.toString());
                        }
                    });
                }
            });
            
            if (memberUserIds.size === 0) {
                return res.json({ data: [] }); // No team members
            }
            
            // Convert Set to Array of ObjectIds
            employeeIds = Array.from(memberUserIds).map(id => id);
            
            // Fetch full employee details
            employees = await User.find({
                _id: { $in: employeeIds },
                isActive: true
            }).select('_id first_name last_name username');
        }

        employeeIds = employees.map(e => e._id);

        // 2. Get Attendance Records
        const attendanceRecords = await AttendanceRecord.find({
            employee_id: { $in: employeeIds },
            attendance_date: {
                $gte: startOfMonth.toDate(),
                $lte: endOfMonth.toDate()
            }
        });

        // Create Lookup Map for Attendance: "empId_YYYY-MM-DD" -> Record
        const attendanceLookup = new Map();
        attendanceRecords.forEach(r => {
            const key = `${r.employee_id.toString()}_${moment(r.attendance_date).format('YYYY-MM-DD')}`;
            attendanceLookup.set(key, r);
        });

        // 3. Get Approved Leaves
        const approvedLeaves = await LeaveApplication.find({
            employee_id: { $in: employeeIds },
            approval_status: 'approved',
            $or: [
                { from_date: { $lte: endOfMonth.toDate() }, to_date: { $gte: startOfMonth.toDate() } }
            ]
        }).populate('leave_policy_id', 'leave_type');

        // Create Lookup Map for Leaves: "empId_YYYY-MM-DD" -> LeaveRecord
        const leaveLookup = new Map();
        approvedLeaves.forEach(l => {
            let currentDate = moment(l.from_date);
            const endDate = moment(l.to_date);
            while (currentDate.isSameOrBefore(endDate, 'day')) {
                const key = `${l.employee_id.toString()}_${currentDate.format('YYYY-MM-DD')}`;
                leaveLookup.set(key, l);
                currentDate.add(1, 'day');
            }
        });

        // 3b. Get Holidays
        const holidays = await Holiday.find({
            company_id: companyId,
            holiday_date: {
                $gte: startOfMonth.toDate(),
                $lte: endOfMonth.toDate()
            }
        });
        const holidayDates = new Set(holidays.map(h => moment(h.holiday_date).format('YYYY-MM-DD')));

        // 4. Transform Data
        const reportData = employees.map(emp => {
            const empId = emp._id.toString();
            const attendanceMap = {};
            const daysInMonth = startOfMonth.daysInMonth();

            for (let day = 1; day <= daysInMonth; day++) {
                const currentDay = moment(month, 'YYYY-MM').date(day);
                const dateStr = currentDay.format('YYYY-MM-DD');
                const lookupKey = `${empId}_${dateStr}`;

                // Check Holiday
                if (holidayDates.has(dateStr)) {
                    attendanceMap[day] = 'H';
                    continue;
                }

                // Check Leave via Map Lookup
                const leave = leaveLookup.get(lookupKey);
                if (leave) {
                    attendanceMap[day] = 'L';
                    continue;
                }

                // Check Attendance via Map Lookup
                const record = attendanceLookup.get(lookupKey);

                if (record) {
                    if (record.status === 'half_day') {
                        attendanceMap[day] = record.half_day_session === 'first_half' ? 'H1' : 'H2';
                    }
                    else if (record.is_late) attendanceMap[day] = 'LT';
                    else if (record.is_early_exit) attendanceMap[day] = 'E';
                    else if (record.status === 'present') attendanceMap[day] = 'P';
                    else if (record.status === 'absent') attendanceMap[day] = 'A';
                    else attendanceMap[day] = 'P';
                } else {
                    // Weekend logic
                    if (currentDay.day() === 0 || currentDay.day() === 6) attendanceMap[day] = 'WO';
                    else if (currentDay.isAfter(moment(), 'day')) attendanceMap[day] = '';
                    else attendanceMap[day] = 'A';
                }
            }

            return {
                id: emp._id,
                name: emp.first_name ? `${emp.first_name} ${emp.last_name || ''}` : emp.username,
                attendance: attendanceMap
            };
        });

        res.json({ data: reportData });

    } catch (error) {
        console.error('Report Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Admin-only: Get all leave requests across the company, with optional teamId filter.
 * Also returns all teams for the filter dropdown.
 */
export const getAdminLeaveRequests = async (req, res) => {
    try {
        const admin = req.user;
        const adminUsername = String(admin.username || '').toLowerCase();
        const isAllowedAdmin = ALLOWED_USERNAMES.has(adminUsername);

        if (!isAdminRole(admin.role) && !isAllowedAdmin) {
            return res.status(403).json({ message: 'Admin access only' });
        }

        const { teamId, status, historyPage = 1, historyLimit = 20 } = req.query;
        const page = Math.max(1, parseInt(historyPage));
        const limit = Math.max(1, parseInt(historyLimit));

        const companyId = admin.company_id?._id || admin.company_id;

        await migrateLegacyPendingHodForCompany(companyId);

        const companyUsers = await User.find({ company_id: companyId }).select('_id').lean();
        const companyUserIds = new Set(companyUsers.map(u => u._id.toString()));
        const adminIdStr = admin._id?.toString();

        const allTeams = await TeamModel.find({ isActive: { $ne: false } })
            .select('_id name hodUsername hodId members')
            .lean();

        // Build query for leave applications
        let employeeFilter = null;

        let teams = [];
        if (isAllowedAdmin) {
            // Allowed admins see all teams across companies
            teams = allTeams;
        } else {
            // Regular HOD/Admins see only their assigned teams
            teams = allTeams.filter(t => 
                (t.hodId && t.hodId.toString() === adminIdStr) || 
                (t.hodUsername && String(t.hodUsername).toLowerCase() === adminUsername)
            );
            
            if (teams.length === 0) {
                return res.json({ 
                    data: { 
                        pendingLeaves: [], 
                        recentProcessedLeaves: [], 
                        teams: [], 
                        isAllowedAdmin: false, 
                        totalHistory: 0,
                        historyPage: page,
                        historyLimit: limit
                    } 
                });
            }
        }

        if (teamId && teamId !== 'all') {
            const team = allTeams.find(t => t._id.toString() === teamId.toString());
            if (team && team.members && team.members.length > 0) {
                const memberIds = team.members
                    .map(m => m.userId)
                    .filter(Boolean)
                    .map(id => {
                        try { return new mongoose.Types.ObjectId(id.toString()); }
                        catch (e) { return id; }
                    });
                employeeFilter = { $in: memberIds };
            } else {
                return res.json({ 
                    data: { 
                        pendingLeaves: [], 
                        recentProcessedLeaves: [], 
                        teams: teams.map(t => ({ _id: t._id, name: t.name, hodUsername: t.hodUsername })),
                        isAllowedAdmin,
                        totalHistory: 0,
                        historyPage: page,
                        historyLimit: limit
                    } 
                });
            }
        } else if (!isAllowedAdmin) {
            const memberIds = new Set();
            // Always include self in the history view for HODs
            memberIds.add(adminIdStr);

            teams.forEach((team) => {
                (team.members || []).forEach((m) => {
                    if (m.userId) {
                        memberIds.add(m.userId.toString());
                    }
                });
            });

            // Convert to ObjectIds for reliable querying
            const objectIds = Array.from(memberIds).map(id => {
                try { return new mongoose.Types.ObjectId(id); }
                catch (e) { return id; }
            });

            employeeFilter = { $in: objectIds };
        }

        const leaveQuery = isAllowedAdmin
            ? {}
            : (employeeFilter
                ? { employee_id: employeeFilter } // Trust the explicit employee filter for HODs/Specific teams
                : {
                    $or: [
                        { company_id: companyId },
                        { employee_id: admin._id }
                    ]
                });

        // Fetch pending leaves
        const pendingLeaves = await LeaveApplication.find({
            ...leaveQuery,
            ...getActorPendingLeaveQuery(admin)
        })
            .populate('employee_id', 'first_name last_name username')
            .populate('current_approver_id', 'first_name last_name username role')
            .populate('leave_policy_id', 'leave_type policy_name')
            .populate('final_reviewed_by', 'first_name last_name username role')
            .populate('hod_reviewed_by', 'first_name last_name username role')
            .populate('rejected_by', 'first_name last_name username role')
            .sort({ createdAt: -1 })
            .limit(200);

        // Fetch recent processed leaves with pagination
        const historyQuery = {
            ...leaveQuery,
            approval_status: { $in: ['approved', 'rejected'] }
        };

        const totalHistory = await LeaveApplication.countDocuments(historyQuery);

        const recentProcessedLeaves = await LeaveApplication.find(historyQuery)
            .populate('employee_id', 'first_name last_name username')
            .populate('current_approver_id', 'first_name last_name username role')
            .populate('leave_policy_id', 'leave_type policy_name')
            .populate('final_reviewed_by', 'first_name last_name username role')
            .populate('hod_reviewed_by', 'first_name last_name username role')
            .populate('rejected_by', 'first_name last_name username role')
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        // Helper to resolve team name for an employee
        const getTeamName = (empId) => {
            const empIdStr = empId?.toString();
            const team = teams.find(t =>
                t.members && t.members.some(m => m.userId?.toString() === empIdStr)
            );
            return team ? team.name : null;
        };

        const mapLeave = (leave) => {
            const empId = leave.employee_id?._id || leave.employee_id;
            const empName = leave.employee_id?.first_name
                ? `${leave.employee_id.first_name} ${leave.employee_id.last_name || ''}`.trim()
                : leave.employee_id?.username || 'Unknown';

            const finalReviewer = leave.final_reviewed_by;
            const rejectedBy = leave.rejected_by;
            const hodReviewer = leave.hod_reviewed_by;
            const effectiveReviewer = leave.approval_status === 'rejected'
                ? (rejectedBy || finalReviewer || hodReviewer)
                : (finalReviewer || hodReviewer);

            const reviewerName = effectiveReviewer
                ? (effectiveReviewer.first_name
                    ? `${effectiveReviewer.first_name} ${effectiveReviewer.last_name || ''}`.trim()
                    : effectiveReviewer.username)
                : null;

            const reviewerRole = effectiveReviewer
                ? normalizeRole(effectiveReviewer.role)
                : null;

            const currentApprover = leave.current_approver_id;
            const currentApproverName = formatPersonName(currentApprover);
            const currentApproverRole = currentApprover?.role ? normalizeRole(currentApprover.role) : null;
            const approvalStage = leave.approval_stage || LEAVE_STAGE.HOD;
            const approvalStageLabel = LEAVE_STAGE_LABELS[approvalStage] || approvalStage;
            const canAct = canActorActOnLeave(leave, admin);
            const approvalTrail = buildApprovalTrail(leave);
            const pendingRemark = getPendingRemarkForActor(leave, admin);
            const actorIdDebug = toIdString(admin._id);
            const currentApproverIdDebug = toIdString(currentApprover);
            const actorUsernameDebug = String(admin.username || '').toLowerCase();
            const currentApproverUsernameDebug = String(currentApprover?.username || '').toLowerCase();

            const decisionRemark = leave.rejection_reason
                || leave.final_review_comment
                || leave.hod_review_comment
                || leave.comments
                || null;

            return {
                id: leave._id,
                employeeName: empName,
                employeeId: empId,
                teamName: getTeamName(empId),
                leaveType: leave.leave_policy_id?.leave_type || leave.leave_type || 'Unknown',
                fromDate: leave.from_date,
                toDate: leave.to_date,
                totalDays: leave.total_days,
                is_half_day: leave.is_half_day,
                half_day_session: leave.half_day_session,
                attachment_urls: leave.attachment_urls || [],
                reason: leave.reason,
                status: leave.approval_status,
                approvalStage,
                approvalStageLabel,
                approvalTrail,
                canAct,
                pendingRemark,
                currentApproverName,
                currentApproverRole,
                currentApproverUsername: currentApprover?.username || null,
                actionDate: leave.updatedAt,
                approvedBy: leave.approval_status === 'approved' ? reviewerName : null,
                rejectedBy: leave.approval_status === 'rejected' ? reviewerName : null,
                approverRole: reviewerRole,
                decisionRemark,
                rejectionReason: leave.rejection_reason || null,
                approvalDebug: {
                    actorId: actorIdDebug,
                    currentApproverId: currentApproverIdDebug,
                    actorUsername: actorUsernameDebug,
                    currentApproverUsername: currentApproverUsernameDebug,
                    idMatch: !!actorIdDebug && !!currentApproverIdDebug && actorIdDebug === currentApproverIdDebug,
                    usernameMatch: !!actorUsernameDebug && !!currentApproverUsernameDebug && actorUsernameDebug === currentApproverUsernameDebug,
                    assignedToActor: isAssignedToActor(leave, admin),
                    stage: approvalStage,
                    status: leave.approval_status
                }
            };
        };

        return res.json({
            data: {
                pendingLeaves: pendingLeaves.map(mapLeave),
                recentProcessedLeaves: recentProcessedLeaves.map(mapLeave),
                totalHistory,
                historyPage: page,
                historyLimit: limit,
                teams: teams.map(t => ({ _id: t._id, name: t.name, hodUsername: t.hodUsername })),
                isAllowedAdmin
            }
        });

    } catch (err) {
        console.error('Error in getAdminLeaveRequests:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
/**
 * Delete a leave application (Authorized Admin only)
 */
export const deleteLeaveApplication = async (req, res) => {
    try {
        const admin = req.user;
        const adminUsername = String(admin.username || '').toLowerCase();
        
        // Only allowlisted admins can delete history
        if (!isAdminRole(admin.role) || !ALLOWED_USERNAMES.has(adminUsername)) {
            return res.status(403).json({ message: 'Unauthorized: Only authorized admins can delete leave history' });
        }

        const { id } = req.params;
        const deleted = await LeaveApplication.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ message: 'Leave application not found' });
        }

        res.json({ message: 'Leave history record deleted successfully' });
    } catch (err) {
        console.error('Error in deleteLeaveApplication:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
