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
        const companiesRes = await axios.get("http://localhost:9006/api/master/companies", {
            headers: { Cookie: cookie }
        });
        console.log('Companies:', companiesRes.data.data?.map(c => ({ id: c._id, name: c.company_name })));

        // Step 3: Get users to check company assignments
        console.log('\n--- STEP 3: CHECK USERS ---');
        const usersCountRes = await axios.get("http://localhost:9006/api/master/users?limit=20", {
            headers: { Cookie: cookie }
        });
        
        console.log('Users Length:', usersCountRes.data.data?.length);
        if (usersCountRes.data.data?.length > 0) {
            const firstUser = usersCountRes.data.data[0];
            console.log('First User Name:', firstUser.first_name, firstUser.last_name);
            console.log('First User ID:', firstUser._id);
        }

        // Step 4: Try report with user's company_id
        console.log('\n--- STEP 4: GET ADMIN REPORT ---');
        const userCompanyId = "69cd1e3c50e6c73acc73a928";
        const reportUrlWithParams = `${reportUrl}?startDate=2026-05-01&endDate=2026-05-31&departmentId=all`;
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
            console.log('Keys of first item:', Object.keys(first));
            console.log('Sample item values:', { id: first.id, _id: first._id, name: first.name, company_id: first.company_id, company_name: first.company_name });
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
