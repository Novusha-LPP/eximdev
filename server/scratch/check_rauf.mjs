import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(uri);
        const db = mongoose.connection.db;

        // Search for Rauf
        const users = await db.collection('users').find({
            $or: [
                { username: /rauf/i },
                { first_name: /rauf/i },
                { last_name: /rauf/i }
            ]
        }).toArray();

        if (users.length === 0) {
            console.log('No user found with name or username containing "rauf".');
            return;
        }

        const currentYear = new Date().getFullYear();

        for (const user of users) {
            console.log(`\n==========================================`);
            console.log(`User: ${user.first_name} ${user.last_name} (@${user.username})`);
            console.log(`ID: ${user._id}`);
            console.log(`Company ID: ${user.company_id}`);

            // 1. Get Balances
            console.log('\n--- LEAVE BALANCES (2026) ---');
            const balances = await db.collection('leavebalances').find({ employee_id: user._id, year: currentYear }).toArray();
            if (balances.length === 0) {
                console.log('No leave balances found for 2026.');
            }

            const policyIds = balances.map(b => b.leave_policy_id);
            const policies = await db.collection('leavepolicies').find({ _id: { $in: policyIds } }).toArray();
            const policyMap = new Map(policies.map(p => [String(p._id), p]));

            for (const bal of balances) {
                const policy = policyMap.get(String(bal.leave_policy_id));
                console.log(`\nType: ${bal.leave_type} | Policy: ${policy?.policy_name || 'UNKNOWN'}`);
                console.log(`Policy Quota: ${policy?.annual_quota || 'UNKNOWN'}`);
                console.log(`Opening Balance: ${bal.opening_balance}`);
                console.log(`Used (manual): ${bal.used}`);
                console.log(`Pending: ${bal.pending_approval}`);
                console.log(`Closing Balance: ${bal.closing_balance}`);
                console.log(`Last Updated: ${bal.updatedAt || bal.last_updated}`);
                
                // Check applications for this type
                const apps = await db.collection('leaveapplications').find({
                    employee_id: user._id,
                    leave_type: bal.leave_type,
                    from_date: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) },
                    approval_status: { $in: ['approved', 'pending'] }
                }).sort({ from_date: 1 }).toArray();

                console.log(`\nApps found for ${bal.leave_type}: ${apps.length}`);
                let totalApproved = 0;
                let totalPending = 0;
                for (const app of apps) {
                    console.log(`  - [${app.approval_status.toUpperCase()}] ${app.from_date?.toISOString().slice(0,10)} to ${app.to_date?.toISOString().slice(0,10)} | ${app.total_days} days | Policy: ${app.leave_policy_id}`);
                    if (app.approval_status === 'approved') totalApproved += Number(app.total_days);
                    if (app.approval_status === 'pending') totalPending += Number(app.total_days);
                }
                
                console.log(`Total Approved Apps: ${totalApproved} (matches balance used? ${totalApproved === bal.used ? '✅' : '❌'})`);
                console.log(`Total Pending Apps: ${totalPending} (matches balance pending? ${totalPending === bal.pending_approval ? '✅' : '❌'})`);
                
                const expectedClosing = Math.max(0, bal.opening_balance - totalApproved - totalPending);
                console.log(`Expected Closing if synced now: ${expectedClosing}`);
            }
        }


    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
