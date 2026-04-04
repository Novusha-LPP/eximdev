/**
 * Script to keep only Privilege and Unpaid leave types
 * Run: node server/scripts/cleanup_leave_policies.mjs
 */

import mongoose from 'mongoose';
import LeavePolicy from '../model/attendance/LeavePolicy.js';

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function cleanupLeavePolicies() {
    try {
        console.log('🔌 Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Deactivate casual, sick, earned leave types (keep privilege and unpaid)
        const result = await LeavePolicy.updateMany(
            { leave_type: { $in: ['casual', 'sick', 'earned'] } },
            { $set: { status: 'inactive' } }
        );

        console.log(`✅ Deactivated ${result.modifiedCount} leave policies (casual, sick, earned)\n`);

        // Verify remaining active policies
        const activePolicies = await LeavePolicy.find({ status: 'active' }).select('leave_type policy_name annual_quota');
        console.log('📋 Active leave policies:');
        activePolicies.forEach(p => {
            console.log(`   - ${p.policy_name} (${p.leave_type}): ${p.annual_quota} days`);
        });

        console.log('\n✅ Done! Only Privilege and Unpaid leave are now active.');

    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
        process.exit(0);
    }
}

cleanupLeavePolicies();
