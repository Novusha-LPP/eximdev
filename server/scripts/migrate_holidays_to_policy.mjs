/**
 * migrate_holidays_to_policy.mjs
 *
 * One-time migration: moves existing Holiday documents → HolidayPolicy per company per year.
 *
 * Usage:
 *   node server/scripts/migrate_holidays_to_policy.mjs
 *
 * What it does:
 *  1. Reads all existing Holiday documents (old collection).
 *  2. Groups them by company_id + year.
 *  3. Creates one HolidayPolicy per group (policy_name="Default {Year}").
 *  4. Maps holiday fields to the new schema (is_compulsory → !is_optional).
 *  5. Skips if a default policy for that company+year already exists.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── Models ───────────────────────────────────────────────────────────────────
import Holiday from '../model/attendance/Holiday.js';
import HolidayPolicy from '../model/attendance/HolidayPolicy.js';
import Company from '../model/attendance/Company.js';

// ── Main ─────────────────────────────────────────────────────────────────────
async function migrate() {
  await mongoose.connect(process.env.MONGO_URI || process.env.DATABASE_URL);
  console.log('✅ Connected to MongoDB');

  // Fetch all legacy holidays
  const legacyHolidays = await Holiday.find({}).lean();
  console.log(`📦 Found ${legacyHolidays.length} legacy holiday records`);

  if (legacyHolidays.length === 0) {
    console.log('Nothing to migrate. Exiting.');
    await mongoose.disconnect();
    return;
  }

  // Group by company_id + year
  const groups = {};
  for (const h of legacyHolidays) {
    const companyId = h.company_id?.toString();
    const year = h.year || new Date(h.holiday_date).getFullYear();
    const key = `${companyId}__${year}`;
    if (!groups[key]) groups[key] = { companyId, year, holidays: [] };
    groups[key].holidays.push(h);
  }

  const keys = Object.keys(groups);
  console.log(`🗂  Groups to migrate: ${keys.length}`);

  let created = 0;
  let skipped = 0;

  for (const key of keys) {
    const { companyId, year, holidays } = groups[key];

    // Verify company exists
    const company = await Company.findById(companyId);
    if (!company) {
      console.warn(`⚠️  Company ${companyId} not found – skipping group ${key}`);
      skipped++;
      continue;
    }

    const policyName = `Default ${year}`;

    // Skip if already migrated
    const existing = await HolidayPolicy.findOne({ company_id: companyId, year, policy_name: policyName });
    if (existing) {
      console.log(`⏭  Already exists: ${company.company_name} – ${year}`);
      skipped++;
      continue;
    }

    // Map holiday entries
    const entries = holidays.map(h => ({
      holiday_name: h.holiday_name,
      holiday_date: h.holiday_date,
      holiday_type: h.holiday_type || 'national',
      is_optional:  h.is_compulsory === false  // if was NOT compulsory, it's optional
    }));

    // Remove duplicate dates (keep first occurrence)
    const seen = new Set();
    const uniqueEntries = entries.filter(e => {
      const d = new Date(e.holiday_date).toISOString().split('T')[0];
      if (seen.has(d)) return false;
      seen.add(d);
      return true;
    });

    const policy = new HolidayPolicy({
      policy_name: policyName,
      company_id:  companyId,
      year,
      applicability: { branches: [], departments: [], designations: [] }, // company-wide
      holidays: uniqueEntries,
      status: 'active'
    });

    await policy.save();
    created++;
    console.log(`✅ Created policy "${policyName}" for ${company.company_name} (${year}) – ${uniqueEntries.length} holidays`);
  }

  console.log(`\n🎉 Migration complete: ${created} created, ${skipped} skipped`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
