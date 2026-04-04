import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Company from '../model/attendance/Company.js';

dotenv.config();

const LEGACY_FIELDS = {
  'attendance_config.grace_in_minutes': '',
  'attendance_config.grace_out_minutes': '',
  'attendance_config.auto_checkout_enabled': '',
  'attendance_config.auto_checkout_after_hours': ''
};

async function run() {
  try {
    const uri =  process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('Missing PROD_MONGODB_URI or MONGODB_URI in environment');
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const dryRunCount = await Company.countDocuments({
      $or: [
        { 'attendance_config.grace_in_minutes': { $exists: true } },
        { 'attendance_config.grace_out_minutes': { $exists: true } },
        { 'attendance_config.auto_checkout_enabled': { $exists: true } },
        { 'attendance_config.auto_checkout_after_hours': { $exists: true } }
      ]
    });

    console.log(`Companies with legacy attendance config fields: ${dryRunCount}`);

    if (dryRunCount === 0) {
      console.log('No legacy fields found. Nothing to migrate.');
      process.exit(0);
    }

    const result = await Company.updateMany({}, { $unset: LEGACY_FIELDS });
    console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

    const remaining = await Company.countDocuments({
      $or: [
        { 'attendance_config.grace_in_minutes': { $exists: true } },
        { 'attendance_config.grace_out_minutes': { $exists: true } },
        { 'attendance_config.auto_checkout_enabled': { $exists: true } },
        { 'attendance_config.auto_checkout_after_hours': { $exists: true } }
      ]
    });

    console.log(`Remaining after migration: ${remaining}`);

    await mongoose.connection.close();
    console.log('Migration completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

run();
