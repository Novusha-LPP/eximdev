import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs/promises';

import AttendanceRecord from '../model/attendance/AttendanceRecord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const getArg = (name) => {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : '';
};

const recordId = getArg('recordId');
const token = getArg('token');
const payloadArg = getArg('payload');
const payloadFile = getArg('payloadFile');
const username = getArg('username');
const password = getArg('password');
const baseUrl = getArg('baseUrl') || 'http://localhost:9006';
const mongoUri = process.env.DEV_MONGODB_URI;

if (!recordId) {
  console.error('Missing --recordId');
  process.exit(1);
}

if (!token && !(username && password)) {
  console.error('Missing --token or --username/--password');
  process.exit(1);
}

if (!payloadArg && !payloadFile) {
  console.error('Missing --payload or --payloadFile');
  process.exit(1);
}

if (!mongoUri) {
  console.error('Missing DEV_MONGODB_URI in server/.env');
  process.exit(1);
}

const payloadSource = payloadFile
  ? await fs.readFile(path.resolve(process.cwd(), payloadFile), 'utf8')
  : payloadArg;
const payload = JSON.parse(payloadSource);

const printRecord = (label, record) => {
  if (!record) {
    console.log(`${label}: record not found`);
    return;
  }

  const view = {
    _id: String(record._id),
    status: record.status,
    is_half_day: record.is_half_day,
    half_day_session: record.half_day_session,
    has_incomplete_session: record.has_incomplete_session,
    missed_punch: record.missed_punch,
    missed_punch_reason: record.missed_punch_reason,
    missed_punch_source: record.missed_punch_source,
    total_punches: record.total_punches,
    total_work_hours: record.total_work_hours,
    first_in: record.first_in,
    last_out: record.last_out,
    processed_by: record.processed_by,
    processed_at: record.processed_at,
    updatedAt: record.updatedAt
  };

  console.log(`\n${label}`);
  console.log(JSON.stringify(view, null, 2));
};

try {
  await mongoose.connect(mongoUri);

  const before = await AttendanceRecord.findById(recordId).lean();
  printRecord('Before API update', before);

  let cookieToken = token;
  if (!cookieToken) {
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const rawCookie = loginResponse.headers.get('set-cookie') || '';
    const tokenMatch = rawCookie.match(/token=([^;]+)/);
    cookieToken = tokenMatch?.[1] || '';

    console.log('\nLogin response');
    console.log(JSON.stringify({
      status: loginResponse.status,
      ok: loginResponse.ok,
      hasCookie: Boolean(cookieToken)
    }, null, 2));
  }

  if (!cookieToken) {
    throw new Error('Unable to obtain login token');
  }

  const response = await fetch(`${baseUrl}/api/attendance/${recordId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `token=${cookieToken}`
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  console.log('\nAPI response');
  console.log(JSON.stringify(result, null, 2));

  const after = await AttendanceRecord.findById(recordId).lean();
  printRecord('After API update', after);
} catch (error) {
  console.error('Verification script failed:', error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
