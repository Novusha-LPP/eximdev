import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import LeaveBalance from '../model/attendance/LeaveBalance.js';
import Company from '../model/attendance/Company.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI || process.env.SERVER_MONGODB_URI;

if (!uri) {
  console.error('❌ MongoDB URI not found in .env file');
  process.exit(1);
}

async function resetBalancesAdvanced() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    // Parse command line arguments
    const args = process.argv.slice(2);
    let filter = {};
    let filterDesc = 'ALL users';

    // Example usage:
    // node reset_leave_balances_advanced.mjs                          # Reset all
    // node reset_leave_balances_advanced.mjs --company-id <id>        # Reset by company
    // node reset_leave_balances_advanced.mjs --leave-type privilege   # Reset by leave type
    // node reset_leave_balances_advanced.mjs --user-id <id>           # Reset for one user

    if (args.includes('--company-id') && args[args.indexOf('--company-id') + 1]) {
      const companyId = args[args.indexOf('--company-id') + 1];
      filter.company_id = new mongoose.Types.ObjectId(companyId);
      
      const company = await Company.findById(companyId).select('company_name');
      filterDesc = company ? `${company.company_name} (${companyId})` : `Company ${companyId}`;
    }

    if (args.includes('--leave-type') && args[args.indexOf('--leave-type') + 1]) {
      const leaveType = args[args.indexOf('--leave-type') + 1];
      filter.leave_type = new RegExp(leaveType, 'i');
      filterDesc = `${leaveType} leave type`;
    }

    if (args.includes('--user-id') && args[args.indexOf('--user-id') + 1]) {
      const userId = args[args.indexOf('--user-id') + 1];
      filter.employee_id = new mongoose.Types.ObjectId(userId);
      filterDesc = `User ${userId}`;
    }

    // Count records to be affected
    const countBefore = await LeaveBalance.countDocuments(filter);
    console.log(`📊 Found ${countBefore} leave balance records for: ${filterDesc}\n`);

    if (countBefore === 0) {
      console.log('ℹ️  No records found matching the criteria');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Show samples before reset
    console.log('📝 Sample of records BEFORE reset:');
    const samplesBefore = await LeaveBalance.find(filter).select('employee_id leave_type opening_balance closing_balance').limit(3).lean();
    samplesBefore.forEach((bal, i) => {
      console.log(`  ${i + 1}. Employee: ${bal.employee_id} | Type: ${bal.leave_type} | Opening: ${bal.opening_balance} | Closing: ${bal.closing_balance}`);
    });
    console.log();

    // Reset balances
    console.log('🔄 Resetting balances...');
    const result = await LeaveBalance.updateMany(
      filter,
      {
        $set: {
          opening_balance: 0,
          credited: 0,
          consumed: 0,
          pending_approval: 0,
          carried_forward: 0,
          encashed: 0,
          lapsed: 0,
          closing_balance: 0,
          last_updated: new Date()
        }
      }
    );

    console.log(`\n✅ Successfully reset ${result.modifiedCount} leave balance records\n`);

    // Show samples after reset
    console.log('📝 Sample of records AFTER reset:');
    const samplesAfter = await LeaveBalance.find(filter).select('employee_id leave_type opening_balance closing_balance').limit(3).lean();
    samplesAfter.forEach((bal, i) => {
      console.log(`  ${i + 1}. Employee: ${bal.employee_id} | Type: ${bal.leave_type} | Opening: ${bal.opening_balance} | Closing: ${bal.closing_balance}`);
    });

    // Summary statistics
    console.log('\n📊 Summary Statistics:');
    const summary = await LeaveBalance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$leave_type',
          count: { $sum: 1 },
          totalBalance: { $sum: '$closing_balance' }
        }
      }
    ]);

    summary.forEach(item => {
      console.log(`  ${item._id}: ${item.count} records | Total balance: ${item.totalBalance} days`);
    });

    console.log('\n✨ Done! All selected leave balances have been set to ZERO\n');

    // Usage examples
    console.log('📚 USAGE EXAMPLES:');
    console.log('  Reset ALL users:');
    console.log('    node reset_leave_balances_advanced.mjs\n');
    console.log('  Reset by company:');
    console.log('    node reset_leave_balances_advanced.mjs --company-id <company_id>\n');
    console.log('  Reset by leave type:');
    console.log('    node reset_leave_balances_advanced.mjs --leave-type privilege\n');
    console.log('  Reset for specific user:');
    console.log('    node reset_leave_balances_advanced.mjs --user-id <user_id>\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

resetBalancesAdvanced();
