/**
 * PayrollLockService
 *
 * Manages PayrollRun state transitions:
 *   DRAFT → PROCESSING → LOCKED → COMPLETED
 *
 * Validates attendance is locked before allowing payroll lock.
 * Prevents AttendanceRecord modifications on processed records.
 */

import PayrollRun from '../../model/attendance/PayrollRun.js';
import PayrollLock from '../../model/attendance/PayrollLock.js';
import AttendanceRecord from '../../model/attendance/AttendanceRecord.js';

const PayrollLockService = {
  /**
   * Lock a payroll run. Prevents further edits.
   * Requires that attendance is already locked for the month.
   */
  async lockRun(runId, lockedBy) {
    const run = await PayrollRun.findById(runId);
    if (!run) throw new Error('Payroll run not found.');

    if (run.payroll_status === 'LOCKED') {
      throw new Error('Payroll is already locked.');
    }
    if (run.payroll_status === 'COMPLETED') {
      throw new Error('Payroll is already completed.');
    }
    if (run.payroll_status === 'PROCESSING') {
      throw new Error('Payroll is currently processing. Wait for it to finish.');
    }

    // Verify attendance lock exists for this month
    const yearMonth = `${run.payroll_year}-${String(run.payroll_month).padStart(2, '0')}`;
    const attendanceLock = await PayrollLock.findOne({
      company_id: run.company_id,
      year_month: yearMonth,
      is_locked: true
    });

    if (!attendanceLock) {
      throw new Error(`Attendance must be locked for ${yearMonth} before locking payroll.`);
    }

    run.payroll_status = 'LOCKED';
    run.locked_by = lockedBy;
    run.locked_at = new Date();
    await run.save();

    return run;
  },

  /**
   * Unlock a payroll run. Admin only.
   */
  async unlockRun(runId, unlockedBy) {
    const run = await PayrollRun.findById(runId);
    if (!run) throw new Error('Payroll run not found.');

    if (run.payroll_status !== 'LOCKED') {
      throw new Error(`Cannot unlock payroll with status: ${run.payroll_status}`);
    }

    // Unmark attendance records as processed
    const yearMonth = `${run.payroll_year}-${String(run.payroll_month).padStart(2, '0')}`;
    await AttendanceRecord.updateMany(
      {
        company_id: run.company_id,
        year_month: yearMonth,
        payroll_processed: true
      },
      { $set: { payroll_processed: false } }
    );

    run.payroll_status = 'DRAFT';
    run.remarks = `Unlocked by admin at ${new Date().toISOString()}`;
    await run.save();

    return run;
  },

  /**
   * Mark a payroll run as completed.
   */
  async completeRun(runId) {
    const run = await PayrollRun.findById(runId);
    if (!run) throw new Error('Payroll run not found.');

    if (run.payroll_status !== 'LOCKED') {
      throw new Error('Payroll must be locked before completing.');
    }

    run.payroll_status = 'COMPLETED';
    run.completed_at = new Date();
    await run.save();

    return run;
  },

  /**
   * Check if a specific attendance record can be modified.
   */
  isRecordEditable(record) {
    return !record.payroll_processed;
  }
};

export default PayrollLockService;
