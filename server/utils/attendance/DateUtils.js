import moment from 'moment-timezone';

/**
 * Utility for consistent date/time operations across the attendance system.
 * Enforces Asia/Kolkata (IST) as the single business timezone.
 */
export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns a range of UTC dates representing the start and end of a given IST day.
 * Use this for querying MongoDB Date objects by calendar day.
 */
export function getISTDayRange(dateInput) {
    const day = moment.tz(dateInput, IST_TIMEZONE);
    return {
        start: day.clone().startOf('day').utc().toDate(),
        end: day.clone().endOf('day').utc().toDate(),
        dateStr: day.format('YYYY-MM-DD')
    };
}

/**
 * Returns current time in IST.
 */
export function nowIST() {
    return moment().tz(IST_TIMEZONE);
}

/**
 * Converts any date to an IST string YYYY-MM-DD.
 */
export function toISTDateStr(date) {
    if (!date) return null;
    return moment(date).tz(IST_TIMEZONE).format('YYYY-MM-DD');
}

/**
 * Converts an IST date and time string to a UTC Date object.
 */
export function istToUTC(dateStr, timeStr) {
    return moment.tz(`${dateStr} ${timeStr}`, 'YYYY-MM-DD HH:mm', IST_TIMEZONE).utc().toDate();
}

/**
 * Checks if a time falls within a shift window (handles cross-midnight).
 */
export function isTimeInWindow(time, start, end) {
    const t = moment(time);
    const s = moment(start);
    let e = moment(end);

    if (e.isBefore(s)) {
        e.add(1, 'days');
    }

    return t.isSameOrAfter(s) && t.isBefore(e);
}
