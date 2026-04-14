import axios from 'axios';

const baseURL = 'http://localhost:9006/api';
const reportUrl = `${baseURL}/attendance/admin-report?startDate=2026-04-01&endDate=2026-04-14&company_id=all`;

const credentials = [
  { username: 'jeeya_inamdar', password: '12345678' },
  { username: 'punit_pandey', password: '1234' },
  { username: 'manu_pillai', password: '12345678' }
];

async function tryUser({ username, password }) {
  const loginStarted = Date.now();
  const loginResponse = await axios.post(`${baseURL}/login`, { username, password }, {
    validateStatus: () => true,
    timeout: 20000
  });

  const loginMs = Date.now() - loginStarted;
  const role = loginResponse.data?.role || loginResponse.data?.user?.role;
  console.log(`login ${username}: status=${loginResponse.status}, role=${role || 'N/A'}, ms=${loginMs}`);

  const setCookie = loginResponse.headers['set-cookie'];
  if (!setCookie || !setCookie.length) {
    console.log(`no cookie for ${username}`);
    return;
  }

  const cookieHeader = setCookie.map((c) => c.split(';')[0]).join('; ');

  const reportStarted = Date.now();
  const reportResponse = await axios.get(reportUrl, {
    headers: { Cookie: cookieHeader },
    validateStatus: () => true,
    timeout: 120000
  });
  const reportMs = Date.now() - reportStarted;

  const rows = Array.isArray(reportResponse.data?.data) ? reportResponse.data.data.length : 0;
  const message = reportResponse.data?.message || '';

  console.log(`report ${username}: status=${reportResponse.status}, rows=${rows}, ms=${reportMs}, message=${message}`);
}

async function run() {
  for (const cred of credentials) {
    try {
      await tryUser(cred);
    } catch (error) {
      console.log(`error ${cred.username}:`, error.message);
    }
  }
}

run();
