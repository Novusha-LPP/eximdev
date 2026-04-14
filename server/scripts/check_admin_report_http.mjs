import axios from 'axios';

const url = 'http://localhost:9006/api/attendance/admin-report?startDate=2026-04-01&endDate=2026-04-14&company_id=all';

async function run() {
  const startedAt = Date.now();
  try {
    const response = await axios.get(url, { timeout: 15000 });
    console.log('status=', response.status, 'ms=', Date.now() - startedAt);
  } catch (error) {
    console.log('status=', error.response?.status || 'N/A');
    console.log('message=', error.response?.data?.message || error.message);
    console.log('ms=', Date.now() - startedAt);
  }
}

run();
