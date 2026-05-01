import axios from 'axios';

async function test() {
    const url = 'http://localhost:9006/api/leave/admin-update-balance/696f2427e1bae1f749fc64ac';
    const payload = {
        leave_policy_id: "69ce0c8b9303f74d13e81dba",
        opening_balance: 26.5,
        used: 2,
        pending: 24.5
    };
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OTYwOWM3OTQyN2NkYWQ0NmEyYjVmZGIiLCJ1c2VybmFtZSI6InVkYXlfem9wZSIsInJvbGUiOiJBZG1pbiIsImNvbXBhbnlfaWQiOiI2OWNkMWUzYzUwZTZjNzNhY2M3M2E5MjgiLCJzaGlmdF9pZCI6IjY5Y2QxZTNiNTBlNmM3M2FjYzczYTkxOSIsImN1cnJlbnRfc3RhdHVzIjoiaW5fb2ZmaWNlIiwibGFzdF9wdW5jaF9kYXRlIjoiMjAyNi0wNC0zMFQwODowMTo1OC44ODhaIiwiaWF0IjoxNzc3NjExNTk2LCJleHAiOjE3Nzc2NDc1OTZ9.yt9yHM1ZOAailqWRn6Dwt5gNPqya7yjT9TqLkYuHH6k';

    try {
        const response = await axios.post(url, payload, {
            headers: {
                'Cookie': `token=${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error Status:', error.response?.status);
        console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
    }
}

test();
