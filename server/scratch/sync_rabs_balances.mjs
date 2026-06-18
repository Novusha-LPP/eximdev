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
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    // 1. Resolve RABS Company
    const rabsCompany = await Company.findOne({ company_name: /RABS Industries India Private Limited/i });
    if (!rabsCompany) {
      console.error('RABS Company not found!');
      process.exit(1);
    }
    const rabsCompanyId = rabsCompany._id;
    console.log(`RABS Company ID: ${rabsCompanyId}`);

    // 2. Fetch RABS HR policies
    const rabsPolicies = await LeavePolicy.find({
      company_id: rabsCompanyId,
      status: 'active',
      created_by: { $ne: null }
    });
    console.log(`Found ${rabsPolicies.length} active RABS policies.`);

    // 3. Fetch RABS Users
    const rabsUsers = await UserModel.find({ company_id: rabsCompanyId });
    console.log(`Found ${rabsUsers.length} RABS users.`);

    const currentYear = new Date().getFullYear();

    for (const user of rabsUsers) {
      console.log(`Processing user: ${user.username}...`);
      for (const policy of rabsPolicies) {
        let balanceRecord = await LeaveBalance.findOne({
          employee_id: user._id,
          leave_policy_id: policy._id,
          year: currentYear
        });

        const isLwp = String(policy.leave_type || '').toLowerCase() === 'lwp';
        const expectedOpening = isLwp ? 2000 : Number(policy.annual_quota || 0);

        if (!balanceRecord) {
          console.log(` - Creating missing balance record for ${policy.leave_type}`);
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
          // If legacy opening balance is large, reset it to 2000
          if (balanceRecord.opening_balance > 1000000) {
            console.log(` - Resetting legacy opening balance for ${policy.leave_type} from ${balanceRecord.opening_balance} to ${expectedOpening}`);
            balanceRecord.opening_balance = expectedOpening;
            await balanceRecord.save();
          }
        }

        // Run sync to recalculate used, pending_approval, and closing_balance
        await syncBalanceFromApplications({
          employeeId: user._id,
          year: currentYear,
          policy,
          balanceRecord
        });
      }
    }

    console.log('RABS balances synchronization and repair completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
