const BASE_URL = process.env.API_BASE_URL || 'http://localhost:9006/api';

function getArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}

const USERNAME = getArg('username') || process.env.TEST_USERNAME || 'manu_pillai';
const PASSWORD = getArg('password') || process.env.TEST_PASSWORD || '12345678';
const COMPANY_ID_ARG = getArg('companyId') || process.env.TEST_COMPANY_ID || '';
const PAGE = Number(getArg('page') || process.env.TEST_PAGE || 1);
const LIMIT = Number(getArg('limit') || process.env.TEST_LIMIT || 10);

let cookieHeader = '';

function parseCookieHeader(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    const cookies = response.headers.getSetCookie();
    if (cookies?.length) {
      return cookies.map((c) => c.split(';')[0]).join('; ');
    }
  }

  const setCookie = response.headers.get('set-cookie');
  return setCookie ? setCookie.split(';')[0] : '';
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

async function apiGet(path, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  const url = queryString ? `${BASE_URL}${path}?${queryString}` : `${BASE_URL}${path}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {})
    }
  });

  const data = await response.json().catch(() => ({}));
  return { response, data, url };
}

function getShiftName(shift) {
  return String(shift?.shift_name || shift?.name || '').trim();
}

function isStandardShift(shift) {
  const normalized = getShiftName(shift).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return normalized === 'standard shift';
}

function summarizeShifts(items) {
  const shifts = Array.isArray(items) ? items : [];
  const standard = shifts.filter(isStandardShift);
  const nonStandard = shifts.filter((s) => !isStandardShift(s));

  return {
    total: shifts.length,
    standardCount: standard.length,
    nonStandardCount: nonStandard.length,
    nonStandardNames: nonStandard.map(getShiftName),
    sample: shifts.slice(0, 5).map((s) => ({
      id: s?._id,
      company_id: s?.company_id?._id || s?.company_id || '',
      shift_code: s?.shift_code || '',
      shift_name: getShiftName(s)
    }))
  };
}

async function run() {
  console.log('--- SHIFT POLICY API TEST ---');
  console.log('Base URL:', BASE_URL);

  const loginResult = await apiPost('/login', {
    username: USERNAME,
    password: PASSWORD
  });

  if (!loginResult.response.ok) {
    throw new Error(`Login failed (${loginResult.response.status}): ${loginResult.data?.message || 'Unknown error'}`);
  }

  cookieHeader = parseCookieHeader(loginResult.response);
  if (!cookieHeader) {
    throw new Error('Login succeeded, but no auth cookie was returned.');
  }

  const loginUser = loginResult.data || {};
  const companyId = COMPANY_ID_ARG || loginUser.company_id || '';

  console.log('Logged in user:', loginUser.username || USERNAME);
  console.log('User role:', loginUser.role || 'unknown');
  console.log('Resolved company_id:', companyId || 'not available');

  const allCompaniesRes = await apiGet('/master/shifts', {
    limit: 500,
    all_companies: true
  });

  if (!allCompaniesRes.response.ok) {
    throw new Error(`All-companies shift API failed (${allCompaniesRes.response.status}): ${allCompaniesRes.data?.message || 'Unknown error'}`);
  }

  const allItems = allCompaniesRes.data?.data || [];
  const allSummary = summarizeShifts(allItems);

  console.log('\n[1] GET', allCompaniesRes.url);
  console.log('Total shifts:', allSummary.total);
  console.log('Standard shifts:', allSummary.standardCount);
  console.log('Non-standard shifts:', allSummary.nonStandardCount);
  console.log('Non-standard names:', allSummary.nonStandardNames.length ? allSummary.nonStandardNames.join(', ') : '(none)');

  if (!companyId) {
    console.log('\nNo company_id available; skipping company-scoped shift API test.');
    return;
  }

  const companyRes = await apiGet('/master/shifts', {
    page: PAGE,
    limit: LIMIT,
    sortBy: '',
    order: 'desc',
    search: '',
    company_id: companyId
  });

  if (!companyRes.response.ok) {
    throw new Error(`Company shift API failed (${companyRes.response.status}): ${companyRes.data?.message || 'Unknown error'}`);
  }

  const companyItems = companyRes.data?.data || [];
  const companySummary = summarizeShifts(companyItems);

  console.log('\n[2] GET', companyRes.url);
  console.log('Total shifts:', companySummary.total);
  console.log('Standard shifts:', companySummary.standardCount);
  console.log('Non-standard shifts:', companySummary.nonStandardCount);
  console.log('Non-standard names:', companySummary.nonStandardNames.length ? companySummary.nonStandardNames.join(', ') : '(none)');

  console.log('\nSample company rows:', JSON.stringify(companySummary.sample, null, 2));
}

run().catch((err) => {
  console.error('\nTest failed:', err.message);
  process.exitCode = 1;
});
