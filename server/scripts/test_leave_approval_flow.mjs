import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:9006';
const loginUrl = `${BASE_URL}/api/login`;
const approveUrl = `${BASE_URL}/api/attendance/approve-request`;
const applicationsUrl = `${BASE_URL}/api/leave/applications`;
const balanceUrl = `${BASE_URL}/api/leave/balance`;
const leaveApplyUrl = `${BASE_URL}/api/leave/apply`;
const hodDashboardUrl = `${BASE_URL}/api/attendance/HODDashboard`;
const adminLeaveRequestsUrl = `${BASE_URL}/api/attendance/admin-leave-requests`;

const users = {
  jeeya: { username: 'jeeya_inamdar', password: '12345678' },
  punit: { username: 'punit_pandey', password: '1234' },
  shalini: { username: 'shalini_arun', password: '1234' },
  manu: { username: 'manu_pillai', password: '12345678' }
};

const api = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true
});

const makeCookieHeader = (setCookieHeader = []) => {
  return setCookieHeader
    .map((entry) => entry.split(';')[0])
    .join('; ');
};

async function login(user) {
  const response = await api.post('/api/login', user);
  if (response.status !== 200) {
    throw new Error(`Login failed for ${user.username}: ${response.status} ${JSON.stringify(response.data)}`);
  }

  const cookie = makeCookieHeader(response.headers['set-cookie'] || []);
  if (!cookie) {
    throw new Error(`No auth cookie returned for ${user.username}`);
  }

  return { user: response.data, cookie };
}

function withCookie(cookie) {
  return {
    headers: { Cookie: cookie }
  };
}

function pickLeavePolicy(balances) {
  const visible = Array.isArray(balances) ? balances : [];
  const nonLwp = visible.find((b) => String(b?.leave_type || '').toLowerCase() !== 'lwp');
  return nonLwp || visible[0] || null;
}

async function fetchQueueForActor(cookie, roleLabel) {
  const adminResponse = await api.get('/api/attendance/admin-leave-requests', {
    ...withCookie(cookie),
    params: { historyPage: 1, historyLimit: 20 }
  });

  if (adminResponse.status === 200) {
    return { source: 'admin', items: adminResponse.data?.data?.pendingLeaves || [] };
  }

  const hodResponse = await api.get('/api/attendance/HODDashboard', withCookie(cookie));
  if (hodResponse.status !== 200) {
    throw new Error(`${roleLabel} queue fetch failed: admin=${adminResponse.status} hod=${hodResponse.status}`);
  }

  return { source: 'hod', items: hodResponse.data?.data?.pendingLeaves || [] };
}

async function approve(cookie, id, status, comments = '') {
  const response = await api.post('/api/attendance/approve-request', {
    type: 'leave',
    id,
    status,
    comments
  }, withCookie(cookie));

  if (response.status !== 200) {
    throw new Error(`Approval failed for ${id}: ${response.status} ${JSON.stringify(response.data)}`);
  }

  return response.data;
}

async function main() {
  console.log(`BASE_URL=${BASE_URL}`);

  const jeeya = await login(users.jeeya);
  const punit = await login(users.punit);
  const shalini = await login(users.shalini);
  const manu = await login(users.manu);

  console.log(`Logged in: jeeya=${jeeya.user.username} role=${jeeya.user.role} company=${jeeya.user.company || 'n/a'}`);
  console.log(`Logged in: punit=${punit.user.username} role=${punit.user.role} company=${punit.user.company || 'n/a'}`);
  console.log(`Logged in: shalini=${shalini.user.username} role=${shalini.user.role} company=${shalini.user.company || 'n/a'}`);
  console.log(`Logged in: manu=${manu.user.username} role=${manu.user.role} company=${manu.user.company || 'n/a'}`);

  const balanceRes = await api.get('/api/leave/balance', withCookie(jeeya.cookie));
  if (balanceRes.status !== 200) {
    throw new Error(`Failed to load balances: ${balanceRes.status} ${JSON.stringify(balanceRes.data)}`);
  }

  const balances = balanceRes.data?.data || [];
  const leavePolicy = pickLeavePolicy(balances);
  if (!leavePolicy) {
    throw new Error('No leave policy found for jeeya_inamdar');
  }

  console.log(`Selected policy: ${leavePolicy.name || leavePolicy.leave_type || leavePolicy._id}`);
  console.log(`Policy type: ${leavePolicy.leave_type}`);

  const candidateDates = ['2026-04-22', '2026-04-23', '2026-04-24', '2026-04-27', '2026-04-28'];
  const leaveTypeLabel = String(leavePolicy.leave_type || '').toLowerCase();
  let applyData = null;
  let applicationDate = null;

  for (const candidateDate of candidateDates) {
    const applicationPayload = new FormData();
    applicationPayload.append('leave_policy_id', leavePolicy._id);
    applicationPayload.append('from_date', candidateDate);
    applicationPayload.append('to_date', candidateDate);
    applicationPayload.append('reason', 'Automated leave approval flow test');
    applicationPayload.append('is_half_day', 'false');

    const applyResponse = await fetch(`${BASE_URL}/api/leave/apply`, {
      method: 'POST',
      headers: {
        Cookie: jeeya.cookie
      },
      body: applicationPayload
    });
    const nextApplyData = await applyResponse.json().catch(() => ({}));

    if (applyResponse.ok) {
      applyData = nextApplyData;
      applicationDate = candidateDate;
      break;
    }

    if (!String(nextApplyData?.message || '').toLowerCase().includes('overlapping leave')) {
      throw new Error(`Apply failed: ${applyResponse.status} ${JSON.stringify(nextApplyData)}`);
    }
  }

  if (!applyData || !applicationDate) {
    throw new Error('Could not find a free future date to apply leave');
  }

  const applicationId = applyData?.application_id;
  if (!applicationId) {
    throw new Error(`Apply succeeded without application_id: ${JSON.stringify(applyData)}`);
  }

  console.log(`Applied leave request ${applicationId} (${leaveTypeLabel}) for ${applicationDate}`);

  const punitQueueBefore = await fetchQueueForActor(punit.cookie, 'punit_pandey');
  const punitVisibleBefore = punitQueueBefore.items.some((item) => String(item.id) === String(applicationId));
  console.log(`punit_pandey queue source=${punitQueueBefore.source}, visible=${punitVisibleBefore}`);

  if (!punitVisibleBefore) {
    throw new Error('Leave request not visible to punit_pandey before approval');
  }

  await approve(punit.cookie, applicationId, 'approved', 'Approved by punit_pandey');
  console.log('punit_pandey approved the request');

  const punitApps = await api.get('/api/leave/applications', withCookie(jeeya.cookie));
  const afterPunit = (punitApps.data?.data || []).find((app) => String(app._id) === String(applicationId));
  console.log('Status after punit approval:', afterPunit?.status || afterPunit?.approval_status || 'unknown');

  const shaliniQueueBefore = await fetchQueueForActor(shalini.cookie, 'shalini_arun');
  const shaliniVisibleBefore = shaliniQueueBefore.items.some((item) => String(item.id) === String(applicationId));
  console.log(`shalini_arun queue source=${shaliniQueueBefore.source}, visible=${shaliniVisibleBefore}`);

  if (!shaliniVisibleBefore) {
    throw new Error('Leave request not visible to shalini_arun after HOD approval');
  }

  await approve(shalini.cookie, applicationId, 'approved', 'Approved by shalini_arun');
  console.log('shalini_arun approved the request');

  const manuQueueBefore = await fetchQueueForActor(manu.cookie, 'manu_pillai');
  const manuVisibleBefore = manuQueueBefore.items.some((item) => String(item.id) === String(applicationId));
  console.log(`manu_pillai queue source=${manuQueueBefore.source}, visible=${manuVisibleBefore}`);

  if (!manuVisibleBefore) {
    throw new Error('Leave request not visible to manu_pillai before final approval');
  }

  await approve(manu.cookie, applicationId, 'approved', 'Final approval by manu_pillai');
  console.log('manu_pillai approved the request');

  const applicationsRes = await api.get('/api/leave/applications', withCookie(jeeya.cookie));
  if (applicationsRes.status !== 200) {
    throw new Error(`Failed to fetch applications after approval: ${applicationsRes.status} ${JSON.stringify(applicationsRes.data)}`);
  }

  const finalRecord = (applicationsRes.data?.data || []).find((app) => String(app._id) === String(applicationId));
  console.log('Final application status:', finalRecord?.status || finalRecord?.approval_status || 'unknown');

  if (!finalRecord || (finalRecord.status !== 'approved' && finalRecord.approval_status !== 'approved')) {
    throw new Error('Final leave status is not approved for requester');
  }

  console.log('FLOW_OK');
}

main().catch((error) => {
  console.error('FLOW_FAILED');
  console.error(error?.response?.data || error.message || error);
  process.exit(1);
});
