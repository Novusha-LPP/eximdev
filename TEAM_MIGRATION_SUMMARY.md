# Team-Based Attendance Migration - Implementation Summary

## ✅ Completed Changes

### 1. Database Schema Updates

**Files Modified:**
- `server/routes/attendance/models/AttendanceRecord.js`
- `server/routes/attendance/models/LeaveApplication.js`

**Changes:**
- ✅ Added `team_id` field to AttendanceRecord model
- ✅ Added `team_id` field to LeaveApplication model
- ✅ Created index for `team_id` + `attendance_date`
- ✅ Kept `department_id` for backward compatibility

### 2. Migration Script

**File Created:**
- `server/scripts/migrate_team_ids.js`

**Purpose:**
- Populates `team_id` in existing AttendanceRecord documents
- Populates `team_id` in existing LeaveApplication documents
- Maps users to teams based on current team membership
- Provides verification queries and detailed logging

**To Run:**
```bash
cd server
node scripts/migrate_team_ids.js
```

### 3. Backend Controller Updates

**HOD Controller** (`server/routes/attendance/controllers/HOD.controller.js`):
- ✅ Added Team model import
- ✅ Updated `getDashboard()` to filter by team members instead of department
  - Admin: Still sees all employees
  - HOD: Only sees their team members across all teams they manage
  - Returns empty dashboard if HOD has no teams/members
- ✅ Updated `approveRequest()` for leave approval
  - Validates employee is in HOD's team (not just same department)
  - Blocks self-approval
  - Admin still has full access
- ✅ Updated regularization approval with team-based authorization

**Attendance Controller** (`server/routes/attendance/controllers/attendance.controller.js`):
- ✅ Added Team model import
- ✅ Updated `punch()` method for multi-actor punch
  - HOD can only punch for employees in their team
  - Admin can punch for anyone in same company
  - Added team membership validation

**Leave Controller** (`server/routes/attendance/controllers/leave.controller.js`):
- ✅ Added Team model import
- ✅ Added debug logging to `getBalance()` to diagnose leave type dropdown issues
  - Logs: Number of policies found
  - Logs: Eligibility filtering results
  - Logs: User employment_type and gender
  - Logs: Final leave types returned
- ✅ Updated `applyLeave()` to automatically set `team_id`
  - Looks up user's team membership
  - Sets team_id when creating leave application

### 4. Frontend Updates

**Dashboard Component** (`client/src/components/attendance/Dashboard.jsx`):
- ✅ Changed HOD title from "Department Overview" to "Team Overview"

**AttendanceReport Component** (`client/src/components/attendance/AttendanceReport.jsx`):
- ✅ Changed HOD subtitle from "department's attendance" to "team's attendance"
- Department dropdown remains for Admin only (HOD doesn't see it)

### 5. Leave Dropdown Debugging

**Enhanced Error Logging:**
- Added console logs throughout the balance retrieval process
- Tracks policy count at each stage
- Shows eligibility filter results
- Logs user attributes affecting eligibility
- Final count of leave types being returned

**To Debug:**
1. Check server console logs when accessing Leave Management
2. Look for `[Leave Balance]` prefixed messages
3. Verify:
   - Active leave policies exist for the company
   - User's employment_type matches policy eligibility
   - User's gender matches policy eligibility (if specified)

## 🔄 How It Works Now

### For HODs:

1. **Dashboard View:**
   - HOD logs in
   - System fetches all teams where `hodId = hod._id`
   - Extracts all member user IDs from all teams
   - Shows attendance only for those team members
   - No department filtering

2. **Leave Approval:**
   - Employee submits leave
   - HOD tries to approve
   - System checks if employee is in any of HOD's teams
   - Approval allowed only if employee is team member
   - Department is no longer checked

3. **Attendance Editing:**
   - HOD can only punch/edit for team members
   - System validates team membership before allowing action

### For Admins:

- ✅ Admins still have full company-wide access
- ✅ Can filter by department in reports
- ✅ Can approve any leave or regularization
- ✅ Can punch for any employee

### For Employees:

- ✅ No changes to employee experience
- ✅ Leave types dropdown will show eligible policies
- ✅ Can apply for leaves normally
- ✅ Attendance tracking unchanged

## 📊 Migration Steps (When Ready)

1. **Backup Database** (IMPORTANT!)
   ```bash
   mongodump --uri="mongodb://localhost:27017/eximdev" --out=backup_before_team_migration
   ```

2. **Run Migration Script**
   ```bash
   cd server
   node scripts/migrate_team_ids.js
   ```

3. **Verify Migration**
   - Check the script output for counts
   - Verify AttendanceRecords have team_id populated
   - Verify LeaveApplications have team_id populated

4. **Restart Backend Server**
   ```bash
   cd server
   npm start
   ```

5. **Test HOD Access**
   - Login as HOD
   - Check dashboard shows only team members
   - Try approving leave for team member (should work)
   - Try approving leave for non-team member (should fail)

## 🧪 Testing Checklist

### Phase 1: Leave Dropdown
- [ ] Employee can see leave types in dropdown
- [ ] Leave types match user eligibility (employment_type, gender)
- [ ] Check server logs for policy count and filtering results

### Phase 2: HOD Dashboard
- [ ] HOD sees only their team members
- [ ] HOD with multiple teams sees all members from all teams
- [ ] HOD with no teams sees empty dashboard
- [ ] Admin still sees all employees

### Phase 3: Leave Approval
- [ ] HOD can approve leave for team member
- [ ] HOD cannot approve leave for non-team employee
- [ ] HOD cannot approve own leave
- [ ] Admin can approve any leave

### Phase 4: Attendance Management
- [ ] HOD can punch/edit for team members
- [ ] HOD cannot punch/edit for non-team employees
- [ ] Admin can punch/edit for anyone

### Phase 5: Reports
- [ ] HOD attendance report shows team members only
- [ ] Admin report shows all employees
- [ ] Department filter still works for admin

## 🔧 Troubleshooting

### Leave Types Not Showing

Check server logs for:
```
[Leave Balance] Found X active policies
[Leave Balance] After eligibility filter: Y eligible policies
```

If Y = 0, check:
1. Are leave policies created and status = 'active'?
2. Does user's employment_type match policy eligibility?
3. Does user's gender match policy eligibility (if specified)?
4. Is user's company_id correct?

### HOD Sees No Team Members

Check:
1. Has HOD created teams in HodManagement?
2. Are team members added to the teams?
3. Is team `isActive = true`?
4. Run migration script to populate team_id

### Approval Fails

Check:
1. Is employee in HOD's team?
2. Run migration to set team_id on leave applications
3. Check server logs for authorization messages

## 📝 Key Architecture Changes

### Before (Department-Based):
```
HOD → Department → All Employees in Department
```

### After (Team-Based):
```
HOD → Teams (Multiple) → Team Members (Across Departments)
```

**Benefits:**
- ✅ More flexible team structures
- ✅ HODs can manage cross-departmental teams
- ✅ Better reflects actual reporting structure
- ✅ Cleaner separation of concerns

**Backward Compatibility:**
- ✅ Department fields retained
- ✅ Gradual migration possible
- ✅ Admin functionality unchanged
- ✅ No data loss
