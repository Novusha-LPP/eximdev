import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../model/userModel.mjs';
import { getAdminLeaveRequests } from '../controllers/attendance/HOD.controller.js';

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

    const ajith = await UserModel.findOne({ username: 'ajith_sivadasan' });

    console.log('\n--- Querying getAdminLeaveRequests for Ajith ---');
    const req = {
      user: ajith,
      query: {
        teamId: 'all',
        historyPage: '1',
        historyLimit: '100'
      }
    };
    const res = mockRes();
    await getAdminLeaveRequests(req, res);

    console.log('Response Code:', res.statusCode);
    if (res.statusCode === 200) {
      const pendingLeaves = res.data.pendingLeaves || [];
      console.log(`Pending Leaves length: ${pendingLeaves.length}`);
      console.log('Pending Leaves:', JSON.stringify(pendingLeaves, null, 2));
    } else {
      console.error('API failed:', res.data);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
