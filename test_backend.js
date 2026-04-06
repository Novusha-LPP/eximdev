// Configuration
const BASE_URL = 'http://localhost:9006/api';

// Users
const users = {
  user: { username: 'jeeya_inamdar', password: '12345678' },
  hod: { username: 'punit_pandey', password: '1234' },
  admin: { username: 'uday_zope', password: '12345678' }
};

let cookies = '';

async function login(user) {
  console.log(`\nLogging in as ${user.username}...`);
  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, password: user.password })
    });
    
    // Cookie parsing
    const rawCookies = res.headers.getSetCookie(); 
    if (rawCookies && rawCookies.length > 0) {
        cookies = rawCookies.map(c => c.split(';')[0]).join('; ');
    } else {
        const legacyCookie = res.headers.get('set-cookie');
        if (legacyCookie) cookies = legacyCookie.split(';')[0];
    }
    
    const data = await res.json();
    
    if (res.status === 200 && data._id) {
        console.log(`Login successful. ID: ${data._id}, Role: ${data.role}`);
        return data;
    } else {
        throw new Error(data.message || 'Login failed');
    }
  } catch (err) {
    console.error('Login Error:', err.message);
    process.exit(1);
  }
}

async function runTest() {
  console.log('--- STARTING BACKEND E2E TEST (FETCH) ---');

  try {
    // 1. Login as User
    const userData = await login(users.user);
    const userId = userData._id;

    // 2. Get Leave Balance
    console.log('\nFetching Leave Balance...');
    const balanceRes = await fetch(`${BASE_URL}/leave/balance`, { 
      headers: { Cookie: cookies }
    });
    const balanceData = await balanceRes.json();
    const balances = balanceData.results || balanceData.data || [];
    
    // Find a paid policy
    const targetBalance = balances.find(b => {
        const type = String(b.leave_type || b.leave_policy_id?.leave_type || b.policy_name || '').toLowerCase();
        return (type.includes('casual') || type.includes('cl') || type.includes('privilege') || type.includes('pl')) && !type.includes('unpaid');
    });
    
    if (!targetBalance) {
       console.error('Paid Leave policy not found for user.');
       process.exit(1);
    }
    const policyId = targetBalance.leave_policy_id?._id || targetBalance.leave_policy_id || targetBalance._id;
    console.log(`Target Policy: ${targetBalance.leave_type || targetBalance.policy_name} (ID: ${policyId})`);

    // 3. Apply for Leave (Unique future date)
    const uniqueDate = '2029-12-01'; 
    console.log(`\nApplying for 1-day Leave on ${uniqueDate}...`);
    const applyRes = await fetch(`${BASE_URL}/leave/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({
        leave_policy_id: policyId,
        from_date: uniqueDate,
        to_date: uniqueDate,
        reason: 'Backend E2E Validation (Fetch)',
        total_days: 1
      })
    });
    const applyData = await applyRes.json();
    const applicationId = applyData._id || applyData.data?._id;
    if (!applicationId) {
        console.error('Application failed:', applyData);
        process.exit(1);
    }
    console.log(`Application Success! ID: ${applicationId}`);

    // 4. Login as HOD
    await login(users.hod);

    // 5. HOD Approve
    console.log('\nHOD Processing Request...');
    const hodRes = await fetch(`${BASE_URL}/hod-attendance/approve-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({
        id: applicationId,
        type: 'leave',
        status: 'approved',
        comments: 'HOD Approved (Fetch API)'
      })
    });
    const hodData = await hodRes.json();
    console.log(`HOD Response: ${hodData.message}`);

    // 6. Login as Admin
    await login(users.admin);

    // 7. Admin Finalize
    console.log('\nAdmin Processing Request...');
    const adminRes = await fetch(`${BASE_URL}/hod-attendance/approve-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({
        id: applicationId,
        type: 'leave',
        status: 'approved',
        comments: 'Admin Finalized (Fetch API)'
      })
    });
    const adminData = await adminRes.json();
    console.log(`Admin Response: ${adminData.message}`);

    // 8. Admin Update Balance (Opening: 140)
    console.log('\nAdmin Updating Balance to 140 (Carry-forward test)...');
    const updateRes = await fetch(`${BASE_URL}/leave/admin-update-balance/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({
        leave_policy_id: policyId,
        opening_balance: 140,
        used: 1,
        pending: 0
      })
    });
    const updateData = await updateRes.json();
    console.log(`Update Response: ${updateData.message}`);

    // 9. Verify Final
    console.log('\nVerifying Final Net Available...');
    const finalRes = await fetch(`${BASE_URL}/leave/balance?employee_id=${userId}`, { 
      headers: { Cookie: cookies }
    });
    const finalData = await finalRes.json();
    const finalBalances = finalData.results || finalData.data || [];
    const finalTarget = finalBalances.find(b => {
        const bid = (b.leave_policy_id?._id || b.leave_policy_id || b._id);
        return String(bid) === String(policyId);
    });

    console.log('\n--- FINAL RESULTS ---');
    console.log(`Policy: ${finalTarget.leave_type}`);
    console.log(`Opening: ${finalTarget.opening_balance}`);
    console.log(`Net Available (Calculated): ${finalTarget.available}`);

    if (Number(finalTarget.opening_balance) === 140) {
      console.log('\n✅ TEST SUCCESSFUL: 140 Opening Balance supported.');
    } else {
      console.log('\n❌ TEST FAILED: Result mismatch.');
    }

  } catch (err) {
    console.error('Test Process Failed:', err.message);
  }
}

runTest();
