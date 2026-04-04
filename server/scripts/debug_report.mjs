import axios from 'axios';

const loginUrl = "http://localhost:9006/api/login";
const reportUrl = "http://localhost:9006/api/attendance/admin-report";

async function main() {
    try {
        // Step 1: Login
        console.log('--- STEP 1: LOGIN ---');
        const loginRes = await axios.post(loginUrl, {
            username: "uday_zope",
            password: "12345678"
        });
        
        console.log('Login successful:', loginRes.data.username);
        console.log('User Role:', loginRes.data.role);
        console.log('User Company:', loginRes.data.company);
        console.log('User Company ID:', loginRes.data.company_id);
        
        const cookie = loginRes.headers['set-cookie']?.[0];
        console.log('Cookie obtained:', cookie ? 'YES' : 'NO');

        // Step 2: Get companies to find valid company_id
        console.log('\n--- STEP 2: GET COMPANIES ---');
        const companiesRes = await axios.get("http://localhost:9006/api/attendance/master/companies", {
            headers: { Cookie: cookie }
        });
        console.log('Companies:', companiesRes.data.data?.map(c => ({ id: c._id, name: c.company_name })));

        // Step 3: Get users to check company assignments
        console.log('\n--- STEP 3: CHECK USERS WITH COMPANY_ID ---');
        const usersCountRes = await axios.get("http://localhost:9006/api/attendance/debug/users-by-company", {
            headers: { Cookie: cookie }
        }).catch(() => null);
        
        if (usersCountRes) {
            console.log('Users by company:', usersCountRes.data);
        }

        // Step 4: Try report with user's company_id
        console.log('\n--- STEP 4: GET ADMIN REPORT ---');
        const userCompanyId = loginRes.data.company_id;
        const reportUrlWithParams = `${reportUrl}?startDate=2026-02-01&endDate=2026-03-31&departmentId=all&company_id=${userCompanyId}`;
        console.log('Report URL:', reportUrlWithParams);
        
        const reportRes = await axios.get(reportUrlWithParams, {
            headers: { Cookie: cookie }
        });
        
        console.log('Report Status:', reportRes.status);
        console.log('Report Success:', reportRes.data.success);
        console.log('Data Length:', reportRes.data.data?.length);
        
        if (reportRes.data.data?.length > 0) {
            console.log('\n--- SAMPLE DATA ---');
            const first = reportRes.data.data[0];
            console.log('Name:', first.name);
            console.log('Department:', first.department);
            console.log('Present:', first.present, 'Absent:', first.absent);
        } else {
            console.log('\n--- NO DATA - Checking raw query ---');
            // Check if there are any users at all
            const allUsersRes = await axios.get("http://localhost:9006/api/attendance/admin-report?startDate=2026-02-01&endDate=2026-03-31&departmentId=all", {
                headers: { Cookie: cookie }
            });
            console.log('Report without company_id filter:', allUsersRes.data.data?.length);
        }

    } catch (err) {
        console.error('Test Failed:', err.response?.status, err.response?.data || err.message);
    }
}

main();
