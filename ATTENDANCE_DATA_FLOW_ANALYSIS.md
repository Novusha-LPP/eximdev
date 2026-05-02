# Attendance Data Display Analysis

## Summary
This document outlines how attendance data is being parsed, fetched, formatted, and displayed across the attendance system, with a focus on timezone handling, date transformations, and leave data integration.

---

## 1. API Files & Data Fetching

### 1.1 Leave API - [client/src/api/attendance/leave.api.js](client/src/api/attendance/leave.api.js)

**Primary Functions:**
- `getBalance(employee_id)` - Fetches leave balance for an employee
  - Uses `normalizeLeaveBalanceRows()` to transform data
  - Returns normalized leave balance data with `display` properties
  
- `getApplications(params)` - Fetches leave applications
  
- `applyLeave(data)` - Submits a new leave application
  
- `previewLeave(params)` - Preview leave application impact
  
- `updateBalance(employee_id, payload)` - Admin function to update leave balance (used in [EmployeeProfileWorkspace.jsx](client/src/components/attendance/admin/EmployeeProfileWorkspace.jsx#L1048))

**Code Snippet:**
```javascript
getBalance: async (employee_id) => {
  try {
    const params = employee_id ? { employee_id } : {};
    const response = await apiClient.get('/leave/balance', { params });
    return {
      ...response.data,
      data: normalizeLeaveBalanceRows(response.data?.data || [])
    };
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch balance' };
  }
},
```

### 1.2 Attendance API - [client/src/api/attendance/attendance.api.js](client/src/api/attendance/attendance.api.js)

**Primary Functions:**
- `getDashboardData(monthOrOptions, year)` - Dashboard summary
  
- `getHistory(params)` - Attendance history records
  
- `getLeaveBalances(employeeIds)` - Batch fetch leave balances (used in [AttendanceReport.jsx](client/src/components/attendance/AttendanceReport.jsx#L373))

**Data Fetching Pattern:**
```javascript
// Used in AttendanceReport.jsx for enriching reports
const balanceRes = await attendanceAPI.getLeaveBalances(employeeIds);
```

### 1.3 Master API - [client/src/api/attendance/master.api.js](client/src/api/attendance/master.api.js)

**Primary Functions:**
- `getLeavePolicies(params)` - Fetch leave policy definitions
  - Called with `limit: 200-500` in various components
  - Used to populate leave type options and policy information

---

## 2. Date Handling & Timezone Awareness

### 2.1 Timezone-Aware Helper Functions - [client/src/components/attendance/utils/helpers.js](client/src/components/attendance/utils/helpers.js)

**Key Timezone Configuration:**
```javascript
export const ATTENDANCE_TIME_ZONE = 'Asia/Kolkata';
```

**Critical Functions:**

#### `getTimeZoneParts(date, timeZone = ATTENDANCE_TIME_ZONE)`
- Converts ISO date strings to Asia/Kolkata timezone parts
- Uses `Intl.DateTimeFormat` for accurate timezone conversion
- Avoids browser timezone drift

**Code:**
```javascript
const getTimeZoneParts = (date, timeZone = ATTENDANCE_TIME_ZONE) => {
  if (!date) return null;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(dateObj);

  return parts.reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
};
```

#### `getAttendanceDateKey(date, timeZone = ATTENDANCE_TIME_ZONE)`
- **Purpose:** Generate stable YYYY-MM-DD key for attendance calendar
- **Solves:** Browser timezone drift where a leave from May 4 can render as May 3
- **Formula:** `${parts.year}-${parts.month}-${parts.day}`

**Code:**
```javascript
export const getAttendanceDateKey = (date, timeZone = ATTENDANCE_TIME_ZONE) => {
  const parts = getTimeZoneParts(date, timeZone);
  if (!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}`;
};
```

#### `formatAttendanceDate(date, formatStr, timeZone = ATTENDANCE_TIME_ZONE)`
- **Purpose:** Format dates in Asia/Kolkata timezone instead of browser timezone
- **Default Format:** `dd MMM yyyy`
- **Alternative Formats:** See [constants.js](client/src/components/attendance/utils/constants.js#L74)

**Code:**
```javascript
export const formatAttendanceDate = (date, formatStr = DATE_FORMATS.DISPLAY, timeZone = ATTENDANCE_TIME_ZONE) => {
  const parts = getTimeZoneParts(date, timeZone);
  if (!parts) return '';

  const dateForFormatting = new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour || 0),
    Number(parts.minute || 0),
    Number(parts.second || 0)
  );

  return format(dateForFormatting, formatStr);
};
```

### 2.2 Date Formatting Constants - [client/src/components/attendance/utils/constants.js](client/src/components/attendance/utils/constants.js)

```javascript
export const DATE_FORMATS = {
  DISPLAY: 'dd MMM yyyy',                      // e.g., "04 Jan 2026"
  DISPLAY_LONG: 'dd MMMM yyyy',               // e.g., "04 January 2026"
  DISPLAY_WITH_TIME: 'dd MMM yyyy, hh:mm a',  // e.g., "04 Jan 2026, 09:30 AM"
  API: 'yyyy-MM-dd',                           // e.g., "2026-01-04"
  TIME_ONLY: 'hh:mm a',                       // e.g., "09:30 AM"
  TIME_24: 'HH:mm'                            // e.g., "09:30"
};
```

### 2.3 Moment.js Usage in Components

**AttendanceReport.jsx - Line 85-86 (UTC handling):**
```javascript
const start = moment.utc(startDate);
const end = moment.utc(endDate);
```
⚠️ **Note:** Uses `.utc()` - indicates some UTC handling for date range calculations

**EmployeeProfileWorkspace.jsx - Date Parsing (Line 79-80):**
```javascript
const inTime = moment(firstIn);
const outTime = moment(lastOut);
```

**Calendar Date Generation (Line 646-647):**
```javascript
const start = moment([targetYear, targetMonth - 1]).startOf('month').format('YYYY-MM-DD');
const end = moment([targetYear, targetMonth - 1]).endOf('month').format('YYYY-MM-DD');
```

---

## 3. Leave Data Fetching & Formatting

### 3.1 Leave Balance Normalization - [client/src/components/attendance/utils/leaveBalance.js](client/src/components/attendance/utils/leaveBalance.js)

**Function:** `normalizeLeaveBalanceRows(rows = [])`

**What it does:**
- Transforms raw leave balance data from API
- Deduplicates leave types by `leave_policy_id` or `leave_type`
- Handles special types like 'lwp' (Leave Without Pay) and 'privilege'
- Computes `closing_balance`, `available`, and `display` properties

**Code:**
```javascript
export const normalizeLeaveBalanceRows = (rows = []) => {
  const seen = new Set();
  const normalizedRows = [];

  for (const row of rows) {
    if (!row) continue;

    const leaveType = getLeaveType(row);
    const policyName = getPolicyName(row);
    const openingBalance = toNumber(row.opening_balance);
    const used = toNumber(row.used ?? row.consumed);
    const computedPending = Math.max(0, openingBalance - used);
    const pending = leaveType === 'lwp' ? 0 : computedPending;
    const closingBalance = leaveType === 'lwp' ? 0 : pending;
    const available = leaveType === 'lwp' ? 0 : pending;

    const key = getBalanceKey(row, leaveType);
    if (seen.has(key)) continue;
    seen.add(key);

    normalizedRows.push({
      ...row,
      name: policyName,
      leave_type: leaveType || row.leave_type || '',
      opening_balance: openingBalance,
      used,
      consumed: row.consumed ?? used,
      pending,
      pending_approval: pending,
      available,
      balance: available,
      closing_balance: closingBalance,
      total: row.total ?? openingBalance,
      display: {
        ...(row.display || {}),
        used,
        total: row.total ?? openingBalance,
        pending,
        remaining: available
      }
    });
  }

  return normalizedRows;
};
```

### 3.2 Leave Data Fetching in EmployeeProfileWorkspace.jsx

**Line 828-834 - Main fetch:**
```javascript
const [profileRes, leaveBalanceRes, policiesRes, migrationRes] = await Promise.all([
  attendanceAPI.getEmployeeFullProfile(id, startDate, endDate),
  leaveAPI.getBalance(id).catch(() => ({ data: [] })),
  masterAPI.getLeavePolicies({ limit: 200 }).catch(() => ({ data: [] })),
  attendanceAPI.getEmployeeMigrationHistory(id).catch(() => ({ data: [] }))
]);
setProfile({
  ...(profileRes || {}),
  balances: Array.isArray(leaveBalanceRes?.data) ? leaveBalanceRes.data : (profileRes?.balances || [])
});
```

**Line 650 - Browse history fetch:**
```javascript
const [r, leaveBalanceRes] = await Promise.all([
  attendanceAPI.getEmployeeFullProfile(id, start, end),
  leaveAPI.getBalance(id).catch(() => ({ data: [] }))
]);
```

### 3.3 Leave Data Enrichment in AttendanceReport.jsx

**Line 358-373 - Enrich report with leave balance:**
```javascript
const reportDataWithBalance = await enrichReportWithLeaveBalance(data);

const enrichReportWithLeaveBalance = async (data) => {
  try {
    const employeeIds = data.map(emp => emp.id);
    if (employeeIds.length === 0) return data;
    
    const balanceRes = await attendanceAPI.getLeaveBalances(employeeIds);
    const privilegeBalanceMap = new Map();
    const privilegeUsedMap = new Map();
    const lwpUsedMap = new Map();
    
    if (balanceRes?.data) {
      balanceRes.data.forEach(balance => {
        const empId = balance.employee_id;
        const leaveType = String(balance.leave_type || '').toLowerCase();

        if (leaveType === 'privilege') {
          privilegeBalanceMap.set(empId, Number(balance.closing_balance || 0));
          privilegeUsedMap.set(empId, Number(balance.used || 0));
        } else if (leaveType === 'lwp') {
          lwpUsedMap.set(empId, Number(balance.used || 0));
        }
      });
    }
    
    return data.map(emp => ({
      ...emp,
      leave_balance: privilegeBalanceMap.get(emp.id) || 0,
      privilege_taken: privilegeUsedMap.get(emp.id) || 0,
      lwp_taken: lwpUsedMap.get(emp.id) || 0
    }));
  } catch (err) { /* handle error */ }
};
```

---

## 4. Calendar Date Display & Rendering

### 4.1 Calendar Grid Rendering - [EmployeeProfileWorkspace.jsx](client/src/components/attendance/admin/EmployeeProfileWorkspace.jsx#L2002-2015)

**Date Key Generation for Calendar:**
```javascript
const dateStr = moment([browseYear, browseMonth - 1, d]).format('YYYY-MM-DD');
const record = empHistory.find(r => getAttendanceDateKey(r.attendance_date) === dateStr) 
  || { attendance_date: dateStr, status: 'none' };
```

**Month Navigation with Moment:**
```javascript
// Previous month
const prev = moment([browseYear, browseMonth - 1]).subtract(1, 'month');
setBrowseYear(prev.year());
setBrowseMonth(prev.month() + 1);

// Display format
{moment([browseYear, browseMonth - 1]).format('MMMM YYYY')}
```

**Calendar Grid Structure:**
```javascript
// Generate calendar cells
const startOfMonth = moment([browseYear, browseMonth - 1]).startOf('month');
const endOfMonth = moment([browseYear, browseMonth - 1]).endOf('month');
const startDay = startOfMonth.day();
const totalDays = endOfMonth.date();
```

---

## 5. Key Components & Their Data Flows

### 5.1 EmployeeProfileWorkspace.jsx

**Role:** Admin interface for viewing and managing individual employee attendance

**Data Flow:**
```
User selects employee
    ↓
fetchData() called with startDate, endDate
    ↓
Parallel API calls:
  - attendanceAPI.getEmployeeFullProfile(id, startDate, endDate)
  - leaveAPI.getBalance(id)
  - masterAPI.getLeavePolicies()
  - attendanceAPI.getEmployeeMigrationHistory(id)
    ↓
Data normalized and stored in profile state
    ↓
Calendar renders with attendance records
    ↓
User can edit records or apply leave
```

**Key State Variables:**
- `startDate, endDate` - Report date range (YYYY-MM-DD format)
- `browseMonth, browseYear` - Calendar navigation
- `profile` - Employee full profile with attendance & leave balances
- `empHistory` - Attendance records for selected month

### 5.2 AttendanceReport.jsx

**Role:** Department/team-wide attendance reporting with leave metrics

**Data Flow:**
```
Date range selected
    ↓
fetchReport() called
    ↓
API calls:
  - attendanceAPI.getReportData(startDate, endDate, params)
  - enrichReportWithLeaveBalance(data)
    ↓
Leave balances fetched for all employees
    ↓
Report data enriched with leave_balance, privilege_taken, lwp_taken
    ↓
Display in table/cards with leave metrics
```

---

## 6. API Client Configuration

### [client/src/api/attendanceApiClient.js](client/src/api/attendanceApiClient.js)

**Configuration:**
```javascript
const attendanceApiClient = axios.create({
  baseURL: process.env.REACT_APP_API_STRING || 'http://localhost:9006',
  timeout: 30000,
  withCredentials: true,  // Sends EXIM cookie automatically
});
```

**No explicit timezone configuration at the client level** - Timezone handling delegated to:
1. Backend API responses (which provide ISO timestamps)
2. `getTimeZoneParts()` function in helpers.js for Asia/Kolkata conversion

---

## 7. Time Formatting Functions

### formatTime12Hr() - [helpers.js](client/src/components/attendance/utils/helpers.js#L119)

**Converts ISO timestamps to 12-hour format:**
```javascript
export const formatTime12Hr = (timeInput) => {
  if (!timeInput) return '';
  try {
    const dateObj = typeof timeInput === 'string' ? parseISO(timeInput) : timeInput;
    if (!isValid(dateObj)) return '';
    return format(dateObj, DATE_FORMATS.TIME_ONLY);  // 'hh:mm a'
  } catch (error) {
    console.error('Time formatting error:', error);
    return timeInput;
  }
};
```

**Example Usage in EmployeeProfileWorkspace.jsx (Line 2119):**
```javascript
{rec.first_in && <span style={{ marginLeft: '8px' }}>{moment(rec.first_in).format('h:mm a')}</span>}
```

---

## 8. Critical Issues & Considerations

### ⚠️ Mixed Date Handling
**Problem:** Code uses both:
- Timezone-aware: `getAttendanceDateKey()` with Asia/Kolkata timezone
- Timezone-naive: `moment().format()` without timezone specification

**Example Conflict (EmployeeProfileWorkspace.jsx):**
```javascript
// Line 98-99: Uses moment without timezone
const getAttendanceDateKey = (value) => moment(value).format('YYYY-MM-DD');
const getAttendanceDateLabel = (value) => moment(value).format('D MMM, ddd');

// vs Line 20-34 in helpers.js: Uses timezone-aware function
export const getAttendanceDateKey = (date, timeZone = ATTENDANCE_TIME_ZONE) => {
  // ... timezone-aware implementation
};
```

### ⚠️ UTC Usage in AttendanceReport.jsx
**Line 85-86:**
```javascript
const start = moment.utc(startDate);
const end = moment.utc(endDate);
```
This uses UTC instead of Asia/Kolkata, which may cause date range discrepancies.

### ⚠️ Leave Balance Deduplication
Special leave types ('lwp', 'privilege') are idempotent and have `available` set to 0, which should be reflected in UI displays.

---

## 9. Recommended Reading Order

1. **Date Handling Foundation:**
   - [client/src/components/attendance/utils/constants.js](client/src/components/attendance/utils/constants.js) - Format definitions
   - [client/src/components/attendance/utils/helpers.js](client/src/components/attendance/utils/helpers.js) - Timezone conversion

2. **Leave Data Processing:**
   - [client/src/api/attendance/leave.api.js](client/src/api/attendance/leave.api.js) - API functions
   - [client/src/components/attendance/utils/leaveBalance.js](client/src/components/attendance/utils/leaveBalance.js) - Data normalization

3. **Components Using Data:**
   - [client/src/components/attendance/admin/EmployeeProfileWorkspace.jsx](client/src/components/attendance/admin/EmployeeProfileWorkspace.jsx) - Individual employee view
   - [client/src/components/attendance/AttendanceReport.jsx](client/src/components/attendance/AttendanceReport.jsx) - Report generation

4. **API Configuration:**
   - [client/src/api/attendanceApiClient.js](client/src/api/attendanceApiClient.js) - API client setup
   - [client/src/api/attendance/master.api.js](client/src/api/attendance/master.api.js) - Master data fetching

---

## Summary Table

| Aspect | Location | Key Function | Timezone Handling |
|--------|----------|---------------|-------------------|
| **Date Parsing** | helpers.js | `getAttendanceDateKey()` | ✅ Asia/Kolkata |
| **Date Formatting** | helpers.js | `formatAttendanceDate()` | ✅ Asia/Kolkata |
| **Time Formatting** | helpers.js | `formatTime12Hr()` | ⚠️ Browser timezone |
| **Leave Balance** | leaveBalance.js | `normalizeLeaveBalanceRows()` | N/A (data transform) |
| **Leave API** | leave.api.js | `getBalance()` | ⚠️ Raw API response |
| **Calendar Display** | EmployeeProfileWorkspace.jsx | Month/day grid render | ⚠️ Mixed (moment.js) |
| **Report Enrichment** | AttendanceReport.jsx | `enrichReportWithLeaveBalance()` | ⚠️ UTC for ranges |

