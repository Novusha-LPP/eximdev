import express from 'express';
import attendanceAuthBridge from '../../middleware/attendanceAuthBridge.mjs';
import requireRole from '../../middleware/requireRole.mjs';
import requireAllowedAdmin from '../../middleware/requireAllowedAdmin.mjs';
import * as dashCtrl from '../../controllers/attendance/payrollDashboard.controller.js';

const router = express.Router();

// ─── Dashboard KPIs ────────────────────────────────────────────────────────
router.get('/dashboard/kpis', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), dashCtrl.getDashboardKPIs);

// ─── Payroll Entries (Entry Screen) ────────────────────────────────────────
router.get('/dashboard/entries/:companyId/:year/:month', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), dashCtrl.getPayrollEntries);
router.put('/dashboard/entry/:summaryId', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, dashCtrl.updatePayrollEntry);

// ─── Reports ───────────────────────────────────────────────────────────────
router.get('/reports/salary-register/:companyId/:year/:month', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), dashCtrl.getSalaryRegister);
router.get('/reports/pf/:companyId/:year/:month', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), dashCtrl.getPFReport);
router.get('/reports/esi/:companyId/:year/:month', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), dashCtrl.getESIReport);
router.get('/reports/pt/:companyId/:year/:month', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), dashCtrl.getPTReport);
router.get('/reports/department/:companyId/:year/:month', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), dashCtrl.getDepartmentReport);

// ─── Payslip ───────────────────────────────────────────────────────────────
router.get('/payslip/:summaryId/data', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), dashCtrl.getPayslipData);
router.post('/payslips/bulk', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), dashCtrl.getBulkPayslipData);

// ─── Bank Transfer ─────────────────────────────────────────────────────────
router.get('/bank-transfer/:runId', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), dashCtrl.getBankTransferData);

// ─── Statutory Config ──────────────────────────────────────────────────────
router.get('/statutory-config/:companyId', attendanceAuthBridge, dashCtrl.getStatutoryConfig);
router.put('/statutory-config/:companyId', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, dashCtrl.updateStatutoryConfig);

// ─── Payroll Master ────────────────────────────────────────────────────────
router.get('/master/employees', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), dashCtrl.getPayrollMasterList);

export default router;
