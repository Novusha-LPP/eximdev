import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Company from '../model/attendance/Company.js';
import LeavePolicy from '../model/attendance/LeavePolicy.js';
import LeaveBalance from '../model/attendance/LeaveBalance.js';
import UserModel from '../model/userModel.mjs';
import { syncBalanceFromApplications } from '../controllers/attendance/leave.controller.js';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function run() {
  try {
    const envUri = process.env.NODE_ENV === 'production' 
      ? process.env.PROD_MONGODB_URI 
      : (process.env.NODE_ENV === 'server' ? process.env.SERVER_MONGODB_URI : process.env.DEV_MONGODB_URI);
      
    const uriToConnect = envUri || MONGO_URI;
    console.log(`Connecting to database at: ${uriToConnect}`);
    await mongoose.connect(uriToConnect);
    console.log('Connected to Database successfully.');

    // 1. Fetch RABS Company
    const rabsCompany = await Company.findOne({ company_name: /RABS Industries India Private Limited/i });
    if (!rabsCompany) {
      console.error('ERROR: RABS Company not found in database!');
      process.exit(1);
    }
    const rabsCompanyId = rabsCompany._id;
    console.log(`RABS Company ID found: ${rabsCompanyId}`);

    // 2. Fetch Active RABS policies
    const rabsPolicies = await LeavePolicy.find({
      company_id: rabsCompanyId,
      status: 'active',
      created_by: { $ne: null }
    });
    console.log(`Found ${rabsPolicies.length} active RABS policies.`);
    rabsPolicies.forEach(p => console.log(` - Policy: ${p.policy_name} (${p.leave_type})`));
    const rabsPolicyIdsStr = rabsPolicies.map(p => String(p._id));

    // 3. Process RABS Users
    const rabsUsers = await UserModel.find({ company_id: rabsCompanyId });
    console.log(`Found ${rabsUsers.length} RABS users to initialize.`);

    const currentYear = new Date().getFullYear();

    for (const user of rabsUsers) {
      console.log(`\nInitializing user: ${user.username}`);

      // A. Clean up special_leave_policies (remove non-RABS, add active RABS)
      const currentSpecialPolicies = user.leave_settings?.special_leave_policies || [];
      const cleanedPolicies = currentSpecialPolicies.filter(id => rabsPolicyIdsStr.includes(String(id)));
      
      // Add RABS policies if missing
      rabsPolicyIdsStr.forEach(pid => {
        if (!cleanedPolicies.some(id => String(id) === pid)) {
          cleanedPolicies.push(new mongoose.Types.ObjectId(pid));
        }
      });

      await UserModel.updateOne(
        { _id: user._id },
        { 
          $set: { 
            'leave_settings.leave_applicable': true,
            'leave_settings.special_leave_policies': cleanedPolicies 
          } 
        }
      );
      console.log(` -> special_leave_policies updated. Count: ${cleanedPolicies.length}`);

      // B. Delete any legacy/non-RABS balances for this user in current year
      const deleteResult = await LeaveBalance.deleteMany({
        employee_id: user._id,
        year: currentYear,
        leave_policy_id: { $nin: rabsPolicies.map(p => p._id) }
      });
      if (deleteResult.deletedCount > 0) {
        console.log(` -> Deleted ${deleteResult.deletedCount} legacy/non-RABS balance records.`);
      }

      // C. Ensure correct LeaveBalance records exist and are synchronized
      for (const policy of rabsPolicies) {
        let balanceRecord = await LeaveBalance.findOne({
          employee_id: user._id,
          leave_policy_id: policy._id,
          year: currentYear
        });

        const isLwp = String(policy.leave_type || '').toLowerCase() === 'lwp';
        const expectedOpening = isLwp ? 2000 : Number(policy.annual_quota || 0);

        if (!balanceRecord) {
          console.log(` -> Creating new balance record for ${policy.leave_type}`);
          balanceRecord = new LeaveBalance({
            company_id: rabsCompanyId,
            employee_id: user._id,
            leave_policy_id: policy._id,
            leave_type: policy.leave_type,
            year: currentYear,
            opening_balance: expectedOpening,
            used: 0,
            pending_approval: 0,
            closing_balance: expectedOpening
          });
          await balanceRecord.save();
        } else {
          if (balanceRecord.opening_balance !== expectedOpening) {
            console.log(` -> Resetting opening balance for ${policy.leave_type} to ${expectedOpening}`);
            balanceRecord.opening_balance = expectedOpening;
            await balanceRecord.save();
          }
        }

        // Run sync to recalculate used, pending_approval, and closing_balance from actual applications
        await syncBalanceFromApplications({
          employeeId: user._id,
          year: currentYear,
          policy,
          balanceRecord
        });
      }
    }

    console.log('\nProduction initialization completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during production initialization:', err);
    process.exit(1);
  }
}

run();
