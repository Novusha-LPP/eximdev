import moment from 'moment-timezone';
import AttendanceRecord from '../../model/attendance/AttendanceRecord.js';
import AttendancePunch from '../../model/attendance/AttendancePunch.js';
import WorkingDayEngine from './WorkingDayEngine.js';
import LeaveApplication from '../../model/attendance/LeaveApplication.js';
import User from '../../model/userModel.mjs';


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

        // --- AUTO PUNCH MISSING OUT logic ---
        const lastPunchObj = punches.length > 0 ? punches[punches.length - 1] : null;
        if (lastPunchObj && lastPunchObj.punch_type === 'IN') {

            if (shift && shift.end_time) {
                const shiftEnd = moment.tz(`${date} ${shift.end_time}`, 'YYYY-MM-DD HH:mm', tz);
                const autoPunchThreshold = shiftEnd.clone().add(2, 'hours'); // Auto punch 2 hours after shift end

                if (!isToday || (isToday && now.isAfter(autoPunchThreshold))) {
                   // console.log(`[ENGINE] Auto-punching OUT for user ${user._id} on ${date}`);
                    const autoPunch = new AttendancePunch({
                        employee_id: user._id,
                        company_id: user.company_id,
                        punch_type: 'OUT',
                        punch_time: shiftEnd.toDate(),
                        punch_date: date,
                        punch_method: 'auto'
                    });
                    await autoPunch.save();

                    // Update user's current status if they are being auto-punched OUT
                    await User.findByIdAndUpdate(user._id, { current_status: 'out_office' });

                    // Refresh punches list
                    punches = await AttendancePunch.find({
                        employee_id: user._id,
                        punch_date: date
                    }).sort({ punch_time: 1 });
                }
            }
        }

        const inPunch = punches.find(p => p.punch_type === 'IN');
        const outPunch = punches.find(p => p.punch_type === 'OUT');

        const isWeeklyOff = WorkingDayEngine.isWeeklyOff(date, company, shift, user.department_id);
        const holiday = await WorkingDayEngine.getHoliday(date, company._id);

        let status = 'absent';
        let recordIsHalfDay = false;
        if (isWeeklyOff) status = 'weekly_off';
        if (holiday) status = 'holiday';

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
                const shiftEnd = moment.tz(`${date} ${shift.end_time}`, 'YYYY-MM-DD HH:mm', tz);

                // Late Mark Logic
                const graceIn = shift.grace_in_minutes ?? company.attendance_config?.grace_in_minutes ?? 15;
                const graceThreshold = shiftStart.clone().add(graceIn, 'minutes');
                const punchInTime = moment(firstIn.punch_time).tz(tz);

                if (punchInTime.isAfter(graceThreshold)) {
                    isLate = true;
                    lateMinutes = punchInTime.diff(graceThreshold, 'minutes');
                }

                // Early In Logic
                if (punchInTime.isBefore(shiftStart)) {
                    isEarlyIn = true;
                    earlyInMinutes = shiftStart.diff(punchInTime, 'minutes');
                }

                // Early Exit Logic
                if (lastOut) {
                    const graceOut = shift.grace_out_minutes ?? company.attendance_config?.grace_out_minutes ?? 15;
                    const punchOutTime = moment(lastOut.punch_time).tz(tz);

                    if (punchOutTime.isBefore(shiftEnd.clone().subtract(graceOut, 'minutes'))) {
                        isEarlyExit = true;
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
                const isGapTooLarge = isCurrentlyPunchedOut && hoursSinceLastPunch >= 4;

                // Determine status based on cumulative work hours
                let effectiveHours = totalWorkHours;
                if (lastInPunch) {
                    const inTime = moment(lastInPunch.punch_time).tz(tz);
                    effectiveHours += Math.max(0, now.diff(inTime, 'hours', true));
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
                    // If they have half day leave AND worked half day, they are PRESENT (Total 1.0)
                    if (effectiveHours > halfDayThreshold) {
                         status = 'present';
                    } else {
                         status = 'half_day';
                    }
                } else if (effectiveHours >= fullDayThreshold) {
                    status = 'present';
                } else if (effectiveHours <= halfDayThreshold) {
                    // Automatically mark as half-day if day is over/shift over/punched out
                    if (!isToday || isShiftOver || isCurrentlyPunchedOut) {
                        status = 'half_day';
                        isHalfDayFlag = true;
                        isLate = false; 
                    } else {
                        status = 'present'; 
                    }
                } else {
                    // Between half and full threshold (e.g. 5 hours if thresholds are 4 and 8)
                    if (!isToday || isShiftOver || isGapTooLarge || isCurrentlyPunchedOut) {
                         status = 'half_day';
                         isHalfDayFlag = true;
                         isLate = false;
                    } else {
                         status = 'present';
                    }
                }

                recordIsHalfDay = isHalfDayFlag;
            }

            // Overtime Calculation
            let overtimeHours = 0;
            if (company.payroll_config?.overtime_enabled && lastOut && shift) {
                const shiftEnd = moment(`${date} ${shift.end_time}`, 'YYYY-MM-DD HH:mm');
                const punchOutTime = moment(lastOut.punch_time);
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
                    is_auto_punch_out: lastOut?.punch_method === 'auto',
                    total_punches: punches.length,
                    total_work_hours: totalWorkHours,
                    status: status,
                    is_late: isLate,
                    late_by_minutes: lateMinutes,
                    is_early_exit: isEarlyExit,
                    early_exit_minutes: earlyExitMinutes,
                    is_early_in: isEarlyIn,
                    early_in_minutes: earlyInMinutes,
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
                if (isToday) {
                    const shiftStart = moment.tz(`${date} ${shift.start_time}`, 'YYYY-MM-DD HH:mm', tz);
                    const fourHourMark = shiftStart.clone().add(4, 'hours');
                    if (now.isBefore(fourHourMark)) {
                        // Too early to mark absent — skip writing record
                        return null;
                    }
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
                    is_auto_punch_out: false,
                    processed_at: new Date(),
                    processed_by: 'system'
                },
                { upsert: true, returnDocument: 'after' }
            );
        }
    }
}

export default AttendanceEngine;
