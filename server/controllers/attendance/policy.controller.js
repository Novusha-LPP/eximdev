/**
 * Week Off Policy & Holiday Policy management controller.
 * Week-off policies: any ADMIN can create/edit.
 * Holiday policies:  only ALLOWED ADMINs can create/edit/delete (requireAllowedAdmin middleware).
 */

import WeekOffPolicy from '../../model/attendance/WeekOffPolicy.js';
import HolidayPolicy from '../../model/attendance/HolidayPolicy.js';
import LeavePolicy from '../../model/attendance/LeavePolicy.js';
import LeaveBalance from '../../model/attendance/LeaveBalance.js';
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

// ── Week-Off Policy CRUD ──────────────────────────────────────────────────────

export const listWeekOffPolicies = async (req, res) => {
  try {
    const policies = await WeekOffPolicy.find({})
      .populate('applicability.teams.list', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: policies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createWeekOffPolicy = async (req, res) => {
  try {
    const policy = new WeekOffPolicy({
      ...req.body,
      created_by: req.user._id
    });
    await policy.save();
    // Populate for UI consistency
    await policy.populate('applicability.teams.list', 'name');
    await log(req, 'POLICY', 'CREATE_WEEKOFF_POLICY', `Created week-off policy: ${policy.policy_name}`);
    res.status(201).json({ success: true, data: policy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateWeekOffPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await WeekOffPolicy.findOneAndUpdate(
      { _id: id },
      { ...req.body, updated_by: req.user._id },
      { new: true, runValidators: true }
    );
    if (!policy) return res.status(404).json({ message: 'Week-off policy not found' });
    // Populate for UI consistency
    await policy.populate('applicability.teams.list', 'name');
    await log(req, 'POLICY', 'UPDATE_WEEKOFF_POLICY', `Updated week-off policy: ${policy.policy_name}`);
    res.json({ success: true, data: policy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteWeekOffPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await WeekOffPolicy.findOneAndDelete({ _id: id });
    if (!policy) return res.status(404).json({ message: 'Week-off policy not found' });
    await log(req, 'POLICY', 'DELETE_WEEKOFF_POLICY', `Deleted week-off policy: ${policy.policy_name}`);
    res.json({ success: true, message: 'Week-off policy deleted' });
  } catch (err) {
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
    await log(req, 'POLICY', 'CREATE_HOLIDAY_POLICY', `Created holiday policy: ${policy.policy_name} (${policy.year})`);
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
    const policy = await HolidayPolicy.findOneAndUpdate(
      { _id: id, company_id: companyId },
      { ...req.body, updated_by: req.user._id },
      { new: true, runValidators: true }
    );
    if (!policy) return res.status(404).json({ message: 'Holiday policy not found' });
    await log(req, 'POLICY', 'UPDATE_HOLIDAY_POLICY', `Updated holiday policy: ${policy.policy_name}`);
    res.json({ success: true, data: policy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteHolidayPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = resolveCompanyId(req);
    const policy = await HolidayPolicy.findOneAndDelete({ _id: id, company_id: companyId });
    if (!policy) return res.status(404).json({ message: 'Holiday policy not found' });
    await log(req, 'POLICY', 'DELETE_HOLIDAY_POLICY', `Deleted holiday policy: ${policy.policy_name}`);
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

    await log(req, 'POLICY', 'ADD_HOLIDAY_ENTRY', `Added holiday ${holiday_name} to policy ${policy.policy_name}`);
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

    const before = policy.holidays.length;
    policy.holidays = policy.holidays.filter(h =>
      new Date(h.holiday_date).toISOString().split('T')[0] !== holidayDate
    );

    if (policy.holidays.length === before) {
      return res.status(404).json({ message: 'Holiday entry not found' });
    }

    policy.updated_by = req.user._id;
    await policy.save();

    await log(req, 'POLICY', 'REMOVE_HOLIDAY_ENTRY', `Removed holiday ${holidayDate} from policy ${policy.policy_name}`);
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
    const { weekoff_policy_id, holiday_policy_id, shift_id, leave_policy_ids } = req.body;

    const update = {};
    if (weekoff_policy_id !== undefined) update.weekoff_policy_id = weekoff_policy_id || null;
    if (holiday_policy_id !== undefined) update.holiday_policy_id = holiday_policy_id || null;
    if (shift_id !== undefined) update.shift_id = shift_id || null;
    if (leave_policy_ids !== undefined) {
      update['leave_settings.special_leave_policies'] = Array.isArray(leave_policy_ids) ? leave_policy_ids : [];
    }

    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await log(req, 'POLICY', 'ASSIGN_POLICY_TO_USER', `Assigned policies to user ${user.username}`);
    res.json({
      success: true,
      data: {
        weekoff_policy_id: user.weekoff_policy_id,
        holiday_policy_id: user.holiday_policy_id,
        shift_id: user.shift_id,
        leave_policy_ids: user.leave_settings?.special_leave_policies || []
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
      leave_policy_ids
    } = req.body || {};

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ message: 'user_ids is required' });
    }

    const hasAnyAssignment =
      weekoff_policy_id !== undefined ||
      holiday_policy_id !== undefined ||
      shift_id !== undefined ||
      leave_policy_ids !== undefined;

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
    if (shift_id !== undefined) update.shift_id = shift_id || null;
    if (leave_policy_ids !== undefined) {
      update['leave_settings.special_leave_policies'] = Array.isArray(leave_policy_ids) ? leave_policy_ids : [];
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
