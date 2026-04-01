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
import ActivityLog from '../../model/attendance/ActivityLog.js';

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

import QueryBuilder from '../../services/attendance/QueryBuilder.js';
import PayrollLock from '../../model/attendance/PayrollLock.js';

// --- HELPER: Process Daily Attendance (Multi-Tenant & Rule-Driven) ---
async function processDailyAttendance(user, date) {
    // Fetch Company & Shift Config dynamically
    const company = await Company.findById(user.company_id);
    const shift = await Shift.findById(user.shift_id);

    // Delegate to rule-driven engine and return the processed record
    return await AttendanceEngine.processDaily(user, date, company, shift);
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

        // 4. Punch Logic (Intelligent detection of session state)
        // Check User status AND today's AttendanceRecord to handle manual admin overrides
        const todayRecord = await AttendanceRecord.findOne({ employee_id: user._id, attendance_date: moment.utc(today).toDate() });

        // Smart Session Detection: current_status is 'in_office' ONLY IF last punch was within last 18 hours (prevents sticky sessions from yesterday)
        const isCurrentlyIn = user.current_status === 'in_office' && user.last_punch_date && moment(user.last_punch_date).isAfter(moment().subtract(18, 'hours'));
        const isInSession = isCurrentlyIn || (todayRecord?.first_in && !todayRecord?.last_out);

        if (type === 'IN' && isInSession) {
            return res.status(400).json({ message: 'Already punched IN according to current session state. Please punch OUT first.' });
        }
        if (type === 'OUT' && !isInSession) {
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

        // 2. Map Metrics
        const isCurrentlyIn = user.current_status === 'in_office' && user.last_punch_date && moment(user.last_punch_date).isAfter(now.clone().subtract(18, 'hours'));
        const isInSession = isCurrentlyIn || (todayRecord?.first_in && !todayRecord?.last_out);

        let punchStatus = {
            status: isInSession ? 'Checked In' : 'Not Checked In',
            time: null,
            workHours: '0h 0m',
            action: isInSession ? 'OUT' : 'IN',
            date: today,
            todayPunches: punches.map(p => ({ id: p._id, type: p.punch_type, punch_time: p.punch_time, method: p.punch_method }))
        };

        if (lastPunch || todayRecord?.first_in || isCurrentlyIn) {
            const firstInTime = todayRecord?.first_in || punches.find(p => p.punch_type === 'IN')?.punch_time || (isCurrentlyIn ? user.last_punch_date : null);
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
        const shift = await Shift.findById(user.shift_id);
        if (shift) {
            punchStatus.shiftName = shift.name || shift.shift_name;
            punchStatus.shiftTime = `${shift.start_time} – ${shift.end_time}`;
            punchStatus.shiftEndTime = shift.end_time;
            punchStatus.weeklyOffDays = shift.weekly_off_days || [0, 6];
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

            const [todayRecs, pendingLeaves, pendingRegs] = await Promise.all([
                AttendanceRecord.find(query),
                LeaveApplication.countDocuments({ company_id: companyId, approval_status: 'pending' }),
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

        // Fetch shift for weekly off days
        const employeeShift = await Shift.findById(user.shift_id);
        const weeklyOffDays = employeeShift?.weekly_off_days?.length > 0
            ? employeeShift.weekly_off_days
            : [0];

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
                const dayOfWeek = moment.utc(dateStr).day();
                if (weeklyOffDays.includes(dayOfWeek)) {
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
            approval_status: 'pending'
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
                approval_status: 'pending'
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
                approval_status: 'pending'
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
            approval_status: 'pending'
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
            baseFilters.department_id = req.user.department_id;
        }

        const { department_id, designation } = req.query;
        if (department_id || designation) {
            const userSubQuery = { company_id: companyId };
            if (department_id && department_id !== 'all') userSubQuery.department_id = department_id;
            if (designation && designation !== 'all') userSubQuery.designation = designation;

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
            // HODs should see requests for their whole department, not just themselves
            baseFilters.department_id = req.user.department_id;
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

        const totalEmployees = await User.countDocuments({
            company_id: companyId,
            role: { $nin: ['ADMIN', 'Admin'] },
            isActive: true
        });

        const employeeIds = await User.find({ company_id: companyId, role: { $nin: ['ADMIN', 'Admin'] } }).select('_id');
        const empIdList = employeeIds.map(e => e._id.toString());

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

        const presentToday = presentRecs.length;
        const onLeaveToday = activeLeaves.length;
        const presentUserIds = presentRecs.map(r => r.employee_id.toString());
        const onLeaveUserIds = activeLeaves.map(r => r.employee_id.toString());

        // USE SETS TO PREVENT DOUBLE-COUNTING (Accounted = Present OR On Leave)
        const accountedIds = new Set([...presentUserIds, ...onLeaveUserIds]);
        const absentToday = Math.max(0, totalEmployees - accountedIds.size);

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

        const departments = await Department.find({ company_id: companyId });

        const deptPerformance = await Promise.all(departments.map(async (dept) => {
            const deptEmployees = await User.find({
                company_id: companyId,
                department_id: dept._id,
                role: { $ne: 'ADMIN' }
            }).select('_id');

            const deptEmpIds = deptEmployees.map(e => e._id.toString());
            const totalDept = deptEmpIds.length;

            // Filter existing company-wide ID arrays for this department
            const deptPresentCount = presentUserIds.filter(id => deptEmpIds.includes(id)).length;
            const deptOnLeaveCount = onLeaveUserIds.filter(id => deptEmpIds.includes(id)).length;

            // Calculate uniquely accounted for (department level)
            const deptAccountedSet = new Set([
                ...presentUserIds.filter(id => deptEmpIds.includes(id)),
                ...onLeaveUserIds.filter(id => deptEmpIds.includes(id))
            ]);

            const deptAbsentCount = Math.max(0, totalDept - deptAccountedSet.size);
            const rate = totalDept > 0 ? ((deptPresentCount / totalDept) * 100).toFixed(1) : 0;

            return {
                name: dept.department_name,
                total: totalDept,
                present: deptPresentCount,
                absent: deptAbsentCount,
                onLeave: deptOnLeaveCount,
                rate: parseFloat(rate)
            };
        }));

        const pendingRegsCount = await RegularizationRequest.countDocuments({ company_id: companyId, status: 'pending' });
        const pendingLeavesCount = await LeaveApplication.countDocuments({ company_id: companyId, approval_status: 'pending' });

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
                company_id: companyId,
                isActive: true,
                role: { $ne: 'ADMIN' },
                _id: { $nin: [...presentUserIds, ...onLeaveUserIds] }
            })
                .limit(50)
                .populate('department_id', 'department_name'),

            // Late arrivals (those with record but marked late)
            AttendanceRecord.find({
                company_id: companyId,
                attendance_date: { $gte: todayStart, $lte: todayEnd },
                is_late: true
            }).limit(10).populate('employee_id', 'first_name last_name username'),

            // Pending Leaves
            LeaveApplication.find({ company_id: companyId, approval_status: 'pending' })
                .sort({ from_date: 1 }).limit(10)
                .populate('employee_id', 'first_name last_name username'),

            // Pending Regularizations
            RegularizationRequest.find({ company_id: companyId, status: 'pending' })
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
                name: emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.username : 'Unknown',
                department: emp?.department_id?.department_name || r.department || 'Staff',
                status: status,
                first_in: r.first_in,
                late_by: r.late_by_minutes
            };
        });

        const formatAppRec = (recs, kind) => recs.map(r => ({
            id: r._id,
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

        const employees = await User.find({ company_id: companyId, role: 'EMPLOYEE' })
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

        const record = await AttendanceRecord.findOne({
            employee_id: user._id,
            attendance_date: moment.utc(todayStr).toDate()
        });

        // Use SAME logic as punch check
        const isCurrentlyIn = user.current_status === 'in_office' && user.last_punch_date && moment(user.last_punch_date).isAfter(now.clone().subtract(18, 'hours'));
        const isInSession = isCurrentlyIn || (record?.first_in && !record?.last_out);

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
        const userQuery = {
            company_id: companyId,
            isActive: true
        };

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
        
        // Debug: Check how many users exist with this company_id
        const totalUsersWithCompany = await User.countDocuments({ company_id: companyId });
        const totalActiveUsers = await User.countDocuments({ company_id: companyId, isActive: true });
        console.log(`[Admin Report] Company ${companyId}: Total users=${totalUsersWithCompany}, Active=${totalActiveUsers}, Query result=${employees.length}`);
        
        const employeeIds = employees.map(e => e._id);


        // 2. Fetch Bulk Data (Records, Leaves, Holidays)
        const company = await Company.findById(companyId); // Fetch company here for WorkingDayEngine
        if (!company) {
            return res.status(400).json({ message: `Company not found for id: ${companyId}. Please select a valid company.` });
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
                company_id: company._id,
                holiday_date: { $gte: start, $lte: end }
            })
        ]);

        // Pre-index for O(1) lookups
        const holidayDates = holidays.map(h => moment.utc(h.holiday_date).format('YYYY-MM-DD'));

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

        // 2. Fetch Existing Record
        const record = await AttendanceRecord.findOne({ _id: id, company_id: companyId });
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

// --- PRIVATE HELPERS ---
async function recalculatePunctuality(record, employee, company) {
    const tz = company?.timezone || 'Asia/Kolkata';
    const dateStr = moment(record.attendance_date).format('YYYY-MM-DD');
    const shiftId = record.shift_id || employee.shift_id;
    const shift = shiftId ? await Shift.findById(shiftId) : null;
    const dept = employee.department_id ? await Department.findById(employee.department_id) : null;

    if (record.first_in && shift) {
        const shiftStart = moment.tz(`${dateStr} ${shift.start_time}`, 'YYYY-MM-DD HH:mm', tz);
        const punchIn = moment(record.first_in).tz(tz);
        const grace = shift.grace_in_minutes || 15;

        record.is_late = punchIn.isAfter(shiftStart.clone().add(grace, 'minutes'));
        record.late_by_minutes = record.is_late ? punchIn.diff(shiftStart, 'minutes') : 0;
        record.is_early_in = punchIn.isBefore(shiftStart);
        record.early_in_minutes = record.is_early_in ? shiftStart.diff(punchIn, 'minutes') : 0;
    }

    if (record.last_out && shift) {
        const shiftEnd = moment.tz(`${dateStr} ${shift.end_time}`, 'YYYY-MM-DD HH:mm', tz);
        const punchOut = moment(record.last_out).tz(tz);
        record.is_early_exit = punchOut.isBefore(shiftEnd.clone().subtract(15, 'minutes'));
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

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid employee ID format' });
        }

        if (req.user.role !== 'ADMIN' && req.user.role !== 'HOD') {
            return res.status(403).json({ message: 'Unauthorized profile access' });
        }

        if (req.user.role === 'HOD') {
            const hodTeams = await TeamModel.find({ hodId: req.user._id, isActive: { $ne: false } });
            const isInTeam = hodTeams.some(team =>
                team.members?.some(m => m.userId?.toString() === id.toString())
            );
            if (!isInTeam) {
                return res.status(403).json({ message: 'Employee not in your team' });
            }
        }

        const employee = await User.findById(id)
            .populate('department_id shift_id hod_id company_id')
            .lean();

        if (!employee) return res.status(404).json({ message: 'Employee not found in records' });

        // Normalize dates safely
        let start = moment(startDate || new Date()).startOf('day').toDate();
        let end = moment(endDate || new Date()).endOf('day').toDate();

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
            }).lean(),

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
                approval_status: 'pending'
            }).populate('leave_policy_id', 'leave_type policy_name').lean(),

            RegularizationRequest.find({
                employee_id: id,
                status: 'pending'
            }).lean()
        ]);

        const [attendance, balances, leaves, holidays, pendingLeaves, pendingRegularizations] = results;

        return res.json({
            success: true,
            employee,
            attendance,
            balances,
            leaves,
            holidays,
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
