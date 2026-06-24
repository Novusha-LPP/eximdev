import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../model/userModel.mjs';
import LeavePolicy from '../model/attendance/LeavePolicy.js';
import LeaveApplication from '../model/attendance/LeaveApplication.js';
import { applyLeave } from '../controllers/attendance/leave.controller.js';
import { approveRequest } from '../controllers/attendance/HOD.controller.js';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

const mockRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    }
  };
  return res;
};

async function runTest() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    // 1. Fetch Users
    const afzal = await UserModel.findOne({ username: 'afzal_ghanchi' });
    const ajith = await UserModel.findOne({ username: 'ajith_sivadasan' });

    if (!afzal || !ajith) {
      console.error('Afzal or Ajith user not found');
      process.exit(1);
    }

    console.log(`Afzal ID: ${afzal._id}, Company ID: ${afzal.company_id}`);
    console.log(`Ajith ID: ${ajith._id}, Company ID: ${ajith.company_id}`);

    // 2. Fetch Ajith's LWP Policy for RABS
    const policy = await LeavePolicy.findOne({
      created_by: ajith._id,
      leave_type: 'lwp',
      status: 'active'
    });
    if (!policy) {
      console.error('LWP policy created by Ajith not found');
      process.exit(1);
    }
    console.log(`Resolved Policy Name: "${policy.policy_name}", ID: ${policy._id}`);

    // 3. Clean up ALL existing leaves for Afzal to avoid overlap issues
    const deleted = await LeaveApplication.deleteMany({ employee_id: afzal._id });
    console.log(`Cleaned up ${deleted.deletedCount} existing leaves for Afzal Ghanchi`);

    // 4. Apply Leave as Afzal
    const testFromDate = '2026-06-25';
    const testToDate = '2026-06-25';
    console.log('\nStep 1: Applying for LWP leave as afzal_ghanchi...');
    const applyReq = {
      user: afzal,
      body: {
        leave_policy_id: String(policy._id),
        from_date: testFromDate,
        to_date: testToDate,
        reason: 'LWP leave test by Antigravity',
        is_half_day: 'false'
      }
    };
    const applyRes = mockRes();
    await applyLeave(applyReq, applyRes);

    if (applyRes.statusCode !== 200) {
      console.error('Apply Leave failed:', applyRes.data);
      process.exit(1);
    }
    console.log('Apply Leave response status:', applyRes.statusCode);
    console.log('Apply Leave response data:', JSON.stringify(applyRes.data, null, 2));

    // Find the created application
    const leaveApp = await LeaveApplication.findOne({
      employee_id: afzal._id,
      from_date: {
        $gte: new Date(testFromDate + 'T00:00:00.000Z'),
        $lte: new Date(testFromDate + 'T23:59:59.999Z')
      }
    }).populate('current_approver_id', 'username');

    if (!leaveApp) {
      console.error('Leave application was not created in DB');
      process.exit(1);
    }

    console.log(`Created Leave Application ID: ${leaveApp._id}`);
    console.log(`Approval Status in DB: ${leaveApp.approval_status}`);
    console.log(`Current Approver Username: ${leaveApp.current_approver_id?.username}`);
    console.log(`Approval Chain: ${JSON.stringify(leaveApp.approval_chain, null, 2)}`);

    // Verify it is routed to Ajith
    if (String(leaveApp.current_approver_id?._id || leaveApp.current_approver_id) !== String(ajith._id)) {
      console.error('ERROR: Leave is NOT routed to Ajith!');
      process.exit(1);
    }
    console.log('SUCCESS: Leave application correctly routed to Ajith as current approver.');

    // 5. Approve Leave as Ajith
    console.log('\nStep 2: Approving leave request as ajith_sivadasan...');
    const approveReq = {
      user: ajith,
      body: {
        id: String(leaveApp._id),
        type: 'leave',
        status: 'approved',
        comments: 'Approved by Ajith (Simulation)'
      }
    };
    const approveRes = mockRes();
    await approveRequest(approveReq, approveRes);

    if (approveRes.statusCode !== 200) {
      console.error('Approve Leave failed:', approveRes.data);
      process.exit(1);
    }
    console.log('Approve response status:', approveRes.statusCode);
    console.log('Approve response data:', approveRes.data);

    // Check final status of the leave application in DB
    const finalApp = await LeaveApplication.findById(leaveApp._id);
    console.log(`\nFinal Leave Application status: "${finalApp.approval_status}"`);
    console.log(`Final Approval Chain: ${JSON.stringify(finalApp.approval_chain, null, 2)}`);

    if (finalApp.approval_status !== 'approved') {
      console.error('ERROR: Leave is not fully approved!');
      process.exit(1);
    }
    console.log('SUCCESS: Leave is fully approved, bypassing other admin stages!');

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

runTest();
