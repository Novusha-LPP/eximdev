import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';

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
const TZ = getArg('--tz', 'Asia/Kolkata');
const MONGO_URI = getArg('--uri', process.env.PROD_MONGODB_URI);
const COMPANY_ID = getArg('--company', '');
const EMPLOYEE_ID = getArg('--employee', '');
const APP_ID = getArg('--appId', '');
const LIMIT = Number(getArg('--limit', '0')) || 0;

function buildQuery() {
  const query = {};
  if (COMPANY_ID) query.company_id = new mongoose.Types.ObjectId(COMPANY_ID);
  if (EMPLOYEE_ID) query.employee_id = new mongoose.Types.ObjectId(EMPLOYEE_ID);
  if (APP_ID) query._id = new mongoose.Types.ObjectId(APP_ID);
  return query;
}

function fmt(date) {
  return date ? moment(date).utc().format('YYYY-MM-DD HH:mm:ss [UTC]') : 'null';
}

function fmtLocal(date, tz = TZ) {
  return date ? moment(date).tz(tz).format('YYYY-MM-DD HH:mm:ss z') : 'null';
}

function diffMs(a, b) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime());
}

function computeTargetRange(app) {
  const totalDays = Number(app.total_days || 0);
  const startLocalDate = moment(app.from_date).tz(TZ).format('YYYY-MM-DD');
  const endLocalDate = moment(app.to_date).tz(TZ).format('YYYY-MM-DD');

  const targetFrom = moment.tz(startLocalDate, 'YYYY-MM-DD', TZ).startOf('day');

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
    targetTo = moment.tz(endLocalDate, 'YYYY-MM-DD', TZ).endOf('day');
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
  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(MONGO_URI);
  console.log(`Connected. Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLY'}`);
  console.log(`Timezone: ${TZ}`);

  const LeaveApplication = mongoose.model(
    'LeaveApplicationFixBoundary',
    new mongoose.Schema({}, { strict: false }),
    'leaveapplications'
  );

  const query = buildQuery();
  let cursor = LeaveApplication.find(query).sort({ createdAt: 1 });
  if (LIMIT > 0) cursor = cursor.limit(LIMIT);
  const applications = await cursor.lean();

  console.log(`Matched applications: ${applications.length}`);
  if (applications.length === 0) {
    await mongoose.disconnect();
    return;
  }

  let scanned = 0;
  let changed = 0;
  let skipped = 0;

  for (const app of applications) {
    scanned += 1;

    const { targetFrom, targetTo, strategy, startLocalDate, endLocalDate } = computeTargetRange(app);

    if (targetTo < targetFrom) {
      skipped += 1;
      console.log(`SKIP ${app._id}: computed invalid range (${strategy})`);
      continue;
    }

    const fromChanged = diffMs(app.from_date, targetFrom) > 1000;
    const toChanged = diffMs(app.to_date, targetTo) > 1000;

    if (!fromChanged && !toChanged) {
      continue;
    }

    changed += 1;

    console.log(`\n[${changed}] Leave ${app._id}`);
    console.log(`  employee_id: ${app.employee_id}`);
    console.log(`  type/status: ${app.leave_type || 'n/a'} / ${app.approval_status || 'n/a'}`);
    console.log(`  total_days: ${app.total_days} | strategy: ${strategy}`);
    console.log(`  local day span: ${startLocalDate} -> ${endLocalDate}`);
    console.log(`  from: ${fmt(app.from_date)} | ${fmtLocal(app.from_date)}`);
    console.log(`   to: ${fmt(app.to_date)} | ${fmtLocal(app.to_date)}`);
    console.log(`  => from: ${fmt(targetFrom)} | ${fmtLocal(targetFrom)}`);
    console.log(`     to: ${fmt(targetTo)} | ${fmtLocal(targetTo)}`);

    if (!DRY_RUN) {
      await LeaveApplication.updateOne(
        { _id: app._id },
        {
          $set: {
            from_date: targetFrom,
            to_date: targetTo
          }
        }
      );
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
  console.error('Migration failed:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
