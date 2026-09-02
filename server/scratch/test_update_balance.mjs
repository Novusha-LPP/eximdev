import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { updateBalance, getBalance } from '../controllers/attendance/leave.controller.js';
import UserModel from '../model/userModel.mjs';
import LeaveBalance from '../model/attendance/LeaveBalance.js';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

const mockRes = (callback) => {
  return {
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      callback(this.statusCode, data);
      return this;
    }
  };
};

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    const afzal = await UserModel.findOne({ username: 'afzal_ghanchi' });
    const admin = await UserModel.findOne({ username: 'ajith_sivadasan' }); // Ajith is an admin

    if (!afzal || !admin) {
      console.error('Users not found');
      process.exit(1);
    }

    // Set admin's role to Admin to allow updates if not already
    admin.role = 'Admin';
    await admin.save();

    console.log('\n--- Calling updateBalance for LWP (Used: 3, Pending: 1997) ---');
    const updateReq = {
      user: admin,
      params: { employee_id: String(afzal._id) },
      body: {
        leave_policy_id: '6a33c496d34ec9898eb614fc',
        opening_balance: 2000,
        used: 3,
        pending: 1997
      }
    };

    let updateData = null;
    const updateRes = mockRes((code, data) => {
      console.log('Update Status Code:', code);
      console.log('Update Response:', data);
      updateData = data;
    });

    await updateBalance(updateReq, updateRes);

    console.log('\n--- Checking DB Record directly ---');
    const dbRecord = await LeaveBalance.findOne({
      employee_id: afzal._id,
      leave_policy_id: '6a33c496d34ec9898eb614fc',
      year: 2026
    }).lean();
    console.log('DB Leave Balance Record:', dbRecord);

    console.log('\n--- Fetching Balance through getBalance API ---');
    const getReq = {
      user: afzal,
      query: { employee_id: String(afzal._id) }
    };

    const getRes = mockRes((code, data) => {
      console.log('Get Balance Status Code:', code);
      const lwp = data.data.find(d => String(d._id) === '6a33c496d34ec9898eb614fc');
      console.log('LWP balance returned:', lwp);
    });

    await getBalance(getReq, getRes);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
