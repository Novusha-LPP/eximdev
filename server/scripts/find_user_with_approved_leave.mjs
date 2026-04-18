import dotenv from 'dotenv';
import mongoose from 'mongoose';

import UserModel from '../model/userModel.mjs';
import LeaveApplication from '../model/attendance/LeaveApplication.js';

dotenv.config();

const uri =
  process.env.DEV_MONGODB_URI ||
  process.env.SERVER_MONGODB_URI ||
  process.env.PROD_MONGODB_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  'mongodb://localhost:27017/eximdev';

const main = async () => {
  await mongoose.connect(uri);
  try {
    const approved = await LeaveApplication.find({ approval_status: 'approved' })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(10)
      .select('employee_id leave_type total_days from_date to_date approval_status')
      .lean();

    if (!approved.length) {
      console.log('No approved leaves found.');
      return;
    }

    const userIds = [...new Set(approved.map((a) => String(a.employee_id)))];
    const users = await UserModel.find({ _id: { $in: userIds } })
      .select('username first_name last_name role')
      .lean();

    const userMap = new Map(users.map((u) => [String(u._id), u]));

    for (const row of approved) {
      const u = userMap.get(String(row.employee_id));
      console.log({
        employee_id: String(row.employee_id),
        username: u?.username || null,
        name: [u?.first_name, u?.last_name].filter(Boolean).join(' ') || null,
        role: u?.role || null,
        leave_type: row.leave_type,
        total_days: row.total_days,
        from_date: row.from_date,
        to_date: row.to_date
      });
    }
  } finally {
    await mongoose.connection.close();
  }
};

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
