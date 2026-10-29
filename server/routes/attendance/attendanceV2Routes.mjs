import express from 'express';
import attendanceAuthBridge from '../../middleware/attendanceAuthBridge.mjs';
import requireRole from '../../middleware/requireRole.mjs';
import hrmsClient from '../../services/hrms/hrmsClient.mjs';
import hrmsSyncService from '../../services/hrms/hrmsSyncService.mjs';
import UserModel from '../../model/userModel.mjs';
import AttendanceRecord from '../../model/attendance/AttendanceRecord.js';

const router = express.Router();

// All Attendance V2 endpoints require valid EXIM authentication
router.use(attendanceAuthBridge);

const handleHrmsError = (res, err, defaultMsg = 'HRMS Operation Failed') => {
  const isOffline =
    err.status === 530 ||
    err.status === 502 ||
    err.status === 503 ||
    err.status === 504 ||
    err.name === 'AbortError' ||
    err.name === 'TimeoutError' ||
    err.code === 'ECONNREFUSED' ||
    err.code === 'ENOTFOUND' ||
    err.code === 'ETIMEDOUT' ||
    err.code === 'HRMS_NETWORK_ERROR' ||
    (err.message && (
      String(err.message).includes('1033') ||
      String(err.message).includes('530') ||
      String(err.message).includes('fetch failed') ||
      String(err.message).includes('timed out')
    ));

  const statusCode = isOffline ? 503 : (err.status || 500);
  const message = isOffline
    ? 'HRMS Platform API (hrmsapi.alvision.in) is currently offline or unreachable. Please try again in a moment.'
    : (err.message || defaultMsg);

  return res.status(statusCode).json({
    message,
    code: isOffline ? 'HRMS_SERVICE_OFFLINE' : (err.code || 'HRMS_ERROR'),
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

    let data = null;
    try {
      data = await hrmsClient.getTodayStatus(targetUser, req.query.work_date);
    } catch (hrmsErr) {
      console.warn('[Attendance V2] HRMS today fetch failed, attempting local AttendanceRecord fallback:', hrmsErr?.message);
    }

    if (data && (data.status || (data.punches && data.punches.length > 0))) {
      return res.json(data);
    }

    // Local AttendanceRecord fallback for today
    const now = new Date();
    const todayStr = req.query.work_date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const localToday = await AttendanceRecord.findOne({
      employee_id: targetUser._id,
      attendance_date_str: todayStr
    }).lean();

    if (localToday) {
      const effMins = localToday.net_work_hours ? Math.round(localToday.net_work_hours * 60) : (localToday.total_work_hours ? Math.round(localToday.total_work_hours * 60) : 0);
      const isWorking = Boolean(localToday.first_in && !localToday.last_out);
      return res.json({
        work_date: todayStr,
        status: String(localToday.status || (isWorking ? 'PRESENT' : 'ABSENT')).toUpperCase(),
        is_punched_in: isWorking,
        is_on_break: false,
        first_punch_in: localToday.first_in ? localToday.first_in.toISOString() : null,
        last_punch_out: localToday.last_out ? localToday.last_out.toISOString() : null,
        effective_minutes: effMins,
        late_by_minutes: localToday.late_by_minutes || 0,
        ot_minutes: localToday.overtime_minutes || (localToday.overtime_hours ? Math.round(localToday.overtime_hours * 60) : 0),
        punches: (localToday.work_sessions || []).flatMap((s, idx) => {
          const list = [];
          if (s.punch_in_time) list.push({ id: `in-${idx}`, punch_type: 'IN', punched_at: s.punch_in_time.toISOString(), source: 'WEB' });
          if (s.punch_out_time) list.push({ id: `out-${idx}`, punch_type: 'OUT', punched_at: s.punch_out_time.toISOString(), source: 'WEB' });
          return list;
        })
      });
    }

    if (data) return res.json(data);

    return res.json({
      work_date: todayStr,
      status: 'NOT_CHECKED_IN',
      is_punched_in: false,
      is_on_break: false,
      first_punch_in: null,
      last_punch_out: null,
      effective_minutes: 0,
      late_by_minutes: 0,
      ot_minutes: 0,
      punches: []
    });
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

      // Handle 409 Conflict when user clocks OUT while on break:
      if (punch_type === 'OUT' && (punchErr.status === 409 || String(punchErr.message).toLowerCase().includes('break'))) {
        try {
          const todayStatus = await hrmsClient.getTodayStatus(req.user).catch(() => null);
          if (todayStatus?.is_on_break) {
            console.log(`[HRMS Punch] 409 detected on 'OUT' punch because user is on break. Auto-resolving break before clock-out for ${req.user.username}`);
            await hrmsClient.recordPunch({
              user: req.user,
              punchType: 'BREAK_END',
              source: source || 'WEB',
              latitude,
              longitude,
            });
            const outResult = await hrmsClient.recordPunch({
              user: req.user,
              punchType: 'OUT',
              source: source || 'WEB',
              latitude,
              longitude,
              confirmLongDay: confirm_long_day,
            });
            return res.status(201).json({
              ...outResult,
              resolved_from_break: true,
              message: 'Break ended and clocked out successfully.',
            });
          }
        } catch (resolveErr) {
          console.warn(`[HRMS Punch] Failed to auto-resolve break on OUT 409:`, resolveErr.message);
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

    let days = null;
    try {
      days = await hrmsClient.getAttendanceDays({
        user: targetUser,
        fromDate: defaultFrom,
        toDate: defaultTo,
      });
    } catch (hrmsErr) {
      console.warn('[Attendance V2] HRMS days fetch failed, falling back to local AttendanceRecord:', hrmsErr?.message);
    }

    const hrmsList = Array.isArray(days)
      ? days
      : Array.isArray(days?.days)
      ? days.days
      : Array.isArray(days?.attendance_days)
      ? days.attendance_days
      : Array.isArray(days?.data)
      ? days.data
      : Array.isArray(days?.items)
      ? days.items
      : Array.isArray(days?.records)
      ? days.records
      : null;

    if (hrmsList && hrmsList.length > 0) {
      const normalized = hrmsList.map((d) => ({
        id: d.id || d._id,
        work_date: d.work_date || (d.date ? String(d.date).slice(0, 10) : defaultFrom),
        status: String(d.status || 'ABSENT').toUpperCase(),
        first_punch_in: d.first_punch_in || d.first_in || d.in_time || null,
        last_punch_out: d.last_punch_out || d.last_out || d.out_time || null,
        effective_minutes: d.effective_minutes ?? (d.net_work_hours ? Math.round(d.net_work_hours * 60) : d.total_work_hours ? Math.round(d.total_work_hours * 60) : (d.work_minutes || 0)),
        late_by_minutes: d.late_by_minutes ?? (d.is_late ? (d.late_minutes || 0) : 0),
        ot_minutes: d.ot_minutes ?? (d.overtime_minutes || (d.overtime_hours ? Math.round(d.overtime_hours * 60) : 0)),
      }));
      return res.json(normalized);
    }

    // Local MongoDB AttendanceRecord fallback
    const localRecords = await AttendanceRecord.find({
      employee_id: targetUser._id,
      attendance_date_str: { $gte: defaultFrom, $lte: defaultTo }
    }).sort({ attendance_date_str: 1 }).lean();

    if (localRecords && localRecords.length > 0) {
      const normalized = localRecords.map((r) => ({
        id: r._id.toString(),
        work_date: r.attendance_date_str || (r.attendance_date ? r.attendance_date.toISOString().slice(0, 10) : ''),
        status: String(r.status || 'absent').toUpperCase().replace('WEEKEND', 'WEEKLY_OFF'),
        first_punch_in: r.first_in ? r.first_in.toISOString() : null,
        last_punch_out: r.last_out ? r.last_out.toISOString() : null,
        effective_minutes: r.net_work_hours ? Math.round(r.net_work_hours * 60) : (r.total_work_hours ? Math.round(r.total_work_hours * 60) : 0),
        late_by_minutes: r.late_by_minutes || 0,
        ot_minutes: r.overtime_minutes || (r.overtime_hours ? Math.round(r.overtime_hours * 60) : 0),
      }));
      return res.json(normalized);
    }

    return res.json(hrmsList || []);
  } catch (err) {
    return handleHrmsError(res, err, 'Failed to fetch attendance ledger');
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
    return handleHrmsError(res, err, 'Failed to fetch leave balances');
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
    return handleHrmsError(res, err, 'Failed to fetch leave types');
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
    return handleHrmsError(res, err, 'Failed to fetch leave applications');
  }
});

/**
 * POST /api/attendance/v2/leave/apply
 * Apply for leave and automatically submit to workflow.
 */
router.post('/leave/apply', async (req, res) => {
  try {
    const { leave_type_id, from_date, to_date, half_day_option, reason, user_id } = req.body;
    if (!leave_type_id || !from_date || !to_date) {
      return res.status(400).json({ message: 'leave_type_id, from_date, and to_date are required' });
    }

    let targetUser = req.user;
    if (user_id && (req.user.role === 'ADMIN' || req.user.role === 'HOD')) {
      targetUser = await UserModel.findById(user_id);
      if (!targetUser) return res.status(404).json({ message: 'Target user not found' });
    }

    const application = await hrmsClient.applyLeave({
      user: targetUser,
      leaveTypeId: leave_type_id,
      fromDate: from_date,
      toDate: to_date,
      halfDayOption: half_day_option || 'NONE',
      reason: reason || (targetUser._id.toString() !== req.user._id.toString() ? `Applied by Admin (${req.user.username})` : ''),
    });

    res.status(201).json(application);
  } catch (err) {
    return handleHrmsError(res, err, 'Failed to apply leave');
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
    return handleHrmsError(res, err, 'Failed to cancel leave');
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
    return handleHrmsError(res, err, 'Failed to fetch corrections');
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
    return handleHrmsError(res, err, 'Failed to submit correction request');
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
    return handleHrmsError(res, err, 'Failed to cancel correction request');
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
    return handleHrmsError(res, err, 'Failed to fetch approvals inbox');
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
    return handleHrmsError(res, err, 'Failed to record approval decision');
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
    return handleHrmsError(res, err, 'Failed to fetch daily summary');
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
    return handleHrmsError(res, err, 'Failed to fetch holidays');
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
    return handleHrmsError(res, err, 'Failed to fetch reference data');
  }
});

/**
 * GET /api/attendance/v2/employees
 * Merged list of employees from EXIM users and HRMS integration.
 */
router.get('/employees', requireRole(['ADMIN', 'HOD']), async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';

    // 1. Fetch active users from MongoDB
    const localUsers = await UserModel.find(
      { is_active: { $ne: false } },
      'first_name middle_name last_name username email employee_code company department designation role is_active employee_photo createdAt'
    ).lean();

    // 2. Fetch HRMS integration employees
    let hrmsEmps = [];
    try {
      hrmsEmps = await hrmsClient.getIntegrationEmployees(forceRefresh);
    } catch (hrmsErr) {
      console.warn('[Attendance V2] HRMS employees fetch warning:', hrmsErr.message);
    }

    // Index HRMS employees
    const byExternalId = new Map();
    const byCode = new Map();
    const byEmail = new Map();
    const byUsername = new Map();

    for (const emp of hrmsEmps) {
      if (emp.external_id) byExternalId.set(String(emp.external_id), emp);
      if (emp.employee_code) byCode.set(String(emp.employee_code).toLowerCase().trim(), emp);
      if (emp.email) byEmail.set(String(emp.email).toLowerCase().trim(), emp);
      const u = String(emp.employee_code || '').toLowerCase().trim();
      if (u) byUsername.set(u, emp);
    }

    const matchedHrmsIds = new Set();

    const merged = localUsers.map((u) => {
      const uId = String(u._id);
      const code = String(u.employee_code || '').toLowerCase().trim();
      const email = String(u.email || '').toLowerCase().trim();
      const username = String(u.username || '').toLowerCase().trim();

      const hMatch = byExternalId.get(uId) || byCode.get(code) || byEmail.get(email) || byUsername.get(username);
      if (hMatch) {
        matchedHrmsIds.add(hMatch.employment_id);
      }

      const fullName = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ').trim() || u.username;

      return {
        userId: uId,
        employmentId: hMatch?.employment_id || null,
        externalId: hMatch?.external_id || uId,
        isHrmsLinked: Boolean(hMatch),
        name: fullName,
        firstName: u.first_name || hMatch?.first_name || '',
        lastName: u.last_name || hMatch?.last_name || '',
        username: u.username,
        email: u.email || hMatch?.email || '',
        employeeCode: u.employee_code || hMatch?.employee_code || u.username,
        company: u.company || hMatch?.company?.name || 'SFPL',
        department: u.department || hMatch?.department?.name || 'General',
        designation: u.designation || hMatch?.designation?.name || 'Staff',
        role: u.role || 'User',
        employmentState: hMatch?.employment_state || 'ACTIVE',
        hireDate: hMatch?.hire_date || u.createdAt,
        photo: u.employee_photo || null,
        mobile: hMatch?.mobile || '',
        rawHrms: hMatch || null,
      };
    });

    // Also include any HRMS-only employees who haven't been matched
    for (const h of hrmsEmps) {
      if (!matchedHrmsIds.has(h.employment_id)) {
        merged.push({
          userId: h.external_id || null,
          employmentId: h.employment_id,
          externalId: h.external_id,
          isHrmsLinked: true,
          name: `${h.first_name || ''} ${h.last_name || ''}`.trim() || h.employee_code,
          firstName: h.first_name || '',
          lastName: h.last_name || '',
          username: h.employee_code,
          email: h.email || '',
          employeeCode: h.employee_code,
          company: h.company?.name || 'SFPL',
          department: h.department?.name || 'General',
          designation: h.designation?.name || 'Staff',
          role: h.role || 'User',
          employmentState: h.employment_state || 'ACTIVE',
          hireDate: h.hire_date,
          photo: null,
          mobile: h.mobile || '',
          rawHrms: h,
        });
      }
    }

    res.json(merged);
  } catch (err) {
    return handleHrmsError(res, err, 'Failed to fetch employees');
  }
});

/**
 * POST /api/attendance/v2/admin/mark-attendance
 * Admin/HOD directly marks attendance (PRESENT, ABSENT, HALF_DAY) for an employee.
 */
router.post('/admin/mark-attendance', requireRole(['ADMIN', 'HOD']), async (req, res) => {
  try {
    const { user_id, work_date, status, punch_in, punch_out, reason } = req.body;
    if (!user_id || !work_date || !status) {
      return res.status(400).json({ message: 'user_id, work_date, and status are required' });
    }

    const targetUser = await UserModel.findById(user_id);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target employee not found' });
    }

    const normStatus = String(status).toUpperCase();
    let requestedPunchIn = null;
    let requestedPunchOut = null;

    if (normStatus === 'PRESENT' || normStatus === 'HALF_DAY') {
      const inTime = punch_in || '09:30';
      const outTime = punch_out || (normStatus === 'HALF_DAY' ? '13:30' : '18:30');
      requestedPunchIn = `${work_date}T${inTime.length === 5 ? inTime + ':00' : inTime}+05:30`;
      requestedPunchOut = `${work_date}T${outTime.length === 5 ? outTime + ':00' : outTime}+05:30`;
    }

    let hrmsResult = null;
    try {
      hrmsResult = await hrmsClient.requestCorrection({
        user: targetUser,
        workDate: work_date,
        correctionType: normStatus === 'ABSENT' ? 'MARK_ABSENT' : 'MARK_PRESENT',
        requestedPunchIn,
        requestedPunchOut,
        reason: reason || `Admin marked ${normStatus} (${req.user.username})`,
      });

      // Auto-approve as Admin if pending
      if (hrmsResult && hrmsResult.id && hrmsResult.status !== 'APPROVED') {
        try {
          await hrmsClient.approveCorrection({
            user: req.user,
            correctionId: hrmsResult.id,
            comments: 'Auto-approved by Administrator',
          });
        } catch (apprErr) {
          console.warn('[Admin Mark Attendance] Correction auto-approve attempt:', apprErr.message);
        }
      }
    } catch (hrmsErr) {
      console.warn('[Admin Mark Attendance] HRMS submission warning:', hrmsErr.message);
    }

    // Update / upsert local MongoDB AttendanceRecord
    try {
      const AttendanceRecord = (await import('../../model/attendance/AttendanceRecord.js')).default;
      const startOfDay = new Date(`${work_date}T00:00:00.000Z`);
      await AttendanceRecord.findOneAndUpdate(
        { userId: targetUser._id, date: startOfDay },
        {
          $set: {
            status: normStatus === 'PRESENT' ? 'PRESENT' : normStatus === 'ABSENT' ? 'ABSENT' : 'HALF_DAY',
            firstPunchIn: requestedPunchIn ? new Date(requestedPunchIn) : null,
            lastPunchOut: requestedPunchOut ? new Date(requestedPunchOut) : null,
            notes: reason || `Marked by ${req.user.username}`,
          }
        },
        { upsert: true, new: true }
      );
    } catch (localErr) {
      console.warn('[Admin Mark Attendance] Local MongoDB sync warning:', localErr.message);
    }

    res.json({
      success: true,
      message: `Successfully marked ${normStatus} for ${targetUser.first_name || targetUser.username} on ${work_date}`,
      hrmsResult,
    });
  } catch (err) {
    return handleHrmsError(res, err, 'Failed to mark attendance for employee');
  }
});

/**
 * PUT /api/attendance/v2/employees/:userId
 * Update employee placement / details and sync to HRMS.
 */
router.put('/employees/:userId', requireRole(['ADMIN', 'HOD']), async (req, res) => {
  try {
    const { department, designation, company, email, role } = req.body;
    const updateData = {};
    if (department) updateData.department = department;
    if (designation) updateData.designation = designation;
    if (company) updateData.company = company;
    if (email) updateData.email = email;
    if (role && req.user.role === 'ADMIN') updateData.role = role;

    const user = await UserModel.findByIdAndUpdate(req.params.userId, { $set: updateData }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Push updated details to HRMS
    try {
      await hrmsSyncService.pushUserToHrms(user._id);
    } catch (syncErr) {
      console.warn('[Update Employee] HRMS sync warning:', syncErr.message);
    }

    res.json({ success: true, user });
  } catch (err) {
    return handleHrmsError(res, err, 'Failed to update employee');
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
    return handleHrmsError(res, err, 'Failed to fetch integration status');
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
    return handleHrmsError(res, err, 'Failed to poll events feed');
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
    return handleHrmsError(res, err, 'Failed to run reconciliation');
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
    return handleHrmsError(res, err, 'Failed to sync user to HRMS');
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
    return handleHrmsError(res, err, 'Failed to sync all users to HRMS');
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
    return handleHrmsError(res, err, 'Failed to link users with HRMS');
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
    return handleHrmsError(res, err, 'Failed to fetch events log');
  }
});

export default router;
