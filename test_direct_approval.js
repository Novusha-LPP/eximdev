// Configuration
const BASE_URL = 'http://localhost:9006/api';

// Users
const users = {
  user: { username: 'jeeya_inamdar', password: '12345678' },
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
  console.log('--- STARTING DIRECT ADMIN APPROVAL TEST (FETCH) ---');

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
    
    const targetBalance = balances.find(b => {
        const type = String(b.leave_type || b.leave_policy_id?.leave_type || '').toLowerCase();
        return type.includes('privilege') || type.includes('pl');
    });
    
    if (!targetBalance) {
       console.error('PL Balance not found.');
       process.exit(1);
    }
    const policyId = targetBalance.leave_policy_id?._id || targetBalance.leave_policy_id || targetBalance._id;

    // 3. Apply for Leave (Unique far future date)
    const testDate = '2026-10-14'; 
    console.log(`\nApplying for Leave on ${testDate}...`);
    const applyRes = await fetch(`${BASE_URL}/leave/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({
        leave_policy_id: policyId,
        from_date: testDate,
        to_date: testDate,
        reason: 'Direct Admin Approval Test (Fetch API)',
        total_days: 1
      })
    });
    const applyData = await applyRes.json();
    const applicationId = applyData.application_id || applyData._id || (applyData.data && applyData.data.application_id) || applyData.data?._id;
    if (!applicationId) {
        console.error('Application failed:', JSON.stringify(applyData, null, 2));
        process.exit(1);
    }
    console.log(`Application Success! ID: ${applicationId}`);

    // 4. Login as Admin
    await login(users.admin);

    // 5. Direct Admin Approve
    console.log('\nAdmin Attempting DIRECT Approval (Bypassing HOD)...');
    const adminRes = await fetch(`${BASE_URL}/hod-attendance/approve-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({
        id: applicationId,
        type: 'leave',
        status: 'approved',
        comments: 'Direct Admin Bypass Approval'
      })
    });
    const adminData = await adminRes.json();
    console.log(`Admin Status: ${adminData.message} (HTTP ${adminRes.status})`);

    if (adminData.message.includes('successfully') && adminRes.status === 200) {
        console.log('\n✅ TEST SUCCESSFUL: Admin directly approved a pending_hod request.');
    } else {
        console.log('\n❌ TEST FAILED: Admin could not bypass HOD.');
    }

  } catch (err) {
    console.error('Test Process Failed:', err.message);
  }
}

runTest();
