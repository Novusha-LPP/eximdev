import express from 'express';
import attendanceAuthBridge from '../../middleware/attendanceAuthBridge.mjs';
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
router.get('/HODDashboard', attendanceAuthBridge, hodCtrl.getDashboard);
router.get('/department-report', attendanceAuthBridge, hodCtrl.getDepartmentAttendanceReport);
router.get('/adminDashboard', attendanceAuthBridge, attendanceCtrl.getAdminDashboardData);
router.post('/lock', attendanceAuthBridge, attendanceCtrl.lockMonthAttendance);
router.get('/payroll', attendanceAuthBridge, attendanceCtrl.getPayrollData);
router.get('/payroll-locks', attendanceAuthBridge, attendanceCtrl.getPayrollLocks);
router.post('/toggle-lock', attendanceAuthBridge, attendanceCtrl.togglePayrollLock);
router.get('/admin-report', attendanceAuthBridge, attendanceCtrl.getAdminAttendanceReport);
router.get('/admin-leave-requests', attendanceAuthBridge, hodCtrl.getAdminLeaveRequests);
router.post('/approve-request', attendanceAuthBridge, hodCtrl.approveRequest);
router.put('/new', attendanceAuthBridge, attendanceCtrl.createManualAdjustment);
router.put('/:id', attendanceAuthBridge, attendanceCtrl.updateAttendanceRecord);
router.delete('/:id', attendanceAuthBridge, attendanceCtrl.deleteAttendanceRecord);
router.get('/employee-full-profile/:id', attendanceAuthBridge, attendanceCtrl.getEmployeeFullProfile);
router.put('/employee-profile/:id', attendanceAuthBridge, attendanceCtrl.updateEmployeeProfileAdmin);

export default router;
