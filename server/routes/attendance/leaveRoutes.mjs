import express from 'express';
import attendanceAuthBridge from '../../middleware/attendanceAuthBridge.mjs';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as leaveCtrl from '../../controllers/attendance/leave.controller.js';
import requireAllowedAdmin from '../../middleware/requireAllowedAdmin.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// Storage config for leave attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/leaves/');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Employee Routes
router.get('/balance', attendanceAuthBridge, leaveCtrl.getBalance);
router.get('/balances-bulk', attendanceAuthBridge, leaveCtrl.getBalancesBulk);
router.get('/applications', attendanceAuthBridge, leaveCtrl.getApplications);
router.get('/preview-application', attendanceAuthBridge, leaveCtrl.previewLeave);
router.post('/apply', attendanceAuthBridge, upload.single('attachment'), leaveCtrl.applyLeave);
router.post('/cancel/:id', attendanceAuthBridge, leaveCtrl.cancelLeave);

// Admin Routes - Update Leave Balance
router.post('/admin-update-balance/:employee_id', attendanceAuthBridge, requireAllowedAdmin, leaveCtrl.updateBalance);

export default router;
