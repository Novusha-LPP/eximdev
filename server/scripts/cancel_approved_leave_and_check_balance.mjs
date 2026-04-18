import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import UserModel from '../model/userModel.mjs';
import LeaveApplication from '../model/attendance/LeaveApplication.js';
import LeaveBalance from '../model/attendance/LeaveBalance.js';

dotenv.config();

const DEFAULT_PASSWORD = '12345678';

const getArg = (name) => {
  const key = `--${name}`;
  const i = process.argv.indexOf(key);
  if (i === -1) return undefined;
  return process.argv[i + 1];
};

const hasFlag = (name) => process.argv.includes(`--${name}`);

const resolveMongoUri = () => {
  return (
    process.env.DEV_MONGODB_URI ||
    process.env.SERVER_MONGODB_URI ||
    process.env.PROD_MONGODB_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://localhost:27017/exim'
  );
};

const printUsage = () => {
  console.log(`\nUsage:
  node server/scripts/cancel_approved_leave_and_check_balance.mjs --username <username> [options]

Options:
  --username <username>        Required. Target employee username.
  --set-password               Optional. Reset password from backend.
  --password <password>        Optional. Default: ${DEFAULT_PASSWORD}
  --cancel-all                 Optional. Cancel all approved leaves (default: cancel only latest approved leave).
  --dry-run                    Optional. Show what would change without saving.

Examples:
  node server/scripts/cancel_approved_leave_and_check_balance.mjs --username manu_pillai --set-password --password 12345678
  node server/scripts/cancel_approved_leave_and_check_balance.mjs --username manu_pillai --cancel-all
`);
};

const toFixedNum = (v) => Math.round(Number(v || 0) * 100) / 100;

const logBalance = (label, balance) => {
  if (!balance) {
    console.log(`${label}: <no balance record>`);
    return;
  }

  console.log(
    `${label}: leave_type=${balance.leave_type}, policy=${balance.leave_policy_id}, year=${balance.year}, ` +
      `opening=${toFixedNum(balance.opening_balance)}, used=${toFixedNum(balance.used)}, ` +
      `pending_approval=${toFixedNum(balance.pending_approval)}, closing=${toFixedNum(balance.closing_balance)}`
  );
};

const findLatestBalanceForLeave = async (leave) => {
  const currentYear = new Date().getFullYear();
  return LeaveBalance.findOne({
    employee_id: leave.employee_id,
    year: currentYear,
    $or: [
      { leave_policy_id: leave.leave_policy_id },
      { leave_type: leave.leave_type }
    ]
  }).sort({ updatedAt: -1, createdAt: -1 });
};

const cancelApprovedLeave = async ({ leave, actorUserId, dryRun }) => {
  const wasApprovedLeave = String(leave.approval_status || '') === 'approved';
  const isLwp = String(leave.leave_type || '').toLowerCase() === 'lwp';
  const daysToRestore = Number(leave.total_days || 0);

  const balanceRecord = await findLatestBalanceForLeave(leave);

  console.log(`\nProcessing leave ${leave._id}`);
  console.log(
    `  type=${leave.leave_type}, status=${leave.approval_status}, from=${leave.from_date?.toISOString?.() || leave.from_date}, ` +
    `to=${leave.to_date?.toISOString?.() || leave.to_date}, total_days=${daysToRestore}`
  );

  logBalance('  Balance BEFORE', balanceRecord);

  if (!dryRun) {
    leave.approval_status = 'cancelled';
    leave.cancelled_by = actorUserId;
    leave.cancelled_at = new Date();
    leave.cancellation_reason = leave.cancellation_reason || 'Cancelled via backend utility script';
    await leave.save();
  }

  if (balanceRecord && !isLwp) {
    if (wasApprovedLeave) {
      balanceRecord.used = Math.max(0, Number(balanceRecord.used || 0) - daysToRestore);
    }

    balanceRecord.pending_approval = Number(balanceRecord.pending_approval || 0) + daysToRestore;
    balanceRecord.closing_balance = Math.max(0, Number(balanceRecord.pending_approval || 0));

    if (!dryRun) {
      await balanceRecord.save();
    }
  }

  const afterBalance = balanceRecord
    ? {
        ...balanceRecord.toObject(),
        used: balanceRecord.used,
        pending_approval: balanceRecord.pending_approval,
        closing_balance: balanceRecord.closing_balance
      }
    : null;

  logBalance('  Balance AFTER ', afterBalance);

  console.log(`  Result: ${dryRun ? 'DRY-RUN (no DB writes)' : 'CANCELLED + BALANCE UPDATED'}`);
};

const main = async () => {
  const username = getArg('username');
  const shouldSetPassword = hasFlag('set-password');
  const newPassword = getArg('password') || DEFAULT_PASSWORD;
  const cancelAll = hasFlag('cancel-all');
  const dryRun = hasFlag('dry-run');

  if (!username) {
    printUsage();
    process.exit(1);
  }

  const mongoUri = resolveMongoUri();
  console.log(`Connecting to MongoDB: ${mongoUri.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@')}`);
  await mongoose.connect(mongoUri);

  try {
    const user = await UserModel.findOne({ username }).select('_id username role password');

    if (!user) {
      throw new Error(`User not found for username: ${username}`);
    }

    console.log(`\nTarget user: ${user.username} (${user._id}) role=${user.role || 'N/A'}`);

    if (shouldSetPassword) {
      const hashed = await bcrypt.hash(newPassword, 10);
      if (!dryRun) {
        user.password = hashed;
        await user.save();
      }
      console.log(`Password ${dryRun ? 'would be' : 'has been'} reset to: ${newPassword}`);
    }

    const approvedLeaves = await LeaveApplication.find({
      employee_id: user._id,
      approval_status: 'approved'
    })
      .sort({ from_date: -1, createdAt: -1 })
      .lean(false);

    if (!approvedLeaves.length) {
      console.log('\nNo fully approved leave found for this user.');
      return;
    }

    console.log(`\nFound ${approvedLeaves.length} approved leave(s).`);

    const leavesToCancel = cancelAll ? approvedLeaves : [approvedLeaves[0]];

    for (const leave of leavesToCancel) {
      await cancelApprovedLeave({ leave, actorUserId: user._id, dryRun });
    }

    const finalBalances = await LeaveBalance.find({
      employee_id: user._id,
      year: new Date().getFullYear()
    }).sort({ leave_type: 1, updatedAt: -1 });

    console.log('\nFinal leave balances (current year):');
    if (!finalBalances.length) {
      console.log('  <no balances found>');
    } else {
      finalBalances.forEach((b) => logBalance('  ', b));
    }
  } finally {
    await mongoose.connection.close();
    console.log('\nDone. Connection closed.');
  }
};

main().catch((err) => {
  console.error('\nScript failed:', err.message || err);
  process.exit(1);
});
