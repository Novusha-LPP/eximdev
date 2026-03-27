import express from 'express';
import { createRequire } from 'module';
import attendanceAuthBridge from '../../middleware/attendanceAuthBridge.mjs';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const leaveCtrl = require('./controllers/leave.controller.js');

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
router.get('/applications', attendanceAuthBridge, leaveCtrl.getApplications);
router.post('/apply', attendanceAuthBridge, upload.single('attachment'), leaveCtrl.applyLeave);
router.post('/cancel/:id', attendanceAuthBridge, leaveCtrl.cancelLeave);

export default router;
