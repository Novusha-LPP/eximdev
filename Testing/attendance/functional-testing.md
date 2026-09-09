# Attendance Module - Functional Testing

## Module Coverage Breakdown
This test suite covers functional testing across all 8 sub-modules of the Attendance system:
1. **Daily Attendance & Punching** (Clock In/Out, Geo-location, Active Sessions, Operator Attendance)
2. **Leave Management & Policies** (Leave Applications, Approvals, Balances, Leave Policies)
3. **Attendance Regularization** (Missed Punch Requests, Manager Approvals, Reason Tracking)
4. **Shift & Work Schedule Management** (Shift Roster, Grace Periods, Week-Off Policies, Holiday Calendar)
5. **Payroll & Compensation** (Attendance Lock, Salary Structures, Payroll Run, Payroll Exports)
6. **Dashboards & Approvals** (Employee Dashboard, HOD Dashboard, Admin Enterprise Dashboard)
7. **Reports & Analytics** (Daily/Monthly Attendance Reports, MIS Reports, Analytics)
8. **Master & Company Configurations** (Company Setup, Master Directory, First Aid/Welfare Checklist)

---

## Sub-Module Section & Bug Templates

### 1. Daily Attendance & Punching
<!-- Log bugs related to Web/Mobile Clock In/Out, Biometric/Geo-location, Punch Logs, Active Session timeouts -->

---

### 2. Leave Management & Policies
<!-- Log bugs related to Leave Application, Balance Deductions, Encashment, Policy Criteria, Leave Approvals -->

---

### 3. Attendance Regularization
<!-- Log bugs related to Missed Punch Requests, Overtime/Late Regularization, HOD Approvals -->

---

### 4. Shift & Work Schedule Management
<!-- Log bugs related to Shift Allocation, Roster Planning, Grace Period, Week-Off Policy, Holiday List -->

---

### 5. Payroll & Compensation
<!-- Log bugs related to Attendance Lock, LOP Days calculation, Payroll Run, Salary Structure, Payroll Export -->

#### BUG-001: Employee Payroll Master Page Displays Blank State on First Navigation (Requires Manual Refresh)
- **Sub-Module:** Payroll & Compensation (Employee Payroll Master)
- **Severity:** High
- **Priority:** High
- **Status:** Open
- **Description:** When navigating to the 'Employee Payroll Master' page (under CONFIGURATION) for the first time in a user session, the page loads in a blank state showing "No active payroll configurations." and "No Employee Selected" without fetching active employee payroll records. The user must manually refresh the browser page (F5 / Ctrl+R) to trigger the initial data fetch and render payroll records.
- **Steps to Reproduce:**
  1. Log into the application and open the Attendance module dashboard.
  2. In the left navigation menu under 'CONFIGURATION', click on 'Employee Payroll Master' for the first time.
  3. Observe that the main view renders blank without fetching or populating employee payroll configurations.
  4. Perform a manual browser page refresh (F5 or Ctrl+R).
  5. Observe that after refreshing, the employee payroll list and details load properly.
- **Expected Result:** Navigating to 'Employee Payroll Master' should automatically execute the initial data fetching hooks and populate active employee payroll configurations without requiring a manual page refresh.
- **Actual Result:** Page displays an initial blank/unloaded state upon first navigation; data only populates after a manual page refresh.
- **Additional Notes:** Likely caused by missing initial data fetch on route mount (`useEffect` array dependency or initial lifecycle execution), or unhandled async state during client-side route transition.

---

### 6. Dashboards & Approvals
<!-- Log bugs related to Employee Dashboard metrics, HOD Approval Queue, Admin Enterprise Overview -->

---

### 7. Reports & Analytics
<!-- Log bugs related to Attendance Summary Reports, Muster Roll export, MIS Analytics, CSV/Excel/PDF export -->

---

### 8. Master & Company Configurations
<!-- Log bugs related to Company Setup, Shift Masters, Department Mappings, First Aid Checklist -->

---

## Reported Bugs Summary

| Bug ID | Sub-Module | Description | Severity | Status | Reported Date |
| --- | --- | --- | --- | --- | --- |
| BUG-001 | Payroll & Compensation | Employee Payroll Master shows blank page on initial navigation; requires page refresh to load | High | Open | 2026-08-19 |

