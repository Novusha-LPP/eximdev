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

#### BUG-003: Daily Attendance Worked Hours Calculation Error (Displays 30h 57m instead of 6h 57m for Same-Day Punches)
- **Sub-Module:** Daily Attendance & Punching (My Attendance Log & Worked Hours Calculation)
- **Severity:** High
- **Priority:** High
- **Status:** Open
- **Description:** On the 'My Attendance' view, for attendance records on a single day (e.g., 18 Aug 2026), when an employee punches in at 01:02 PM and punches out at 07:59 PM, the calculated worked hours display as `30h 57m` instead of the correct worked duration of `6h 57m`. The calculation incorrectly adds an extra 24 hours to the total working hours.
- **Steps to Reproduce:**
  1. Log into the application as an employee and navigate to 'MY ATTENDANCE & LEAVE' -> 'My Attendance'.
  2. Locate the attendance entry for 18 Aug 2026 (Tuesday).
  3. Observe Punch In time: `01:02 PM` and Punch Out time: `07:59 PM`.
  4. Check the calculated duration under the 'HOURS' column.
  5. Observe that the system displays `30h 57m` instead of the expected `6h 57m`.
- **Expected Result:** The system should calculate the actual elapsed duration between Punch In (`01:02 PM`) and Punch Out (`07:59 PM`), displaying `6h 57m`.
- **Actual Result:** The system displays `30h 57m` due to an incorrect 24-hour offset being added during total work hours/minutes aggregation.
- **Additional Notes:** Caused by date/timestamp mismatch or improper day-boundary handling in `AttendanceRecord` calculation (e.g., evaluating punch out date as next calendar day or adding an unnecessary +24h offset to same-day punches).

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

#### BUG-004: Newly Added Employee Salary Data Fails to Display in Payslip Generator (Shows 'No Calculated Payslips Found')
- **Sub-Module:** Payroll & Compensation (Payslip Generator / Payroll Run)
- **Severity:** High
- **Priority:** High
- **Status:** Open
- **Description:** After adding salary details for 3 employees, navigating to the 'Payslip Generator' page for the current payroll period (`2026-08`) fails to display the payslips/salary records for the added employees. The interface instead displays an empty state stating "No Calculated Payslips Found - Generate payroll for the selected month to view payslips."
- **Steps to Reproduce:**
  1. Add/configure salary details for 3 employees under Employee Payroll Master / Payroll Entries.
  2. Navigate to 'PAYROLL' -> 'Payslip Generator' (`/attendance/admin/payslip-generator`).
  3. Select the payroll period `2026-08`.
  4. Inspect the main payslip summary area.
  5. Observe that the 3 added employee salary records are not visible, and the system displays "No Calculated Payslips Found".
- **Expected Result:** The Payslip Generator view should retrieve and display the calculated payslips/salary records for the 3 added employees for the selected period (`2026-08`).
- **Actual Result:** The page shows an empty state displaying "No Calculated Payslips Found", ignoring the newly added employee salary entries.
- **Additional Notes:** May be caused by missing automated payroll run calculation trigger, period filter mismatch, status filtering (e.g., draft/unapproved state), or backend query condition in `PayslipGenerator.jsx`.

#### BUG-005: Newly Added Employee Salary Data Fails to Display in Bank Transfer File Generator (Shows 'No Transfers Found')
- **Sub-Module:** Payroll & Compensation (Bank Transfer / Payroll Run)
- **Severity:** High
- **Priority:** High
- **Status:** Open
- **Description:** After adding salary details for 3 employees, navigating to the 'Bank Transfer' page under PAYROLL for August 2026 fails to populate the direct salary transfer list for the added employees. The interface instead displays an empty state stating "No Transfers Found - Generate payroll for the selected month to render the salary bank list."
- **Steps to Reproduce:**
  1. Add/configure salary details for 3 employees under Employee Payroll Master / Payroll Entries.
  2. Navigate to 'PAYROLL' -> 'Bank Transfer' (`/attendance/admin/bank-transfer`).
  3. Select the payroll month `August` and year `2026`.
  4. Inspect the 'Direct Salary Transfer List' section.
  5. Observe that the 3 added employee bank transfer records are not visible, and the system displays "No Transfers Found".
- **Expected Result:** The Bank Transfer File Generator view should retrieve and display the bank account & net salary transfer entries for all 3 added employees for August 2026.
- **Actual Result:** The page shows an empty state displaying "No Transfers Found. Generate payroll for the selected month to render the salary bank list.", ignoring the newly added employee salary data.
- **Additional Notes:** Caused by missing automated payroll calculation step, period filter mismatch, status filtering (e.g., pending payroll approval), or backend query condition in `BankTransfer` tab component.

#### BUG-006: Complete Absence of Employee Salary Entries Across All Payroll Module Views (Payroll Entries, Payslip Generator, Bank Transfer)
- **Sub-Module:** Payroll & Compensation (Payroll Entries / Module-wide)
- **Severity:** Critical
- **Priority:** High
- **Status:** Open
- **Description:** After adding and saving employee salary details in the system, navigating across all sub-pages under the 'PAYROLL' section (`Payroll Entries`, `Payslip Generator`, `Bank Transfer`, `Payroll Reports`) results in zero entries being displayed. Every view defaults to an empty state ("No Entries Found", "No Calculated Payslips Found", "No Transfers Found"), completely blocking payroll verification and processing.
- **Steps to Reproduce:**
  1. Add/configure salary details for employees under `CONFIGURATION` -> `Employee Payroll Master`.
  2. Navigate to `PAYROLL` -> `Payroll Entries` (`/attendance/admin/payroll-entries`).
  3. Observe that no salary/payroll entries are populated in the list.
  4. Navigate to `PAYROLL` -> `Payslip Generator` (`/attendance/admin/payslip-generator`).
  5. Observe empty state: *"No Calculated Payslips Found"*.
  6. Navigate to `PAYROLL` -> `Bank Transfer` (`/attendance/admin/bank-transfer`).
  7. Observe empty state: *"No Transfers Found"*.
- **Expected Result:** All views under the Payroll module should retrieve, compute, and render employee salary entries, payslip summaries, and bank transfer lists for the selected period (`2026-08`).
- **Actual Result:** No payroll entries or employee salary calculations are visible across any view in the Payroll module.
- **Additional Notes:** Indicates a systemic issue in the payroll calculation pipeline, unexecuted payroll run trigger, or missing data mapping between Employee Payroll Master and Payroll execution controllers.

---

### 6. Dashboards & Approvals
<!-- Log bugs related to Employee Dashboard metrics, HOD Approval Queue, Admin Enterprise Overview -->

#### BUG-002: Employee Attendance Dashboard Calendar Fails to Display Weekend Punching Records (Discrepancy with 'My Attendance' View)
- **Sub-Module:** Dashboards & Approvals (Employee Dashboard - Attendance Calendar)
- **Severity:** High
- **Priority:** High
- **Status:** Open
- **Description:** When an employee punches in/out on a weekend day (e.g., Saturday/Sunday), the 'My Attendance' detailed view correctly logs and displays the punch record with worked duration and status marked as 'Present' (e.g., Saturday 22 Aug 2026 showing 06:14 PM to 06:49 PM, 0h 35m, Present). However, on the main Employee Dashboard 'Attendance Calendar' widget, the date cell for that weekend day remains completely blank without displaying the 'Present' badge or punch status.
- **Steps to Reproduce:**
  1. Log into the application as an employee who has recorded punches on a weekend day (e.g., Saturday, 22 Aug 2026).
  2. Navigate to 'MY ATTENDANCE & LEAVE' -> 'My Attendance'.
  3. Verify that the weekend entry (22 Aug 2026 Saturday) shows valid check-in/out times, total hours, and 'Present' status.
  4. Navigate to the 'Dashboard' view and inspect the 'Attendance Calendar' matrix for the current month (August 2026).
  5. Check the date cell corresponding to the weekend day (22 Aug 2026).
  6. Observe that the calendar day cell is completely blank and fails to render the 'Present' badge.
- **Expected Result:** The main Dashboard Attendance Calendar should accurately render the 'Present' (or applicable punching) status badge on weekend date cells when an employee has punched in for work on that day, matching the record shown in 'My Attendance'.
- **Actual Result:** The Dashboard calendar cell for weekend dates with recorded punches displays as blank without any attendance badge or status.
- **Additional Notes:** Caused by discrepancy between `Dashboard.jsx` calendar matrix rendering logic (`calClass` / `getCalRecord`) and `AttendanceRecord` calculation where weekend punch records are omitted or default to empty state when weekly-off policy rules override calendar day statuses.

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
| BUG-002 | Dashboards & Approvals | Employee Dashboard Attendance Calendar fails to display weekend punch records, showing blank state despite 'My Attendance' recording Present status | High | Open | 2026-08-26 |
| BUG-003 | Daily Attendance & Punching | Daily attendance hours calculation error displaying 30h 57m instead of actual 6h 57m for same-day punch in (01:02 PM) and punch out (07:59 PM) | High | Open | 2026-08-26 |
| BUG-004 | Payroll & Compensation | Newly added employee salary entries fail to display in Payslip Generator for period 2026-08 (shows 'No Calculated Payslips Found') | High | Open | 2026-08-27 |
| BUG-005 | Payroll & Compensation | Newly added employee salary entries fail to display in Bank Transfer File Generator for August 2026 (shows 'No Transfers Found') | High | Open | 2026-08-27 |
| BUG-006 | Payroll & Compensation | Complete absence of employee salary entries across all Payroll module sub-pages (Payroll Entries, Payslip Generator, Bank Transfer) | Critical | Open | 2026-08-27 |



