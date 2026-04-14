import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../model/userModel.mjs';
import { getAdminAttendanceReport } from '../controllers/attendance/attendance.controller.js';

dotenv.config();

const uri = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function run() {
  await mongoose.connect(uri);

  const admin = await User.findOne({ role: { $regex: /^admin$/i }, isActive: true }).lean();
  if (!admin) {
    console.log('No active admin user found');
    process.exit(1);
  }

  const req = {
    query: {
      startDate: '2026-04-01',
      endDate: '2026-04-14',
      company_id: 'all'
    },
    body: {},
    user: admin,
    headers: {},
    ip: '127.0.0.1'
  };

  let statusCode = 200;
  let payload = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    }
  };

  const startedAt = Date.now();
  await getAdminAttendanceReport(req, res);
  const elapsed = Date.now() - startedAt;

  console.log('status=', statusCode);
  console.log('elapsedMs=', elapsed);
  console.log('rows=', Array.isArray(payload?.data) ? payload.data.length : 0);
  if (statusCode !== 200) {
    console.log('payload=', payload);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
