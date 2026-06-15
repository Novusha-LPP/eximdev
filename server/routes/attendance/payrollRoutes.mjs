import express from 'express';
import attendanceAuthBridge from '../../middleware/attendanceAuthBridge.mjs';
import requireRole from '../../middleware/requireRole.mjs';
import requireAllowedAdmin from '../../middleware/requireAllowedAdmin.mjs';
import * as payrollCtrl from '../../controllers/attendance/payroll.controller.js';

const router = express.Router();

// ─── Employee Payroll Configuration ────────────────────────────────────────
router.get('/config/:employeeId', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.getEmployeePayrollConfig);
router.put('/config/:employeeId', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, payrollCtrl.updateEmployeePayrollConfig);
router.get('/config-history/:employeeId', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.getPayrollConfigHistory);

// ─── Payroll Run ───────────────────────────────────────────────────────────
router.post('/generate', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, payrollCtrl.generatePayroll);
router.get('/run/:companyId/:year/:month', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.getPayrollRun);
router.get('/summaries/:runId', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.getPayrollSummaries);
router.get('/summary/:employeeId/:year/:month', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.getEmployeePayrollSummary);
router.post('/lock/:runId', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, payrollCtrl.lockPayrollRun);
router.post('/unlock/:runId', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, payrollCtrl.unlockPayrollRun);

// ─── Salary Structure ──────────────────────────────────────────────────────
router.get('/salary-structure/:employeeId', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.getSalaryStructure);
router.put('/salary-structure/:employeeId', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, payrollCtrl.saveSalaryStructure);
router.get('/salary-structure-history/:employeeId', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.getSalaryStructureHistory);

// ─── Export ────────────────────────────────────────────────────────────────
router.get('/export/:runId', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.exportPayrollExcel);

export default router;
