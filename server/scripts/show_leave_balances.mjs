import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import LeaveBalance from '../model/attendance/LeaveBalance.js';
import User from '../model/userModel.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.DEV_MONGODB_URI 


// const uri = process.env.PROD_MONGODB_URI 

if (!uri) {
  console.error('❌ MongoDB URI not found in .env file');
  process.exit(1);
}

async function showLeaveBalances() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    // Get aggregate statistics
    const stats = await LeaveBalance.aggregate([
      {
        $group: {
          _id: '$leave_type',
          count: { $sum: 1 },
          avgBalance: { $avg: '$closing_balance' },
          totalBalance: { $sum: '$closing_balance' },
          minBalance: { $min: '$closing_balance' },
          maxBalance: { $max: '$closing_balance' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('📊 LEAVE BALANCE STATISTICS BY TYPE');
    console.log('═'.repeat(90));
    console.log(
      'Leave Type'.padEnd(20) +
      'Users'.padEnd(10) +
      'Total Days'.padEnd(15) +
      'Avg Balance'.padEnd(15) +
      'Min'.padEnd(10) +
      'Max'.padEnd(10)
    );
    console.log('─'.repeat(90));

    let totalUsers = 0;
    let totalDays = 0;

    stats.forEach(stat => {
      console.log(
        (stat._id || 'unknown').padEnd(20) +
        String(stat.count).padEnd(10) +
        String(stat.totalBalance.toFixed(1)).padEnd(15) +
        String(stat.avgBalance.toFixed(1)).padEnd(15) +
        String(stat.minBalance).padEnd(10) +
        String(stat.maxBalance).padEnd(10)
      );
      totalUsers += stat.count;
      totalDays += stat.totalBalance;
    });

    console.log('─'.repeat(90));
    console.log(
      'TOTAL'.padEnd(20) +
      String(totalUsers).padEnd(10) +
      String(totalDays.toFixed(1)).padEnd(15)
    );
    console.log('═'.repeat(90));

    // Show users with highest balance
    console.log('\n🏆 TOP 10 USERS WITH HIGHEST BALANCE');
    console.log('─'.repeat(90));
    const topBalances = await LeaveBalance.aggregate([
      { $sort: { closing_balance: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: 'employee_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
    ]);

    topBalances.forEach((bal, i) => {
      const userName = bal.user ? `${bal.user.first_name || ''} ${bal.user.last_name || ''}`.trim() : 'Unknown';
      const userEmail = bal.user?.email || '—';
      console.log(
        `${(i + 1).toString().padEnd(3)}. ${userName.padEnd(30)} | ${bal.leave_type.padEnd(15)} | ${bal.closing_balance} days | ${userEmail}`
      );
    });

    // Show count by company
    console.log('\n🏢 USERS BY COMPANY');
    console.log('─'.repeat(60));
    const byCompany = await LeaveBalance.aggregate([
      {
        $group: {
          _id: '$company_id',
          userCount: { $sum: 1 },
          totalBalance: { $sum: '$closing_balance' }
        }
      },
      {
        $lookup: {
          from: 'companies',
          localField: '_id',
          foreignField: '_id',
          as: 'company'
        }
      },
      { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } }
    ]);

    byCompany.forEach(item => {
      const companyName = item.company?.company_name || 'Unknown';
      console.log(`${companyName.padEnd(40)} | ${item.userCount} users | ${item.totalBalance.toFixed(1)} total days`);
    });

    console.log('\n💡 To reset all balances to ZERO, run:');
    console.log('   node ./scripts/reset_leave_balances_to_zero.mjs\n');

  } catch (error) {
    console.error('❌ Error fetching leave balance information:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

showLeaveBalances();
