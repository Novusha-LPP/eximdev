import axios from 'axios';

async function testDashboard() {
    const API_URL = 'http://localhost:9006/api';
    const credentials = {
        username: 'shalini_arun',
        password: '1234'
    };

    try {
        console.log(`Logging in as ${credentials.username}...`);
        // Using axios.post to /api/login
        const loginResponse = await axios.post(`${API_URL}/login`, credentials);
        
        // Extract token from set-cookie header
        const setCookie = loginResponse.headers['set-cookie'];
        let token = '';
        if (setCookie) {
            const tokenCookie = setCookie.find(c => c.startsWith('token='));
            if (tokenCookie) {
                token = tokenCookie.split(';')[0].split('=')[1];
            }
        }

        if (!token) {
            console.error('Login failed: Token cookie not found in response');
            return;
        }
        console.log('Login successful. Token acquired from Cookie.');

        console.log('Fetching Admin Dashboard Data...');
        const dashboardResponse = await axios.get(`${API_URL}/attendance/adminDashboard`, {
            headers: {
                Cookie: `token=${token}`
            }
        });

        console.log('\n--- DASHBOARD STATS ---');
        console.log(JSON.stringify(dashboardResponse.data.data.stats, null, 2));
        
        console.log('\n--- SUCCESS ---');
        process.exit(0);
    } catch (err) {
        console.error('Error during API test:');
        if (err.response) {
            console.error(`Status: ${err.response.status}`);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error(err.message);
        }
        process.exit(1);
    }
}

testDashboard();
