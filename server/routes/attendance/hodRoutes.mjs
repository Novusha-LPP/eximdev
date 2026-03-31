import express from 'express';
import attendanceAuthBridge from '../../middleware/attendanceAuthBridge.mjs';
import * as hodCtrl from '../../controllers/attendance/HOD.controller.js';

const router = express.Router();

// HOD Dashboard
router.get('/dashboard', attendanceAuthBridge, hodCtrl.getDashboard);

// Approvals (Unified)
router.post('/approve-request', attendanceAuthBridge, hodCtrl.approveRequest);

export default router;
