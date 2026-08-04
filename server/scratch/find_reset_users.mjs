import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(uri);
        const db = mongoose.connection.db;

        console.log('--- Searching for Carry Forward Discrepancies (2025 vs 2026) ---');

        // Get all 2025 balances
        const balances2025 = await db.collection('leavebalances').find({ year: 2025 }).toArray();
        console.log(`Found ${balances2025.length} balances for 2025.`);

        if (balances2025.length === 0) {
            console.log('No 2025 data available to calculate original carry-forwards.');
            // Let's try another approach: check activitylogs for the "MIGRATE_EMPLOYEE" or similar actions?
        } else {
            // Compare 2025 closing with 2026 opening
            // ...
        }

        // Alternative approach: Find users whose balance createdAt is mid-year (e.g. after Jan 31, 2026)
        // BUT who have leave applications from BEFORE their balance createdAt date!
        console.log('\n--- Searching for Balances Recreated Mid-Year ---');
        
        const currentYear = new Date().getFullYear();
        const balances2026 = await db.collection('leavebalances').find({ 
            year: currentYear,
            leave_type: 'privilege'
        }).toArray();

        const policies = await db.collection('leavepolicies').find({ status: 'active' }).toArray();
        const policyMap = new Map(policies.map(p => [String(p._id), p]));

        const deletedUsers = [];

        for (const bal of balances2026) {
            const policy = policyMap.get(String(bal.leave_policy_id));
            if (!policy) continue;

            // If opening_balance exactly equals policy.annual_quota, it MIGHT have been reset
            if (bal.opening_balance === policy.annual_quota) {
                const balCreated = new Date(bal.createdAt);
                
                // Only look at balances created after Jan 31, 2026 (likely recreated mid-year)
                if (balCreated > new Date(`${currentYear}-01-31`)) {
                    
                    // Did they have approved leaves BEFORE this balance was created?
                    const priorApps = await db.collection('leaveapplications').find({
                        employee_id: bal.employee_id,
                        leave_type: bal.leave_type,
                        approval_status: 'approved',
                        createdAt: { $lt: balCreated }
                    }).toArray();

                    if (priorApps.length > 0) {
                        const user = await db.collection('users').findOne({ _id: bal.employee_id });
                        deletedUsers.push({
                            name: `${user?.first_name} ${user?.last_name}`,
                            username: user?.username,
                            recreatedDate: balCreated,
                            priorAppsCount: priorApps.length
                        });
                    }
                }
            }
        }

        console.log(`Found ${deletedUsers.length} users whose balance was likely recreated mid-year, wiping potential carry-forward:`);
        for (const u of deletedUsers) {
            console.log(`  👤 ${u.name} (@${u.username}) - Balance recreated on: ${u.recreatedDate.toISOString().slice(0,10)}`);
        }

        // What about the specific deleted amounts?
        // Let's check the `serverlogs` or `activitylogs` to see if there is a record of the deletion
        console.log('\n--- Searching for Deletion Logs ---');
        const deleteLogs = await db.collection('activitylogs').find({
            action: /bulk.*assign/i
        }).toArray();
        
        console.log(`Found ${deleteLogs.length} bulk assignment logs (which trigger deletion)`);
        for (const log of deleteLogs) {
            console.log(`  [${log.createdAt}] ${log.details}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
