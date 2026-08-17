import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../model/userModel.mjs';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    const user = await UserModel.findOne({ username: 'afzal_ghanchi' }).lean();
    console.log('User afzal_ghanchi:', JSON.stringify(user, null, 2));

    const hods = await UserModel.find({ company: /RABS/i, role: /Head_of_Department/i }).lean();
    console.log(`\nFound ${hods.length} RABS HODs:`);
    hods.forEach(h => {
      console.log(`- Username: ${h.username}, Role: ${h.role}, isAttendanceAllowedAdmin: ${h.isAttendanceAllowedAdmin}, isAllowedAdmin: ${h.isAllowedAdmin}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
