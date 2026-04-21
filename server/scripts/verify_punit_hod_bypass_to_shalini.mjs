import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:9006';

const users = {
  krishnapal_puvar: { username: 'krishnapal_puvar', password: '12345678' },
  shalini: { username: 'shalini_arun', password: '1234' }
};

const api = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true
});

const makeCookieHeader = (setCookieHeader = []) => {
  return setCookieHeader.map((entry) => entry.split(';')[0]).join('; ');
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
  return { headers: { Cookie: cookie } };
}

function pickLeavePolicy(balances) {
  const visible = Array.isArray(balances) ? balances : [];
  const nonLwp = visible.find((b) => String(b?.leave_type || '').toLowerCase() !== 'lwp');
  return nonLwp || visible[0] || null;
}

async function applyLeave(cookie, leavePolicyId) {
  const candidateDates = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1);

  while (candidateDates.length < 20) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      candidateDates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const candidateDate of candidateDates) {
    const payload = new FormData();
    payload.append('leave_policy_id', leavePolicyId);
    payload.append('from_date', candidateDate);
    payload.append('to_date', candidateDate);
    payload.append('reason', 'Verify HOD bypass to Shalini stage');
    payload.append('is_half_day', 'false');

    const response = await fetch(`${BASE_URL}/api/leave/apply`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: payload
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      return { applicationId: data?.application_id, date: candidateDate, raw: data };
    }

    const message = String(data?.message || '').toLowerCase();
    if (
      message.includes('overlapping leave') ||
      message.includes('already have a leave application for these dates') ||
      message.includes('already have a leave application') ||
      message.includes('invalid date range or no working days selected')
    ) {
      continue;
    }

    throw new Error(`Leave apply failed on ${candidateDate}: ${response.status} ${JSON.stringify(data)}`);
  }

  throw new Error('Could not find free date to apply leave for krishnapal_puvar');
}

async function main() {
  console.log(`BASE_URL=${BASE_URL}`);

  const krishnapal_puvar = await login(users.krishnapal_puvar);
  const shalini = await login(users.shalini);

  console.log(`Logged in krishnapal_puvar role=${krishnapal_puvar.user?.role}`);
  console.log(`Logged in shalini role=${shalini.user?.role}`);

  const krishnapal_puvarBalancesRes = await api.get('/api/leave/balance', withCookie(krishnapal_puvar.cookie));
  if (krishnapal_puvarBalancesRes.status !== 200) {
    throw new Error(`Failed to load krishnapal_puvar balances: ${krishnapal_puvarBalancesRes.status} ${JSON.stringify(krishnapal_puvarBalancesRes.data)}`);
  }

  const leavePolicy = pickLeavePolicy(krishnapal_puvarBalancesRes.data?.data || []);
  if (!leavePolicy?._id) {
    throw new Error('No leave policy found for krishnapal_puvar');
  }

  console.log(`Selected policy for krishnapal_puvar: ${leavePolicy.leave_type || leavePolicy.name || leavePolicy._id}`);

  const applied = await applyLeave(krishnapal_puvar.cookie, leavePolicy._id);
  if (!applied.applicationId) {
    throw new Error(`Applied leave missing application_id: ${JSON.stringify(applied.raw)}`);
  }

  console.log(`Applied leave id=${applied.applicationId} date=${applied.date}`);

  const krishnapal_puvarQueue = await api.get('/api/attendance/admin-leave-requests', {
    ...withCookie(krishnapal_puvar.cookie),
    params: { historyPage: 1, historyLimit: 20 }
  });
  if (krishnapal_puvarQueue.status !== 200) {
    throw new Error(`Failed to fetch krishnapal_puvar queue: ${krishnapal_puvarQueue.status}`);
  }

  const krishnapal_puvarPending = krishnapal_puvarQueue.data?.data?.pendingLeaves || [];
  const visibleInkrishnapal_puvar = krishnapal_puvarPending.find((item) => String(item.id) === String(applied.applicationId));

  const shaliniQueue = await api.get('/api/attendance/admin-leave-requests', {
    ...withCookie(shalini.cookie),
    params: { historyPage: 1, historyLimit: 20 }
  });
  if (shaliniQueue.status !== 200) {
    throw new Error(`Failed to fetch Shalini queue: ${shaliniQueue.status}`);
  }

  const shaliniPending = shaliniQueue.data?.data?.pendingLeaves || [];
  const visibleInShalini = shaliniPending.find((item) => String(item.id) === String(applied.applicationId));

  console.log(`Visible in krishnapal_puvar queue: ${!!visibleInkrishnapal_puvar}`);
  if (visibleInkrishnapal_puvar) {
    console.log(`krishnapal_puvar queue stage=${visibleInkrishnapal_puvar.approvalStage} approver=${visibleInkrishnapal_puvar.currentApproverUsername}`);
  }

  console.log(`Visible in Shalini queue: ${!!visibleInShalini}`);
  if (visibleInShalini) {
    console.log(`Shalini queue stage=${visibleInShalini.approvalStage} approver=${visibleInShalini.currentApproverUsername}`);
    console.log(`Shalini queue status=${visibleInShalini.status} label=${visibleInShalini.approvalStageLabel}`);
  }

  if (!visibleInShalini) {
    throw new Error('New krishnapal_puvar leave is not visible in Shalini queue');
  }

  if (visibleInShalini.approvalStage !== 'stage_2_shalini') {
    throw new Error(`Expected stage_2_shalini but got ${visibleInShalini.approvalStage}`);
  }

  if (String(visibleInShalini.currentApproverUsername || '').toLowerCase() !== 'shalini_arun') {
    throw new Error(`Expected current approver shalini_arun but got ${visibleInShalini.currentApproverUsername}`);
  }

  if (visibleInkrishnapal_puvar) {
    throw new Error('krishnapal_puvar still sees his own leave in pending queue');
  }

  console.log('VERIFY_OK');
}

main().catch((error) => {
  console.error('VERIFY_FAILED');
  console.error(error?.response?.data || error.message);
  process.exit(1);
});
