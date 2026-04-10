import express from 'express';
import attendanceAuthBridge from '../../middleware/attendanceAuthBridge.mjs';
import requireAllowedAdmin from '../../middleware/requireAllowedAdmin.mjs';
import * as masterCtrl from '../../controllers/attendance/master.controller.js';
import * as policyCtrl from '../../controllers/attendance/policy.controller.js';

const router = express.Router();

router.post('/shifts', attendanceAuthBridge, requireAllowedAdmin, masterCtrl.createShift);
router.get('/shifts', attendanceAuthBridge, masterCtrl.getShifts);
router.get('/shifts/:id', attendanceAuthBridge, masterCtrl.getShiftById);
router.put('/shifts/:id', attendanceAuthBridge, requireAllowedAdmin, masterCtrl.updateShift);
router.delete('/shifts/:id', attendanceAuthBridge, requireAllowedAdmin, masterCtrl.deleteShift);
router.post('/shifts/bulk-assign', attendanceAuthBridge, requireAllowedAdmin, masterCtrl.bulkAssignShifts);

router.post('/holidays', attendanceAuthBridge, requireAllowedAdmin, masterCtrl.createHoliday);
router.get('/holidays', attendanceAuthBridge, masterCtrl.getHolidays);
router.delete('/holidays/:id', attendanceAuthBridge, requireAllowedAdmin, masterCtrl.deleteHoliday);
router.post('/holidays/bulk-delete', attendanceAuthBridge, requireAllowedAdmin, masterCtrl.bulkDeleteHolidays);

router.get('/company-settings', attendanceAuthBridge, masterCtrl.getCompanySettings);
router.put('/company-settings', attendanceAuthBridge, requireAllowedAdmin, masterCtrl.updateCompanySettings);

// Company Management
router.get('/companies', attendanceAuthBridge, masterCtrl.listCompanies);
router.post('/companies', attendanceAuthBridge, requireAllowedAdmin, masterCtrl.createCompany);
router.put('/companies/:id', attendanceAuthBridge, requireAllowedAdmin, masterCtrl.updateCompany);
router.delete('/companies/:id', attendanceAuthBridge, requireAllowedAdmin, masterCtrl.deleteCompany);

// User Migration
router.post('/users/migrate', attendanceAuthBridge, requireAllowedAdmin, masterCtrl.migrateUser);

router.post('/leave-policies', attendanceAuthBridge, requireAllowedAdmin, masterCtrl.createLeavePolicy);
router.get('/leave-policies', attendanceAuthBridge, masterCtrl.getLeavePolicies);
router.put('/leave-policies/:id', attendanceAuthBridge, requireAllowedAdmin, masterCtrl.updateLeavePolicy);
router.delete('/leave-policies/:id', attendanceAuthBridge, requireAllowedAdmin, masterCtrl.deleteLeavePolicy);

router.get('/designations', attendanceAuthBridge, masterCtrl.getDesignations);
router.get('/users', attendanceAuthBridge, masterCtrl.getUsers);
router.get('/organizations', attendanceAuthBridge, masterCtrl.getOrganizations);
router.get('/branches', attendanceAuthBridge, masterCtrl.getBranches);
router.get('/departments', attendanceAuthBridge, masterCtrl.getDepartments);

// ── Week-Off Policies ────────────────────────────────────────────────────────
router.get('/weekoff-policies', attendanceAuthBridge, policyCtrl.listWeekOffPolicies);
router.post('/weekoff-policies', attendanceAuthBridge, requireAllowedAdmin, policyCtrl.createWeekOffPolicy);
router.put('/weekoff-policies/:id', attendanceAuthBridge, requireAllowedAdmin, policyCtrl.updateWeekOffPolicy);
router.delete('/weekoff-policies/:id', attendanceAuthBridge, requireAllowedAdmin, policyCtrl.deleteWeekOffPolicy);

// ── Holiday Policies (read: all; write: allowed admins only) ─────────────────
router.get('/holiday-policies', attendanceAuthBridge, policyCtrl.listHolidayPolicies);
router.get('/holiday-policies/:id', attendanceAuthBridge, policyCtrl.getHolidayPolicyById);
router.post('/holiday-policies', attendanceAuthBridge, requireAllowedAdmin, policyCtrl.createHolidayPolicy);
router.put('/holiday-policies/:id', attendanceAuthBridge, requireAllowedAdmin, policyCtrl.updateHolidayPolicy);
router.delete('/holiday-policies/:id', attendanceAuthBridge, requireAllowedAdmin, policyCtrl.deleteHolidayPolicy);
router.get('/policy-history', attendanceAuthBridge, requireAllowedAdmin, policyCtrl.getPolicyHistory);

// Add / remove individual holiday from a policy
router.post('/holiday-policies/:id/holidays', attendanceAuthBridge, requireAllowedAdmin, policyCtrl.addHolidayToPolicy);
router.delete('/holiday-policies/:id/holidays/:holidayDate', attendanceAuthBridge, requireAllowedAdmin, policyCtrl.removeHolidayFromPolicy);

// User-specific resolved holiday list (read-only, for all roles)
router.get('/my-holidays', attendanceAuthBridge, policyCtrl.getHolidaysForCurrentUser);

// Assign policy overrides to a specific user
router.put('/users/:userId/policies', attendanceAuthBridge, requireAllowedAdmin, policyCtrl.assignPolicyToUser);
router.post('/users/policies/bulk-assign', attendanceAuthBridge, requireAllowedAdmin, policyCtrl.bulkAssignPoliciesToUsers);

export default router;

