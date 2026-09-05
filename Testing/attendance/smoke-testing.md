# Attendance Module - Smoke Testing

## Sanity & Smoke Checklist Breakdown
Smoke testing performs a rapid check on critical pathways in the Attendance module before deep testing or deployment:
1. **Daily Attendance & Punching** (Verify login, Clock In button, punch record creation)
2. **Leave Management** (Verify Leave Application form opens & submits without error)
3. **Attendance Regularization** (Verify Regularization Request form renders & submits)
4. **Shift & Work Schedule** (Verify Shift Management page loads shift list without crashing)
5. **Payroll & Compensation** (Verify Payroll tab loads salary summaries without 500 server errors)
6. **Dashboards & Approvals** (Verify Employee, HOD, and Admin dashboards load key widgets)
7. **Reports & Analytics** (Verify Attendance Report page renders data table)
8. **Master Configurations** (Verify Company & Settings page loads successfully)

---

## Smoke Test Cases & Critical Blocker Templates

### 1. Daily Attendance & Punching Smoke Check
- [ ] Clock In / Clock Out button renders on dashboard
- [ ] Submitting a punch creates a record without API errors

#### BUG-SMK-001: [Smoke Blocker Title]
- **Sub-Module:** Daily Attendance & Punching
- **Severity:** Blocker / Critical
- **Status:** Open / In Progress / Resolved / Retest
- **Description:** Critical failure preventing basic functionality.
- **Steps to Reproduce:**
  1. Step 1
  2. Step 2
- **Expected Result:** Feature loads and executes basic action cleanly.
- **Actual Result:** App crashes, white screen, or API 500 error.

---

### 2. Leave Management Smoke Check
- [ ] "Apply Leave" modal opens
- [ ] Leave balance cards display values

---

### 3. Attendance Regularization Smoke Check
- [ ] Regularization page loads pending requests list

---

### 4. Shift & Work Schedule Smoke Check
- [ ] Shift Management table renders existing shifts

---

### 5. Payroll & Compensation Smoke Check
- [ ] Payroll tab loads employee payroll summaries

---

### 6. Dashboards & Approvals Smoke Check
- [ ] HOD Dashboard queue renders pending approvals
- [ ] Admin Dashboard enterprise analytics render charts

---

### 7. Reports & Analytics Smoke Check
- [ ] Attendance Report page loads with filter controls

---

### 8. Master Configurations Smoke Check
- [ ] Attendance Settings page renders without error

---

## Reported Smoke Test Blockers Summary

| Bug ID | Sub-Module | Critical Issue | Severity | Status | Reported Date |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

