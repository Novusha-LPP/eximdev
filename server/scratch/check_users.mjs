import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../model/userModel.mjs';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    const ajith = await UserModel.findOne({ username: 'ajith_sivadasan' }).lean();
    const afzal = await UserModel.findOne({ username: 'afzal_ghanchi' }).lean();

    console.log('Ajith:', ajith ? { _id: ajith._id, role: ajith.role, teamId: ajith.teamId } : 'Not found');
    console.log('Afzal:', afzal ? { _id: afzal._id, role: afzal.role, teamId: afzal.teamId } : 'Not found');

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
