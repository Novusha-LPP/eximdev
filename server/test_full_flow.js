
import axios from 'axios';

const loginUrl = "http://localhost:9006/api/login";
const reportUrl = "http://localhost:9006/api/attendance/admin-report?startDate=2026-02-01&endDate=2026-03-31&departmentId=all&company_id=69cbc481d44c495e5ef54678";

async function runTest() {
    try {
        console.log('--- STEP 1: LOGIN AS uday_zope ---');
        const loginRes = await axios.post(loginUrl, {
            username: "uday_zope",
            password: "p1" // The user wrote 'password 12345678' but the login.mjs uses bcrypt. The user probably meant password is 12345678.
        });
        // Error: user said "username":"uday_zope"password 12345678"
        
        console.log('Login successful:', loginRes.data.username);
        
        // Extract token from cookie
        const cookie = loginRes.headers['set-cookie']?.[0];
        console.log('Cookie obtained:', cookie ? 'YES' : 'NO');

        console.log('\n--- STEP 2: GET ADMIN REPORT ---');
        const reportRes = await axios.get(reportUrl, {
            headers: {
                Cookie: cookie
            }
        });
        
        console.log('Status:', reportRes.status);
        console.log('Total Records returned:', reportRes.data.data?.length);
        
        if (reportRes.data.data?.length > 0) {
            const first = reportRes.data.data[0];
            console.log('\n--- SAMPLE DATA STRUCTURE ---');
            console.log('Name:', first.name);
            console.log('Dept:', first.department);
            console.log('Present:', first.present, 'Absent:', first.absent);
            console.log('History length:', first.history?.length);
            if (first.history?.length > 0) {
                console.log('First history date:', first.history[0].date);
            }
        }

    } catch (err) {
        console.error('Test Failed:', err.response?.status, err.response?.data || err.message);
    }
}

// Fixed password attempt
async function tryLogin(pass) {
     try {
        console.log(`Trying login with password: ${pass}`);
        const loginRes = await axios.post(loginUrl, {
            username: "uday_zope",
            password: pass
        });
        return loginRes;
    } catch (e) {
        return null;
    }
}

async function main() {
    let res = await tryLogin("12345678");
    if (!res) res = await tryLogin("p1"); // fallback if I misunderstood
    
    if (res) {
        const cookie = res.headers['set-cookie']?.[0];
        const reportRes = await axios.get(reportUrl, { headers: { Cookie: cookie } });
        console.log('Report Status:', reportRes.status);
        console.log('Data Length:', reportRes.data.data?.length);
        if (reportRes.data.data?.length > 0) {
             console.log('Report Structure Example:', JSON.stringify(reportRes.data.data[0]).substring(0, 500) + '...');
        }
    } else {
        console.log('Could not login with provided credentials.');
    }
}

main();
