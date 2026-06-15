/**
 * Payroll Controller
 *
 * Handles all payroll-related API endpoints:
 *   - Employee Payroll Config (CRUD + revision history)
 *   - Payroll Run (generate, lock, unlock)
 *   - Payroll Summary (view per employee / per run)
 *   - Salary Structure (CRUD + history)
 *   - Excel export
 */

import EmployeePayrollConfig from '../../model/attendance/EmployeePayrollConfig.js';
import PayrollRun from '../../model/attendance/PayrollRun.js';
import PayrollSummary from '../../model/attendance/PayrollSummary.js';
import SalaryStructure from '../../model/attendance/SalaryStructure.js';
import PayrollGenerator from '../../services/payroll/payrollCalculation.service.js';
import PayrollLockService from '../../services/payroll/payrollLock.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Employee Payroll Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/payroll/config/:employeeId
 * Returns the ACTIVE payroll config for an employee.
 */
export const getEmployeePayrollConfig = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const config = await EmployeePayrollConfig.findOne({
      employee_id: employeeId,
      status: 'ACTIVE'
    }).lean();

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('getEmployeePayrollConfig error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/payroll/config/:employeeId
 * Creates a new payroll config, superseding any existing ACTIVE one.
 * Supports salary revision history.
 */
export const updateEmployeePayrollConfig = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const userId = req.user?._id;
    const {
      company_id,
      is_operator,
      payroll_type,
      monthly_salary,
      daily_wage,
      overtime_rate_per_hour,
      overtime_eligible,
      overtime_grace_minutes,
      effective_from,
      revision_reason
    } = req.body;

    if (!company_id) {
      return res.status(400).json({ success: false, message: 'company_id is required.' });
    }
    if (!effective_from) {
      return res.status(400).json({ success: false, message: 'effective_from date is required.' });
    }

    // Supersede existing ACTIVE config
    const existingActive = await EmployeePayrollConfig.findOne({
      employee_id: employeeId,
      status: 'ACTIVE'
    });

    if (existingActive) {
      existingActive.status = 'SUPERSEDED';
      existingActive.effective_to = new Date(effective_from);
      existingActive.updated_by = userId;
      await existingActive.save();
    }

    // Create new ACTIVE config
    const newConfig = await EmployeePayrollConfig.create({
      employee_id: employeeId,
      company_id,
      is_operator: is_operator || false,
      payroll_type: payroll_type || (is_operator ? 'DAILY_WAGE' : 'MONTHLY'),
      monthly_salary: monthly_salary || 0,
      daily_wage: daily_wage || 0,
      overtime_rate_per_hour: overtime_rate_per_hour || 0,
      overtime_eligible: overtime_eligible || false,
      overtime_grace_minutes: overtime_grace_minutes ?? 20,
      effective_from: new Date(effective_from),
      effective_to: null,
      status: 'ACTIVE',
      created_by: userId,
      revision_reason: revision_reason || (existingActive ? 'Revision' : 'Initial setup')
    });

    res.json({ success: true, data: newConfig, message: 'Payroll configuration saved.' });
  } catch (error) {
    console.error('updateEmployeePayrollConfig error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/payroll/config-history/:employeeId
 * Returns all payroll configs for an employee (including SUPERSEDED).
 */
export const getPayrollConfigHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const configs = await EmployeePayrollConfig.find({
      employee_id: employeeId
    })
      .sort({ effective_from: -1 })
      .populate('created_by', 'username first_name last_name')
      .populate('updated_by', 'username first_name last_name')
      .lean();

    res.json({ success: true, data: configs });
  } catch (error) {
    console.error('getPayrollConfigHistory error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Payroll Run
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/payroll/generate
 * Triggers payroll generation for a company + month.
 * Body: { company_id, year, month }
 */
export const generatePayroll = async (req, res) => {
  try {
    const { company_id, year, month } = req.body;
    const userId = req.user?._id;

    if (!company_id || !year || !month) {
      return res.status(400).json({ success: false, message: 'company_id, year, and month are required.' });
    }

    const result = await PayrollGenerator.generate({
      companyId: company_id,
      year: parseInt(year, 10),
      month: String(month).padStart(2, '0'),
      generatedBy: userId
    });

    res.json({
      success: true,
      data: {
        payrollRun: result.payrollRun,
        summaryCount: result.summaries.length,
        errors: result.errors
      },
      message: `Payroll generated for ${result.summaries.length} employees.`
    });
  } catch (error) {
    console.error('generatePayroll error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/payroll/run/:companyId/:year/:month
 * Gets a specific payroll run.
 */
export const getPayrollRun = async (req, res) => {
  try {
    const { companyId, year, month } = req.params;

    const run = await PayrollRun.findOne({
      company_id: companyId,
      payroll_year: parseInt(year, 10),
      payroll_month: String(month).padStart(2, '0')
    })
      .populate('generated_by', 'username first_name last_name')
      .populate('locked_by', 'username first_name last_name')
      .lean();

    res.json({ success: true, data: run });
  } catch (error) {
    console.error('getPayrollRun error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/payroll/summaries/:runId
 * Lists all employee summaries for a given payroll run.
 */
export const getPayrollSummaries = async (req, res) => {
  try {
    const { runId } = req.params;

    const summaries = await PayrollSummary.find({ payroll_run_id: runId })
      .populate('employee_id', 'username first_name last_name employee_code employee_photo designation')
      .sort({ 'employee_id.first_name': 1 })
      .lean();

    res.json({ success: true, data: summaries });
  } catch (error) {
    console.error('getPayrollSummaries error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/payroll/summary/:employeeId/:year/:month
 * Gets a single employee's payroll summary for a given month.
 */
export const getEmployeePayrollSummary = async (req, res) => {
  try {
    const { employeeId, year, month } = req.params;

    const summary = await PayrollSummary.findOne({
      employee_id: employeeId,
      payroll_year: parseInt(year, 10),
      payroll_month: String(month).padStart(2, '0')
    })
      .populate('payroll_run_id')
      .populate('payroll_config_id')
      .lean();

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('getEmployeePayrollSummary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/payroll/lock/:runId
 */
export const lockPayrollRun = async (req, res) => {
  try {
    const { runId } = req.params;
    const userId = req.user?._id;

    const run = await PayrollLockService.lockRun(runId, userId);
    res.json({ success: true, data: run, message: 'Payroll locked successfully.' });
  } catch (error) {
    console.error('lockPayrollRun error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/payroll/unlock/:runId
 */
export const unlockPayrollRun = async (req, res) => {
  try {
    const { runId } = req.params;
    const userId = req.user?._id;

    const run = await PayrollLockService.unlockRun(runId, userId);
    res.json({ success: true, data: run, message: 'Payroll unlocked successfully.' });
  } catch (error) {
    console.error('unlockPayrollRun error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Salary Structure
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/payroll/salary-structure/:employeeId
 * Returns the ACTIVE salary structure.
 */
export const getSalaryStructure = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const structure = await SalaryStructure.findOne({
      employee_id: employeeId,
      status: 'ACTIVE'
    }).lean();

    res.json({ success: true, data: structure });
  } catch (error) {
    console.error('getSalaryStructure error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/payroll/salary-structure/:employeeId
 * Creates or updates the salary structure.
 */
export const saveSalaryStructure = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const userId = req.user?._id;
    const {
      company_id,
      effective_from,
      salary_type,
      gross_salary,
      components
    } = req.body;

    if (!effective_from || gross_salary === undefined) {
      return res.status(400).json({ success: false, message: 'effective_from and gross_salary are required.' });
    }

    // Supersede existing active structure
    const existingActive = await SalaryStructure.findOne({
      employee_id: employeeId,
      status: 'ACTIVE'
    });

    if (existingActive) {
      existingActive.status = 'SUPERSEDED';
      existingActive.effective_to = new Date(effective_from);
      existingActive.updated_by = userId;
      await existingActive.save();
    }

    const newStructure = await SalaryStructure.create({
      employee_id: employeeId,
      company_id,
      effective_from: new Date(effective_from),
      salary_type: salary_type || 'GROSS',
      gross_salary,
      components: components || [],
      status: 'ACTIVE',
      created_by: userId
    });

    res.json({ success: true, data: newStructure, message: 'Salary structure saved.' });
  } catch (error) {
    console.error('saveSalaryStructure error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/payroll/salary-structure-history/:employeeId
 */
export const getSalaryStructureHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const structures = await SalaryStructure.find({
      employee_id: employeeId
    })
      .sort({ effective_from: -1 })
      .populate('created_by', 'username first_name last_name')
      .lean();

    res.json({ success: true, data: structures });
  } catch (error) {
    console.error('getSalaryStructureHistory error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/payroll/export/:runId
 * Generates an Excel download with payroll data.
 * (Sends JSON for now — client-side Excel generation via exceljs)
 */
export const exportPayrollExcel = async (req, res) => {
  try {
    const { runId } = req.params;

    const run = await PayrollRun.findById(runId).lean();
    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found.' });
    }

    const summaries = await PayrollSummary.find({ payroll_run_id: runId })
      .populate('employee_id', 'username first_name last_name employee_code designation')
      .sort({ 'employee_id.first_name': 1 })
      .lean();

    res.json({
      success: true,
      data: {
        payrollRun: run,
        summaries
      }
    });
  } catch (error) {
    console.error('exportPayrollExcel error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
