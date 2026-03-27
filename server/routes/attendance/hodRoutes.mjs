import express from 'express';
import { createRequire } from 'module';
import attendanceAuthBridge from '../../middleware/attendanceAuthBridge.mjs';

const require = createRequire(import.meta.url);
const hodCtrl = require('./controllers/HOD.controller.js');

const router = express.Router();

// HOD Dashboard
router.get('/dashboard', attendanceAuthBridge, hodCtrl.getDashboard);

// Approvals (Unified)
router.post('/approve-request', attendanceAuthBridge, hodCtrl.approveRequest);

export default router;
