import AttendanceRecord from "../model/attendance/AttendanceRecord.js";

/**
 * Calculates raw (0-10) and percentage (0-100) attendance score for an employee in a given month/year.
 * Shared between kpiRoutes, employeeKPIRoutes, and mrmAnalyticsService.
 *
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.employeeId
 * @param {number|string} params.year
 * @param {number|string} params.month
 * @param {Array} [params.existingRecords] - Optional pre-fetched AttendanceRecord array for batch optimization
 * @returns {Promise<{ present_days: number, working_days: number, attendance_raw: number, attendance_pct: number }>}
 */
export const calculateAttendanceMetrics = async ({ employeeId, year, month, existingRecords = null }) => {
    const queryYear = parseInt(year, 10);
    const queryMonth = parseInt(month, 10);
    const monthStr = `${queryYear}-${String(queryMonth).padStart(2, '0')}`;

    let attendanceRecords = existingRecords;
    if (!attendanceRecords) {
        try {
            attendanceRecords = await AttendanceRecord.find({
                employee_id: employeeId,
                year_month: monthStr,
            }).lean();
        } catch (err) {
            console.error("Error fetching attendance in calculateAttendanceMetrics:", err);
            attendanceRecords = [];
        }
    }

    let present_days = 0;
    let weekly_off_count = 0;
    let holiday_count = 0;

    (attendanceRecords || []).forEach((rec) => {
        const status = rec.status;
        if (status === "weekly_off" || rec.is_weekly_off) {
            weekly_off_count++;
        } else if (status === "holiday" || rec.is_holiday) {
            holiday_count++;
        } else if (["present", "on_duty", "leave", "late"].includes(status)) {
            present_days += 1;
        } else if (status === "half_day" || rec.is_half_day) {
            present_days += 0.5;
        } else if (status === "incomplete" || rec.missed_punch) {
            present_days += 0.5;
        }
    });

    const daysInMonth = new Date(queryYear, queryMonth, 0).getDate();
    let working_days = daysInMonth - (weekly_off_count + holiday_count);

    if (working_days <= 0 || (attendanceRecords || []).length === 0) {
        let sundays = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const dayOfWeek = new Date(queryYear, queryMonth - 1, d).getDay();
            if (dayOfWeek === 0) {
                sundays++;
            }
        }
        working_days = Math.max(1, daysInMonth - sundays);
    }

    const ratio = working_days > 0 && (attendanceRecords || []).length > 0
        ? Math.min(1, Math.max(0, present_days / working_days))
        : 1; // Default to full attendance if unrecorded

    const attendance_raw = Number((ratio * 10).toFixed(2));
    const attendance_pct = Number((ratio * 100).toFixed(1));

    return {
        present_days,
        working_days,
        attendance_raw,
        attendance_pct
    };
};

export default calculateAttendanceMetrics;
