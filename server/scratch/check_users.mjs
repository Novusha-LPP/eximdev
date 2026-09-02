import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../model/userModel.mjs';
import LeaveBalance from '../model/attendance/LeaveBalance.js';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    const ajith = await UserModel.findOne({ username: 'ajith_sivadasan' }).lean();
    const afzal = await UserModel.findOne({ username: 'afzal_ghanchi' }).lean();

    console.log('Ajith:', ajith ? { _id: ajith._id, username: ajith.username, role: ajith.role, company: ajith.company, company_id: ajith.company_id, leave_settings: ajith.leave_settings } : 'Not found');
    console.log('Afzal:', afzal ? { _id: afzal._id, username: afzal.username, role: afzal.role, company: afzal.company, company_id: afzal.company_id, leave_settings: afzal.leave_settings } : 'Not found');

    const balances = await LeaveBalance.find({ employee_id: afzal._id }).lean();
    console.log('Afzal Leave Balances in DB:');
    balances.forEach(b => {
      console.log(` - PolicyId: ${b.leave_policy_id}, Type: ${b.leave_type}, Opening: ${b.opening_balance}, Used: ${b.used}, Pending: ${b.pending_approval}, Year: ${b.year}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
