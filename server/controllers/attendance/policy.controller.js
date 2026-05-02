/**
 * Week Off Policy & Holiday Policy management controller.
 * Week-off policies: any ADMIN can create/edit.
 * Holiday policies:  only ALLOWED ADMINs can create/edit/delete (requireAllowedAdmin middleware).
 */

import WeekOffPolicy from '../../model/attendance/WeekOffPolicy.js';
import HolidayPolicy from '../../model/attendance/HolidayPolicy.js';
import LeavePolicy from '../../model/attendance/LeavePolicy.js';
import LeaveBalance from '../../model/attendance/LeaveBalance.js';
import LeaveApplication from '../../model/attendance/LeaveApplication.js';
import User from '../../model/userModel.mjs';
import ActivityLog from '../../model/attendance/ActivityLog.js';
import { ALLOWED_USERNAMES } from '../../middleware/requireAllowedAdmin.mjs';

// ── helpers ──────────────────────────────────────────────────────────────────
const resolveCompanyId = (req) => {
  if (req.user?.role?.toUpperCase() === 'ADMIN') {
    return req.query.company_id || req.body.company_id || req.user.company_id;
  }
  return req.user.company_id;
};

const log = async (req, module, action, details, metadata = {}) => {
  try {
    await new ActivityLog({
      company_id: resolveCompanyId(req),
      user_id: req.user._id,
      module, action, details, metadata,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    }).save();
  } catch (e) { console.error('Activity log error', e); }
};

const canMutatePolicy = (policy, userId) => {
  if (!policy?.created_by) return true;
  return String(policy.created_by) === String(userId);
};

export const getPolicyHistory = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 50, 1), 200);
    const policyType = String(req.query?.policy_type || '').toLowerCase();
    const policyId = req.query?.policy_id;
    const includeApprovals = String(req.query?.include_approvals || 'false').toLowerCase() === 'true';

    const activityQuery = {
      company_id: companyId,
      module: { $in: ['POLICY', 'LEAVE', 'POLICY_MANAGEMENT', 'SHIFT'] }
    };

    if (policyId) {
      activityQuery.$or = [
        { 'metadata.policy_id': policyId },
        { 'metadata.shift_id': policyId }
      ];
    }

    if (policyType === 'weekoff') {
      activityQuery.action = { $regex: 'WEEKOFF', $options: 'i' };
    } else if (policyType === 'holiday') {
      activityQuery.action = { $regex: 'HOLIDAY', $options: 'i' };
    } else if (policyType === 'leave') {
      activityQuery.module = 'LEAVE';
    } else if (policyType === 'shift') {
      activityQuery.module = 'SHIFT';
    }

    const policyActivityLogs = await ActivityLog.find(activityQuery)
      .populate('user_id', 'first_name last_name username role')
      .sort({ createdAt: -1 })
      .limit(limit);

    const policyEvents = policyActivityLogs.map((logItem) => {
      const actor = logItem.user_id;
      const actorName = actor
        ? (`${actor.first_name || ''} ${actor.last_name || ''}`.trim() || actor.username || 'Unknown')
        : 'Unknown';

      return {
        id: String(logItem._id),
        timestamp: logItem.createdAt,
        source: 'activity_log',
        module: logItem.module,
        action: logItem.action,
        details: logItem.details || '',
        actor_name: actorName,
        actor_role: actor?.role || null,
        metadata: logItem.metadata || {}
      };
    });

    const approvalEvents = [];
    if (includeApprovals) {
      const leaveApps = await LeaveApplication.find({
        company_id: companyId,
        approval_history: { $exists: true, $ne: [] }
      })
        .select('employee_id approval_history')
        .populate('employee_id', 'first_name last_name username')
        .sort({ updatedAt: -1 })
        .limit(limit);

      leaveApps.forEach((app) => {
        const employeeName = app.employee_id
          ? (`${app.employee_id.first_name || ''} ${app.employee_id.last_name || ''}`.trim() || app.employee_id.username || 'Employee')
          : 'Employee';

        (app.approval_history || []).forEach((evt, idx) => {
          if (!evt?.action) return;
          approvalEvents.push({
            id: `${app._id}-approval-${idx}`,
            timestamp: evt.timestamp || app.updatedAt,
            source: 'leave_approval_history',
            module: 'APPROVAL',
            action: `LEAVE_${String(evt.action || '').toUpperCase()}`,
            details: `${evt.action} leave request for ${employeeName}`,
            actor_name: evt.actor_name || 'Unknown',
            actor_role: evt.actor_role || null,
            metadata: {
              leave_application_id: app._id,
              employee_id: app.employee_id?._id || app.employee_id,
              comment: evt.comment || ''
            }
          });
        });
      });
    }

    const merged = [...policyEvents, ...approvalEvents]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    res.json({ success: true, data: merged, count: merged.length });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch policy history' });
  }
};

// ── Week-Off Policy CRUD ──────────────────────────────────────────────────────

export const listWeekOffPolicies = async (req, res) => {
  try {
    // Fetch all policies without company_id filtering
    const policies = await WeekOffPolicy.find({})
      .populate('applicability.teams.list', 'name')
      .populate('created_by', 'first_name last_name username role')
      .populate('updated_by', 'first_name last_name username role')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: policies });
  } catch (err) {
    console.error('listWeekOffPolicies error:', err);
    res.status(500).json({ error: err.message });
  }
};

export const getWeekOffPolicyById = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await WeekOffPolicy.findById(id)
      .populate('applicability.teams.list', 'name')
      .populate('created_by', 'first_name last_name username role')
      .populate('updated_by', 'first_name last_name username role');
    
    if (!policy) {
      return res.status(404).json({ message: 'Week-off policy not found' });
    }
    
    res.json({ success: true, data: policy });
  } catch (err) {
    console.error('getWeekOffPolicyById error:', err);
    res.status(500).json({ error: err.message });
  }
};

export const createWeekOffPolicy = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const policy = new WeekOffPolicy({
      ...req.body,
      company_id: companyId,
      created_by: req.user._id
    });
    await policy.save();
    // Populate for UI consistency
    await policy.populate('applicability.teams.list', 'name');
    await log(req, 'POLICY', 'CREATE_WEEKOFF_POLICY', `Created week-off policy: ${policy.policy_name}`, {
      policy_id: policy._id,
      policy_type: 'weekoff',
      policy_name: policy.policy_name
    });
    res.status(201).json({ success: true, data: policy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateWeekOffPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = resolveCompanyId(req);
    
    // Find policy (legacy or new)
    let policy = await WeekOffPolicy.findById(id);
    if (!policy) return res.status(404).json({ message: 'Week-off policy not found' });
    
    // Auto-migrate legacy records
    if (!policy.company_id && policy.created_by) {
      const creator = await User.findById(policy.created_by).select('company_id');
      policy.company_id = creator?.company_id || companyId;
    }
    
    // Verify company access
    if (policy.company_id && String(policy.company_id) !== String(companyId)) {
      return res.status(403).json({ message: 'You do not have access to this policy' });
    }
    
    if (!canMutatePolicy(policy, req.user._id)) {
      return res.status(403).json({ message: 'Only the admin who created this policy can edit it' });
    }

    if (!policy.created_by) policy.created_by = req.user._id;
    Object.assign(policy, req.body, { updated_by: req.user._id });
    await policy.save();
    
    await policy.populate('applicability.teams.list', 'name');
    await log(req, 'POLICY', 'UPDATE_WEEKOFF_POLICY', `Updated week-off policy: ${policy.policy_name}`, {
      policy_id: policy._id,
      policy_type: 'weekoff',
      policy_name: policy.policy_name
    });
    res.json({ success: true, data: policy });
  } catch (err) {
    console.error('updateWeekOffPolicy error:', err);
    res.status(500).json({ error: err.message });
  }
};

export const deleteWeekOffPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = resolveCompanyId(req);
    
    // Find policy (legacy or new)
    let policy = await WeekOffPolicy.findById(id);
    if (!policy) return res.status(404).json({ message: 'Week-off policy not found' });
    
    // Auto-migrate legacy records
    if (!policy.company_id && policy.created_by) {
      const creator = await User.findById(policy.created_by).select('company_id');
      policy.company_id = creator?.company_id || companyId;
    }
    
    // Verify company access
    if (policy.company_id && String(policy.company_id) !== String(companyId)) {
      return res.status(403).json({ message: 'You do not have access to this policy' });
    }
    
    if (!canMutatePolicy(policy, req.user._id)) {
      return res.status(403).json({ message: 'Only the admin who created this policy can delete it' });
    }
    
    if (!policy.created_by) policy.created_by = req.user._id;
    await policy.deleteOne();
    
    await log(req, 'POLICY', 'DELETE_WEEKOFF_POLICY', `Deleted week-off policy: ${policy.policy_name}`, {
      policy_id: policy._id,
      policy_type: 'weekoff',
      policy_name: policy.policy_name
    });
    res.json({ success: true, message: 'Week-off policy deleted' });
  } catch (err) {
    console.error('deleteWeekOffPolicy error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── Holiday Policy CRUD (Allowed Admin only for write ops) ───────────────────

export const listHolidayPolicies = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const { year } = req.query;
    const filter = { company_id: companyId };
    if (year) filter.year = parseInt(year, 10);

    const policies = await HolidayPolicy.find(filter)
      .populate('applicability.teams.list', 'name')
      .populate('applicability.departments', 'department_name')
      .populate('applicability.branches', 'branch_name')
      .populate('created_by', 'first_name last_name username role')
      .populate('updated_by', 'first_name last_name username role')
      .sort({ year: -1, createdAt: -1 });

    res.json({ success: true, data: policies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getHolidayPolicyById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = resolveCompanyId(req);
    const policy = await HolidayPolicy.findOne({ _id: id, company_id: companyId });
    if (!policy) return res.status(404).json({ message: 'Holiday policy not found' });
    res.json({ success: true, data: policy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createHolidayPolicy = async (req, res) => {
  try {
    // Only allowed admins
    const username = (req.user?.username || '').toLowerCase();
    if (req.user?.role === 'ADMIN' && !ALLOWED_USERNAMES.has(username)) {
      return res.status(403).json({ message: 'Only authorized admins can create holiday policies' });
    }

    const companyId = resolveCompanyId(req);
    const policy = new HolidayPolicy({
      ...req.body,
      company_id: companyId,
      created_by: req.user._id
    });
    await policy.save();
    await log(req, 'POLICY', 'CREATE_HOLIDAY_POLICY', `Created holiday policy: ${policy.policy_name} (${policy.year})`, {
      policy_id: policy._id,
      policy_type: 'holiday',
      policy_name: policy.policy_name
    });
    res.status(201).json({ success: true, data: policy });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'A holiday policy with this name already exists for this year' });
    }
    res.status(500).json({ error: err.message });
  }
};

export const updateHolidayPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = resolveCompanyId(req);
    const policy = await HolidayPolicy.findOne({ _id: id, company_id: companyId });
    if (!policy) return res.status(404).json({ message: 'Holiday policy not found' });
    if (!canMutatePolicy(policy, req.user._id)) {
      return res.status(403).json({ message: 'Only the admin who created this policy can edit it' });
    }
    if (!policy.created_by) policy.created_by = req.user._id;

    if (!policy.created_by) policy.created_by = req.user._id;
    Object.assign(policy, req.body, { updated_by: req.user._id });
    await policy.save();
    await log(req, 'POLICY', 'UPDATE_HOLIDAY_POLICY', `Updated holiday policy: ${policy.policy_name}`, {
      policy_id: policy._id,
      policy_type: 'holiday',
      policy_name: policy.policy_name
    });
    res.json({ success: true, data: policy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteHolidayPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = resolveCompanyId(req);
    const policy = await HolidayPolicy.findOne({ _id: id, company_id: companyId });
    if (!policy) return res.status(404).json({ message: 'Holiday policy not found' });
    if (!canMutatePolicy(policy, req.user._id)) {
      return res.status(403).json({ message: 'Only the admin who created this policy can delete it' });
    }

    if (!policy.created_by) policy.created_by = req.user._id;
    await policy.deleteOne();
    await log(req, 'POLICY', 'DELETE_HOLIDAY_POLICY', `Deleted holiday policy: ${policy.policy_name}`, {
      policy_id: policy._id,
      policy_type: 'holiday',
      policy_name: policy.policy_name
    });
    res.json({ success: true, message: 'Holiday policy deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Add/remove individual holiday entries within a policy (for inline editing).
 */
export const addHolidayToPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = resolveCompanyId(req);
    const { holiday_name, holiday_date, is_optional, holiday_type } = req.body;

    if (!holiday_name || !holiday_date) {
      return res.status(400).json({ message: 'holiday_name and holiday_date are required' });
    }

    const policy = await HolidayPolicy.findOne({ _id: id, company_id: companyId });
    if (!policy) return res.status(404).json({ message: 'Holiday policy not found' });
    if (!canMutatePolicy(policy, req.user._id)) {
      return res.status(403).json({ message: 'Only the admin who created this policy can edit it' });
    }
    if (!policy.created_by) policy.created_by = req.user._id;

    // Prevent duplicate dates
    const dateStr = new Date(holiday_date).toISOString().split('T')[0];
    const duplicate = policy.holidays.find(h =>
      new Date(h.holiday_date).toISOString().split('T')[0] === dateStr
    );
    if (duplicate) {
      return res.status(400).json({ message: `Holiday on ${dateStr} already exists in this policy` });
    }

    policy.holidays.push({ holiday_name, holiday_date, is_optional: !!is_optional, holiday_type: holiday_type || 'national' });
    policy.updated_by = req.user._id;
    await policy.save();

    await log(req, 'POLICY', 'ADD_HOLIDAY_ENTRY', `Added holiday ${holiday_name} to policy ${policy.policy_name}`, {
      policy_id: policy._id,
      policy_type: 'holiday',
      policy_name: policy.policy_name,
      holiday_name,
      holiday_date: dateStr
    });
    res.json({ success: true, data: policy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const removeHolidayFromPolicy = async (req, res) => {
  try {
    const { id, holidayDate } = req.params;
    const companyId = resolveCompanyId(req);

    const policy = await HolidayPolicy.findOne({ _id: id, company_id: companyId });
    if (!policy) return res.status(404).json({ message: 'Holiday policy not found' });
    if (!canMutatePolicy(policy, req.user._id)) {
      return res.status(403).json({ message: 'Only the admin who created this policy can edit it' });
    }

    const before = policy.holidays.length;
    policy.holidays = policy.holidays.filter(h =>
      new Date(h.holiday_date).toISOString().split('T')[0] !== holidayDate
    );

    if (policy.holidays.length === before) {
      return res.status(404).json({ message: 'Holiday entry not found' });
    }

    policy.updated_by = req.user._id;
    await policy.save();

    await log(req, 'POLICY', 'REMOVE_HOLIDAY_ENTRY', `Removed holiday ${holidayDate} from policy ${policy.policy_name}`, {
      policy_id: policy._id,
      policy_type: 'holiday',
      policy_name: policy.policy_name,
      holiday_date: holidayDate
    });
    res.json({ success: true, data: policy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /master/holidays-for-user  – Returns resolved holiday list for the logged-in user.
 * Regular employees & HODs hit this. Read-only.
 */
export const getHolidaysForCurrentUser = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { default: PolicyResolver } = await import('../../services/attendance/PolicyResolver.js');
    const holidays = await PolicyResolver.getHolidayList(user.company_id, targetYear, user);

    res.json({ success: true, data: holidays, year: targetYear });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Assign policy overrides to a user.
 */
export const assignPolicyToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { weekoff_policy_id, holiday_policy_id, shift_id, shift_ids, leave_policy_ids, attendance_settings } = req.body;

    const update = {};
    if (weekoff_policy_id !== undefined) update.weekoff_policy_id = weekoff_policy_id || null;
    if (holiday_policy_id !== undefined) update.holiday_policy_id = holiday_policy_id || null;
    
    if (shift_ids !== undefined) {
      const normalizedShiftIds = Array.isArray(shift_ids) ? shift_ids.filter(Boolean) : [];
      update.shift_ids = normalizedShiftIds;
      update.shift_id = normalizedShiftIds[0] || null;
    } else if (shift_id !== undefined) {
      update.shift_id = shift_id || null;
      update.shift_ids = shift_id ? [shift_id] : [];
    }

    if (leave_policy_ids !== undefined) {
      update['leave_settings.special_leave_policies'] = Array.isArray(leave_policy_ids) ? leave_policy_ids : [];
    }

    if (attendance_settings !== undefined && attendance_settings !== null) {
      if (typeof attendance_settings === 'object') {
        Object.keys(attendance_settings).forEach(key => {
          update[`attendance_settings.${key}`] = attendance_settings[key];
        });
      }
    }

    console.log('>>> [DEBUG] updateOne filter:', { _id: userId });
    console.log('>>> [DEBUG] updateOne body:', JSON.stringify(update, null, 2));

    const result = await User.updateOne({ _id: userId }, { $set: update });
    console.log('>>> [DEBUG] updateOne result:', JSON.stringify(result, null, 2));

    if (result.matchedCount === 0) return res.status(404).json({ message: 'User not found' });

    const user = await User.findById(userId).lean();
    console.log('>>> [DEBUG] Fetched user from DB after update:', JSON.stringify(user?.attendance_settings, null, 2));

    await log(req, 'POLICY', 'ASSIGN_POLICY_TO_USER', `Assigned policies to user ${user.username}`);
    res.json({
      success: true,
      data: {
        weekoff_policy_id: user.weekoff_policy_id,
        holiday_policy_id: user.holiday_policy_id,
        shift_id: user.shift_id,
        shift_ids: user.shift_ids || [],
        leave_policy_ids: user.leave_settings?.special_leave_policies || [],
        attendance_settings: user.attendance_settings
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Bulk assign policy overrides to selected users.
 * Supports partial updates: only provided keys are updated.
 */
export const bulkAssignPoliciesToUsers = async (req, res) => {
  try {
    const {
      user_ids,
      weekoff_policy_id,
      holiday_policy_id,
      shift_id,
      shift_ids,
      leave_policy_ids,
      attendance_settings
    } = req.body || {};

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ message: 'user_ids is required' });
    }

    const hasAnyAssignment =
      weekoff_policy_id !== undefined ||
      holiday_policy_id !== undefined ||
      shift_id !== undefined ||
      shift_ids !== undefined ||
      leave_policy_ids !== undefined ||
      attendance_settings !== undefined;

    if (!hasAnyAssignment) {
      return res.status(400).json({ message: 'Provide at least one policy field to assign' });
    }

    const users = await User.find({ _id: { $in: user_ids } }).select('_id username company_id leave_settings');
    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found for assignment' });
    }

    const update = {};
    if (weekoff_policy_id !== undefined) update.weekoff_policy_id = weekoff_policy_id || null;
    if (holiday_policy_id !== undefined) update.holiday_policy_id = holiday_policy_id || null;
    if (shift_ids !== undefined) {
      const normalizedShiftIds = Array.isArray(shift_ids) ? shift_ids.filter(Boolean) : [];
      update.shift_ids = normalizedShiftIds;
      update.shift_id = normalizedShiftIds[0] || null;
    } else if (shift_id !== undefined) {
      update.shift_id = shift_id || null;
      update.shift_ids = shift_id ? [shift_id] : [];
    }
    if (leave_policy_ids !== undefined) {
      update['leave_settings.special_leave_policies'] = Array.isArray(leave_policy_ids) ? leave_policy_ids : [];
    }

    if (attendance_settings !== undefined && attendance_settings !== null) {
      if (typeof attendance_settings === 'object') {
        Object.keys(attendance_settings).forEach(key => {
          update[`attendance_settings.${key}`] = attendance_settings[key];
        });
      }
    }

    await User.updateMany({ _id: { $in: users.map(u => u._id) } }, { $set: update });

    // If leave policies were assigned, ensure leave balances exist for current year.
    if (Array.isArray(leave_policy_ids) && leave_policy_ids.length > 0) {
      const currentYear = new Date().getFullYear();
      const policies = await LeavePolicy.find({ _id: { $in: leave_policy_ids }, status: 'active' })
        .select('_id leave_type annual_quota');

      for (const user of users) {
        const companyId = user.company_id?._id || user.company_id;
        for (const policy of policies) {
          const existing = await LeaveBalance.findOne({
            employee_id: user._id,
            leave_policy_id: policy._id,
            year: currentYear
          });

          if (!existing) {
            const isLwp = String(policy.leave_type || '').toLowerCase() === 'lwp';
            const opening = isLwp ? 2000 : Number(policy.annual_quota || 0);
            await LeaveBalance.create({
              company_id: companyId,
              employee_id: user._id,
              leave_policy_id: policy._id,
              leave_type: policy.leave_type,
              year: currentYear,
              opening_balance: opening,
              used: 0,
              pending_approval: 0,
              closing_balance: opening
            });
          }
        }
      }
    }

    await log(req, 'POLICY', 'BULK_ASSIGN_POLICIES_TO_USERS', `Bulk assigned policies to ${users.length} users`, {
      user_count: users.length,
      fields: Object.keys(update)
    });

    res.json({ success: true, assignedCount: users.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
