import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

import User from '../model/userModel.mjs';
import Shift from '../model/attendance/Shift.js';
import Company from '../model/attendance/Company.js';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    console.log('\n--- FINDING SHIFTS ---');
    const shifts = await Shift.find({
      $or: [
        { shift_name: /operation/i },
        { start_time: '15:00' },
        { end_time: '07:00' }
      ]
    }).lean();

    console.log(`Found ${shifts.length} matching shifts:`);
    for (const s of shifts) {
      console.log(JSON.stringify(s, null, 2));

      // Find users assigned to this shift
      const users = await User.find({
        $or: [
          { shift_id: s._id },
          { shift_ids: s._id }
        ]
      }).select('username first_name last_name company_id company shift_id').lean();
      console.log(`Users assigned to shift "${s.shift_name}": ${users.length}`);
      users.forEach(u => {
        console.log(` - User: ${u.username} (${u.first_name} ${u.last_name}), Company: ${u.company || u.company_id}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
