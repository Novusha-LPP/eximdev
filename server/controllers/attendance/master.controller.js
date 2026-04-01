import Shift from '../../model/attendance/Shift.js';
import Holiday from '../../model/attendance/Holiday.js';
import LeavePolicy from '../../model/attendance/LeavePolicy.js';
import Company from '../../model/attendance/Company.js';
import ActivityLog from '../../model/attendance/ActivityLog.js';
import QueryBuilder from '../../services/attendance/QueryBuilder.js';
import User from '../../model/userModel.mjs';
import Department from '../../model/attendance/Department.js';



// --- HELPERS ---
const resolveCompanyId = (req) => {
  if (req.user?.role?.toUpperCase() === 'ADMIN') {
    return req.query.company_id || req.body.company_id || req.user.company_id;
  }
  return req.user.company_id;
};

// --- HELPER: Record Activity ---
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
      company_id: companyId
    });

    await shift.save();
    await logActivity(req, 'SHIFT', 'CREATE_SHIFT', `Created new shift: ${shift.shift_name}`, { shift_id: shift._id });
    res.status(201).json(shift);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getShifts = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const result = await QueryBuilder.build(
      Shift,
      req.query,
      { company_id: companyId },
      ['shift_name', 'shift_code']
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteShift = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const shift = await Shift.findOneAndDelete({ _id: req.params.id, company_id: companyId });
    if (shift) {
      await logActivity(req, 'SHIFT', 'DELETE_SHIFT', `Deleted shift: ${shift.shift_name}`);
    }
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
      { $set: { shift_id: shiftId } }
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
      year: new Date(holiday_date).getFullYear()
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
      ['holiday_name']
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
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateCompanySettings = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      resolveCompanyId(req),
      req.body,
      { returnDocument: 'after' }
    );
    await logActivity(req, 'SETTING', 'UPDATE_POLICY', 'Updated company settings and policies');
    res.json(company);
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
      company_id: companyId
    });

    await policy.save();
    await logActivity(req, 'LEAVE', 'CREATE_POLICY', `Created leave policy: ${policy.policy_name}`);
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
      ['policy_name', 'leave_code']
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

    const policy = await LeavePolicy.findOneAndUpdate(
      { _id: id, company_id: companyId },
      { ...req.body, updated_at: new Date() },
      { returnDocument: 'after' }
    );

    if (!policy) {
      return res.status(404).json({ message: 'Leave policy not found' });
    }

    await logActivity(req, 'LEAVE', 'UPDATE_POLICY', `Updated leave policy: ${policy.policy_name}`);
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteLeavePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = resolveCompanyId(req);

    // Soft delete - just mark as inactive
    const policy = await LeavePolicy.findOneAndUpdate(
      { _id: id, company_id: companyId },
      { status: 'inactive', updated_at: new Date() },
      { returnDocument: 'after' }
    );

    if (!policy) {
      return res.status(404).json({ message: 'Leave policy not found' });
    }

    await logActivity(req, 'LEAVE', 'DELETE_POLICY', `Deleted leave policy: ${policy.policy_name}`);
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
      .select('company_name company_code timezone attendance_config settings status createdAt updatedAt');
    res.json({ success: true, data: companies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createCompany = async (req, res) => {
  try {
    const { company_name, company_code } = req.body;
    if (!company_name || !company_code) {
      return res.status(400).json({ message: 'company_name and company_code are required' });
    }

    const company = new Company({
      ...req.body,
      created_by: req.user._id
    });

    await company.save();
    await logActivity(req, 'COMPANY', 'CREATE_COMPANY', `Created new company: ${company.company_name}`, { company_id: company._id });
    res.status(201).json({ success: true, data: company });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await Company.findByIdAndUpdate(
      id,
      { ...req.body, updated_by: req.user._id },
      { new: true, runValidators: true }
    );

    if (!company) return res.status(404).json({ message: 'Company not found' });

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
    const sourceCompanyName = user.company;

    // Update user record
    user.company_id = targetCompanyId;
    user.company = targetCompany.company_name;
    user.shift_id = targetShiftId || null;
    user.department_id = targetDepartmentId || null;
    
    // Reset company-specific policies
    if (user.leave_settings) {
      user.leave_settings.special_leave_policies = [];
    }

    await user.save();

    await logActivity(req, 'USER', 'MIGRATE_USER', `Migrated user ${user.username} from ${sourceCompanyName} to ${targetCompany.company_name}`, {
      userId: user._id,
      sourceCompanyId,
      targetCompanyId,
      targetShiftId,
      targetDepartmentId
    });

    res.json({ success: true, message: 'User migrated successfully', data: user });
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

    const users = await User.find(query)
      .select('-password')
      .populate('department_id', 'department_name')
      .populate('shift_id', 'shift_name');

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
