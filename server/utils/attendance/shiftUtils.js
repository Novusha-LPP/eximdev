import moment from 'moment-timezone';

/** Buffer hours after shift end during which punch-out is still allowed */
export const PUNCH_OUT_BUFFER_HOURS = 4;

/** Default shift duration (hours) when shift config is not available */
export const DEFAULT_SHIFT_HOURS = 8;

/**
 * Calculate the actual duration of a shift in hours from its start_time and end_time.
 * Handles cross-day (night) shifts automatically.
 * @param {Object} shift - Shift object with start_time and end_time (HH:mm strings)
 * @returns {number} Duration in hours
 */
export function getShiftDurationHours(shift) {
    if (!shift?.start_time || !shift?.end_time) return DEFAULT_SHIFT_HOURS;

    const start = moment(shift.start_time, 'HH:mm');
    const end = moment(shift.end_time, 'HH:mm');

    if (end.isAfter(start)) {
        return end.diff(start, 'hours', true);
    }
    // Cross-day shift (e.g., 21:00 → 07:00)
    return 24 - start.diff(end, 'hours', true);
}

/**
 * Get the missed-punch timeout limit in hours for a given shift.
 * This equals the shift duration + PUNCH_OUT_BUFFER_HOURS (4h).
 *
 * Examples:
 *   9h shift (09:00–18:00) → limit = 13h
 *  10h shift (21:00–07:00) → limit = 14h
 *  12h shift (09:00–21:00) → limit = 16h
 *
 * @param {Object|null} shift - Shift document (or null for default 8h + 4h = 12h)
 * @returns {number} Limit in hours
 */
export function getMissedPunchLimitHours(shift) {
    return getShiftDurationHours(shift) + PUNCH_OUT_BUFFER_HOURS;
}
