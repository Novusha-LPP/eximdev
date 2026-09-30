// Verify the ActivityCalendar isSameDay fix.
//
// Contract under test:
//   OLD logic: in IST, one event matches MULTIPLE adjacent day cells (the reported bug).
//   NEW logic: an event matches EXACTLY ONE day cell, for every realistic
//              backend storage variant, in every viewer timezone.
//
// Run: node scratch/check_calendar_isSameDay.mjs

// Intl-based helpers: Node on Windows ignores the TZ env var, so we compute
// each instant's calendar day in the *viewer* timezone via formatToParts
// (this is exactly what getFullYear/getMonth/getDate return in that tz).

function dayKeyInTz(date, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = t => parts.find(p => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`; // YYYY-MM-DD in viewer tz
}

function utcKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

// Instant that corresponds to "midnight of Y-M-D in tz" (iterated for DST edge safety)
function midnightInTz(y, m, d, tz) {
  let t = Date.UTC(y, m, d);
  for (let i = 0; i < 3; i++) t = Date.UTC(y, m, d) - tzOffsetMs(new Date(t), tz);
  return new Date(t);
}

function tzOffsetMs(date, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const get = t => { const p = parts.find(p => p.type === t); return p ? +p.value : 0; };
  const hour = get('hour') === 24 ? 0 : get('hour');
  const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  return asIfUtc - (Math.floor(date.getTime() / 1000) * 1000) - date.getMilliseconds();
}

// --- OLD logic (pre-fix), TZ-faithful: local getters -> dayKeyInTz, UTC getters -> utcKey ---
function oldIsSameDay(a, b, tz) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = b; // cell instant: midnight in viewer tz
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return false;
  const daL = dayKeyInTz(da, tz), dbL = dayKeyInTz(db, tz);
  const daU = utcKey(da), dbU = utcKey(db);
  if (daL === dbL) return true;            // rule 1: local vs local
  if (daU === dbL) return true;            // rule 2: da UTC vs db local
  if (daL === dbU) return true;            // rule 3: da local vs db UTC
  if (daU === dbU) return true;            // rule 4: UTC vs UTC
  if (typeof a === 'string' && a.length >= 10) {
    const aPrefix = a.slice(0, 10);
    if (aPrefix === dbL || aPrefix === dbU) return true; // rule 5: string prefix
  }
  return false;
}

// --- NEW logic (post-fix): local calendar day only ---
function newIsSameDay(a, b, tz) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = b;
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return false;
  return dayKeyInTz(da, tz) === dayKeyInTz(db, tz);
}

const scenarios = [
  { tz: 'Asia/Kolkata', label: 'Viewer in IST (India) — reported bug environment' },
  { tz: 'America/New_York', label: 'Viewer in US Eastern' },
];

// Event created for Sept 23, 2026 — every realistic storage variant:
//   A: Task dueDate "2026-09-23" — Mongoose casts date-only strings to UTC midnight
//   B: Visit date stored as server-local midnight (IST server)
//   C: Activity datetime-local (no offset) parsed on a UTC server
//   D: Activity datetime-local parsed on an IST server
const storageVariants = [
  { desc: 'Task dueDate "2026-09-23" (UTC midnight)', raw: null, instant: '2026-09-23T00:00:00Z' },
  { desc: 'Visit date, server-local midnight (IST)', raw: null, instant: '2026-09-22T18:30:00Z' },
  { desc: 'Activity datetime-local, UTC server', raw: null, instant: '2026-09-23T10:00:00Z' },
  { desc: 'Activity datetime-local, IST server', raw: null, instant: '2026-09-23T04:30:00Z' },
];

let failures = 0;
for (const { tz, label } of scenarios) {
  console.log(`\n=== ${label} ===`);
  // Sept 2026 day cells like MonthView: midnight of day d in the viewer's tz
  const cells = Array.from({ length: 30 }, (_, i) => midnightInTz(2026, 8, i + 1, tz));
  for (const v of storageVariants) {
    const before = cells.filter(c => oldIsSameDay(v.instant, c, tz)).map(c => dayKeyInTz(c, tz).slice(8));
    const after = cells.filter(c => newIsSameDay(v.instant, c, tz)).map(c => dayKeyInTz(c, tz).slice(8));
    const oldDup = tz === 'Asia/Kolkata' && before.length < 2; // bug must reproduce pre-fix
    const newDup = after.length !== 1;                         // fix must render exactly one cell
    if (oldDup || newDup) failures++;
    console.log(`  ${v.desc}`);
    console.log(`    OLD -> day cell(s): [${before.join(', ')}] ${before.length > 1 ? '<-- BUG reproduced: multiple days' : ''}`);
    console.log(`    NEW -> day cell(s): [${after.join(', ')}] ${newDup ? '<-- FAIL' : 'OK (exactly one day)'}`);
  }
}

console.log(failures === 0
  ? '\nPASS: bug reproduced with OLD logic in IST; NEW logic renders every event on exactly one day in all zones.'
  : `\nFAIL: ${failures} assertion(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
