import moment from 'moment';
import PolicyResolver from './PolicyResolver.js';
import HolidayPolicy from '../../model/attendance/HolidayPolicy.js';

/**
 * WorkingDayEngine – delegates weekly-off & holiday checks to PolicyResolver.
 * The Shift model no longer stores weekly_off_days.
 */
class WorkingDayEngine {
  /**
   * Determines if a specific date is a weekly off for a user.
   * @param {Date|moment|string} targetDate
   * @param {Object} company
   * @param {Object|null} weekOffPolicy  – pre-resolved WeekOffPolicy (pass null to trigger resolution)
   * @returns {boolean}
   */
  static isWeeklyOff(targetDate, company, weekOffPolicy) {
    const { isOff } = PolicyResolver.resolveWeeklyOffStatus(targetDate, weekOffPolicy);
    return isOff;
  }

  /**
   * Whether the date is a half-day weekly off.
   * @param {Date|moment|string} targetDate
   * @param {Object|null} weekOffPolicy
   * @returns {boolean}
   */
  static isHalfDayWeeklyOff(targetDate, weekOffPolicy) {
    const { isOff, isHalfDay } = PolicyResolver.resolveWeeklyOffStatus(targetDate, weekOffPolicy);
    return isOff && isHalfDay;
  }

  /**
   * Checks if a date is a holiday using the resolved HolidayPolicy.
   * Falls back to legacy Holiday collection if no policy found.
   *
   * @param {Date|moment|string} targetDate
   * @param {string|ObjectId} companyId
   * @param {Object|null} holidayPolicy  – pre-resolved HolidayPolicy (optional)
   * @returns {Promise<{ isHoliday: boolean, isOptional: boolean, name: string|null }>}
   */
  static async getHolidayInfo(targetDate, companyId, holidayPolicy = null) {
    if (holidayPolicy) {
      return PolicyResolver.resolveHolidayStatus(targetDate, holidayPolicy);
    }

    // No policy provided: query legacy collection via PolicyResolver helper
    const year = moment(targetDate).year();
    const holidays = await PolicyResolver.getHolidayList(companyId, year);
    const dateStr = moment(targetDate).format('YYYY-MM-DD');
    const entry = holidays.find(h => moment(h.holiday_date).format('YYYY-MM-DD') === dateStr);
    if (!entry) return { isHoliday: false, isOptional: false, name: null };
    return {
      isHoliday:  !entry.is_optional,
      isOptional:  !!entry.is_optional,
      name:        entry.holiday_name,
      type:        entry.holiday_type
    };
  }

  /**
   * @deprecated Use getHolidayInfo instead.
   * Kept for backwards compatibility with CalendarEngine calls.
   */
  static async getHoliday(targetDate, companyId) {
    const info = await this.getHolidayInfo(targetDate, companyId);
    if (!info.isHoliday && !info.isOptional) return null;
    return { holiday_name: info.name, holiday_type: info.type };
  }

  /**
   * Calculates working days, weekly offs, and holidays in a date range.
   * @param {moment} start
   * @param {moment} end
   * @param {Object} company
   * @param {Object|null} weekOffPolicy
   * @param {Object|null} holidayPolicy
   * @returns {Promise<Object>}
   */
  static async getSummaryInRange(start, end, company, weekOffPolicy = null, holidayPolicy = null) {
    let workingDaysCount = 0;
    let weeklyOffsCount  = 0;
    let holidaysCount    = 0;

    let curr = moment(start).startOf('day');
    const last = moment(end).startOf('day');

    while (curr.isSameOrBefore(last)) {
      const dateStr   = curr.format('YYYY-MM-DD');
      const { isOff } = PolicyResolver.resolveWeeklyOffStatus(curr, weekOffPolicy);
      const holiday   = holidayPolicy
        ? PolicyResolver.resolveHolidayStatus(curr, holidayPolicy)
        : await this.getHolidayInfo(curr, company._id || company);

      if (isOff)                weeklyOffsCount++;
      else if (holiday.isHoliday) holidaysCount++;
      else                      workingDaysCount++;

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
