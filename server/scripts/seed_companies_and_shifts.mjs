import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import Company from '../model/attendance/Company.js';
import Shift from '../model/attendance/Shift.js';
import User from '../model/userModel.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/exim';

const PROVIDED_COMPANIES = [
  'Suraj Forwarders Private Limited',
  'Suraj Forwarders & Shipping Agencies',
  'Suraj Forwarders',
  'EXIMBIZ Enterprise',
  'Sansar Tradelink',
  'Paramount Propack Private Limited',
  'SR Container Carriers',
  'RABS Industries India Private Limited',
  'Novusha Consulting Services India LLP',
  'Alluvium IoT Solutions Private Limited',
  'EXIM Global'
];

const defaults = {
  timezone: 'Asia/Kolkata',
  attendance_config: {
    grace_in_minutes: 15,
    grace_out_minutes: 15,
    full_day_threshold_hours: 8.5,
    half_day_threshold_hours: 4.5
  },
  settings: {
    geo_fencing_enabled: false,
    ip_restriction_enabled: false
  }
};

const generateCompanyCode = (name, usedCodes) => {
  const cleaned = (name || 'COMP').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const base = cleaned.slice(0, 6) || 'COMP';
  let candidate = base;
  let counter = 1;
  while (usedCodes.has(candidate)) {
    candidate = `${base}${String(counter).padStart(2, '0')}`;
    counter += 1;
  }
  usedCodes.add(candidate);
  return candidate;
};

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('[seed] Connected to DB');

  const userCompanies = await User.distinct('company', { company: { $exists: true, $ne: '' } });
  const companyNames = Array.from(new Set([...PROVIDED_COMPANIES, ...userCompanies])).filter(Boolean);

  const usedCodes = new Set((await Company.find({}, 'company_code')).map(c => c.company_code).filter(Boolean));
  const summary = { created: 0, updated: 0, shiftsCreated: 0, usersLinked: 0 };

  for (const name of companyNames) {
    const code = generateCompanyCode(name, usedCodes);
    const update = {
      company_name: name,
      timezone: defaults.timezone,
      attendance_config: defaults.attendance_config,
      settings: defaults.settings,
      status: 'active'
    };

    const preCompany = await Company.findOne({ company_name: name });
    const company = await Company.findOneAndUpdate(
      { company_name: name },
      {
        $setOnInsert: { ...update, company_code: code },
        $set: {
          timezone: defaults.timezone,
          'attendance_config.grace_in_minutes': defaults.attendance_config.grace_in_minutes,
          'attendance_config.full_day_threshold_hours': defaults.attendance_config.full_day_threshold_hours,
          'attendance_config.half_day_threshold_hours': defaults.attendance_config.half_day_threshold_hours,
          'settings.geo_fencing_enabled': defaults.settings.geo_fencing_enabled,
          'settings.ip_restriction_enabled': defaults.settings.ip_restriction_enabled
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    summary[preCompany ? 'updated' : 'created'] += 1;

    const preShift = await Shift.findOne({ company_id: company._id, shift_code: 'STD' });
    const shift = await Shift.findOneAndUpdate(
      { company_id: company._id, shift_code: 'STD' },
      {
        $setOnInsert: {
          company_id: company._id,
          shift_name: 'Standard Shift',
          shift_code: 'STD',
          start_time: '09:00',
          end_time: '18:00',
          full_day_hours: defaults.attendance_config.full_day_threshold_hours,
          half_day_hours: defaults.attendance_config.half_day_threshold_hours,
          grace_in_minutes: defaults.attendance_config.grace_in_minutes,
          grace_out_minutes: defaults.attendance_config.grace_out_minutes,
          weekly_off_days: [0],
          status: 'active'
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (!preShift) summary.shiftsCreated += 1;

    const userUpdate = await User.updateMany(
      { company: name, $or: [{ company_id: { $exists: false } }, { company_id: null }] },
      { $set: { company_id: company._id, shift_id: shift._id } }
    );
    summary.usersLinked += userUpdate.modifiedCount;
  }

  console.log('[seed] Completed', summary);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed', err);
  process.exit(1);
});
