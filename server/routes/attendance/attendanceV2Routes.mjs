import express from 'express';
import attendanceAuthBridge from '../../middleware/attendanceAuthBridge.mjs';
import requireRole from '../../middleware/requireRole.mjs';
import hrmsClient from '../../services/hrms/hrmsClient.mjs';
import hrmsSyncService from '../../services/hrms/hrmsSyncService.mjs';
import UserModel from '../../model/userModel.mjs';

const router = express.Router();

// All Attendance V2 endpoints require valid EXIM authentication
router.use(attendanceAuthBridge);

const handleHrmsError = (res, err, defaultMsg = 'HRMS Operation Failed') => {
  const isCloudflareOffline =
    err.status === 530 ||
    err.status === 502 ||
    err.status === 503 ||
    (err.message && (String(err.message).includes('1033') || String(err.message).includes('530')));

  const statusCode = isCloudflareOffline ? 503 : (err.status || 500);
  const message = isCloudflareOffline
    ? 'HRMS Platform API (hrmsapi.alvision.in) is currently offline or unreachable (Cloudflare Tunnel Error 1033 / 530)'
    : (err.message || defaultMsg);

  return res.status(statusCode).json({
    message,
    code: isCloudflareOffline ? 'HRMS_SERVICE_OFFLINE' : (err.code || 'HRMS_ERROR'),
    details: err.details || [],
  });
};

/**
 * GET /api/attendance/v2/me
 * Returns current user's profile and active HRMS session details.
 */
router.get('/me', async (req, res) => {
  try {
    const session = await hrmsClient.getEmployeeSession(req.user);
    res.json({
      user: {
        _id: req.user._id,
        username: req.user.username,
        name: `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.username,
        role: req.user.role,
        isHod: req.user.isHod,
        isAttendanceAllowedAdmin: req.user.isAttendanceAllowedAdmin,
        company: req.user.company,
        department: req.user.department,
        designation: req.user.designation,
      },
      hrms: {
        employment_id: session.employment_id,
        roles: session.roles,
      },
    });
  } catch (err) {
    if (err.status === 403 || String(err.message).toLowerCase().includes('not authorized') || err.code === 'SESSION_REFUSED') {
      return res.status(200).json({
        unlinked: true,
        user: {
          _id: req.user._id,
          username: req.user.username,
          name: `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.username,
          role: req.user.role,
          company: req.user.company,
          department: req.user.department,
        },
        message: err.message || 'Employee profile is not yet linked to an HRMS employment record.',
      });
    }
    return handleHrmsError(res, err, 'Failed to authenticate with HRMS');
  }
});

/**
 * POST /api/attendance/v2/auto-link
 * Attempts to automatically link the current logged-in EXIM user to their HRMS employee profile.
 */
router.post('/auto-link', async (req, res) => {
  try {
    const linked = await hrmsClient.linkUserToHrms(req.user);
    if (!linked) {
      return res.status(404).json({
        success: false,
        message: 'No matching HRMS employee record found for your account (checked employee code, username, email, and name).'
      });
    }

    const session = await hrmsClient.getEmployeeSession(req.user);
    res.json({
      success: true,
      message: 'Account successfully linked to HRMS employee record!',
      employment_id: session.employment_id,
      roles: session.roles,
    });
  } catch (err) {
    return handleHrmsError(res, err, 'Failed to auto-link employee profile');
  }
});

/**
 * GET /api/attendance/v2/today
 * Returns today's punch status and punch log.
 */
router.get('/today', async (req, res) => {
  try {
    let targetUser = req.user;
    if (req.query.user_id && (req.user.role === 'ADMIN' || req.user.role === 'HOD')) {
      targetUser = await UserModel.findById(req.query.user_id);
      if (!targetUser) return res.status(404).json({ message: 'Target user not found' });
    }

    const data = await hrmsClient.getTodayStatus(targetUser, req.query.work_date);
    res.json(data);
  } catch (err) {
    return handleHrmsError(res, err, 'Failed to fetch today status from HRMS');
  }
});

/**
 * POST /api/attendance/v2/punch
 * Record a live punch (IN, OUT, BREAK_START, BREAK_END).
 */
router.post('/punch', async (req, res) => {
  try {
    let { punch_type, source, latitude, longitude, confirm_long_day } = req.body;
    if (!punch_type) {
      return res.status(400).json({ message: 'punch_type is required (IN, OUT, BREAK_START, BREAK_END)' });
    }

    try {
      const result = await hrmsClient.recordPunch({
        user: req.user,
        punchType: punch_type,
        source: source || 'WEB',
        latitude,
        longitude,
        confirmLongDay: confirm_long_day,
      });

      return res.status(201).json(result);
    } catch (punchErr) {
      // Handle 409 Conflict when user checks in after break:
      // If client sent punch_type: 'IN' while an active break exists in HRMS, automatically resolve by recording 'BREAK_END'
      if (punch_type === 'IN' && (punchErr.status === 409 || String(punchErr.message).toLowerCase().includes('break'))) {
        try {
          const todayStatus = await hrmsClient.getTodayStatus(req.user).catch(() => null);
          const punches = todayStatus?.punches || [];
          const sorted = [...punches].sort((a, b) => new Date(a.punched_at) - new Date(b.punched_at));
          const lastPunch = sorted.length > 0 ? sorted[sorted.length - 1] : null;

          if (todayStatus?.is_on_break || (lastPunch && lastPunch.punch_type === 'BREAK_START')) {
            console.log(`[HRMS Punch] 409 detected on 'IN' punch because user is on break. Auto-resolving with BREAK_END for ${req.user.username}`);
            const breakEndResult = await hrmsClient.recordPunch({
              user: req.user,
              punchType: 'BREAK_END',
              source: source || 'WEB',
              latitude,
              longitude,
              confirmLongDay: confirm_long_day,
            });
            return res.status(201).json({
              ...breakEndResult,
              resolved_from_break: true,
              message: 'Check-in after break recorded successfully (break ended).',
            });
          }
        } catch (resolveErr) {
          console.warn(`[HRMS Punch] Failed to auto-resolve break on 409:`, resolveErr.message);
        }
      }

      // If HRMS returned 409 Conflict, preserve 409 status code and return a clear user-facing message
      if (punchErr.status === 409) {
        return res.status(409).json({
          code: punchErr.code || 'PUNCH_CONFLICT',
          message: punchErr.message || 'Conflict: Unable to record punch in the current state. If returning from break, please end break.',
        });
      }

      throw punchErr;
    }
  } catch (err) {
    return handleHrmsError(res, err, 'Failed to record punch on HRMS');
  }
});

/**
 * GET /api/attendance/v2/days
 * Get attendance ledger for a month or date range.
 */
router.get('/days', async (req, res) => {
  try {
    let targetUser = req.user;
    if (req.query.user_id && (req.user.role === 'ADMIN' || req.user.role === 'HOD')) {
      targetUser = await UserModel.findById(req.query.user_id);
      if (!targetUser) return res.status(404).json({ message: 'Target user not found' });
    }

    const now = new Date();
    const defaultFrom = req.query.from_date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const defaultTo = req.query.to_date || now.toISOString().split('T')[0];

    const days = await hrmsClient.getAttendanceDays({
      user: targetUser,
      fromDate: defaultFrom,
      toDate: defaultTo,
    });

    res.json(days);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code });
  }
});

/**
 * GET /api/attendance/v2/leave/balances
 * Get leave balances for an employee.
 */
router.get('/leave/balances', async (req, res) => {
  try {
    let targetUser = req.user;
    if (req.query.user_id && (req.user.role === 'ADMIN' || req.user.role === 'HOD')) {
      targetUser = await UserModel.findById(req.query.user_id);
      if (!targetUser) return res.status(404).json({ message: 'Target user not found' });
    }

    const balances = await hrmsClient.getLeaveBalances(targetUser, req.query.year);
    res.json(balances);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code });
  }
});

/**
 * GET /api/attendance/v2/leave/types
 * List all configured leave types.
 */
router.get('/leave/types', async (req, res) => {
  try {
    const types = await hrmsClient.getLeaveTypes(req.user);
    res.json(types);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code });
  }
});

/**
 * GET /api/attendance/v2/leave/applications
 * List leave applications.
 */
router.get('/leave/applications', async (req, res) => {
  try {
    let targetUser = req.user;
    if (req.query.user_id && (req.user.role === 'ADMIN' || req.user.role === 'HOD')) {
      targetUser = await UserModel.findById(req.query.user_id);
      if (!targetUser) return res.status(404).json({ message: 'Target user not found' });
    }

    const apps = await hrmsClient.getLeaveApplications(targetUser, req.query.status);
    res.json(apps);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code });
  }
});

/**
 * POST /api/attendance/v2/leave/apply
 * Apply for leave and automatically submit to workflow.
 */
router.post('/leave/apply', async (req, res) => {
  try {
    const { leave_type_id, from_date, to_date, half_day_option, reason } = req.body;
    if (!leave_type_id || !from_date || !to_date) {
      return res.status(400).json({ message: 'leave_type_id, from_date, and to_date are required' });
    }

    const application = await hrmsClient.applyLeave({
      user: req.user,
      leaveTypeId: leave_type_id,
      fromDate: from_date,
      toDate: to_date,
      halfDayOption: half_day_option || 'NONE',
      reason: reason || '',
    });

    res.status(201).json(application);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code, details: err.details });
  }
});

/**
 * POST /api/attendance/v2/leave/cancel/:id
 * Cancel an active or pending leave application.
 */
router.post('/leave/cancel/:id', async (req, res) => {
  try {
    const result = await hrmsClient.cancelLeave({
      user: req.user,
      applicationId: req.params.id,
      cancelReason: req.body.cancel_reason,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code });
  }
});

/**
 * GET /api/attendance/v2/corrections
 * List regularization / correction requests.
 */
router.get('/corrections', async (req, res) => {
  try {
    let targetUser = req.user;
    if (req.query.user_id && (req.user.role === 'ADMIN' || req.user.role === 'HOD')) {
      targetUser = await UserModel.findById(req.query.user_id);
      if (!targetUser) return res.status(404).json({ message: 'Target user not found' });
    }

    const list = await hrmsClient.getCorrections(targetUser, req.query.status);
    res.json(list);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code });
  }
});

/**
 * POST /api/attendance/v2/corrections
 * Request attendance correction / regularization.
 */
router.post('/corrections', async (req, res) => {
  try {
    const { work_date, correction_type, requested_punch_in, requested_punch_out, reason } = req.body;
    if (!work_date || !correction_type || !reason) {
      return res.status(400).json({ message: 'work_date, correction_type, and reason are required' });
    }

    const result = await hrmsClient.requestCorrection({
      user: req.user,
      workDate: work_date,
      correctionType: correction_type,
      requestedPunchIn: requested_punch_in,
      requestedPunchOut: requested_punch_out,
      reason,
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code, details: err.details });
  }
});

/**
 * POST /api/attendance/v2/corrections/cancel/:id
 * Cancel a pending correction request.
 */
router.post('/corrections/cancel/:id', async (req, res) => {
  try {
    const result = await hrmsClient.cancelCorrection({
      user: req.user,
      correctionId: req.params.id,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code });
  }
});

/**
 * GET /api/attendance/v2/approvals/inbox
 * Approvals inbox for Managers, HODs, and Admins.
 */
router.get('/approvals/inbox', async (req, res) => {
  try {
    const inbox = await hrmsClient.getApprovalsInbox(req.user);
    res.json(inbox);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code });
  }
});

/**
 * POST /api/attendance/v2/approvals/decision/:id
 * Decide on an approval item (APPROVE or REJECT).
 */
router.post('/approvals/decision/:id', async (req, res) => {
  try {
    const { action, comments } = req.body;
    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ message: "action must be 'APPROVE' or 'REJECT'" });
    }

    const result = await hrmsClient.makeApprovalDecision({
      user: req.user,
      instanceId: req.params.id,
      action,
      comments,
    });

    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code });
  }
});

/**
 * GET /api/attendance/v2/daily-summary
 * Daily attendance across the company using integration API.
 */
router.get('/daily-summary', requireRole(['ADMIN', 'HOD']), async (req, res) => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const targetDate = req.query.date || yesterday;
    const data = await hrmsClient.getDailyAttendance(targetDate);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code });
  }
});

/**
 * GET /api/attendance/v2/holidays
 * Holidays list.
 */
router.get('/holidays', async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const holidays = await hrmsClient.getHolidays(year);
    res.json(holidays);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code });
  }
});

/**
 * GET /api/attendance/v2/reference-data
 * Reference data (companies, departments, locations, designations).
 */
router.get('/reference-data', async (req, res) => {
  try {
    const refData = await hrmsClient.getReferenceData();
    res.json(refData);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code });
  }
});

/**
 * GET /api/attendance/v2/employees
 * List of employees from integration feed.
 */
router.get('/employees', requireRole(['ADMIN', 'HOD']), async (req, res) => {
  try {
    const emps = await hrmsClient.getIntegrationEmployees(req.query.refresh === 'true');
    res.json(emps);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code });
  }
});

// ─── HRMS Live Integration & Sync Management Endpoints ──────────────────────

/**
 * GET /api/attendance/v2/integration/status
 * Get connection health, cursor position, poll counts, and sync state.
 */
router.get('/integration/status', requireRole(['ADMIN', 'HOD']), async (req, res) => {
  try {
    const state = await hrmsSyncService.getSyncState();
    res.json({
      systemCode: state.systemCode,
      lastCursor: state.lastCursor,
      lastPolledAt: state.lastPolledAt,
      lastSuccessAt: state.lastSuccessAt,
      lastError: state.lastError,
      totalPolls: state.totalPolls,
      totalEventsProcessed: state.totalEventsProcessed,
      lastReconcile: state.lastReconcile,
      apiKeyPrefix: hrmsClient.apiKey.slice(0, 15) + '...',
      baseUrl: hrmsClient.baseUrl,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/attendance/v2/integration/poll
 * Manually trigger a pull of HRMS events feed and apply changes.
 */
router.post('/integration/poll', requireRole(['ADMIN', 'HOD']), async (req, res) => {
  try {
    const result = await hrmsSyncService.pollAndApplyEvents();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/attendance/v2/integration/reconcile
 * Run full reconciliation comparing active EXIM users with HRMS.
 */
router.post('/integration/reconcile', requireRole(['ADMIN', 'HOD']), async (req, res) => {
  try {
    const result = await hrmsSyncService.runReconciliation();
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code });
  }
});

/**
 * POST /api/attendance/v2/integration/sync-user/:id
 * Force push a single EXIM user to HRMS.
 */
router.post('/integration/sync-user/:id', requireRole(['ADMIN', 'HOD']), async (req, res) => {
  try {
    const dryRun = req.query.dry_run === 'true';
    const result = await hrmsSyncService.pushUserToHrms(req.params.id, { dryRun });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code });
  }
});

/**
 * POST /api/attendance/v2/integration/sync-all
 * Bulk push all active EXIM users to HRMS.
 */
router.post('/integration/sync-all', requireRole(['ADMIN', 'HOD']), async (req, res) => {
  try {
    const dryRun = req.query.dry_run === 'true';
    const summary = await hrmsSyncService.syncAllUsersToHrms({ dryRun });
    res.json(summary);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code });
  }
});

/**
 * POST /api/attendance/v2/integration/link
 * Link existing users by employee code.
 */
router.post('/integration/link', requireRole(['ADMIN', 'HOD']), async (req, res) => {
  try {
    const dryRun = req.query.dry_run !== 'false';
    const result = await hrmsSyncService.linkExistingUsers({ dryRun });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message, code: err.code });
  }
});

/**
 * GET /api/attendance/v2/integration/events-log
 * View the recent event audit log.
 */
router.get('/integration/events-log', requireRole(['ADMIN', 'HOD']), async (req, res) => {
  try {
    const state = await hrmsSyncService.getSyncState();
    res.json(state.recentEvents || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
