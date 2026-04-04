# Punch and Shift Working Logic

This document details how the system handles daily attendance, shift timing calculations, and automated scenarios like missing punches.

## 1. Shift Definition & Rules
Each employee is assigned a **Shift**, which defines the following boundaries:

-   **Shift Window**: `start_time` and `end_time` (e.g., 09:00 - 18:00).
-   **Grace Periods**: 
    -   `grace_in_minutes`: Minutes allowed after start time before being marked "Late" (default 15m).
    -   `grace_out_minutes`: Minutes allowed before end time before being marked "Early Exit" (default 15m).
-   **Hour Thresholds**:
    -   `full_day_hours`: Total hours required for a "Present" status (usually 8h).
    -   `half_day_hours`: Minimum hours required for a "Half Day" status (usually 4h).
    -   `minimum_hours`: Threshold below which the day is considered "Absent" (usually 3h).

---

## 2. The Punch Flow

### Normal Lifecycle
1.  **Punch-In**: Employee records an `IN` punch. User status changes to `in_office`.
2.  **Validation**: System checks Geo-fencing (Location) and IP Address restrictions.
3.  **Session Tracking**: The system detects an active session if the last punch was `IN` within the last **18 hours**.

### Multi-Actor Punching
-   **Admins** can punch for any employee in their company.
-   **HODs** can punch for any employee within their assigned teams.

---

## 3. Automated Scenarios (Missing Punches)

### Auto Punch-Out
If an employee forgets to punch out, the **Attendance Engine** handles it automatically:
-   **Trigger**: If the last punch for the day is `IN` and the current time is **2 hours past the shift end**.
-   **Action**: System creates an `OUT` punch automatically.
-   **Method**: The punch is flagged as `auto` and the time is set exactly to the `shift_end_time`.
-   **Notification**: The next time the user views their dashboard, past incomplete records are retroactively processed.

### Missing IN Punch
-   If no `IN` punch is recorded, the status remains `absent`.
-   **Safeguard**: The system waits until **4 hours after the shift start** before officially marking someone as `absent` for the current day to allow for late arrivals.

---

## 4. Status Determination Logic

The status is calculated based on cumulative hours and shift rules:

| Condition | Status |
| :--- | :--- |
| **Punches Found + Work Hours >= Full Day Threshold** | `present` |
| **Punches Found + Work Hours >= Half Day Threshold** | `half_day` |
| **Shift Over + Work Hours < Half Day Threshold** | `half_day` (or `absent` if < min hours) |
| **Approved Leave (Full Day)** | `leave` |
| **Approved Leave (Half Day) + Partial Work** | `present` (Total 1.0) |
| **Holiday / Weekly Off** | `holiday` / `weekly_off` |

---

## 5. Late Marks and Early Exits

1.  **Late In**: 
    -   Formula: `punch_in_time > (shift_start + grace_in)`
    -   Calculates `late_by_minutes`.
2.  **Early Exit**: 
    -   Formula: `punch_out_time < (shift_end - grace_out)`
    -   Calculates `early_exit_minutes`.
3.  **Overtime**:
    -   Triggered if `punch_out_time > (shift_end + overtime_threshold)`.
    -   Requires admin/company configuration to be enabled.

---

## 6. Regularization
If a user misses a punch or is marked late due to technical issues, they can request **Regularization**:
-   User specifies the corrected `IN` and `OUT` times.
-   **HOD Approval**: Once approved, the system updates the `AttendanceRecord` and recalculates the status as `present` (marked as `is_regularized: true`).
