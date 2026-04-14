import axios from 'axios';

const token = process.env.ATTENDANCE_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OTYwOWM3OTQyN2NkYWQ0NmEyYjVmZGIiLCJ1c2VybmFtZSI6InVkYXlfem9wZSIsInJvbGUiOiJBZG1pbiIsImNvbXBhbnlfaWQiOiI2OWNkMWUzYzUwZTZjNzNhY2M3M2E5MjgiLCJzaGlmdF9pZCI6IjY5Y2QxMzUxZmY1MzAxZjQxNjc5NmNlZiIsImN1cnJlbnRfc3RhdHVzIjoib3V0X29mZmljZSIsImxhc3RfcHVuY2hfZGF0ZSI6IjIwMjYtMDQtMTNUMTQ6MjY6NTQuMTk0WiIsImlhdCI6MTc3NjE3MDY0MywiZXhwIjoxNzc2MjA2NjQzfQ.na-ZhDpSaCzubOAMSlnA7NCIuPGH5l6m2RYmeG9IqvM';

const url = process.env.ADMIN_REPORT_URL || 'http://localhost:9006/api/attendance/admin-report?startDate=2026-04-01&endDate=2026-04-14&company_id=all';

async function run() {
  const start = Date.now();

  try {
    const response = await axios.get(url, {
      headers: {
        Cookie: `token=${token}`
      },
      timeout: 120000
    });

    const elapsed = Date.now() - start;
    console.log('status=', response.status);
    console.log('rows=', response.data?.data?.length || 0);
    console.log('ms=', elapsed);
  } catch (error) {
    const elapsed = Date.now() - start;
    console.log('ms=', elapsed);
    console.log('status=', error.response?.status || 'N/A');
    console.log('error=', error.response?.data || error.message);
  }
}

run();
