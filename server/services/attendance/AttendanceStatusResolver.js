/**
 * AttendanceStatusResolver Service
 * Determines attendance status based on work hours and business rules
 */

export class AttendanceStatusResolver {
  /**
   * Resolve attendance status based on work hours and overrides
   * Status determination order:
   * 1. Check overrides (leave, holiday, weekly_off)
   * 2. Evaluate work hours
   * @param {Object} workData - Output from WorkHoursCalculator
   * @param {Object} shift - Shift configuration
   * @param {Object} overrides - Override flags { hasLeave, isHoliday, isWeeklyOff, onDutyStatus }
   * @returns {Object} Status resolution result
   */
  static resolveStatus(workData, shift, overrides = {}) {
    const { hasLeave, isHoliday, isWeeklyOff, onDutyStatus } = overrides;

    // Step 1: Check overrides (highest priority)
    if (hasLeave) {
      return {
        status: 'leave',
        reason: 'Approved leave',
        is_operational_present: false,
      };
    }

    if (isHoliday) {
      return {
        status: 'holiday',
        reason: 'Public holiday',
        is_operational_present: false,
      };
    }

    if (isWeeklyOff) {
      return {
        status: 'weekly_off',
        reason: 'Weekly off',
        is_operational_present: false,
      };
    }

    if (onDutyStatus) {
      return {
        status: 'on_duty',
        reason: 'On duty assignment',
        is_operational_present: true,
      };
    }

    // Step 2: Evaluate based on work hours

    // No punches at all
    if (!workData || workData.total_work_hours === 0) {
      return {
        status: 'absent',
        reason: 'No work hours recorded',
        is_operational_present: false,
      };
    }

    // Has incomplete session AND low hours
    if (workData.has_incomplete && workData.total_work_hours < (shift?.minimum_hours || 3)) {
      return {
        status: 'incomplete',
        reason: `Missing OUT punch. Worked ${workData.total_work_hours}h < minimum ${shift?.minimum_hours || 3}h`,
        is_operational_present: false,
      };
    }

    // Full day hours achieved
    if (workData.total_work_hours >= (shift?.full_day_hours || 8)) {
      return {
        status: 'present',
        reason: `Worked ${workData.total_work_hours}h >= full day requirement ${shift?.full_day_hours || 8}h`,
        is_operational_present: true,
      };
    }

    // Half day hours achieved
    if (workData.total_work_hours >= (shift?.half_day_hours || 4)) {
      return {
        status: 'half_day',
        reason: `Worked ${workData.total_work_hours}h >= half day requirement ${shift?.half_day_hours || 4}h`,
        is_operational_present: true,
      };
    }

    // Below minimum
    if (workData.total_work_hours < (shift?.minimum_hours || 3)) {
      return {
        status: 'absent',
        reason: `Worked ${workData.total_work_hours}h < minimum ${shift?.minimum_hours || 3}h`,
        is_operational_present: false,
      };
    }

    // Fallback (should not reach here in normal operation)
    return {
      status: 'absent',
      reason: 'Unable to determine status',
      is_operational_present: false,
    };
  }

  /**
   * Get operational presence (used for KPI/metrics)
   * @param {String} status - Attendance status
   * @returns {Boolean} Whether employee is operationally present
   */
  static isOperationallyPresent(status) {
    return ['present', 'half_day', 'on_duty'].includes(status);
  }

  /**
   * Categorize status for reporting
   * @param {String} status
   * @returns {String} Category: 'present', 'absent', 'on_leave', 'other'
   */
  static categorizeStatus(status) {
    const categoryMap = {
      present: 'present',
      half_day: 'present',
      absent: 'absent',
      incomplete: 'absent',
      leave: 'on_leave',
      holiday: 'other',
      weekly_off: 'other',
      on_duty: 'present',
    };

    return categoryMap[status] || 'other';
  }
}

export default AttendanceStatusResolver;
