import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Company from '../model/attendance/Company.js';

dotenv.config();

const uri = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI || process.env.SERVER_MONGODB_URI || "mongodb://localhost:27017/eximdev";

async function run() {
  await mongoose.connect(uri);
  console.log("Connected to DB");
  const companies = await Company.find({}).lean();
  console.log("Companies count:", companies.length);
  for (const c of companies) {
    console.log(`- Company: ${c.company_name} (${c.company_code})`);
    console.log(`  shift_policy_id:`, c.shift_policy_id);
    console.log(`  weekoff_policy_id:`, c.weekoff_policy_id);
    console.log(`  holiday_policy_id:`, c.holiday_policy_id);
  }
  await mongoose.disconnect();
}

run().catch(console.error);
