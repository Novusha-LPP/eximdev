import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeavePolicy from '../model/attendance/LeavePolicy.js';
import Company from '../model/attendance/Company.js';
import UserModel from '../model/userModel.mjs';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function check() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB...');

  const rabsCompany = await Company.findOne({ company_name: /RABS Industries India Private Limited/i });
  const rabsCompanyId = rabsCompany?._id;
  console.log(`RABS Company ID: ${rabsCompanyId}`);

  const policies = await LeavePolicy.find({}).populate('created_by', 'username').lean();
  console.log(`Found ${policies.length} total leave policies in DB:`);
  for (const p of policies) {
    console.log(`ID: ${p._id}, Name: "${p.policy_name}", Type: "${p.leave_type}", CompanyID: ${p.company_id}, CreatedBy: ${p.created_by?.username || 'Unknown'}, Status: ${p.status}`);
  }
  process.exit(0);
}
check();
