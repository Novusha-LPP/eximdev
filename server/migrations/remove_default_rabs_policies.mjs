import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Company from '../model/attendance/Company.js';
import LeavePolicy from '../model/attendance/LeavePolicy.js';
import LeaveBalance from '../model/attendance/LeaveBalance.js';
import UserModel from '../model/userModel.mjs';

dotenv.config({ path: './.env' });

const env = process.env.NODE_ENV || 'development';
let MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

if (env === 'production') {
  MONGO_URI = process.env.PROD_MONGODB_URI;
} else if (env === 'server') {
  MONGO_URI = process.env.SERVER_MONGODB_URI;
}

async function run() {
  try {
    console.log(`Running migration in environment: "${env}"`);
    if (!MONGO_URI) {
      console.error(`Error: MongoDB URI not configured for environment: ${env}`);
      process.exit(1);
    }
    
    // Mask password in logs
    const maskedUri = MONGO_URI.replace(/:([^:@]+)@/, ':******@');
    console.log(`Connecting to MongoDB URI: ${maskedUri}`);

    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB successfully.');

    // 1. Resolve RABS Company
    const rabsCompany = await Company.findOne({ company_name: /RABS Industries India Private Limited/i });
    if (!rabsCompany) {
      console.error('RABS Company not found by name!');
      process.exit(1);
    }
    const rabsCompanyId = rabsCompany._id;
    console.log(`Resolved RABS Company ID: ${rabsCompanyId}`);

    // 2. Find system default policies for RABS (where created_by is null or not exists)
    const defaultPolicies = await LeavePolicy.find({
      company_id: rabsCompanyId,
      $or: [
        { created_by: { $exists: false } },
        { created_by: null }
      ]
    }).lean();

    const defaultPolicyIds = defaultPolicies.map(p => p._id);
    if (defaultPolicies.length > 0) {
      console.log('Found default RABS policies to remove:');
      for (const p of defaultPolicies) {
        console.log(` - ID: ${p._id}, Name: "${p.policy_name}", Type: "${p.leave_type}"`);
      }

      // 3. Remove default leave balances for RABS employees
      const rabsUsers = await UserModel.find({ company_id: rabsCompanyId }).select('_id username').lean();
      const rabsUserIds = rabsUsers.map(u => u._id);
      console.log(`Found ${rabsUserIds.length} RABS employees.`);

      const deletedBalances = await LeaveBalance.deleteMany({
        employee_id: { $in: rabsUserIds },
        leave_policy_id: { $in: defaultPolicyIds }
      });
      console.log(`Deleted ${deletedBalances.deletedCount} default leave balances for RABS employees.`);

      // 4. Delete the default policies
      const deletedPolicies = await LeavePolicy.deleteMany({
        _id: { $in: defaultPolicyIds }
      });
      console.log(`Deleted ${deletedPolicies.deletedCount} default leave policies for RABS.`);
    } else {
      console.log('No default leave policies found for RABS in LeavePolicy collection.');
    }

    // 5. Clean up stale policy IDs in User documents for RABS employees
    console.log('Checking for stale policy references in RABS user settings...');
    const allUsers = await UserModel.find({ company_id: rabsCompanyId }).select('leave_settings.special_leave_policies');
    const userPolicyIds = new Set();
    allUsers.forEach(u => {
      const ids = u.leave_settings?.special_leave_policies || [];
      ids.forEach(id => userPolicyIds.add(String(id)));
    });

    if (userPolicyIds.size > 0) {
      const activePolicies = await LeavePolicy.find({ _id: { $in: Array.from(userPolicyIds).map(id => new mongoose.Types.ObjectId(id)) } }).select('_id');
      const activePolicyIds = new Set(activePolicies.map(p => String(p._id)));
      
      const stalePolicyIds = Array.from(userPolicyIds).filter(id => !activePolicyIds.has(id));
      if (stalePolicyIds.length > 0) {
        console.log(`Found stale policy IDs to prune: ${stalePolicyIds}`);
        const userUpdateResult = await UserModel.updateMany(
          { company_id: rabsCompanyId },
          { $pull: { 'leave_settings.special_leave_policies': { $in: stalePolicyIds.map(id => new mongoose.Types.ObjectId(id)) } } }
        );
        console.log(`Pruned stale policy IDs from special_leave_policies of ${userUpdateResult.modifiedCount} RABS users.`);
      } else {
        console.log('No stale policy references found in RABS user settings.');
      }
    } else {
      console.log('No policy references found in RABS user settings.');
    }

    console.log('RABS Policy and Balance migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

run();
