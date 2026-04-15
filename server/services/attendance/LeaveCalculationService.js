import moment from 'moment';
import WorkingDayEngine from './WorkingDayEngine.js';

class LeaveCalculationService {
    static PRESENCE_STATUSES = new Set(['present', 'half_day', 'on_duty']);

    static getWorkedHours(record) {
        if (!record) return 0;

        const net = Number(record.net_work_hours || 0);
        if (Number.isFinite(net) && net > 0) return net;

        const total = Number(record.total_work_hours || 0);
        if (Number.isFinite(total) && total > 0) return total;

        if (record.first_in && record.last_out) {
            const minutes = moment(record.last_out).diff(moment(record.first_in), 'minutes');
            return minutes > 0 ? minutes / 60 : 0;
        }

        return 0;
    }

    static isPresentDay({ record, hasHalfDayLeave, presenceThresholdHours }) {
        if (hasHalfDayLeave) return true;
        if (!record) return false;

        const workedHours = this.getWorkedHours(record);
        if (workedHours >= presenceThresholdHours) return true;

        return false;
    }

    static getBoundaryPresence(sideContext, fallbackStatus, presenceThresholdHours) {
        if (sideContext && typeof sideContext === 'object') {
            if (sideContext.exists === false) {
                return { present: false, exists: false };
            }

            const status = String(sideContext.status || '').toLowerCase();
            const workedHours = this.getWorkedHours(sideContext);
            const present = workedHours >= presenceThresholdHours
                || (this.PRESENCE_STATUSES.has(status) && workedHours >= presenceThresholdHours);

            return { present, exists: true };
        }

        const normalized = String(fallbackStatus || '').toLowerCase();
        return { present: this.PRESENCE_STATUSES.has(normalized), exists: true };
    }

    static findNearestWorkingIndex(days, startIndex, direction) {
        for (let i = startIndex + direction; i >= 0 && i < days.length; i += direction) {
            if (days[i].isWorking) return i;
        }
        return -1;
    }

    /**
     * Calculates the total days to be deducted for a leave request.
     * Considers: Weekly Offs, Holidays, and the Sandwich Rule.
     */
    static async calculateLeaveDays({ 
        fromDate, toDate, isHalfDay, isStartHalfDay, isEndHalfDay, 
        startHalfSession, endHalfSession,
        policy, company, weekOffPolicy, holidayPolicy, boundaryContext,
        attendanceRecords = [],
        presenceThresholdHours = 4
    }) {
        const start = moment(fromDate).startOf('day');
        const end = moment(toDate || fromDate).startOf('day');
        
        // Single day half-day is a special case
        if (isHalfDay) {
            return {
                totalDays: 0.5,
                appliedDays: 0.5,
                sandwichDays: 0,
                total_range_days: 1,
                working_leave_days: 0.5,
                holiday_days: 0,
                sandwich_days: 0,
                deducted_days: 0.5,
                breakdown: {
                    total_range: 1,
                    working_days: 0.5,
                    holiday_days: 0,
                    weekly_off_days: 0,
                    sandwich_days: 0,
                    deducted_days: 0.5
                },
                details: [{ date: start.format('YYYY-MM-DD'), type: 'half_day', count: 0.5 }]
            };
        }

        const attendanceByDate = new Map(
            (attendanceRecords || []).map((record) => [
                moment(record.attendance_date).format('YYYY-MM-DD'),
                record
            ])
        );

        const details = [];
        let workingLeaveDays = 0;
        let sandwichDays = 0;
        let holidayDays = 0;
        let weeklyOffDays = 0;

        // Prepare range days
        const days = [];
        let curr = moment(start);
        while (curr.isSameOrBefore(end, 'day')) {
            const isOff = WorkingDayEngine.isWeeklyOff(curr, company, weekOffPolicy);
            const holidayInfo = await WorkingDayEngine.getHolidayInfo(curr, company._id || company, holidayPolicy);
            const holiday = (holidayInfo.isHoliday || holidayInfo.isOptional) ? { holiday_name: holidayInfo.name } : null;
            const dateStr = curr.format('YYYY-MM-DD');
            
            days.push({
                date: moment(curr),
                dateStr,
                isOff,
                holiday,
                isWorking: !isOff && !holiday,
                attendance: attendanceByDate.get(dateStr) || null
            });
            curr.add(1, 'day');
        }

        const total_range = days.length;

        const beforeBoundary = this.getBoundaryPresence(
            boundaryContext?.before,
            boundaryContext?.before,
            presenceThresholdHours
        );
        const afterBoundary = this.getBoundaryPresence(
            boundaryContext?.after,
            boundaryContext?.after,
            presenceThresholdHours
        );

        const dayPresence = new Map();

        for (let i = 0; i < days.length; i++) {
            const day = days[i];
            const hasHalfDayLeave = (i === 0 && isStartHalfDay) || (i === days.length - 1 && isEndHalfDay);
            dayPresence.set(
                day.dateStr,
                this.isPresentDay({
                    record: day.attendance,
                    hasHalfDayLeave,
                    presenceThresholdHours
                })
            );
        }

        // Process days and apply sandwich logic
        for (let i = 0; i < days.length; i++) {
            const day = days[i];
            
            if (!day.isWorking) {
                // Gap day (Holiday or Week-Off)
                if (day.isOff) weeklyOffDays++;
                else holidayDays++;

                const leftIndex = this.findNearestWorkingIndex(days, i, -1);
                const rightIndex = this.findNearestWorkingIndex(days, i, 1);

                const leftResolved = leftIndex >= 0
                    ? { absent: !dayPresence.get(days[leftIndex].dateStr), exists: true }
                    : { absent: !beforeBoundary.present, exists: beforeBoundary.exists };
                const rightResolved = rightIndex >= 0
                    ? { absent: !dayPresence.get(days[rightIndex].dateStr), exists: true }
                    : { absent: !afterBoundary.present, exists: afterBoundary.exists };

                const hasBothSides = leftResolved.exists && rightResolved.exists;
                const leftAbsent = leftResolved.absent;
                const rightAbsent = rightResolved.absent;

                if (hasBothSides && leftAbsent && rightAbsent) {
                    sandwichDays++;
                    details.push({ date: day.dateStr, type: day.isOff ? 'weekly_off' : 'holiday', count: 1, sandwiched: true });
                } else {
                    details.push({ date: day.dateStr, type: day.isOff ? 'weekly_off' : 'holiday', count: 0, sandwiched: false });
                }

            } else {
                // Working day
                let count = 1;
                if (i === 0 && isStartHalfDay) count = 0.5;
                if (i === days.length - 1 && isEndHalfDay) {
                    count = 0.5;
                }

                const isPresent = dayPresence.get(day.dateStr);
                const deducted = count; // Deduct the requested leave days regardless of presence
                
                workingLeaveDays += deducted;
                details.push({
                    date: day.dateStr,
                    type: 'working_day',
                    count: deducted,
                    present: Boolean(isPresent)
                });
            }
        }

        const deductedDays = workingLeaveDays + sandwichDays;
        const nonWorkingDays = holidayDays + weeklyOffDays;

        return {
            totalDays: deductedDays,
            appliedDays: workingLeaveDays,
            sandwichDays,
            total_range_days: total_range,
            working_leave_days: workingLeaveDays,
            holiday_days: nonWorkingDays,
            sandwich_days: sandwichDays,
            deducted_days: deductedDays,
            breakdown: {
                total_range,
                working_days: workingLeaveDays,
                holiday_days: holidayDays,
                weekly_off_days: weeklyOffDays,
                sandwich_days: sandwichDays,
                deducted_days: deductedDays,
                start_half_session: isStartHalfDay ? startHalfSession : null,
                end_half_session: isEndHalfDay ? endHalfSession : null
            },
            details
        };
    }

    /**
     * Enhanced Sandwich Rule: Checks if the leave is adjacent to holidays/offs 
     * and extends the range if the policy defines it that way.
     * (Currently, the simple range-based sandwich is implemented above).
     */
}

export default LeaveCalculationService;
