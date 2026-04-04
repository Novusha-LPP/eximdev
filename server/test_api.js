
import axios from 'axios';

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OTgxYzY5ZGZkMjRkNDhlNmM4NTk3YjAiLCJ1c2VybmFtZSI6ImRldl9tYXN0ZXIiLCJyb2xlIjoiQWRtaW4iLCJpYXQiOjE3NzQ0OTk2NjksImV4cCI6MTc3NDU4NjA2OX0.XKvKZIcOXBcfrojJGebTd8wme5uYt7FvBDOwLtf_s8U";
const url = "http://localhost:9006/api/attendance/admin-report?startDate=2026-02-01&endDate=2026-03-31&departmentId=all&company_id=69cbc481d44c495e5ef54678";

async function testApi() {
    try {
        console.log(`Testing API: ${url}`);
        const response = await axios.get(url, {
            headers: {
                Cookie: `token=${token}`
            }
        });
        console.log('Status:', response.status);
        console.log('Data count:', response.data?.data?.length);
        if (response.data?.data?.length > 0) {
            console.log('Sample record:', response.data.data[0]);
        } else {
            console.log('No data found in response.');
        }
    } catch (err) {
        console.error('API Error:', err.response?.status, err.response?.data || err.message);
    }
}

testApi();
