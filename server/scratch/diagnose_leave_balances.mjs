import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Use the same DB as the running dev server
const uri = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to DB:', uri?.replace(/\/\/.*@/, '//***@'));

        const db = mongoose.connection.db;

        // ───── 1. Get all leave policies (to know annual_quota per policy) ─────
        const policies = await db.collection('leavepolicies').find({ status: 'active' }).toArray();
        const policyMap = new Map();
        console.log('\n========== ACTIVE LEAVE POLICIES ==========');
        for (const p of policies) {
            policyMap.set(String(p._id), p);
            console.log(`  ${p.policy_name} | Type: ${p.leave_type} | Quota: ${p.annual_quota} | ID: ${p._id} | Company: ${p.company_id}`);
            console.log(`    carry_forward.allowed: ${p.carry_forward?.allowed}, max_days: ${p.carry_forward?.max_days}`);
        }

        // ───── 2. Get ALL leave balances for current year ─────
        const currentYear = new Date().getFullYear();
        const balances = await db.collection('leavebalances').find({ year: currentYear }).toArray();

        console.log(`\n========== LEAVE BALANCES (${currentYear}) - Total: ${balances.length} ==========`);

        // ───── 3. Find anomalies: users where opening_balance != policy.annual_quota ─────
        const carryForwardUsers = [];
        const resetUsers = [];
        const normalUsers = [];
        const mismatchedPolicyUsers = [];
        const duplicateBalances = new Map(); // employee_id+leave_type -> count

        for (const bal of balances) {
            const policy = policyMap.get(String(bal.leave_policy_id));
            const policyQuota = policy?.annual_quota || 0;
            const leaveType = String(bal.leave_type || '').toLowerCase();

            // Track duplicates
            const dupeKey = `${bal.employee_id}_${leaveType}`;
            duplicateBalances.set(dupeKey, (duplicateBalances.get(dupeKey) || 0) + 1);

            // Categorize
            if (!policy) {
                mismatchedPolicyUsers.push(bal);
            } else if (leaveType === 'lwp') {
                // Skip LWP analysis
            } else if (bal.opening_balance > policyQuota) {
                carryForwardUsers.push({ ...bal, policyQuota, policyName: policy?.policy_name });
            } else if (bal.opening_balance < policyQuota) {
                resetUsers.push({ ...bal, policyQuota, policyName: policy?.policy_name });
            } else {
                normalUsers.push({ ...bal, policyQuota, policyName: policy?.policy_name });
            }
        }

        // ───── 4. Report: Carry-Forward Users (opening > quota) ─────
        console.log(`\n========== CARRY-FORWARD USERS (opening_balance > annual_quota): ${carryForwardUsers.length} ==========`);
        const employeeIds = [...new Set([...carryForwardUsers, ...resetUsers, ...normalUsers].map(b => String(b.employee_id)))];
        const users = await db.collection('users').find(
            { _id: { $in: employeeIds.map(id => new mongoose.Types.ObjectId(id)) } },
            { projection: { first_name: 1, last_name: 1, username: 1, company_id: 1, 'leave_settings.special_leave_policies': 1 } }
        ).toArray();
        const userMap = new Map(users.map(u => [String(u._id), u]));

        for (const bal of carryForwardUsers) {
            const user = userMap.get(String(bal.employee_id));
            const carryForwardAmount = bal.opening_balance - bal.policyQuota;
            const expectedClosing = bal.opening_balance - (bal.used || 0) - (bal.pending_approval || 0);
            const actualClosing = bal.closing_balance;
            const isCorrect = actualClosing === expectedClosing;

            console.log(`\n  👤 ${user?.first_name} ${user?.last_name} (@${user?.username})`);
            console.log(`     Policy: ${bal.policyName} (${bal.leave_type})`);
            console.log(`     opening_balance: ${bal.opening_balance} (quota: ${bal.policyQuota}, carry-forward: ${carryForwardAmount})`);
            console.log(`     used: ${bal.used}, pending: ${bal.pending_approval}, carried_forward field: ${bal.carried_forward || 0}`);
            console.log(`     closing_balance: ${actualClosing}  (expected: ${expectedClosing}) ${isCorrect ? '✅' : '❌ WRONG'}`);
            console.log(`     last_updated: ${bal.last_updated || bal.updatedAt}`);
        }

        // ───── 5. Report: Users with opening_balance < quota (possibly reset) ─────
        console.log(`\n========== POSSIBLY RESET USERS (opening_balance < annual_quota): ${resetUsers.length} ==========`);
        for (const bal of resetUsers) {
            const user = userMap.get(String(bal.employee_id));
            console.log(`\n  ⚠️ ${user?.first_name} ${user?.last_name} (@${user?.username})`);
            console.log(`     Policy: ${bal.policyName} (${bal.leave_type})`);
            console.log(`     opening_balance: ${bal.opening_balance} (quota: ${bal.policyQuota})`);
            console.log(`     used: ${bal.used}, pending: ${bal.pending_approval}, closing: ${bal.closing_balance}`);
        }

        // ───── 6. Report: Balance records with orphaned/mismatched policy IDs ─────
        console.log(`\n========== ORPHANED BALANCES (policy not found): ${mismatchedPolicyUsers.length} ==========`);
        for (const bal of mismatchedPolicyUsers.slice(0, 20)) {
            const user = userMap.get(String(bal.employee_id));
            console.log(`  ❓ ${user?.first_name || 'Unknown'} ${user?.last_name || ''} | policy_id: ${bal.leave_policy_id} | type: ${bal.leave_type} | opening: ${bal.opening_balance} | closing: ${bal.closing_balance}`);
        }

        // ───── 7. Report: Duplicate balances (same employee + leave_type, multiple records) ─────
        const dupes = [...duplicateBalances.entries()].filter(([, count]) => count > 1);
        console.log(`\n========== DUPLICATE BALANCE RECORDS (same employee+leave_type): ${dupes.length} ==========`);
        for (const [key, count] of dupes.slice(0, 20)) {
            const [empId, leaveType] = key.split('_');
            const user = userMap.get(empId);
            const userBalances = balances.filter(b => String(b.employee_id) === empId && String(b.leave_type).toLowerCase() === leaveType);
            console.log(`\n  🔄 ${user?.first_name || 'Unknown'} ${user?.last_name || ''} (@${user?.username || '?'}) — ${count} records for ${leaveType}:`);
            for (const b of userBalances) {
                const policy = policyMap.get(String(b.leave_policy_id));
                console.log(`     policy_id: ${b.leave_policy_id} (${policy?.policy_name || 'ORPHANED'}) | opening: ${b.opening_balance} | used: ${b.used} | closing: ${b.closing_balance} | updated: ${b.updatedAt}`);
            }
        }

        // ───── 8. Key analysis: For carry-forward users, check if closing_balance matches formula ─────
        console.log(`\n========== BALANCE INTEGRITY CHECK (carry-forward users) ==========`);
        let correctCount = 0;
        let wrongCount = 0;
        const wrongUsers = [];

        for (const bal of carryForwardUsers) {
            const expectedClosing = Math.max(0, bal.opening_balance - (bal.used || 0) - (bal.pending_approval || 0));
            if (bal.closing_balance !== expectedClosing) {
                wrongCount++;
                const user = userMap.get(String(bal.employee_id));
                wrongUsers.push({
                    name: `${user?.first_name} ${user?.last_name}`,
                    username: user?.username,
                    leaveType: bal.leave_type,
                    opening: bal.opening_balance,
                    used: bal.used,
                    pending: bal.pending_approval,
                    closing: bal.closing_balance,
                    expected: expectedClosing,
                    diff: bal.closing_balance - expectedClosing
                });
            } else {
                correctCount++;
            }
        }

        console.log(`  ✅ Correct: ${correctCount}`);
        console.log(`  ❌ Wrong:   ${wrongCount}`);

        if (wrongUsers.length > 0) {
            console.log('\n  DETAILED WRONG BALANCES:');
            for (const w of wrongUsers) {
                console.log(`    ${w.name} (@${w.username}) | ${w.leaveType}`);
                console.log(`      opening=${w.opening}, used=${w.used}, pending=${w.pending}`);
                console.log(`      closing=${w.closing}, expected=${w.expected}, DIFF=${w.diff}`);
            }
        }

        // ───── 9. Check leave applications vs balance.used for carry-forward users ─────
        console.log(`\n========== APPLICATION VS BALANCE CROSS-CHECK ==========`);
        for (const bal of carryForwardUsers.slice(0, 10)) {
            const user = userMap.get(String(bal.employee_id));
            
            // Count approved and pending applications for this policy
            const apps = await db.collection('leaveapplications').aggregate([
                {
                    $match: {
                        employee_id: bal.employee_id,
                        leave_policy_id: bal.leave_policy_id,
                        from_date: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) },
                        approval_status: { $in: ['approved', 'pending'] }
                    }
                },
                {
                    $group: {
                        _id: '$approval_status',
                        totalDays: { $sum: '$total_days' },
                        count: { $sum: 1 }
                    }
                }
            ]).toArray();

            const approvedDays = apps.find(a => a._id === 'approved')?.totalDays || 0;
            const pendingDays = apps.find(a => a._id === 'pending')?.totalDays || 0;

            const usedMatches = (bal.used || 0) === approvedDays;
            const pendingMatches = (bal.pending_approval || 0) === pendingDays;

            console.log(`\n  👤 ${user?.first_name} ${user?.last_name} (@${user?.username}) — ${bal.policyName}`);
            console.log(`     Balance record:  used=${bal.used}, pending=${bal.pending_approval}`);
            console.log(`     Applications:    approved=${approvedDays}, pending=${pendingDays}`);
            console.log(`     Used matches:    ${usedMatches ? '✅' : '❌ MISMATCH'}`);
            console.log(`     Pending matches: ${pendingMatches ? '✅' : '❌ MISMATCH'}`);

            if (!usedMatches || !pendingMatches) {
                // Show individual applications
                const allApps = await db.collection('leaveapplications').find({
                    employee_id: bal.employee_id,
                    leave_policy_id: bal.leave_policy_id,
                    from_date: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) },
                    approval_status: { $in: ['approved', 'pending'] }
                }).sort({ from_date: 1 }).toArray();

                for (const app of allApps) {
                    console.log(`       ${app.approval_status.toUpperCase()} | ${app.from_date?.toISOString().slice(0,10)} to ${app.to_date?.toISOString().slice(0,10)} | ${app.total_days} days`);
                }
            }
        }

        // ───── 10. Summary ─────
        console.log('\n========== SUMMARY ==========');
        console.log(`Total balances for ${currentYear}: ${balances.length}`);
        console.log(`Carry-forward users (opening > quota): ${carryForwardUsers.length}`);
        console.log(`Normal users (opening == quota): ${normalUsers.length}`);
        console.log(`Possibly reset (opening < quota): ${resetUsers.length}`);
        console.log(`Orphaned policies: ${mismatchedPolicyUsers.length}`);
        console.log(`Duplicate records: ${dupes.length}`);
        console.log(`Balance integrity — Correct: ${correctCount}, Wrong: ${wrongCount}`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from DB');
    }
}

run();
