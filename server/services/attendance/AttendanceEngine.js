import moment from 'moment-timezone';
import AttendanceRecord from '../../model/attendance/AttendanceRecord.js';
import AttendancePunch from '../../model/attendance/AttendancePunch.js';
import WorkingDayEngine from './WorkingDayEngine.js';
import PolicyResolver from './PolicyResolver.js';
import LeaveApplication from '../../model/attendance/LeaveApplication.js';


/**
 * AttendanceEngine handles processing of attendance records based on punches and configurations.
 */
class AttendanceEngine {
    /**
     * Processes attendance for a specific employee and date.
     * @param {Object} user - User object with population
     * @param {string} date - Date string 'YYYY-MM-DD'
     * @param {Object} company - Company configuration
     * @param {Object} shift - Shift configuration
     * @returns {Promise<Object>} The processed record
     */
    static async processDaily(user, date, company, shift) {
        const tz = company?.timezone || 'Asia/Kolkata';
        const now = moment().tz(tz);
        const isToday = moment(date).isSame(now, 'day');

        let punches = await AttendancePunch.find({
            employee_id: user._id,
            punch_date: date
        }).sort({ punch_time: 1 });

        const inPunch  = punches.find(p => p.punch_type === 'IN');
        const outPunch = punches.find(p => p.punch_type === 'OUT');

        // --- Resolve Policies ---
        const year = moment(date).year();
        const { weekOffPolicy, holidayPolicy } = await PolicyResolver.resolveAll(user, year);

        const { isOff: isWeeklyOff, isHalfDay: isWeeklyOffHalfDay } = PolicyResolver.resolveWeeklyOffStatus(date, weekOffPolicy);
        const { isHoliday, name: holidayName } = holidayPolicy
            ? PolicyResolver.resolveHolidayStatus(date, holidayPolicy)
            : await WorkingDayEngine.getHolidayInfo(date, user.company_id);

        // Priority: leave > holiday > weekly_off > attendance
        let status = 'absent';
        let recordIsHalfDay = false;

        if (isWeeklyOff && !isWeeklyOffHalfDay) status = 'weekly_off';
        if (isHoliday) status = 'holiday';

        // Check for full-day approved leave first
        const startOfDay = moment.utc(date).startOf('day').toDate();
        const endOfDay = moment.utc(date).endOf('day').toDate();
        const fullLeave = await LeaveApplication.findOne({
            employee_id: user._id,
            approval_status: 'approved',
            from_date: { $lte: endOfDay },
            to_date: { $gte: startOfDay },
            is_half_day: false
        });

        let leaveId = null;
        if (fullLeave) {
            status = 'leave';
            leaveId = fullLeave._id;
        }

        let totalWorkHours = 0;
        let cumulativeMs = 0;
        let lastInPunch = null;

        punches.forEach(punch => {
            if (punch.punch_type === 'IN') {
                lastInPunch = punch;
            } else if (punch.punch_type === 'OUT' && lastInPunch) {
                cumulativeMs += (punch.punch_time - lastInPunch.punch_time);
                lastInPunch = null;
            }
        });

        // If currently punched IN, add time until now for current session in "live" stats
        // But for stored totalWorkHours, we only store completed sessions plus maybe live?
        // Usually stored is completed. Let's store completed.
        totalWorkHours = cumulativeMs / (1000 * 60 * 60);

        let isLate = false;
        let lateMinutes = 0;
        let isEarlyExit = false;
        let earlyExitMinutes = 0;
        let isEarlyIn = false;
        let earlyInMinutes = 0;

        const firstIn = punches.find(p => p.punch_type === 'IN');
        const absoluteLastPunch = punches[punches.length - 1];
        const lastOut = (absoluteLastPunch && absoluteLastPunch.punch_type === 'OUT') ? absoluteLastPunch : null;

        // If employee punched in
        if (firstIn) {
            status = 'present'; // Default if they punched

            // Apply Shift Rules
            let leave = null;
            if (shift) {
                const shiftStart = moment.tz(`${date} ${shift.start_time}`, 'YYYY-MM-DD HH:mm', tz);
                let shiftEnd = moment.tz(`${date} ${shift.end_time}`, 'YYYY-MM-DD HH:mm', tz);

                // For cross-day shifts, the end time is on the next day
                if (shift.is_cross_day || shiftEnd.isSameOrBefore(shiftStart)) {
                    shiftEnd.add(1, 'days');
                }

                const punchInTime = moment(firstIn.punch_time).tz(tz);
                const lateAllowed = shift.late_allowed_minutes || 0;
                const earlyLeaveAllowed = shift.early_leave_allowed_minutes || 0;

                // Detect if buffer is exceeded
                if (punchInTime.isAfter(shiftStart.clone().add(lateAllowed, 'minutes'))) {
                    isLate = true;
                    // If exceeded, calculate from actual shift start
                    lateMinutes = punchInTime.diff(shiftStart, 'minutes');
                }

                // Early In Logic (No changes needed, but keeping for context)
                if (punchInTime.isBefore(shiftStart)) {
                    isEarlyIn = true;
                    earlyInMinutes = shiftStart.diff(punchInTime, 'minutes');
                }

                // Early Exit Logic with Buffer
                if (lastOut) {
                    const punchOutTime = moment(lastOut.punch_time).tz(tz);

                    if (punchOutTime.isBefore(shiftEnd.clone().subtract(earlyLeaveAllowed, 'minutes'))) {
                        isEarlyExit = true;
                        // If exceeded, calculate from actual shift end
                        earlyExitMinutes = shiftEnd.diff(punchOutTime, 'minutes');
                    }
                }

                // Thresholds for status determination
                const deptHalfDayThreshold = user.department_id?.half_day_hours;
                const deptFullDayThreshold = user.department_id?.full_day_hours;

                const fullDayThreshold = shift.full_day_hours || deptFullDayThreshold || company.attendance_config?.full_day_threshold_hours || 8;
                const halfDayThreshold = shift.half_day_hours || deptHalfDayThreshold || company.attendance_config?.half_day_threshold_hours || 4;

                const isShiftOver = now.isAfter(shiftEnd);
                const isCurrentlyPunchedOut = !lastInPunch;
                const hoursSinceLastPunch = lastOut ? now.diff(moment(lastOut.punch_time).tz(tz), 'hours') : 0;
                const hoursSinceIn = lastInPunch ? now.diff(moment(lastInPunch.punch_time).tz(tz), 'hours', true) : 0;
                const isGapTooLarge = isCurrentlyPunchedOut && hoursSinceLastPunch >= 4;

                // Determine status based on cumulative work hours
                let effectiveHours = totalWorkHours;
                if (lastInPunch) {
                    const inTime = moment(lastInPunch.punch_time).tz(tz);
                    effectiveHours += Math.max(0, now.diff(inTime, 'hours', true));
                }

                // Half-Day weekly off: only 50% of normal hours required
                let adjustedFullDay = fullDayThreshold;
                let adjustedHalfDay = halfDayThreshold;
                if (isWeeklyOffHalfDay) {
                    adjustedFullDay = fullDayThreshold / 2;
                    adjustedHalfDay = halfDayThreshold / 2;
                }

                // --- ADVANCED HALF-DAY INTEGRATION ---
                // Query for approved half-day leaves on this date
                const startOfDay = moment.utc(date).startOf('day').toDate();
                const endOfDay = moment.utc(date).endOf('day').toDate();
                leave = await LeaveApplication.findOne({
                    employee_id: user._id,
                    approval_status: 'approved',
                    from_date: { $lte: endOfDay },
                    to_date: { $gte: startOfDay },
                    is_half_day: true
                }).select('half_day_session');

                const isHalfDayByLeave = !!leave;

                let isHalfDayFlag = false;

                // --- PRIORITY LOGIC ---
                if (isHalfDayByLeave) {
                    isHalfDayFlag = true;
                    leaveId = leave._id;
                    if (effectiveHours > adjustedHalfDay) {
                         status = 'present';
                    } else {
                         status = 'half_day';
                    }
                } else if (effectiveHours >= adjustedFullDay) {
                    status = 'present';
                } else if (effectiveHours <= adjustedHalfDay) {
                    // Only finalize as half_day if shift is over and it's not today, or if it's been > 12h
                    if ((!isToday && (isShiftOver || hoursSinceIn > 12)) || isCurrentlyPunchedOut) {
                        status = 'half_day';
                        isHalfDayFlag = true;
                        isLate = false;
                    } else {
                        status = 'present';
                    }
                } else {
                    if ((!isToday && (isShiftOver || hoursSinceIn > 12)) || isGapTooLarge || isCurrentlyPunchedOut) {
                         status = 'half_day';
                         isHalfDayFlag = true;
                         isLate = false;
                    } else {
                         status = 'present';
                    }
                }

                // ✅ Fix: Don't mark as incomplete until 12 hours after punch-in
                if (!isToday && lastInPunch && status === 'present' && hoursSinceIn > 12) {
                    status = 'incomplete';
                    isHalfDayFlag = false;
                }

                recordIsHalfDay = isHalfDayFlag;

            }

            // Overtime Calculation
            let overtimeHours = 0;
            if (company.payroll_config?.overtime_enabled && lastOut && shift) {
                let shiftEnd = moment.tz(`${date} ${shift.end_time}`, 'YYYY-MM-DD HH:mm', tz);
                if (shift.is_cross_day || shiftEnd.isSameOrBefore(shiftStart)) {
                    shiftEnd.add(1, 'days');
                }
                const punchOutTime = moment(lastOut.punch_time).tz(tz);
                const threshold = shift.overtime_threshold_minutes || company.payroll_config.overtime_threshold_hours * 60 || 30;

                if (punchOutTime.isAfter(shiftEnd.add(threshold, 'minutes'))) {
                    overtimeHours = punchOutTime.diff(shiftEnd, 'hours', true);
                }
            }

            const empId = user._id?._id || user._id;
            const compId = user.company_id?._id || user.company_id;
            const deptId = user.department_id?._id || user.department_id;

            // Strictly normalize to UTC midnight for date-only fields
            const attendanceDate = moment.utc(date).startOf('day').toDate();

            const existingRecordAdminCheck = await AttendanceRecord.findOne({
                employee_id: empId,
                attendance_date: attendanceDate
            });

            if (existingRecordAdminCheck && existingRecordAdminCheck.processed_by === 'admin') {
                return existingRecordAdminCheck; // Admin manually edited this, do not overwrite metrics
            }

            return await AttendanceRecord.findOneAndUpdate(
                { employee_id: empId, attendance_date: attendanceDate },
                {
                    company_id: compId,
                    department_id: deptId,
                    shift_id: shift ? (shift._id?._id || shift._id) : null,
                    first_in: firstIn.punch_time,
                    last_out: lastOut ? lastOut.punch_time : null,
                    total_punches: punches.length,
                    total_work_hours: totalWorkHours,
                    status: status,
                    is_late: isLate,
                    late_by_minutes: lateMinutes,
                    is_early_exit: isEarlyExit,
                    early_exit_minutes: earlyExitMinutes,
                    overtime_hours: overtimeHours,
                    year_month: moment.utc(date).format('YYYY-MM'),
                    processed_at: new Date(),
                    processed_by: 'system',
                    is_half_day: recordIsHalfDay,
                    half_day_session: leave?.half_day_session,
                    is_on_leave: !!leaveId,
                    leave_application_id: leaveId
                },
                { upsert: true, returnDocument: 'after' }
            );
        } else {
            const empId = user._id?._id || user._id;
            const compId = user.company_id?._id || user.company_id;
            const deptId = user.department_id?._id || user.department_id;
            const attendanceDate = moment.utc(date).startOf('day').toDate();

            // ✅ Don't mark absent for today until 4 hours after shift start
            if (status === 'absent' && company && shift) {
                const shiftStart = moment.tz(`${date} ${shift.start_time}`, 'YYYY-MM-DD HH:mm', tz);
                const fourHourMark = shiftStart.clone().add(4, 'hours');
                
                // If it's still within 4 hours of shift start, don't finalize as absent yet
                if (now.isBefore(fourHourMark)) {
                    return null;
                }
            }

            const existingRecord = await AttendanceRecord.findOne({
                employee_id: empId,
                attendance_date: attendanceDate
            });
            if (existingRecord && existingRecord.first_in) {
                return existingRecord;
            }

            return await AttendanceRecord.findOneAndUpdate(
                { employee_id: empId, attendance_date: attendanceDate },
                {
                    company_id: compId,
                    department_id: deptId,
                    status: status,
                    is_on_leave: !!leaveId,
                    leave_application_id: leaveId,
                    year_month: moment.utc(date).format('YYYY-MM'),
                    total_work_hours: 0,
                    processed_at: new Date(),
                    processed_by: 'system'
                },
                { upsert: true, returnDocument: 'after' }
            );
        }
    }
}

export default AttendanceEngine;
