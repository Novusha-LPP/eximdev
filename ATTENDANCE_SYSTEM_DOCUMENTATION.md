# Attendance System - Comprehensive Documentation

**Last Updated:** April 7, 2026  
**System Version:** Production  
**Architecture:** Modular, Multi-Tenant, Policy-Driven

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Data Models](#core-data-models)
3. [Architecture & Services](#architecture-and-services)
4. [Attendance Processing Flow](#attendance-processing-flow)
5. [Policy Application Logic](#policy-application-logic)
6. [Leave Management System](#leave-management-system)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Business Rules & Constraints](#business-rules-and-constraints)
9. [File Reference Guide](#file-reference-guide)

---

## System Overview

The attendance system is a **policy-driven, multi-tenant architecture** that handles:

- **Real-time Punch Management**: IN/OUT recording with geo-fencing, IP validation, and method-based restrictions
- **Daily Attendance Calculation**: Auto-processing with smart status determination (present/absent/half-day/incomplete/leave/holiday/weekly-off)
- **Leave Management**: Multi-tier approval workflow with eligibility filtering and balance tracking
- **Policy Enforcement**: Configurable shifts, week-offs, holidays, and leave policies with team/designation-level assignments
- **Payroll Integration**: LOP calculation, overtime tracking, and month-wise locking
- **Audit & Compliance**: Immutable punch records, activity logging, and HOD-based authorization

### Key Principles

- **Raw Data Immutability**: Punch records cannot be edited or deleted
- **Policy-First Design**: All attendance determinations driven by resolved policies
- **Multi-Level Authorization**: HOD approval chains, ADMIN overrides, employee self-service
- **Real-Time Processing**: Daily record updates after each punch
- **Multi-Tenant Isolation**: Company-level data segregation

---

## Core Data Models

### 1. AttendanceRecord

**Purpose**: Daily processed attendance summary for reporting and payroll  
**File**: `server/model/attendance/AttendanceRecord.js`  
**Key Fields**:

```javascript
{
  employee_id,              // ObjectId reference
  company_id,               // Multi-tenant isolation
  department_id,
  shift_id,
  attendance_date,          // YYYY-MM-DD
  year_month,               // YYYY-MM (for quick filtering)
  
  // Computed Status
  status: 'present'|'half_day'|'absent'|'incomplete'|'leave'|'holiday'|'weekly_off',
  
  // Time Data
  first_in,                 // First punch IN time
  last_out,                 // Last punch OUT time
  total_work_hours,         // Decimal (e.g., 8.5)
  work_sessions: [          // Array of IN/OUT pairs
    { in: Date, out: Date, duration_hours: 8.5 }
  ],
  
  // Flags
  is_late,                  // Boolean (punch_in > shift_start + buffer)
  late_by_minutes,          // Integer
  is_early_exit,            // Boolean (last_out < shift_end - buffer)
  early_exit_minutes,       // Integer
  overtime_hours,           // Decimal (if shift.overtime_enabled)
  
  // Leave Context
  leave_application_id,     // If status='leave', link to LeaveApplication
  
  // Admin Override
  override_by_admin,        // Boolean
  admin_override_reason,    // String
  
  // Lock Status
  is_locked,                // For payroll processing
  locked_by,                // ADMIN user reference
  locked_at,                // Date
  
  // Processing Metadata
  processed_by: 'system'|'admin',
  processed_at,
  manually_adjusted         // Boolean (if admin edited)
}
```

**Unique Index**: `{ employee_id: 1, attendance_date: 1 }`  
**Constraints**: Cannot duplicate date for same employee per company

---

### 2. AttendancePunch

**Purpose**: Immutable raw punch events  
**File**: `server/model/attendance/AttendancePunch.js`  
**Key Fields**:

```javascript
{
  employee_id,
  company_id,
  
  punch_type: 'IN'|'OUT'|'BREAK_START'|'BREAK_END',
  punch_time,               // Exact datetime
  punch_date,               // YYYY-MM-DD (for fast date lookup)
  
  punch_method: 'web'|'mobile'|'biometric'|'manual',
  
  validation: {
    is_valid,               // Boolean (passed ValidationEngine checks)
    validation_messages: [] // Warnings/errors
  },
  
  location: {
    latitude, longitude,
    accuracy_meters,
    address
  },
  
  device_info: {
    device_type,           // web|mobile|tablet
    operating_system,
    browser,
    ip_address
  },
  
  created_by_admin,        // Boolean (HOD/ADMIN punching for employee)
  created_by_user_id,      // Who made the punch
  created_at,
  
  // CRITICAL: No update/delete allowed - immutable by design
}
```

**Immutability Enforcement**: `AttendancePunch.pre(['update', 'delete'])` throws SECURITY_EXCEPTION

**Uniqueness**: Multiple punches per day allowed (IN, OUT, BREAK_START, BREAK_END sequences)

---

### 3. ActiveSession

**Purpose**: Tracks currently active punch-in sessions  
**File**: `server/model/attendance/ActiveSession.js`  
**Key Fields**:

```javascript
{
  employee_id,
  company_id,
  
  punch_in_time,            // When punch IN was recorded
  session_date,             // YYYY-MM-DD
  
  session_status: 'active'|'closed'|'abandoned',
  expected_out_time,        // Based on shift.end_time
  
  closing_data: {
    actual_out_time,        // When punch OUT was recorded
    duration_hours,
    closed_at               // Timestamp of closure
  }
}
```

**Lifecycle**:  
`new (POST /punch IN) → active → closed (POST /punch OUT) → archived`

---

### 4. LeaveApplication

**Purpose**: Leave requests with multi-tier approval workflow  
**File**: `server/model/attendance/LeaveApplication.js`  
**Key Fields**:

```javascript
{
  employee_id,
  company_id,
  leave_policy_id,          // Which policy this uses
  
  // Dates
  from_date,
  to_date,
  total_days,               // Calculated including sandwiches
  is_half_day: false,
  half_day_session: 'first_half'|'second_half'|null,
  
  // Calculation Details
  applied_days,             // Actual working days (excludes offs/holidays)
  sandwich_days_count,      // Holiday/weekly-offs in range
  
  // Approval Chain
  approval_status: 'pending_hod'|'hod_approved_pending_admin'|'approved'|'rejected'|'cancelled',
  
  approval_chain: [
    {
      level: 1,
      approver_id,          // HOD user
      approver_role: 'HOD',
      approved_at,
      approval_comment
    },
    {
      level: 2,
      approver_id,          // ADMIN user
      approver_role: 'ADMIN',
      approved_at,
      approval_comment
    }
  ],
  
  current_approver_id,      // To whom it's pending
  
  // Balance Snapshot
  balance_snapshot: {
    opening_balance,
    used_before,
    pending_before,
    balance_after_approval   // Projected
  },
  
  // Metadata
  applied_by: 'employee'|'admin',
  applied_at,
  cancellation_reason,
  last_updated_at
}
```

**Status Flow**:
```
pending_hod → (HOD rejects) → rejected
           → (HOD approves) → hod_approved_pending_admin → (ADMIN rejects) → rejected
                                                        → (ADMIN approves) → approved
```

---

### 5. LeaveBalance

**Purpose**: Annual leave balance tracking per policy per employee  
**File**: `server/model/attendance/LeaveBalance.js`  
**Key Fields**:

```javascript
{
  employee_id,
  company_id,
  leave_policy_id,
  year,                     // FY year (e.g., 2025-26)
  
  // Core Balance
  opening_balance,          // Policy.annual_quota or 2000 for LWP
  used,                     // Total approved leave days deducted
  pending_approval,         // Under review (locked, not usable)
  
  // Adjustments
  carried_forward,          // From prior year
  encashed,                 // Paid in lieu
  lapsed,                   // Expired
  
  // Derived
  closing_balance,          // opening - used
  
  // Monthly Granularity
  monthly_breakup: [
    {
      month: 1,
      used: 0,
      pending: 0,
      closing: opening_balance
    },
    ...
  ]
}
```

**Unique Index**: `{ employee_id: 1, leave_policy_id: 1, year: 1 }`

**Auto-Creation**: When leave is applied, if no balance exists → create with default opening

---

## Architecture and Services

### Service Layer Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     HTTP Request Layer                       │
│  (attendanceRoutes.mjs, leaveRoutes.mjs, masterRoutes.mjs)  │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                  Controller Layer                            │
│ (attendance.controller.js, leave.controller.js, etc.)        │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│               Service/Engine Layer (Decision-Making)         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ AttendanceEngine.processDaily()                        │  │
│  │ - Core daily processing logic                         │  │
│  │ - Delegates to: PolicyResolver, WorkHoursCalculator, │  │
│  │   AttendanceStatusResolver                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ PolicyResolver.resolve*()                             │  │
│  │ - Cascading policy resolution (user → team → company) │  │
│  │ - Returns: Shift, WeekOffPolicy, HolidayPolicy        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ WorkingDayEngine.getSummaryInRange()                   │  │
│  │ - Calculates working days, holidays, weekly-offs      │  │
│  │ - Used by: LeaveCalculationService                    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ValidationEngine.validatePunch()                       │  │
│  │ - Security & geo-fence checks                         │  │
│  │ - Returns: {isValid, message}                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ LeaveCalculationService.calculateLeaveDays()           │  │
│  │ - Determines billable leave days (sandwich logic)      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ WorkHoursCalculator.calculateDailyWorkHours()         │  │
│  │ - Aggregates IN/OUT session pairs                      │  │
│  │ - Detects incomplete sessions                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ PayrollEngine.calculatePayableDays()                   │  │
│  │ - LOP, overtime, salary calculations                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│              Model/Database Layer                            │
│ (Mongoose, MongoDB collections)                             │
└──────────────────────────────────────────────────────────────┘
```

### Key Services Detailed

#### 1. **AttendanceEngine**

**File**: `server/services/attendance/AttendanceEngine.js`

**Core Method**: `processDaily(user, date, company, shift)`

**Responsibilities**:
- Fetches all day's punches from AttendancePunch
- Resolves applicable policies via PolicyResolver
- Calculates cumulative work hours via WorkHoursCalculator
- Checks for leave/holiday/weekly-off overrides
- Determines final status via AttendanceStatusResolver
- Updates or creates AttendanceRecord

**Status Determination Priority** (in order):
1. **Approved Leave** → status='leave'
2. **Holiday** → status='holiday'
3. **Weekly-Off** → status='weekly_off'
4. **Work Hours Thresholds**:
   - >= full_day_hours (e.g., 8) → 'present'
   - >= half_day_hours (e.g., 4) → 'half_day'
   - < minimum_hours (e.g., 3) → 'absent'
5. **Incomplete Session** (missing OUT punch) → 'incomplete' (only if hours < minimum)
6. **No Punches** → 'absent'

**Special Rules**:
- For **today**: Don't mark absent until 4 hours after shift start
- **Half-day overrides**: Reduce thresholds by 50% (4→2, 8→4)
- **Admin overrides**: If `processed_by='admin'`, skip automatic recalculation

---

#### 2. **PolicyResolver**

**File**: `server/services/attendance/PolicyResolver.js`

**Purpose**: Centralized policy resolution with cascading fallback pattern

**Resolution Pattern** (First Match Wins):
```
For User "John" in Team "Engineering":

resolveShift(john):
  1. Check if john.shift_id is set (user override) → Use it
  2. Check if john.teams[].shift_id is set → Use FIRST match
  3. Check for shift with applicability.teams.all=true → Use it
  4. Fallback: Default company shift

Same pattern applies to WeekOffPolicy, HolidayPolicy
```

**Key Methods**:

| Method | Returns | Purpose |
|--------|---------|---------|
| `resolveShift(user)` | Shift object | Get user's working hours, thresholds |
| `resolveWeekOffPolicy(user)` | WeekOffPolicy | Get weekly off rules |
| `resolveWeeklyOffStatus(date, policy)` | `{isOff, isHalfDay}` | Check if date is off |
| `resolveHolidayPolicy(user, year)` | HolidayPolicy | Get holiday dates |
| `resolveHolidayStatus(date, policy)` | `{isHoliday, name}` | Check if date is holiday |
| `resolveAll(user, year)` | `{shift, weekOff, holiday}` | Batch resolution |

---

#### 3. **WorkingDayEngine**

**File**: `server/services/attendance/WorkingDayEngine.js`

**Purpose**: Calculate working/non-working days in date ranges

**Key Method**: `getSummaryInRange(startDate, endDate, company, weekOffPolicy, holidayPolicy)`

**Returns**:
```javascript
{
  total_days: 10,           // Calendar days in range
  working_days: 8,          // Excludes weekends/week-offs/holidays
  weekly_off_days: 1,
  holiday_days: 1,
  half_day_weekly_offs: 0
}
```

**Used By**:
- LeaveCalculationService (to determine billable days)
- PayrollEngine (to calculate payable days)

---

#### 4. **ValidationEngine**

**File**: `server/services/attendance/ValidationEngine.js`

**Method**: `validatePunch(user, company, punchData)`

**Security Checks** (Sequential AND logic):
1. Is user punch-blocked?
2. Is punch method (web/mobile) allowed for user?
3. Is IP address whitelisted (if IP restriction enabled)?
4. Geo-fence validation (if enabled):
   - Calculate distance between punch location and office
   - Fail if distance > configured radius
5. Device validation (if strict mode enabled)

**Returns**:
```javascript
{
  isValid: boolean,
  message: "string with details",
  failed_checks: [...]
}
```

---

#### 5. **LeaveCalculationService**

**File**: `server/services/attendance/LeaveCalculationService.js`

**Key Method**: `calculateLeaveDays(options)`

**Input**:
```javascript
{
  fromDate,
  toDate,
  isHalfDay,
  halfDaySession: 'first_half'|'second_half',
  leavePolicy,              // Determines eligibility rules
  company,
  shift
}
```

**Process**:
1. Iterate from_date → to_date
2. For each day:
   - Skip weekly-offs (unless sandwich_rule_enabled)
   - Skip holidays (unless sandwich_rule_enabled)
   - Count working days
3. If half-day: reduce by 0.5
4. Return breakdown with sandwich details

**Output**:
```javascript
{
  totalDays: 5.5,
  appliedDays: 5,           // Working days only
  sandwichDays: 0.5,        // Holidays/offs within range
  details: [
    { date, dayType, isWorking, hoursFactor }
  ]
}
```

**Sandwich Rule**: When enabled in policy, holidays/weekly-offs WITHIN the leave range count as applied days (require approval but consume balance)

---

#### 6. **WorkHoursCalculator**

**File**: `server/services/attendance/WorkHoursCalculator.js`

**Method**: `calculateDailyWorkHours(punches, shift)`

**Process**:
1. Sort punches by punch_time
2. Group into IN/OUT session pairs:
   - First IN → first OUT = session 1
   - Next IN → next OUT = session 2, etc.
3. Calculate duration for each complete session
4. Detect incomplete session (IN without corresponding OUT)
5. Aggregate total hours

**Output**:
```javascript
{
  total_work_hours: 8.5,
  total_sessions: 2,
  sessions: [
    { in: Date, out: Date, duration_hours: 4.5 },
    { in: Date, out: Date, duration_hours: 4.0 }
  ],
  has_incomplete: false,
  incomplete_session: null,
  primary_in_time: Date,    // First IN
  primary_out_time: Date    // Last OUT
}
```

---

#### 7. **PayrollEngine**

**File**: `server/services/attendance/PayrollEngine.js`

**Method**: `calculatePayableDays(employee, company, yearMonth)`

**Calculation Formula**:
```
Working Days in Month = Count(present) + Count(half_day × 0.5) + Count(holidays if paid) + Count(weekly_offs if paid)

Payable Days = Working Days + Leave Days - LOP

LOP (Loss of Pay) Days = Working Days - (Present + Leave + HalfDay×0.5)

Overtime Hours = Sum(overtime from each attendance record in month)

Overtime Salary = Overtime Hours × Hourly Rate × Overtime Multiplier (e.g., 1.5×)

Per Day Salary = Monthly Salary / Payable Days
```

**Returns**:
```javascript
{
  month,
  payable_days: 26,
  working_days: 24,
  present_days: 20,
  leave_days: 4,
  half_day_count: 1,
  holiday_count: 2,
  weekly_off_count: 1,
  lop_days: 3,
  overtime_hours: 5,
  overtime_salary: 2500,
  per_day_salary: 1923.08
}
```

---

## Attendance Processing Flow

### Complete Punch → Attendance Pipeline

```
┌────────────────────────────────────────────────────────────────┐
│ USER ACTION: Punch IN/OUT (Web/Mobile/Biometric)              │
└────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────┐
│ POST /punch {punch_type, device_info, location}               │
└────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────┐
│ PUNCH CONTROLLER: punch()                                      │
│ - Determine target_employee (ADMIN/HOD can punch for others)  │
│ - Fetch company, shift, timezone config                        │
│ - Fetch user settings (punch restrictions, IP whitelist)      │
└────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────┐
│ CHECK PAYROLL LOCK:                                            │
│ - Is attendance locked for this month? → REJECT              │
│ - Lock prevents any punch or record changes                   │
└────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────┐
│ VALIDATION ENGINE: validatePunch()                            │
│ ✓ User punch blocked?                                         │
│ ✓ Method allowed (web/mobile/biometric)?                      │
│ ✓ IP whitelisted?                                             │
│ ✓ Geo-fence distance OK?                                      │
│ ✓ Device trusted?                                             │
│ → FAIL: Return error with reason                              │
│ → PASS: Continue                                              │
└────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────┐
│ SESSION MANAGEMENT:                                           │
│ IF punch_type = 'IN':                                         │
│   ├─ Check for existing active session (shouldn't exist)     │
│   ├─ Create new ActiveSession record                         │
│   └─ Set expected_out_time = shift_end_time                  │
│                                                               │
│ IF punch_type = 'OUT':                                       │
│   ├─ Find active session                                     │
│   ├─ Mark as 'closed', store actual_out_time                │
│   └─ Calculate session duration                             │
└────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────┐
│ PERSIST IMMUTABLE RECORD:                                     │
│ AttendancePunch.create({                                       │
│   employee_id, company_id, punch_type, punch_time, punch_date │
│   device_info, location, is_valid: true,                      │
│   created_by_user_id, created_at                              │
│ })                                                              │
│                                                                │
│ Note: This record is never modified/deleted                   │
└────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────┐
│ UPDATE USER STATUS:                                           │
│ user.current_status = 'in_office' (if IN) | 'out_office' (if OUT)
│ user.last_punch_time = punch_time                            │
└────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────┐
│ TRIGGER: processDailyAttendance()                             │
│ → Call AttendanceEngine.processDaily()                        │
└────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────┐
│ ATTENDANCE ENGINE: processDaily(user, punchDate, company, shift)
│                                                                │
│ STEP 1: Fetch all punches for the date                       │
│   AttendancePunch.find({                                       │
│     employee_id, punch_date: targetDate                       │
│   }).sort({punch_time: 1})                                    │
│                                                                │
│ STEP 2: Resolve active policies                              │
│   ├─ shift = PolicyResolver.resolveShift(user)               │
│   ├─ weekOffPolicy = PolicyResolver.resolveWeekOffPolicy()  │
│   └─ holidayPolicy = PolicyResolver.resolveHolidayPolicy()  │
│                                                                │
│ STEP 3: Calculate work hours from punches                     │
│   workData = WorkHoursCalculator.calculateDailyWorkHours(    │
│     punches, shift                                            │
│   )                                                            │
│   → Returns: {total_work_hours, sessions[], has_incomplete}   │
│                                                                │
│ STEP 4: Check overrides (Leave/Holiday/Weekly-Off)           │
│   ├─ leaveApprovals = LeaveApplication.find({                │
│   │    employee_id, from_date ≤ targetDate ≤ to_date,       │
│   │    approval_status: 'approved'                           │
│   │  })                                                        │
│   ├─ isHoliday = WorkingDayEngine.getHolidayInfo(...)        │
│   └─ isWeeklyOff = PolicyResolver.resolveWeeklyOffStatus(...) │
│                                                                │
│ STEP 5: Apply Shift Rules (if punches exist)                 │
│   ├─ Late Detection: first_punch_in > shift_start + buffer?   │
│   ├─ Early Exit: last_punch_out < shift_end - buffer?        │
│   ├─ Overtime: last_punch_out > shift_end + threshold?       │
│   └─ Set is_late, is_early_exit, overtime_hours              │
│                                                                │
│ STEP 6: Status Determination (Priority Order)                 │
│   IF approved_leave exists → status = 'leave'                │
│   ELSE IF isHoliday → status = 'holiday'                     │
│   ELSE IF isWeeklyOff → status = 'weekly_off'                │
│   ELSE {                                                       │
│     Use AttendanceStatusResolver.resolveStatus(workData)      │
│     Based on thresholds:                                      │
│       - total_work_hours >= full_day_hours → 'present'        │
│       - total_work_hours >= half_day_hours → 'half_day'       │
│       - total_work_hours < minimum_hours → 'absent'           │
│       - No punches + still in shift time → 'absent'           │
│   }                                                            │
│                                                                │
│ STEP 7: Overflow/Underflow Detection                         │
│   ├─ has_incomplete: missing OUT punch detected?              │
│   └─ If yes & hours < minimum → override status to 'incomplete'
│                                                                │
│ STEP 8: Create/Update AttendanceRecord                        │
│   Existing = AttendanceRecord.findOne({                       │
│     employee_id, attendance_date: targetDate                  │
│   })                                                           │
│                                                                │
│   IF Existing.processed_by = 'admin' → SKIP (don't overwrite) │
│   ELSE {                                                       │
│     AttendanceRecord.updateOne({                              │
│       status, total_work_hours, is_late, is_early_exit,      │
│       first_in, last_out, work_sessions,                      │
│       processed_by: 'system',                                 │
│       processed_at: now()                                     │
│     })                                                         │
│   }                                                            │
│                                                                │
│ Return: Updated AttendanceRecord                              │
└────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────┐
│ UPDATE DASHBOARD/UI:                                          │
│ - Return AttendanceRecord to frontend                         │
│ - Update user.current_status                                 │
│ - Show today's attendance status (present/half_day/absent)    │
└────────────────────────────────────────────────────────────────┘
```

---

## Policy Application Logic

### 1. Shift Policies

**File**: `server/model/attendance/Shift.js`

**Structure**:

```javascript
{
  company_id,
  shift_name: 'Morning',
  shift_code: 'M',
  shift_type: 'fixed'|'rotational'|'flexible',
  
  // Time Configuration
  start_time: "09:00",      // HH:MM format
  end_time: "18:00",
  is_cross_day: false,      // For night shifts (end_time < start_time)
  
  // Work Hour Thresholds
  full_day_hours: 8,        // Hours needed for 'present'
  half_day_hours: 4,        // Hours needed for 'half_day'
  minimum_hours: 3,         // Threshold for 'absent'
  
  // Grace & Buffer
  late_allowed_minutes: 0,  // Grace window before marking late
  early_leave_allowed_minutes: 0,  // Grace window for early exit
  
  // Flexible Window (if shift_type='flexible')
  flexible_window_start: "08:00",
  flexible_window_end: "10:00",   // Can IN anytime in window
  
  // Overtime Configuration
  overtime_threshold_minutes: 30,  // Work 30+ min extra = overtime
  
  // Break Configuration
  break_time_minutes: 60,
  
  // Sanity Checks
  max_session_hours: 18,    // Max continuous work (flag suspicious)
  
  // Night Shift Flag
  night_shift: false,
  
  // Applicability
  applicability: {
    teams: { all: true|false, list: [teamIds] },
    designations: { all, list: [designationIds] }
  }
}
```

**Application in AttendanceEngine**:
- Used to determine late detection, early exit, overtime
- Thresholds (full_day_hours, half_day_hours) compared against total_work_hours
- Break time subtracted from sessions (if configured)

---

### 2. Week-Off Policies

**File**: `server/model/attendance/WeekOffPolicy.js`

**Structure** - Fixed Pattern:

```javascript
{
  company_id,
  policy_name: '2 Days Off',
  policy_type: 'fixed',      // or 'monthly_count_1', 'monthly_count_2', etc.
  
  // Day-wise rules
  day_rules: [
    {
      day_index: 0,          // Sunday
      rules: [
        { week_number: 0, off_type: 'full_day'|'half_day'|'none' },
        // week_number: 0 = default for all weeks; 1-5 = specific week
        // If specific week exists, it overrides default
      ]
    },
    {
      day_index: 1,          // Monday
      rules: [
        { week_number: 0, off_type: 'full_day' }
      ]
    },
    // ... Sunday through Saturday
  ],
  
  applicability: {
    teams: { all, list }
  }
}
```

**Example - 2 Saturdays Off Per Month**:
```javascript
day_rules: [
  {
    day_index: 6,  // Saturday
    rules: [
      { week_number: 0, off_type: 'none' },      // Default: not off
      { week_number: 1, off_type: 'full_day' },  // 1st week: off
      { week_number: 3, off_type: 'full_day' }   // 3rd week: off
    ]
  },
  // ... other days
]
```

**Application in PolicyResolver**:
1. Get date's day_index (0-6) and week_number (1-5)
2. Find matching day_rule
3. Check specific week_number first; fallback to week_number=0
4. Return `{isOff: boolean, isHalfDay: boolean}`

**Integration**:
- Checked in AttendanceEngine.processDaily()
- If weekly-off: status='weekly_off' (unless employee worked)
- LeaveCalculationService skips weekly-offs when calculating leave days (unless sandwich rule enabled)

---

### 3. Holiday Policies

**File**: `server/model/attendance/HolidayPolicy.js`

**Structure**:

```javascript
{
  company_id,
  policy_name: '2026 Holiday Calendar',
  year,
  
  holidays: [
    {
      holiday_date: Date,
      holiday_name: 'Independence Day',
      holiday_type: 'national'|'company'|'optional',
      is_optional: false
    },
    // ... more holidays
  ],
  
  applicability: {
    teams: { all: true|false, list: [teamIds] },
    departments: { all, list: [deptIds] },
    branches: { all, list: [branchIds] },
    designations: { all, list: [designationIds] }
  }
}
```

**Multi-Tenant Cascades**:
- Check team applicability first
- Fall back to department
- Fall back to branch
- Fall back to designation
- Use first matching policy

**Holiday Types**:
- **National**: Paid for all, cannot work to apply leave
- **Company**: Paid for all, cannot work to apply leave
- **Optional**: Employee can choose to work/take leave

**Application**:
- WorkingDayEngine.getHolidayInfo() returns holiday status
- LeaveCalculationService excludes holidays when calculating billable leave days (sandwich rule exception)

---

### 4. Leave Policies

**File**: `server/model/attendance/LeavePolicy.js`

**Structure** (Comprehensive):

```javascript
{
  company_id,
  policy_name: 'Casual Leave',
  leave_type: 'casual'|'sick'|'earned'|'privilege'|'maternity'|'paternity'|'compensatory'|'lwp',
  leave_code: 'CL'|'SL'|'EL'|...
  
  // Quota Configuration
  annual_quota: 12,         // For non-LWP policies; LWP always 2000
  
  // Eligibility Rules
  eligibility: {
    employment_types: ['permanent', 'contract'],  // Must match employee
    min_service_months: 6,                        // At joining + months
    gender: 'any'|'male'|'female'                 // Gender restriction
  },
  
  // Accrual Rules (how balance grows)
  accrual: {
    accrual_type: 'monthly'|'quarterly'|'yearly'|'daily',
    accrual_rate: 2,                             // Per period
    accrual_start_date: 'joining'|'calendar_year'|'financial_year'
  },
  
  // Carry-Forward Rules
  carry_forward: {
    allowed: true,
    max_days: 10,                // Can carry max 10 from prior year
    encashment_allowed: true,    // Can be paid instead of carried
    encashment_percentage: 50    // Paid @ 50% of salary
  },
  
  // Application Rules
  rules: {
    min_days_per_application: 1,    // Minimum days per request
    max_days_per_application: 10,   // Maximum days per request
    max_consecutive_days: 20,       // Can't take > 20 consecutive
    advance_notice_days: 1,         // Must apply X days before
    sandwich_rule_enabled: true,    // Holidays/offs within leave count
    requires_document: false,        // Need doctor's cert, etc.
    clubbing_allowed_with: ['casual'], // Can combine with these
    half_day_allowed: true
  },
  
  // Approval Workflow
  approval_workflow: {
    levels: [
      { level: 1, approver_role: 'HOD', is_mandatory: true },
      { level: 2, approver_role: 'ADMIN', is_mandatory: false }
    ],
    auto_approve_if_balance: false  // Auto approve if balance > days?
  },
  
  // Salary Deduction Rules
  deduction_rules: {
    deduct_from_salary: true,
    affects_attendance_percentage: true,
    counted_as_absence: false
  }
}
```

**Leave Type Characteristics**:

| Type | Annual Quota | Eligibility | Notes |
|------|--------------|-------------|-------|
| Casual | 12 | All | Basic discretionary leave |
| Sick | 10 | All | Health/medical reasons |
| Earned | 24 | Permanent after 1yr | Benefit accrual |
| Privilege | 5 | Permanent | Special occasions |
| Maternity | 180 (per policy) | Female | After 3 months service |
| Paternity | 15 | Male | Within 1 year of birth |
| Compensatory | Varies | All | Worked on holiday/WO |
| LWP | 2000 (unlimited) | All | Unpaid leave (no balance deduction) |

---

## Leave Management System

### Leave Application Flow

```
┌──────────────────────────────────────────────────────────┐
│ Employee: View Leave Balance (GET /leave/balance)        │
├──────────────────────────────────────────────────────────┤
│ Controller: getBalance(employee_id)                      │
│                                                           │
│ STEP 1: Fetch all company leave policies                │
│ STEP 2: Filter by eligibility:                          │
│   ├─ employment_type match?                             │
│   ├─ gender match?                                      │
│   ├─ min_service_months passed?                         │
│   └─ user.special_leave_policies whitelist?             │
│                                                           │
│ STEP 3: For each eligible policy:                       │
│   ├─ Fetch LeaveBalance (or auto-create if missing)     │
│   ├─ Fetch approved LeaveApplications for year          │
│   ├─ Aggregate used days                                │
│   ├─ Calculate available = opening - used - pending    │
│   └─ Ensure available >= 0                              │
│                                                           │
│ STEP 4: Return formatted response                       │
│   [                                                       │
│     {                                                     │
│       leave_type: 'casual',                             │
│       name: 'Casual Leave',                             │
│       policy: { rules: {...}, eligibility: {...} },     │
│       opening_balance: 12,                              │
│       used: 3,                                          │
│       pending: 2,                                       │
│       available: 7,                                     │
│       balance: 7                                        │
│     },                                                   │
│     ...                                                  │
│   ]                                                       │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ Employee: Preview Leave (GET /leave/preview-application)│
├──────────────────────────────────────────────────────────┤
│ Params: from_date, to_date, is_half_day, half_day_session
│         leave_policy_id                                   │
│                                                           │
│ Controller: previewLeave(params)                         │
│                                                           │
│ STEP 1: Validate date range                             │
│   ├─ from_date <= to_date?                              │
│   └─ Not in past?                                       │
│                                                           │
│ STEP 2: Calculate leave days                            │
│   LeaveCalculationService.calculateLeaveDays({           │
│     fromDate, toDate, isHalfDay, leavePolicy,           │
│     company, shift                                       │
│   })                                                      │
│   → Returns: totalDays, appliedDays, sandwichDays, ...  │
│                                                           │
│ STEP 3: Validate policy rules                           │
│   ├─ totalDays >= min_days_per_application?             │
│   ├─ totalDays <= max_days_per_application?             │
│   ├─ totalDays <= max_consecutive_days?                 │
│   ├─ Advance notice satisfied?                          │
│   └─ Return violations if any                           │
│                                                           │
│ STEP 4: Fetch current balance                           │
│   balance = LeaveBalance.findOne({...})                 │
│   → available = opening - used - pending               │
│                                                           │
│ STEP 5: Calculate projected balance                     │
│   projected = available - totalDays                      │
│   → Alert if negative                                    │
│                                                           │
│ STEP 6: Return preview                                  │
│   {                                                       │
│     totalDays: 5,                                       │
│     appliedDays: 4,      // Excluding offs/holidays     │
│     sandwichDays: 1,     // Offs/holidays within range  │
│     current_balance: 7,                                 │
│     projected_balance: 2,                               │
│     violations: [],                                     │
│     can_apply: true                                     │
│   }                                                       │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ Employee: Apply Leave (POST /leave/apply)               │
├──────────────────────────────────────────────────────────┤
│ Payload: { from_date, to_date, leave_policy_id,         │
│            is_half_day, half_day_session, reason }       │
│                                                           │
│ Controller: applyLeave(payload)                         │
│                                                           │
│ STEP 1: Re-validate (same as preview)                   │
│                                                           │
│ STEP 2: Check balance sufficiency                       │
│   balance = LeaveBalance.findOne({...})                 │
│   IF available < totalDays → REJECT                     │
│                                                           │
│ STEP 3: Create LeaveApplication                         │
│   const app = LeaveApplication.create({                 │
│     employee_id, company_id, leave_policy_id,           │
│     from_date, to_date, total_days,                     │
│     is_half_day, half_day_session,                      │
│     applied_days, sandwich_days_count,                  │
│     approval_status: 'pending_hod',    // → HOD first    │
│     current_approver_id: employee.hod,                  │
│     balance_snapshot: {                                  │
│       opening_balance,                                  │
│       used_before,                                      │
│       pending_before,                                  │
│       balance_after_approval: available - totalDays      │
│     },                                                  │
│     applied_at: now(),                                  │
│     applied_by: 'employee'                              │
│   })                                                     │
│                                                           │
│ STEP 4: Update LeaveBalance (lock pending days)         │
│   LeaveBalance.updateOne({                              │
│     pending_approval: pending + totalDays  // Lock them  │
│   })                                                     │
│                                                           │
│ STEP 5: Create activity log                             │
│   ActivityLog.create({                                  │
│     action: 'APPLY_LEAVE',                              │
│     details: `Applied ${totalDays} days of ${leave_type}`
│   })                                                     │
│                                                           │
│ STEP 6: Notify HOD (webhook/email)                      │
│   Pending approvals count++; send notification           │
│                                                           │
│ Return: LeaveApplication with approval_status           │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ HOD: Approve/Reject Leave (POST /leave/approve/:appId)  │
├──────────────────────────────────────────────────────────┤
│ Payload: { approval_status, comment }                    │
│                                                           │
│ Authorization: HOD must have employee in team            │
│                                                           │
│ STEP 1: Validate HOD authorization                      │
│   hodTeams = Team.find({ hodId: hod._id })              │
│   IF !hodTeams contain employee → REJECT                │
│                                                           │
│ STEP 2: Update LeaveApplication                         │
│   IF approval_status = 'rejected':                       │
│     ├─ Update app.approval_status = 'rejected'          │
│     ├─ app.current_approver_id = null                   │
│     └─ Release pending balance                          │
│                                                           │
│   IF approval_status = 'approved_hod':                   │
│     ├─ Check if ADMIN approval needed                   │
│     ├─ IF policy.approval_workflow.level 2 required:     │
│     │    ├─ app.approval_status = 'hod_approved_pending_admin'
│     │    └─ app.current_approver_id = ADMIN              │
│     └─ ELSE:                                             │
│          ├─ app.approval_status = 'approved'             │
│          └─ → Proceed to STEP 3                          │
│                                                           │
│ STEP 3: If fully approved → Update LeaveBalance         │
│   LeaveBalance.updateOne({                              │
│     used: used + totalDays,      // Deduct from balance  │
│     pending_approval: pending - totalDays  // Unlock     │
│   })                                                     │
│                                                           │
│ STEP 4: Update AttendanceRecords for affected dates     │
│   For each date in [from_date, to_date]:                │
│     AttendanceRecord.updateOne({                        │
│       employee_id, attendance_date: date,               │
│       status: is_half_day ? 'half_day' : 'leave',      │
│       leave_application_id: app._id                     │
│     })                                                   │
│                                                           │
│ STEP 5: Audit logging                                   │
│   ActivityLog.create({...})                             │
│                                                           │
│ STEP 6: Notify affected parties                         │
│   - If rejected: notify employee                        │
│   - If HOD approved: notify admin (if needed)           │
│   - If fully approved: notify employee                  │
└──────────────────────────────────────────────────────────┘
```

### Leave Cancellation Flow

```
├─ Employee/ADMIN: POST /leave/cancel/:appId
│
├─ Validate:
│  ├─ Is app status = 'approved'? (Can't cancel pending/rejected)
│  ├─ Authorization check (only employee/admin/hod can cancel)
│  └─ Cancellation allowed within X days of leave?
│
├─ Update LeaveApplication:
│  ├─ approval_status = 'cancelled'
│  └─ Store cancellation_reason, cancelled_by, cancelled_at
│
├─ Restore LeaveBalance:
│  └─ used: used - totalDays  (Give days back)
│
├─ Update AttendanceRecords:
│  └─ For affected dates, recalculate status
│     (May change from 'leave' to 'present'/'absent')
│
└─ Notify parties (employee, HOD, admin)
```

---

## API Endpoints Reference

### Attendance Endpoints

**File**: `server/routes/attendance/attendanceRoutes.mjs`

#### Punch Management

```
POST /punch
Body: {
  punch_type: 'IN'|'OUT',
  device_type: 'web'|'mobile'|'tablet',
  location: { latitude, longitude, accuracy_meters },
  ip_address: "192.168.1.1",
  punch_method: 'web'|'biometric'|'manual'
}
Response: {
  success: boolean,
  message: string,
  attendance_record: AttendanceRecord,
  session_status: 'active'|'closed'
}
Authorization: Any user (can punch self); HOD/ADMIN can punch for others
```

#### Today's Attendance

```
GET /my-today
Query: (optional) employee_id (admin/hod can view others)
Response: {
  attendance: AttendanceRecord,
  session_status: 'active'|'closed',
  current_status: 'in_office'|'out_office',
  work_hours_so_far: 5.5,
  shift: Shift
}
```

#### Attendance History

```
GET /history
Query: {
  employee_id: (optional, for admin),
  from_date: Date,
  to_date: Date,
  month: number (optional),
  year: number (optional),
  status: 'present'|'absent'|'leave'|... (optional),
  limit: 50,
  skip: 0
}
Response: {
  total: 120,
  records: AttendanceRecord[],
  summary: {
    presents: 18,
    absents: 2,
    half_days: 1,
    leaves: 4,
    holidays: 5,
    weekly_offs: 2
  }
}
```

#### Regularization Request

```
POST /regularization
Body: {
  attendance_date: Date,
  status: 'present'|'absent'|'half_day',
  first_in: DateTime (optional),
  last_out: DateTime (optional),
  reason: "string"
}
Response: {
  success: boolean,
  regularization_id: ObjectId
}
```

#### Approve Regularization

```
POST /regularization/approve/:id
Body: { approval_status: 'approved'|'rejected', comment: string }
Authorization: HOD/ADMIN only
```

#### Manual Daily Calculation

```
POST /calculate-daily
Body: { employee_id, attendance_date }
Authorization: ADMIN only
Purpose: Force recalculation of specific day (after manual punch edit)
```

#### Lock Month Attendance

```
POST /lock
Body: { company_id, month, year }
Authorization: ADMIN only
Effect: Prevents any attendance changes for that month
```

#### Payroll Data

```
GET /payroll
Query: {
  month: number,
  year: number,
  company_id: (optional),
  employee_id: (optional)
}
Response: {
  payable_days: 26,
  working_days: 24,
  present_days: 20,
  leave_days: 4,
  half_day_count: 1,
  lop_days: 3,
  overtime_hours: 5,
  overtime_salary: 2500
}
```

#### Team Report

```
GET /team-report
Query: {
  from_date: Date,
  to_date: Date,
  department_id: (optional),
  month: number,
  year: number
}
Response: {
  summary: {
    total_employees: 50,
    presents: 45,
    absents: 2,
    on_leave: 3,
    ...
  },
  department_wise: [
    {
      department: "Engineering",
      total: 25,
      status_breakdown: {}
    },
    ...
  ],
  employee_wise: AttendanceRecord[]
}
Authorization: HOD (own team) / ADMIN (all)
```

---

### Leave Endpoints

**File**: `server/routes/attendance/leaveRoutes.mjs`

#### Get Leave Balance

```
GET /balance
Query: { employee_id: (optional, for admin) }
Response: [
  {
    leave_type: 'casual',
    name: 'Casual Leave',
    policy: LeavePolicy (excerpt),
    opening_balance: 12,
    used: 3,
    pending: 2,
    available: 7,
    balance: 7,
    monthly_breakup: [...]
  },
  ...
]
```

#### Get Leave Applications

```
GET /applications
Query: {
  employee_id: (optional),
  status: 'pending_hod'|'hod_approved_pending_admin'|'approved'|... (optional),
  from_date: Date (optional)
}
Response: {
  total: 15,
  applications: LeaveApplication[]
}
```

#### Preview Leave Application

```
GET /leave/preview-application
Query: {
  from_date: Date,
  to_date: Date,
  leave_policy_id: ObjectId,
  is_half_day: false,
  half_day_session: 'first_half'|'second_half'|null
}
Response: {
  totalDays: 5,
  appliedDays: 4,
  sandwichDays: 1,
  current_balance: 7,
  projected_balance: 2,
  violations: [],
  can_apply: true
}
```

#### Apply Leave

```
POST /apply
Body: {
  from_date: Date,
  to_date: Date,
  leave_policy_id: ObjectId,
  is_half_day: false,
  half_day_session: null,
  reason: "string"
}
Response: {
  success: boolean,
  application_id: ObjectId,
  message: "Leave applied successfully. Awaiting HOD approval."
}
```

#### Cancel Leave

```
POST /cancel/:id
Body: { reason: string }
Authorization: Employee (own), HOD (team member), ADMIN (any)
Effect: Refunds leave days to balance
```

#### Admin Update Balance

```
POST /admin-update-balance/:employee_id
Body: {
  leave_policy_id: ObjectId,
  opening_balance: 15,
  used: 3,
  pending: 1
}
Authorization: ADMIN only
Audit: Logged with reason
```

---

### Policy Endpoints

**File**: `server/routes/attendance/masterRoutes.mjs`

#### Shift CRUD

```
GET    /shifts                      → List all shifts
POST   /shifts                      → Create shift
PUT    /shifts/:id                  → Update shift
DELETE /shifts/:id                  → Delete shift

GET    /shifts/:company_id          → Company's shifts
```

#### Week-Off Policy CRUD

```
GET    /weekoff-policies            → List all
POST   /weekoff-policies            → Create
PUT    /weekoff-policies/:id        → Update
DELETE /weekoff-policies/:id        → Delete
```

#### Holiday Policy CRUD

```
GET    /holiday-policies            → List all
POST   /holiday-policies            → Create
PUT    /holiday-policies/:id        → Update
POST   /holiday-policies/:id/holidays → Add holiday to calendar
DELETE /holiday-policies/:id/holidays/:date → Remove holiday
```

#### Leave Policy CRUD

```
GET    /leave-policies              → List all
POST   /leave-policies              → Create
PUT    /leave-policies/:id          → Update
DELETE /leave-policies/:id          → Delete
```

#### Assign Policies to User

```
PUT /users/:userId/policies
Body: {
  shift_id: ObjectId (optional),
  weekoff_policy_id: ObjectId (optional),
  holiday_policy_id: ObjectId (optional),
  leave_policy_ids: [ObjectIds] (optional)
}
Effect: Creates user-level overrides; future resolutions use these first
```

#### Bulk Assign Policies

```
POST /bulk-assign-policies
Body: {
  user_ids: [ObjectIds],
  shift_id: ObjectId (optional),
  weekoff_policy_id: ObjectId (optional),
  holiday_policy_id: ObjectId (optional),
  leave_policy_ids: [ObjectIds] (optional)
}
Authorization: ADMIN only
```

---

## Business Rules & Constraints

### Immutability & Security

| Rule | Implementation | Rationale |
|------|-----------------|-----------|
| **Punch Immutability** | `AttendancePunch.pre(['update', 'delete'])` throws SECURITY_EXCEPTION | Audit trail integrity; cannot tamper with raw data |
| **Unique Attendance per Date** | Unique index `{employee_id: 1, attendance_date: 1}` | One record per day max |
| **Admin Override Protection** | If `processed_by='admin'`, skip system recalculation | Preserve manual edits from automatic overwrites |
| **Payroll Lock** | `PayrollLock` prevents punches & attendance changes | Freeze data for payroll processing |
| **HOD Authorization** | HOD can only access/approve for team members | Role-based data access control |

### Attendance Determination

| Rule | Logic | Example |
|------|-------|---------|
| **Today Absent Delay** | Don't mark absent until 4h after shift start | Shift 9AM: mark absent after 1PM only |
| **Late Detection** | `punch_in > shift_start + grace_buffer` | Shift 9AM, grace 0: IN @ 9:15 = late |
| **Early Exit** | `last_punch_out < shift_end - grace_buffer` | Shift 6PM, grace 0: OUT @ 5:45 = early exit |
| **Incomplete Session** | Missing OUT punch + hours < minimum | IN @ 9AM, no OUT: status='incomplete' if <3h |
| **Overtime Tracking** | `last_punch > shift_end + threshold` | Shift 6PM, threshold 30min: OUT @ 6:35 = 5min overtime |

### Hour Thresholds

| Threshold | Default | Configurable | Used For |
|-----------|---------|--------------|----------|
| `full_day_hours` | 8 | Per Shift | Work >= 8h → 'present' |
| `half_day_hours` | 4 | Per Shift | 4h <= work < 8h → 'half_day' |
| `minimum_hours` | 3 | Per Shift | Work < 3h → 'absent' |
| **Adjustment for Half-Day Leaves**: Divide thresholds by 2 when half-day leave/OFF active | 4h → 2h, 8h → 4h | Dynamic |

### Leave Rules

| Rule | Implementation | Example |
|------|-----------------|---------|
| **Sandwich Rule** | Holidays/weekly-offs WITHIN leave range count if enabled | Leave Fri-Mon (Sat-Sun OFF): applies 2 OFF days; total = 4 days |
| **Advance Notice** | Must apply X days before | Policy requires 1 day; can't apply for today |
| **Balance Sufficiency** | Available >= application days | Can't apply if projected balance < 0 |
| **Min/Max Per Application** | Enforce policy limits | Policy: min 1, max 10 days per request |
| **Max Consecutive** | Can't take > policy limit in row | Policy: max 20 consecutive days |
| **Approval Chain** | Multi-level: HOD → ADMIN | Some policies require both; some only HOD |
| **Cancellation Refund** | Restore days to balance | Approved leave cancelled → balance increases |
| **LWP No Deduction** | LWP is not counted against balance | Can take unlimited LWP |

### Data Segregation

| Level | Isolation Method | Example |
|-------|------------------|---------|
| **Multi-Tenant** | `company_id` in every document | Company A employees don't see Company B data |
| **HOD Team Scope** | HOD only accesses team members | HOD can't punch for non-team employees |
| **Admin Global** | ADMIN sees all within company | ADMIN can override any employee's attendance |
| **Employee Self** | Users see only own data | Employee can't view colleague's leaves (unless HOD) |

---

## File Reference Guide

### Core Models

| Model | File | Purpose |
|-------|------|---------|
| AttendanceRecord | `server/model/attendance/AttendanceRecord.js` | Daily attendance summary |
| AttendancePunch | `server/model/attendance/AttendancePunch.js` | Raw punch events (immutable) |
| ActiveSession | `server/model/attendance/ActiveSession.js` | Current punch-in session |
| LeaveApplication | `server/model/attendance/LeaveApplication.js` | Leave requests & approvals |
| LeaveBalance | `server/model/attendance/LeaveBalance.js` | Annual leave balance |
| Shift | `server/model/attendance/Shift.js` | Shift configurations |
| WeekOffPolicy | `server/model/attendance/WeekOffPolicy.js` | Weekly off patterns |
| HolidayPolicy | `server/model/attendance/HolidayPolicy.js` | Holiday calendars |
| LeavePolicy | `server/model/attendance/LeavePolicy.js` | Leave type rules |
| Holiday | `server/model/attendance/Holiday.js` | Legacy holiday list |
| RegularizationRequest | `server/model/attendance/RegularizationRequest.js` | Manual attendance correction requests |
| PayrollLock | `server/model/attendance/PayrollLock.js` | Payroll freeze periods |
| ActivityLog | `server/model/attendance/ActivityLog.js` | Audit trail |

### Controllers

| Controller | File | Endpoints |
|-----------|------|-----------|
| Attendance | `server/controllers/attendance/attendance.controller.js` | Punch, today, history, regularization, lock, payroll |
| Leave | `server/controllers/attendance/leave.controller.js` | Balance, applications, preview, apply, cancel |
| HOD | `server/controllers/attendance/HOD.controller.js` | Dashboard, team report, approvals |
| Policy | `server/controllers/attendance/policy.controller.js` | Shift, week-off, holiday, leave CRUD |
| Master | `server/controllers/attendance/master.controller.js` | Organizations, companies, users, policy assignment |

### Services (Business Logic)

| Service | File | Responsibility |
|---------|------|------------------|
| AttendanceEngine | `server/services/attendance/AttendanceEngine.js` | Core daily processing (2000+ lines) |
| PolicyResolver | `server/services/attendance/PolicyResolver.js` | Cascading policy resolution |
| WorkingDayEngine | `server/services/attendance/WorkingDayEngine.js` | Day calculations in ranges |
| LeaveCalculationService | `server/services/attendance/LeaveCalculationService.js` | Leave day aggregation with sandwich rule |
| WorkHoursCalculator | `server/services/attendance/WorkHoursCalculator.js` | Session-based hour calculation |
| AttendanceStatusResolver | `server/services/attendance/AttendanceStatusResolver.js` | Status determination logic |
| ValidationEngine | `server/services/attendance/ValidationEngine.js` | Punch validation (geo-fence, IP, method) |
| PayrollEngine | `server/services/attendance/PayrollEngine.js` | Payroll calculations (LOP, OT) |
| QueryBuilder | `server/services/attendance/QueryBuilder.js` | Dynamic MongoDB query construction |

### Routes

| Route File | Port/Module | Endpoints Covered |
|-----------|-----------|-------------------|
| attendanceRoutes.mjs | `/attendance/` | Punch, history, regularization, lock, payroll, team-report |
| leaveRoutes.mjs | `/leave/` | Balance, applications, preview, apply, cancel |
| masterRoutes.mjs | `/master/` | Shifts, policies, holiday-policies, leave-policies, assignments |
| hodRoutes.mjs | `/hod/` | Dashboard, team-report, approvals |

---

## Key Business Logic Highlights

### 1. Why Punch Immutability?

- **Audit Compliance**: Regulatory requirement for tamper-proof attendance records
- **Forensic Trail**: Can trace exact punch times for disputes
- **Data Integrity**: Prevents retroactive manipulation (e.g., punching out early last week)
- **Trade Compliance**: Many jurisdictions require immutable time records

### 2. Why Policy Cascading?

- **Operational Flexibility**: Company-wide defaults with team/individual exceptions
- **Multi-Tenant Support**: Large enterprises have different policies per division
- **Admin Override**: Can manually assign special policies without code changes

### 3. Why Sandwich Rule?

- **Employee Fairness**: Don't penalize leave usage around holidays
- **Example**: Apply leave Fri-Mon (Sat-Sun = weekly-off): should be 2 days of leave, not 4
- **Binary**: Either enabled per policy or disabled; no middle ground

### 4. Why HOD Pre-Approval?

- **Manager Accountability**: HOD knows who's on leave before it's final
- **Operational Planning**: HOD can reject if too many team members away
- **Audit Trail**: Clear approval chain for payroll

### 5. Why LWP = Unlimited?

- **Fallback Leave Type**: Always available, balance never runs out
- **Default Value**: 2000 days as practical infinite quota
- **No Salary Deduction**: Employee taken at LOP (loss of pay) rate
- **Policy Bypass**: Used when paid leave exhausted

---

## Summary

The attendance system is a **comprehensive, enterprise-grade solution** with:

- ✅ **Real-time punch processing** with validation & geo-fencing
- ✅ **Automatic daily attendance calculation** with policy application
- ✅ **Multi-tier leave approval workflow** (HOD → ADMIN)
- ✅ **Flexible policy assignment** (company-wide defaults with individual overrides)
- ✅ **Immutable audit trail** (punches cannot be edited/deleted)
- ✅ **Payroll integration** (LOP, overtime, month-wise locking)
- ✅ **Multi-tenant isolation** (company-level data segregation)
- ✅ **Role-based access control** (Employee/HOD/ADMIN)

**Total System Size**: ~50K lines of code spanning models, controllers, services, and routes.  
**Database**: MongoDB with 15+ collections + indexes for performance.  
**Dependencies**: moment-timezone,mongoose, express, cron (for scheduled tasks).

---

**Document Version**: 1.0  
**Last Reviewed**: April 7, 2026  
**Maintained By**: Development Team
