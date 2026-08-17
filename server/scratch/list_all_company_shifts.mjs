import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

import Shift from '../model/attendance/Shift.js';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    console.log('\n--- ACTIVE SHIFTS FOR SR CONTAINER CARRIERS (69cd1e3b50e6c73acc73a924) ---');
    const shifts = await Shift.find({
      company_id: '69cd1e3b50e6c73acc73a924',
      status: 'active'
    }).lean();

    console.log(`Found ${shifts.length} active shifts:`);
    for (const s of shifts) {
      console.log(`- ID: ${s._id}, Name: "${s.shift_name}", Code: "${s.shift_code}", Start: "${s.start_time}", End: "${s.end_time}", CrossDay: ${s.is_cross_day}, Type: ${s.shift_type}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
