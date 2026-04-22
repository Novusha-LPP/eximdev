import Shift from '../../model/attendance/Shift.js';
import Holiday from '../../model/attendance/Holiday.js';
import LeavePolicy from '../../model/attendance/LeavePolicy.js';
import Company from '../../model/attendance/Company.js';
import ActivityLog from '../../model/attendance/ActivityLog.js';
import QueryBuilder from '../../services/attendance/QueryBuilder.js';
import User from '../../model/userModel.mjs';
import Department from '../../model/attendance/Department.js';
import Branch from '../../model/branchModel.mjs';
import UserBranchModel from '../../model/userBranchModel.mjs';

const LEGACY_ATTENDANCE_CONFIG_KEYS = [
  'grace_in_minutes',
  'grace_out_minutes',
  'auto_checkout_enabled',
  'auto_checkout_after_hours'
];

const sanitizeCompanySettingsPayload = (payload = {}) => {
  const sanitized = { ...payload };
  if (sanitized.attendance_config && typeof sanitized.attendance_config === 'object') {
    const nextConfig = { ...sanitized.attendance_config };
    LEGACY_ATTENDANCE_CONFIG_KEYS.forEach((key) => {
      delete nextConfig[key];
    });
    sanitized.attendance_config = nextConfig;
  }
  return sanitized;
};

const sanitizeCompanyForResponse = (companyDoc) => {
  if (!companyDoc) return companyDoc;
  const plain = typeof companyDoc.toObject === 'function' ? companyDoc.toObject() : companyDoc;
  if (plain.attendance_config && typeof plain.attendance_config === 'object') {
    LEGACY_ATTENDANCE_CONFIG_KEYS.forEach((key) => {
      delete plain.attendance_config[key];
    });
  }
  return plain;
};



// --- HELPERS ---
const resolveCompanyId = (req) => {
  if (req.user?.role?.toUpperCase() === 'ADMIN') {
    return req.query.company_id || req.body.company_id || req.user.company_id;
  }
  return req.user.company_id;
};

// --- HELPER: Record Activity ---
const canMutatePolicy = (policy, user) => {
  if (!policy?.created_by) return true;
  const username = (user?.username || '').toLowerCase();
  return String(policy.created_by) === String(user._id) || ALLOWED_USERNAMES.has(username);
};

const getChangeDetails = (oldObj, newObj, fields = []) => {
  const changes = [];
  fields.forEach(field => {
    const oldVal = oldObj[field];
    const newVal = newObj[field];
    if (oldVal !== newVal && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      const label = field.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      let dOld = oldVal, dNew = newVal;
      if (Array.isArray(oldVal)) { dOld = `${oldVal.length} items`; dNew = `${newVal.length} items`; }
      else if (typeof oldVal === 'object' && oldVal !== null) { dOld = 'object'; dNew = 'object'; }
      changes.push(`${label}: "${dOld}" -> "${dNew}"`);
    }
  });
  return changes.join(', ');
};

const logActivity = async (req, module, action, details, metadata = {}) => {
  try {
    const activity = new ActivityLog({
      company_id: resolveCompanyId(req),
      user_id: req.user._id,
      module,
      action,
      details,
      metadata,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    await activity.save();
  } catch (err) {
    console.error('Activity Log Error:', err);
  }
};

export const createShift = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    // Schema handles defaults, but we can add explicit validation here if needed

    const shift = new Shift({
      ...req.body,
      company_id: companyId,
      created_by: req.user._id
    });

    await shift.save();
    await logActivity(req, 'SHIFT', 'CREATE_SHIFT', `Created new shift: ${shift.shift_name}`, {
      shift_id: shift._id,
      policy_id: shift._id,
      policy_type: 'shift',
      policy_name: shift.shift_name
    });
    res.status(201).json(shift);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateShift = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const { id } = req.params;

    const shift = await Shift.findOne({ _id: id, company_id: companyId });
    if (!shift) return res.status(404).json({ message: 'Shift not found' });
    if (!canMutatePolicy(shift, req.user)) {
        return res.status(403).json({ message: 'Only the admin who created this shift or a super admin can edit it' });
    }

    const relFields = ['shift_name', 'shift_code', 'start_time', 'end_time', 'full_day_hours', 'late_allowed_minutes', 'early_leave_allowed_minutes'];
    const diff = getChangeDetails(shift, req.body, relFields);
    const details = diff ? `Updated shift ${shift.shift_name}: ${diff}` : `Updated shift: ${shift.shift_name}`;

    if (!shift.created_by) shift.created_by = req.user._id;
    Object.assign(shift, req.body, { updated_by: req.user._id });
    await shift.save();

    await logActivity(req, 'SHIFT', 'UPDATE_SHIFT', details, {
      shift_id: shift._id,
      policy_id: shift._id,
      policy_type: 'shift',
      policy_name: shift.shift_name
    });
    // Return populated for UI
    await shift.populate('created_by', 'first_name last_name username role');
    res.json(shift);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getShiftById = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const shift = await Shift.findOne({ _id: req.params.id, company_id: companyId })
      .populate('applicability.teams.list', 'name');

    if (!shift) return res.status(404).json({ message: 'Shift not found' });
    res.json(shift);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const getShifts = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const allCompanies = String(req.query?.all_companies || '').toLowerCase() === 'true';

    const roleNorm = String(req.user?.role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
    const isAdmin = roleNorm === 'ADMIN';

    const baseFilters = allCompanies && isAdmin
      ? {}
      : { company_id: companyId };

    const result = await QueryBuilder.build(
      Shift,
      req.query,
      baseFilters,
      ['shift_name', 'shift_code'],
      ['applicability.teams.list', 'created_by', 'updated_by']
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteShift = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const shift = await Shift.findOne({ _id: req.params.id, company_id: companyId });
    if (!shift) return res.status(404).json({ message: 'Shift not found' });
    if (!canMutatePolicy(shift, req.user)) {
        return res.status(403).json({ message: 'Only the admin who created this shift or a super admin can delete it' });
    }

    await shift.deleteOne();
    await logActivity(req, 'SHIFT', 'DELETE_SHIFT', `Deleted shift: ${shift.shift_name}`, {
      shift_id: shift._id,
      policy_id: shift._id,
      policy_type: 'shift',
      policy_name: shift.shift_name
    });
    res.json({ message: 'Shift deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const bulkAssignShifts = async (req, res) => {
  try {
    const { employeeIds, shiftId } = req.body;
    const companyId = resolveCompanyId(req);

    if (!employeeIds || !shiftId) {
      return res.status(400).json({ message: 'employeeIds and shiftId are required' });
    }

    const shift = await Shift.findOne({ _id: shiftId, company_id: companyId });
    if (!shift) return res.status(404).json({ message: 'Shift not found for this company' });

    const result = await User.updateMany(
      { _id: { $in: employeeIds }, company_id: companyId },
      { $set: { shift_id: shiftId, shift_ids: [shiftId] } }
    );

    await logActivity(req, 'SHIFT', 'BULK_ASSIGN', `Assigned shift ${shiftId} to ${result.modifiedCount} employees`);
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createHoliday = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const { holiday_date, holiday_name, holiday_type } = req.body;

    const holiday = new Holiday({
      company_id: companyId,
      holiday_date,
      holiday_name,
      holiday_type,
      year: new Date(holiday_date).getFullYear(),
      created_by: req.user._id
    });

    await holiday.save();
    await logActivity(req, 'HOLIDAY', 'CREATE_HOLIDAY', `Added holiday: ${holiday.holiday_name} (${holiday_date})`, { holiday_id: holiday._id });
    res.status(201).json(holiday);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getHolidays = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const result = await QueryBuilder.build(
      Holiday,
      req.query,
      { company_id: companyId },
      ['holiday_name'],
      ['created_by', 'updated_by']
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteHoliday = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const holiday = await Holiday.findOneAndDelete({ _id: req.params.id, company_id: companyId });
    if (holiday) {
      await logActivity(req, 'HOLIDAY', 'DELETE_HOLIDAY', `Deleted holiday: ${holiday.holiday_name}`);
    }
    res.json({ message: 'Holiday deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const bulkDeleteHolidays = async (req, res) => {
  try {
    const { ids } = req.body;
    const companyId = resolveCompanyId(req);
    const result = await Holiday.deleteMany({ _id: { $in: ids }, company_id: companyId });
    await logActivity(req, 'HOLIDAY', 'BULK_DELETE', `Deleted ${result.deletedCount} holidays`);
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// COMPANY SETTINGS MGMT
// ==========================================

export const getCompanySettings = async (req, res) => {
  try {
    const company = await Company.findById(resolveCompanyId(req));
    res.json(sanitizeCompanyForResponse(company));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateCompanySettings = async (req, res) => {
  try {
    const payload = sanitizeCompanySettingsPayload(req.body);
    const company = await Company.findByIdAndUpdate(
      resolveCompanyId(req),
      payload,
      { returnDocument: 'after' }
    );
    await logActivity(req, 'SETTING', 'UPDATE_POLICY', 'Updated company settings and policies');
    res.json(sanitizeCompanyForResponse(company));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// LEAVE POLICY MANAGEMENT
// ==========================================
export const createLeavePolicy = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const policy = new LeavePolicy({
      ...req.body,
      company_id: companyId,
      created_by: req.user._id,
      updated_by: req.user._id
    });

    await policy.save();
    await logActivity(req, 'LEAVE', 'CREATE_POLICY', `Created leave policy: ${policy.policy_name}`, {
      policy_id: policy._id,
      policy_type: 'leave',
      policy_name: policy.policy_name
    });
    res.status(201).json(policy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getLeavePolicies = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const filter = { company_id: companyId, status: 'active' };
    
    // For non-admins, show only policies they are eligible for
    if (req.user.role !== 'ADMIN') {
      const userType = req.user.employment_type;
      const userGender = req.user.gender;
      
      filter.$and = [
        { 
          $or: [
            { 'eligibility.employment_types': { $exists: false } },
            { 'eligibility.employment_types': { $size: 0 } },
            { 'eligibility.employment_types': userType }
          ]
        }
      ];

      if (userGender) {
        filter.$and.push({
          $or: [
            { 'eligibility.gender': { $exists: false } },
            { 'eligibility.gender': '' },
            { 'eligibility.gender': userGender }
          ]
        });
      }
    }

    const result = await QueryBuilder.build(
      LeavePolicy,
      req.query,
      filter,
      ['policy_name', 'leave_code'],
      ['created_by', 'updated_by']
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateLeavePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = resolveCompanyId(req);

    const policy = await LeavePolicy.findOne({ _id: id, company_id: companyId });

    if (!policy) {
      return res.status(404).json({ message: 'Leave policy not found' });
    }

    if (!canMutatePolicy(policy, req.user)) {
      return res.status(403).json({ message: 'Only the admin who created this policy or a super admin can edit it' });
    }

    const relFields = ['policy_name', 'leave_code', 'annual_quota', 'status', 'carry_forward', 'encashability'];
    const diff = getChangeDetails(policy, req.body, relFields);
    const details = diff ? `Updated leave policy ${policy.policy_name}: ${diff}` : `Updated leave policy: ${policy.policy_name}`;

    if (!policy.created_by) policy.created_by = req.user._id;
    Object.assign(policy, req.body, { updated_at: new Date(), updated_by: req.user._id });
    await policy.save();

    await logActivity(req, 'LEAVE', 'UPDATE_POLICY', details, {
      policy_id: policy._id,
      policy_type: 'leave',
      policy_name: policy.policy_name
    });
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteLeavePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = resolveCompanyId(req);

    const policy = await LeavePolicy.findOne({ _id: id, company_id: companyId });

    if (!policy) {
      return res.status(404).json({ message: 'Leave policy not found' });
    }

    if (policy.created_by && String(policy.created_by) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the admin who created this policy can delete it' });
    }

    if (!policy.created_by) policy.created_by = req.user._id;
    policy.status = 'inactive';
    policy.updated_at = new Date();
    policy.updated_by = req.user._id;
    await policy.save();

    await logActivity(req, 'LEAVE', 'DELETE_POLICY', `Deleted leave policy: ${policy.policy_name}`, {
      policy_id: policy._id,
      policy_type: 'leave',
      policy_name: policy.policy_name
    });
    res.json({ message: 'Leave policy deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



export const getDesignations = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const users = await User.find({ company_id: companyId })
      .select('designation department_id status')
      .populate('department_id', 'department_name');

    const desigMap = {};

    users.forEach(u => {
      const desig = u.designation || 'Trainee';
      const dept = u.department_id?.department_name || 'General';

      const key = `${desig}-${dept}`;
      if (!desigMap[key]) {
        desigMap[key] = {
          id: key,
          designation_name: desig,
          department_name: dept,
          employee_count: 0
        };
      }
      desigMap[key].employee_count++;
    });

    res.json({ success: true, data: Object.values(desigMap) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const listCompanies = async (req, res) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can list companies' });
    }
    const companies = await Company.find({})
      .select('company_name company_code shift_policy branch_ids attendance_config settings status createdAt updatedAt')
      .populate('branch_ids', 'branch_name branch_code category');
    res.json({ success: true, data: companies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const assignUsersToCompany = async ({ selectedUserIds = [], company, defaultShiftId = null, branchIds = [] }) => {
  if (!Array.isArray(selectedUserIds) || selectedUserIds.length === 0) return;

  const uniqueUserIds = [...new Set(selectedUserIds.map(String))];
  const userUpdate = {
    company_id: company._id,
    company: company.company_name
  };

  if (defaultShiftId) {
    userUpdate.shift_id = defaultShiftId;
    userUpdate.shift_ids = [defaultShiftId];
  }

  await User.updateMany(
    { _id: { $in: uniqueUserIds } },
    { $set: userUpdate }
  );

  if (Array.isArray(branchIds) && branchIds.length > 0) {
    const uniqueBranchIds = [...new Set(branchIds.map(String))];
    const assignments = [];

    for (const userId of uniqueUserIds) {
      for (const branchId of uniqueBranchIds) {
        assignments.push({ user_id: userId, branch_id: branchId });
      }
    }

    if (assignments.length > 0) {
      await UserBranchModel.insertMany(assignments, { ordered: false }).catch(() => {
        // Ignore duplicate assignment errors from unique index.
      });
    }
  }
};

export const createCompany = async (req, res) => {
  try {
    const { company_name, company_code, selected_user_ids, default_shift_id, branch_ids } = req.body;
    if (!company_name || !company_code) {
      return res.status(400).json({ message: 'company_name and company_code are required' });
    }

    const sanitizedBranchIds = Array.isArray(branch_ids) ? [...new Set(branch_ids.map(String))] : [];

    const company = new Company({
      ...req.body,
      branch_ids: sanitizedBranchIds,
      created_by: req.user._id
    });

    await company.save();

    await assignUsersToCompany({
      selectedUserIds: selected_user_ids,
      company,
      defaultShiftId: default_shift_id,
      branchIds: sanitizedBranchIds
    });

    await logActivity(req, 'COMPANY', 'CREATE_COMPANY', `Created new company: ${company.company_name}`, { company_id: company._id });
    res.status(201).json({ success: true, data: company });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { selected_user_ids, default_shift_id, branch_ids } = req.body;
    const sanitizedBranchIds = Array.isArray(branch_ids) ? [...new Set(branch_ids.map(String))] : undefined;

    const updatePayload = {
      ...req.body,
      updated_by: req.user._id
    };

    if (sanitizedBranchIds) {
      updatePayload.branch_ids = sanitizedBranchIds;
    }

    const company = await Company.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!company) return res.status(404).json({ message: 'Company not found' });

    await assignUsersToCompany({
      selectedUserIds: selected_user_ids,
      company,
      defaultShiftId: default_shift_id,
      branchIds: sanitizedBranchIds || company.branch_ids || []
    });

    await logActivity(req, 'COMPANY', 'UPDATE_COMPANY', `Updated company: ${company.company_name}`, { company_id: company._id });
    res.json({ success: true, data: company });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if users are assigned to this company
    const userCount = await User.countDocuments({ company_id: id });
    if (userCount > 0) {
      return res.status(400).json({ message: `Cannot delete company. There are ${userCount} users still assigned to it.` });
    }

    const company = await Company.findByIdAndDelete(id);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    await logActivity(req, 'COMPANY', 'DELETE_COMPANY', `Deleted company: ${company.company_name}`);
    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const migrateUser = async (req, res) => {
  try {
    const { userId, targetCompanyId, targetShiftId, targetDepartmentId } = req.body;

    if (!userId || !targetCompanyId) {
      return res.status(400).json({ message: 'userId and targetCompanyId are required' });
    }

    const targetCompany = await Company.findById(targetCompanyId);
    if (!targetCompany) return res.status(404).json({ message: 'Target company not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const sourceCompanyId = user.company_id;
    const sourceCompanyDoc = sourceCompanyId ? await Company.findById(sourceCompanyId).select('company_name').lean() : null;
    const sourceCompanyName = sourceCompanyDoc?.company_name || user.company || 'Unknown';

    // Update user record
    user.company_id = targetCompanyId;
    user.company = targetCompany.company_name;
    user.shift_id = targetShiftId || null;
    user.shift_ids = targetShiftId ? [targetShiftId] : [];
    user.department_id = targetDepartmentId || null;
    
    // Reset company-specific policies
    if (user.leave_settings) {
      user.leave_settings.special_leave_policies = [];
    }

    await user.save();

    await logActivity(req, 'USER', 'MIGRATE_USER', `Migrated user ${user.username} from ${sourceCompanyName} to ${targetCompany.company_name}`, {
      employeeId: user._id,
      userId: user._id,
      sourceCompanyId,
      sourceCompanyName,
      targetCompanyId,
      destinationCompanyId: targetCompanyId,
      destinationCompanyName: targetCompany.company_name,
      targetCompanyName: targetCompany.company_name,
      targetShiftId,
      targetDepartmentId
    });

    res.json({ success: true, message: 'User migrated successfully', data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get migration history for a specific organization
 */
export const getOrganizationMigrationHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find logs where this company is source or destination
    const migrationLogs = await ActivityLog.find({
      action: { $in: ['MIGRATE_EMPLOYEE', 'MIGRATE_USER'] },
      $or: [
        { 'metadata.sourceCompanyId': id },
        { 'metadata.destinationCompanyId': id },
        { 'metadata.sourceOrgId': id },
        { 'metadata.destinationOrgId': id },
        { 'metadata.targetCompanyId': id }
      ]
    })
    .populate('user_id', 'first_name last_name username')
    .sort({ createdAt: -1 })
    .lean();

    // Get all unique employee IDs involved
    const employeeIds = [...new Set(migrationLogs.map(log => log.metadata?.employeeId || log.metadata?.userId).filter(Boolean))];
    const employees = await User.find({ _id: { $in: employeeIds } }).select('first_name last_name employee_code username').lean();
    const employeeMap = new Map(employees.map(u => [String(u._id), u]));

    // Get all unique company IDs involved for mapping names
    const companyIds = new Set();
    migrationLogs.forEach(log => {
      const sid = log.metadata?.sourceCompanyId || log.metadata?.sourceOrgId;
      const did = log.metadata?.destinationCompanyId || log.metadata?.destinationOrgId || log.metadata?.targetCompanyId;
      if (sid) companyIds.add(String(sid));
      if (did) companyIds.add(String(did));
    });
    
    const companies = await Company.find({ _id: { $in: Array.from(companyIds) } }).select('company_name').lean();
    const companyMap = new Map(companies.map(c => [String(c._id), c.company_name]));

    const history = migrationLogs.map(log => {
      const metadata = log.metadata || {};
      const eid = metadata.employeeId || metadata.userId;
      const employee = employeeMap.get(String(eid));
      const sourceId = metadata.sourceCompanyId || metadata.sourceOrgId;
      const destId = metadata.destinationCompanyId || metadata.destinationOrgId || metadata.targetCompanyId;

      return {
        _id: log._id,
        action: log.action,
        migratedAt: log.createdAt,
        migratedBy: {
          name: [log.user_id?.first_name, log.user_id?.last_name].filter(Boolean).join(' ') || log.user_id?.username || 'System'
        },
        employee: {
          _id: eid,
          name: employee ? [employee.first_name, employee.last_name].filter(Boolean).join(' ') : (metadata.employeeName || 'Unknown'),
          code: employee?.employee_code || 'N/A'
        },
        source: metadata.sourceCompanyName || companyMap.get(String(sourceId)) || 'Unknown',
        destination: metadata.destinationCompanyName || metadata.targetCompanyName || companyMap.get(String(destId)) || 'Unknown',
        details: log.details
      };
    });

    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

import { ALLOWED_USERNAMES } from '../../middleware/requireAllowedAdmin.mjs';

export const getUsers = async (req, res) => {
  try {
    const { all_companies, department_id } = req.query;
    
    let query = {};
    const username = (req.user?.username || '').toLowerCase();
    const isGlobalAdmin = (req.user?.role === 'ADMIN' && ALLOWED_USERNAMES.has(username));

    if (all_companies === 'true' && isGlobalAdmin) {
      // Global admin can see users from all companies if explicitly requested
      query = {};
    } else {
      const companyId = resolveCompanyId(req);
      query = { company_id: companyId };
    }

    if (department_id && department_id !== 'all') {
      query.department_id = department_id;
    }

    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true' || req.query.isActive === true;
    }

    const users = await User.find(query)
      .select('-password')
      .populate('department_id', 'department_name')
      .populate('shift_id', 'shift_name')
      .populate('company_id', 'company_name')
      .populate('teamId', 'name');

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const departments = await Department.find({ company_id: companyId }).sort({ department_name: 1 });
    res.json({ success: true, data: departments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getBranches = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const company = await Company.findById(companyId).populate('branch_ids');
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json({ success: true, data: company.branch_ids || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Organizations (same as listCompanies, for frontend consistency) ───
export const getOrganizations = async (req, res) => {
  try {
    const companies = await Company.find({})
      .select('_id company_name company_code shift_policy branch_ids status createdAt')
      .populate('branch_ids', 'branch_name branch_code');

    const organizations = await Promise.all(
      companies.map(async (company) => {
        const hod = await User.findOne({
          company_id: company._id,
          role: 'HOD',
          isActive: { $ne: false }
        })
          .select('first_name last_name username employee_code employee_photo')
          .lean();

        return {
          _id: company._id,
          name: company.company_name,
          code: company.company_code,
          hod: hod || null,
          hodName: hod ? `${hod.first_name || ''} ${hod.last_name || ''}`.trim() : null,
          status: company.status,
          branches: company.branch_ids || []
        };
      })
    );

    res.json({ success: true, data: organizations });
  } catch (err) {
    console.error('Get Organizations Error:', err);
    res.status(500).json({ error: err.message });
  }
};
