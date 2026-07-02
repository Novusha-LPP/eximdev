import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WeekOffPolicy from '../model/attendance/WeekOffPolicy.js';
import Company from '../model/attendance/Company.js';
import User from '../model/userModel.mjs';

dotenv.config({ path: 'server/.env' });

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/exim";

async function runMigration() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB successfully.\n');

    // Find companies
    const surajCompany = await Company.findOne({ company_name: /Suraj Forwarders Private Limited/i });
    const novushaCompany = await Company.findOne({ company_name: /Novusha Consulting Services/i });

    const surajCompanyId = surajCompany?._id;
    const novushaCompanyId = novushaCompany?._id;

    console.log(`Resolved Company IDs:`);
    console.log(`- Suraj Forwarders Private Limited: ${surajCompanyId}`);
    console.log(`- Novusha Consulting Services: ${novushaCompanyId}`);

    const legacyPolicies = await WeekOffPolicy.find({
      $or: [
        { company_id: null },
        { company_id: { $exists: false } }
      ]
    });

    console.log(`\nFound ${legacyPolicies.length} legacy week-off policies with missing company_id.`);

    for (const policy of legacyPolicies) {
      console.log(`Processing policy: "${policy.policy_name}" (ID: ${policy._id})`);
      let resolvedCompanyId = null;

      if (policy.policy_name.toLowerCase().includes('novusha')) {
        resolvedCompanyId = novushaCompanyId;
      }

      if (!resolvedCompanyId && policy.created_by) {
        const creator = await User.findById(policy.created_by).select('company_id').lean();
        resolvedCompanyId = creator?.company_id;
      }

      // Fallback
      if (!resolvedCompanyId) {
        resolvedCompanyId = surajCompanyId;
      }

      if (resolvedCompanyId) {
        policy.company_id = resolvedCompanyId;
        await policy.save();
        console.log(`  -> Successfully set company_id to: ${resolvedCompanyId}`);
      } else {
        console.log(`  -> Warning: Could not resolve company_id for this policy.`);
      }
    }

    console.log('\nMigration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
