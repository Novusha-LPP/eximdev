import express from 'express';
import attendanceAuthBridge from '../../middleware/attendanceAuthBridge.mjs';
import requireRole from '../../middleware/requireRole.mjs';
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

// HOD / Manager Routes
router.get('/HODDashboard', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), hodCtrl.getDashboard);
router.get('/department-report', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), hodCtrl.getDepartmentAttendanceReport);
router.get('/adminDashboard', attendanceAuthBridge, requireRole('ADMIN'), attendanceCtrl.getAdminDashboardData);
router.post('/lock', attendanceAuthBridge, requireRole('ADMIN'), attendanceCtrl.lockMonthAttendance);
router.get('/payroll', attendanceAuthBridge, requireRole('ADMIN'), attendanceCtrl.getPayrollData);
router.get('/payroll-locks', attendanceAuthBridge, requireRole('ADMIN'), attendanceCtrl.getPayrollLocks);
router.post('/toggle-lock', attendanceAuthBridge, requireRole('ADMIN'), attendanceCtrl.togglePayrollLock);
router.get('/admin-report', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), attendanceCtrl.getAdminAttendanceReport);
router.get('/admin-leave-requests', attendanceAuthBridge, requireRole('ADMIN'), hodCtrl.getAdminLeaveRequests);
router.post('/approve-request', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), hodCtrl.approveRequest);
router.put('/new', attendanceAuthBridge, requireRole('ADMIN'), attendanceCtrl.createManualAdjustment);
router.put('/:id', attendanceAuthBridge, requireRole('ADMIN'), attendanceCtrl.updateAttendanceRecord);
router.delete('/:id', attendanceAuthBridge, requireRole('ADMIN'), attendanceCtrl.deleteAttendanceRecord);
router.get('/employee-full-profile/:id', attendanceAuthBridge, requireRole(['ADMIN', 'HOD']), attendanceCtrl.getEmployeeFullProfile);
router.put('/employee-profile/:id', attendanceAuthBridge, requireRole('ADMIN'), attendanceCtrl.updateEmployeeProfileAdmin);

export default router;
