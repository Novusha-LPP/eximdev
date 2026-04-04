import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import Company from '../model/attendance/Company.js';
import Shift from '../model/attendance/Shift.js';
import User from '../model/userModel.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.PROD_MONGODB_URI;

const PROVIDED_COMPANIES = [
  'Suraj Forwarders Private Limited',
  'Suraj Forwarders & Shipping Agencies',
  'Suraj Forwarders',
  'Eximbiz Enterprise',
  'Sansar Tradelink',
  'Paramount Propack Private Limited',
  'SR Container Carriers',
  'RABS Industries India Private Limited',
  'Novusha Consulting Services India LLP',
  'Alluvium IoT Solutions Private Limited',

];

const defaults = {
  timezone: 'Asia/Kolkata',
  attendance_config: {
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
  
  // Normalize company names (case-insensitive deduplication)
  const uniqueCompanyNames = new Map();
  [...PROVIDED_COMPANIES, ...userCompanies].forEach(name => {
    if (name) {
      const key = name.toLowerCase();
      if (!uniqueCompanyNames.has(key)) {
        uniqueCompanyNames.set(key, name);
      }
    }
  });
  
  const companyNames = Array.from(uniqueCompanyNames.values());

  const usedCodes = new Set((await Company.find({}, 'company_code')).map(c => c.company_code).filter(Boolean));
  const summary = { created: 0, updated: 0, shiftsCreated: 0, usersLinked: 0 };

  for (const name of companyNames) {
    const code = generateCompanyCode(name, usedCodes);
    
    // Case-insensitive lookup
    const preCompany = await Company.findOne({ company_name_lower: name.toLowerCase() });
    const company = await Company.findOneAndUpdate(
      { company_name_lower: name.toLowerCase() },
      {
        $setOnInsert: { 
          company_code: code,
          company_name: name,
          company_name_lower: name.toLowerCase()
        },
        $set: {
          timezone: defaults.timezone,
          attendance_config: defaults.attendance_config,
          settings: defaults.settings,
          status: 'active'
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
          start_time: '10:00',
          end_time: '19:00',
          full_day_hours: defaults.attendance_config.full_day_threshold_hours,
          half_day_hours: defaults.attendance_config.half_day_threshold_hours,
          weekly_off_days: [0],
          status: 'active'
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (!preShift) summary.shiftsCreated += 1;

    // Backfill user references (case-insensitive company matching)
    // Escape special regex characters in company name
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const userUpdate = await User.updateMany(
      { company: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
      { $set: { company_id: company._id } }
    );
    if (userUpdate.modifiedCount > 0) {
      console.log(`[seed] Linked ${userUpdate.modifiedCount} users to "${name}"`);
    }
    summary.usersLinked += userUpdate.modifiedCount;

    const shiftUpdate = await User.updateMany(
      {
        company: { $regex: new RegExp(`^${escapedName}$`, 'i') },
        $or: [{ shift_id: { $exists: false } }, { shift_id: null }]
      },
      { $set: { shift_id: shift._id } }
    );
    if (shiftUpdate.modifiedCount > 0) {
      console.log(`[seed] Set default shift for ${shiftUpdate.modifiedCount} users in "${name}"`);
    }
  }

  // Final check: How many users still don't have company_id?
  const unlinkedUsers = await User.find({ 
    company: { $exists: true, $ne: '' }, 
    $or: [{ company_id: { $exists: false } }, { company_id: null }] 
  }).select('username company').limit(10);
  
  if (unlinkedUsers.length > 0) {
    console.log('[seed] WARNING: Some users still unlinked:');
    unlinkedUsers.forEach(u => console.log(`  - ${u.username}: "${u.company}"`));
  }

  console.log('[seed] Completed', summary);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed', err);
  process.exit(1);
});
