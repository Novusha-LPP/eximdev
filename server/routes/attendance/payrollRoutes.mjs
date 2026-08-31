import express from 'express';
import attendanceAuthBridge from '../../middleware/attendanceAuthBridge.mjs';
import requireRole from '../../middleware/requireRole.mjs';
import requireAllowedAdmin from '../../middleware/requireAllowedAdmin.mjs';
import * as payrollCtrl from '../../controllers/attendance/payroll.controller.js';

const router = express.Router();

// ─── Employee Payroll Configuration ────────────────────────────────────────
router.get('/config/:employeeId', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.getEmployeePayrollConfig);
router.put('/config/:employeeId', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.updateEmployeePayrollConfig);
router.post('/config/toggle-operator', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.toggleEmployeeOperatorStatus);
router.get('/config-history/:employeeId', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.getPayrollConfigHistory);

// ─── Payroll Run ───────────────────────────────────────────────────────────
router.post('/generate', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, payrollCtrl.generatePayroll);
router.get('/run/:companyId/:year/:month', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.getPayrollRun);
router.get('/summaries/:runId', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.getPayrollSummaries);
router.get('/summary/:employeeId/:year/:month', attendanceAuthBridge, payrollCtrl.getEmployeePayrollSummary);
router.get('/history/:employeeId', attendanceAuthBridge, payrollCtrl.getEmployeePayrollHistory);
router.post('/lock/:runId', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, payrollCtrl.lockPayrollRun);
router.post('/unlock/:runId', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, payrollCtrl.unlockPayrollRun);

// ─── Salary Structure ──────────────────────────────────────────────────────
router.get('/salary-structure/:employeeId', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.getSalaryStructure);
router.put('/salary-structure/:employeeId', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.saveSalaryStructure);
router.get('/salary-structure-history/:employeeId', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.getSalaryStructureHistory);

// ─── Export ────────────────────────────────────────────────────────────────
router.get('/export/:runId', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), payrollCtrl.exportPayrollExcel);

// ─── Profile Update ────────────────────────────────────────────────────────
router.put('/users/:userId/profile', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, payrollCtrl.updateUserProfile);

// ─── Photo Proxy ───────────────────────────────────────────
router.get('/proxy-photo', attendanceAuthBridge, payrollCtrl.proxyPhoto);

export default router;
