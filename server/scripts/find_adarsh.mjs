import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../model/userModel.mjs';
import LeaveBalance from '../model/attendance/LeaveBalance.js';
import LeaveApplication from '../model/attendance/LeaveApplication.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const uris = {
  DEV: process.env.DEV_MONGODB_URI,
  PROD: process.env.PROD_MONGODB_URI,
};

async function testUri(name, uri) {
  if (!uri) return;
  console.log(`\n--- Testing ${name} URI ---`);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`Connected to ${name}`);

    // Check user
    const userById = await User.findById('68ad512cd4e8150302c6efaf').lean();
    console.log(`User by ID:`, userById ? { _id: userById._id, username: userById.username, name: `${userById.first_name} ${userById.last_name}` } : 'Not found');

    const userByUsername = await User.findOne({ username: 'adarsh_singh' }).lean();
    console.log(`User by username 'adarsh_singh':`, userByUsername ? { _id: userByUsername._id, username: userByUsername.username, name: `${userByUsername.first_name} ${userByUsername.last_name}` } : 'Not found');

    // Check Leave balances
    const targetUserId = userById ? userById._id : (userByUsername ? userByUsername._id : '68ad512cd4e8150302c6efaf');
    const balances = await LeaveBalance.find({ employee_id: targetUserId }).lean();
    console.log(`Leave balances found for ${targetUserId}:`, balances.length);
    balances.forEach(b => {
      console.log(`- Type: ${b.leave_type}, Year: ${b.year}, Opening: ${b.opening_balance}, Used: ${b.used}, Pending: ${b.pending_approval}, Closing: ${b.closing_balance}, Policy: ${b.leave_policy_id}`);
    });

    const applications = await LeaveApplication.find({ employee_id: targetUserId }).lean();
    console.log(`Leave applications found for ${targetUserId}:`, applications.length);
    applications.forEach(a => {
      console.log(`- App ID: ${a._id}, Type: ${a.leave_type}, Status: ${a.status}, Days: ${a.total_days}, From: ${a.start_date}, To: ${a.end_date}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.log(`Error testing ${name}:`, err.message);
    try { await mongoose.disconnect(); } catch (e) {}
  }
}

async function run() {
  await testUri('DEV', uris.DEV);
  await testUri('PROD', uris.PROD);
}

run();
