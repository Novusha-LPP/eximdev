import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { toggleAttendanceAllowedAdmin } from '../controllers/attendance/attendance.controller.js';
import User from '../model/userModel.mjs';

dotenv.config({ path: './server/.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB for controller tests...');

    const ajith = await User.findOne({ username: 'ajith_sivadasan' });
    const afzal = await User.findOne({ username: 'afzal_ghanchi' });
    const shalini = await User.findOne({ username: 'shalini_arun' });

    if (!ajith || !afzal || !shalini) {
      console.log('Skipping controller mock tests: required test users not found.');
      return;
    }

    console.log('\n--- Test Case 1: Ajith toggles Afzal (Authorized) ---');
    let req = {
      user: ajith,
      body: {
        target_user_id: afzal._id.toString(),
        is_admin: true
      },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'node-test' }
    };
    let res = {
      status: function(code) {
        console.log(`  Res status called with code: ${code}`);
        return this;
      },
      json: function(data) {
        console.log('  Res json called with data:', data);
        return this;
      }
    };
    await toggleAttendanceAllowedAdmin(req, res);

    console.log('\n--- Test Case 2: Afzal tries to toggle Ajith (Unauthorized) ---');
    req = {
      user: afzal,
      body: {
        target_user_id: ajith._id.toString(),
        is_admin: false
      },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'node-test' }
    };
    await toggleAttendanceAllowedAdmin(req, res);

    console.log('\n--- Test Case 3: Shalini (Global Admin) toggles Afzal (Authorized) ---');
    req = {
      user: shalini,
      body: {
        target_user_id: afzal._id.toString(),
        is_admin: false
      },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'node-test' }
    };
    await toggleAttendanceAllowedAdmin(req, res);

  } catch (err) {
    console.error('Error during controller test:', err);
  } finally {
    await mongoose.connection.close();
    console.log('DB connection closed.');
  }
}

run();
