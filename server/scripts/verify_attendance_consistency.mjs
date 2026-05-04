import axios from 'axios';
import moment from 'moment';

const BASE_URL = 'http://localhost:9006';
const EMPLOYEE_ID = '6672a2501aa931b68b091fd0';

const USERS = {
    akash_modi: '12345678',
    chirag_shah: '12345678',
    uday_zope: '12345678'
};

async function login(username, password) {
    try {
        const res = await axios.post(`${BASE_URL}/api/login`, { username, password });
        const cookie = res.headers['set-cookie']?.[0];
        const token = cookie?.split(';')[0]?.split('=')[1];
        return { token, company_id: res.data.company_id || res.data.company?._id || res.data.company };
    } catch (err) {
        console.error(`Login failed for ${username}:`, err.response?.data || err.message);
        return null;
    }
}

async function fetchData(url, token) {
    try {
        const res = await axios.get(url, {
            headers: { Cookie: `token=${token}` }
        });
        return res.data;
    } catch (err) {
        console.error(`Fetch failed for ${url}:`, err.response?.data || err.message);
        return null;
    }
}

function normalizeDashboardCalendar(calendar) {
    const normalized = {};
    Object.keys(calendar).forEach(date => {
        const record = calendar[date];
        normalized[date] = {
            status: record.status?.toLowerCase(),
            inTime: record.inTime || record.firstIn,
            outTime: record.outTime || record.lastOut,
            leaveType: record.leaveType
        };
    });
    return normalized;
}

function normalizeProfileAttendance(attendance) {
    const normalized = {};
    attendance.forEach(record => {
        const date = moment(record.attendance_date).format('YYYY-MM-DD');
        normalized[date] = {
            status: record.status?.toLowerCase(),
            inTime: record.first_in,
            outTime: record.last_out,
            leaveType: record.leaveType
        };
    });
    return normalized;
}

async function run() {
    console.log('--- Attendance Data Consistency Verification ---');

    const accounts = {};
    for (const [username, password] of Object.entries(USERS)) {
        accounts[username] = await login(username, password);
    }

    if (!accounts.akash_modi || !accounts.chirag_shah || !accounts.uday_zope) {
        console.error('Failed to obtain all tokens. Aborting.');
        return;
    }

    console.log(`Akash Modi Company ID: ${accounts.akash_modi.company_id}`);

    console.log('\nFetching data from all perspectives...');
    
    const dashboardData = await fetchData(`${BASE_URL}/api/attendance/dashboard?month=4&year=2026`, accounts.akash_modi.token);
    const hodProfileData = await fetchData(`${BASE_URL}/api/attendance/employee-full-profile/${EMPLOYEE_ID}?startDate=2026-04-01&endDate=2026-04-30&company_id`, accounts.chirag_shah.token);
    const adminProfileData = await fetchData(`${BASE_URL}/api/attendance/employee-full-profile/${EMPLOYEE_ID}?startDate=2026-04-01&endDate=2026-04-30`, accounts.uday_zope.token);

    if (!dashboardData || !hodProfileData || !adminProfileData) {
        console.error('Failed to fetch all data sets. Aborting.');
        return;
    }

    const dashboardCalendar = normalizeDashboardCalendar(dashboardData.calendar || {});
    const hodAttendance = normalizeProfileAttendance(hodProfileData.attendance || []);
    const adminAttendance = normalizeProfileAttendance(adminProfileData.attendance || []);

    console.log('\nComparing records for April 2026...');
    const allDates = new Set([
        ...Object.keys(dashboardCalendar),
        ...Object.keys(hodAttendance),
        ...Object.keys(adminAttendance)
    ]);

    const sortedDates = Array.from(allDates).sort();
    let mismatches = 0;

    for (const date of sortedDates) {
        if (!date.startsWith('2026-04')) continue;

        const dRec = dashboardCalendar[date];
        const hRec = hodAttendance[date];
        const aRec = adminAttendance[date];

        const statusMatch = (dRec?.status === hRec?.status) && (hRec?.status === aRec?.status);
        
        if (!statusMatch) {
            mismatches++;
            console.log(`[MISMATCH] Date: ${date}`);
            console.log(`  User View (Dashboard):  ${dRec?.status || 'N/A'}`);
            console.log(`  HOD View (Profile):    ${hRec?.status || 'N/A'}`);
            console.log(`  Admin View (Profile):  ${aRec?.status || 'N/A'}`);
        }
    }

    if (mismatches === 0) {
        console.log('\nSUCCESS: All attendance statuses are consistent across all three views for April 2026.');
    } else {
        console.log(`\nFAILURE: Found ${mismatches} mismatches in attendance status.`);
    }

    console.log('\nSummary Counts (April 2026):');
    console.log(`User View (Dashboard): ${dashboardData.monthStats?.present || 0} Present, ${dashboardData.monthStats?.absent || 0} Absent, ${dashboardData.monthStats?.leaves || 0} Leaves`);
    console.log(`HOD View (Profile):    ${hodProfileData.summary?.present || 0} Present, ${hodProfileData.summary?.absent || 0} Absent, ${hodProfileData.summary?.leaves || 0} Leaves`);
    console.log(`Admin View (Profile):  ${adminProfileData.summary?.present || 0} Present, ${adminProfileData.summary?.absent || 0} Absent, ${adminProfileData.summary?.leaves || 0} Leaves`);
}

run();
