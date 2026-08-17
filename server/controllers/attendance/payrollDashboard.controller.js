/**
 * Payroll Dashboard Controller
 *
 * Handles all payroll dashboard, entry screen, reports, payslip, and bank transfer APIs.
 */

import PayrollRun from '../../model/attendance/PayrollRun.js';
import PayrollSummary from '../../model/attendance/PayrollSummary.js';
import EmployeePayrollConfig from '../../model/attendance/EmployeePayrollConfig.js';
import SalaryStructure from '../../model/attendance/SalaryStructure.js';
import StatutoryConfig from '../../model/attendance/StatutoryConfig.js';
import User from '../../model/userModel.mjs';
import { isRestrictedAllowedAdmin, getRestrictedEmployeeIds } from '../../utils/attendance/allowedAdminRestriction.mjs';

/**
 * Permission check helper — consistent with payroll.controller.js
 */
const checkDashboardAccess = (actor) => {
  const actorRoleNorm = String(actor.role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  const isActorAdmin = actorRoleNorm === 'ADMIN';
  const isDynamicAdmin = actor.isAttendanceAllowedAdmin === true;
  return isActorAdmin || isDynamicAdmin;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard KPIs
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/payroll/dashboard/kpis?companyId=xxx&year=2026&month=08
 */
export const getDashboardKPIs = async (req, res) => {
  try {
    if (!checkDashboardAccess(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { companyId, year, month } = req.query;
    if (!companyId || !year || !month) {
      return res.status(400).json({ success: false, message: 'companyId, year, and month are required' });
    }

    const monthStr = String(month).padStart(2, '0');
    const yearNum = parseInt(year, 10);

    // Get current month's run
    const run = await PayrollRun.findOne({
      company_id: companyId,
      payroll_year: yearNum,
      payroll_month: monthStr
    }).lean();

    // Get summaries for current month
    let summaryQuery = { company_id: companyId, payroll_year: yearNum, payroll_month: monthStr };
    if (isRestrictedAllowedAdmin(req.user)) {
      const restrictedIds = await getRestrictedEmployeeIds(req.user);
      summaryQuery.employee_id = { $in: restrictedIds };
    }

    const summaries = await PayrollSummary.find(summaryQuery)
      .populate('employee_id', 'first_name last_name employee_code department designation employee_photo')
      .lean();

    // Calculate KPIs
    const totalEmployees = summaries.length;
    const totalGross = summaries.reduce((s, r) => s + (r.gross_amount || 0), 0);
    const totalNet = summaries.reduce((s, r) => s + (r.net_payable_amount || 0), 0);
    const totalDeductions = summaries.reduce((s, r) => s + (r.deduction_amount || 0), 0);
    const totalPF = summaries.reduce((s, r) => s + (r.pf_employee || 0) + (r.pf_employer || 0), 0);
    const totalESI = summaries.reduce((s, r) => s + (r.esi_employee || 0) + (r.esi_employer || 0), 0);
    const totalPT = summaries.reduce((s, r) => s + (r.professional_tax || 0), 0);
    const avgSalary = totalEmployees > 0 ? Math.round(totalNet / totalEmployees) : 0;

    // Department-wise breakdown
    const deptMap = {};
    for (const s of summaries) {
      const dept = s.employee_id?.department || 'Unknown';
      if (!deptMap[dept]) deptMap[dept] = { department: dept, count: 0, grossTotal: 0, netTotal: 0 };
      deptMap[dept].count++;
      deptMap[dept].grossTotal += s.gross_amount || 0;
      deptMap[dept].netTotal += s.net_payable_amount || 0;
    }
    const departmentBreakdown = Object.values(deptMap);

    // Category breakdown (Operator vs Management)
    const operatorCount = summaries.filter(s => s.is_operator).length;
    const managementCount = totalEmployees - operatorCount;

    // Month-over-month trend (last 6 months)
    const trendMonths = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(yearNum, parseInt(monthStr, 10) - 1 - i, 1);
      trendMonths.push({
        year: d.getFullYear(),
        month: String(d.getMonth() + 1).padStart(2, '0')
      });
    }

    const trendData = [];
    for (const tm of trendMonths) {
      const trendSummaries = await PayrollSummary.find({
        company_id: companyId,
        payroll_year: tm.year,
        payroll_month: tm.month
      }).lean();

      trendData.push({
        year: tm.year,
        month: tm.month,
        label: new Date(tm.year, parseInt(tm.month, 10) - 1).toLocaleString('en', { month: 'short', year: '2-digit' }),
        totalGross: trendSummaries.reduce((s, r) => s + (r.gross_amount || 0), 0),
        totalNet: trendSummaries.reduce((s, r) => s + (r.net_payable_amount || 0), 0),
        totalDeductions: trendSummaries.reduce((s, r) => s + (r.deduction_amount || 0), 0),
        employeeCount: trendSummaries.length
      });
    }

    res.json({
      success: true,
      data: {
        run,
        kpis: {
          totalEmployees,
          totalGross: Math.round(totalGross),
          totalNet: Math.round(totalNet),
          totalDeductions: Math.round(totalDeductions),
          totalPF: Math.round(totalPF),
          totalESI: Math.round(totalESI),
          totalPT: Math.round(totalPT),
          avgSalary,
          operatorCount,
          managementCount
        },
        departmentBreakdown,
        trendData,
        summaries
      }
    });
  } catch (error) {
    console.error('getDashboardKPIs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Payroll Entries (Entry Screen)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/payroll/dashboard/entries/:companyId/:year/:month
 */
export const getPayrollEntries = async (req, res) => {
  try {
    if (!checkDashboardAccess(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { companyId, year, month } = req.params;
    const monthStr = String(month).padStart(2, '0');

    let query = {
      company_id: companyId,
      payroll_year: parseInt(year, 10),
      payroll_month: monthStr
    };

    if (isRestrictedAllowedAdmin(req.user)) {
      const restrictedIds = await getRestrictedEmployeeIds(req.user);
      query.employee_id = { $in: restrictedIds };
    }

    const summaries = await PayrollSummary.find(query)
      .populate('employee_id', 'username first_name last_name employee_code department designation employee_photo bank_account_no bank_name ifsc_code name_on_bank pan_no date_of_birth dob')
      .populate('payroll_config_id')
      .sort({ 'employee_id.first_name': 1 })
      .lean();

    const run = await PayrollRun.findOne({
      company_id: companyId,
      payroll_year: parseInt(year, 10),
      payroll_month: monthStr
    }).lean();

    res.json({ success: true, data: { summaries, run } });
  } catch (error) {
    console.error('getPayrollEntries error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/payroll/dashboard/entry/:summaryId
 * Manual adjustment on a single employee's payroll summary.
 */
export const updatePayrollEntry = async (req, res) => {
  try {
    if (!checkDashboardAccess(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { summaryId } = req.params;
    const { adjustment_amount, adjustment_remarks, other_deductions, other_deduction_remarks, remarks } = req.body;

    const summary = await PayrollSummary.findById(summaryId);
    if (!summary) {
      return res.status(404).json({ success: false, message: 'Summary not found' });
    }

    // Check if payroll is locked
    const run = await PayrollRun.findById(summary.payroll_run_id).lean();
    if (run && run.payroll_status === 'LOCKED') {
      return res.status(400).json({ success: false, message: 'Payroll is locked. Unlock before making changes.' });
    }

    // Apply adjustments
    if (adjustment_amount !== undefined) summary.adjustment_amount = adjustment_amount;
    if (adjustment_remarks !== undefined) summary.adjustment_remarks = adjustment_remarks;
    if (other_deductions !== undefined) summary.other_deductions = other_deductions;
    if (other_deduction_remarks !== undefined) summary.other_deduction_remarks = other_deduction_remarks;
    if (remarks !== undefined) summary.remarks = remarks;

    // Recalculate net payable
    const totalDeductions = (summary.pf_employee || 0) + (summary.esi_employee || 0) +
      (summary.professional_tax || 0) + (summary.tds || 0) + (summary.other_deductions || 0);
    summary.deduction_amount = totalDeductions;
    summary.net_payable_amount = Math.round(
      ((summary.gross_amount || 0) - totalDeductions + (summary.adjustment_amount || 0)) * 100
    ) / 100;

    await summary.save();

    res.json({ success: true, data: summary, message: 'Entry updated successfully' });
  } catch (error) {
    console.error('updatePayrollEntry error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Reports
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generic report fetcher — used by all report endpoints.
 */
const getReportData = async (req, fields = []) => {
  const { companyId, year, month } = req.params;
  const monthStr = String(month).padStart(2, '0');

  let query = {
    company_id: companyId,
    payroll_year: parseInt(year, 10),
    payroll_month: monthStr
  };

  if (isRestrictedAllowedAdmin(req.user)) {
    const restrictedIds = await getRestrictedEmployeeIds(req.user);
    query.employee_id = { $in: restrictedIds };
  }

  const selectFields = fields.length > 0 ? fields.join(' ') : '';

  const summaries = await PayrollSummary.find(query)
    .select(selectFields || undefined)
    .populate('employee_id', 'first_name last_name employee_code department designation pf_no esic_no pan_no uan_number bank_account_no bank_name ifsc_code name_on_bank')
    .sort({ 'employee_id.first_name': 1 })
    .lean();

  return summaries;
};

/**
 * GET /api/payroll/reports/salary-register/:companyId/:year/:month
 */
export const getSalaryRegister = async (req, res) => {
  try {
    if (!checkDashboardAccess(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const summaries = await getReportData(req);
    res.json({ success: true, data: summaries });
  } catch (error) {
    console.error('getSalaryRegister error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/payroll/reports/pf/:companyId/:year/:month
 */
export const getPFReport = async (req, res) => {
  try {
    if (!checkDashboardAccess(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const summaries = await getReportData(req, [
      'employee_id', 'payroll_month', 'payroll_year',
      'basic_amount', 'gross_amount', 'pf_employee', 'pf_employer',
      'earnings_breakup'
    ]);

    // Enrich with PF numbers from user
    const data = summaries.map(s => ({
      ...s,
      pf_no: s.employee_id?.pf_no || '',
      uan_number: s.employee_id?.uan_number || ''
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('getPFReport error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/payroll/reports/esi/:companyId/:year/:month
 */
export const getESIReport = async (req, res) => {
  try {
    if (!checkDashboardAccess(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const summaries = await getReportData(req, [
      'employee_id', 'payroll_month', 'payroll_year',
      'gross_amount', 'esi_employee', 'esi_employer'
    ]);

    const data = summaries.map(s => ({
      ...s,
      esic_no: s.employee_id?.esic_no || ''
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('getESIReport error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/payroll/reports/pt/:companyId/:year/:month
 */
export const getPTReport = async (req, res) => {
  try {
    if (!checkDashboardAccess(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const summaries = await getReportData(req, [
      'employee_id', 'payroll_month', 'payroll_year',
      'gross_amount', 'professional_tax'
    ]);
    res.json({ success: true, data: summaries });
  } catch (error) {
    console.error('getPTReport error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/payroll/reports/department/:companyId/:year/:month
 */
export const getDepartmentReport = async (req, res) => {
  try {
    if (!checkDashboardAccess(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const summaries = await getReportData(req);

    // Aggregate by department
    const deptMap = {};
    for (const s of summaries) {
      const dept = s.employee_id?.department || 'Unknown';
      if (!deptMap[dept]) {
        deptMap[dept] = {
          department: dept,
          count: 0,
          totalGross: 0,
          totalNet: 0,
          totalPF: 0,
          totalESI: 0,
          totalPT: 0,
          totalDeductions: 0,
          employees: []
        };
      }
      deptMap[dept].count++;
      deptMap[dept].totalGross += s.gross_amount || 0;
      deptMap[dept].totalNet += s.net_payable_amount || 0;
      deptMap[dept].totalPF += (s.pf_employee || 0) + (s.pf_employer || 0);
      deptMap[dept].totalESI += (s.esi_employee || 0) + (s.esi_employer || 0);
      deptMap[dept].totalPT += s.professional_tax || 0;
      deptMap[dept].totalDeductions += s.deduction_amount || 0;
      deptMap[dept].employees.push(s);
    }

    res.json({ success: true, data: Object.values(deptMap) });
  } catch (error) {
    console.error('getDepartmentReport error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Payslip PDF Data
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/payroll/payslip/:summaryId/data
 * Returns all data needed to generate payslip PDF on client side.
 */
export const getPayslipData = async (req, res) => {
  try {
    if (!checkDashboardAccess(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { summaryId } = req.params;
    const summary = await PayrollSummary.findById(summaryId)
      .populate('employee_id', 'first_name last_name employee_code department designation date_of_birth dob pan_no pf_no esic_no uan_number bank_account_no bank_name ifsc_code name_on_bank employee_photo')
      .populate('payroll_config_id')
      .lean();

    if (!summary) {
      return res.status(404).json({ success: false, message: 'Payroll summary not found' });
    }

    // Get statutory config for payslip branding
    const statutoryConfig = await StatutoryConfig.findOne({ company_id: summary.company_id }).lean();

    // Determine password
    let password = '';
    const passwordRule = statutoryConfig?.payslip_password_rule || 'DOB';
    const emp = summary.employee_id;
    if (passwordRule === 'DOB') {
      const dob = emp?.date_of_birth || emp?.dob || '';
      // Try to parse and format as DDMMYYYY
      if (dob) {
        const d = new Date(dob);
        if (!isNaN(d.getTime())) {
          password = `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;
        } else {
          // Try raw string parsing (DD-MM-YYYY or DD/MM/YYYY)
          password = dob.replace(/[-/]/g, '');
        }
      }
    } else if (passwordRule === 'PAN') {
      password = (emp?.pan_no || '').toUpperCase().slice(-4);
    } else if (passwordRule === 'EMP_CODE_DOB_DAY') {
      const code = emp?.employee_code || '';
      const dob = emp?.date_of_birth || emp?.dob || '';
      let dobDay = '01';
      if (dob) {
        const d = new Date(dob);
        if (!isNaN(d.getTime())) {
          dobDay = String(d.getDate()).padStart(2, '0');
        }
      }
      password = `${code}${dobDay}`;
    }

    res.json({
      success: true,
      data: {
        summary,
        companyInfo: {
          name: statutoryConfig?.payslip_company_name || '',
          address: statutoryConfig?.payslip_company_address || '',
          logo: statutoryConfig?.payslip_company_logo_url || ''
        },
        password,
        passwordRule
      }
    });
  } catch (error) {
    console.error('getPayslipData error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/payroll/payslips/bulk
 * Returns bulk payslip data for all employees in a run.
 * Body: { runId }
 */
export const getBulkPayslipData = async (req, res) => {
  try {
    if (!checkDashboardAccess(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { runId } = req.body;
    if (!runId) {
      return res.status(400).json({ success: false, message: 'runId is required' });
    }

    let query = { payroll_run_id: runId };
    if (isRestrictedAllowedAdmin(req.user)) {
      const restrictedIds = await getRestrictedEmployeeIds(req.user);
      query.employee_id = { $in: restrictedIds };
    }

    const summaries = await PayrollSummary.find(query)
      .populate('employee_id', 'first_name last_name employee_code department designation date_of_birth dob pan_no pf_no esic_no uan_number bank_account_no bank_name ifsc_code name_on_bank')
      .lean();

    const run = await PayrollRun.findById(runId).lean();
    const statutoryConfig = run ? await StatutoryConfig.findOne({ company_id: run.company_id }).lean() : null;

    res.json({
      success: true,
      data: {
        summaries,
        run,
        companyInfo: {
          name: statutoryConfig?.payslip_company_name || '',
          address: statutoryConfig?.payslip_company_address || '',
          logo: statutoryConfig?.payslip_company_logo_url || ''
        },
        passwordRule: statutoryConfig?.payslip_password_rule || 'DOB'
      }
    });
  } catch (error) {
    console.error('getBulkPayslipData error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Bank Transfer File
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/payroll/bank-transfer/:runId
 * Returns data for bank transfer file generation (client-side CSV/Excel).
 */
export const getBankTransferData = async (req, res) => {
  try {
    if (!checkDashboardAccess(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { runId } = req.params;
    const run = await PayrollRun.findById(runId).lean();
    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    let query = { payroll_run_id: runId };
    if (isRestrictedAllowedAdmin(req.user)) {
      const restrictedIds = await getRestrictedEmployeeIds(req.user);
      query.employee_id = { $in: restrictedIds };
    }

    const summaries = await PayrollSummary.find(query)
      .populate('employee_id', 'first_name last_name employee_code bank_account_no bank_name ifsc_code name_on_bank')
      .lean();

    // Shape data for bank transfer
    const transfers = summaries
      .filter(s => s.net_payable_amount > 0)
      .map(s => ({
        employee_code: s.employee_id?.employee_code || '',
        employee_name: `${s.employee_id?.first_name || ''} ${s.employee_id?.last_name || ''}`.trim(),
        name_on_bank: s.employee_id?.name_on_bank || '',
        bank_name: s.employee_id?.bank_name || '',
        bank_account_no: s.employee_id?.bank_account_no || '',
        ifsc_code: s.employee_id?.ifsc_code || '',
        net_amount: s.net_payable_amount,
        narration: `Salary ${run.payroll_month}/${run.payroll_year}`
      }));

    res.json({
      success: true,
      data: {
        run,
        transfers,
        totalAmount: transfers.reduce((s, t) => s + t.net_amount, 0),
        totalTransfers: transfers.length
      }
    });
  } catch (error) {
    console.error('getBankTransferData error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Statutory Config CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/payroll/statutory-config/:companyId
 */
export const getStatutoryConfig = async (req, res) => {
  try {
    if (!checkDashboardAccess(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { companyId } = req.params;
    let config = await StatutoryConfig.findOne({ company_id: companyId }).lean();

    // Return defaults if none exists
    if (!config) {
      config = {
        company_id: companyId,
        pf_rate_employee: 12,
        pf_rate_employer: 12,
        pf_ceiling: 15000,
        pf_enabled: true,
        esi_rate_employee: 0.75,
        esi_rate_employer: 3.25,
        esi_ceiling: 21000,
        esi_enabled: true,
        pt_enabled: true,
        pt_state: 'Maharashtra',
        pt_slabs: [
          { from: 0, to: 7500, amount: 0 },
          { from: 7501, to: 10000, amount: 175 },
          { from: 10001, to: 999999999, amount: 200 }
        ],
        tds_enabled: false,
        payslip_password_rule: 'DOB'
      };
    }

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('getStatutoryConfig error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/payroll/statutory-config/:companyId
 */
export const updateStatutoryConfig = async (req, res) => {
  try {
    if (!checkDashboardAccess(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { companyId } = req.params;
    const updateData = { ...req.body, updated_by: req.user._id };
    delete updateData.company_id; // Don't allow changing company_id

    const config = await StatutoryConfig.findOneAndUpdate(
      { company_id: companyId },
      { $set: { ...updateData, company_id: companyId } },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: config, message: 'Statutory configuration updated' });
  } catch (error) {
    console.error('updateStatutoryConfig error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Payroll Master — Employee List with Payroll Config
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/payroll/master/employees?companyId=xxx
 */
export const getPayrollMasterList = async (req, res) => {
  try {
    if (!checkDashboardAccess(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'companyId is required' });
    }

    // Get all active payroll configs for this company
    let configQuery = { company_id: companyId, status: 'ACTIVE' };
    if (isRestrictedAllowedAdmin(req.user)) {
      const restrictedIds = await getRestrictedEmployeeIds(req.user);
      configQuery.employee_id = { $in: restrictedIds };
    }

    const configs = await EmployeePayrollConfig.find(configQuery)
      .populate('employee_id', 'first_name last_name employee_code department designation employee_photo bank_account_no bank_name ifsc_code name_on_bank pan_no pf_no esic_no uan_number date_of_birth date_of_joining')
      .lean();

    // Also get salary structures
    const employeeIds = configs.map(c => c.employee_id?._id || c.employee_id);
    const structures = await SalaryStructure.find({
      employee_id: { $in: employeeIds },
      status: 'ACTIVE'
    }).lean();

    const structureMap = {};
    for (const s of structures) {
      structureMap[s.employee_id.toString()] = s;
    }

    const result = configs.map(c => ({
      config: c,
      employee: c.employee_id,
      salaryStructure: structureMap[
        (c.employee_id?._id || c.employee_id)?.toString()
      ] || null
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('getPayrollMasterList error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
