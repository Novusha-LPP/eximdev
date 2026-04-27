import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';
import User from '../model/userModel.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getArg = (name, fallback = '') => {
  const prefix = `${name}=`;
  const raw = args.find((arg) => arg.startsWith(prefix));
  return raw ? raw.slice(prefix.length) : fallback;
};

const username = getArg('--username', '');
const employee_code = getArg('--employee_code', getArg('--emp', ''));
const dateStr = getArg('--date', ''); // YYYY-MM-DD
const tz = getArg('--tz', 'Asia/Kolkata');
const allUsers = hasFlag('--all');
const MONGO_URI = getArg('--uri', process.env.PROD_MONGODB_URI || process.env.SERVER_MONGODB_URI || process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim');

if (!allUsers && !username && !employee_code) {
  console.error('Provide --username or --employee_code (or --emp) or --all');
  process.exit(2);
}
if (!dateStr) {
  console.error('Provide --date=YYYY-MM-DD');
  process.exit(2);
}

async function main() {
  await mongoose.connect(MONGO_URI);

  const userQuery = [];
  if (username) userQuery.push({ username });
  if (employee_code) userQuery.push({ employee_code });

  const user = await User.findOne({ $or: userQuery }).lean();
  if (!user) {
    console.error('User not found for', { username, employee_code });
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log('User found:', { _id: String(user._id), username: user.username, employee_code: user.employee_code });

  const dayStart = moment.tz(dateStr, 'YYYY-MM-DD', tz).startOf('day').toDate();
  const dayEnd = moment.tz(dateStr, 'YYYY-MM-DD', tz).endOf('day').toDate();

  const LeaveApplication = mongoose.model('LeaveApplicationFinder', new mongoose.Schema({}, { strict: false }), 'leaveapplications');

  const pendingStatuses = ['pending', 'pending_hod', 'pending_shalini', 'pending_final', 'hod_approved_pending_admin', 'in_review'];

  if (allUsers) {
    const pending = await LeaveApplication.find({
      approval_status: { $in: pendingStatuses },
      from_date: { $lte: dayEnd },
      to_date: { $gte: dayStart }
    }).populate('employee_id', 'username employee_code first_name last_name').lean();

    if (!pending || pending.length === 0) {
      console.log('No pending leaves found overlapping', dateStr, 'in', tz);
    } else {
      console.log(`Found ${pending.length} pending leave(s) overlapping ${dateStr} (${tz}):`);
      pending.forEach((l) => {
        console.log('---');
        console.log('id:', String(l._id));
        console.log('employee:', l.employee_id ? `${l.employee_id.username || ''} (${l.employee_id.employee_code || ''})` : String(l.employee_id));
        console.log('from_date (stored UTC):', l.from_date);
        console.log('to_date (stored UTC):', l.to_date);
        console.log('from_date (local):', moment(l.from_date).tz(tz).format('YYYY-MM-DD'));
        console.log('to_date (local):', moment(l.to_date).tz(tz).format('YYYY-MM-DD'));
        console.log('approval_status:', l.approval_status);
        console.log('leave_type:', l.leave_type || (l.leave_policy_id && l.leave_policy_id.leave_type) || null);
      });
    }
  } else {
    const pending = await LeaveApplication.find({
      employee_id: user._id,
      approval_status: { $in: pendingStatuses },
      from_date: { $lte: dayEnd },
      to_date: { $gte: dayStart }
    }).lean();

    if (!pending || pending.length === 0) {
      console.log('No pending leave found overlapping', dateStr, 'in', tz);
    } else {
      console.log(`Found ${pending.length} pending leave(s) overlapping ${dateStr} (${tz}):`);
      pending.forEach((l) => {
        console.log('---');
        console.log('id:', String(l._id));
        console.log('from_date (stored UTC):', l.from_date);
        console.log('to_date (stored UTC):', l.to_date);
        console.log('from_date (local):', moment(l.from_date).tz(tz).format('YYYY-MM-DD'));
        console.log('to_date (local):', moment(l.to_date).tz(tz).format('YYYY-MM-DD'));
        console.log('approval_status:', l.approval_status);
        console.log('leave_type:', l.leave_type || (l.leave_policy_id && l.leave_policy_id.leave_type) || null);
      });
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
