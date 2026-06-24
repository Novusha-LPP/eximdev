import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../model/userModel.mjs';
import LeavePolicy from '../model/attendance/LeavePolicy.js';
import LeaveApplication from '../model/attendance/LeaveApplication.js';
import LeaveBalance from '../model/attendance/LeaveBalance.js';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function check() {
  await mongoose.connect(MONGO_URI);
  const user = await UserModel.findOne({ username: 'afzal_ghanchi' });
  if (!user) {
    console.log('User not found');
    process.exit(0);
  }
  const [applications, balances] = await Promise.all([
    LeaveApplication.find({ employee_id: user._id }).lean(),
    LeaveBalance.find({ employee_id: user._id }).populate('leave_policy_id', 'leave_type policy_name').lean()
  ]);
  console.log(`Found ${applications.length} applications for afzal_ghanchi:`);
  console.log(JSON.stringify(applications, null, 2));
  console.log(`Found ${balances.length} balances for afzal_ghanchi:`);
  console.log(JSON.stringify(balances, null, 2));
  process.exit(0);
}
check();
