import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';
import LeaveApplication from '../model/attendance/LeaveApplication.js';
import Company from '../model/attendance/Company.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getArg = (name, fallback = '') => {
  const prefix = `${name}=`;
  const raw = args.find((arg) => arg.startsWith(prefix));
  return raw ? raw.slice(prefix.length) : fallback;
};

const DRY_RUN = !hasFlag('--apply');
const TZ_OVERRIDE = getArg('--tz', '');
const MONGO_URI = getArg('--uri', process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/exim');
const COMPANY_ID = getArg('--company', '');
const EMPLOYEE_ID = getArg('--employee', '');
const LIMIT = Number(getArg('--limit', '0')) || 0;

const PENDING_STATUSES = ['pending', 'pending_hod', 'pending_shalini', 'pending_final', 'hod_approved_pending_admin', 'in_review'];

function fmt(date) {
  return date ? moment(date).utc().format('YYYY-MM-DD HH:mm:ss [UTC]') : 'null';
}

function fmtLocal(date, tz = 'Asia/Kolkata') {
  return date ? moment(date).tz(tz).format('YYYY-MM-DD HH:mm:ss z') : 'null';
}

function diffMs(a, b) {
  if (!a || !b) return Infinity;
  return Math.abs(new Date(a).getTime() - new Date(b).getTime());
}

function computeTargetRange(app, tz) {
  const totalDays = Number(app.total_days || 0);
  const startLocalDate = moment(app.from_date).tz(tz).format('YYYY-MM-DD');
  const endLocalDate = moment(app.to_date).tz(tz).format('YYYY-MM-DD');

  const targetFrom = moment.tz(startLocalDate, 'YYYY-MM-DD', tz).startOf('day');

  let targetTo;
  let strategy;

  if (app.is_half_day || totalDays === 0.5) {
    targetTo = targetFrom.clone().endOf('day');
    strategy = 'half_day_same_local_day';
  } else if (startLocalDate === endLocalDate) {
    targetTo = targetFrom.clone().endOf('day');
    strategy = 'same_day_snap';
  } else if (
    Number.isInteger(totalDays) &&
    totalDays > 0 &&
    !app.is_start_half_day &&
    !app.is_end_half_day
  ) {
    targetTo = targetFrom.clone().add(totalDays - 1, 'days').endOf('day');
    strategy = 'rebuild_from_integer_total_days';
  } else {
    targetTo = moment.tz(endLocalDate, 'YYYY-MM-DD', tz).endOf('day');
    strategy = 'preserve_local_end_day_snap';
  }

  return {
    targetFrom: targetFrom.toDate(),
    targetTo: targetTo.toDate(),
    strategy,
    startLocalDate,
    endLocalDate
  };
}

async function main() {
  console.log('Connecting to MongoDB...', MONGO_URI);
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGO_URI);

  const query = { approval_status: { $in: PENDING_STATUSES } };
  if (COMPANY_ID) query.company_id = mongoose.Types.ObjectId(COMPANY_ID);
  if (EMPLOYEE_ID) query.employee_id = mongoose.Types.ObjectId(EMPLOYEE_ID);

  let cursorQuery = LeaveApplication.find(query).sort({ createdAt: 1 });
  if (LIMIT > 0) cursorQuery = cursorQuery.limit(LIMIT);
  const cursor = cursorQuery.cursor();

  const companyTzCache = new Map();

  let scanned = 0;
  let changed = 0;
  let skipped = 0;

  for await (const app of cursor) {
    scanned += 1;

    const companyId = String(app.company_id || '');
    let tz = TZ_OVERRIDE || 'Asia/Kolkata';
    if (!TZ_OVERRIDE) {
      if (companyTzCache.has(companyId)) {
        tz = companyTzCache.get(companyId);
      } else {
        try {
          const comp = await Company.findById(app.company_id).select('timezone').lean();
          tz = comp?.timezone || 'Asia/Kolkata';
        } catch (err) {
          tz = 'Asia/Kolkata';
        }
        companyTzCache.set(companyId, tz);
      }
    }

    const { targetFrom, targetTo, strategy, startLocalDate, endLocalDate } = computeTargetRange(app, tz);

    if (targetTo < targetFrom) {
      skipped += 1;
      console.log(`SKIP ${app._id}: invalid computed range (${strategy})`);
      continue;
    }

    const fromChanged = diffMs(app.from_date, targetFrom) > 1000;
    const toChanged = diffMs(app.to_date, targetTo) > 1000;

    if (!fromChanged && !toChanged) {
      continue;
    }

    changed += 1;
    console.log(`\n[${changed}] Leave ${app._id} (employee: ${app.employee_id})`);
    console.log(`  company tz: ${tz} | strategy: ${strategy}`);
    console.log(`  local day span: ${startLocalDate} -> ${endLocalDate}`);
    console.log(`  stored from: ${fmt(app.from_date)} | local: ${fmtLocal(app.from_date, tz)}`);
    console.log(`     stored to: ${fmt(app.to_date)} | local: ${fmtLocal(app.to_date, tz)}`);
    console.log(`  => target from: ${fmt(targetFrom)} | local: ${fmtLocal(targetFrom, tz)}`);
    console.log(`     target to: ${fmt(targetTo)} | local: ${fmtLocal(targetTo, tz)}`);

    if (!DRY_RUN) {
      await LeaveApplication.updateOne(
        { _id: app._id },
        { $set: { from_date: targetFrom, to_date: targetTo } }
      );
      console.log('  UPDATED');
    } else {
      console.log('  DRY RUN - no write');
    }
  }

  console.log('\nDone.');
  console.log(`Scanned: ${scanned}`);
  console.log(`Would change / changed: ${changed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN ONLY - no writes performed' : 'LIVE - writes performed'}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Script failed:', err);
  try { await mongoose.disconnect(); } catch (e) {}
  process.exit(1);
});
