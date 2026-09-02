import dotenv from 'dotenv';
import mongoose from 'mongoose';
import UserModel from '../model/userModel.mjs';
import LeaveBalance from '../model/attendance/LeaveBalance.js';
import LeaveApplication from '../model/attendance/LeaveApplication.js';
import LeavePolicy from '../model/attendance/LeavePolicy.js';

dotenv.config({ path: './.env' });

async function run() {
  try {
    const mongoUri = process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/exim';
    console.log('Connecting to database:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected successfully');

    const balances = await LeaveBalance.find({});
    console.log(`Found ${balances.length} leave balance records.`);

    let fixedCount = 0;

    for (const b of balances) {
      // Find the policy to check if LWP
      const policy = await LeavePolicy.findById(b.leave_policy_id);
      const isLwp = String(b.leave_type || policy?.leave_type || '').toLowerCase().includes('lwp');

      // Calculate actual pending days from LeaveApplication
      const pendingApps = await LeaveApplication.find({
        employee_id: b.employee_id,
        $or: [
          { leave_policy_id: b.leave_policy_id },
          ...(b.leave_type ? [{ leave_type: b.leave_type }] : [])
        ],
        approval_status: 'pending'
      });

      const actualPending = pendingApps.reduce((sum, app) => sum + (app.total_days || 0), 0);

      const oldPending = b.pending_approval || 0;
      const oldClosing = b.closing_balance || 0;

      const opening = b.opening_balance || 0;
      const used = b.used || 0;
      const calculatedClosing = isLwp ? 2000 : Math.max(0, opening - used - actualPending);

      if (oldPending !== actualPending || oldClosing !== calculatedClosing) {
        console.log(`Fixing balance for employee ID ${b.employee_id} (${b.leave_type}):`);
        console.log(`  - Pending: ${oldPending} -> ${actualPending}`);
        console.log(`  - Closing: ${oldClosing} -> ${calculatedClosing}`);
        
        b.pending_approval = actualPending;
        b.closing_balance = calculatedClosing;
        b.last_updated = new Date();
        await b.save();
        fixedCount++;
      }
    }

    console.log(`\nCleanup completed. Fixed ${fixedCount} corrupted balance records.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
