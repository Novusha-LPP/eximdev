import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../model/userModel.mjs';
import LeavePolicy from '../model/attendance/LeavePolicy.js';

dotenv.config();

const uri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DB_URI ||
  process.env.DEV_MONGODB_URI ||
  process.env.SERVER_MONGODB_URI ||
  process.env.PROD_MONGODB_URI;
if (!uri) {
  console.error('No Mongo URI env var found');
  process.exit(1);
}

const employeeId = process.argv[2];
const policyId = process.argv[3];

if (!employeeId || !policyId) {
  console.error('Usage: node scripts/check_leave_policy_assignment.mjs <employeeId> <policyId>');
  process.exit(1);
}

await mongoose.connect(uri);

const user = await User.findById(employeeId).select('username company_id leave_settings.special_leave_policies').lean();
const policy = await LeavePolicy.findById(policyId).select('policy_name leave_type status company_id').lean();

const assigned = user && user.leave_settings && Array.isArray(user.leave_settings.special_leave_policies)
  ? user.leave_settings.special_leave_policies.map((id) => String(id))
  : [];

console.log('user', user ? {
  id: String(user._id),
  username: user.username,
  company_id: user.company_id ? String(user.company_id) : null,
  assignedPolicyIds: assigned
} : null);

console.log('policy', policy ? {
  id: String(policy._id),
  policy_name: policy.policy_name,
  leave_type: policy.leave_type,
  status: policy.status,
  company_id: policy.company_id ? String(policy.company_id) : null
} : null);

console.log('isAssigned', assigned.includes(String(policyId)));

await mongoose.disconnect();
