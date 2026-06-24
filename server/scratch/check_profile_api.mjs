import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../model/userModel.mjs';
import { getEmployeeFullProfile } from '../controllers/attendance/attendance.controller.js';

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

    console.log('\n--- Querying getEmployeeFullProfile for Afzal ---');
    const req = {
      user: ajith, // HOD/allowed admin
      params: {
        id: String(afzal._id)
      },
      query: {
        startDate: '2026-06-01',
        endDate: '2026-06-30'
      }
    };
    const res = mockRes();
    await getEmployeeFullProfile(req, res);

    console.log('Response Code:', res.statusCode);
    if (res.statusCode === 200) {
      console.log('Summary:', JSON.stringify(res.data.summary, null, 2));
      console.log('Pending Leaves length:', res.data.pendingLeaves?.length);
      console.log('Pending Leaves:', JSON.stringify(res.data.pendingLeaves, null, 2));
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
