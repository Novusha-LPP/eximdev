import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Company from '../model/attendance/Company.js';
import LeavePolicy from '../model/attendance/LeavePolicy.js';

dotenv.config({ path: 'server/.env' });

const env = process.env.NODE_ENV || 'development';
let MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

if (env === 'production') {
  MONGO_URI = process.env.PROD_MONGODB_URI;
} else if (env === 'server') {
  MONGO_URI = process.env.SERVER_MONGODB_URI;
}

async function run() {
  try {
    console.log(`Running migration in environment: "${env}"`);
    if (!MONGO_URI) {
      console.error(`Error: MongoDB URI not configured for environment: ${env}`);
      process.exit(1);
    }

    const maskedUri = MONGO_URI.replace(/:([^:@]+)@/, ':******@');
    console.log(`Connecting to MongoDB URI: ${maskedUri}`);

    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB successfully.\n');

    // Find all unique company IDs that have leave policies
    const companyIdsWithPolicies = await LeavePolicy.distinct('company_id');
    console.log(`Found ${companyIdsWithPolicies.length} unique company IDs in LeavePolicy collection.\n`);

    const companies = await Company.find({}).lean();
    const companyMap = {};
    companies.forEach(c => {
      companyMap[c._id.toString()] = c.company_name;
    });

    let deactivatedCount = 0;
    let keptCount = 0;

    for (const companyId of companyIdsWithPolicies) {
      if (!companyId) continue;
      const companyIdStr = companyId.toString();
      const companyName = companyMap[companyIdStr];

      if (!companyName) {
        // Unknown/Orphaned company - deactivate all of its policies
        console.log(`Processing unknown/orphaned company (ID: ${companyIdStr})`);
        const result = await LeavePolicy.updateMany(
          { company_id: companyId, status: { $ne: 'inactive' } },
          { $set: { status: 'inactive' } }
        );
        if (result.modifiedCount > 0) {
          console.log(`  -> Deactivated all ${result.modifiedCount} policies for unknown company.`);
          deactivatedCount += result.modifiedCount;
        }
        console.log('----------------------------------------');
        continue;
      }

      console.log(`Processing company: "${companyName}" (ID: ${companyIdStr})`);

      // Find all leave policies for this company
      const policies = await LeavePolicy.find({ company_id: companyId }).sort({ createdAt: -1 });

      const lwpPolicies = policies.filter(p => p.leave_type === 'lwp');
      const privilegePolicies = policies.filter(p => p.leave_type === 'privilege');
      const otherPolicies = policies.filter(p => p.leave_type !== 'lwp' && p.leave_type !== 'privilege');

      // Helper to process a type
      const processType = async (typePolicies, typeLabel) => {
        if (typePolicies.length === 0) {
          console.log(`  - No ${typeLabel} policies found.`);
          return;
        }

        // The first one is the latest because of sort({ createdAt: -1 })
        const latest = typePolicies[0];
        console.log(`  - Latest ${typeLabel} policy: ID: ${latest._id}, Name: "${latest.policy_name}", Status: "${latest.status}"`);

        if (latest.status !== 'active') {
          latest.status = 'active';
          await latest.save();
          console.log(`    -> Activated latest ${typeLabel} policy.`);
        }
        keptCount++;

        // Deactivate others
        for (let i = 1; i < typePolicies.length; i++) {
          const other = typePolicies[i];
          if (other.status !== 'inactive') {
            other.status = 'inactive';
            await other.save();
            console.log(`    -> Deactivated old ${typeLabel} policy: ID: ${other._id}, Name: "${other.policy_name}"`);
            deactivatedCount++;
          }
        }
      };

      // Process LWP and Privilege Leave
      await processType(lwpPolicies, 'LWP');
      await processType(privilegePolicies, 'Privilege Leave');

      // Deactivate all other leave types
      for (const other of otherPolicies) {
        if (other.status !== 'inactive') {
          other.status = 'inactive';
          await other.save();
          console.log(`  - Deactivated other policy type: ID: ${other._id}, Name: "${other.policy_name}" (Type: "${other.leave_type}")`);
          deactivatedCount++;
        }
      }
      console.log('----------------------------------------');
    }

    console.log(`\nMigration completed successfully.`);
    console.log(`Total policies kept active: ${keptCount}`);
    console.log(`Total policies deactivated: ${deactivatedCount}`);

    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

run();
