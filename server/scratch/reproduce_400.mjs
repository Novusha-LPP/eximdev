
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:9006/api';
const ADMIN_USERNAME = 'uday_zope';
const ADMIN_PASSWORD = '12345678';

async function run() {
  console.log('Logging in...');
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
  });

  if (!loginRes.ok) {
    console.error('Login failed');
    return;
  }

  const cookies = loginRes.headers.raw()['set-cookie'];
  const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

  console.log('Fetching admin dashboard WITHOUT company_id...');
  const dashRes = await fetch(`${BASE_URL}/attendance/adminDashboard`, {
    headers: { 'Cookie': cookieHeader }
  });

  console.log('Status:', dashRes.status);
  const data = await dashRes.json().catch(() => ({}));
  console.log('Response:', JSON.stringify(data, null, 2));

  console.log('\nFetching admin dashboard WITH date=2026-04-20...');
  const dashDateRes = await fetch(`${BASE_URL}/attendance/adminDashboard?date=2026-04-20`, {
    headers: { 'Cookie': cookieHeader }
  });

  console.log('Status:', dashDateRes.status);
  const dateData = await dashDateRes.json().catch(() => ({}));
  console.log('Response:', JSON.stringify(dateData, null, 2));
}

run();
