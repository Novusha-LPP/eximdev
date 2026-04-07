const BASE_URL = process.env.API_URL || 'http://localhost:9006/api';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'uday_zope';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12345678';

const argCompany = process.argv.find((a) => a.startsWith('--company='));
const COMPANY_ID = process.env.COMPANY_ID || (argCompany ? argCompany.split('=')[1] : '');

let cookieHeader = '';

function normalizeRole(role) {
  return String(role || '').trim().toUpperCase();
}

function isAdminRole(role) {
  const normalized = normalizeRole(role).replace(/[^A-Z]/g, '');
  return normalized === 'ADMIN';
}

function parseCookieHeader(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    const cookies = response.headers.getSetCookie();
    if (cookies?.length) {
      return cookies.map((c) => c.split(';')[0]).join('; ');
    }
  }
  const legacy = response.headers.get('set-cookie');
  return legacy ? legacy.split(';')[0] : '';
}

async function apiPost(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {})
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function apiGet(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {})
    }
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function login() {
  const { response, data } = await apiPost('/login', {
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD
  });

  if (!response.ok) {
    throw new Error(`Login failed (${response.status}): ${data.message || 'Unknown error'}`);
  }

  cookieHeader = parseCookieHeader(response);
  if (!cookieHeader) {
    throw new Error('Login succeeded but no auth cookie was returned.');
  }

  return data;
}

function getCompaniesFromResponse(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function getUsersFromResponse(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
}

function getDashboardData(payload) {
  if (payload?.success && payload?.data) return payload.data;
  return payload?.data || payload || {};
}

function toIdSet(items, idSelector) {
  return new Set(
    items
      .map(idSelector)
      .filter(Boolean)
      .map((v) => String(v))
  );
}

function validateEmployeeList(label, items, activeSet, inactiveSet, failures) {
  const ids = items
    .map((item) => item?.employee_id || item?.employeeId || item?._id)
    .filter(Boolean)
    .map((id) => String(id));

  const notActive = ids.filter((id) => !activeSet.has(id));
  const explicitlyInactive = ids.filter((id) => inactiveSet.has(id));

  if (notActive.length > 0) {
    failures.push(`${label} contains non-active employee IDs: ${[...new Set(notActive)].join(', ')}`);
  }
  if (explicitlyInactive.length > 0) {
    failures.push(`${label} contains inactive employee IDs: ${[...new Set(explicitlyInactive)].join(', ')}`);
  }
}

async function run() {
  console.log('--- ADMIN ATTENDANCE ACTIVE-USER VALIDATION ---');
  console.log(`Base URL: ${BASE_URL}`);

  const admin = await login();
  console.log(`Logged in as ${admin.username || ADMIN_USERNAME} (${admin.role || 'UNKNOWN'})`);

  const companiesRes = await apiGet('/master/companies');
  if (!companiesRes.response.ok) {
    throw new Error(`Failed to fetch companies (${companiesRes.response.status}): ${companiesRes.data?.message || 'Unknown error'}`);
  }

  const companies = getCompaniesFromResponse(companiesRes.data);
  if (!companies.length) {
    throw new Error('No companies returned from /master/companies');
  }

  const selectedCompany = COMPANY_ID
    ? companies.find((c) => String(c._id) === String(COMPANY_ID))
    : null;

  if (COMPANY_ID && !selectedCompany) {
    throw new Error(`Provided company ID not found in /master/companies: ${COMPANY_ID}`);
  }
  const companiesToTest = selectedCompany ? [selectedCompany] : companies;
  const failures = [];

  for (const company of companiesToTest) {
    const companyId = company._id;
    const companyName = company.company_name || company.name || String(companyId);
    console.log(`\nTesting company: ${companyName} (${companyId})`);

    const [activeUsersRes, inactiveUsersRes, dashboardRes] = await Promise.all([
      apiGet(`/master/users?company_id=${companyId}&isActive=true`),
      apiGet(`/master/users?company_id=${companyId}&isActive=false`),
      apiGet(`/attendance/adminDashboard?company_id=${companyId}`)
    ]);

    if (!activeUsersRes.response.ok) {
      failures.push(`[${companyName}] Failed to fetch active users (${activeUsersRes.response.status}): ${activeUsersRes.data?.message || 'Unknown error'}`);
      continue;
    }
    if (!inactiveUsersRes.response.ok) {
      failures.push(`[${companyName}] Failed to fetch inactive users (${inactiveUsersRes.response.status}): ${inactiveUsersRes.data?.message || 'Unknown error'}`);
      continue;
    }
    if (!dashboardRes.response.ok) {
      failures.push(`[${companyName}] Failed to fetch admin dashboard (${dashboardRes.response.status}): ${dashboardRes.data?.message || 'Unknown error'}`);
      continue;
    }

    const activeUsers = getUsersFromResponse(activeUsersRes.data).filter((u) => !isAdminRole(u?.role));
    const inactiveUsers = getUsersFromResponse(inactiveUsersRes.data).filter((u) => !isAdminRole(u?.role));

    const activeSet = toIdSet(activeUsers, (u) => u?._id);
    const inactiveSet = toIdSet(inactiveUsers, (u) => u?._id);

    const dashboard = getDashboardData(dashboardRes.data);
    const stats = dashboard?.stats || {};
    const absentToday = Array.isArray(dashboard?.absentToday) ? dashboard.absentToday : [];
    const lateToday = Array.isArray(dashboard?.lateToday) ? dashboard.lateToday : [];
    const pendingLeaves = Array.isArray(dashboard?.pendingLeaves) ? dashboard.pendingLeaves : [];
    const pendingRegularization = Array.isArray(dashboard?.pendingRegularization) ? dashboard.pendingRegularization : [];

    if (Number(stats.total || 0) !== activeSet.size) {
      failures.push(`[${companyName}] stats.total mismatch: dashboard=${stats.total || 0}, expected(active non-admin)=${activeSet.size}`);
    }

    if (Number(stats.absent || 0) < 0 || Number(stats.absent || 0) > Number(stats.total || 0)) {
      failures.push(`[${companyName}] stats.absent out of range: absent=${stats.absent || 0}, total=${stats.total || 0}`);
    }

    if (Number(stats.absent || 0) <= 50 && absentToday.length !== Number(stats.absent || 0)) {
      failures.push(`[${companyName}] absent list/count mismatch: stats.absent=${stats.absent || 0}, absentToday.length=${absentToday.length}`);
    }

    if (absentToday.length > Number(stats.total || 0)) {
      failures.push(`[${companyName}] absent list exceeds total users: absentToday.length=${absentToday.length}, total=${stats.total || 0}`);
    }

    if (Number(stats.present || 0) < 0 || Number(stats.onLeave || 0) < 0 || Number(stats.late || 0) < 0) {
      failures.push(`[${companyName}] One or more stats are negative (present/onLeave/late).`);
    }

    if (Number(stats.present || 0) > Number(stats.total || 0)) {
      failures.push(`[${companyName}] stats.present exceeds total: present=${stats.present || 0}, total=${stats.total || 0}`);
    }

    if (Number(stats.onLeave || 0) > Number(stats.total || 0)) {
      failures.push(`[${companyName}] stats.onLeave exceeds total: onLeave=${stats.onLeave || 0}, total=${stats.total || 0}`);
    }

    validateEmployeeList(`[${companyName}] absentToday`, absentToday, activeSet, inactiveSet, failures);
    validateEmployeeList(`[${companyName}] lateToday`, lateToday, activeSet, inactiveSet, failures);
    validateEmployeeList(`[${companyName}] pendingLeaves`, pendingLeaves, activeSet, inactiveSet, failures);
    validateEmployeeList(`[${companyName}] pendingRegularization`, pendingRegularization, activeSet, inactiveSet, failures);

    console.log(`Summary: active=${activeSet.size}, inactive=${inactiveSet.size}, total=${stats.total || 0}, present=${stats.present || 0}, absent=${stats.absent || 0}, onLeave=${stats.onLeave || 0}, late=${stats.late || 0}`);
    console.log(`Lists: absent=${absentToday.length}, late=${lateToday.length}, pendingLeaves=${pendingLeaves.length}, pendingRegs=${pendingRegularization.length}`);
  }

  if (failures.length > 0) {
    console.error('\nFAILED CHECKS:');
    failures.forEach((failure, idx) => {
      console.error(`${idx + 1}. ${failure}`);
    });
    process.exitCode = 1;
    return;
  }

  console.log('\nPASS: Admin attendance dashboard is using active users only in tested company context(s).');
}

run().catch((error) => {
  console.error('Validation script failed:', error.message || error);
  process.exitCode = 1;
});
