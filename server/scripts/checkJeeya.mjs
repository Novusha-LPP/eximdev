import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../model/userModel.mjs';

dotenv.config({ path: './server/.env' });

const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/eximNew';

async function check() {
  try {
    await mongoose.connect(MONGO_URI);
    const user = await UserModel.findOne({ username: /jeeya/i }).lean();
    console.log('User found:', user);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

check();
