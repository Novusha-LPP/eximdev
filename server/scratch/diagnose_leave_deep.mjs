import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to DB');
        const db = mongoose.connection.db;
        const currentYear = new Date().getFullYear();

        // ── 1. Users with used mismatch (balance.used != sum of approved apps) ──
        console.log('\n========== USERS WITH USED/PENDING MISMATCH ==========');
        
        const balances = await db.collection('leavebalances').find({ 
            year: currentYear,
            leave_type: { $ne: 'lwp' }
        }).toArray();

        const policies = await db.collection('leavepolicies').find({ status: 'active' }).toArray();
        const policyMap = new Map(policies.map(p => [String(p._id), p]));

        const mismatchUsers = [];

        for (const bal of balances) {
            const policy = policyMap.get(String(bal.leave_policy_id));
            if (!policy) continue;

            const leaveType = String(bal.leave_type || '').toLowerCase();

            // Replicate EXACTLY what syncBalanceFromApplications does
            const yearStart = new Date(`${currentYear}-01-01T00:00:00.000Z`);
            const yearEnd = new Date(`${currentYear}-12-31T23:59:59.999Z`);
            
            const matchQuery = {
                employee_id: bal.employee_id,
                approval_status: { $in: ['pending', 'approved'] },
                from_date: { $lte: yearEnd },
                to_date: { $gte: yearStart },
                $or: [{ leave_policy_id: bal.leave_policy_id }]
            };

            // Idempotent types include leave_type match too
            if (['lwp', 'privilege'].includes(leaveType)) {
                matchQuery.$or.push({ leave_type: leaveType });
            }

            const usage = await db.collection('leaveapplications').aggregate([
                { $match: matchQuery },
                { $group: { _id: '$approval_status', total: { $sum: '$total_days' }, count: { $sum: 1 } } }
            ]).toArray();

            const approvedFromApps = usage.find(u => u._id === 'approved')?.total || 0;
            const pendingFromApps = usage.find(u => u._id === 'pending')?.total || 0;
            const approvedCount = usage.find(u => u._id === 'approved')?.count || 0;
            const pendingCount = usage.find(u => u._id === 'pending')?.count || 0;

            const balUsed = Number(bal.used || 0);
            const balPending = Number(bal.pending_approval || 0);

            if (balUsed !== approvedFromApps || balPending !== pendingFromApps) {
                const user = await db.collection('users').findOne(
                    { _id: bal.employee_id },
                    { projection: { first_name: 1, last_name: 1, username: 1 } }
                );

                mismatchUsers.push({
                    name: `${user?.first_name} ${user?.last_name}`,
                    username: user?.username,
                    leaveType: bal.leave_type,
                    policyName: policy?.policy_name,
                    opening: bal.opening_balance,
                    balUsed,
                    appApproved: approvedFromApps,
                    approvedCount,
                    balPending,
                    appPending: pendingFromApps,
                    pendingCount,
                    closing: bal.closing_balance,
                    expectedClosing: Math.max(0, bal.opening_balance - approvedFromApps - pendingFromApps),
                    policyQuota: policy?.annual_quota,
                    isCarryForward: bal.opening_balance > (policy?.annual_quota || 0)
                });
            }
        }

        console.log(`Found ${mismatchUsers.length} users with mismatches\n`);

        // Separate into carry-forward vs normal
        const cfMismatches = mismatchUsers.filter(u => u.isCarryForward);
        const normalMismatches = mismatchUsers.filter(u => !u.isCarryForward);

        console.log(`--- CARRY-FORWARD users with mismatch: ${cfMismatches.length} ---`);
        for (const u of cfMismatches) {
            console.log(`\n  👤 ${u.name} (@${u.username}) — ${u.policyName} (${u.leaveType})`);
            console.log(`     Opening: ${u.opening} (quota: ${u.policyQuota}, CF: ${u.opening - u.policyQuota})`);
            console.log(`     Balance.used=${u.balUsed} vs Apps.approved=${u.appApproved} (${u.approvedCount} apps) ${u.balUsed === u.appApproved ? '✅' : '❌'}`);
            console.log(`     Balance.pending=${u.balPending} vs Apps.pending=${u.appPending} (${u.pendingCount} apps) ${u.balPending === u.appPending ? '✅' : '❌'}`);
            console.log(`     Current closing: ${u.closing}, Should be: ${u.expectedClosing} ${u.closing === u.expectedClosing ? '✅' : '❌'}`);
        }

        console.log(`\n--- NORMAL users with mismatch: ${normalMismatches.length} ---`);
        for (const u of normalMismatches) {
            console.log(`\n  👤 ${u.name} (@${u.username}) — ${u.policyName} (${u.leaveType})`);
            console.log(`     Opening: ${u.opening} (quota: ${u.policyQuota})`);
            console.log(`     Balance.used=${u.balUsed} vs Apps.approved=${u.appApproved} (${u.approvedCount} apps) ${u.balUsed === u.appApproved ? '✅' : '❌'}`);
            console.log(`     Balance.pending=${u.balPending} vs Apps.pending=${u.appPending} (${u.pendingCount} apps) ${u.balPending === u.appPending ? '✅' : '❌'}`);
            console.log(`     Current closing: ${u.closing}, Should be: ${u.expectedClosing} ${u.closing === u.expectedClosing ? '✅' : '❌'}`);
        }

        // ── 2. Check for leaves that match by leave_type but different policy_id ──
        console.log('\n\n========== CROSS-POLICY LEAVE APPLICATIONS (privilege type) ==========');
        console.log('(Applications where leave_type=privilege but policy_id differs from balance policy_id)\n');

        const privilegePolicies = policies.filter(p => p.leave_type === 'privilege');
        console.log(`Active privilege policies: ${privilegePolicies.length}`);
        for (const p of privilegePolicies) {
            console.log(`  Policy: ${p.policy_name} | ID: ${p._id} | Quota: ${p.annual_quota} | Company: ${p.company_id}`);
        }

        // For carry-forward users, check if any of their leave applications have a DIFFERENT policy_id
        for (const u of cfMismatches.slice(0, 10)) {
            const user = await db.collection('users').findOne({ username: u.username });
            if (!user) continue;

            const allPrivilegeApps = await db.collection('leaveapplications').find({
                employee_id: user._id,
                $or: [
                    { leave_type: 'privilege' },
                    { leave_policy_id: { $in: privilegePolicies.map(p => p._id) } }
                ],
                from_date: { $gte: new Date(`${currentYear}-01-01`) },
                approval_status: { $in: ['approved', 'pending'] }
            }).sort({ from_date: 1 }).toArray();

            if (allPrivilegeApps.length > 0) {
                console.log(`\n  ${u.name} (@${u.username}) — ${allPrivilegeApps.length} privilege apps:`);
                for (const app of allPrivilegeApps) {
                    const matchesBalancePolicy = cfMismatches.some(m => 
                        m.username === u.username && String(app.leave_policy_id) === String(policyMap.get(String(app.leave_policy_id))?._id)
                    );
                    console.log(`    ${app.approval_status} | ${app.from_date?.toISOString().slice(0,10)} to ${app.to_date?.toISOString().slice(0,10)} | ${app.total_days}d | policy_id: ${app.leave_policy_id} | type: ${app.leave_type}`);
                }
            }
        }

        // ── 3. Simulate what syncBalanceFromApplications would do for ALL carry-forward users ──
        console.log('\n\n========== SYNC SIMULATION FOR ALL CARRY-FORWARD USERS ==========');
        console.log('(What would happen if syncBalanceFromApplications ran right now)\n');

        const cfBalances = balances.filter(b => {
            const p = policyMap.get(String(b.leave_policy_id));
            return p && b.opening_balance > (p?.annual_quota || 0) && String(b.leave_type).toLowerCase() !== 'lwp';
        });

        let wouldChange = 0;
        let wouldStay = 0;

        for (const bal of cfBalances) {
            const leaveType = String(bal.leave_type || '').toLowerCase();
            const yearStart = new Date(`${currentYear}-01-01T00:00:00.000Z`);
            const yearEnd = new Date(`${currentYear}-12-31T23:59:59.999Z`);

            const matchQuery = {
                employee_id: bal.employee_id,
                approval_status: { $in: ['pending', 'approved'] },
                from_date: { $lte: yearEnd },
                to_date: { $gte: yearStart },
                $or: [{ leave_policy_id: bal.leave_policy_id }]
            };

            if (['lwp', 'privilege'].includes(leaveType)) {
                matchQuery.$or.push({ leave_type: leaveType });
            }

            const usage = await db.collection('leaveapplications').aggregate([
                { $match: matchQuery },
                { $group: { _id: '$approval_status', total: { $sum: '$total_days' } } }
            ]).toArray();

            const approvedFromApps = usage.find(u => u._id === 'approved')?.total || 0;
            const pendingFromApps = usage.find(u => u._id === 'pending')?.total || 0;

            // syncBalanceFromApplications formula:
            const newUsed = approvedFromApps;
            const newPending = pendingFromApps;
            const newClosing = Math.max(0, bal.opening_balance - newUsed - newPending);

            if (
                Number(bal.used || 0) !== newUsed ||
                Number(bal.pending_approval || 0) !== newPending ||
                Number(bal.closing_balance || 0) !== newClosing
            ) {
                wouldChange++;
                const user = await db.collection('users').findOne(
                    { _id: bal.employee_id },
                    { projection: { first_name: 1, last_name: 1, username: 1 } }
                );
                const policy = policyMap.get(String(bal.leave_policy_id));
                console.log(`  ⚡ ${user?.first_name} ${user?.last_name} (@${user?.username}) — ${policy?.policy_name}`);
                console.log(`     BEFORE: used=${bal.used}, pending=${bal.pending_approval}, closing=${bal.closing_balance}`);
                console.log(`     AFTER:  used=${newUsed}, pending=${newPending}, closing=${newClosing}`);
                console.log(`     opening stays: ${bal.opening_balance}`);
            } else {
                wouldStay++;
            }
        }

        console.log(`\nWould change: ${wouldChange}`);
        console.log(`Would stay same: ${wouldStay}`);

        // ── 4. Check audit trail / updatedAt for recent balance changes ──
        console.log('\n\n========== RECENTLY MODIFIED CARRY-FORWARD BALANCES (last 7 days) ==========');
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const recentlyModified = cfBalances.filter(b => {
            const updated = new Date(b.updatedAt || b.last_updated);
            return updated > sevenDaysAgo;
        }).sort((a, b) => new Date(b.updatedAt || b.last_updated) - new Date(a.updatedAt || a.last_updated));

        for (const bal of recentlyModified.slice(0, 15)) {
            const user = await db.collection('users').findOne(
                { _id: bal.employee_id },
                { projection: { first_name: 1, last_name: 1, username: 1 } }
            );
            const policy = policyMap.get(String(bal.leave_policy_id));
            console.log(`  ${user?.first_name} ${user?.last_name} (@${user?.username}) — ${policy?.policy_name}`);
            console.log(`     opening: ${bal.opening_balance}, used: ${bal.used}, pending: ${bal.pending_approval}, closing: ${bal.closing_balance}`);
            console.log(`     updated: ${bal.updatedAt || bal.last_updated}`);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from DB');
    }
}

run();
