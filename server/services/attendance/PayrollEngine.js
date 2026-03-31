import WorkingDayEngine from './WorkingDayEngine.js';
import AttendanceRecord from '../../model/attendance/AttendanceRecord.js';
import LeaveApplication from '../../model/attendance/LeaveApplication.js';
import RegularizationRequest from '../../model/attendance/RegularizationRequest.js';
import PayrollLock from '../../model/attendance/PayrollLock.js';
import moment from 'moment';

/**
 * PayrollEngine handles advanced payroll calculations, salary breakdowns, and validation checks.
 */
class PayrollEngine {
    /**
     * Calculates payable days and salary breakdown for an employee.
     * @param {Object} employee 
     * @param {Object} company 
     * @param {string} yearMonth - 'YYYY-MM'
     * @returns {Promise<Object>}
     */
    static async calculatePayableDays(employee, company, yearMonth) {
        const [year, month] = yearMonth.split('-').map(Number);
        const startOfMonth = moment([year, month - 1]).startOf('month');
        const endOfMonth = moment([year, month - 1]).endOf('month');
        const totalDaysInMonth = endOfMonth.date();

        // 1. Identify Effective Period (Handling Joining Date)
        let empJoinDate = employee.joining_date ? moment(employee.joining_date) : startOfMonth;
        if (!empJoinDate.isValid()) empJoinDate = startOfMonth;

        const effectiveStart = moment.max(startOfMonth, empJoinDate.clone().startOf('day'));

        // 2. Get Rule-Driven Working Summary for the effective period
        const summary = await WorkingDayEngine.getSummaryInRange(effectiveStart, endOfMonth, company, employee.shift_id, employee.department_id);

        // 3. Fetch Actual Attendance (Unique per date to avoid double counting)
        const allRecords = await AttendanceRecord.find({
            employee_id: employee._id,
            year_month: yearMonth
        }).sort({ attendance_date: 1 });

        // Ensure we only process one record per date (latest)
        const recordMap = new Map();
        allRecords.forEach(r => recordMap.set(r.attendance_date, r));
        const records = Array.from(recordMap.values());

        const stats = records.reduce((acc, rec) => {
            if (rec.status === 'present') acc.present++;
            else if (rec.status === 'absent') acc.absent++;
            else if (rec.status === 'leave') acc.leave++;
            else if (rec.status === 'half_day') {
                acc.halfDay++;
                // If it's a half-day leave situation, also count 0.5 as leave for payroll
                if (rec.is_on_leave) {
                    acc.leave += 0.5;
                    acc.halfDay--; // Adjust halfDay so it doesn't double-count work credit in our base formula
                }
            }

            // Worked on Off/Holiday (Premium calculation foundation)
            if ((rec.status === 'present' || rec.status === 'half_day')) {
                const isOff = WorkingDayEngine.isWeeklyOff(rec.attendance_date, company, employee.shift_id, employee.department_id);
                if (isOff) acc.weeklyOffWorked++;
            }

            acc.workHours += rec.total_work_hours || 0;
            acc.overtimeHours += rec.overtime_hours || 0;

            return acc;
        }, { present: 0, absent: 0, leave: 0, halfDay: 0, weeklyOffWorked: 0, workHours: 0, overtimeHours: 0 });

        // 4. Payable Days Logic
        const config = company.payroll_config || {};

        let payableDays = stats.present + stats.leave + (stats.halfDay * 0.5);

        // Include Offs and Holidays only if configured and if employee worked enough
        if (config.include_holidays_in_payable) {
            payableDays += summary.holidaysCount;
        }

        if (config.include_weekly_offs_in_payable) {
            payableDays += summary.weeklyOffsCount;
        }

        // 5. LOP Calculation
        // LOP = Total Working Days in Period - (Present + Leave + HalfDay*0.5)
        const lopDays = Math.max(0, summary.workingDaysCount - (stats.present + stats.leave + (stats.halfDay * 0.5)));

        // 6. Salary Preview (Admin Only)
        // Per Day Salary = Monthly Salary / Basis (Calendar or Working Days)
        const salaryBaseBasis = config.lop_calculation === 'calendar_days' ? totalDaysInMonth : summary.workingDaysCount;
        const perDaySalary = (employee.monthly_salary || 0) / (salaryBaseBasis || 30);
        const lopDeduction = lopDays * perDaySalary;

        const overtimeMultiplier = config.overtime_rate || 1.5;
        const perHourSalary = perDaySalary / (company.settings?.standard_work_hours || 8);
        const overtimePay = stats.overtimeHours * perHourSalary * overtimeMultiplier;

        const finalSalary = (employee.monthly_salary || 0) - lopDeduction + overtimePay;

        return {
            period: {
                start: effectiveStart.format('YYYY-MM-DD'),
                end: endOfMonth.format('YYYY-MM-DD')
            },
            summary: {
                totalWorkingDays: summary.workingDaysCount,
                weeklyOffs: summary.weeklyOffsCount,
                holidays: summary.holidaysCount,
            },
            stats: {
                present: stats.present,
                absent: stats.absent,
                leave: stats.leave,
                halfDay: stats.halfDay,
                workHours: stats.workHours,
                overtimeHours: stats.overtimeHours,
                lopDays: parseFloat(lopDays.toFixed(2)),
                payableDays: parseFloat(Math.min(payableDays, totalDaysInMonth).toFixed(2))
            },
            salary: {
                monthlyBase: employee.monthly_salary || 0,
                perDay: parseFloat(perDaySalary.toFixed(2)),
                lopDeduction: parseFloat(lopDeduction.toFixed(2)),
                overtimePay: parseFloat(overtimePay.toFixed(2)),
                final: parseFloat(finalSalary.toFixed(2))
            }
        };
    }

    /**
     * Checks for data inconsistencies or pending actions before payroll export.
     */
    static async getValidationWarnings(employeeId, companyId, yearMonth) {
        const warnings = [];

        // 1. Check Pending Leaves
        const pendingLeaves = await LeaveApplication.countDocuments({
            employee_id: employeeId,
            company_id: companyId,
            approval_status: 'pending'
        });
        if (pendingLeaves > 0) warnings.push(`${pendingLeaves} pending leave applications`);

        // 2. Check Pending Regularizations
        const pendingRegs = await RegularizationRequest.countDocuments({
            employee_id: employeeId,
            company_id: companyId,
            status: 'pending',
            attendance_date: { $regex: yearMonth }
        });
        if (pendingRegs > 0) warnings.push(`${pendingRegs} pending regularization requests`);

        // 3. Check Missing Punches (Incomplete Records)
        const missingPunches = await AttendanceRecord.countDocuments({
            employee_id: employeeId,
            company_id: companyId,
            year_month: yearMonth,
            first_in: { $ne: null },
            last_out: null
        });
        if (missingPunches > 0) warnings.push(`${missingPunches} days with missing OUT punches`);

        return warnings;
    }

    /**
     * Checks if attendance is locked for a specific company and month.
     * Combines automated logic (cutoff day) with manual Admin overrides.
     */
    static async isLocked(company, yearMonth) {
        // 1. Check for manual override in PayrollLock
        const manualLock = await PayrollLock.findOne({
            company_id: company._id,
            year_month: yearMonth
        });

        if (manualLock) {
            return manualLock.is_locked; // Manual override takes precedence
        }

        // 2. Fallback to automated logic (Disabled per user request)
        // We now only lock if a manual lock is explicitly set in PayrollLock model.
        return false;

    }
}

export default PayrollEngine;
