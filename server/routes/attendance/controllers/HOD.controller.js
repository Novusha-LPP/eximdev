const AttendanceRecord = require('../models/AttendanceRecord');
const LeaveApplication = require('../models/LeaveApplication');
const User = require('../models/User');
const Department = require('../models/Department');
const Holiday = require('../models/Holiday');
const moment = require('moment');
const fs = require('fs');

// Get HOD Dashboard Data
exports.getDashboard = async (req, res) => {
    try {
        const hod = req.user;
        const { date } = req.query;
        // Use UTC for date-only comparison to match AttendanceEngine
        const targetDate = date ? moment.utc(date).startOf('day') : moment.utc().startOf('day');

        // Robust ID extraction
        const companyId = hod.company_id?._id || hod.company_id;
        const departmentId = hod.department_id?._id || hod.department_id;

        if (!departmentId && hod.role !== 'ADMIN') {
            return res.status(400).json({
                success: false,
                message: 'No department assigned to your account. Please contact Admin.'
            });
        }

        const debugLog = [];
        debugLog.push(`--- HOD DASHBOARD DEBUG ${new Date().toISOString()} ---`);
        debugLog.push(`HOD: ${hod.username} ID: ${hod._id}`);
        debugLog.push(`Query Dept: ${departmentId} Query Comp: ${companyId}`);

        // 1. Get all employees (Role-based filtering)
        const userQuery = { company_id: companyId, isActive: true };

        if (hod.role === 'ADMIN') {
            userQuery.role = { $in: ['EMPLOYEE', 'HOD', 'ADMIN'] };
            // If admin filters by date but we want all staff for the attendance summary
        } else {
            userQuery.department_id = departmentId;
            userQuery.role = 'EMPLOYEE';
        }

        let employees = await User.find(userQuery).select('_id first_name last_name username email role department_id');

        debugLog.push(`Initial employees in dept: ${employees.length}`);

        if (employees.length > 0) {
            debugLog.push(`Emp names: ${employees.map(e => e.username || e.first_name).join(', ')}`);
        }

        const employeeIds = employees.map(e => e._id);
        const totalEmployees = employees.length;

        const dateStr = targetDate.format('YYYY-MM-DD');
        debugLog.push(`Searching for attendance on: ${dateStr} for ${employeeIds.length} employees`);

        // 2. Get attendance records for the date
        const attendanceRecords = await AttendanceRecord.find({
            employee_id: { $in: employeeIds },
            attendance_date: dateStr
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
        const pendingLeaves = await LeaveApplication.find({
            employee_id: { $in: employeeIds },
            approval_status: 'pending'
        })
            .populate('employee_id', 'first_name last_name username')
            .populate('leave_policy_id', 'leave_type policy_name')
            .sort({ createdAt: -1 })
            .limit(10);

        // 5a. Get recently processed leave requests (History)
        const recentProcessedLeaves = await LeaveApplication.find({
            employee_id: { $in: employeeIds },
            approval_status: { $in: ['approved', 'rejected'] }
        })
            .populate('employee_id', 'first_name last_name username')
            .populate('leave_policy_id', 'leave_type policy_name')
            .sort({ updatedAt: -1 })
            .limit(10);

        // 6. Get pending regularizations
        const RegularizationRequest = require('../models/RegularizationRequest');
        const pendingRegularizations = await RegularizationRequest.find({
            employee_id: { $in: employeeIds },
            status: 'pending'
        })
            .populate('employee_id', 'first_name last_name username')
            .sort({ createdAt: -1 })
            .limit(10);

        // 7. Get department info
        const department = await Department.findById(departmentId);

        // 8. Build Team Calendar (7 days view)
        // ... existing code ...

        // 8. Build Team Calendar (7 days view)
        // Get current week's date range
        const startOfWeek = moment().startOf('week').add(1, 'day'); // Monday
        const endOfWeek = moment(startOfWeek).add(6, 'days'); // Sunday

        debugLog.push(`Calendar range: ${startOfWeek.format('YYYY-MM-DD')} to ${endOfWeek.format('YYYY-MM-DD')}`);

        // Fetch holidays for the week
        const weekHolidays = await Holiday.find({
            company_id: companyId,
            holiday_date: {
                $gte: startOfWeek.toDate(),
                $lte: endOfWeek.toDate()
            }
        });

        const holidayDatesSet = new Set(weekHolidays.map(h => moment(h.holiday_date).format('YYYY-MM-DD')));

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

        // Build team calendar
        const teamCalendar = employees.map(emp => {
            const empId = emp._id.toString();
            const attendance = {};

            // Generate 7 days of data
            for (let i = 0; i < 7; i++) {
                const currentDate = moment(startOfWeek).add(i, 'days');
                const dateStr = currentDate.format('YYYY-MM-DD');

                // Check if it's a holiday
                if (holidayDatesSet.has(dateStr)) {
                    attendance[dateStr] = 'holiday';
                    continue;
                }

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
                pendingLeaves: pendingLeaves.map(leave => ({
                    id: leave._id,
                    employeeName: leave.employee_id.first_name ? `${leave.employee_id.first_name} ${leave.employee_id.last_name || ''}`.trim() : leave.employee_id.username,
                    leaveType: leave.leave_policy_id?.leave_type || 'Unknown',
                    fromDate: leave.from_date,
                    toDate: leave.to_date,
                    totalDays: leave.total_days,
                    is_half_day: leave.is_half_day,
                    half_day_session: leave.half_day_session,
                    attachment_urls: leave.attachment_urls || [],
                    reason: leave.reason
                })),
                recentProcessedLeaves: recentProcessedLeaves.map(leave => ({
                    id: leave._id,
                    employeeName: leave.employee_id.first_name ? `${leave.employee_id.first_name} ${leave.employee_id.last_name || ''}`.trim() : leave.employee_id.username,
                    leaveType: leave.leave_policy_id?.leave_type || 'Unknown',
                    fromDate: leave.from_date,
                    toDate: leave.to_date,
                    totalDays: leave.total_days,
                    is_half_day: leave.is_half_day,
                    half_day_session: leave.half_day_session,
                    attachment_urls: leave.attachment_urls || [],
                    status: leave.approval_status,
                    actionDate: leave.updatedAt
                })),
                pendingRegularization: pendingRegularizations.map(reg => ({
                    id: reg._id,
                    employeeName: reg.employee_id.first_name ? `${reg.employee_id.first_name} ${reg.employee_id.last_name || ''}`.trim() : reg.employee_id.username,
                    date: reg.attendance_date,
                    type: reg.regularization_type,
                    reason: reg.reason
                })),
                department: {
                    name: department?.department_name || 'Department',
                    hodName: hod.first_name ? `${hod.first_name} ${hod.last_name || ''}`.trim() : (hod.name || hod.username)
                },
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
                    hodDept: departmentId,
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

// Unified Approve/Reject function (HOD)
exports.approveRequest = async (req, res) => {
    const debug = [];
    debug.push(`--- APPROVE REQUEST START ${new Date().toISOString()} ---`);
    try {
        const { id, type, status, comments } = req.body;
        const hod = req.user;

        debug.push(`Body: ${JSON.stringify(req.body)}`);
        debug.push(`HOD: ${hod.username} Dept: ${hod.department_id}`);

        if (type === 'leave') {
            const application = await LeaveApplication.findById(id).populate('employee_id', 'department_id');
            if (!application) {
                debug.push(`Application not found: ${id}`);
                fs.writeFileSync('hod_approve_debug.log', debug.join('\n'));
                return res.status(404).json({ message: 'Application not found' });
            }

            debug.push(`Found Application: ${application._id}`);
            debug.push(`Employee Dept: ${application.employee_id?.department_id}`);

            // Leave Hierarchy Rules
            const requesterId = application.employee_id?._id || application.employee_id;
            const hodId = hod._id?._id || hod._id;

            // 1. HOD cannot approve their own leave
            if (hod.role === 'HOD' && requesterId.toString() === hodId.toString()) {
                debug.push('SELF APPROVAL DENIED');
                fs.writeFileSync('hod_approve_debug.log', debug.join('\n'));
                return res.status(403).json({ message: 'Unauthorized: You cannot approve your own leave application' });
            }

            // 2. HOD can only approve leaves within their department
            if (hod.role === 'HOD') {
                const hodDeptId = hod.department_id?._id || hod.department_id;
                const empDeptId = application.employee_id?.department_id?._id || application.employee_id?.department_id;

                debug.push(`Comparing: HOD Dept ${hodDeptId} vs Emp Dept ${empDeptId}`);

                if (!empDeptId || !hodDeptId || empDeptId.toString() !== hodDeptId.toString()) {
                    debug.push('AUTHORIZATION FAILED (Dept Mismatch)');
                    fs.writeFileSync('hod_approve_debug.log', debug.join('\n'));
                    return res.status(403).json({ message: 'Unauthorized: Not your department' });
                }
            }

            // Note: Admin can approve everything.

            if (application.approval_status !== 'pending') {
                return res.status(400).json({ message: 'Request is no longer pending' });
            }

            application.approval_status = status;
            if (comments) application.comments = comments;
            await application.save();

            // Sync AttendanceRecord for the approved range (important for past dates)
            if (status === 'approved') {
                const start = moment(application.from_date).startOf('day');
                const end = moment(application.to_date).startOf('day');
                let curr = moment(start);

                while (curr.isSameOrBefore(end)) {
                    const dateStr = curr.format('YYYY-MM-DD');
                    const attDate = moment.utc(dateStr).startOf('day').toDate();

                    // We only update if status is absent or empty (normal case for retro leave)
                    // If they had punches, AttendanceEngine already handles half-day/present logic
                    await AttendanceRecord.findOneAndUpdate(
                        { employee_id: application.employee_id._id, attendance_date: attDate },
                        {
                            status: application.is_half_day ? 'half_day' : 'leave',
                            is_half_day: application.is_half_day || false,
                            half_day_session: application.half_day_session,
                            year_month: curr.format('YYYY-MM'),
                            processed_by: 'system_sync'
                        },
                        { upsert: true }
                    );
                    curr.add(1, 'day');
                }
            }

            // Update Leave Balance
            const LeaveBalance = require('../models/LeaveBalance');
            const LeavePolicy = require('../models/LeavePolicy');
            const currentYear = new Date().getFullYear();
            let balanceRecord = await LeaveBalance.findOne({
                employee_id: application.employee_id._id,
                leave_policy_id: application.leave_policy_id,
                year: currentYear
            });

            if (!balanceRecord) {
                const policy = await LeavePolicy.findById(application.leave_policy_id);
                balanceRecord = new LeaveBalance({
                    employee_id: application.employee_id._id,
                    company_id: application.company_id,
                    leave_policy_id: application.leave_policy_id,
                    leave_type: application.leave_type,
                    year: currentYear,
                    opening_balance: policy?.annual_quota || 0,
                    closing_balance: policy?.annual_quota || 0,
                    consumed: 0,
                    pending_approval: 0
                });
            }

            debug.push(`Updating LeaveBalance...`);
            const isUnpaid = application.leave_type === 'unpaid';

            if (status === 'approved') {
                balanceRecord.consumed += application.total_days;
                // If it was already locked in pending (normal system flow)
                if (balanceRecord.pending_approval >= application.total_days) {
                    balanceRecord.pending_approval -= application.total_days;
                    // For unpaid, we don't deduct from closing in applyLeave either, so stay consistent
                } else {
                    // Not in pending (seeded flow), deduct from closing now if NOT unpaid
                    if (!isUnpaid) {
                        balanceRecord.closing_balance -= application.total_days;
                    }
                }
            } else if (status === 'rejected') {
                // If it was locked in pending, move it back to closing (only if NOT unpaid, since it was never deducted)
                if (balanceRecord.pending_approval >= application.total_days) {
                    balanceRecord.pending_approval -= application.total_days;
                    if (!isUnpaid) {
                        balanceRecord.closing_balance += application.total_days;
                    }
                }
            }
            await balanceRecord.save();

            fs.writeFileSync('hod_approve_debug.log', debug.join('\n'));
            return res.json({ message: `Leave ${status} successfully` });
        } else if (type === 'regularization') {
            const RegularizationRequest = require('../models/RegularizationRequest');
            const request = await RegularizationRequest.findById(id).populate('employee_id', 'department_id');
            if (!request) return res.status(404).json({ message: 'Request not found' });

            // Authority check
            const hodDeptId = hod.department_id?._id || hod.department_id;
            const empDeptId = request.employee_id?.department_id?._id || request.employee_id?.department_id;

            if (!empDeptId || !hodDeptId || empDeptId.toString() !== hodDeptId.toString()) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            request.status = status;
            if (comments) request.remarks = comments;
            await request.save();

            // If approved, update attendance record
            if (status === 'approved') {
                const AttendanceRecord = require('../models/AttendanceRecord');
                const empId = request.employee_id?._id || request.employee_id;

                await AttendanceRecord.findOneAndUpdate(
                    { employee_id: empId, attendance_date: moment(request.attendance_date).startOf('day').toDate() },
                    {
                        first_in: request.requested_in_time || request.expected_in,
                        last_out: request.requested_out_time || request.expected_out,
                        status: 'present',
                        is_regularized: true,
                        processed_at: new Date(),
                        processed_by: 'hod'
                    },
                    { upsert: true }
                );
            }

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

// Department Attendance Report
exports.getDepartmentAttendanceReport = async (req, res) => {
    try {
        const hod = req.user;
        const { month } = req.query; // YYYY-MM

        if (!month) return res.status(400).json({ message: 'Month is required' });

        const startOfMonth = moment(month, 'YYYY-MM').startOf('month');
        const endOfMonth = moment(month, 'YYYY-MM').endOf('month');

        const companyId = hod.company_id?._id || hod.company_id;
        const departmentId = hod.department_id?._id || hod.department_id;

        if (!departmentId) {
            return res.status(400).json({ message: 'No department assigned' });
        }

        // 1. Get Employees
        const employees = await User.find({
            company_id: companyId,
            department_id: departmentId,
            role: 'EMPLOYEE',
            isActive: true
        }).select('_id first_name last_name username');

        const employeeIds = employees.map(e => e._id);

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