import moment from 'moment';
import Holiday from '../../model/attendance/Holiday.js';

/**
 * WorkingDayEngine handles logic related to working patterns, holidays, and weekly offs.
 */
class WorkingDayEngine {
    /**
     * Determines if a specific date is a weekly off for a company/shift.
     * @param {Date|moment|string} targetDate 
     * @param {Object} company 
     * @param {Object} shift 
     * @returns {boolean}
     */
    static isWeeklyOff(targetDate, company, shift, department) {
        const date = moment(targetDate);
        const dayOfWeek = date.day(); // 0 (Sun) to 6 (Sat)

        // 1. Check Shift specific weekly offs (highest priority)
        if (shift) {
            // Check explicit weekly off days
            if (shift.weekly_off_days && shift.weekly_off_days.length > 0) {
                if (shift.weekly_off_days.includes(dayOfWeek)) {
                    return true;
                }
            }

            // Check alternate saturday pattern
            if (dayOfWeek === 6 && shift.alternate_saturday_pattern) {
                const pattern = shift.alternate_saturday_pattern.toString().split(',').map(s => parseInt(s.trim()));
                const weekOfMonth = Math.ceil(date.date() / 7);
                if (pattern.includes(weekOfMonth)) return true;
            }
        }

        // 2. Check Department level (intermediate priority)
        if (department) {
            if (department.weekly_off_days && department.weekly_off_days.length > 0) {
                if (department.weekly_off_days.includes(dayOfWeek)) {
                    return true;
                }
            }
            if (dayOfWeek === 6 && department.alternate_saturday_pattern) {
                const pattern = department.alternate_saturday_pattern.toString().split(',').map(s => parseInt(s.trim()));
                const weekOfMonth = Math.ceil(date.date() / 7);
                if (pattern.includes(weekOfMonth)) return true;
            }
        }

        // 3. Fallback to Company settings
        if (company && company.settings) {
            const pattern = company.settings.working_pattern;

            if (pattern === '5_days_week') {
                return (dayOfWeek === 0 || dayOfWeek === 6); // Sat, Sun
            } else if (pattern === '6_days_week') {
                return (dayOfWeek === 0); // Sun
            } else if (pattern === 'alternate_saturday') {
                if (dayOfWeek === 0) return true; // Sun is always off
                if (dayOfWeek === 6) {
                    // Calculate which Saturday of the month it is
                    const weekOfMonth = Math.ceil(date.date() / 7);
                    return (weekOfMonth === 2 || weekOfMonth === 4); // 2nd and 4th Sat off
                }
            }
        }

        // Default: Sunday off
        return dayOfWeek === 0;
    }

    /**
     * Checks if a date is a holiday.
     * @param {Date|moment|string} targetDate 
     * @param {string} companyId 
     * @returns {Promise<Object|null>}
     */
    static async getHoliday(targetDate, companyId) {
        const dateStr = moment(targetDate).format('YYYY-MM-DD');
        const holiday = await Holiday.findOne({
            company_id: companyId,
            holiday_date: new Date(dateStr)
        });
        return holiday;
    }

    /**
     * Calculates working days, weekly offs, and holidays in a date range.
     * @param {moment} start 
     * @param {moment} end 
     * @param {Object} company 
     * @param {Object} shift 
     * @returns {Promise<Object>}
     */
    static async getSummaryInRange(start, end, company, shift, department) {
        const companyId = company._id || company;
        const holidays = await Holiday.find({
            company_id: companyId,
            holiday_date: { $gte: start.toDate(), $lte: end.toDate() }
        });
        const holidayDates = holidays.map(h => moment(h.holiday_date).format('YYYY-MM-DD'));

        let workingDaysCount = 0;
        let weeklyOffsCount = 0;
        let holidaysCount = 0;

        let curr = moment(start).startOf('day');
        const last = moment(end).startOf('day');

        while (curr.isSameOrBefore(last)) {
            const dateStr = curr.format('YYYY-MM-DD');
            const isOff = this.isWeeklyOff(curr, company, shift, department);
            const isHoliday = holidayDates.includes(dateStr);

            if (isOff) {
                weeklyOffsCount++;
            } else if (isHoliday) {
                holidaysCount++;
            } else {
                workingDaysCount++;
            }
            curr.add(1, 'day');
        }

        return {
            workingDaysCount,
            weeklyOffsCount,
            holidaysCount,
            totalDays: workingDaysCount + weeklyOffsCount + holidaysCount
        };
    }
}

export default WorkingDayEngine;
