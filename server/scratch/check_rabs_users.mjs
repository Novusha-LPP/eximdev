import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../model/userModel.mjs';
import CompanyModel from '../model/attendance/Company.js';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    const rabsCompany = await CompanyModel.findOne({ company_name: /RABS Industries India Private Limited/i });
    console.log('RABS Company:', rabsCompany);

    if (rabsCompany) {
      const users = await UserModel.find({ company_id: rabsCompany._id }).lean();
      console.log(`\nFound ${users.length} users for RABS:`);
      users.forEach(u => {
        console.log(`- Username: ${u.username}, Role: ${u.role}, Designation: ${u.designation}, Active: ${u.isActive}, ID: ${u._id}`);
      });
    } else {
      console.log('RABS Company not found by name regex');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
