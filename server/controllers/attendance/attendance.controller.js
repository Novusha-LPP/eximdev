import fs from 'fs';
import mongoose from 'mongoose';
import TeamModel from '../../model/teamModel.mjs';
import User from '../../model/userModel.mjs';
import AttendancePunch from '../../model/attendance/AttendancePunch.js';
import AttendanceRecord from '../../model/attendance/AttendanceRecord.js';
import Shift from '../../model/attendance/Shift.js';
import LeaveApplication from '../../model/attendance/LeaveApplication.js';
import LeaveBalance from '../../model/attendance/LeaveBalance.js';
import RegularizationRequest from '../../model/attendance/RegularizationRequest.js';
import Company from '../../model/attendance/Company.js';
import Holiday from '../../model/attendance/Holiday.js';
import moment from 'moment-timezone';
import Department from '../../model/attendance/Department.js';
import LeavePolicy from '../../model/attendance/LeavePolicy.js';
import WorkingDayEngine from '../../services/attendance/WorkingDayEngine.js';
import AttendanceEngine from '../../services/attendance/AttendanceEngine.js';
import ValidationEngine from '../../services/attendance/ValidationEngine.js';
import PayrollEngine from '../../services/attendance/PayrollEngine.js';
import PolicyResolver from '../../services/attendance/PolicyResolver.js';
import ActivityLog from '../../model/attendance/ActivityLog.js';
import ActiveSession from '../../model/attendance/ActiveSession.js';
import { WorkHoursCalculator } from '../../services/attendance/WorkHoursCalculator.js';
import { AttendanceStatusResolver } from '../../services/attendance/AttendanceStatusResolver.js';

// --- HELPERS ---
const resolveCompanyId = (req) => {
    // If explicit company_id provided in query/body (for admin views)
    const explicitId = req.query?.company_id || req.body?.company_id;
    if (explicitId) return explicitId;

    // Fallback to user's company context
    return req.user?.company_id?._id || req.user?.company_id;
};

const logActivity = async (req, module, action, details, metadata = {}) => {
    try {
        const activity = new ActivityLog({
            company_id: resolveCompanyId(req),
            user_id: req.user?._id,
            module,
            action,
            details,
            metadata,
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });
        await activity.save();
    } catch (err) {
        console.error('Activity Log Error:', err);
    }
};

const isHODauthorized = async (hodId, employeeId) => {
    if (!employeeId) return false;
    // Ensure hodId is treated correctly for query
    const hodTeams = await TeamModel.find({ 
        hodId: mongoose.Types.ObjectId.isValid(hodId) ? hodId : new mongoose.Types.ObjectId(hodId), 
        isActive: { $ne: false } 
    });
    
    const authorized = hodTeams.some(team => 
        team.members?.some(m => m.userId && m.userId.toString() === employeeId.toString())
    );

    if (!authorized) {
        console.warn(`[AttendanceAuth] HOD ${hodId} attempted unauthorized access to employee ${employeeId}. Teams found: ${hodTeams.map(t => t.name).join(', ')}`);
    }

    return authorized;
};

const getHodTeamMemberIds = async (hodId) => {
    const hodTeams = await TeamModel.find({
        hodId: mongoose.Types.ObjectId.isValid(hodId) ? hodId : new mongoose.Types.ObjectId(hodId),
        isActive: { $ne: false }
    });

    const memberIds = new Set();
    hodTeams.forEach(team => {
        if (team.members && Array.isArray(team.members)) {
            team.members.forEach(member => {
                if (member.userId) memberIds.add(member.userId.toString());
            });
        }
    });

    return Array.from(memberIds).map(id => new mongoose.Types.ObjectId(id));
};

import QueryBuilder from '../../services/attendance/QueryBuilder.js';
import PayrollLock from '../../model/attendance/PayrollLock.js';

const HOD_PENDING_LEAVE_STATUSES = ['pending_hod', 'pending'];
const ADMIN_PENDING_LEAVE_STATUSES = ['hod_approved_pending_admin', 'pending'];
const NON_FINAL_LEAVE_STATUSES = ['pending_hod', 'hod_approved_pending_admin', 'pending'];

const getWeeklyOffDaysFromPolicy = (weekOffPolicy) => {
    if (!weekOffPolicy?.day_rules || !Array.isArray(weekOffPolicy.day_rules)) return [0];
    const days = weekOffPolicy.day_rules
        .filter((dr) => Array.isArray(dr.rules) && dr.rules.some((r) => r.week_number === 0 && r.off_type !== 'none'))
        .map((dr) => dr.day_index)
        .filter((d) => Number.isInteger(d));
    return days.length > 0 ? days : [0];
};

// --- HELPER: Process Daily Attendance (Multi-Tenant & Rule-Driven) ---
async function processDailyAttendance(user, date) {
    // Fetch Company & Shift Config dynamically
    const company = await Company.findById(user.company_id);
    const shift = await PolicyResolver.resolveShift(user);

    // Delegate to rule-driven engine and return the processed record
    return await AttendanceEngine.processDaily(user, date, company, shift);
}

// --- HELPER: Fetch Day Overrides (Leave/Holiday/Weekly Off) ---
async function fetchDayOverrides(employeeId, date, companyId) {
    const dateObj = moment.utc(date).startOf('day').toDate();

    const overrides = {
        hasLeave: false,
        isHoliday: false,
        isWeeklyOff: false,
        leave: null,
        holiday: null,
        weekly_off: null
    };

    // Check for approved leave
    const leaveApp = await LeaveApplication.findOne({
        employee_id: employeeId,
        approval_status: 'approved',
        $expr: {
            $and: [
                { $gte: [moment.utc(date).startOf('day').toDate(), '$from_date'] },
                { $lte: [moment.utc(date).endOf('day').toDate(), '$to_date'] }
            ]
        }
    });
    if (leaveApp) {
        overrides.hasLeave = true;
        overrides.leave = {
            leave_type: leaveApp.leave_type,
            reason: leaveApp.reason
        };
    }

    // Check for holiday
    const holiday = await Holiday.findOne({
        company_id: companyId,
        holiday_date: { $gte: dateObj, $lt: new Date(dateObj.getTime() + 86400000) }
    });
    if (holiday) {
        overrides.isHoliday = true;
        overrides.holiday = {
            name: holiday.holiday_name
        };
    }

    // Check for weekly off via policy resolver.
    const user = await User.findById(employeeId);
    if (user) {
        const weekOffPolicy = await PolicyResolver.resolveWeekOffPolicy(user);
        const weekOffStatus = PolicyResolver.resolveWeeklyOffStatus(dateObj, weekOffPolicy);
        if (weekOffStatus?.isOff) {
            overrides.isWeeklyOff = true;
            overrides.weekly_off = true;
        }
    }

    return overrides;
}

// --- CONTROLLERS ---

/**
 * Record a punch (IN/OUT) with multi-level rule validation
 */
export const punch = async (req, res) => {
    try {
        let user = req.user;
        const { type, location, employee_id: target_employee_id } = req.body;

        // --- NEW: Multi-Actor Punch Support (Admin/HOD can punch for others) ---
        if (target_employee_id && (req.user.role === 'ADMIN' || req.user.role === 'HOD')) {
            const targetUser = await User.findById(target_employee_id);
            if (!targetUser) return res.status(404).json({ message: 'Target employee not found' });
            
            // Security: Ensure the actor has access to this target user (same company)
            if (targetUser.company_id.toString() !== req.user.company_id.toString()) {
                return res.status(403).json({ message: 'Forbidden: Access across companies denied' });
            }
            
            // Additional check for HOD: Employee must be in their team
            if (req.user.role === 'HOD') {
                const hodTeams = await TeamModel.find({ 
                    hodId: req.user._id,
                    isActive: { $ne: false }
                });
                
                let isInTeam = false;
                const targetUserIdStr = targetUser._id.toString();
                
                for (const team of hodTeams) {
                    if (team.members && Array.isArray(team.members)) {
                        const isMember = team.members.some(m => 
                            m.userId && m.userId.toString() === targetUserIdStr
                        );
                        if (isMember) {
                            isInTeam = true;
                            break;
                        }
                    }
                }
                
                if (!isInTeam) {
                    return res.status(403).json({ message: 'Forbidden: Employee is not in your team' });
                }
            }
            
            user = targetUser; // Act on behalf of target employee
        }

        // Handle both possible field names from different frontend versions
        let deviceType = (req.body.deviceType || req.body.method || 'web').toLowerCase();
        const ip = req.ip || req.connection.remoteAddress;

        if (!['IN', 'OUT'].includes(type)) {
            return res.status(400).json({ message: 'Invalid punch type' });
        }

        // 1. Fetch Company for rules & timezone
        const company = await Company.findById(user.company_id);
        if (!company) return res.status(404).json({ message: 'Company not found' });

        const tz = company.timezone || 'Asia/Kolkata';
        const now = moment().tz(tz);
        const today = now.format('YYYY-MM-DD');
        const todayDate = moment.utc(today).startOf('day').toDate();
        const yearMonth = today.substring(0, 7);

        // 2. Rule: Check Attendance Lock
        if (await PayrollEngine.isLocked(company, yearMonth)) {
            return res.status(403).json({ message: 'Attendance for this month is locked.' });
        }

        // 3. Rule: Security Validations (Geo-Fencing, IP, Device)
        const validation = ValidationEngine.validatePunch(user, company, { ip, location, deviceType });
        if (!validation.isValid) {
            return res.status(403).json({ message: validation.message });
        }

        // 4. Punch Logic (Intelligent detection of session state using ActiveSession)
        const activeSession = await ActiveSession.findOne({
            employee_id: user._id,
            session_date: todayDate,
            session_status: 'active'
        });

        if (type === 'IN' && activeSession) {
            return res.status(400).json({ 
                message: 'Active session exists. Punch OUT first.', 
                active_since: activeSession.punch_in_time 
            });
        }
        if (type === 'OUT' && !activeSession) {
            return res.status(400).json({ message: 'No active IN session found.' });
        }

        // 5. Save Punch
        const punch = new AttendancePunch({
            employee_id: user._id,
            company_id: user.company_id,
            punch_type: type,
            punch_time: now.toDate(),
            punch_date: today,
            punch_method: deviceType || 'web'
        });
        await punch.save();

        // 5a. Manage ActiveSession Lifecycle
        if (type === 'IN') {
            // Create new session on IN punch
            const newSession = new ActiveSession({
                employee_id: user._id,
                company_id: user.company_id,
                shift_id: user.shift_id,
                punch_in_time: now.toDate(),
                punch_in_entry_id: punch._id,
                session_date: todayDate,
                session_status: 'active',
                expected_out_time: moment(now).add(12, 'hours').toDate() // Reasonable timeout
            });
            await newSession.save();
        } else if (type === 'OUT' && activeSession) {
            // Close session on OUT punch
            await ActiveSession.findByIdAndUpdate(activeSession._id, {
                session_status: 'closed',
                punch_out_entry_id: punch._id,
                punch_out_time: now.toDate()
            });
        }

        // 6. Rule-Driven Processing
        await processDailyAttendance(user, today);

        // 7. SYNC User Profile State for Real-Time UI (NOT raw data, just status)
        await User.findByIdAndUpdate(user._id, {
            current_status: type === 'IN' ? 'in_office' : 'out_office',
            last_punch_type: type,
            last_punch_date: now.toDate()
        });

        res.json({ message: `Punch ${type} recorded successfully`, time: now.toDate() });
    } catch (err) {
        console.error('Punch Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const requestRegularization = async (req, res) => {
    try {
        const user = req.user;
        const { date, type, in_time, out_time, reason } = req.body;

        if (!date || !reason) {
            return res.status(400).json({ message: 'Date and reason are required' });
        }

        const existing = await RegularizationRequest.findOne({
            employee_id: user._id,
            attendance_date: date,
            status: 'pending'
        });
        if (existing) return res.status(400).json({ message: "Pending request already exists" });

        let requestedInTime = in_time ? new Date(`${date}T${in_time}:00`) : null;
        let requestedOutTime = out_time ? new Date(`${date}T${out_time}:00`) : null;

        const newRequest = new RegularizationRequest({
            employee_id: user._id,
            company_id: user.company_id,
            department_id: user.department_id,
            attendance_date: date,
            regularization_type: type,
            requested_in_time: requestedInTime,
            requested_out_time: requestedOutTime,
            reason: reason,
            status: 'pending',
            request_number: `REG-${Date.now()}-${user._id.toString().slice(-4)}`  // ADD THIS
        });

        await newRequest.save();
        res.json({ message: 'Regularization request submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const cancelRegularization = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id;

        const request = await RegularizationRequest.findOne({
            _id: id,
            employee_id: userId,
            status: 'pending'
        });

        if (!request) {
            return res.status(404).json({ message: 'Pending request not found' });
        }

        await request.deleteOne();
        await logActivity(req, 'ATTENDANCE', 'CANCEL_REGULARIZATION', `Cancelled regularization ${id}`, { request_id: id });

        res.json({ success: true, message: 'Regularization request cancelled' });
    } catch (err) {
        console.error('Cancel Regularization Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Employee Dashboard
export const getDashboardData = async (req, res) => {
    try {
        let user = req.user;
        const { employee_id: target_employee_id } = req.query;

        // Admin/HOD can view dashboard for any employee in their company
        if (target_employee_id && (req.user.role === 'ADMIN' || req.user.role === 'HOD')) {
            const targetUser = await User.findById(target_employee_id);
            if (targetUser && targetUser.company_id.toString() === req.user.company_id.toString()) {
                user = targetUser;
            }
        }
        const company = await Company.findById(user.company_id);
        const tz = company?.timezone || 'Asia/Kolkata';
        const now = moment().tz(tz);
        const today = now.format('YYYY-MM-DD');
        const queryMonth = req.query.month ? parseInt(req.query.month) : (now.month() + 1);
        const queryYear = req.query.year ? parseInt(req.query.year) : now.year();
        const currentYearMonth = `${queryYear}-${String(queryMonth).padStart(2, '0')}`;
        const companyId = company?._id || user.company_id;

        // 1. Process/Fetch Today's Record
        let todayRecord;
        try {
            todayRecord = await processDailyAttendance(user, today);
        } catch (e) {
            const attendanceDate = moment.utc(today).startOf('day').toDate();
            todayRecord = await AttendanceRecord.findOne({ employee_id: user._id, attendance_date: attendanceDate });
        }

        const punches = await AttendancePunch.find({ employee_id: user._id, punch_date: today }).sort({ punch_time: 1 });
        const lastPunch = punches[punches.length - 1];

        // 2. Check for active session
        const activeSession = await ActiveSession.findOne({
            employee_id: user._id,
            session_date: moment.utc(today).startOf('day').toDate(),
            session_status: 'active'
        });

        const isInSession = !!activeSession;

        let punchStatus = {
            status: isInSession ? 'Checked In' : 'Not Checked In',
            time: null,
            workHours: '0h 0m',
            action: isInSession ? 'OUT' : 'IN',
            date: today,
            todayPunches: punches.map(p => ({ id: p._id, type: p.punch_type, punch_time: p.punch_time, method: p.punch_method }))
        };

        if (lastPunch || todayRecord?.first_in || isInSession) {
            const firstInTime = todayRecord?.first_in || punches.find(p => p.punch_type === 'IN')?.punch_time || (activeSession ? activeSession.punch_in_time : null);
            const lastOutTime = todayRecord?.last_out || (punches[punches.length - 1]?.punch_type === 'OUT' ? punches[punches.length - 1].punch_time : null);

            punchStatus.firstIn = firstInTime;
            punchStatus.lastOut = lastOutTime;
            // status/action already set above based on isInSession
            punchStatus.sessionStartTime = (punchStatus.status === 'Checked In') ? (lastPunch?.punch_time || firstInTime) : null;

            let hours = todayRecord?.total_work_hours || 0;
            if (punchStatus.status === 'Checked In' && punchStatus.sessionStartTime) {
                hours += (Date.now() - new Date(punchStatus.sessionStartTime)) / (1000 * 3600);
            }
            const h = Math.floor(hours), m = Math.floor((hours % 1) * 60);
            punchStatus.workHours = `${h}h ${m}m 0s`;
        }

        // 3. Shift Details
        const shift = await PolicyResolver.resolveShift(user);
        if (shift) {
            punchStatus.shiftName = shift.name || shift.shift_name;
            punchStatus.shiftTime = `${shift.start_time} – ${shift.end_time}`;
            punchStatus.shiftEndTime = shift.end_time;
            const weekOffPolicy = await PolicyResolver.resolveWeekOffPolicy(user);
            punchStatus.weeklyOffDays = getWeeklyOffDaysFromPolicy(weekOffPolicy);
        }

        // 4. Personal Month Stats
        const monthRecs = await AttendanceRecord.find({ employee_id: user._id, year_month: currentYearMonth });
        let pCount = 0, aCount = 0, lCount = 0, ltCount = 0, totalHrs = 0;
        monthRecs.forEach(r => {
            if (['present', 'late', 'half_day'].includes(r.status)) pCount++;
            if (r.status === 'absent') aCount++;
            if (r.status === 'leave') lCount++;
            if (r.is_late) ltCount++;
            totalHrs += (r.total_work_hours || 0);
        });

        const monthStats = {
            present: pCount,
            absent: aCount,
            leaves: lCount,
            late: ltCount,
            totalHours: totalHrs
        };

        // 5. MANAGEMENT SNAPSHOT (The Solution for HOD/Admin)
        let mgmtSnapshot = null;
        if (user.role === 'ADMIN' || user.role === 'HOD') {
            const query = { company_id: companyId, attendance_date: today };
            if (user.role === 'HOD') query.department_id = user.department_id;

            const pendingLeaveFilter = {
                company_id: companyId,
                approval_status: {
                    $in: user.role === 'HOD' ? HOD_PENDING_LEAVE_STATUSES : ADMIN_PENDING_LEAVE_STATUSES
                }
            };
            if (user.role === 'HOD' && user.department_id) {
                pendingLeaveFilter.department_id = user.department_id;
            }

            const [todayRecs, pendingLeaves, pendingRegs] = await Promise.all([
                AttendanceRecord.find(query),
                LeaveApplication.countDocuments(pendingLeaveFilter),
                RegularizationRequest.countDocuments({ company_id: companyId, status: 'pending' })
            ]);

            mgmtSnapshot = {
                present: todayRecs.filter(r => ['present', 'late', 'half_day'].includes(r.status)).length,
                absent: todayRecs.filter(r => r.status === 'absent').length,
                late: todayRecs.filter(r => r.is_late).length,
                onLeave: todayRecs.filter(r => r.status === 'leave').length,
                pendingApprovals: pendingLeaves + pendingRegs
            };
        }

        // 6. Calendar & Holidays
        const calendarRecords = await AttendanceRecord.find({ employee_id: user._id, year_month: currentYearMonth });
        const monthStartUTC = moment.utc(`${currentYearMonth}-01`).startOf('month').toDate();
        const monthEndUTC = moment.utc(`${currentYearMonth}-01`).endOf('month').toDate();
        const holidays = await Holiday.find({ company_id: companyId, holiday_date: { $gte: monthStartUTC, $lte: monthEndUTC } });

        const calendarMap = {};
        calendarRecords.forEach(r => {
            const d = moment.utc(r.attendance_date).format('YYYY-MM-DD');
            calendarMap[d] = {
                date: d,
                status: r.status,
                hours: r.total_work_hours,
                isLate: r.is_late,
                inTime: r.first_in,
                outTime: r.last_out,
                is_half_day: r.is_half_day || r.status === 'half_day',
                half_day_session: r.half_day_session
            };
        });
        holidays.forEach(h => {
            const d = moment.utc(h.holiday_date).format('YYYY-MM-DD');
            if (!calendarMap[d]) calendarMap[d] = { date: d, status: 'holiday', hours: 0 };
        });

        // Fetch shift and week-off for the month
        const weekOffPolicy = await PolicyResolver.resolveWeekOffPolicy(user);
        const weeklyOffDays = getWeeklyOffDaysFromPolicy(weekOffPolicy);

        const daysInMonth = moment.utc(`${currentYearMonth}-01`).daysInMonth();

        // 7. Fetch Approved Leaves for the month to show on calendar
        const approvedLeaves = await LeaveApplication.find({
            employee_id: user._id,
            approval_status: 'approved',
            from_date: { $lte: monthEndUTC },
            to_date: { $gte: monthStartUTC }
        });

        approvedLeaves.forEach(leave => {
            let curr = moment.utc(leave.from_date);
            let end = moment.utc(leave.to_date);
            while (curr.isSameOrBefore(end, 'day')) {
                const dateStr = curr.format('YYYY-MM-DD');
                if (dateStr.startsWith(currentYearMonth)) {
                    if (!calendarMap[dateStr] || ['absent', 'weekly_off'].includes(calendarMap[dateStr].status)) {
                        const hasRecord = !!calendarMap[dateStr];
                        calendarMap[dateStr] = {
                            date: dateStr,
                            status: (leave.is_half_day && !hasRecord) ? 'absent' : (leave.is_half_day ? 'half_day' : 'leave'),
                            hours: 0,
                            isLate: false,
                            leaveType: leave.leave_type,
                            is_half_day: leave.is_half_day,
                            half_day_session: leave.half_day_session
                        };
                    }
                }
                curr.add(1, 'days');
            }
        });

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${currentYearMonth}-${String(i).padStart(2, '0')}`;
            if (!calendarMap[dateStr]) {
                const weekOffStatus = PolicyResolver.resolveWeeklyOffStatus(dateStr, weekOffPolicy);
                if (weekOffStatus?.isOff || weeklyOffDays.includes(moment.utc(dateStr).day())) {
                    calendarMap[dateStr] = {
                        date: dateStr,
                        status: 'weekly_off',
                        hours: 0,
                        isLate: false,
                        isEarlyExit: false,
                        lateByMinutes: 0
                    };
                }
            }
        }

        // Convert Map to Array
        const calendar = Object.values(calendarMap);



        // --- CALENDAR LOGIC END ---

        const pendingActions = [];
        const incompleteRecords = await AttendanceRecord.find({
            employee_id: user._id,
            attendance_date: { $lt: today },
            first_in: { $ne: null },
            last_out: null
        });

        // Trigger auto-punch for past missed outs
        for (const rec of incompleteRecords) {
            const recDate = moment(rec.attendance_date).format('YYYY-MM-DD');
            await processDailyAttendance(user, recDate);
        }

        incompleteRecords.forEach(rec => {
            pendingActions.push({
                type: 'regularization',
                text: `Regularize ${moment(rec.attendance_date).format('DD-MMM')} attendance (Missing OUT)`,
                date: rec.attendance_date,
                id: rec._id
            });
        });
        const pendingLeaves = await LeaveApplication.find({
            employee_id: user._id,
            approval_status: { $in: NON_FINAL_LEAVE_STATUSES }
        });
        pendingLeaves.forEach(leave => {
            pendingActions.push({
                type: 'leave_application',
                text: `Leave application pending approval (${moment(leave.from_date).format('DD-MMM')})`,
                id: leave._id
            });
        });

        const recent = await AttendanceRecord.find({ employee_id: user._id })
            .sort({ attendance_date: -1 })
            .limit(5)
            .select('attendance_date first_in last_out total_work_hours status is_late late_by_minutes');

        const recentFormatted = recent.map(rec => {
            const h = Math.floor(rec.total_work_hours || 0);
            const m = Math.floor(((rec.total_work_hours || 0) - h) * 60);
            return {
                date: rec.attendance_date,
                inTime: rec.first_in,
                outTime: rec.last_out,
                hours: `${h}h ${m}m`,
                status: rec.status,
                isLate: rec.is_late,
                isEarlyExit: rec.is_early_exit,
                lateByMinutes: rec.late_by_minutes
            };
        });

        // Fetch Real Team Members (Same Department)
        let teamMembers = [];
        if (user.department_id) {
            teamMembers = await User.find({
                company_id: companyId,
                department_id: user.department_id,
                _id: { $ne: user._id }, // Exclude self
                isActive: true
            })
                .select('first_name last_name username designation')
                .limit(4);
        } else {
            // Fallback: Colleagues from same company
            teamMembers = await User.find({
                company_id: companyId,
                role: 'EMPLOYEE',
                _id: { $ne: user._id },
                isActive: true
            })
                .select('first_name last_name username designation')
                .limit(4);
        }

        // Get status for these team members for TODAY
        const teamMemberIds = teamMembers.map(m => m._id);
        const teamAttendance = await AttendanceRecord.find({
            employee_id: { $in: teamMemberIds },
            attendance_date: today
        });

        const formattedTeam = teamMembers.map(member => {
            const record = teamAttendance.find(r => r.employee_id.toString() === member._id.toString());
            let status = 'Absent'; // Default
            if (record) {
                if (record.status === 'present') status = 'Present';
                else if (record.status === 'half_day') status = 'Half Day';
                else if (record.status === 'leave') status = 'On Leave';
                else if (record.status === 'absent') status = 'Absent';
            }

            return {
                name: member.first_name ? `${member.first_name} ${member.last_name || ''}`.trim() : member.username,
                role: member.designation || 'Team Member',
                status: status,
                avatar: (member.first_name?.[0] || member.username?.[0] || '?').toUpperCase() + (member.last_name?.[0] || '')
            };
        });

        // Fetch Upcoming Holidays (Next 5)
        const holidaySearchDate = moment.utc().startOf('day').toDate();
        const objCompanyId = new mongoose.Types.ObjectId(companyId);

        const upcomingHolidays = await Holiday.find({
            company_id: objCompanyId,
            holiday_date: { $gte: holidaySearchDate }
        }).sort({ holiday_date: 1 }).limit(5);

        // Fetch holidays within the NEXT 7 DAYS for the reminder system
        const reminderStart = now.clone().add(1, 'day').startOf('day');  // Tomorrow
        const reminderEnd = now.clone().add(7, 'days').endOf('day');     // 7 days out
        const reminderHolidaysRaw = await Holiday.find({
            company_id: objCompanyId,
            holiday_date: { $gte: reminderStart.toDate(), $lte: reminderEnd.toDate() }
        }).sort({ holiday_date: 1 });

        const formattedReminderHolidays = reminderHolidaysRaw.map(h => {
            const hDate = moment(h.holiday_date).startOf('day');
            const daysUntil = hDate.diff(now.clone().startOf('day'), 'days');
            return {
                id: h._id,
                holiday_name: h.holiday_name,
                holiday_date: h.holiday_date,
                holiday_type: h.holiday_type,
                dayName: hDate.format('dddd'),
                formattedDate: hDate.format('DD MMM YYYY'),
                daysUntil: daysUntil
            };
        });

        // Role-specific context for holiday reminders
        let holidayRoleContext = { role: user.role };
        if (user.role === 'HOD') {
            const deptPendingLeaves = await LeaveApplication.countDocuments({
                company_id: companyId,
                department_id: user.department_id,
                approval_status: { $in: HOD_PENDING_LEAVE_STATUSES }
            });
            const deptPendingRegs = await RegularizationRequest.countDocuments({
                company_id: companyId,
                department_id: user.department_id,
                status: 'pending'
            });
            holidayRoleContext.pendingLeaveCount = deptPendingLeaves;
            holidayRoleContext.pendingRegCount = deptPendingRegs;
            holidayRoleContext.totalPending = deptPendingLeaves + deptPendingRegs;
        } else if (user.role === 'ADMIN') {
            const compPendingLeaves = await LeaveApplication.countDocuments({
                company_id: companyId,
                approval_status: { $in: ADMIN_PENDING_LEAVE_STATUSES }
            });
            const totalActiveEmps = await User.countDocuments({
                company_id: companyId,
                role: { $ne: 'ADMIN' },
                isActive: true
            });
            holidayRoleContext.pendingLeaveCount = compPendingLeaves;
            holidayRoleContext.totalEmployees = totalActiveEmps;
        }

        // Fetch Detailed Pending Leaves (Ensure all pending are shown)
        const pendingLeafRequests = await LeaveApplication.find({
            employee_id: user._id,
            approval_status: { $in: NON_FINAL_LEAVE_STATUSES }
        }).sort({ from_date: 1 });

        const formattedPendingLeaves = pendingLeafRequests.map(leave => ({
            id: leave._id,
            leave_type: leave.leave_type,
            from_date: leave.from_date,
            to_date: leave.to_date,
            total_days: leave.total_days,
            status: leave.approval_status
        }));

        const formattedUpcomingHolidays = upcomingHolidays.map(h => ({
            id: h._id,
            holiday_name: h.holiday_name,
            holiday_date: h.holiday_date,
            holiday_type: h.holiday_type
        }));

        res.json({
            punchStatus,
            monthStats: monthStats || {},
            calendar: calendarMap,
            mgmtSnapshot,
            upcomingHolidays: formattedUpcomingHolidays,
            holidayReminders: formattedReminderHolidays,
            holidayRoleContext: holidayRoleContext,
            pendingLeaves: formattedPendingLeaves
        });
    } catch (err) {
        console.error('>>> [DASHBOARD_ERROR]', err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
};

export const getHistory = async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const baseFilters = { company_id: companyId };

        // Disable caching for this sensitive route
        res.set('Cache-Control', 'no-store');

        // Data Isolation:
        if (req.user.role === 'EMPLOYEE') {
            baseFilters.employee_id = req.user._id?._id || req.user._id;
        } else if (req.user.role === 'HOD') {
            const teamMemberIds = await getHodTeamMemberIds(req.user._id);
            if (teamMemberIds.length === 0) {
                return res.json({ data: [], total: 0 });
            }
            baseFilters.employee_id = { $in: teamMemberIds };
        }

        const { designation } = req.query;
        if (designation && designation !== 'all') {
            const userSubQuery = { company_id: companyId, designation };
            if (baseFilters.employee_id?.$in?.length) {
                userSubQuery._id = { $in: baseFilters.employee_id.$in };
            }

            const matchedUsers = await User.find(userSubQuery).select('_id');
            baseFilters.employee_id = { $in: matchedUsers.map(u => u._id) };
        }

        const result = await QueryBuilder.build(
            AttendanceRecord,
            req.query,
            baseFilters,
            ['attendance_date', 'status'],
            ['employee_id']
        );

        // --- NEW: Merge Holidays for History View ---
        // Only if we have a date range and viewing a specific employee or small enough subset
        const { startDate, endDate, employee_id } = req.query;
        if (startDate && endDate && (employee_id || req.user.role === 'EMPLOYEE')) {
            const holidays = await Holiday.find({
                company_id: companyId,
                holiday_date: { 
                    $gte: moment.utc(startDate).startOf('day').toDate(), 
                    $lte: moment.utc(endDate).endOf('day').toDate() 
                }
            });

            if (holidays.length > 0) {
                const existingDates = new Set(result.data.map(r => moment.utc(r.attendance_date).format('YYYY-MM-DD')));
                
                holidays.forEach(h => {
                    const hDateStr = moment.utc(h.holiday_date).format('YYYY-MM-DD');
                    if (!existingDates.has(hDateStr)) {
                        result.data.push({
                            attendance_date: h.holiday_date,
                            status: 'holiday',
                            holiday_name: h.holiday_name,
                            is_virtual: true // Marker for frontend
                        });
                    }
                });
                
                // Re-sort data
                result.data.sort((a, b) => new Date(b.attendance_date) - new Date(a.attendance_date));
            }
        }

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getRegularizations = async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const baseFilters = { company_id: companyId };

        // Data Isolation:
        if (req.user.role === 'EMPLOYEE') {
            baseFilters.employee_id = req.user._id?._id || req.user._id;
        } else if (req.user.role === 'HOD') {
            const teamMemberIds = await getHodTeamMemberIds(req.user._id);
            if (teamMemberIds.length === 0) {
                return res.json({ data: [], total: 0 });
            }
            baseFilters.employee_id = { $in: teamMemberIds };
        }

        const result = await QueryBuilder.build(
            RegularizationRequest,
            req.query,
            baseFilters,
            ['attendance_date', 'reason'],
            ['employee_id']
        );
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAdminDashboardData = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admins can access admin dashboard' });
        }
        const companyId = resolveCompanyId(req);
        if (!companyId) {
            return res.status(400).json({ message: 'Unable to resolve company. Please select a company and try again.' });
        }
        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(400).json({ message: `Company not found for id: ${companyId}. Please select a valid company.` });
        }
        const tz = 'Asia/Kolkata'; // Standardizing for this business
        const istNow = moment().tz(tz);
        const todayStr = istNow.format('YYYY-MM-DD');
        const todayStart = istNow.clone().startOf('day').toDate();
        const todayEnd = istNow.clone().endOf('day').toDate();

        const activeEmployeeQuery = {
            company_id: companyId,
            role: { $nin: ['ADMIN', 'Admin'] },
            isActive: true
        };

        const employeeIds = await User.find(activeEmployeeQuery).select('_id').lean();
        const empIdList = employeeIds.map((e) => e._id);
        const activeEmployeeIdSet = new Set(empIdList.map((id) => id.toString()));
        const totalEmployees = activeEmployeeIdSet.size;

        const [presentRecs, activeLeaves] = await Promise.all([
            AttendanceRecord.find({
                company_id: companyId,
                attendance_date: { $gte: todayStart, $lte: todayEnd },
                employee_id: { $in: empIdList },
                status: { $in: ['present', 'half_day'] }
            }).select('employee_id'),
            LeaveApplication.find({
                company_id: companyId,
                approval_status: 'approved',
                employee_id: { $in: empIdList },
                from_date: { $lte: todayEnd },
                to_date: { $gte: todayStart }
            }).select('employee_id')
        ]);

        const presentUserIds = [...new Set(presentRecs.map((r) => r.employee_id.toString()))]
            .filter((id) => activeEmployeeIdSet.has(id));
        const onLeaveUserIds = [...new Set(activeLeaves.map((r) => r.employee_id.toString()))]
            .filter((id) => activeEmployeeIdSet.has(id));
        const presentToday = presentUserIds.length;
        const onLeaveToday = onLeaveUserIds.length;

        // USE SETS TO PREVENT DOUBLE-COUNTING (Accounted = Present OR On Leave)
        const accountedIds = new Set([...presentUserIds, ...onLeaveUserIds]);
        const absentEmployeeIds = Array.from(activeEmployeeIdSet).filter((id) => !accountedIds.has(id));
        const accountedObjectIds = Array.from(accountedIds)
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));
        const absentObjectIds = absentEmployeeIds
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));
        const absentToday = absentEmployeeIds.length;

        const halfDayToday = await AttendanceRecord.countDocuments({
            company_id: companyId,
            attendance_date: { $gte: todayStart, $lte: todayEnd },
            employee_id: { $in: empIdList },
            status: 'half_day'
        });

        const lateToday = await AttendanceRecord.countDocuments({
            company_id: companyId,
            attendance_date: { $gte: todayStart, $lte: todayEnd },
            employee_id: { $in: empIdList },
            is_late: true
        });

        const deptPerformance = [];

        const pendingRegsCount = await RegularizationRequest.countDocuments({
            company_id: companyId,
            status: 'pending',
            employee_id: { $in: empIdList }
        });
        const pendingLeavesCount = await LeaveApplication.countDocuments({
            company_id: companyId,
            approval_status: { $in: NON_FINAL_LEAVE_STATUSES },
            employee_id: { $in: empIdList }
        });

        const alerts = [];
        if (pendingRegsCount > 0) {
            alerts.push({ type: 'warning', message: `${pendingRegsCount} regularization requests pending approval`, time: 'Action required' });
        }
        if (pendingLeavesCount > 0) {
            alerts.push({ type: 'info', message: `${pendingLeavesCount} leave applications pending approval`, time: 'Review needed' });
        }

        const recentActivityLogs = await ActivityLog.find({ company_id: companyId })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('user_id', 'first_name last_name username');

        const activity = recentActivityLogs.map(log => {
            const userName = log.user_id
                ? `${log.user_id.first_name || ''} ${log.user_id.last_name || ''}`.trim() || log.user_id.username
                : 'System';

            return {
                title: log.details || `${log.module} ${log.action}`,
                meta: `By ${userName}`,
                time: moment(log.createdAt).fromNow(),
                module: log.module
            };
        });

        // 5. Advanced Detailed Lists for Executive UI
        // To get REAL-TIME absentees, we find all active users and subtract those who are PRESENT today
        // Already fetched above...

        const [absentList, lateList, pLeaves, pRegs] = await Promise.all([
            User.find({
                ...activeEmployeeQuery,
                _id: { $in: absentObjectIds }
            })
                .limit(50),

            // Late arrivals (those with record but marked late)
            AttendanceRecord.find({
                company_id: companyId,
                attendance_date: { $gte: todayStart, $lte: todayEnd },
                employee_id: { $in: empIdList },
                is_late: true
            }).limit(10).populate('employee_id', 'first_name last_name username'),

            // Pending Leaves
            LeaveApplication.find({
                company_id: companyId,
                approval_status: { $in: NON_FINAL_LEAVE_STATUSES },
                employee_id: { $in: empIdList }
            })
                .sort({ from_date: 1 }).limit(10)
                .populate('employee_id', 'first_name last_name username'),

            // Pending Regularizations
            RegularizationRequest.find({
                company_id: companyId,
                status: 'pending',
                employee_id: { $in: empIdList }
            })
                .sort({ attendance_date: 1 }).limit(10)
                .populate('employee_id', 'first_name last_name username'),
        ]);

        const formatListRec = (recs, kind) => recs.map(r => {
            const isRec = r.employee_id !== undefined || r.attendance_date !== undefined;
            const emp = isRec ? r.employee_id : r;
            const empIdStr = (emp?._id || r._id).toString();

            let status = kind === 'absent' ? 'absent' : (r.status || 'present');
            if (kind === 'absent' && onLeaveUserIds.includes(empIdStr)) {
                status = 'leave';
            }

            return {
                id: r._id,
                employee_id: empIdStr,
                name: emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.username : 'Unknown',
                status: status,
                first_in: r.first_in,
                late_by: r.late_by_minutes
            };
        });

        const formatAppRec = (recs, kind) => recs.map(r => ({
            id: r._id,
            employee_id: r.employee_id?._id || null,
            employeeName: r.employee_id ? `${r.employee_id.first_name || ''} ${r.employee_id.last_name || ''}`.trim() : 'Unknown',
            leaveType: r.leave_type || r.policy_name || (kind === 'reg' ? 'Regularization' : 'Leave'),
            date: r.attendance_date || r.from_date,
        }));        // FETCH UPCOMING HOLIDAYS (ALL UPCOMING - NEXT 5)
        const allUpcomingRaw = await Holiday.find({
            company_id: companyId,
            holiday_date: { $gte: istNow.clone().startOf('day').toDate() }
        }).sort({ holiday_date: 1 }).limit(5);

        const upcomingHolidays = allUpcomingRaw.map(h => ({
            id: h._id,
            holiday_name: h.holiday_name,
            holiday_date: h.holiday_date,
            holiday_type: h.holiday_type,
            dayName: moment(h.holiday_date).format('dddd'),
            formattedDate: moment(h.holiday_date).format('DD MMM YYYY'),
            daysUntil: moment(h.holiday_date).startOf('day').diff(istNow.clone().startOf('day'), 'days')
        }));

        // REMINDERS ONLY (NEXT 7 DAYS) - FOR THE BANNER
        const holidayReminders = upcomingHolidays.filter(h => h.daysUntil <= 7);

        res.json({
            success: true,
            data: {
                stats: {
                    total: totalEmployees,
                    present: presentToday,
                    absent: absentToday,
                    onLeave: onLeaveToday,
                    halfDay: halfDayToday,
                    late: lateToday,
                    trends: { present: 0, absent: 0 }
                },
                departments: deptPerformance,
                absentToday: formatListRec(absentList, 'absent'),
                lateToday: formatListRec(lateList, 'late'),
                pendingLeaves: formatAppRec(pLeaves, 'leave'),
                pendingRegularization: formatAppRec(pRegs, 'reg'),
                alerts: alerts,
                activity: activity,
                holidayReminders,
                upcomingHolidays,
                holidayRoleContext: {
                    role: 'ADMIN',
                    totalEmployees: totalEmployees,
                    pendingLeaveCount: pendingLeavesCount
                },
                timestamp: new Date()
            }
        });

    } catch (err) {
        console.error('Admin Dashboard Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const lockMonthAttendance = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admins can lock attendance' });
        }
        const { year_month } = req.body;
        const companyId = resolveCompanyId(req);

        if (!year_month) {
            return res.status(400).json({ message: 'Month is required' });
        }

        const result = await AttendanceRecord.updateMany(
            { company_id: companyId, year_month: year_month },
            {
                $set: {
                    is_locked: true,
                    locked_at: new Date(),
                    locked_by: req.user._id
                }
            }
        );

        res.json({
            success: true,
            message: `Locked ${result.modifiedCount} records for ${year_month}`,
            count: result.modifiedCount
        });
    } catch (err) {
        console.error('Lock Attendance Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getPayrollData = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admins can view payroll data' });
        }
        const { month, year } = req.query;
        const companyId = resolveCompanyId(req);

        // Fix: Provide defaults and ensure month is string for padStart
        const targetMonth = month || (moment().month() + 1).toString();
        const targetYear = year || moment().year().toString();
        const yearMonth = `${targetYear}-${targetMonth.toString().padStart(2, '0')}`;

        const isAdmin = req.user.role === 'ADMIN';

        const company = await Company.findById(companyId);
        if (!company) return res.status(404).json({ message: 'Company not found' });

        const employees = await User.find({ company_id: companyId, role: 'EMPLOYEE', isActive: true })
            .select('first_name last_name username employee_code department department_id shift_id joining_date employment_type monthly_salary')
            .populate('department_id')
            .populate('shift_id');

        const payrollData = await Promise.all(employees.map(async (emp) => {
            const result = await PayrollEngine.calculatePayableDays(emp, company, yearMonth);
            const warnings = await PayrollEngine.getValidationWarnings(emp._id, companyId, yearMonth);

            const employeeName = (emp.first_name || emp.last_name)
                ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
                : (emp.username || 'Unknown Employee');

            const deptName = (emp.department_id && emp.department_id.department_name)
                ? emp.department_id.department_name
                : (emp.department || 'General');

            const data = {
                id: emp._id,
                name: employeeName,
                code: emp.employee_code || '---',
                department: deptName,
                employment_type: emp.employment_type || 'Full Time',
                stats: {
                    totalWorkingDays: result.summary.totalWorkingDays,
                    present: result.stats.present,
                    absent: result.stats.absent,
                    leave: result.stats.leave,
                    halfDay: result.stats.halfDay,
                    weeklyOffs: result.summary.weeklyOffs,
                    holidays: result.summary.holidays,
                    workHours: result.stats.workHours.toFixed(1),
                    payableDays: result.stats.payableDays,
                    lopDays: result.stats.lopDays,
                    overtimeHours: result.stats.overtimeHours.toFixed(1)
                },
                warnings: warnings
            };

            if (isAdmin) {
                data.salary = {
                    monthlyBase: result.salary.monthlyBase,
                    perDay: result.salary.perDay,
                    lopDeduction: result.salary.lopDeduction,
                    overtimePay: result.salary.overtimePay,
                    final: result.salary.final
                };
            }

            return data;
        }));

        res.json({ success: true, data: payrollData, isLocked: await PayrollEngine.isLocked(company, yearMonth) });
    } catch (err) {
        console.error('Payroll Export Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getMyTodayAttendance = async (req, res) => {
    try {
        const user = req.user;
        const tz = req.company?.timezone || 'Asia/Kolkata'; // Try use company from middleware if env allows
        const now = moment().tz(tz);
        const todayStr = now.format('YYYY-MM-DD');
        const todayDate = moment.utc(todayStr).startOf('day').toDate();

        const record = await AttendanceRecord.findOne({
            employee_id: user._id,
            attendance_date: moment.utc(todayStr).toDate()
        });

        const activeSession = await ActiveSession.findOne({
            employee_id: user._id,
            session_date: todayDate,
            session_status: 'active'
        });
        const isInSession = !!activeSession;

        res.json({
            ...(record?.toJSON() || {}),
            isInSession: !!isInSession,
            consolidatedStatus: isInSession ? 'IN' : 'OUT'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getPayrollLocks = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admins can view payroll locks' });
        }
        const companyId = resolveCompanyId(req);
        const result = await QueryBuilder.build(
            PayrollLock,
            req.query,
            { company_id: companyId },
            ['year_month'],
            ['locked_by']
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const togglePayrollLock = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admins can toggle payroll locks' });
        }
        const { year_month, is_locked } = req.body;
        const companyId = resolveCompanyId(req);

        const lock = await PayrollLock.findOneAndUpdate(
            { company_id: companyId, year_month },
            {
                is_locked,
                locked_by: req.user._id,
                locked_at: new Date(),
                reason: is_locked ? 'Manual Admin Lock' : 'Manual Admin Unlock'
            },
            { upsert: true, returnDocument: 'after' }
        );

        await logActivity(req, 'LOCK', is_locked ? 'LOCK_MONTH' : 'UNLOCK_MONTH', `${is_locked ? 'Locked' : 'Unlocked'} payroll for ${year_month}`);
        res.json({ success: true, lock });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getAdminAttendanceReport = async (req, res) => {
    try {
        const { startDate, endDate, departmentId } = req.query;
        const companyId = resolveCompanyId(req);
        
        console.log(`[Admin Report Test] Request by ${req.user?._id} Role: ${req.user?.role} CompanyId: ${companyId}`);


        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'startDate and endDate are required' });
        }

        // Guard: companyId must be resolvable
        if (!companyId) {
            return res.status(400).json({ message: 'Unable to resolve company. Please select a company and try again.' });
        }

        const start = moment(startDate).startOf('day').toDate();
        const end = moment(endDate).endOf('day').toDate();

        // 1. Build Query
        const normalizedCompanyId = String(companyId).trim();
        
        const userQuery = {
            isActive: true
        };
        if (normalizedCompanyId !== 'all') {
            userQuery.company_id = companyId;
        }

        const { designation } = req.query;

        // Admin sees all staff in the company.
       
        if (designation && designation !== 'all') {
            userQuery.designation = designation;
        }
        if (departmentId && departmentId !== 'all') {
            userQuery.department_id = departmentId;
        }

        const employees = await User.find(userQuery)
            .populate('company_id')
            .populate('shift_id');
        
        // Debug: Check how many users exist
        const totalUsersQuery = normalizedCompanyId === 'all' ? {} : { company_id: companyId };
        const activeUsersQuery = normalizedCompanyId === 'all' ? { isActive: true } : { company_id: companyId, isActive: true };
        const totalUsersWithCompany = await User.countDocuments(totalUsersQuery);
        const totalActiveUsers = await User.countDocuments(activeUsersQuery);
        console.log(`[Admin Report] Company ${companyId}: Total users=${totalUsersWithCompany}, Active=${totalActiveUsers}, Query result=${employees.length}`);
        
        const employeeIds = employees.map(e => e._id);

        // 2. Fetch Bulk Data (Records, Leaves, Holidays)
        let companiesMap = {};
        let targetCompanyIds = [];
        if (normalizedCompanyId === 'all') {
            const companies = await Company.find({});
            companies.forEach(c => companiesMap[c._id.toString()] = c);
            targetCompanyIds = companies.map(c => c._id);
        } else {
            const company = await Company.findById(companyId);
            if (!company) {
                return res.status(400).json({ message: `Company not found for id: ${companyId}. Please select a valid company.` });
            }
            companiesMap[company._id.toString()] = company;
            targetCompanyIds = [company._id];
        }

        const [attendanceRecords, approvedLeaves, holidays] = await Promise.all([
            AttendanceRecord.find({
                employee_id: { $in: employeeIds },
                attendance_date: { $gte: start, $lte: end }
            }),
            LeaveApplication.find({
                employee_id: { $in: employeeIds },
                approval_status: 'approved',
                $or: [
                    { from_date: { $lte: end }, to_date: { $gte: start } }
                ]
            }),
            Holiday.find({
                company_id: { $in: targetCompanyIds },
                holiday_date: { $gte: start, $lte: end }
            })
        ]);

        // Pre-index for O(1) lookups
        const holidayDatesByCompany = {};
        holidays.forEach(h => {
            const cid = h.company_id.toString();
            if (!holidayDatesByCompany[cid]) holidayDatesByCompany[cid] = [];
            holidayDatesByCompany[cid].push(moment.utc(h.holiday_date).format('YYYY-MM-DD'));
        });

        const reportData = employees.map(emp => {
            const records = attendanceRecords.filter(r => r.employee_id.toString() === emp._id.toString());
            const empLeaves = approvedLeaves.filter(l => l.employee_id.toString() === emp._id.toString());

            let actualPresent = 0, actualAbsent = 0, actualLate = 0, actualEarlyIn = 0, actualEarlyOut = 0, actualLeaves = 0, actualHalfDay = 0, actualTotalHours = 0;

            const compactHistory = [];
            let curr = moment.utc(startDate);
            const stop = moment.utc(endDate);

            while (curr.isSameOrBefore(stop, 'day')) {
                const dayStr = curr.format('YYYY-MM-DD');
                const rec = records.find(r => moment.utc(r.attendance_date).format('YYYY-MM-DD') === dayStr);

                let hStatus = 'absent';
                let hSession = null;

                if (rec) {
                    hStatus = rec.status?.toLowerCase();
                    hSession = rec.half_day_session;

                    if (hStatus === 'present') actualPresent++;
                    else if (hStatus === 'half_day') actualHalfDay++;
                    else if (hStatus === 'absent') actualAbsent++;
                    else if (hStatus === 'leave') actualLeaves++;

                    if (rec.is_late) {
                        actualLate++;
                        // For the heatmap/continuity pattern, 'late' is a more specific status than 'present'
                        if (hStatus === 'present') hStatus = 'late';
                    }

                    if (rec.is_early_in) actualEarlyIn++;
                    if (rec.is_early_exit) actualEarlyOut++;
                    actualTotalHours += rec.total_work_hours || 0;
                } else {
                    const empCompanyId = emp.company_id?._id?.toString() || emp.company_id?.toString();
                    const empCompany = companiesMap[empCompanyId];
                    const isWeeklyOff = empCompany ? WorkingDayEngine.isWeeklyOff(dayStr, empCompany, emp.shift_id, emp.department_id) : false;
                    const isHoliday = holidayDatesByCompany[empCompanyId]?.includes(dayStr);
                    const leave = empLeaves.find(l => {
                        const lStart = moment.utc(l.from_date).startOf('day');
                        const lEnd = moment.utc(l.to_date).endOf('day');
                        return curr.isSameOrAfter(lStart) && curr.isSameOrBefore(lEnd);
                    });

                    if (isWeeklyOff) hStatus = 'weekly_off';
                    else if (isHoliday) hStatus = 'holiday';
                    else if (leave) {
                        hStatus = leave.is_half_day ? 'absent' : 'leave';
                        hSession = leave.half_day_session;
                        if (!leave.is_half_day) actualLeaves++;
                        else actualAbsent++;
                    } else {
                        if (curr.isBefore(moment(), 'day')) actualAbsent++;
                    }
                }

                compactHistory.push({ date: dayStr, status: hStatus || 'absent', session: hSession });
                curr.add(1, 'days');
            }

            let avgHours = (actualPresent + actualHalfDay) > 0 ? (actualTotalHours / (actualPresent + actualHalfDay)) : 0;
            const h = Math.floor(avgHours), m = Math.floor((avgHours - h) * 60);

            const exactDateStr = moment.utc(endDate).format('YYYY-MM-DD');
            const latestRecord = records.find(r => moment.utc(r.attendance_date).format('YYYY-MM-DD') === exactDateStr);

            return {
                id: emp._id,
                name: emp.first_name ? `${emp.first_name} ${emp.last_name || ''}`.trim() : emp.username,
                designation: emp.designation || 'Staff',
                present: actualPresent,
                absent: actualAbsent,
                late: actualLate,
                earlyIn: actualEarlyIn,
                earlyOut: actualEarlyOut,
                leaves: actualLeaves,
                halfDay: actualHalfDay,
                avgHours: `${h}h ${m}m`,
                raw_total_hours: actualTotalHours,
                raw_total_present_days: actualPresent + actualHalfDay,
                history: compactHistory,
                company_id: emp.company_id?._id || emp.company_id,
                company_name: emp.company_id?.company_name || '---',

                // New fields for punch times
                latestRecord: latestRecord ? {
                    id: latestRecord._id,
                    date: latestRecord.attendance_date,
                    first_in: latestRecord.first_in,
                    last_out: latestRecord.last_out,
                    is_auto_punch_out: latestRecord.is_auto_punch_out || false,
                    status: latestRecord.status,
                    is_late: latestRecord.is_late,
                    late_by_minutes: latestRecord.late_by_minutes,
                    is_early_in: latestRecord.is_early_in,
                    early_in_minutes: latestRecord.early_in_minutes,
                    is_early_exit: latestRecord.is_early_exit,
                    early_exit_minutes: latestRecord.early_exit_minutes
                } : null
            };
        });

        res.json({ success: true, data: reportData });
    } catch (error) {
        console.error('Admin Report Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getTeamAttendanceReport = async (req, res) => {
    try {
        const { startDate, endDate, teamId } = req.query;
        const hodId = req.user._id;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'startDate and endDate are required' });
        }

        const start = moment(startDate).startOf('day').toDate();
        const end = moment(endDate).endOf('day').toDate();

        // 1. Discover Team Members
        let teamQuery = { hodId, isActive: { $ne: false } };
        if (teamId && teamId !== 'all') {
            teamQuery._id = teamId;
        }

        const teams = await TeamModel.find(teamQuery);
        const memberUserIds = new Set();
        teams.forEach(team => {
            if (team.members) {
                team.members.forEach(m => {
                    if (m.userId) memberUserIds.add(m.userId.toString());
                });
            }
        });

        if (memberUserIds.size === 0) {
            return res.json({ success: true, data: [] });
        }

        // 2. Fetch Employee Details
        const employees = await User.find({
            _id: { $in: Array.from(memberUserIds) },
            isActive: true
        }).populate('company_id').populate('shift_id');

        if (employees.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // Use the first company found for global settings (assuming HOD teams are within one company or settings are similar)
        const companyId = employees[0].company_id?._id || employees[0].company_id;
        const company = await Company.findById(companyId);

        const employeeIds = employees.map(e => e._id);

        // 3. Fetch Attendance Data
        const [attendanceRecords, approvedLeaves, holidays] = await Promise.all([
            AttendanceRecord.find({
                employee_id: { $in: employeeIds },
                attendance_date: { $gte: start, $lte: end }
            }),
            LeaveApplication.find({
                employee_id: { $in: employeeIds },
                approval_status: 'approved',
                $or: [
                    { from_date: { $lte: end }, to_date: { $gte: start } }
                ]
            }),
            Holiday.find({
                company_id: companyId,
                holiday_date: { $gte: start, $lte: end }
            })
        ]);

        const holidayDates = holidays.map(h => moment.utc(h.holiday_date).format('YYYY-MM-DD'));

        // 4. Generate Report (Identical logic to Admin report)
        const reportData = employees.map(emp => {
            const records = attendanceRecords.filter(r => r.employee_id.toString() === emp._id.toString());
            const empLeaves = approvedLeaves.filter(l => l.employee_id.toString() === emp._id.toString());

            let actualPresent = 0, actualAbsent = 0, actualLate = 0, actualEarlyIn = 0, actualEarlyOut = 0, actualLeaves = 0, actualHalfDay = 0, actualTotalHours = 0;
            const compactHistory = [];
            let curr = moment.utc(startDate);
            const stop = moment.utc(endDate);

            while (curr.isSameOrBefore(stop, 'day')) {
                const dayStr = curr.format('YYYY-MM-DD');
                const rec = records.find(r => moment.utc(r.attendance_date).format('YYYY-MM-DD') === dayStr);

                let hStatus = 'absent';
                let hSession = null;

                if (rec) {
                    hStatus = rec.status?.toLowerCase();
                    hSession = rec.half_day_session;
                    if (hStatus === 'present') actualPresent++;
                    else if (hStatus === 'half_day') actualHalfDay++;
                    else if (hStatus === 'absent') actualAbsent++;
                    else if (hStatus === 'leave') actualLeaves++;

                    if (rec.is_late) {
                        actualLate++;
                        if (hStatus === 'present') hStatus = 'late';
                    }
                    if (rec.is_early_in) actualEarlyIn++;
                    if (rec.is_early_exit) actualEarlyOut++;
                    actualTotalHours += rec.total_work_hours || 0;
                } else {
                    const isWeeklyOff = WorkingDayEngine.isWeeklyOff(dayStr, company, emp.shift_id, emp.department_id);
                    const isHoliday = holidayDates.includes(dayStr);
                    const leave = empLeaves.find(l => {
                        const lStart = moment.utc(l.from_date).startOf('day');
                        const lEnd = moment.utc(l.to_date).endOf('day');
                        return curr.isSameOrAfter(lStart) && curr.isSameOrBefore(lEnd);
                    });

                    if (isWeeklyOff) hStatus = 'weekly_off';
                    else if (isHoliday) hStatus = 'holiday';
                    else if (leave) {
                        hStatus = leave.is_half_day ? 'absent' : 'leave';
                        hSession = leave.half_day_session;
                        if (!leave.is_half_day) actualLeaves++;
                        else actualAbsent++;
                    } else if (curr.isBefore(moment(), 'day')) {
                        actualAbsent++;
                    }
                }
                compactHistory.push({ date: dayStr, status: hStatus || 'absent', session: hSession });
                curr.add(1, 'days');
            }

            let avgHours = (actualPresent + actualHalfDay) > 0 ? (actualTotalHours / (actualPresent + actualHalfDay)) : 0;
            const h = Math.floor(avgHours), m = Math.floor((avgHours - h) * 60);
            const exactDateStr = moment.utc(endDate).format('YYYY-MM-DD');
            const latestRecord = records.find(r => moment.utc(r.attendance_date).format('YYYY-MM-DD') === exactDateStr);

            return {
                id: emp._id,
                name: emp.first_name ? `${emp.first_name} ${emp.last_name || ''}`.trim() : emp.username,
                designation: emp.designation || 'Staff',
                department: emp.department_id?.department_name || 'General',
                present: actualPresent,
                absent: actualAbsent,
                late: actualLate,
                earlyIn: actualEarlyIn,
                earlyOut: actualEarlyOut,
                leaves: actualLeaves,
                halfDay: actualHalfDay,
                avgHours: `${h}h ${m}m`,
                history: compactHistory,
                latestRecord: latestRecord ? {
                    id: latestRecord._id,
                    first_in: latestRecord.first_in,
                    last_out: latestRecord.last_out,
                    status: latestRecord.status,
                    is_late: latestRecord.is_late
                } : null
            };
        });

        res.json({ success: true, data: reportData });
    } catch (err) {
        console.error('Team Report Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateAttendanceRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, first_in, last_out, remarks, employee_id } = req.body;
        const companyId = resolveCompanyId(req);

        if (req.user.role !== 'ADMIN' && req.user.role !== 'HOD') {
            return res.status(403).json({ message: 'Unauthorized: Only admins and HODs can edit records' });
        }

        // HOD Authorization Check: Must be their team member
        if (req.user.role === 'HOD') {
            const targetEmployeeId = employee_id || (await AttendanceRecord.findById(id))?.employee_id;
            if (!await isHODauthorized(req.user._id, targetEmployeeId)) {
                return res.status(403).json({ message: 'Forbidden: Member not in your team' });
            }
        }

        // 1. Validate ID Format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid record ID' });
        }

        // 2. Fetch Existing Record - findById so bulk-upserted records (no company_id) are still found
        const record = await AttendanceRecord.findById(id);
        if (!record) return res.status(404).json({ message: 'Attendance record not found' });

        // 3. Fetch Employee & Policy Status
        const employee = await User.findById(record.employee_id);
        const company = await Company.findById(companyId);
        const yearMonth = moment(record.attendance_date).format('YYYY-MM');

        if (await PayrollEngine.isLocked(company, yearMonth)) {
            return res.status(403).json({ message: 'Attendance for this month is locked' });
        }

        // 4. Update Fields
        if (status) record.status = status;
        if (first_in) record.first_in = first_in;
        if (last_out) record.last_out = last_out;
        if (remarks) record.remarks = remarks;
        record.processed_by = 'admin';
        record.processed_at = new Date();

        // 5. Shared Calculation Logic
        await recalculatePunctuality(record, employee, company);

        await record.save();
        await syncUserTodayStatus(record, company);

        await logActivity(req, 'ATTENDANCE', 'UPDATE_RECORD', `Admin updated record ${id}`, { record_id: id });
        res.json({ success: true, message: 'Record updated', record });

    } catch (err) {
        console.error('Update Alert:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

export const createManualAdjustment = async (req, res) => {
    try {
        const { attendance_date, employee_id, status, first_in, last_out, remarks } = req.body;
        const companyId = resolveCompanyId(req);

        if (req.user.role !== 'ADMIN' && req.user.role !== 'HOD') {
            return res.status(403).json({ message: 'Authorization denied: Only admins and HODs can create adjustments' });
        }

        // HOD Authorization Check: Must be their team member
        if (req.user.role === 'HOD') {
            if (!await isHODauthorized(req.user._id, employee_id)) {
                return res.status(403).json({ message: 'Forbidden: Member not in your team' });
            }
        }

        if (!attendance_date || !employee_id) {
            return res.status(400).json({ message: 'Missing required employee or date' });
        }

        const employee = await User.findById(employee_id);
        const company = await Company.findById(companyId);
        const targetDate = moment.utc(attendance_date).startOf('day').toDate();

        // Check if record exists
        let record = await AttendanceRecord.findOne({
            employee_id, company_id: companyId, attendance_date: targetDate
        });

        if (!record) {
            record = new AttendanceRecord({
                employee_id,
                company_id: companyId,
                attendance_date: targetDate,
                year_month: moment.utc(targetDate).format('YYYY-MM'),
                status: status || 'present'
            });
        }

        // Update with new data
        if (status) record.status = status;
        if (first_in) record.first_in = first_in;
        if (last_out) record.last_out = last_out;
        if (remarks) record.remarks = remarks;
        record.processed_by = 'admin';
        record.processed_at = new Date();

        await recalculatePunctuality(record, employee, company);
        await record.save();
        await syncUserTodayStatus(record, company);

        await logActivity(req, 'ATTENDANCE', 'CREATE_RECORD', `Manual adjustment for ${attendance_date}`, { record_id: record._id });
        res.json({ success: true, message: 'Adjustment saved successfully', record });

    } catch (err) {
        console.error('Adjustment error:', err);
        res.status(500).json({ message: 'Failed to create adjustment', error: err.message });
    }
};

// --- NEW: Calculate Daily Attendance (Work Hours Based) ---
export const calculateDailyAttendance = async (req, res) => {
    try {
        const employee_id = req.params.employee_id || req.body.employee_id;
        const attendance_date = req.params.attendance_date || req.body.attendance_date;
        const companyId = resolveCompanyId(req);

        if (!employee_id || !attendance_date) {
            return res.status(400).json({ message: 'employee_id and attendance_date are required' });
        }

        // Authorization
        if (req.user.role !== 'ADMIN' && req.user.role !== 'HOD') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (req.user.role === 'HOD') {
            if (!await isHODauthorized(req.user._id, employee_id)) {
                return res.status(403).json({ message: 'Forbidden: Member not in your team' });
            }
        }

        const employee = await User.findById(employee_id);
        if (!employee || employee.company_id?.toString() !== companyId.toString()) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const shift = await PolicyResolver.resolveShift(employee);
        if (!shift) {
            return res.status(400).json({ message: 'Employee has no shift assigned or applicable' });
        }

        const dateObj = moment.utc(attendance_date).startOf('day').toDate();

        // Fetch punches
        const punches = await AttendancePunch.find({
            employee_id,
            punch_date: dateObj
        }).sort({ punch_time: 1 });

        // Calculate work hours
        const workData = WorkHoursCalculator.calculateDailyWorkHours(punches, shift);

        // Check for overrides
        const approvedLeave = await LeaveApplication.findOne({
            employee_id,
            from_date: { $lte: dateObj },
            to_date: { $gte: dateObj },
            approval_status: 'approved'
        });

        const holiday = await Holiday.findOne({
            company_id: companyId,
            holiday_date: { $gte: dateObj, $lt: new Date(dateObj.getTime() + 86400000) }
        });

        const weekOffPolicy = await PolicyResolver.resolveWeekOffPolicy(employee);
        const isWeeklyOff = PolicyResolver.resolveWeeklyOffStatus(dateObj, weekOffPolicy)?.isOff || false;

        // Resolve status
        const statusResult = AttendanceStatusResolver.resolveStatus(workData, shift, {
            hasLeave: !!approvedLeave,
            isHoliday: !!holiday,
            isWeeklyOff: isWeeklyOff
        });

        // Save or update record
        const record = await AttendanceRecord.findOneAndUpdate(
            { employee_id, attendance_date: dateObj, company_id: companyId },
            {
                shift_id: employee.shift_id,
                total_work_hours: workData.total_work_hours,
                work_sessions: workData.sessions,
                total_work_sessions: workData.total_sessions,
                has_incomplete_session: workData.has_incomplete,
                is_late: workData.is_late,
                late_by_minutes: workData.late_by_minutes,
                is_early_exit: workData.is_early_exit,
                early_exit_minutes: workData.early_exit_minutes,
                status: statusResult.status,
                first_in: workData.primary_in_time,
                last_out: workData.primary_out_time,
                total_punches: punches.length,
                processed_at: new Date(),
                processed_by: 'manual',
                year_month: moment.utc(dateObj).format('YYYY-MM'),
                is_on_leave: !!approvedLeave,
                leave_application_id: approvedLeave?._id,
                is_holiday: !!holiday,
                is_weekly_off: isWeeklyOff
            },
            { upsert: true, new: true, runValidators: false }
        );

        await logActivity(req, 'ATTENDANCE', 'CALCULATE_DAILY', `Attendance calculated for ${attendance_date}`, { record_id: record._id });

        res.json({
            success: true,
            message: 'Attendance calculated',
            data: {
                record,
                workData,
                statusReason: statusResult.reason
            }
        });

    } catch (err) {
        console.error('Calculate daily attendance error:', err);
        res.status(500).json({ message: 'Failed to calculate attendance', error: err.message });
    }
};

// --- PRIVATE HELPERS ---
async function recalculatePunctuality(record, employee, company) {
    const tz = company?.timezone || 'Asia/Kolkata';
    const dateStr = moment(record.attendance_date).format('YYYY-MM-DD');
    const shiftId = record.shift_id;
    const shift = shiftId ? await Shift.findById(shiftId) : await PolicyResolver.resolveShift(employee);
    const dept = employee.department_id ? await Department.findById(employee.department_id) : null;

    if (record.first_in && shift) {
        const shiftStart = moment.tz(`${dateStr} ${shift.start_time}`, 'YYYY-MM-DD HH:mm', tz);
        const punchIn = moment(record.first_in).tz(tz);
        record.is_late = punchIn.isAfter(shiftStart);
        record.late_by_minutes = record.is_late ? punchIn.diff(shiftStart, 'minutes') : 0;
        record.is_early_in = punchIn.isBefore(shiftStart);
        record.early_in_minutes = record.is_early_in ? shiftStart.diff(punchIn, 'minutes') : 0;
    }

    if (record.last_out && shift) {
        const shiftEnd = moment.tz(`${dateStr} ${shift.end_time}`, 'YYYY-MM-DD HH:mm', tz);
        const punchOut = moment(record.last_out).tz(tz);
        record.is_early_exit = punchOut.isBefore(shiftEnd);
        record.early_exit_minutes = record.is_early_exit ? shiftEnd.diff(punchOut, 'minutes') : 0;
    }

    if (record.first_in && record.last_out) {
        const diff = moment(record.last_out).diff(moment(record.first_in), 'hours', true);
        record.total_work_hours = diff > 0 ? diff : 0;

        // --- AUTOMATIC STATUS RE-DETERMINATION ---
        // Fetch configs again for thresholds
        const deptHalfDayThreshold = dept?.half_day_hours;
        const deptFullDayThreshold = dept?.full_day_hours;

        const fullDayThreshold = shift.full_day_hours || deptFullDayThreshold || company.attendance_config?.full_day_threshold_hours || 8;
        const halfDayThreshold = shift.half_day_hours || deptHalfDayThreshold || company.attendance_config?.half_day_threshold_hours || 4;

        // If the record status is 'present' or 'late' but work hours are below threshold, force update to 'half_day'
        if (['present', 'late'].includes(record.status) && record.total_work_hours < fullDayThreshold) {
            record.status = 'half_day';
            record.is_half_day = true;
        } else if (record.status === 'half_day' && record.total_work_hours >= fullDayThreshold) {
            record.status = 'present';
            record.is_half_day = false;
        }
    }
}

async function syncUserTodayStatus(record, company) {
    const tz = company?.timezone || 'Asia/Kolkata';
    const todayStr = moment().tz(tz).format('YYYY-MM-DD');
    const recordDateStr = moment(record.attendance_date).format('YYYY-MM-DD');

    if (todayStr === recordDateStr) {
        const userStatus = record.last_out ? 'out_office' : (record.first_in ? 'in_office' : 'out_office');
        const lastType = record.last_out ? 'OUT' : (record.first_in ? 'IN' : 'OUT');
        const lastDate = record.last_out || record.first_in || null;

        await User.findByIdAndUpdate(record.employee_id, {
            current_status: userStatus,
            last_punch_type: lastType,
            last_punch_date: lastDate
        });
    }
}

export const deleteAttendanceRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = resolveCompanyId(req);

        if (req.user.role !== 'ADMIN' && req.user.role !== 'HOD') {
            return res.status(403).json({ message: 'Only admins and HODs can delete attendance records' });
        }

        // HOD Authorization Check: Must be their team member
        if (req.user.role === 'HOD') {
            const record = await AttendanceRecord.findById(id);
            if (!record || !await isHODauthorized(req.user._id, record.employee_id)) {
                return res.status(403).json({ message: 'Forbidden: Member not in your team' });
            }
        }

        const record = await AttendanceRecord.findOne({ _id: id, company_id: companyId });
        if (!record) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }

        // Check if month is locked
        const company = await Company.findById(companyId);
        const yearMonth = moment(record.attendance_date).format('YYYY-MM-DD').substring(0, 7);
        if (await PayrollEngine.isLocked(company, yearMonth)) {
            return res.status(403).json({ message: 'Cannot delete: Attendance for this month is locked' });
        }

        await record.deleteOne();
        await logActivity(req, 'ATTENDANCE', 'DELETE_RECORD', `Admin deleted attendance for ${record.attendance_date}`, { record_id: id });

        res.json({ success: true, message: 'Attendance record deleted' });
    } catch (err) {
        console.error('Delete Attendance Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getEmployeeFullProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;
        const roleNorm = String(req.user?.role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
        const isAdmin = roleNorm === 'ADMIN';
        const isHod = roleNorm === 'HOD' || roleNorm === 'HEADOFDEPARTMENT';

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid employee ID format' });
        }

        if (!isAdmin && !isHod) {
            return res.status(403).json({ message: 'Unauthorized profile access' });
        }

        if (isHod) {
            const hodTeams = await TeamModel.find({ hodId: req.user._id, isActive: { $ne: false } });
            const isInTeam = hodTeams.some(team =>
                team.members?.some(m => m.userId?.toString() === id.toString())
            );
            if (!isInTeam) {
                return res.status(403).json({ message: 'Employee not in your team' });
            }
        }

        const employee = await User.findById(id)
            .populate('department_id shift_id hod_id company_id weekoff_policy_id holiday_policy_id')
            .lean();

        if (!employee) return res.status(404).json({ message: 'Employee not found in records' });

        // Normalize dates safely - handle malformed strings like 'Invalid date' from frontend
        const isValidStart = startDate && startDate !== 'Invalid date';
        const isValidEnd = endDate && endDate !== 'Invalid date';
        let start = moment(isValidStart ? startDate : new Date()).startOf('day').toDate();
        let end = moment(isValidEnd ? endDate : new Date()).endOf('day').toDate();

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            start = moment().startOf('month').toDate();
            end = moment().endOf('month').toDate();
        }

        const results = await Promise.all([
            AttendanceRecord.find({
                employee_id: id,
                attendance_date: { $gte: start, $lte: end }
            }).sort({ attendance_date: -1 }).lean(),

            LeaveBalance.find({
                employee_id: id,
                company_id: employee.company_id?._id || employee.company_id
            })
                .populate('leave_policy_id', 'policy_name leave_type')
                .sort({ updatedAt: -1 })
                .lean(),

            LeaveApplication.find({
                employee_id: id,
                approval_status: 'approved',
                $or: [
                    { from_date: { $gte: start, $lte: end } },
                    { to_date: { $gte: start, $lte: end } }
                ]
            }).lean(),

            Holiday.find({
                company_id: employee.company_id?._id || employee.company_id,
                holiday_date: { $gte: start, $lte: end }
            }).lean(),

            LeaveApplication.find({
                employee_id: id,
                approval_status: { $in: NON_FINAL_LEAVE_STATUSES }
            }).populate('leave_policy_id', 'leave_type policy_name').lean(),

            RegularizationRequest.find({
                employee_id: id,
                status: 'pending'
            }).lean()
        ]);

        const [attendance, balances, leaves, holidays, pendingLeaves, pendingRegularizations] = results;
        const normalizedBalances = (balances || []).map((b) => {
            const used = Number(b.used ?? b.consumed ?? 0);
            const pendingApproval = Number(b.pending_approval ?? b.pending ?? 0);
            const opening = Number(b.opening_balance ?? 0);
            const closing = Number(
                b.closing_balance ?? (opening - used - pendingApproval)
            );

            return {
                ...b,
                used,
                pending: pendingApproval,
                pending_approval: pendingApproval,
                opening_balance: opening,
                closing_balance: closing
            };
        });

        // Calculate Summary for Scorecard
        const summary = {
            present: attendance.filter(a => a.status === 'present').length,
            absent: attendance.filter(a => a.status === 'absent').length,
            late: attendance.filter(a => a.status === 'late').length,
            half_day: attendance.filter(a => a.status === 'half_day').length,
            leaves: leaves.length, // Already filtered for approved leaves in range
            pendingLeaves: (pendingLeaves || []).length
        };

        return res.json({
            success: true,
            employee,
            attendance,
            balances: normalizedBalances,
            leaves,
            holidays,
            summary,
            pendingLeaves: pendingLeaves || [],
            pendingRegularizations: pendingRegularizations || []
        });
    } catch (err) {
        console.error('>>> [CRITICAL_ERROR] getEmployeeFullProfile failed:', err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
};

export const updateEmployeeProfileHOD = async (req, res) => {
    try {
        const { id } = req.params;
        const { shift_id } = req.body;

        if (req.user.role !== 'HOD' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Unauthorized profile update' });
        }

        // Verify employee is in HOD's team
        const teams = await TeamModel.find({ 
            hodId: req.user._id,
            isActive: { $ne: false }
        });
        
        const memberIds = [];
        teams.forEach(team => {
            if (team.members) {
                team.members.forEach(m => memberIds.push(m.userId?.toString()));
            }
        });

        if (req.user.role !== 'ADMIN' && !memberIds.includes(id)) {
            return res.status(403).json({ message: 'Employee not in your team' });
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Update ONLY shift_id (Shift Only)
        if (shift_id) user.shift_id = shift_id;

        await user.save();
        
        await logActivity(req, 'ATTENDANCE', 'UPDATE_PROFILE_HOD', `HOD ${req.user.username} updated shift for ${user.username}`, { target_id: id, shift_id });

        res.json({ success: true, message: 'Shift updated successfully', user });
    } catch (err) {
        console.error('HOD Profile Update Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateEmployeeProfileAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admins can update user profiles' });
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const fields = ['first_name', 'last_name', 'email', 'employee_code', 'department_id', 'shift_id', 'role', 'isActive'];
        fields.forEach(f => {
            if (updates[f] !== undefined) user[f] = updates[f];
        });

        await user.save();
        res.json({ success: true, message: 'Profile updated successfully', user });
    } catch (err) {
        console.error('Profile Update Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Approve a regularization request and recalculate attendance with corrected times
 */
export const approveRegularization = async (req, res) => {
    try {
        const regularizationId = req.params.id || req.body.regularization_id;
        const { approval_remarks } = req.body;
        const companyId = resolveCompanyId(req);

        if (!regularizationId) {
            return res.status(400).json({ message: 'regularization_id is required' });
        }

        if (req.user.role !== 'ADMIN' && req.user.role !== 'HOD') {
            return res.status(403).json({ message: 'Authorization denied: Only admins and HODs can approve regularizations' });
        }

        // Fetch regularization request
        const regularization = await RegularizationRequest.findById(regularizationId);
        if (!regularization) {
            return res.status(404).json({ message: 'Regularization request not found' });
        }

        if (regularization.status !== 'pending') {
            return res.status(400).json({ message: 'Regularization is not in pending status' });
        }

        // HOD Authorization Check: Must be employee's HOD
        if (req.user.role === 'HOD') {
            if (!await isHODauthorized(req.user._id, regularization.employee_id)) {
                return res.status(403).json({ message: 'Forbidden: Employee not in your team' });
            }
        }

        const employee = await User.findById(regularization.employee_id);
        const company = await Company.findById(companyId);
        const shift = await PolicyResolver.resolveShift(employee);
        const attendanceDate = regularization.attendance_date;

        // Fetch all punches for that date
        const punches = await AttendancePunch.find({
            employee_id: regularization.employee_id,
            punch_date: moment.utc(attendanceDate).format('YYYY-MM-DD')
        }).sort({ punch_time: 1 });

        // Recalculate work hours with corrected times from regularization
        const workData = WorkHoursCalculator.recalculateWithRegularization(
            punches,
            regularization,
            shift
        );

        // Resolve status based on work hours
        const overrides = await fetchDayOverrides(regularization.employee_id, attendanceDate, company._id);
        const statusResult = AttendanceStatusResolver.resolveStatus(workData, shift, overrides);

        // Update or create AttendanceRecord with recalculated data
        const attendanceDateObj = moment.utc(attendanceDate).startOf('day').toDate();
        let record = await AttendanceRecord.findOne({
            employee_id: regularization.employee_id,
            company_id: companyId,
            attendance_date: attendanceDateObj
        });

        if (!record) {
            record = new AttendanceRecord({
                employee_id: regularization.employee_id,
                company_id: companyId,
                attendance_date: attendanceDateObj
            });
        }

        // Update record with recalculated data
        record.status = statusResult.status;
        record.total_work_hours = workData.total_work_hours;
        record.total_work_sessions = workData.total_sessions;
        record.work_sessions = workData.sessions;
        record.has_incomplete_session = workData.has_incomplete;
        record.is_late = workData.is_late;
        record.late_by_minutes = workData.late_by_minutes;
        record.is_early_exit = workData.is_early_exit;
        record.early_exit_minutes = workData.early_exit_minutes;
        record.regularization_applied = regularizationId;
        record.remarks = approval_remarks;

        await record.save();

        // Mark regularization as approved
        regularization.status = 'approved';
        regularization.approved_by = req.user._id;
        regularization.approved_at = moment().toDate();
        regularization.approved_comments = approval_remarks;
        await regularization.save();

        await logActivity(req, 'ATTENDANCE', 'APPROVE_REGULARIZATION', `Approved regularization for ${employee.first_name}`, {
            regularization_id: regularizationId,
            attendance_date: attendanceDate,
            previous_status: statusResult.status
        });

        res.json({
            success: true,
            message: 'Regularization approved and attendance recalculated',
            record,
            workData: {
                total_work_hours: workData.total_work_hours,
                total_sessions: workData.total_sessions,
                status: statusResult.status
            }
        });

    } catch (err) {
        console.error('Approve Regularization Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ─── MIGRATION ENDPOINT ────────────────────────────────────────────────────
export const migrateEmployee = async (req, res) => {
    try {
        const { id: employeeId } = req.params;
        const { destinationOrgId } = req.body;

        // Validate inputs
        if (!employeeId || !destinationOrgId) {
            return res.status(400).json({ message: 'Employee ID and destination organization ID required' });
        }

        // Fetch employee
        const employee = await User.findById(employeeId).populate('company_id');
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Fetch destination organization
        const destOrg = await Company.findById(destinationOrgId);
        if (!destOrg) {
            return res.status(404).json({ message: 'Destination organization not found' });
        }
        const destinationCompanyName = destOrg.company_name || destOrg.name || 'Unknown';
        const sourceCompanyName = employee.company_id?.company_name || employee.company || 'Unknown';

        const sourceOrgId = employee.company_id._id;

        // Fetch destination org's policies
        const destOrgPolicies = await LeavePolicy.find({ company_id: destinationOrgId });

        // Update employee's company
        employee.company_id = destinationOrgId;
        employee.company = destinationCompanyName;

        // Assign to HOD if destination org has one
        if (destOrg.hod) {
            employee.reporting_manager = destOrg.hod;
        }

        await employee.save();
        
        // --- 2. Preserve & Map Attendance Data (Dependencies) ---
        
        // Update AttendanceRecords & Regularizations to new company context
        await AttendanceRecord.updateMany({ employee_id: employeeId }, { company_id: destinationOrgId });
        await RegularizationRequest.updateMany({ employee_id: employeeId }, { company_id: destinationOrgId });
        await ActiveSession.updateMany({ employee_id: employeeId }, { company_id: destinationOrgId });

        // Map LeaveBalances and Applications to Destination Org's Policies
        const sourceBalances = await LeaveBalance.find({ employee_id: employeeId }).populate('leave_policy_id');
       // const destOrgPolicies = await LeavePolicy.find({ company_id: destinationOrgId, status: 'active' });
        
        // Create an equivalent policy lookup map by leave_code
        const policyMap = new Map();
        destOrgPolicies.forEach(p => {
           if (p.leave_code) policyMap.set(p.leave_code.trim().toUpperCase(), p._id);
        });

        // Update LeaveBalances with new company and mapped policy
        for (const balance of sourceBalances) {
            const oldPolicy = balance.leave_policy_id;
            const leaveCode = oldPolicy?.leave_code?.trim().toUpperCase();
            const destPolicyId = leaveCode ? policyMap.get(leaveCode) : null;
            
            balance.company_id = destinationOrgId;
            if (destPolicyId) {
                balance.leave_policy_id = destPolicyId;
            }
            // If no exact match (leave_code), record stays pointing to old policy or we can handle it
            await balance.save();
        }

        // Update LeaveApplications to new company & mapped policy
        const leaveApps = await LeaveApplication.find({ employee_id: employeeId });
        for (const app of leaveApps) {
            app.company_id = destinationOrgId;
            
            // Try to map policy if not already updated via balances above (application usually stores policy id directly)
            // If there's an existing mapped balance, its policy should take precedence
            const balanceForApp = sourceBalances.find(sb => sb.leave_policy_id?._id?.toString() === app.leave_policy_id?.toString() || sb.leave_type === app.leave_type);
            if (balanceForApp && balanceForApp.company_id.toString() === destinationOrgId.toString()) {
                app.leave_policy_id = balanceForApp.leave_policy_id;
            }
            
            await app.save();
        }
        // Log activity
        await logActivity(req, 'EMPLOYEE_MIGRATION', 'MIGRATE_EMPLOYEE',
            `Migrated ${employee.first_name} to ${destinationCompanyName}`,
            {
                employeeId: employee._id,
                sourceOrgId,
                destinationOrgId,
                sourceCompanyId: sourceOrgId,
                sourceCompanyName,
                destinationCompanyId: destinationOrgId,
                destinationCompanyName,
                assignedHOD: destOrg.hod || null,
                policiesCount: destOrgPolicies.length
            }
        );

        res.json({
            success: true,
            message: `Employee migrated to ${destinationCompanyName}`,
            migratedEmployee: {
                _id: employee._id,
                name: `${employee.first_name} ${employee.last_name}`,
                company_id: destinationOrgId,
                company_name: destinationCompanyName,
                reporting_manager: destOrg.hod || null
            },
            newPolicies: destOrgPolicies.map(p => p.policy_name || p.leave_type),
            assignedHOD: destOrg.hod ? true : false
        });

    } catch (err) {
        console.error('Migration Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

export const getEmployeeMigrationHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const roleNorm = String(req.user?.role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
        const isAdmin = roleNorm === 'ADMIN';
        const isHod = roleNorm === 'HOD' || roleNorm === 'HEADOFDEPARTMENT';

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid employee ID format' });
        }

        if (!isAdmin && !isHod) {
            return res.status(403).json({ message: 'Unauthorized migration history access' });
        }

        if (isHod) {
            const isInTeam = await isHODauthorized(req.user._id, id);
            if (!isInTeam) {
                return res.status(403).json({ message: 'Employee not in your team' });
            }
        }

        const employee = await User.findById(id).select('first_name last_name username date_of_joining createdAt').lean();
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const migrationLogs = await ActivityLog.find({
            action: { $in: ['MIGRATE_EMPLOYEE', 'MIGRATE_USER'] },
            $or: [
                { 'metadata.employeeId': new mongoose.Types.ObjectId(id) },
                { 'metadata.userId': new mongoose.Types.ObjectId(id) }
            ]
        })
            .populate('user_id', 'first_name last_name username')
            .sort({ createdAt: 1 })
            .lean();

        const companyIds = new Set();
        migrationLogs.forEach((log) => {
            const metadata = log.metadata || {};
            const sourceId = metadata.sourceCompanyId || metadata.sourceOrgId;
            const destId = metadata.destinationCompanyId || metadata.destinationOrgId || metadata.targetCompanyId;
            if (sourceId) companyIds.add(String(sourceId));
            if (destId) companyIds.add(String(destId));
        });

        const companies = await Company.find({ _id: { $in: Array.from(companyIds) } })
            .select('company_name')
            .lean();
        const companyMap = new Map(companies.map((c) => [String(c._id), c.company_name]));

        let previousMoveInAt = employee.date_of_joining || employee.createdAt || null;

        const history = migrationLogs.map((log) => {
            const metadata = log.metadata || {};
            const sourceId = metadata.sourceCompanyId || metadata.sourceOrgId;
            const destinationId = metadata.destinationCompanyId || metadata.destinationOrgId || metadata.targetCompanyId;
            const migratedAt = new Date(log.createdAt);
            const periodStart = previousMoveInAt ? new Date(previousMoveInAt) : null;
            const periodDays = periodStart && !Number.isNaN(periodStart.getTime())
                ? Math.max(0, moment(migratedAt).diff(moment(periodStart), 'days'))
                : null;

            const record = {
                _id: log._id,
                action: log.action,
                migratedAt,
                migratedBy: {
                    _id: log.user_id?._id || null,
                    name: [log.user_id?.first_name, log.user_id?.last_name].filter(Boolean).join(' ').trim() || log.user_id?.username || 'Unknown'
                },
                sourceCompany: {
                    _id: sourceId || null,
                    name: metadata.sourceCompanyName || (sourceId ? companyMap.get(String(sourceId)) : null) || 'Unknown'
                },
                destinationCompany: {
                    _id: destinationId || null,
                    name: metadata.destinationCompanyName || metadata.targetCompanyName || (destinationId ? companyMap.get(String(destinationId)) : null) || 'Unknown'
                },
                previousCompanyPeriod: {
                    from: periodStart,
                    to: migratedAt,
                    days: periodDays
                }
            };

            previousMoveInAt = migratedAt;
            return record;
        }).reverse();

        return res.json({
            success: true,
            employee: {
                _id: employee._id,
                name: [employee.first_name, employee.last_name].filter(Boolean).join(' ').trim() || employee.username || 'Employee'
            },
            data: history
        });
    } catch (err) {
        console.error('Get Migration History Error:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ─── BULK POLICY ASSIGNMENT ────────────────────────────────────────────────
export const bulkAssignPolicies = async (req, res) => {
    try {
        const { company_id: companyId } = req.params;
        const { policyIds } = req.body; // Array of policy IDs to assign

        if (!companyId || !policyIds || !Array.isArray(policyIds) || policyIds.length === 0) {
            return res.status(400).json({ message: 'Company ID and policy IDs array required' });
        }

        // Fetch all active employees in company
        const employees = await User.find({
            company_id: companyId,
            is_active: true
        });

        if (employees.length === 0) {
            return res.json({ success: true, message: 'No active employees in this organization', assignedCount: 0 });
        }

        // Fetch selected policies
        const policies = await LeavePolicy.find({ _id: { $in: policyIds } });

        let assignedCount = 0;

        // For each employee, assign policies
        for (const employee of employees) {
            // Remove existing balances for this company (optional: could archive instead)
            await LeaveBalance.deleteMany({ employee_id: employee._id, company_id: companyId });

            // Create new balances for each policy
            for (const policy of policies) {
                const existingBalance = await LeaveBalance.findOne({
                    employee_id: employee._id,
                    leave_policy_id: policy._id,
                    company_id: companyId
                });

                if (!existingBalance) {
                    const currentYear = new Date().getFullYear();
                    const balance = new LeaveBalance({
                        employee_id: employee._id,
                        company_id: companyId,
                        leave_policy_id: policy._id,
                        leave_type: policy.leave_type,
                        year: currentYear,
                        opening_balance: policy.annual_quota || 0,
                        used: 0,
                        pending_approval: 0,
                        closing_balance: policy.annual_quota || 0
                    });
                    await balance.save();
                }
            }
            assignedCount++;
        }

        // Log activity
        await logActivity(req, 'POLICY_MANAGEMENT', 'BULK_ASSIGN_POLICIES',
            `Bulk assigned ${policyIds.length} policies to ${assignedCount} employees`,
            {
                companyId,
                policyIds,
                employeeCount: assignedCount
            }
        );

        res.json({
            success: true,
            message: `Policies assigned to ${assignedCount} employees`,
            assignedCount,
            policies: policies.map(p => p.policy_name || p.leave_type)
        });

    } catch (err) {
        console.error('Bulk Assign Policies Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ─── ATTENDANCE CONTINUITY (BULK UPDATE) ───────────────────────────────────
export const bulkUpdateAttendance = async (req, res) => {
    try {
        const { employee_id, startDate, endDate, status, remarks, excludeSundays = true, excludeSaturdays = true } = req.body;

        const toBoolean = (value, fallback = false) => {
            if (typeof value === 'boolean') return value;
            if (typeof value === 'number') return value === 1;
            if (typeof value === 'string') {
                const normalized = value.trim().toLowerCase();
                if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
                if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
            }
            return fallback;
        };

        if (!employee_id || !startDate || !endDate || !status) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const employee = await User.findById(employee_id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        // Parse as local date strings to keep day-of-week correct (no UTC offset shift)
        const start = moment(startDate, 'YYYY-MM-DD').startOf('day');
        const end = moment(endDate, 'YYYY-MM-DD').endOf('day');

        if (end.isBefore(start)) {
            return res.status(400).json({ message: 'End date cannot be before start date' });
        }

        const daysDiff = end.diff(start, 'days');
        if (daysDiff > 31) {
            return res.status(400).json({ message: 'Bulk update range limited to 31 days' });
        }

        let curr = moment(start).startOf('day');
        const results = [];
        const skipSundayEnabled = toBoolean(excludeSundays, true);
        const skipSaturdayEnabled = toBoolean(excludeSaturdays, true);

        // USER Requirement: Default time 10:00 to 07:00 (not 24-hour format in UI)
        // Correcting back to 24hr for internal date objects: In-time: 10:00, Out-time: 19:00 (7 PM)
        const in_time_default = "10:00";
        const out_time_default = "19:00";

        while (curr.isSameOrBefore(end)) {
            const dayOfWeek = curr.day(); // 0 = Sunday, 6 = Saturday in UTC context

            // Skip based on weekend exclusion filters
            const skipSunday = skipSundayEnabled && dayOfWeek === 0;
            const skipSaturday = skipSaturdayEnabled && dayOfWeek === 6;

            if (skipSunday || skipSaturday) {
                curr.add(1, 'day');
                continue;
            }

            const dateStr = curr.format('YYYY-MM-DD');
            // Store as local midnight so calendar date-matching is consistent
            const attDate = moment(dateStr, 'YYYY-MM-DD').startOf('day').toDate();

            const isPresent = status === 'present';
            const firstIn = isPresent ? moment(`${dateStr}T${in_time_default}:00`).toDate() : null;
            const lastOut = isPresent ? moment(`${dateStr}T${out_time_default}:00`).toDate() : null;

            await AttendanceRecord.findOneAndUpdate(
                { employee_id: employee._id, attendance_date: attDate },
                {
                    $set: {
                        employee_id: employee._id,
                        company_id: employee.company_id,
                        attendance_date: attDate,
                        status: status,
                        first_in: firstIn,
                        last_out: lastOut,
                        total_work_hours: isPresent ? 9 : 0,
                        remarks: remarks || 'Bulk continuity update',
                        year_month: curr.format('YYYY-MM'),
                        processed_by: 'admin-bulk',
                        is_processed: true
                    }
                },
                { upsert: true, new: true }
            );

            results.push(dateStr);
            curr.add(1, 'day');
        }

        await logActivity(req, 'ATTENDANCE', 'BULK_CONTINUITY_UPDATE', 
            `Bulk updated ${results.length} days for ${employee.first_name}`, 
            { employeeId: employee_id, range: `${startDate} to ${endDate}`, status });

        res.json({ 
            success: true, 
            message: `Bulk update completed for ${results.length} days (10:00 AM to 07:00 PM assigned for present status)`,
            updatedDays: results.length,
            skippedSundays: skipSundayEnabled,
            skippedSaturdays: skipSaturdayEnabled
        });

    } catch (err) {
        console.error('Bulk Update Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── FULL MONTH PRESENCE (POLICY-DRIVEN) ───────────────────────────────────
export const applyFullMonthPresence = async (req, res) => {
    try {
        const { employee_id, year, month, remarks = '' } = req.body;

        if (!employee_id || !year || !month) {
            return res.status(400).json({ message: 'employee_id, year and month are required' });
        }

        const targetYear = Number(year);
        const targetMonth = Number(month);

        if (!Number.isInteger(targetYear) || !Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12) {
            return res.status(400).json({ message: 'Invalid year or month' });
        }

        const employee = await User.findById(employee_id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const start = moment({ year: targetYear, month: targetMonth - 1, day: 1 }).startOf('day');
        const end = moment(start).endOf('month').endOf('day');
        const weekOffPolicy = await PolicyResolver.resolveWeekOffPolicy(employee);
        const protectedStatuses = new Set(['leave', 'holiday', 'weekly_off', 'weekoff']);

        let curr = moment(start).startOf('day');
        let updatedDays = 0;
        let skippedWeekOffDays = 0;
        let skippedProtectedDays = 0;

        const inTimeDefault = '10:00';
        const outTimeDefault = '19:00';

        while (curr.isSameOrBefore(end)) {
            const dateStr = curr.format('YYYY-MM-DD');
            const dayStart = moment(dateStr, 'YYYY-MM-DD').startOf('day').toDate();
            const dayEnd = moment(dateStr, 'YYYY-MM-DD').endOf('day').toDate();

            const weekOffStatus = PolicyResolver.resolveWeeklyOffStatus(dayStart, weekOffPolicy);
            if (weekOffStatus?.isOff) {
                skippedWeekOffDays += 1;
                curr.add(1, 'day');
                continue;
            }

            const existingRecord = await AttendanceRecord.findOne({
                employee_id: employee._id,
                attendance_date: { $gte: dayStart, $lte: dayEnd }
            }).select('_id status');

            if (existingRecord && protectedStatuses.has(String(existingRecord.status || '').toLowerCase())) {
                skippedProtectedDays += 1;
                curr.add(1, 'day');
                continue;
            }

            const updatePayload = {
                employee_id: employee._id,
                company_id: employee.company_id,
                attendance_date: dayStart,
                status: 'present',
                first_in: moment(`${dateStr}T${inTimeDefault}:00`).toDate(),
                last_out: moment(`${dateStr}T${outTimeDefault}:00`).toDate(),
                total_work_hours: 9,
                remarks: remarks || 'Full month presence (policy-driven)',
                year_month: curr.format('YYYY-MM'),
                processed_by: 'admin-full-month',
                is_processed: true
            };

            if (existingRecord?._id) {
                await AttendanceRecord.findByIdAndUpdate(existingRecord._id, { $set: updatePayload });
            } else {
                await AttendanceRecord.findOneAndUpdate(
                    { employee_id: employee._id, attendance_date: dayStart },
                    { $set: updatePayload },
                    { upsert: true, new: true }
                );
            }

            updatedDays += 1;
            curr.add(1, 'day');
        }

        await logActivity(
            req,
            'ATTENDANCE',
            'FULL_MONTH_PRESENCE',
            `Applied full month presence for ${employee.first_name || employee.username || 'employee'}`,
            {
                employeeId: employee_id,
                month: `${targetYear}-${String(targetMonth).padStart(2, '0')}`,
                updatedDays,
                skippedWeekOffDays,
                skippedProtectedDays
            }
        );

        return res.json({
            success: true,
            message: `Full month presence applied: ${updatedDays} updated, ${skippedWeekOffDays} policy week-offs skipped, ${skippedProtectedDays} protected days skipped`,
            updatedDays,
            skippedWeekOffDays,
            skippedProtectedDays,
            month: `${targetYear}-${String(targetMonth).padStart(2, '0')}`
        });
    } catch (err) {
        console.error('Full Month Presence Error:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};
