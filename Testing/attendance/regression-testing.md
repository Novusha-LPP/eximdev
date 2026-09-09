# Attendance Module - Regression Testing

## Regression Suite Coverage Breakdown
This suite ensures that new features or bug fixes in Attendance do not break existing core functionalities across all sub-modules:
1. **Daily Attendance & Punching** (Verify punch capture, geofencing, active sessions remain unbroken)
2. **Leave Management & Policies** (Verify leave calculations, balance deduction, policy rules stay intact)
3. **Attendance Regularization** (Verify regularization workflow & punch adjustment stability)
4. **Shift & Work Schedule** (Verify shift rosters, week-offs, and holiday calculations remain consistent)
5. **Payroll & Compensation** (Verify lock attendance, salary computations, and exports are accurate)
6. **Dashboards & Manager Approvals** (Verify employee, HOD, and admin dashboard widgets load reliably)
7. **Reports & Analytics** (Verify attendance report generation and Excel exports retain accurate metrics)
8. **Master Configurations** (Verify company profiles, department mappings, and master policies persist correctly)

---

## Sub-Module Regression Checklist & Bug Templates

### 1. Daily Attendance & Punching Regression
<!-- Verify clock in/out, biometric sync, and attendance status computation after updates -->

#### BUG-REG-001: [Regression Bug Title]
- **Sub-Module:** Daily Attendance & Punching
- **Regression Trigger:** [Feature / Commit that caused regression]
- **Severity:** Critical / High / Medium / Low
- **Status:** Open / In Progress / Resolved / Retest
- **Description:** Description of broken functionality after recent changes.
- **Steps to Reproduce:**
  1. Step 1
  2. Step 2
  3. Step 3
- **Expected Result:** Previously working behavior.
- **Actual Result:** Regressed behavior.

---

### 2. Leave Management & Policies Regression
<!-- Verify leave request workflows, balance update triggers, and policy validation -->

---

### 3. Attendance Regularization Regression
<!-- Verify regularization approval triggers correctly update missed punch logs -->

---

### 4. Shift & Work Schedule Regression
<!-- Verify shift assignments, grace period logic, and holiday overrides -->

---

### 5. Payroll & Compensation Regression
<!-- Verify attendance locking mechanisms and payroll run calculations -->

---

### 6. Dashboards & Approvals Regression
<!-- Verify HOD and Admin approval queues, pending request indicators, and summary metrics -->

---

### 7. Reports & Analytics Regression
<!-- Verify monthly summary tables, PDF exports, and Excel downloads format correctly -->

---

### 8. Master Configurations Regression
<!-- Verify company setup, department lists, and first aid checklists stay populated -->

---

## Reported Regression Bugs Summary

| Bug ID | Sub-Module | Trigger / Recent Change | Severity | Status | Reported Date |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

