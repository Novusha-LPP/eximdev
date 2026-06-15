/**
 * PayrollCalculationService
 *
 * Orchestrates payroll generation by composing five sub-modules:
 *   1. AttendanceAggregator  – tallies attendance records for a month
 *   2. ShiftCalculator       – derives shift_count (not stored)
 *   3. OvertimeCalculator    – computes OT using existing overtime_hours/overtime_approved
 *   4. WageCalculator        – calculates basic, OT amount, gross, net
 *   5. PayrollGenerator      – creates PayrollRun + PayrollSummary records
 */

import mongoose from 'mongoose';
import AttendanceRecord from '../../model/attendance/AttendanceRecord.js';
import EmployeePayrollConfig from '../../model/attendance/EmployeePayrollConfig.js';
import PayrollRun from '../../model/attendance/PayrollRun.js';
import PayrollSummary from '../../model/attendance/PayrollSummary.js';
import Shift from '../../model/attendance/Shift.js';
import UserModel from '../../model/userModel.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1. AttendanceAggregator
// ─────────────────────────────────────────────────────────────────────────────
const AttendanceAggregator = {
  /**
   * Fetches and tallies all attendance records for an employee in a given month.
   * @param {ObjectId} employeeId
   * @param {Number} year   e.g. 2026
   * @param {String} month  e.g. "06"
   * @returns {Object} { records, present, halfDays, absent, leave, weeklyOff, holiday, totalDays }
   */
  async aggregate(employeeId, year, month) {
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

    const records = await AttendanceRecord.find({
      employee_id: employeeId,
      year_month: yearMonth
    }).populate('shift_id').lean();

    const counts = {
      present: 0,
      halfDays: 0,
      absent: 0,
      leave: 0,
      weeklyOff: 0,
      holiday: 0
    };

    for (const rec of records) {
      switch (rec.status) {
        case 'present':
          counts.present++;
          break;
        case 'half_day':
          counts.halfDays++;
          break;
        case 'absent':
        case 'incomplete':
          counts.absent++;
          break;
        case 'leave':
          counts.leave++;
          break;
        case 'weekly_off':
          counts.weeklyOff++;
          break;
        case 'holiday':
          counts.holiday++;
          break;
        case 'on_duty':
          counts.present++;
          break;
        default:
          break;
      }
    }

    // Total calendar days in the month
    const totalDays = new Date(year, parseInt(month, 10), 0).getDate();

    return {
      records,
      ...counts,
      totalDays
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. ShiftCalculator
// ─────────────────────────────────────────────────────────────────────────────
const ShiftCalculator = {
  /**
   * Derives shift_count from net_work_hours and shift configuration.
   * This value is NOT stored in AttendanceRecord — it is computed at payroll time.
   *
   * @param {Number} netWorkHours
   * @param {Object} shift  Shift document (or defaults)
   * @returns {Number} 0, 0.5, 1, 2, or 3
   */
  calculateShiftCount(netWorkHours, shift) {
    const fullDay = shift?.full_day_hours || 8;
    const halfDay = shift?.half_day_hours || 4;

    if (netWorkHours < halfDay) return 0;
    if (netWorkHours < fullDay) return 0.5;
    if (netWorkHours < fullDay * 2) return 1;
    if (netWorkHours < fullDay * 3) return 2;
    return 3;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. OvertimeCalculator
// ─────────────────────────────────────────────────────────────────────────────
const OvertimeCalculator = {
  /**
   * Computes overtime using the existing overtime_hours and overtime_approved
   * fields from AttendanceRecord. Also applies the grace-period formula.
   *
   * Formula:
   *   OT_minutes = max(0, total_work_minutes - shift_minutes - grace_minutes)
   *
   * @param {Object} record       AttendanceRecord document
   * @param {Object} shift        Shift document
   * @param {Object} payrollConfig EmployeePayrollConfig document
   * @returns {Object} { overtimeMinutes, overtimeHours, isApproved }
   */
  calculate(record, shift, payrollConfig) {
    if (!payrollConfig?.overtime_eligible) {
      return { overtimeMinutes: 0, overtimeHours: 0, isApproved: false };
    }

    const shiftMinutes = (shift?.full_day_hours || 8) * 60;
    const graceMinutes = payrollConfig.overtime_grace_minutes || 20;
    const threshold = shiftMinutes + graceMinutes;

    const totalWorkMinutes = (record.net_work_hours || 0) * 60;
    const overtimeMinutes = Math.max(0, totalWorkMinutes - threshold);
    const overtimeHours = Math.round((overtimeMinutes / 60) * 100) / 100;

    return {
      overtimeMinutes,
      overtimeHours,
      // Use the existing overtime_approved field from AttendanceRecord
      isApproved: record.overtime_approved || false
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. WageCalculator
// ─────────────────────────────────────────────────────────────────────────────
const WageCalculator = {
  /**
   * Calculates financial amounts based on payroll type.
   *
   * DAILY_WAGE:
   *   basic = payable_days × daily_wage
   *   ot_amount = approved_ot_hours × ot_rate
   *
   * MONTHLY:
   *   basic = (payable_days / total_days_in_month) × monthly_salary
   *   ot_amount = 0 (management typically not OT eligible)
   *
   * @param {Object} params
   * @returns {Object} { basicAmount, overtimeAmount, grossAmount, deductionAmount, netPayable }
   */
  calculate({ payrollConfig, payableDays, totalDaysInMonth, totalOtHours }) {
    let basicAmount = 0;
    let overtimeAmount = 0;

    if (payrollConfig.payroll_type === 'DAILY_WAGE') {
      basicAmount = payableDays * (payrollConfig.daily_wage || 0);
      overtimeAmount = totalOtHours * (payrollConfig.overtime_rate_per_hour || 0);
    } else {
      // MONTHLY
      const monthlySalary = payrollConfig.monthly_salary || 0;
      basicAmount = totalDaysInMonth > 0
        ? (payableDays / totalDaysInMonth) * monthlySalary
        : 0;
      // Management typically not OT eligible, but respect the flag
      if (payrollConfig.overtime_eligible) {
        overtimeAmount = totalOtHours * (payrollConfig.overtime_rate_per_hour || 0);
      }
    }

    basicAmount = Math.round(basicAmount * 100) / 100;
    overtimeAmount = Math.round(overtimeAmount * 100) / 100;
    const grossAmount = Math.round((basicAmount + overtimeAmount) * 100) / 100;

    // Deductions deferred to future iteration
    const deductionAmount = 0;
    const netPayable = Math.round((grossAmount - deductionAmount) * 100) / 100;

    return {
      basicAmount,
      overtimeAmount,
      grossAmount,
      deductionAmount,
      netPayable
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. PayrollGenerator
// ─────────────────────────────────────────────────────────────────────────────
const PayrollGenerator = {
  /**
   * Main entry point: generates payroll for a company + month.
   *
   * Steps:
   *   1. Find or create PayrollRun
   *   2. Find all employees with ACTIVE payroll configs in the company
   *   3. For each employee: aggregate attendance, derive shift counts, compute OT, calculate wages
   *   4. Create/update PayrollSummary records
   *   5. Mark attendance records as payroll_processed
   *
   * @param {Object} params { companyId, year, month, generatedBy }
   * @returns {Object} { payrollRun, summaries, errors }
   */
  async generate({ companyId, year, month, generatedBy }) {
    const monthStr = String(month).padStart(2, '0');
    const yearMonth = `${year}-${monthStr}`;
    const errors = [];

    // 1. Find or create PayrollRun
    let payrollRun = await PayrollRun.findOne({
      company_id: companyId,
      payroll_year: year,
      payroll_month: monthStr
    });

    if (payrollRun && payrollRun.payroll_status === 'LOCKED') {
      throw new Error('Payroll is locked for this month. Unlock before regenerating.');
    }

    if (payrollRun && payrollRun.payroll_status === 'COMPLETED') {
      throw new Error('Payroll is already completed for this month.');
    }

    if (!payrollRun) {
      payrollRun = await PayrollRun.create({
        company_id: companyId,
        payroll_year: year,
        payroll_month: monthStr,
        payroll_status: 'PROCESSING',
        generated_by: generatedBy,
        generated_at: new Date()
      });
    } else {
      payrollRun.payroll_status = 'PROCESSING';
      payrollRun.generated_by = generatedBy;
      payrollRun.generated_at = new Date();
      await payrollRun.save();
    }

    // 2. Find all employees with ACTIVE payroll configs in this company
    const payrollConfigs = await EmployeePayrollConfig.find({
      company_id: companyId,
      status: 'ACTIVE'
    }).lean();

    if (payrollConfigs.length === 0) {
      payrollRun.payroll_status = 'DRAFT';
      payrollRun.remarks = 'No employees with active payroll configurations found.';
      await payrollRun.save();
      return { payrollRun, summaries: [], errors: ['No employees with active payroll configurations'] };
    }

    const summaries = [];

    // 3. Process each employee
    for (const config of payrollConfigs) {
      try {
        const summary = await this._processEmployee({
          payrollRun,
          config,
          year,
          monthStr,
          yearMonth
        });
        summaries.push(summary);
      } catch (err) {
        errors.push({
          employee_id: config.employee_id,
          error: err.message
        });
      }
    }

    // Update PayrollRun status
    payrollRun.payroll_status = 'DRAFT';
    payrollRun.remarks = `Generated for ${summaries.length} employees. ${errors.length} errors.`;
    await payrollRun.save();

    return { payrollRun, summaries, errors };
  },

  /**
   * Process a single employee's payroll for the month.
   */
  async _processEmployee({ payrollRun, config, year, monthStr, yearMonth }) {
    const employeeId = config.employee_id;

    // Aggregate attendance
    const attendance = await AttendanceAggregator.aggregate(employeeId, year, monthStr);

    // Get default shift for the employee
    const employee = await UserModel.findById(employeeId).populate('shift_id').lean();
    const defaultShift = employee?.shift_id;

    // Derive shift counts and OT for each record
    let totalRegularHours = 0;
    let totalOtHours = 0;
    let totalShiftCount = 0;
    const recordIdsToMark = [];

    for (const record of attendance.records) {
      const shift = record.shift_id || defaultShift;

      // Shift count (derived, not stored)
      const shiftCount = ShiftCalculator.calculateShiftCount(
        record.net_work_hours || 0,
        shift
      );
      totalShiftCount += shiftCount;

      // Regular hours (capped at shift limit)
      const fullDayHours = shift?.full_day_hours || 8;
      const regularHours = Math.min(record.net_work_hours || 0, fullDayHours);
      totalRegularHours += regularHours;

      // Overtime
      const ot = OvertimeCalculator.calculate(record, shift, config);
      if (ot.isApproved) {
        totalOtHours += ot.overtimeHours;
      }

      // Update the record's payroll integration fields
      await AttendanceRecord.updateOne(
        { _id: record._id },
        {
          $set: {
            regular_hours: Math.round(regularHours * 100) / 100,
            overtime_minutes: ot.overtimeMinutes
          }
        }
      );

      recordIdsToMark.push(record._id);
    }

    // Calculate payable days
    // Present + half_day (0.5 each) + weekly_off + holiday + leave (paid)
    const payableDays = attendance.present
      + (attendance.halfDays * 0.5)
      + attendance.weeklyOff
      + attendance.holiday;

    // Calculate wages
    const wages = WageCalculator.calculate({
      payrollConfig: config,
      payableDays,
      totalDaysInMonth: attendance.totalDays,
      totalOtHours
    });

    // Create/update PayrollSummary
    const summaryData = {
      payroll_run_id: payrollRun._id,
      employee_id: employeeId,
      company_id: config.company_id,
      payroll_config_id: config._id,
      payroll_month: monthStr,
      payroll_year: year,

      // Config snapshot
      is_operator: config.is_operator,
      payroll_type: config.payroll_type,

      // Attendance
      total_days_in_month: attendance.totalDays,
      present_days: attendance.present,
      half_days: attendance.halfDays,
      absent_days: attendance.absent,
      leave_days: attendance.leave,
      weekly_off_days: attendance.weeklyOff,
      holiday_days: attendance.holiday,
      payable_days: payableDays,

      // Hours
      total_regular_hours: Math.round(totalRegularHours * 100) / 100,
      total_overtime_hours: Math.round(totalOtHours * 100) / 100,
      total_shift_count: Math.round(totalShiftCount * 100) / 100,

      // Financial
      basic_amount: wages.basicAmount,
      overtime_amount: wages.overtimeAmount,
      gross_amount: wages.grossAmount,
      deduction_amount: wages.deductionAmount,
      net_payable_amount: wages.netPayable,

      // Snapshots
      daily_wage_snapshot: config.daily_wage,
      monthly_salary_snapshot: config.monthly_salary,
      ot_rate_snapshot: config.overtime_rate_per_hour
    };

    const summary = await PayrollSummary.findOneAndUpdate(
      { payroll_run_id: payrollRun._id, employee_id: employeeId },
      { $set: summaryData },
      { upsert: true, new: true }
    );

    // Mark attendance records as processed
    if (recordIdsToMark.length > 0) {
      await AttendanceRecord.updateMany(
        { _id: { $in: recordIdsToMark } },
        { $set: { payroll_processed: true } }
      );
    }

    return summary;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────
export {
  AttendanceAggregator,
  ShiftCalculator,
  OvertimeCalculator,
  WageCalculator,
  PayrollGenerator
};

export default PayrollGenerator;
