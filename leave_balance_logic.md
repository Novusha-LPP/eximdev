# Leave Balance Logic in Attendance Module

This document explains the technical implementation and business logic behind leave balance management in the Attendance module.

## 1. Data Model: `LeaveBalance`
Each employee has a `LeaveBalance` record for each eligible leave type (defined in `LeavePolicy`) for the current calendar year.

### Key Fields:
- **Opening Balance (`opening_balance`)**: The balance at the start of the year (usually set by admin or policy).
- **Credited (`credited`)**: Additional leaves granted to the employee during the year.
- **Consumed (`consumed`)**: Total number of approved leave days already taken.
- **Pending Approval (`pending_approval`)**: Days locked for applications currently awaiting HOD/Admin approval.
- **Closing Balance (`closing_balance`)**: The **current available** balance for new applications.

---

## 2. The "Locking" Lifecycle

The system uses a "Locking" mechanism to prevent over-utilization when multiple applications are pending.

### Phase 1: Leave Application (`applyLeave`)
When an employee submits a leave request:
1.  **Validation**: The system checks if `closing_balance >= requested_days`.
2.  **Deduction (Locking)**:
    -   `pending_approval` is **increased** by `requested_days`.
    -   `closing_balance` is **decreased** by `requested_days`.
    -   *Note: For Unpaid Leave (LWP), the balance is not deducted.*

### Phase 2: HOD/Admin Approval (`approveRequest`)
If the leave is **Approved**:
1.  `consumed` is **increased** by `requested_days`.
2.  `pending_approval` is **decreased** by `requested_days`.
3.  **Attendance Sync**: The system automatically creates/updates `AttendanceRecord` entries for the leave dates with the status `leave` or `half_day`.

### Phase 3: Rejection or Cancellation (`cancelLeave` / `approveRequest` rejected)
If the leave is **Rejected** or **Cancelled**:
1.  `pending_approval` is **decreased** by `requested_days`.
2.  `closing_balance` is **increased** by `requested_days` (reverting the lock).

---

## 3. Administrative Controls

Admins have the capability to manually adjust balances via the `updateBalance` endpoint.

-   **Manual Overrides**: Admins can set `opening_balance`, `credited`, or `consumed` values directly.
-   **Recalculation Formula**:
    Whenever an admin updates the balance, the `closing_balance` is recalculated as:
    `closing_balance = (opening_balance + credited) - consumed - pending_approval`

---

## 4. Special Rules & Eligibility

-   **Eligibility Filtering**: When fetching balances, the system filters policies based on:
    -   `employment_types` (e.g., Permanent vs Contractor).
    -   `gender` (e.g., Maternity leave).
-   **Privilege Leave (PL)**: If a user's PL balance reaches zero, the system prevents further applications and prompts the user to contact the Administrator.
-   **Half-Day Leaves**: Supported by deducting `0.5` days from the balance instead of a full day.
-   **Overlap Prevention**: The system blocks new applications that overlap with existing `pending` or `approved` leaves.

---

## 5. Technical Flow Summary

| Action | `opening` | `credited` | `pending` | `consumed` | `closing` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Initial (Admin set)** | 10 | 0 | 0 | 0 | **10** |
| **User Applies 2 days** | 10 | 0 | **2** | 0 | **8** |
| **HOD Approves** | 10 | 0 | **0** | **2** | **8** |
| **User Applies 1 day** | 10 | 0 | **1** | 2 | **7** |
| **User Cancels** | 10 | 0 | **0** | 2 | **8** |
