/**
 * scratch/fix_leave_balance_duplicates.mjs
 *
 * Finds and removes duplicate LeaveBalance records for any employee.
 * For idempotent leave types (privilege, lwp), only ONE record per year should exist.
 *
 * STRATEGY — which record to KEEP:
 *   1. Record with highest `used` (real deductions → live record).
 *   2. Tie: record with highest `opening_balance` (admin-set correct quota).
 *   3. Tie: most recently `updatedAt`.
 *
 * MODES:
 *   node scratch/fix_leave_balance_duplicates.mjs               → Dry-run for default employee
 *   node scratch/fix_leave_balance_duplicates.mjs --all         → Dry-run for ALL employees
 *   node scratch/fix_leave_balance_duplicates.mjs --fix --all   → Apply fixes for ALL employees
 *   node scratch/fix_leave_balance_duplicates.mjs --fix --delete-id <_id>  → Delete one specific record
 *   node scratch/fix_leave_balance_duplicates.mjs --employee-id <id>       → Single employee
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/exim';
const YEAR      = new Date().getFullYear();

// Only 'privilege' is fixed — lwp records are intentionally left alone
const FIX_TYPES = new Set(['privilege']);

// ─── Colors / ANSI ────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
  bgRed:  '\x1b[41m',
  bgGreen:'\x1b[42m',
  bgBlue: '\x1b[44m',
};
const c = (color, str) => `${color}${str}${C.reset}`;

// ─── Schema ───────────────────────────────────────────────────────────────────
const leaveBalanceSchema = new mongoose.Schema({
  employee_id:     mongoose.Schema.Types.ObjectId,
  company_id:      mongoose.Schema.Types.ObjectId,
  leave_policy_id: mongoose.Schema.Types.ObjectId,
  leave_type:      String,
  year:            Number,
  opening_balance:  { type: Number, default: 0 },
  used:             { type: Number, default: 0 },
  pending_approval: { type: Number, default: 0 },
  closing_balance:  { type: Number, default: 0 },
  last_updated:     Date,
}, { timestamps: true, collection: 'leavebalances' });

const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);

// Minimal User schema — only fields we need
const userSchema = new mongoose.Schema({
  username:   String,
  first_name: String,
  last_name:  String,
}, { strict: false, collection: 'users' });

const User = mongoose.model('User', userSchema);

// Pre-built lookup map: employeeId string → display label
let usernameMap = {};

const resolveUsername = (employeeId) => {
  const key = String(employeeId);
  return usernameMap[key] || key.slice(-8);
};

// ─── Table Renderer ───────────────────────────────────────────────────────────
/**
 * Renders a simple fixed-width ASCII table.
 * @param {string[]}   headers
 * @param {string[][]} rows
 * @param {string[]}   [rowColors]  - per-row ANSI color prefix (optional)
 */
function renderTable(headers, rows, rowColors = []) {
  const allRows = [headers, ...rows];
  const colWidths = headers.map((_, ci) =>
    Math.max(...allRows.map(r => String(r[ci] ?? '').replace(/\x1b\[[0-9;]*m/g, '').length))
  );

  const pad = (str, width) => {
    const raw = String(str ?? '');
    const visible = raw.replace(/\x1b\[[0-9;]*m/g, '').length;
    return raw + ' '.repeat(Math.max(0, width - visible));
  };

  const divider = '├' + colWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';
  const top      = '┌' + colWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
  const bottom   = '└' + colWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';

  const renderRow = (row, color = '') => {
    const cells = row.map((cell, ci) => ` ${pad(cell, colWidths[ci])} `);
    return (color ? color : '') + '│' + cells.join('│') + '│' + (color ? C.reset : '');
  };

  const lines = [
    top,
    c(C.bold + C.cyan, renderRow(headers)),
    divider,
    ...rows.map((row, i) => renderRow(row, rowColors[i] || '')),
    bottom,
  ];
  return lines.join('\n');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt) ? '—' : dt.toISOString().slice(0, 10);
};

/**
 * KEEP STRATEGY for privilege duplicates:
 *
 * The erroneous auto-created records always have opening_balance === 25
 * (the default policy quota). The admin-set correct records have a
 * custom quota (e.g. 33.5, 36.5, 42, 133 …).
 *
 * Priority:
 *   1. Prefer records where opening_balance ≠ 25 (the real admin-set record).
 *   2. Among ties: highest opening_balance (largest quota wins).
 *   3. Among ties: highest `used` (most actual leave deducted → live record).
 *   4. Among ties: most recently updatedAt.
 */
const AUTO_CREATED_QUOTA = 25; // the default quota stamped on auto-created records

const pickKeeper = (records) =>
  [...records].sort((a, b) => {
    const aIsAuto = Number(a.opening_balance || 0) === AUTO_CREATED_QUOTA;
    const bIsAuto = Number(b.opening_balance || 0) === AUTO_CREATED_QUOTA;

    // Non-auto records come first
    if (aIsAuto !== bIsAuto) return aIsAuto ? 1 : -1;

    // Both auto or both non-auto → higher opening_balance wins
    const ao = Number(a.opening_balance || 0), bo = Number(b.opening_balance || 0);
    if (bo !== ao) return bo - ao;

    // Then higher used
    const au = Number(a.used || 0), bu = Number(b.used || 0);
    if (bu !== au) return bu - au;

    // Fallback: most recently updated
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  })[0];

// ─── Per-employee processor ───────────────────────────────────────────────────
async function processEmployee(employeeId, shouldFix, summaryRows, quietIfOk = false) {
  const displayName = resolveUsername(employeeId);
  const records = await LeaveBalance.find({
    employee_id: new mongoose.Types.ObjectId(employeeId),
    year: YEAR
  }).sort({ leave_type: 1, updatedAt: -1 }).lean();

  if (records.length === 0) {
    if (!quietIfOk) {
      console.log(c(C.dim, `  No records for year ${YEAR}\n`));
    }
    return { deleted: 0, updated: 0, hasIssue: false };
  }

  // Group by leave_type
  const grouped = {};
  for (const rec of records) {
    const key = String(rec.leave_type || '').toLowerCase().trim();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(rec);
  }

  let totalDeleted = 0;
  let totalUpdated = 0;
  let hasIssue = false;

  for (const [leaveType, recs] of Object.entries(grouped)) {
    if (!FIX_TYPES.has(leaveType)) {
      if (!quietIfOk) {
        console.log(c(C.dim, `  ℹ️   leave_type "${leaveType}" — ${recs.length} record(s) — skipped (not in fix scope).`));
      }
      continue;
    }

    const yearStart = new Date(`${YEAR}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${YEAR}-12-31T23:59:59.999Z`);
    const PENDING_STATUSES = [
      'pending',
      'pending_hod',
      'pending_shalini',
      'pending_final',
      'hod_approved_pending_admin',
      'in_review'
    ];

    const apps = await mongoose.connection.db.collection('leaveapplications').find({
      employee_id: new mongoose.Types.ObjectId(employeeId),
      leave_type: leaveType,
      from_date: { $lte: yearEnd },
      to_date: { $gte: yearStart }
    }).toArray();

    let verifiedUsed = 0;
    let verifiedPending = 0;
    for (const app of apps) {
      const status = String(app.approval_status || '').toLowerCase().trim();
      if (status === 'approved') {
        verifiedUsed += Number(app.total_days || 0);
      } else if (PENDING_STATUSES.includes(status)) {
        verifiedPending += Number(app.total_days || 0);
      }
    }

    const keeper = recs.length > 1 ? pickKeeper(recs) : recs[0];
    const keeperOpening = Number(keeper.opening_balance || 0);
    const verifiedClosing = Math.max(0, keeperOpening - verifiedUsed - verifiedPending);

    // Align policy_id with user's assigned active policy
    let alignedPolicyId = keeper.leave_policy_id;
    const userDoc = await User.findById(employeeId).lean();
    if (userDoc?.leave_settings?.special_leave_policies) {
      const assignedIds = userDoc.leave_settings.special_leave_policies.map(id => String(id));
      const activePrivilegePolicy = await mongoose.connection.db.collection('leavepolicies').findOne({
        _id: { $in: assignedIds.map(id => new mongoose.Types.ObjectId(id)) },
        leave_type: leaveType,
        status: 'active'
      });
      if (activePrivilegePolicy) {
        alignedPolicyId = activePrivilegePolicy._id;
      }
    }

    const isOutOfSync =
      Number(keeper.used || 0) !== verifiedUsed ||
      Number(keeper.pending_approval || 0) !== verifiedPending ||
      Number(keeper.closing_balance || 0) !== verifiedClosing ||
      String(keeper.leave_policy_id) !== String(alignedPolicyId);

    const isDuplicate = recs.length > 1;

    if (!isDuplicate && !isOutOfSync) {
      if (!quietIfOk) {
        console.log(c(C.green, `  ✅  ${leaveType}: OK (1 record, verified balance matches database)`));
      }
      continue;
    }

    hasIssue = true;

    // Print section header for this employee
    console.log(c(C.bold + C.white, `${'─'.repeat(72)}`));
    console.log(c(C.bold, `Employee: `) + c(C.cyan + C.bold, displayName) + c(C.dim, `  [${employeeId}]`));
    console.log(c(C.bold + C.white, `${'─'.repeat(72)}\n`));

    if (isDuplicate) {
      const dupes = recs.filter(r => String(r._id) !== String(keeper._id));
      const dupeIds = dupes.map(d => d._id);
      totalDeleted += dupes.length;

      console.log(c(C.yellow + C.bold, `  ⚠️  DUPLICATE & OUT-OF-SYNC — leave_type: ${leaveType} — ${recs.length} records`));

      // Build side-by-side comparison table
      const headers = ['Field', ...recs.map((r, i) => {
        const isKeeper = String(r._id) === String(keeper._id);
        return isKeeper ? c(C.green + C.bold, `KEEP [${i+1}] (PROPOSED)`) : c(C.red + C.bold, `DELETE [${i+1}]`);
      })];

      const fields = [
        ['_id',             r => String(r._id)],
        ['leave_policy_id', r => {
          const isKeeper = String(r._id) === String(keeper._id);
          if (isKeeper && String(alignedPolicyId) !== String(keeper.leave_policy_id)) {
            return `${r.leave_policy_id} -> ${c(C.yellow, alignedPolicyId)} (align)`;
          }
          return String(r.leave_policy_id);
        }],
        ['opening_balance', r => String(r.opening_balance)],
        ['used (stored)',   r => String(r.used)],
        ['used (verified)', r => {
          const isKeeper = String(r._id) === String(keeper._id);
          return isKeeper ? c(C.bold + C.yellow, verifiedUsed) : '—';
        }],
        ['pending (stored)',r => String(r.pending_approval)],
        ['pending (verify)',r => {
          const isKeeper = String(r._id) === String(keeper._id);
          return isKeeper ? c(C.bold + C.yellow, verifiedPending) : '—';
        }],
        ['closing (stored)',r => String(r.closing_balance)],
        ['closing (verify)',r => {
          const isKeeper = String(r._id) === String(keeper._id);
          return isKeeper ? c(C.bold + C.yellow, verifiedClosing) : '—';
        }],
        ['createdAt',       r => fmtDate(r.createdAt)],
        ['updatedAt',       r => fmtDate(r.updatedAt)],
      ];

      const tableRows = fields.map(([label, fn]) => [
        c(C.bold, label),
        ...recs.map((r, i) => {
          const val = fn(r);
          const isKeeper = String(r._id) === String(keeper._id);
          return isKeeper ? c(C.green, val) : c(C.red, val);
        })
      ]);

      const tbl = renderTable(headers, tableRows);
      console.log(tbl.split('\n').map(l => '  ' + l).join('\n'));
      console.log('');

      if (shouldFix) {
        // Delete duplicates
        await LeaveBalance.deleteMany({ _id: { $in: dupeIds } });

        // Update keeper
        const keeperDoc = await LeaveBalance.findById(keeper._id);
        if (keeperDoc) {
          keeperDoc.leave_policy_id = alignedPolicyId;
          keeperDoc.used = verifiedUsed;
          keeperDoc.pending_approval = verifiedPending;
          keeperDoc.closing_balance = verifiedClosing;
          keeperDoc.last_updated = new Date();
          await keeperDoc.save();
          totalUpdated++;
        }
      }

      summaryRows.push([
        c(C.cyan, displayName),
        leaveType,
        String(recs.length),
        c(C.green,  `KEEP & SYNC: ...${String(keeper._id).slice(-6)}`),
        c(C.red,    dupes.map(d => `...${String(d._id).slice(-6)}`).join(', ')),
        shouldFix ? c(C.bgGreen + C.white, ' FIXED ') : c(C.yellow, 'DRY RUN'),
      ]);

    } else {
      // Out of sync single record
      console.log(c(C.yellow + C.bold, `  ⚠️  OUT-OF-SYNC — leave_type: ${leaveType} — 1 record`));

      const headers = ['Field', 'Stored Value', 'Verified (Proposed)'];
      const tableRows = [
        [c(C.bold, '_id'),             String(keeper._id), String(keeper._id)],
        [c(C.bold, 'leave_policy_id'), String(keeper.leave_policy_id), String(alignedPolicyId) !== String(keeper.leave_policy_id) ? c(C.yellow, alignedPolicyId) : String(alignedPolicyId)],
        [c(C.bold, 'opening_balance'), String(keeper.opening_balance), String(keeper.opening_balance)],
        [c(C.bold, 'used'),            String(keeper.used),            c(C.yellow + C.bold, verifiedUsed)],
        [c(C.bold, 'pending_approval'),String(keeper.pending_approval),c(C.yellow + C.bold, verifiedPending)],
        [c(C.bold, 'closing_balance'), String(keeper.closing_balance), c(C.yellow + C.bold, verifiedClosing)],
        [c(C.bold, 'createdAt'),       fmtDate(keeper.createdAt),       fmtDate(keeper.createdAt)],
        [c(C.bold, 'updatedAt'),       fmtDate(keeper.updatedAt),       fmtDate(keeper.updatedAt)],
      ];

      const tbl = renderTable(headers, tableRows);
      console.log(tbl.split('\n').map(l => '  ' + l).join('\n'));
      console.log('');

      if (shouldFix) {
        const keeperDoc = await LeaveBalance.findById(keeper._id);
        if (keeperDoc) {
          keeperDoc.leave_policy_id = alignedPolicyId;
          keeperDoc.used = verifiedUsed;
          keeperDoc.pending_approval = verifiedPending;
          keeperDoc.closing_balance = verifiedClosing;
          keeperDoc.last_updated = new Date();
          await keeperDoc.save();
          totalUpdated++;
        }
      }

      summaryRows.push([
        c(C.cyan, displayName),
        leaveType,
        '1',
        c(C.green, `SYNC: ...${String(keeper._id).slice(-6)}`),
        '—',
        shouldFix ? c(C.bgGreen + C.white, ' SYNCED ') : c(C.yellow, 'DRY RUN'),
      ]);
    }
  }

  return { deleted: totalDeleted, updated: totalUpdated, hasIssue };
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGO_URI);
  console.log(c(C.green + C.bold, `\n✅  Connected to: ${MONGO_URI}\n`));

  const args      = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const runAll    = args.includes('--all');

  // ── Manual delete by _id ───────────────────────────────────────────────────
  const deleteIdIdx = args.indexOf('--delete-id');
  if (deleteIdIdx !== -1) {
    const targetId = args[deleteIdIdx + 1];
    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      console.error(c(C.red, '❌  --delete-id requires a valid ObjectId.\n'));
      process.exit(1);
    }
    const rec = await LeaveBalance.findById(targetId).lean();
    if (!rec) {
      console.error(c(C.red, `❌  No record found with _id=${targetId}\n`));
      process.exit(1);
    }

    console.log(c(C.yellow + C.bold, `⚠️   Record targeted for deletion:\n`));
    const tbl = renderTable(
      ['Field', 'Value'],
      [
        ['_id',             String(rec._id)],
        ['employee_id',     String(rec.employee_id)],
        ['leave_type',      String(rec.leave_type)],
        ['leave_policy_id', String(rec.leave_policy_id)],
        ['opening_balance', String(rec.opening_balance)],
        ['used',            String(rec.used)],
        ['closing_balance', String(rec.closing_balance)],
        ['updatedAt',       fmtDate(rec.updatedAt)],
      ]
    );
    console.log(tbl.split('\n').map(l => '  ' + l).join('\n'));
    console.log('');

    if (!shouldFix) {
      console.log(c(C.yellow, '🔒  DRY RUN — add --fix to actually delete.\n'));
    } else {
      await LeaveBalance.deleteOne({ _id: targetId });
      console.log(c(C.green, `✅  Deleted _id=${targetId}\n`));
    }
    await mongoose.disconnect();
    return;
  }

  // ── Global summary table (shared across all employees) ────────────────────
  const summaryRows = [];

  // ── Run for all employees ──────────────────────────────────────────────────
  if (runAll) {
    console.log(c(C.cyan + C.bold, `🔍  Scanning ALL employees for duplicate/out-of-sync privilege balances (year ${YEAR})...\n`));

    // Get all unique employee_id values who have privilege balance records
    const groups = await LeaveBalance.aggregate([
      { $match: { year: YEAR, leave_type: { $in: [...FIX_TYPES] } } },
      { $group: { _id: '$employee_id' } }
    ]);

    if (groups.length === 0) {
      console.log(c(C.green, '✅  No privilege leave balance records found for any employee.\n'));
      await mongoose.disconnect();
      return;
    }

    const employeeIds = [...new Set(groups.map(g => String(g._id)))];

    // Pre-fetch all usernames in one query
    const userDocs = await User.find(
      { _id: { $in: employeeIds.map(id => new mongoose.Types.ObjectId(id)) } },
      { _id: 1, username: 1, first_name: 1, last_name: 1 }
    ).lean();
    for (const u of userDocs) {
      const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ');
      usernameMap[String(u._id)] = fullName
        ? `${u.username} (${fullName})`
        : (u.username || String(u._id).slice(-8));
    }

    let totalDeleted = 0;
    let totalUpdated = 0;
    let employeesWithIssues = 0;

    for (const empId of employeeIds) {
      const { deleted, updated, hasIssue } = await processEmployee(empId, shouldFix, summaryRows, true);
      totalDeleted += deleted;
      totalUpdated += updated;
      if (hasIssue) {
        employeesWithIssues++;
      }
    }

    console.log(c(C.bold, `\nScan complete. Checked ${employeeIds.length} employee(s). Found issues/duplicates for ${employeesWithIssues} employee(s).\n`));

    // ── Grand summary table ────────────────────────────────────────────────
    console.log(c(C.bold + C.white, `\n${'═'.repeat(72)}`));
    console.log(c(C.bold + C.cyan, '  📊  SUMMARY'));
    console.log(c(C.bold + C.white, `${'═'.repeat(72)}\n`));

    if (summaryRows.length > 0) {
      const summaryTbl = renderTable(
        ['Emp ID (last 8)', 'Leave Type', 'Records', 'Keep / Sync Action', 'Deleted IDs', 'Status'],
        summaryRows
      );
      console.log(summaryTbl.split('\n').map(l => '  ' + l).join('\n'));
    }

    console.log('');
    if (shouldFix) {
      console.log(c(C.green + C.bold, `✅  Total: deleted ${totalDeleted} record(s), updated/fixed ${totalUpdated} keeper record(s) across all employees.\n`));
    } else {
      console.log(c(C.yellow, `🔒  DRY RUN complete. No changes made.`));
      console.log(c(C.dim,    `    Re-run with --fix --all to apply deletions and sync balances.\n`));
    }

    await mongoose.disconnect();
    return;
  }

  // ── Single employee ────────────────────────────────────────────────────────
  const empIdIdx = args.indexOf('--employee-id');
  const employeeId = empIdIdx !== -1
    ? args[empIdIdx + 1]
    : '6672a2501aa931b68b091fce';

  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    console.error(c(C.red, `❌  Invalid employee_id: ${employeeId}\n`));
    process.exit(1);
  }

  // Resolve username for single-employee mode
  const singleUser = await User.findById(employeeId, { _id: 1, username: 1, first_name: 1, last_name: 1 }).lean();
  if (singleUser) {
    const fullName = [singleUser.first_name, singleUser.last_name].filter(Boolean).join(' ');
    usernameMap[employeeId] = fullName
      ? `${singleUser.username} (${fullName})`
      : (singleUser.username || employeeId.slice(-8));
  }

  const displayName = resolveUsername(employeeId);
  console.log(c(C.bold, `📋  Leave balances for: `) + c(C.cyan + C.bold, displayName) + c(C.dim, `  [${employeeId}]`) + c(C.bold, `  (year: ${YEAR})\n`));
  
  const { deleted, updated, hasIssue } = await processEmployee(employeeId, shouldFix, summaryRows, false);

  if (summaryRows.length > 0) {
    console.log(c(C.bold, '\n📊  Summary:\n'));
    const summaryTbl = renderTable(
      ['Emp ID (last 8)', 'Leave Type', 'Records', 'Keep / Sync Action', 'Deleted IDs', 'Status'],
      summaryRows
    );
    console.log(summaryTbl.split('\n').map(l => '  ' + l).join('\n'));
    console.log('');
  }

  if (!shouldFix) {
    console.log(c(C.yellow, `🔒  DRY RUN — add --fix to apply.\n`));
  } else {
    console.log(c(C.green, `✅  Total: deleted ${deleted} record(s), updated/fixed ${updated} keeper record(s).\n`));
  }

  await mongoose.disconnect();
  console.log(c(C.green, '✅  Done.\n'));
}

main().catch(err => {
  console.error(c(C.red, `\n❌  Error: ${err.message}`));
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
