import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeaveBalance from '../model/attendance/LeaveBalance.js';
import LeavePolicy from '../model/attendance/LeavePolicy.js';
import UserModel from '../model/userModel.mjs';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    const user = await UserModel.findOne({ username: 'kalpesh_chauhan' }).lean();
    console.log('User:', user.username, 'Company:', user.company_id);

    const balances = await LeaveBalance.find({ employee_id: user._id }).populate('leave_policy_id').lean();
    console.log('\nBalances:');
    balances.forEach(b => {
      console.log(`- Balance ID: ${b._id}`);
      console.log(`  Policy ID: ${b.leave_policy_id?._id || b.leave_policy_id}`);
      console.log(`  Policy Name: ${b.leave_policy_id?.policy_name}`);
      console.log(`  Policy Status: ${b.leave_policy_id?.status}`);
      console.log(`  Company ID of Policy: ${b.leave_policy_id?.company_id}`);
      console.log(`  Leave Type: ${b.leave_type}`);
      console.log(`  Opening: ${b.opening_balance}`);
    });

    console.log('\nSearching for policy 69ce0c8b9303f74d13e81dbb:');
    const policy = await LeavePolicy.findById('69ce0c8b9303f74d13e81dbb').lean();
    if (policy) {
      console.log('Found Policy:', policy);
    } else {
      console.log('Policy NOT found in DB');
    }

    console.log('\nAll Leave Policies in DB:');
    const allP = await LeavePolicy.find().lean();
    allP.forEach(p => {
      console.log(`- ID: ${p._id}, Name: ${p.policy_name}, Code: ${p.leave_code}, Type: ${p.leave_type}, Company: ${p.company_id}, Status: ${p.status}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
