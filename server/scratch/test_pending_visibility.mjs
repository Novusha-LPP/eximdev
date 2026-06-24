import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../model/userModel.mjs';
import LeavePolicy from '../model/attendance/LeavePolicy.js';
import LeaveApplication from '../model/attendance/LeaveApplication.js';
import Company from '../model/attendance/Company.js';
import { applyLeave } from '../controllers/attendance/leave.controller.js';
import { getDashboard } from '../controllers/attendance/HOD.controller.js';

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

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    const afzal = await UserModel.findOne({ username: 'afzal_ghanchi' });
    const ajith = await UserModel.findOne({ username: 'ajith_sivadasan' });

    if (!afzal || !ajith) {
      console.error('Users not found');
      process.exit(1);
    }

    // Clean up June 26 leave if it exists
    await LeaveApplication.deleteMany({ employee_id: afzal._id, from_date_str: '2026-06-26' });

    // Fetch Ajith's LWP Policy for RABS
    const policy = await LeavePolicy.findOne({
      created_by: ajith._id,
      leave_type: 'lwp',
      status: 'active'
    });

    console.log('\n--- Applying June 26 Leave for Afzal (should go to pending) ---');
    const applyReq = {
      user: afzal,
      body: {
        leave_policy_id: String(policy._id),
        from_date: '2026-06-26',
        to_date: '2026-06-26',
        reason: 'Testing pending leave visibility',
        is_half_day: 'false'
      }
    };
    const applyRes = mockRes();
    await applyLeave(applyReq, applyRes);
    console.log('Apply Leave Response Code:', applyRes.statusCode);
    console.log('Apply Leave Response Data:', applyRes.data);

    // Verify the applied leave in DB
    const leaveApp = await LeaveApplication.findOne({
      employee_id: afzal._id,
      from_date_str: '2026-06-26'
    });
    if (!leaveApp) {
      console.error('Leave was not created');
      process.exit(1);
    }
    console.log('\nLeave created in DB:');
    console.log(`ID: ${leaveApp._id}`);
    console.log(`Status: ${leaveApp.approval_status}`);
    console.log(`Stage: ${leaveApp.approval_stage}`);
    console.log(`Current Approver: ${leaveApp.current_approver_id}`);

    console.log('\n--- Fetching Ajith\'s Dashboard ---');
    const dashboardReq = {
      user: ajith,
      query: {
        date: '2026-06-18' // today's date or similar
      }
    };
    const dashboardRes = mockRes();
    await getDashboard(dashboardReq, dashboardRes);

    console.log('Dashboard Response Code:', dashboardRes.statusCode);
    if (dashboardRes.statusCode === 200) {
      const data = dashboardRes.data.data;
      const pendingList = data.pendingLeaves || [];
      console.log(`Total Pending Leaves on Ajith's Dashboard: ${pendingList.length}`);
      const found = pendingList.find(l => String(l.id) === String(leaveApp._id));
      if (found) {
        console.log('SUCCESS: The pending leave is visible on Ajith\'s dashboard!');
        console.log('Details:', JSON.stringify(found, null, 2));
      } else {
        console.log('ERROR: The pending leave is NOT visible on Ajith\'s dashboard!');
        console.log('All pending leaves in response:', pendingList.map(l => ({ id: l.id, employeeName: l.employeeName, fromDate: l.fromDate })));
      }
    } else {
      console.error('Failed to get dashboard:', dashboardRes.data);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
