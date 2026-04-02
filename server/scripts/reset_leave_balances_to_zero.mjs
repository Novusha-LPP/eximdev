import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import LeaveBalance from '../model/attendance/LeaveBalance.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// const uri = process.env.DEV_MONGODB_URI 


const uri = process.env.PROD_MONGODB_URI 
if (!uri) {
  console.error('❌ MongoDB URI not found in .env file');
  process.exit(1);
}

async function resetLeaveBalances() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Get total records before reset
    const totalBefore = await LeaveBalance.countDocuments();
    console.log(`\n📊 Found ${totalBefore} leave balance records\n`);

    if (totalBefore === 0) {
      console.log('✅ No leave balance records to reset');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Fetch all records to show details
    const allBalances = await LeaveBalance.find().select('employee_id leave_type opening_balance closing_balance').lean();
    
    console.log('📝 Sample of records before reset:');
    allBalances.slice(0, 5).forEach((bal, i) => {
      console.log(`  ${i + 1}. Employee: ${bal.employee_id} | Type: ${bal.leave_type} | Balance: ${bal.closing_balance}`);
    });
    if (allBalances.length > 5) {
      console.log(`  ... and ${allBalances.length - 5} more records\n`);
    }

    // Reset all leave balance records to zero
    const result = await LeaveBalance.updateMany(
      {},
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

    console.log(`\n✅ Successfully reset ${result.modifiedCount} leave balance records to ZERO\n`);

    // Show summary
    const balancesByType = await LeaveBalance.aggregate([
      {
        $group: {
          _id: '$leave_type',
          count: { $sum: 1 },
          totalBalance: { $sum: '$closing_balance' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('📊 Balance Summary by Leave Type:');
    balancesByType.forEach(item => {
      console.log(`  ${item._id}: ${item.count} users | Total Balance: ${item.totalBalance} days`);
    });

    // Show some sample records after reset
    console.log('\n📝 Sample of records after reset:');
    const samplesAfter = await LeaveBalance.find().select('employee_id leave_type opening_balance closing_balance').limit(5).lean();
    samplesAfter.forEach((bal, i) => {
      console.log(`  ${i + 1}. Employee: ${bal.employee_id} | Type: ${bal.leave_type} | Balance: ${bal.closing_balance}`);
    });

    console.log('\n✨ All leave balances have been reset to ZERO!');
    console.log('💡 Admins can now set individual balances using the updateBalance API');
    console.log('   POST /leave/admin/update-balance/:employee_id\n');

  } catch (error) {
    console.error('❌ Error resetting leave balances:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

resetLeaveBalances();
