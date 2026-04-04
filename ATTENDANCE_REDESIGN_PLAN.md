# Attendance System Redesign: Work Hours Based Evaluation

## Overview

Replace strict timing penalties with **total working hours evaluation**. Status is determined by total hours worked per day, not by arrival/departure times. Late/early tracking remains for reporting but does not affect attendance status.

---

## Phase 1: Data Model Updates

### 1.1 Shift Schema Changes

**File:** `server/model/attendance/Shift.js`

#### Remove:
- ❌ `grace_in_minutes` 
- ❌ `grace_out_minutes`
- ❌ `auto_checkout_enabled`
- ❌ `auto_checkout_time`

#### Add:
- ✅ `flexible_window_start` (optional, for reporting only)
- ✅ `flexible_window_end` (optional, for reporting only)
- ✅ Keep: `full_day_hours`, `half_day_hours`, `minimum_hours`
- ✅ Keep: `start_time`, `end_time` (as reference only, not enforced)

#### Company-Level Config Changes
**File:** `server/model/attendance/Company.js`

Remove from `attendance_config`:
- ❌ `grace_in_minutes`
- ❌ `grace_out_minutes`
- ❌ `late_mark_policy` (enum 'strict', 'grace', 'flexible')
- ❌ `late_deduction_enabled`
- ❌ `lates_per_deduction`

Add:
- ✅ `work_hours_rounding` (15min | 30min | hour)
- ✅ `max_session_hours` (default 18 for sanity check)
- ✅ `break_counted_in_hours` (boolean, default false)

---

### 1.2 AttendanceRecord Schema Changes

**File:** `server/model/attendance/AttendanceRecord.js`

#### Status Enum Update:
```javascript
// OLD:
enum: ['present', 'absent', 'half_day', 'late', 'leave', 'holiday', 'weekly_off', 'on_duty']

// NEW:
enum: ['present', 'absent', 'half_day', 'incomplete', 'leave', 'holiday', 'weekly_off', 'on_duty']
```

Replace `'late'` with `'incomplete'`.

#### New Fields (for tracking, not penalizing):
```javascript
is_late: { type: Boolean, default: false },            // Still tracked
late_by_minutes: { type: Number, default: 0 },         // Still tracked
is_early_exit: { type: Boolean, default: false },      // Still tracked
early_exit_minutes: { type: Number, default: 0 },      // Still tracked
```

#### Remove:
- ❌ `is_auto_punch_out`
- ❌ `is_early_in`
- ❌ `early_in_minutes`
- ❌ `early_in_reason`

#### Add:
```javascript
work_sessions: [{
  session_number: Number,
  punch_in_time: Date,
  punch_out_time: Date,
  duration_hours: Number,
  is_incomplete: Boolean  // true if OUT is missing
}],

total_work_sessions: { type: Number, default: 0 },
has_incomplete_session: { type: Boolean, default: false },
```

---

### 1.3 New Model: ActiveSession

**File:** `server/model/attendance/ActiveSession.js`

Track ongoing punch sessions to prevent "multiple IN without OUT".

```javascript
{
  employee_id: ObjectId,
  company_id: ObjectId,
  shift_id: ObjectId,
  
  punch_in_time: Date,
  punch_in_entry_id: ObjectId,  // Reference to AttendancePunch
  
  session_date: Date,
  session_status: enum ['active', 'closed', 'abandoned'],
  
  expected_out_time: Date,  // shift reference time
  
  createdAt, updatedAt
}
```

---

### 1.4 RegularizationRequest Schema Changes

**File:** `server/model/attendance/RegularizationRequest.js`

#### Update `regularization_type`:
```javascript
// OLD:
enum: ['missing_punch', 'late_in', 'early_out']

// NEW:
enum: ['missing_punch', 'missing_out', 'manual_override']
```

#### Add:
```javascript
// For manual corrections
corrected_punch_in_time: Date,
corrected_punch_out_time: Date,
corrected_total_hours: Number,

// Existing (keep)
reason: String,
supporting_documents: [String],
status: enum ['pending', 'approved', 'rejected'],
```

---

## Phase 2: Business Logic - Work Hours Calculation Service

### 2.1 New Service: WorkHoursCalculator

**File:** `server/services/attendance/WorkHoursCalculator.js`

This service handles all work hour calculations. It:
1. Groups punches into IN/OUT sessions
2. Calculates total hours per session
3. Validates sessions
4. Returns work hour totals

#### Key Methods:

**`calculateDailyWorkHours(punches, shift)`**
- Input: Array of punches for a day, shift config
- Output: 
  ```javascript
  {
    total_work_hours: 8.5,
    total_sessions: 2,
    sessions: [
      { in_time, out_time, duration_hours, is_incomplete }
    ],
    has_incomplete: false,
    is_late: false,
    is_early_exit: false,
    primary_in_time: Date,
    primary_out_time: Date
  }
  ```

**`validateSession(inTime, outTime, maxHours = 18)`**
- Check: OUT > IN
- Check: Duration ≤ maxHours
- Check: No gaps in logic

**`groupSessions(allPunches)`**
- Pair consecutive IN/OUT
- Handle missing OUT (mark is_incomplete)
- Handle OUT without IN (ignore)
- Handle cross-day sessions

---

### 2.2 New Service: AttendanceStatusResolver

**File:** `server/services/attendance/AttendanceStatusResolver.js`

Determines attendance status based on work hours (step-based):

**`resolveStatus(workData, shift, overrides)`**

Logic (in order):
1. **Check Overrides:**
   - If approved leave → `'leave'`
   - If holiday → `'holiday'`
   - If weekly off → `'weekly_off'`

2. **Check Work Hours:**
   - If no punches → `'absent'`
   - If has_incomplete_session AND total_hours < minimum_hours → `'incomplete'`
   - If total_hours ≥ full_day_hours → `'present'`
   - ElseIf total_hours ≥ half_day_hours → `'half_day'`
   - Else → `'absent'`

3. **Track (but don't penalize):**
   - `is_late` = (first_punch_in > shift_start_time)
   - `is_early_exit` = (last_punch_out < shift_end_time)

---

## Phase 3: API Endpoint Updates

### 3.1 Punch Endpoint

**File:** `server/routes/attendance/punchRoutes.mjs`

#### POST `/punch`
```javascript
// Existing validation
// NEW: Check for active session
if (punch_type === 'IN') {
  const activeSession = await ActiveSession.findOne({
    employee_id,
    session_date,
    session_status: 'active'
  });
  
  if (activeSession) {
    return res.status(400).json({
      message: 'Active session already exists. Please punch OUT first.',
      active_since: activeSession.punch_in_time
    });
  }
  
  // Create new ActiveSession
  const newSession = new ActiveSession({
    employee_id,
    company_id,
    shift_id,
    punch_in_time: currentTime,
    session_date: dateOnly,
    session_status: 'active'
  });
  await newSession.save();
}

if (punch_type === 'OUT') {
  // Close active session
  const activeSession = await ActiveSession.findOne({
    employee_id,
    session_date,
    session_status: 'active'
  });
  
  if (activeSession) {
    activeSession.session_status = 'closed';
    await activeSession.save();
  }
}
```

#### NO auto punch-out logic

---

### 3.2 Attendance Calculation Endpoint

**File:** `server/controllers/attendance/attendance.controller.js`

#### New: `POST /calculate-daily-attendance/:employee_id/:date`
or trigger via cron

```javascript
export const calculateDailyAttendance = async (req, res) => {
  const { employee_id, date } = req.params;
  
  // 1. Fetch shift
  // 2. Fetch all punches for the date
  // 3. Calculate work hours
  // 4. Resolve status
  // 5. Save/update AttendanceRecord
  // 6. Update ActiveSessions (mark abandoned if no OUT after 6 hours + shift_end)
  
  const workData = await WorkHoursCalculator.calculateDailyWorkHours(punches, shift);
  const status = await AttendanceStatusResolver.resolveStatus(workData, shift, overrides);
  
  const record = new AttendanceRecord({
    employee_id,
    attendance_date: date,
    shift_id: user.shift_id,
    total_work_hours: workData.total_work_hours,
    work_sessions: workData.sessions,
    has_incomplete_session: workData.has_incomplete,
    is_late: workData.is_late,
    late_by_minutes: workData.late_by_minutes,
    is_early_exit: workData.is_early_exit,
    early_exit_minutes: workData.early_exit_minutes,
    status: status,
    first_in: workData.primary_in_time,
    last_out: workData.primary_out_time,
    total_punches: punches.length
  });
  
  await record.save();
  res.json({ message: 'Attendance calculated', data: record });
};
```

---

### 3.3 Regularization Endpoint

**File:** `server/routes/attendance/regularizationRoutes.mjs`

#### Updated: `POST /submit-regularization`
```javascript
{
  employee_id,
  attendance_date,
  regularization_type: 'missing_out',  // 'missing_punch', 'missing_out', 'manual_override'
  reason,
  
  // NEW: corrected times for missing punch/out scenarios
  corrected_punch_in_time: '2025-02-05T09:30:00Z',
  corrected_punch_out_time: '2025-02-05T17:30:00Z',
  
  supporting_documents: [file]
}
```

#### NEW: `POST /approve-regularization/:id`
```javascript
export const approveRegularization = async (req, res) => {
  const { id } = req.params;
  const { approver_remarks } = req.body;
  
  const regRequest = await RegularizationRequest.findById(id);
  
  // If corrected times provided, create a virtual punch entry
  if (regRequest.corrected_punch_in_time && regRequest.corrected_punch_out_time) {
    // Don't create actual punch (immutable), but mark the regularization
    regRequest.status = 'approved';
    regRequest.approved_by = req.user._id;
    regRequest.approved_at = new Date();
    await regRequest.save();
    
    // Recalculate attendance with override
    await recalculateAttendanceWithRegularization(regRequest);
  }
  
  res.json({ message: 'Regularization approved', data: regRequest });
};
```

---

## Phase 4: Cron Job Updates

**File:** `server/cron/dailyAttendanceProcessor.js`

#### Scheduled Task (e.g., 11 PM daily):
```javascript
export const processDailyAttendance = async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const allEmployees = await User.find({ status: 'active' });
  
  for (const emp of allEmployees) {
    // Skip if on leave/holiday (already handled)
    const hasLeave = await LeaveApplication.findOne({
      employee_id: emp._id,
      from_date: { $lte: yesterday },
      to_date: { $gte: yesterday },
      approval_status: 'approved'
    });
    
    if (hasLeave) continue;
    
    // Calculate attendance
    const punches = await AttendancePunch.find({
      employee_id: emp._id,
      punch_date: yesterday
    }).sort({ punch_time: 1 });
    
    const shift = await Shift.findById(emp.shift_id);
    
    const workData = await WorkHoursCalculator.calculateDailyWorkHours(punches, shift);
    const status = await AttendanceStatusResolver.resolveStatus(workData, shift);
    
    // Save/update
    await AttendanceRecord.findOneAndUpdate(
      { employee_id: emp._id, attendance_date: yesterday },
      {
        total_work_hours: workData.total_work_hours,
        work_sessions: workData.sessions,
        has_incomplete_session: workData.has_incomplete,
        is_late: workData.is_late,
        late_by_minutes: workData.late_by_minutes,
        is_early_exit: workData.is_early_exit,
        early_exit_minutes: workData.early_exit_minutes,
        status: status,
        first_in: workData.primary_in_time,
        last_out: workData.primary_out_time,
        total_punches: punches.length,
        processed_at: new Date(),
        processed_by: 'cron'
      },
      { upsert: true, new: true }
    );
    
    // Mark incomplete sessions as abandoned
    await ActiveSession.updateMany(
      {
        employee_id: emp._id,
        session_date: yesterday,
        session_status: 'active'
      },
      { session_status: 'abandoned' }
    );
  }
};
```

---

## Phase 5: UI Updates

### 5.1 Dashboard

**File:** `client/src/components/attendance/Dashboard.jsx`

Show:
```
Worked: 6.5 hrs / 8 hrs required
Status: PRESENT ✅

Late at 9:15 AM (but hours complete, so counted as present)
```

### 5.2 Punch Widget

**File:** `client/src/components/attendance/components/PunchWidget.jsx`

```javascript
- Show live clock
- Show total hours worked today (updated in real-time)
- Show sessions: "Session 1: 9:00 AM - 12:30 PM (3.5 hrs)"
- Show punch buttons (IN / OUT only, no auto)
- Alert if active session exists and IN button clicked
```

### 5.3 Attendance Report

**File:** `client/src/components/attendance/AttendanceReport.jsx`

Add columns:
- Hours Worked
- Status
- Sessions Count
- Is Late (visual indicator, not penalizing)
- Is Early Exit (visual indicator, not penalizing)
- Incomplete Days Highlight

### 5.4 Regularization Form

**File:** `client/src/components/attendance/RegularizationForm.jsx`

```javascript
- Type: missing_punch, missing_out, manual_override
- If missing_punch:
  - Actual IN time (optional)
  - Actual OUT time (optional)
  - System calculates corrected hours
- Reason (required)
- Document upload
```

---

## Phase 6: Data Migration

### Migration Script

**File:** `server/scripts/migrate_attendance_system.mjs`

1. Update all Shift records:
   - Remove `grace_in_minutes`, `grace_out_minutes`, `auto_checkout_enabled`, `auto_checkout_time`

2. Update all AttendanceRecord records:
   - Change all status `'late'` → `'incomplete'` (if applicable)
   - Recalculate `status` based on `total_work_hours` using new logic

3. Initialize ActiveSession collection (empty start)

4. Void old RegularizationRequest records (archive)

---

## Testing Checklist

### Unit Tests

✅ WorkHoursCalculator:
- [ ] Single IN/OUT session → correct hours
- [ ] Multiple sessions → sum correctly
- [ ] Missing OUT → marked incomplete
- [ ] OUT without IN → ignored
- [ ] Cross-day session validation

✅ AttendanceStatusResolver:
- [ ] Late entry but full hours → Present
- [ ] Early exit but full hours → Present
- [ ] Half day hours → Half Day
- [ ] Below minimum → Absent
- [ ] Incomplete session + low hours → Incomplete

### Integration Tests

✅ Punch Endpoint:
- [ ] First IN creates ActiveSession
- [ ] Second IN without OUT → 400 error
- [ ] OUT closes ActiveSession
- [ ] Multiple IN/OUT pairs work

✅ Daily Attendance Calculation:
- [ ] Cron processes correctly
- [ ] Abandoned sessions marked
- [ ] Statuses updated

✅ Regularization:
- [ ] Submit missing punch regularization
- [ ] Approve with corrected times
- [ ] Attendance recalculates with new times

### E2E Scenarios

✅ Scenario 1: Late but Full Hours
- Employee IN at 10:15 AM (shift 9 AM)
- Employee OUT at 6:30 PM
- Total: 8.25 hours
- Expected: `status = 'present'`, `is_late = true`

✅ Scenario 2: Early Exit but Full Hours
- Employee IN at 9:00 AM
- Employee OUT at 5:00 PM (shift 6 PM)
- Total: 8 hours
- Expected: `status = 'present'`, `is_early_exit = true`

✅ Scenario 3: Multiple Sessions
- Session 1: 9 AM - 12 PM (3 hrs)
- Session 2: 1 PM - 6 PM (5 hrs)
- Total: 8 hours
- Expected: `status = 'present'`, `work_sessions.length = 2`

✅ Scenario 4: Missing OUT
- Employee IN at 9 AM
- No OUT punch
- Expected: `status = 'incomplete'`, `is_incomplete_session = true`

✅ Scenario 5: Regularization
- Missing OUT scenario
- Employee submits reg with corrected OUT at 6 PM
- HOD approves
- Expected: Attendance recalculated as 'present' with 9 hrs

---

## Rollout Plan

### Week 1: Staging
- [ ] Deploy Phase 1 & 2 changes
- [ ] Run migration script
- [ ] Enable new calculation logic
- [ ] Test with sample data

### Week 2: Beta (Small Group)
- [ ] Selected team uses new punch system
- [ ] Monitor ActiveSession for issues
- [ ] Collect feedback

### Week 3: Full Rollout
- [ ] Enable for all employees
- [ ] Monitor cron job logs
- [ ] Support regularization submissions

### Week 4: Cleanup
- [ ] Archive old data
- [ ] Remove deprecated fields from UI
- [ ] Final testing & documentation

---

## Summary of Benefits

| Before | After |
|--------|-------|
| ❌ Grace period strict | ✅ Hours-based, flexible |
| ❌ Penalizes late even if full hours | ✅ Only looks at total hours |
| ❌ Auto punch-out forced workarounds | ✅ Manual, transparent |
| ❌ Difficult to handle multiple sessions | ✅ Native multi-session support |
| ❌ Many manual corrections needed | ✅ Regularization straightforward |
| ❌ Confusing status labels | ✅ Clear: present / half_day / absent / incomplete |

---

## Sign-Off Checkpoints

- [ ] Stakeholder approves plan
- [ ] Tech lead reviews schemas
- [ ] QA approves test plan
- [ ] Go-live approved by admin
