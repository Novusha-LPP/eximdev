import express from 'express';
import attendanceAuthBridge from '../../middleware/attendanceAuthBridge.mjs';
import requireRole from '../../middleware/requireRole.mjs';
import requireAllowedAdmin from '../../middleware/requireAllowedAdmin.mjs';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import * as attendanceCtrl from '../../controllers/attendance/attendance.controller.js';
import * as hodCtrl from '../../controllers/attendance/HOD.controller.js';

const router = express.Router();

// Employee Routes
router.post('/punch', attendanceAuthBridge, attendanceCtrl.punch);
router.get('/my-today', attendanceAuthBridge, attendanceCtrl.getMyTodayAttendance);
router.get('/dashboard', attendanceAuthBridge, attendanceCtrl.getDashboardData);
router.get('/history', attendanceAuthBridge, attendanceCtrl.getHistory);
router.get('/regularizations', attendanceAuthBridge, attendanceCtrl.getRegularizations);
router.post('/regularization', attendanceAuthBridge, attendanceCtrl.requestRegularization);
router.post('/regularization/cancel/:id', attendanceAuthBridge, attendanceCtrl.cancelRegularization);
router.post('/regularization/approve/:id', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), attendanceCtrl.approveRegularization);

// HOD / Manager Routes
router.post('/calculate-daily', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), attendanceCtrl.calculateDailyAttendance);
router.get('/HODDashboard', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), hodCtrl.getDashboard);
router.get('/department-report', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), hodCtrl.getDepartmentAttendanceReport);
router.get('/adminDashboard', attendanceAuthBridge, requireRole('ADMIN'), attendanceCtrl.getAdminDashboardData);
router.post('/lock', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, attendanceCtrl.lockMonthAttendance);
router.get('/payroll', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, attendanceCtrl.getPayrollData);
router.get('/payroll-locks', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, attendanceCtrl.getPayrollLocks);
router.post('/toggle-lock', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, attendanceCtrl.togglePayrollLock);
router.get('/admin-report', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), attendanceCtrl.getAdminAttendanceReport);
router.get('/team-report', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), attendanceCtrl.getTeamAttendanceReport);
router.get('/admin-leave-requests', attendanceAuthBridge, requireRole('ADMIN'), hodCtrl.getAdminLeaveRequests);
router.delete('/leave-application/:id', attendanceAuthBridge, requireRole('ADMIN'), hodCtrl.deleteLeaveApplication);
router.put('/employee-profile-hod/:id', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), attendanceCtrl.updateEmployeeProfileHOD);
router.post('/approve-request', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), hodCtrl.approveRequest);
router.put('/new', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), attendanceCtrl.createManualAdjustment);
router.put('/:id', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), attendanceCtrl.updateAttendanceRecord);
router.delete('/:id', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), attendanceCtrl.deleteAttendanceRecord);
router.get('/employee-full-profile/:id', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), attendanceCtrl.getEmployeeFullProfile);
router.get('/employee-migration-history/:id', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), attendanceCtrl.getEmployeeMigrationHistory);
router.put('/employee-profile/:id', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, attendanceCtrl.updateEmployeeProfileAdmin);

// ─── Migration & Bulk Operations ───
router.post('/migrate/:id', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, attendanceCtrl.migrateEmployee);
router.post('/organizations/:company_id/bulk-assign-policies', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, attendanceCtrl.bulkAssignPolicies);
router.post('/bulk-update', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, attendanceCtrl.bulkUpdateAttendance);
router.post('/full-month-presence', attendanceAuthBridge, requireRole('ADMIN'), requireAllowedAdmin, attendanceCtrl.applyFullMonthPresence);

export default router;
