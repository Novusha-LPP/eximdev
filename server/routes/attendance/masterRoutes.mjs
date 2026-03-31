import express from 'express';
import attendanceAuthBridge from '../../middleware/attendanceAuthBridge.mjs';
import * as masterCtrl from '../../controllers/attendance/master.controller.js';

const router = express.Router();

router.post('/shifts', attendanceAuthBridge, masterCtrl.createShift);
router.get('/shifts', attendanceAuthBridge, masterCtrl.getShifts);
router.delete('/shifts/:id', attendanceAuthBridge, masterCtrl.deleteShift);
router.post('/shifts/bulk-assign', attendanceAuthBridge, masterCtrl.bulkAssignShifts);

router.post('/holidays', attendanceAuthBridge, masterCtrl.createHoliday);
router.get('/holidays', attendanceAuthBridge, masterCtrl.getHolidays);
router.delete('/holidays/:id', attendanceAuthBridge, masterCtrl.deleteHoliday);
router.post('/holidays/bulk-delete', attendanceAuthBridge, masterCtrl.bulkDeleteHolidays);

router.get('/company-settings', attendanceAuthBridge, masterCtrl.getCompanySettings);
router.put('/company-settings', attendanceAuthBridge, masterCtrl.updateCompanySettings);

router.post('/leave-policies', attendanceAuthBridge, masterCtrl.createLeavePolicy);
router.get('/leave-policies', attendanceAuthBridge, masterCtrl.getLeavePolicies);
router.put('/leave-policies/:id', attendanceAuthBridge, masterCtrl.updateLeavePolicy);
router.delete('/leave-policies/:id', attendanceAuthBridge, masterCtrl.deleteLeavePolicy);

router.get('/departments', attendanceAuthBridge, masterCtrl.getDepartments);
router.get('/designations', attendanceAuthBridge, masterCtrl.getDesignations);

export default router;
