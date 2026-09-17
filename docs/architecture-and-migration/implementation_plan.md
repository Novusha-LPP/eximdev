# Implementation Plan - Reporting To Hierarchy

This plan outlines the implementation of a direct reporting hierarchy to complement the existing team-based management in the Attendance Module.

## User Review Required

> [!IMPORTANT]
> **Reporting To vs Team HOD**: This change introduces a parallel hierarchy. An employee can belong to a Team (managed by a Team HOD) AND have a direct Reporting Manager. Both will have administrative access to the employee's attendance and leave.

> [!NOTE]
> **Backward Compatibility**: Team-based logic is preserved as a fallback/parallel mechanism. Existing teams will continue to function without interruption.

## Proposed Changes

---

### Phase 1: Backend Data & API

#### [MODIFY] [userModel.mjs](file:///c:/Users/india/Desktop/Projects/eximdev/server/model/userModel.mjs)
- Add `reporting_to` field: `{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }`.

#### [NEW] [updateReporting.mjs](file:///c:/Users/india/Desktop/Projects/eximdev/server/routes/attendance/updateReporting.mjs)
- Endpoint: `PUT /api/attendance/users/:id/reporting`
- Validation:
    - `id` and `reporting_to` must be valid ObjectIds.
    - `reporting_to` cannot be the same as `id`.
    - Both users must belong to the same `company_id`.
- Logic: Updates the `reporting_to` field in the user document.

#### [MODIFY] [app.mjs](file:///c:/Users/india/Desktop/Projects/eximdev/server/app.mjs)
- Import and register the new reporting route.

---

### Phase 2: Access & Approval Logic

#### [MODIFY] [HOD.controller.js](file:///c:/Users/india/Desktop/Projects/eximdev/server/controllers/attendance/HOD.controller.js)
- **`getDashboard`**: Update employee selection logic to include users where `reporting_to` matches the current HOD.
- **`approveRequest`**: Expand authorization check to permit approval if the requester's `reporting_to` field matches the actor's ID.
- **`getDepartmentAttendanceReport`**: Include direct reports in the generated report.

#### [MODIFY] [leave.controller.js](file:///c:/Users/india/Desktop/Projects/eximdev/server/controllers/attendance/leave.controller.js)
- **`getBalance`**: Update access check to allow HODs to view balances of their direct reports.

#### [MODIFY] [attendance.controller.js](file:///c:/Users/india/Desktop/Projects/eximdev/server/controllers/attendance/attendance.controller.js)
- **`isHODauthorized`**: Add `reporting_to` check.
- **`getHodTeamMemberIds`**: Update to return member IDs from teams PLUS direct reports.

---

### Phase 3: Frontend UI

#### [MODIFY] [EmployeeProfileWorkspace.jsx](file:///c:/Users/india/Desktop/Projects/eximdev/client/src/components/attendance/admin/EmployeeProfileWorkspace.jsx)
- **Data Fetching**: Fetch list of all active users in the company context to populate the manager selection dropdown.
- **UI Component**:
    - Add a "Reporting To" section near the user profile header/actions.
    - Use a searchable dropdown (Select) for manager assignment.
    - Display manager's name and role badge.
- **Action**: Implement `handleUpdateReporting` to save changes via the new API.

---

## Open Questions

- **Circular Reporting**: Should we prevent circular reporting (A reports to B, B reports to A)? Currently, I will only prevent A reports to A.
- **Role Restriction**: Should any user be assignable as a manager, or only those with Admin/HOD roles? The request says "Dropdown (select user)", implying any user.

## Verification Plan

### Automated Tests
- Script to test the `PUT /reporting` endpoint for:
    - Success (valid manager, same company).
    - Failure (self-assignment).
    - Failure (cross-company assignment).

### Manual Verification
1.  Assign User A as direct report to HOD B via Admin panel.
2.  Login as HOD B and verify User A appears in the dashboard (without being in a team).
3.  User A applies for leave; check if HOD B can see and approve it.
4.  Verify "Team Report" for HOD B includes User A.
