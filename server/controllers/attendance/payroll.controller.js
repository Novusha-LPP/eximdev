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

import axios from 'axios';
import EmployeePayrollConfig from '../../model/attendance/EmployeePayrollConfig.js';
import PayrollRun from '../../model/attendance/PayrollRun.js';
import PayrollSummary from '../../model/attendance/PayrollSummary.js';
import SalaryStructure from '../../model/attendance/SalaryStructure.js';
import User from '../../model/userModel.mjs';
import PayrollGenerator from '../../services/payroll/payrollCalculation.service.js';
import PayrollLockService from '../../services/payroll/payrollLock.service.js';
import { isRestrictedAllowedAdmin, getRestrictedEmployeeIds } from '../../utils/attendance/allowedAdminRestriction.mjs';

/**
 * Helper to check if the actor has permission to read/write payroll config of target employee.
 * Only global admins and the two restricted allowed admins (ajith_sivadasan, afzal_ghanchi)
 * are authorized. Restricted allowed admins are scoped only to their team members.
 */
const checkPayrollAccess = async (actor, employeeId, mode = 'read') => {
  const actorRoleNorm = String(actor.role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  const isActorAdmin = actorRoleNorm === 'ADMIN';
  const isRestricted = isRestrictedAllowedAdmin(actor);
  const isDynamicAdmin = actor.isAttendanceAllowedAdmin === true;

  // 1. Unrestricted global admins or non-restricted allowed admins
  let isAuthorized = (isActorAdmin || isDynamicAdmin) && !isRestricted;

  // 2. Restricted allowed admins (ajith_sivadasan, afzal_ghanchi) can access their team members
  if (!isAuthorized && isRestricted) {
    const restrictedIds = await getRestrictedEmployeeIds(actor);
    if (restrictedIds && restrictedIds.includes(employeeId.toString())) {
      isAuthorized = true;
    }
  }

  return isAuthorized;
};


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

    const isAuthorized = await checkPayrollAccess(req.user, employeeId, 'read');
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Authorization denied: Only admins and authorized allowed admins can view payroll config' });
    }

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
      revision_reason,
      grade,
      band,
      pf_applicable,
      esi_applicable,
      pt_applicable
    } = req.body;

    const isAuthorized = await checkPayrollAccess(req.user, employeeId, 'write');
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Authorization denied: Only admins and authorized allowed admins can update payroll config' });
    }

    if (is_operator !== undefined) {
      await User.findByIdAndUpdate(employeeId, { is_operator: !!is_operator });
    }

    let resolvedCompanyId = company_id;
    if (!resolvedCompanyId) {
      const employeeUser = await User.findById(employeeId).select('company_id').lean();
      resolvedCompanyId = employeeUser?.company_id;
    }
    if (!resolvedCompanyId) {
      return res.status(400).json({ success: false, message: 'company_id is required.' });
    }

    const effectiveDate = effective_from ? new Date(effective_from) : new Date();

    // Supersede existing ACTIVE config
    const existingActive = await EmployeePayrollConfig.findOne({
      employee_id: employeeId,
      status: 'ACTIVE'
    });

    if (existingActive) {
      existingActive.status = 'SUPERSEDED';
      existingActive.effective_to = effectiveDate;
      existingActive.updated_by = userId;
      await existingActive.save();
    }

    // Create new ACTIVE config
    const newConfig = await EmployeePayrollConfig.create({
      employee_id: employeeId,
      company_id: resolvedCompanyId,
      is_operator: is_operator || false,
      payroll_type: payroll_type || (is_operator ? 'DAILY_WAGE' : 'MONTHLY'),
      monthly_salary: monthly_salary || 0,
      daily_wage: daily_wage || 0,
      overtime_rate_per_hour: overtime_rate_per_hour || 0,
      overtime_eligible: overtime_eligible !== undefined ? overtime_eligible : (is_operator || false),
      overtime_grace_minutes: overtime_grace_minutes ?? 20,
      grade: grade || '',
      band: band || '',
      pf_applicable: pf_applicable !== undefined ? pf_applicable : true,
      esi_applicable: esi_applicable !== undefined ? esi_applicable : true,
      pt_applicable: pt_applicable !== undefined ? pt_applicable : true,
      effective_from: effectiveDate,
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

    const isAuthorized = await checkPayrollAccess(req.user, employeeId, 'read');
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Authorization denied: Only admins and authorized allowed admins can view config history' });
    }

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
    const { company_id, year, month, employee_id } = req.body;
    const userId = req.user?._id;

    if (!company_id || !year || !month) {
      return res.status(400).json({ success: false, message: 'company_id, year, and month are required.' });
    }

    const result = await PayrollGenerator.generate({
      companyId: company_id,
      year: parseInt(year, 10),
      month: String(month).padStart(2, '0'),
      generatedBy: userId,
      employeeId: employee_id
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
    const actor = req.user;
    const actorRoleNorm = String(actor.role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
    const isActorAdmin = actorRoleNorm === 'ADMIN';
    const isDynamicAdmin = actor.isAttendanceAllowedAdmin === true;
    const isRestricted = isRestrictedAllowedAdmin(actor);

    if (!isActorAdmin && !isDynamicAdmin) {
      return res.status(403).json({ success: false, message: 'Authorization denied: Only admins and authorized allowed admins can view payroll summaries' });
    }

    let query = { payroll_run_id: runId };

    if (isRestricted) {
      const restrictedIds = await getRestrictedEmployeeIds(actor);
      query.employee_id = { $in: restrictedIds };
    }

    const summaries = await PayrollSummary.find(query)
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

    const isSelf = req.user && String(req.user._id) === String(employeeId);
    let isAuthorized = isSelf;

    if (!isAuthorized) {
      isAuthorized = await checkPayrollAccess(req.user, employeeId, 'read');
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Authorization denied: Only admins, HODs, or the employee themselves can view payroll summary' });
    }

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
 * GET /api/payroll/history/:employeeId
 * Gets an employee's payroll summaries history.
 */
export const getEmployeePayrollHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const isSelf = req.user && String(req.user._id) === String(employeeId);
    let isAuthorized = isSelf;

    if (!isAuthorized) {
      isAuthorized = await checkPayrollAccess(req.user, employeeId, 'read');
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Authorization denied' });
    }

    const summaries = await PayrollSummary.find({ employee_id: employeeId })
      .populate('employee_id', 'username first_name last_name employee_code department designation employee_photo bank_account_no bank_name ifsc_code name_on_bank pan_no date_of_birth dob joining_date date_of_joining pf_no esic_no uan_number')
      .populate('payroll_run_id')
      .populate('payroll_config_id')
      .sort({ payroll_year: -1, payroll_month: -1 })
      .lean();

    res.json({ success: true, data: summaries });
  } catch (error) {
    console.error('getEmployeePayrollHistory error:', error);
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

    const isAuthorized = await checkPayrollAccess(req.user, employeeId, 'read');
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Authorization denied: Only admins and authorized allowed admins can view salary structure' });
    }

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

    const isAuthorized = await checkPayrollAccess(req.user, employeeId, 'write');
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Authorization denied: Only admins and authorized allowed admins can save salary structure' });
    }

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

    const isAuthorized = await checkPayrollAccess(req.user, employeeId, 'read');
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Authorization denied: Only admins and authorized allowed admins can view salary structure history' });
    }

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
    const actor = req.user;
    const actorRoleNorm = String(actor.role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
    const isActorAdmin = actorRoleNorm === 'ADMIN';
    const isDynamicAdmin = actor.isAttendanceAllowedAdmin === true;
    const isRestricted = isRestrictedAllowedAdmin(actor);

    if (!isActorAdmin && !isDynamicAdmin) {
      return res.status(403).json({ success: false, message: 'Authorization denied: Only admins and authorized allowed admins can export payroll' });
    }

    const run = await PayrollRun.findById(runId).lean();
    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found.' });
    }

    let query = { payroll_run_id: runId };

    if (isRestricted) {
      const restrictedIds = await getRestrictedEmployeeIds(actor);
      query.employee_id = { $in: restrictedIds };
    }

    const summaries = await PayrollSummary.find(query)
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

/**
 * PUT /api/payroll/users/:userId/profile
 * Updates the user's profile and attendance settings.
 */
export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUserId = req.user?._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updatableFields = [
      // PF Details
      'pf_no', 'pf_joining_date', 'pf_bank', 'pf_bank_ifsc_code', 'pf_bank_account_number', 'uan_number', 'pf_not_applicable',
      // ESIC Details
      'esic_no', 'esic_joining_date', 'esic_end_month', 'esic_not_applicable',
      // Bank Details
      'bank_name', 'ifsc_code', 'bank_account_no', 'name_on_bank', 'bank_account_status',
      // Attendance Settings
      'biometric_serial_no', 'biometric_code', 'salary_calculation_act', 'payroll_frequency',
      'enable_full_month_presence', 'retirement_age', 'worker_type', 'employment_applicable_date',
      'employment_end_date', 'skill_category', 'relieving_date', 'notice_period_days', 'employment_type',
      // General
      'monthly_salary', 'date_of_joining'
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    // Handle nested attendance_settings mapping if provided
    if (req.body.attendance_settings && typeof req.body.attendance_settings === 'object') {
      user.attendance_settings = {
        ...user.attendance_settings,
        ...req.body.attendance_settings
      };
    }

    user.updated_by = adminUserId;
    await user.save();

    res.json({ success: true, data: user, message: 'Employee profile updated successfully.' });
  } catch (error) {
    console.error('updateUserProfile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleEmployeeOperatorStatus = async (req, res) => {
  try {
    const { employeeId, is_operator, category } = req.body;

    if (!employeeId || is_operator === undefined) {
      return res.status(400).json({ success: false, message: 'employeeId and is_operator are required' });
    }

    const isAuthorized = await checkPayrollAccess(req.user, employeeId, 'write');
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Authorization denied: Only admins and authorized allowed admins can update payroll config' });
    }

    // 1. Update User document
    const user = await User.findById(employeeId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.is_operator = !!is_operator;
    if (category) {
      user.category = category;
    }
    await user.save();

    // 2. Find existing active config
    const existingActive = await EmployeePayrollConfig.findOne({
      employee_id: employeeId,
      status: 'ACTIVE'
    });

    const companyId = user.company_id || existingActive?.company_id;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company ID could not be resolved for the employee' });
    }

    const effectiveDate = new Date();

    if (existingActive) {
      existingActive.status = 'SUPERSEDED';
      existingActive.effective_to = effectiveDate;
      existingActive.updated_by = req.user._id;
      await existingActive.save();
    }

    const resolvedPayrollType = is_operator ? 'DAILY_WAGE' : 'MONTHLY';
    const resolvedOvertimeEligible = !!is_operator;

    const newConfig = await EmployeePayrollConfig.create({
      employee_id: employeeId,
      company_id: companyId,
      is_operator: !!is_operator,
      category: category || user.category || 'Management',
      payroll_type: resolvedPayrollType,
      monthly_salary: existingActive?.monthly_salary || user.monthly_salary || 0,
      daily_wage: existingActive?.daily_wage || 0,
      overtime_rate_per_hour: existingActive?.overtime_rate_per_hour || 0,
      overtime_eligible: resolvedOvertimeEligible,
      overtime_grace_minutes: existingActive?.overtime_grace_minutes ?? 20,
      effective_from: effectiveDate,
      effective_to: null,
      status: 'ACTIVE',
      created_by: req.user._id,
      revision_reason: existingActive ? 'Operator status toggled' : 'Initial setup via operator status toggle'
    });

    res.json({
      success: true,
      data: {
        is_operator: user.is_operator,
        category: user.category,
        payrollConfig: newConfig
      },
      message: `Successfully set category to ${category || (is_operator ? 'Operator' : 'Management')} for ${user.username}`
    });
  } catch (error) {
    console.error('toggleEmployeeOperatorStatus error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const proxyPhoto = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required' });
    }
    
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    
    res.json({ success: true, data: `data:${contentType};base64,${base64}` });
  } catch (error) {
    console.error('proxyPhoto error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


