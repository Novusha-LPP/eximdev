/**
 * Script to set default leave balance to 24 days for all users
 * 
 * This script:
 * 1. Finds all leave balances with 0 or very low balance
 * 2. Updates them to 24 days default
 * 3. Also updates LeavePolicy annual_quota to 24 if not set
 * 
 * Run: node server/scripts/set_default_leave_balance.js
 */

import mongoose from 'mongoose';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Database connection
const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function setDefaultLeaveBalance() {
    try {
        console.log('🔌 Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const LeaveBalance = require('../routes/attendance/models/LeaveBalance');
        const LeavePolicy = require('../routes/attendance/models/LeavePolicy');

        const DEFAULT_QUOTA = 24;

        // 1. Update Leave Policies with no or low annual_quota
        console.log('📋 Updating Leave Policies...');
        const policyResult = await LeavePolicy.updateMany(
            {
                $or: [
                    { annual_quota: { $exists: false } },
                    { annual_quota: { $lt: 1 } }
                ]
            },
            {
                $set: { annual_quota: DEFAULT_QUOTA }
            }
        );
        console.log(`✅ Updated ${policyResult.modifiedCount} leave policies to ${DEFAULT_QUOTA} days\n`);

        // 2. Update existing Leave Balances with low balance
        console.log('🔄 Updating Leave Balances...');
        
        // Find all balances with closing_balance < 24
        const lowBalances = await LeaveBalance.find({
            closing_balance: { $lt: DEFAULT_QUOTA },
            leave_type: { $ne: 'unpaid' } // Don't update unpaid leave
        });

        console.log(`Found ${lowBalances.length} leave balances to update\n`);

        let updated = 0;
        for (const balance of lowBalances) {
            const difference = DEFAULT_QUOTA - balance.closing_balance;
            
            // Add the difference to opening_balance and closing_balance
            balance.opening_balance = DEFAULT_QUOTA;
            balance.closing_balance = DEFAULT_QUOTA - balance.consumed - balance.pending_approval;
            
            await balance.save();
            updated++;
            
            if (updated % 50 === 0) {
                console.log(`   Processed ${updated} balances...`);
            }
        }

        console.log(`✅ Updated ${updated} leave balances\n`);

        // 3. Summary
        console.log('📈 SUMMARY');
        console.log('═══════════════════════════════════════');
        console.log(`Leave Policies updated:   ${policyResult.modifiedCount}`);
        console.log(`Leave Balances updated:   ${updated}`);
        console.log(`Default quota set to:     ${DEFAULT_QUOTA} days`);
        console.log('═══════════════════════════════════════');
        console.log('✅ Default leave balance setup complete!\n');

        // 4. Verification
        console.log('🔍 Running verification queries...');
        const totalBalances = await LeaveBalance.countDocuments({ leave_type: { $ne: 'unpaid' } });
        const balancesWithDefault = await LeaveBalance.countDocuments({
            opening_balance: DEFAULT_QUOTA,
            leave_type: { $ne: 'unpaid' }
        });
        const totalPolicies = await LeavePolicy.countDocuments();
        const policiesWithDefault = await LeavePolicy.countDocuments({ annual_quota: DEFAULT_QUOTA });

        console.log('\n📊 VERIFICATION RESULTS');
        console.log('═══════════════════════════════════════');
        console.log('Leave Policies:');
        console.log(`  Total:                ${totalPolicies}`);
        console.log(`  With 24 days quota:   ${policiesWithDefault}`);
        console.log('Leave Balances (non-unpaid):');
        console.log(`  Total:                ${totalBalances}`);
        console.log(`  With 24 days opening: ${balancesWithDefault}`);
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('👋 Database connection closed');
        process.exit(0);
    }
}

// Run script
setDefaultLeaveBalance();
