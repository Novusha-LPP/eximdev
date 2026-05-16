import axios from 'axios';
import moment from 'moment-timezone';

const BASE_URL = process.env.BASE_URL || 'http://localhost:9006';
const API_URL = `${BASE_URL}/api`;

const USERS = {
  admin: {
    username: process.env.ADMIN_USERNAME || 'shalini_arun',
    passwords: [process.env.ADMIN_PASSWORD || '1234']
  },
  hod: {
    username: process.env.HOD_USERNAME || 'punit_pandey',
    passwords: [process.env.HOD_PASSWORD || '12345678', '1234']
  },
  employee: {
    username: process.env.EMP_USERNAME || 'jeeya_inamdar',
    passwords: [process.env.EMP_PASSWORD || '12345678']
  }
};

const tz = 'Asia/Kolkata';
const endDate = process.env.END_DATE || moment().tz(tz).format('YYYY-MM-DD');
const startDate = process.env.START_DATE || moment(endDate).tz(tz).startOf('month').format('YYYY-MM-DD');

function decodeJwtPayload(token) {
  const payloadBase64 = token.split('.')[1];
  if (!payloadBase64) return {};
  const payload = Buffer.from(payloadBase64, 'base64url').toString('utf8');
  return JSON.parse(payload);
}

function extractCookie(response) {
  const setCookie = response.headers['set-cookie'] || [];
  if (!setCookie.length) return { cookieHeader: '', token: '' };
  const cookieHeader = setCookie.map((c) => c.split(';')[0]).join('; ');
  const tokenCookie = setCookie.find((c) => c.startsWith('token='));
  const token = tokenCookie ? tokenCookie.split(';')[0].split('=')[1] : '';
  return { cookieHeader, token };
}

async function loginWithFallback(userConfig) {
  let lastError = null;
  for (const password of userConfig.passwords) {
    try {
      const response = await axios.post(`${API_URL}/login`, {
        username: userConfig.username,
        password
      }, {
        validateStatus: () => true,
        timeout: 25000
      });

      if (response.status !== 200) {
        lastError = new Error(`Login failed (${response.status}) for ${userConfig.username}`);
        continue;
      }

      const { cookieHeader, token } = extractCookie(response);
      if (!cookieHeader || !token) {
        lastError = new Error(`No auth cookie returned for ${userConfig.username}`);
        continue;
      }

      const tokenPayload = decodeJwtPayload(token);
      return {
        username: userConfig.username,
        passwordUsed: password,
        cookieHeader,
        token,
        tokenPayload,
        loginResponse: response.data
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Unable to login ${userConfig.username}`);
}

async function fetchJson(url, cookieHeader) {
  const response = await axios.get(url, {
    headers: { Cookie: cookieHeader },
    validateStatus: () => true,
    timeout: 90000
  });

  return {
    status: response.status,
    data: response.data
  };
}

function buildDateRange(from, to) {
  const dates = [];
  const cur = moment(from).tz(tz).startOf('day');
  const end = moment(to).tz(tz).startOf('day');
  while (cur.isSameOrBefore(end, 'day')) {
    dates.push(cur.format('YYYY-MM-DD'));
    cur.add(1, 'day');
  }
  return dates;
}

function normalizeStatus(status) {
  const s = String(status || '').toLowerCase();
  if (!s) return 'absent';
  if (s === 'weekoff') return 'weekly_off';
  return s;
}

function summarize(dateToStatus, dates) {
  const acc = {
    present: 0,
    late: 0,
    half_day: 0,
    leave: 0,
    pending_leave: 0,
    absent: 0,
    weekly_off: 0,
    holiday: 0,
    incomplete: 0,
    other: 0
  };

  for (const date of dates) {
    const s = normalizeStatus(dateToStatus.get(date));
    if (Object.prototype.hasOwnProperty.call(acc, s)) acc[s] += 1;
    else acc.other += 1;
  }

  return acc;
}

function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}

async function run() {
  console.log('=== Attendance 3-Side Consistency Check ===');
  console.log(`Range: ${startDate} -> ${endDate}`);

  const [adminAuth, hodAuth, empAuth] = await Promise.all([
    loginWithFallback(USERS.admin),
    loginWithFallback(USERS.hod),
    loginWithFallback(USERS.employee)
  ]);

  console.log(`Admin login: ${adminAuth.username} (password used: ${adminAuth.passwordUsed})`);
  console.log(`HOD login: ${hodAuth.username} (password used: ${hodAuth.passwordUsed})`);
  console.log(`Employee login: ${empAuth.username} (password used: ${empAuth.passwordUsed})`);

  const targetEmployeeId = String(empAuth.tokenPayload._id || '');
  const targetCompanyId = String(empAuth.tokenPayload.company_id || '');

  if (!targetEmployeeId || !targetCompanyId) {
    throw new Error('Unable to resolve employee id/company id from employee token payload');
  }

  const [adminReportRes, hodReportRes, employeeDashboardRes] = await Promise.all([
    fetchJson(
      `${API_URL}/attendance/admin-report?startDate=${startDate}&endDate=${endDate}&company_id=${targetCompanyId}`,
      adminAuth.cookieHeader
    ),
    fetchJson(
      `${API_URL}/attendance/team-report?startDate=${startDate}&endDate=${endDate}&teamId=all`,
      hodAuth.cookieHeader
    ),
    fetchJson(
      `${API_URL}/attendance/dashboard?month=${moment(endDate).month() + 1}&year=${moment(endDate).year()}`,
      empAuth.cookieHeader
    )
  ]);

  if (adminReportRes.status !== 200) {
    throw new Error(`Admin report failed (${adminReportRes.status}): ${pretty(adminReportRes.data)}`);
  }
  if (hodReportRes.status !== 200) {
    throw new Error(`HOD report failed (${hodReportRes.status}): ${pretty(hodReportRes.data)}`);
  }
  if (employeeDashboardRes.status !== 200) {
    throw new Error(`Employee dashboard failed (${employeeDashboardRes.status}): ${pretty(employeeDashboardRes.data)}`);
  }

  const adminRows = Array.isArray(adminReportRes.data?.data) ? adminReportRes.data.data : [];
  const hodRows = Array.isArray(hodReportRes.data?.data) ? hodReportRes.data.data : [];
  const calendarObj = employeeDashboardRes.data?.calendar || {};

  const adminRow = adminRows.find((row) => String(row.id) === targetEmployeeId);
  const hodRow = hodRows.find((row) => String(row.id) === targetEmployeeId);

  if (!adminRow) {
    throw new Error(`Employee ${targetEmployeeId} not visible in admin report`);
  }
  if (!hodRow) {
    throw new Error(`Employee ${targetEmployeeId} not visible in HOD report (team scoping or data issue)`);
  }

  const dates = buildDateRange(startDate, endDate);

  const adminDateToStatus = new Map((adminRow.history || []).map((h) => [h.date, normalizeStatus(h.status)]));
  const hodDateToStatus = new Map((hodRow.history || []).map((h) => [h.date, normalizeStatus(h.status)]));
  const empDateToStatus = new Map(
    Object.keys(calendarObj).map((date) => [date, normalizeStatus(calendarObj[date]?.status)])
  );

  const mismatches = [];
  for (const date of dates) {
    const a = adminDateToStatus.get(date) || 'absent';
    const h = hodDateToStatus.get(date) || 'absent';
    const e = empDateToStatus.get(date) || 'absent';

    if (!(a === h && h === e)) {
      mismatches.push({ date, admin: a, hod: h, employee: e });
    }
  }

  const adminSummary = summarize(adminDateToStatus, dates);
  const hodSummary = summarize(hodDateToStatus, dates);
  const empSummary = summarize(empDateToStatus, dates);

  console.log('\nEmployee under comparison:');
  console.log(`- id: ${targetEmployeeId}`);
  console.log(`- admin name: ${adminRow.name}`);
  console.log(`- hod name: ${hodRow.name}`);

  console.log('\nSummary by source (same date range):');
  console.log('Admin:', pretty(adminSummary));
  console.log('HOD:', pretty(hodSummary));
  console.log('Employee dashboard:', pretty(empSummary));

  if (mismatches.length === 0) {
    console.log('\nPASS: No date-level mismatches found across admin/hod/employee for the selected range.');
    process.exit(0);
  }

  console.log(`\nFAIL: ${mismatches.length} mismatches found.`);
  console.log(pretty(mismatches.slice(0, 50)));
  process.exit(2);
}

run().catch((error) => {
  console.error('Verification failed:', error.message || error);
  process.exit(1);
});
