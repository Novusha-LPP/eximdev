Here is your **modified markdown in the same format**, with corrected logic for **PL + Unpaid leave** and proper balance handling:

---

# Leave Balance Logic (Updated Implementation)

This document explains how leave balances are stored, updated, and displayed in the Attendance module with corrected logic for Paid Leave (PL) and Unpaid Leave (LWP).

---

## 1. Core Model

Each employee has one LeaveBalance record per leave policy per year.

Main fields used by current logic:

* opening_balance: initial assigned quota for that year.
* used: approved paid leave already consumed.
* pending_approval: paid leave days currently in pending workflow (reserved, not yet consumed).
* closing_balance: actual remaining paid leave balance (excluding pending).
* leave_policy_id, leave_type, company_id, employee_id, year: identity keys.

Unique key at DB level:

* employee_id + company_id + leave_policy_id + year

---

## 2. Balance Formula

### Actual Balance (stored)

```text
closing_balance = opening_balance - used
```

### Available Balance (for UI / application logic)

```text
available_balance = closing_balance - pending_approval
```

Example:

* opening_balance = 25

* used = 5

* pending_approval = 3

* closing_balance = 25 - 5 = 20

* available_balance = 20 - 3 = 17

Note:

* closing_balance never goes negative.
* pending_approval only blocks leave, it does not reduce actual balance.

---

## 3. Lifecycle Behavior

### Apply Leave

* For Paid Leave (PL):

  * pending_approval increases by requested PL days.
  * closing_balance is NOT reduced.
* If requested leave exceeds available PL:

  * Remaining days are treated as Unpaid Leave (LWP).
* For Unpaid Leave (LWP):

  * No impact on closing_balance.

---

### Approve Leave

* pending_approval decreases.
* used increases for approved PL days.
* closing_balance is recalculated:

```text
closing_balance = opening_balance - used
```

* Unpaid leave is recorded separately (no balance impact).
* attendance records are updated for leave dates.

---

### Reject/Cancel Leave

* pending_approval decreases.
* No change to used or closing_balance.

---

## 4. Admin Manual Update Rules

Endpoint:

* POST /api/leave/admin-update-balance/:employee_id

Payload supports:

* leave_policy_id
* opening_balance
* used
* pending or pending_approval

### Validation Rules:

* For Paid Leave (PL):

```text
pending_approval <= (opening_balance - used)
```

* Update is rejected if pending exceeds actual remaining balance.

* For Unpaid Leave (LWP):

  * No balance validation required.

---

## 5. Retrieval and UI Mapping

Different parts of the app may send legacy names (pending, consumed), so the profile response normalizes balances for consistent UI:

* used = used or consumed
* pending = pending_approval (also returned as pending_approval)

User profile leave tile values:

* total shown from opening_balance
* used shown from used
* pending shown from pending_approval
* available shown as:

```text
closing_balance - pending_approval
```

---

## 6. Leave Type Handling (PL + LWP)

When applying leave:

* PL is always consumed first.
* If PL is insufficient:

  * Remaining days are automatically marked as Unpaid Leave (LWP).

Example:

* available PL = 2
* requested leave = 5

Result:

* PL = 2
* LWP = 3

---

## 7. Why Negative Balance Issue is Resolved

Previously:

```text
closing_balance = opening_balance - used - pending_approval
```

This caused negative values because pending leave was treated as already consumed.

Now:

* closing_balance only reflects actual used leave.
* pending_approval is treated separately as reserved leave.
* Validation ensures pending never exceeds available balance.

Result:

* No negative closing_balance.
* Clear separation of used vs pending vs available.

---

## 8. Key Principle

> Used = confirmed consumption
> Pending = reserved (not yet consumed)
> Closing balance = actual remaining leave

---
