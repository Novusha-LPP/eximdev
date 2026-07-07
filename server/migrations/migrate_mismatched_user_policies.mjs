import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../model/userModel.mjs';
import LeavePolicy from '../model/attendance/LeavePolicy.js';
import LeaveBalance from '../model/attendance/LeaveBalance.js';
import LeaveApplication from '../model/attendance/LeaveApplication.js';
import Company from '../model/attendance/Company.js';

dotenv.config({ path: 'server/.env' });

const MONGODB_URI = process.env.PROD_MONGODB_URI;

async function runMigration() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB successfully.\n');

    const companies = await Company.find({}).lean();
    const companyMap = {};
    companies.forEach(c => {
      companyMap[c._id.toString()] = c;
    });

    const activePolicies = await LeavePolicy.find({ status: 'active' }).lean();
    console.log(`Loaded ${activePolicies.length} active leave policies.`);

    const users = await User.find({
      'leave_settings.leave_applicable': true,
      company_id: { $exists: true, $ne: null }
    });

    console.log(`Checking ${users.length} users with leave_applicable=true...`);

    let updatedUsersCount = 0;
    let updatedBalancesCount = 0;
    let updatedApplicationsCount = 0;

    for (const user of users) {
      const companyId = user.company_id.toString();
      const companyName = companyMap[companyId]?.company_name || 'Unknown';

      // Find correct active policies for this company
      const companyPolicies = activePolicies.filter(p => p.company_id?.toString() === companyId);
      if (companyPolicies.length === 0) {
        continue;
      }

      const companyPolicyMap = {};
      companyPolicies.forEach(p => {
        companyPolicyMap[p.leave_type] = p;
      });

      // 1. Check and correct User.leave_settings.special_leave_policies
      const currentSpecialIds = (user.leave_settings?.special_leave_policies || []).map(id => id.toString());
      const correctSpecialIds = [];
      let needsUserUpdate = false;

      for (const idStr of currentSpecialIds) {
        const policy = activePolicies.find(p => p._id.toString() === idStr);
        if (policy) {
          if (policy.company_id?.toString() !== companyId) {
            // Mismatched company policy! Map it to the correct company policy of the same type
            const correctPolicy = companyPolicyMap[policy.leave_type];
            if (correctPolicy) {
              correctSpecialIds.push(correctPolicy._id.toString());
              needsUserUpdate = true;
            } else {
              needsUserUpdate = true; // Drop it if no correct policy
            }
          } else {
            correctSpecialIds.push(idStr);
          }
        } else {
          needsUserUpdate = true;
        }
      }

      // Ensure LWP and Privilege are represented if they have balances
      const balances = await LeaveBalance.find({ employee_id: user._id, year: 2026 });
      for (const b of balances) {
        const correctPolicy = companyPolicyMap[b.leave_type];
        if (correctPolicy && !correctSpecialIds.includes(correctPolicy._id.toString())) {
          correctSpecialIds.push(correctPolicy._id.toString());
          needsUserUpdate = true;
        }
      }

      const dedupedCorrectIds = [...new Set(correctSpecialIds)];
      if (dedupedCorrectIds.length !== currentSpecialIds.length || needsUserUpdate) {
        user.leave_settings.special_leave_policies = dedupedCorrectIds.map(id => new mongoose.Types.ObjectId(id));
        await user.save();
        updatedUsersCount++;
        console.log(`Updated user ${user.username} (${companyName}):`);
        console.log(`  Before: ${currentSpecialIds.join(', ')}`);
        console.log(`  After:  ${dedupedCorrectIds.join(', ')}`);
      }

      // 2. Correct LeaveBalance documents for this user
      const existingTypesInBalances = {};
      
      // First, scan for existing valid balance records that are already correctly mapped
      for (const b of balances) {
        const correctPolicy = companyPolicyMap[b.leave_type];
        if (correctPolicy && b.leave_policy_id?.toString() === correctPolicy._id.toString() && b.company_id?.toString() === companyId) {
          existingTypesInBalances[b.leave_type] = b;
        }
      }

      for (const b of balances) {
        const correctPolicy = companyPolicyMap[b.leave_type];
        if (correctPolicy) {
          const typeKey = b.leave_type;
          
          // If this record is not correct, we need to map/merge it
          if (b.leave_policy_id?.toString() !== correctPolicy._id.toString() || b.company_id?.toString() !== companyId) {
            if (existingTypesInBalances[typeKey]) {
              // We already have a correct record for this type. Merge and delete this duplicate.
              const primary = existingTypesInBalances[typeKey];
              primary.opening_balance = (primary.opening_balance || 0) + (b.opening_balance || 0);
              primary.used = (primary.used || 0) + (b.used || 0);
              primary.pending_approval = (primary.pending_approval || 0) + (b.pending_approval || 0);
              primary.closing_balance = Math.max(0, primary.opening_balance - primary.used - primary.pending_approval);
              await primary.save();
              await LeaveBalance.deleteOne({ _id: b._id });
              updatedBalancesCount++;
              console.log(`  Merged duplicate balance record for ${typeKey} and deleted second record.`);
            } else {
              // This is the only record of this type. Correct it and mark as existing.
              b.leave_policy_id = correctPolicy._id;
              b.company_id = user.company_id;
              await b.save();
              existingTypesInBalances[typeKey] = b;
              updatedBalancesCount++;
              console.log(`  Updated balance record for ${b.leave_type}: policy ID -> ${correctPolicy._id}`);
            }
          }
        }
      }

      // 3. Correct LeaveApplication documents for this user
      const applications = await LeaveApplication.find({ employee_id: user._id });
      for (const app of applications) {
        const policy = activePolicies.find(p => p._id.toString() === app.leave_policy_id?.toString());
        if (policy && policy.company_id?.toString() !== companyId) {
          const correctPolicy = companyPolicyMap[policy.leave_type];
          if (correctPolicy) {
            app.leave_policy_id = correctPolicy._id;
            await app.save();
            updatedApplicationsCount++;
            console.log(`  Updated leave application (${app._id}) policy to ${correctPolicy._id}`);
          }
        }
      }
    }

    console.log(`\nMigration Summary:`);
    console.log(`- Updated users: ${updatedUsersCount}`);
    console.log(`- Updated balance records: ${updatedBalancesCount}`);
    console.log(`- Updated leave applications: ${updatedApplicationsCount}`);

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
