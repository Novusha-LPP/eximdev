import moment from 'moment-timezone';

/**
 * WorkHoursCalculator Service
 * Handles all work hour calculations, session grouping, and duration calculations
 */

export class WorkHoursCalculator {
  /**
   * Calculate daily work hours and sessions from punch data
   * @param {Array} punches - Array of AttendancePunch objects sorted by punch_time
   * @param {Object} shift - Shift configuration with working hours info
   * @returns {Object} Daily work data with sessions and totals
   */
  static calculateDailyWorkHours(punches, shift) {
    const sessions = [];
    let totalWorkHours = 0;
    let hasIncompleteSession = false;
    let primaryInTime = null;
    let primaryOutTime = null;

    if (!punches || punches.length === 0) {
      return {
        total_work_hours: 0,
        total_sessions: 0,
        sessions: [],
        has_incomplete: false,
        is_late: false,
        is_early_exit: false,
        late_by_minutes: 0,
        early_exit_minutes: 0,
        primary_in_time: null,
        primary_out_time: null,
      };
    }

    // Filter only IN/OUT punches (ignore BREAK_START/BREAK_END for now)
    const inOutPunches = punches.filter(p => ['IN', 'OUT'].includes(p.punch_type));

    // Group into sessions: consecutive IN followed by OUT
    let currentSessionNumber = 0;
    let i = 0;

    while (i < inOutPunches.length) {
      const punch = inOutPunches[i];

      if (punch.punch_type === 'IN') {
        currentSessionNumber++;
        const inTime = punch.punch_time;
        const inTimeDate = new Date(inTime);

        // Find corresponding OUT
        let outTime = null;
        let sessionEndIndex = i + 1;

        if (sessionEndIndex < inOutPunches.length && inOutPunches[sessionEndIndex].punch_type === 'OUT') {
          outTime = inOutPunches[sessionEndIndex].punch_time;
          sessionEndIndex++;
        }

        // Record first session times
        if (currentSessionNumber === 1) {
          primaryInTime = inTimeDate;
        }

        // Validate session
        const validation = this.validateSession(inTime, outTime, shift?.max_session_hours || 18);

        if (!validation.valid) {
          // Skip invalid session
          i++;
          continue;
        }

        // Calculate duration
        let durationHours = 0;
        let isIncomplete = false;

        if (outTime) {
          durationHours = this.calculateDurationHours(inTime, outTime);
          primaryOutTime = new Date(outTime);
        } else {
          // OUT punch is missing
          isIncomplete = true;
          hasIncompleteSession = true;
          // For incomplete, we calculate up to now (system considers it unfinished)
          durationHours = this.calculateDurationHours(inTime, new Date());
        }

        sessions.push({
          session_number: currentSessionNumber,
          punch_in_time: inTimeDate,
          punch_out_time: outTime ? new Date(outTime) : null,
          duration_hours: parseFloat(durationHours.toFixed(2)),
          is_incomplete: isIncomplete,
        });

        totalWorkHours += durationHours;
        i = sessionEndIndex;
      } else {
        // OUT without IN, ignore
        i++;
      }
    }

    // Calculate late/early with Allowance Buffers
    const lateAllowed = shift?.late_allowed_minutes || 0;
    const earlyLeaveAllowed = shift?.early_leave_allowed_minutes || 0;

    // Resolve shift timings safely; fallback to standard office timings if missing.
    const shiftStartTime = this.timeStringToMinutes(shift?.start_time || '09:00');
    const shiftEndRaw = this.timeStringToMinutes(shift?.end_time || '18:00');

    // Handle cross-day shifts (e.g., 22:00 -> 06:00) by rolling end into next day.
    const shiftEndTime = shiftEndRaw <= shiftStartTime ? shiftEndRaw + (24 * 60) : shiftEndRaw;

    const firstPunchMinutes = primaryInTime ? this.dateToMinutesOfDay(primaryInTime) : null;
    let lastPunchMinutes = primaryOutTime ? this.dateToMinutesOfDay(primaryOutTime) : null;

    // For cross-day shifts, a post-midnight OUT belongs to next-day window.
    if (lastPunchMinutes !== null && shiftEndRaw <= shiftStartTime && lastPunchMinutes < shiftStartTime) {
      lastPunchMinutes += (24 * 60);
    }

    // Detect if buffer is exceeded
    const isLate = firstPunchMinutes !== null && (firstPunchMinutes > shiftStartTime + lateAllowed);
    const isEarlyExit = lastPunchMinutes !== null && (lastPunchMinutes < shiftEndTime - earlyLeaveAllowed);

    // If exceeded, calculate from actual shift start/end
    const lateByMinutes = isLate ? firstPunchMinutes - shiftStartTime : 0;
    const earlyExitMinutes = isEarlyExit ? shiftEndTime - lastPunchMinutes : 0;

    return {
      total_work_hours: parseFloat(totalWorkHours.toFixed(2)),
      total_sessions: sessions.length,
      sessions,
      has_incomplete: hasIncompleteSession,
      is_late: isLate,
      is_early_exit: isEarlyExit,
      late_by_minutes: Math.round(lateByMinutes),
      early_exit_minutes: Math.round(earlyExitMinutes),
      primary_in_time: primaryInTime,
      primary_out_time: primaryOutTime,
    };
  }

  /**
   * Validate a single session
   * @param {Date} inTime - Punch IN time
   * @param {Date} outTime - Punch OUT time (optional)
   * @param {Number} maxHours - Max allowed session duration
   * @returns {Object} Validation result
   */
  static validateSession(inTime, outTime, maxHours = 18) {
    const errors = [];

    if (!inTime) {
      errors.push('IN time is required');
    }

    if (outTime && new Date(outTime) <= new Date(inTime)) {
      errors.push('OUT time must be after IN time');
    }

    if (outTime) {
      const durationHours = this.calculateDurationHours(inTime, outTime);
      if (durationHours > maxHours) {
        errors.push(`Session exceeds max duration of ${maxHours} hours`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate duration in hours between two times
   * @param {Date} inTime
   * @param {Date} outTime
   * @returns {Number} Duration in hours
   */
  static calculateDurationHours(inTime, outTime) {
    const inMs = new Date(inTime).getTime();
    const outMs = new Date(outTime).getTime();
    const durationMs = outMs - inMs;
    return durationMs / (1000 * 60 * 60); // Convert ms to hours
  }

  /**
   * Convert time string (HH:MM) to minutes of day
   * @param {String} timeString - e.g., "09:00"
   * @returns {Number} Minutes since midnight
   */
  static timeStringToMinutes(timeString) {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convert Date to minutes of day
   * @param {Date} date
   * @returns {Number} Minutes since midnight
   */
  static dateToMinutesOfDay(date) {
    const m = moment.tz(date, 'Asia/Kolkata');
    return m.hours() * 60 + m.minutes();
  }

  /**
   * Recalculate work hours with regularization correction
   * @param {Array} punches - Original punches
   * @param {Object} regularization - RegularizationRequest with corrected times
   * @param {Object} shift - Shift configuration
   * @returns {Object} Updated work data
   */
  static recalculateWithRegularization(punches, regularization, shift) {
    if (!regularization.corrected_punch_in_time || !regularization.corrected_punch_out_time) {
      // No correction, use original calculation
      return this.calculateDailyWorkHours(punches, shift);
    }

    // Create virtual punches from corrected times
    const virtualPunches = [
      {
        punch_type: 'IN',
        punch_time: regularization.corrected_punch_in_time,
      },
      {
        punch_type: 'OUT',
        punch_time: regularization.corrected_punch_out_time,
      },
    ];

    return this.calculateDailyWorkHours(virtualPunches, shift);
  }
}

export default WorkHoursCalculator;
