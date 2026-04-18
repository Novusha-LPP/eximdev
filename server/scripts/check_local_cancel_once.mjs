import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:9006';
const USERNAME = process.env.ADMIN_USERNAME || 'manu_pillai';
const PASSWORD = process.env.ADMIN_PASSWORD || '12345678';
const TARGET_LEAVE_TYPE = String(process.env.TARGET_LEAVE_TYPE || 'privilege').toLowerCase();

const api = axios.create({ baseURL: `${BASE_URL}/api`, validateStatus: () => true, timeout: 60000 });

const makeCookieHeader = (setCookieHeader = []) =>
  setCookieHeader.map((entry) => entry.split(';')[0]).join('; ');

const withCookie = (cookie) => ({ headers: { Cookie: cookie } });

const fmtRows = (rows) => (rows || []).map((r) => ({
  leave_type: r.leave_type,
  policy: r.name,
  available: r.available,
  used: r.used,
  pending: r.pending,
  opening_balance: r.opening_balance
}));

async function main() {
  console.log(`BASE_URL=${BASE_URL}`);
  console.log(`ADMIN_USERNAME=${USERNAME}`);
  console.log(`TARGET_LEAVE_TYPE=${TARGET_LEAVE_TYPE}`);

  const loginRes = await api.post('/login', { username: USERNAME, password: PASSWORD });
  if (loginRes.status !== 200) {
    throw new Error(`Login failed: ${loginRes.status} ${JSON.stringify(loginRes.data)}`);
  }

  const cookie = makeCookieHeader(loginRes.headers['set-cookie'] || []);
  if (!cookie) throw new Error('No auth cookie from login');

  const historyRes = await api.get('/attendance/admin-leave-requests', {
    ...withCookie(cookie),
    params: { historyPage: 1, historyLimit: 200 }
  });

  if (historyRes.status !== 200) {
    throw new Error(`History fetch failed: ${historyRes.status} ${JSON.stringify(historyRes.data)}`);
  }

  const processed = historyRes.data?.data?.recentProcessedLeaves || [];
  const approved = processed.filter((r) => String(r.status || '').toLowerCase() === 'approved');

  console.log(`Processed leaves on page: ${processed.length}`);
  console.log(`Approved leaves on page: ${approved.length}`);

  if (!approved.length) {
    console.log('No approved leave found to cancel.');
    return;
  }

  const matching = approved.filter((r) => String(r.leaveType || r.leave_type || '').toLowerCase() === TARGET_LEAVE_TYPE);
  const target = matching[0] || approved[0];

  if (!matching.length) {
    console.log(`No approved '${TARGET_LEAVE_TYPE}' leave found. Falling back to first approved record.`);
  }

  const leaveId = target.id || target._id;
  const employeeId = target.employeeId || target.employee_id;

  if (!leaveId || !employeeId) {
    throw new Error(`Target row missing ids: ${JSON.stringify(target)}`);
  }

  console.log('Target leave:', {
    leaveId,
    employeeId,
    employeeName: target.employeeName,
    leaveType: target.leaveType,
    totalDays: target.totalDays,
    fromDate: target.fromDate,
    toDate: target.toDate,
    status: target.status
  });

  const balBeforeRes = await api.get('/leave/balance', {
    ...withCookie(cookie),
    params: { employee_id: employeeId }
  });

  if (balBeforeRes.status !== 200) {
    throw new Error(`Balance before failed: ${balBeforeRes.status} ${JSON.stringify(balBeforeRes.data)}`);
  }

  const beforeRows = balBeforeRes.data?.data || [];
  console.log('Balance BEFORE:', fmtRows(beforeRows));

  const cancelRes = await api.post(`/leave/cancel/${leaveId}`, {
    cancellation_reason: 'Local API verification cancel once',
    cancel_type: 'full'
  }, withCookie(cookie));

  if (cancelRes.status !== 200) {
    throw new Error(`Cancel failed: ${cancelRes.status} ${JSON.stringify(cancelRes.data)}`);
  }

  console.log('Cancel response:', cancelRes.data);

  const balAfterRes = await api.get('/leave/balance', {
    ...withCookie(cookie),
    params: { employee_id: employeeId }
  });

  if (balAfterRes.status !== 200) {
    throw new Error(`Balance after failed: ${balAfterRes.status} ${JSON.stringify(balAfterRes.data)}`);
  }

  const afterRows = balAfterRes.data?.data || [];
  console.log('Balance AFTER :', fmtRows(afterRows));

  const appsRes = await api.get('/leave/applications', {
    ...withCookie(cookie),
    params: { employee_id: employeeId, status: 'cancelled', page: 1, limit: 50 }
  });

  if (appsRes.status === 200) {
    const apps = appsRes.data?.data || [];
    const foundCancelled = apps.some((a) => String(a._id) === String(leaveId));
    console.log(`Cancelled record visible in applications: ${foundCancelled}`);
  } else {
    console.log(`Applications check skipped: status=${appsRes.status}`);
  }

  console.log('LOCAL_CHECK_OK');
}

main().catch((err) => {
  console.error('LOCAL_CHECK_FAILED');
  console.error(err.message || err);
  process.exit(1);
});
