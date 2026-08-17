import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

import Company from '../model/attendance/Company.js';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    const comp1 = await Company.findById('69cd1e3b50e6c73acc73a924').lean();
    const comp2 = await Company.findById('69cd1e3b50e6c73acc73a918').lean();

    console.log('Company 69cd1e3b50e6c73acc73a924 (User):', JSON.stringify(comp1, null, 2));
    console.log('Company 69cd1e3b50e6c73acc73a918 (Shift):', JSON.stringify(comp2, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
