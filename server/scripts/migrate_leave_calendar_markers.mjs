import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';
import LeaveApplication from '../model/attendance/LeaveApplication.js';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';
import Company from '../model/attendance/Company.js';
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

const DRY_RUN = !hasFlag('--apply');
const CREATE_MISSING = hasFlag('--create-missing');
const OVERWRITE_EMPTY = hasFlag('--overwrite-empty');
const TZ_OVERRIDE = getArg('--tz', '');
const MONGO_URI = getArg(
  '--uri',
    process.env.DEV_MONGODB_URI 
);
const COMPANY_ID = getArg('--company', '');
const EMPLOYEE_ID = getArg('--employee', '');
const USERNAME = getArg('--username', '');
const APP_ID = getArg('--appId', '');
const FROM = getArg('--from', '');
const TO = getArg('--to', '');
const LIMIT = Number(getArg('--limit', '0')) || 0;
const SHOW_TABLE = hasFlag('--table') || hasFlag('--summary');
const QUIET = hasFlag('--quiet');
const STATUSES = getArg(
  '--statuses',
  'approved,pending,pending_hod,pending_shalini,pending_final,hod_approved_pending_admin,in_review'
)
  .split(',')
  .map((status) => status.trim())
  .filter(Boolean);

function asObjectId(value, label) {
  if (!value) return null;
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return new mongoose.Types.ObjectId(value);
}

function dateFilter() {
  const filter = {};
  if (FROM) filter.$gte = moment.utc(FROM, 'YYYY-MM-DD').startOf('day').toDate();
  if (TO) filter.$lte = moment.utc(TO, 'YYYY-MM-DD').endOf('day').toDate();
  return Object.keys(filter).length ? filter : null;
}

function fmt(date) {
  return date ? moment(date).utc().format('YYYY-MM-DD HH:mm:ss [UTC]') : 'null';
}

function fmtLocal(date, tz) {
  return date ? moment(date).tz(tz).format('YYYY-MM-DD HH:mm:ss z') : 'null';
}

function getYearMonth(dateStr) {
  return dateStr.slice(0, 7);
}

function attendanceDateForLocalDate(dateStr) {
  return moment.utc(dateStr, 'YYYY-MM-DD').startOf('day').toDate();
}

function isCleanLeaveMarker(record) {
  const status = String(record.status || '').toLowerCase();
  const hasPunchTimes = Boolean(record.first_in || record.last_out);
  const hasPunchCount = Number(record.total_punches || 0) > 0;
  const hasHours =
    Number(record.total_work_hours || 0) > 0 ||
    Number(record.net_work_hours || 0) > 0 ||
    Number(record.total_break_hours || 0) > 0;

  return (
    !record.is_locked &&
    !hasPunchTimes &&
    !hasPunchCount &&
    !hasHours &&
    (status === 'leave' || status === 'half_day' || record.is_on_leave)
  );
}

function pushUnique(list, value) {
  if (!list.includes(value)) list.push(value);
}

function shortList(value, maxLength = 80) {
  const text = String(value || '');
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}

function printAuditTable(rows) {
  const headers = ['username', 'name', 'apps', 'desired_dates', 'deletable_dates', 'unsafe_dates', 'linked_dates'];
  const compactRows = rows.map((row) => ({
    username: row.username,
    name: row.name,
    apps: row.leave_apps,
    desired_dates: shortList(row.desired_dates),
    deletable_dates: shortList(row.deletable_dates),
    unsafe_dates: shortList(row.unsafe_dates),
    linked_dates: shortList(row.linked_dates)
  }));
  const widths = Object.fromEntries(headers.map((header) => [
    header,
    Math.max(header.length, ...compactRows.map((row) => String(row[header] ?? '').length))
  ]));
  const render = (row) => `| ${headers.map((header) => String(row[header] ?? '').padEnd(widths[header])).join(' | ')} |`;

  console.log(render(Object.fromEntries(headers.map((header) => [header, header]))));
  console.log(`| ${headers.map((header) => '-'.repeat(widths[header])).join(' | ')} |`);
  for (const row of compactRows) console.log(render(row));
}

async function getUserLabel(employeeId, cache) {
  const key = String(employeeId || '');
  if (cache.has(key)) return cache.get(key);
  const user = await User.findById(employeeId).select('username first_name last_name').lean();
  const value = {
    username: user?.username || key,
    name: [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
  };
  cache.set(key, value);
  return value;
}

async function resolveTimezone(companyId, cache) {
  if (TZ_OVERRIDE) return TZ_OVERRIDE;
  const key = String(companyId || '');
  if (!key) return 'Asia/Kolkata';
  if (cache.has(key)) return cache.get(key);

  const company = await Company.findById(companyId).select('timezone').lean();
  const tz = company?.timezone || 'Asia/Kolkata';
  cache.set(key, tz);
  return tz;
}

function enumerateLeaveDates(leave, tz) {
  const start = moment(leave.from_date).tz(tz).startOf('day');
  const end = moment(leave.to_date).tz(tz).startOf('day');
  const dates = [];
  const cursor = start.clone();

  while (cursor.isSameOrBefore(end, 'day')) {
    dates.push(cursor.format('YYYY-MM-DD'));
    cursor.add(1, 'day');
  }

  return dates;
}

async function buildLeaveQuery() {
  const query = { approval_status: { $in: STATUSES } };
  if (APP_ID) query._id = asObjectId(APP_ID, 'appId');
  if (COMPANY_ID) query.company_id = asObjectId(COMPANY_ID, 'company');
  if (EMPLOYEE_ID) query.employee_id = asObjectId(EMPLOYEE_ID, 'employee');

  if (USERNAME) {
    const user = await User.findOne({ username: USERNAME }).select('_id username').lean();
    if (!user) throw new Error(`User not found for username: ${USERNAME}`);
    query.employee_id = user._id;
  }

  const range = dateFilter();
  if (range) {
    query.$or = [
      { from_date: range },
      { to_date: range },
      {
        from_date: { $lte: range.$lte || moment.utc(TO || FROM, 'YYYY-MM-DD').endOf('day').toDate() },
        to_date: { $gte: range.$gte || moment.utc(FROM || TO, 'YYYY-MM-DD').startOf('day').toDate() }
      }
    ];
  }

  return query;
}

async function getEmployeeLeaves(employeeId, companyId, activeLeaveIds, scanStart, scanEnd) {
  const query = {
    employee_id: employeeId,
    company_id: companyId,
    approval_status: { $in: STATUSES },
    $or: [
      { _id: { $in: [...activeLeaveIds] } },
      { from_date: { $lte: scanEnd }, to_date: { $gte: scanStart } }
    ]
  };

  return LeaveApplication.find(query).sort({ from_date: 1 }).lean();
}

async function cleanExtraRecords({ employeeId, companyId, tz, desiredDates, desiredByDate, scanStart, scanEnd }) {
  const records = await AttendanceRecord.find({
    employee_id: employeeId,
    attendance_date: { $gte: scanStart, $lte: scanEnd },
    $or: [{ status: { $in: ['leave', 'half_day'] } }, { is_on_leave: true }]
  }).sort({ attendance_date: 1 });

  let extras = 0;
  let unsafe = 0;
  const extraDates = [];
  const unsafeDates = [];
  const linkedDates = [];

  for (const record of records) {
    const localDate = moment(record.attendance_date).tz(tz).format('YYYY-MM-DD');
    const expectedLeave = desiredByDate.get(localDate);

    if (desiredDates.has(localDate)) {
      if (expectedLeave && isCleanLeaveMarker(record)) {
        const nextStatus = expectedLeave.is_half_day ? 'half_day' : 'leave';
        const needsLink =
          String(record.leave_application_id || '') !== String(expectedLeave._id) ||
          String(record.company_id || '') !== String(companyId) ||
          record.is_on_leave !== true ||
          record.status !== nextStatus;

        if (needsLink) {
          pushUnique(linkedDates, localDate);
          if (!QUIET) console.log(`  LINK ${localDate}: record ${record._id} -> leave ${expectedLeave._id}`);
          if (!DRY_RUN) {
            await AttendanceRecord.updateOne(
              { _id: record._id },
              {
                $set: {
                  company_id: companyId,
                  leave_application_id: expectedLeave._id,
                  is_on_leave: true,
                  status: nextStatus,
                  is_half_day: Boolean(expectedLeave.is_half_day),
                  half_day_session: expectedLeave.half_day_session || null,
                  remarks: record.remarks || 'Migrated leave calendar marker'
                }
              },
              { runValidators: false }
            );
          }
        }
      }
      continue;
    }

    extras += 1;
    pushUnique(extraDates, localDate);
    if (!QUIET) {
      console.log(
        `  EXTRA ${localDate}: record ${record._id}, status=${record.status}, attendance=${fmt(record.attendance_date)} | ${fmtLocal(record.attendance_date, tz)}`
      );
    }

    if (!isCleanLeaveMarker(record)) {
      unsafe += 1;
      pushUnique(unsafeDates, localDate);
      if (!QUIET) console.log('    SKIP unsafe record: has punches/hours, is locked, or is not a clean leave marker');

      // Check if has punches
      const hasPunchTimes = Boolean(record.first_in || record.last_out);
      const hasPunchCount = Number(record.total_punches || 0) > 0;

      if (hasPunchTimes || hasPunchCount) {
        if (!QUIET) console.log('    UPDATE to present due to punches');
        if (!DRY_RUN) {
          await AttendanceRecord.updateOne(
            { _id: record._id },
            {
              $set: {
                status: 'present',
                is_on_leave: false,
                leave_application_id: null,
                is_half_day: false,
                half_day_session: null,
                remarks: record.remarks || 'Corrected extra leave with punches'
              }
            },
            { runValidators: false }
          );
        }
      }

      continue;
    }

    if (!DRY_RUN) {
      await AttendanceRecord.deleteOne({ _id: record._id });
      if (!QUIET) console.log('    DELETED');
    } else {
      if (!QUIET) console.log('    DRY RUN - would delete');
    }
  }

  return { extras, unsafe, extraDates, unsafeDates, linkedDates };
}

async function createMissingRecords({ employeeId, companyId, tz, desiredByDate }) {
  let created = 0;
  let skipped = 0;

  for (const [dateStr, leave] of desiredByDate.entries()) {
    const attendanceDate = attendanceDateForLocalDate(dateStr);
    const existing = await AttendanceRecord.findOne({ employee_id: employeeId, attendance_date: attendanceDate });
    const nextStatus = leave.is_half_day ? 'half_day' : 'leave';

    if (existing) {
      const canOverwrite =
        OVERWRITE_EMPTY &&
        !existing.is_locked &&
        !existing.first_in &&
        !existing.last_out &&
        Number(existing.total_punches || 0) === 0 &&
        Number(existing.total_work_hours || 0) === 0 &&
        ['absent', 'weekly_off', 'leave', 'half_day'].includes(String(existing.status || '').toLowerCase());

      if (!canOverwrite) {
        skipped += 1;
        continue;
      }

      if (!QUIET) console.log(`  UPDATE ${dateStr}: record ${existing._id} -> ${nextStatus}`);
      if (!DRY_RUN) {
        await AttendanceRecord.updateOne(
          { _id: existing._id },
          {
            $set: {
              company_id: companyId,
              status: nextStatus,
              is_on_leave: true,
              leave_application_id: leave._id,
              is_half_day: Boolean(leave.is_half_day),
              half_day_session: leave.half_day_session || null,
              year_month: getYearMonth(dateStr),
              remarks: existing.remarks || 'Migrated leave calendar marker'
            }
          },
          { runValidators: false }
        );
      }
      created += 1;
      continue;
    }

    if (!QUIET) console.log(`  CREATE ${dateStr}: leave ${leave._id}, attendance=${fmt(attendanceDate)} | ${fmtLocal(attendanceDate, tz)}`);
    if (!DRY_RUN) {
      await AttendanceRecord.create({
        employee_id: employeeId,
        company_id: companyId,
        attendance_date: attendanceDate,
        year_month: getYearMonth(dateStr),
        status: nextStatus,
        is_on_leave: true,
        leave_application_id: leave._id,
        is_half_day: Boolean(leave.is_half_day),
        half_day_session: leave.half_day_session || null,
        total_work_hours: 0,
        net_work_hours: 0,
        total_punches: 0,
        processed_by: 'system',
        remarks: 'Migrated leave calendar marker'
      });
    }
    created += 1;
  }

  return { created, skipped };
}

async function main() {
  if (!QUIET) console.log('Connecting to MongoDB...');
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGO_URI);
  if (!QUIET) {
    console.log(`Connected. Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLY'}`);
    console.log(`Statuses: ${STATUSES.join(', ')}`);
  }

  const baseQuery = await buildLeaveQuery();
  let leavesQuery = LeaveApplication.find(baseQuery).sort({ employee_id: 1, from_date: 1 });
  if (LIMIT > 0) leavesQuery = leavesQuery.limit(LIMIT);
  const seedLeaves = await leavesQuery.lean();

  if (!QUIET) console.log(`Seed leave applications matched: ${seedLeaves.length}`);
  if (!seedLeaves.length) {
    if (SHOW_TABLE) console.log('No leave applications matched the filters.');
    await mongoose.disconnect();
    return;
  }

  const companyTzCache = new Map();
  const userCache = new Map();
  const employeeScopes = new Map();
  const summaryRows = [];

  for (const leave of seedLeaves) {
    const key = `${leave.company_id}:${leave.employee_id}`;
    const scope = employeeScopes.get(key) || {
      employeeId: leave.employee_id,
      companyId: leave.company_id,
      leaveIds: new Set(),
      minDate: leave.from_date,
      maxDate: leave.to_date
    };

    scope.leaveIds.add(String(leave._id));
    if (new Date(leave.from_date) < new Date(scope.minDate)) scope.minDate = leave.from_date;
    if (new Date(leave.to_date) > new Date(scope.maxDate)) scope.maxDate = leave.to_date;
    employeeScopes.set(key, scope);
  }

  let employeeCount = 0;
  let totalDesiredDays = 0;
  let totalExtras = 0;
  let totalUnsafe = 0;
  let totalCreated = 0;
  let totalSkippedCreate = 0;

  for (const scope of employeeScopes.values()) {
    employeeCount += 1;
    const tz = await resolveTimezone(scope.companyId, companyTzCache);
    const scanStart = moment(scope.minDate).subtract(2, 'days').startOf('day').toDate();
    const scanEnd = moment(scope.maxDate).add(2, 'days').endOf('day').toDate();
    const leaves = await getEmployeeLeaves(scope.employeeId, scope.companyId, scope.leaveIds, scanStart, scanEnd);

    const desiredDates = new Set();
    const desiredByDate = new Map();

    for (const leave of leaves) {
      const leaveDates = enumerateLeaveDates(leave, tz);
      for (const dateStr of leaveDates) {
        desiredDates.add(dateStr);
        if (!desiredByDate.has(dateStr)) desiredByDate.set(dateStr, leave);
      }
    }

    totalDesiredDays += desiredDates.size;
    const userLabel = await getUserLabel(scope.employeeId, userCache);
    if (!QUIET) {
      const displayName = userLabel.name ? `${userLabel.username} (${userLabel.name})` : userLabel.username;
      console.log(`\nEmployee ${displayName} | id ${scope.employeeId} | company ${scope.companyId} | tz ${tz}`);
      console.log(`  Active leave apps in scan: ${leaves.length}`);
      console.log(`  Desired leave dates: ${[...desiredDates].sort().join(', ') || 'none'}`);
    }

    const cleanResult = await cleanExtraRecords({
      employeeId: scope.employeeId,
      companyId: scope.companyId,
      tz,
      desiredDates,
      desiredByDate,
      scanStart,
      scanEnd
    });
    totalExtras += cleanResult.extras;
    totalUnsafe += cleanResult.unsafe;

    if (CREATE_MISSING) {
      const createResult = await createMissingRecords({
        employeeId: scope.employeeId,
        companyId: scope.companyId,
        tz,
        desiredByDate
      });
      totalCreated += createResult.created;
      totalSkippedCreate += createResult.skipped;
    }

    summaryRows.push({
      username: userLabel.username,
      name: userLabel.name,
      leave_apps: leaves.length,
      desired_dates: [...desiredDates].sort().join(', '),
      extra_dates: cleanResult.extraDates.sort().join(', '),
      deletable_dates: cleanResult.extraDates
        .filter((date) => !cleanResult.unsafeDates.includes(date))
        .sort()
        .join(', '),
      unsafe_dates: cleanResult.unsafeDates.sort().join(', '),
      linked_dates: cleanResult.linkedDates.sort().join(', ')
    });
  }

  if (!QUIET) {
    console.log('\nDone.');
    console.log(`Employees scanned: ${employeeCount}`);
    console.log(`Desired leave dates: ${totalDesiredDays}`);
    console.log(`Extra leave attendance records found: ${totalExtras}`);
    console.log(`Unsafe extra records skipped: ${totalUnsafe}`);
    if (CREATE_MISSING) {
      console.log(`Missing/empty records created or updated: ${totalCreated}`);
      console.log(`Existing records skipped while creating: ${totalSkippedCreate}`);
    }
  }
  if (SHOW_TABLE) {
    console.log('\nAudit Table');
    printAuditTable(summaryRows);
  } else {
    console.log('Tip: add --table --quiet to print only the username audit table.');
  }
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
