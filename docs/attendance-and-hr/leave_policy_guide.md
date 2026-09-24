# Leave Policy Management in Attendance Module

This document explains how leave policies are structured, how they are matched to employees, and the various rules that govern leave applications.

## 1. Overview
A **Leave Policy** is a set of rules that defines a specific type of leave (e.g., Casual, Sick, Privilege) for a company. It determines who is eligible, how many days are granted, and the restrictions for applying.

---

## 2. Policy Configuration

### Basic Information
- **Leave Type**: Category of leave (Casual, Sick, Earned, Privilege, Maternity, Paternity, Compensatory, or LWP/Unpaid).
- **Annual Quota**: The total number of days granted to an employee per year (default is typically 24).
- **Leave Code**: A unique identifier used for reporting and payroll (e.g., "CL" for Casual Leave).

### Eligibility Rules
Policies are automatically filtered for employees based on these criteria:
- **Employment Type**: Policies can be restricted to specific types like "Permanent", "Probation", or "Contractor".
- **Gender**: Specific policies like Maternity or Paternity leave are restricted by the employee's gender.
- **Service Months**: Minimum months of service required before the employee can avail of this leave.
- **Probation**: Defines if an employee can apply for this leave type while still in their probation period.

---

## 3. Application Rules (Usage Restrictions)

Each policy defines strict boundaries for when and how an employee can apply:

| Rule | Description |
| :--- | :--- |
| **Min/Max Days** | Smallest and largest number of days allowed in a single application. |
| **Advance Notice** | Number of days in advance an employee must submit the request. |
| **Backdated Allowed** | Whether an employee can apply for leave for a date that has already passed. |
| **Sandwich Rule** | If enabled, holidays/weekends falling between leave days are also counted as leave. |
| **Document Required** | If enabled, the system forces the user to upload an attachment (e.g., medical certificate for Sick Leave) if the duration exceeds a set number of days. |
| **Half-Day Allowed** | Whether the employee can apply for just a morning or afternoon session (0.5 days). |

---

## 4. Accrual and Carry Forward

Policies define how leave is earned and what happens at the end of the year:

- **Accrual Type**: Leaves can be granted upfront (Yearly) or earned over time (Monthly/Quarterly).
- **Carry Forward**: Defines if unused leaves move to the next year.
- **Max Carry Forward**: Limits the number of days that can be transferred.
- **Encashment**: Determines if unused leaves can be converted to salary at the end of the year.

---

## 5. Deduction and Impact

Leave policies communicate with the Payroll and Attendance engines through **Deduction Rules**:

1.  **Deduct from Salary**: If true, the leave is treated as "Loss of Pay" (LOP).
2.  **Attendance Percentage**: Defines if being on this leave affects the employee's overall attendance score.
3.  **Counted as Absence**: Defines if the leave should be flagged as an automated "Absent" event in reports.

---

## 6. How it works in practice (Technical Flow)

1.  **Policy Retrieval**: When a user opens the "Apply Leave" page, the system fetches all **Active** policies for their company.
2.  **Eligibility Filter**: The backend compares the user's profile (Gender, Type, Join Date) against the policy's `eligibility` block.
3.  **Balance Check**: The system identifies the associated `LeaveBalance` for that policy to show "Available Days".
4.  **Submission Validation**: When the "Submit" button is clicked, the system validates the `from_date` and `to_date` against the policy's `rules` (e.g., checking if the 3-day advance notice was given).
5.  **Approval Workflow**: Once submitted, the policy's configured `approval_workflow` (e.g., HOD Level 1 -> HR Level 2) determines who receives the notification for approval.
