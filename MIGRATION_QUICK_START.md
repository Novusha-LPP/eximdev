# 🚀 Quick Start - Team-Based Attendance Migration

## ⚡ Implementation Complete!

All code changes have been implemented. Follow these steps to activate the team-based system:

## Step 1: Backup Database (CRITICAL!)

```bash
# Create backup before migration
mongodump --uri="mongodb://localhost:27017/exim" --out=backup_team_migration
```

## Step 2: Run Migration Script

```bash
cd server
node scripts/migrate_team_ids.js
```

**What it does:**

- Populates `team_id` in all AttendanceRecord documents
- Populates `team_id` in all LeaveApplication documents
- Shows detailed progress and verification results

**Expected Output:**

```
✅ Connected to MongoDB
✅ Found X active teams
✅ AttendanceRecord migration complete: Y records updated
✅ LeaveApplication migration complete: Z applications updated
```

## Step 3: Restart Backend Server

```bash
# Stop current server (Ctrl+C)
# Start fresh
cd server
npm start
```

## Step 4: Test the Changes

### Test 1: Leave Types Dropdown 🍃

1. Login as any employee
2. Go to Leave Management
3. Click "Apply Leave"
4. Check dropdown shows leave types
5. If empty, check server console for `[Leave Balance]` logs

### Test 2: HOD Dashboard 👥

1. Login as HOD
2. Dashboard should show only team members (not all department)
3. Check "Team Overview" title (not "Department Overview")
4. Verify employee list matches HOD's teams

### Test 3: Leave Approval ✅

1. Have team member apply for leave
2. Login as their HOD
3. Should be able to approve ✓
4. Have non-team member apply leave
5. HOD should NOT see it or get "Unauthorized" ✗

### Test 4: Attendance Management 📊

1. Login as HOD
2. Try to punch for team member → Should work ✓
3. Try to punch for non-team employee → Should fail ✗

### Test 5: Admin Access 🔑

1. Login as Admin
2. Should see ALL employees (unchanged)
3. Can filter by department
4. Can approve any leave

## 🔍 Debugging Leave Dropdown

If leave types not showing, check server console:

```
[Leave Balance] User: john_doe CompanyID: 507f1f77bcf86cd799439011
[Leave Balance] Found 3 active policies
[Leave Balance] After eligibility filter: 3 eligible policies
[Leave Balance] Returning 3 leave types
```

**If 0 eligible policies:**

- Check if leave policies exist and are active
- Check user's employment_type matches policy eligibility
- Check user's gender matches (if policy has gender restriction)

## ✅ Success Indicators

After successful implementation:

- ✅ HOD dashboard shows "Team Overview"
- ✅ HOD sees only their team members
- ✅ HOD can approve leaves only for team members
- ✅ Leave dropdown populates with eligible types
- ✅ Admin still has full company access
- ✅ No errors in console logs

## 📞 Next Steps

1. **Test in staging/development first**
2. **Run migration during low-traffic period**
3. **Monitor server logs for errors**
4. **Have backup ready for rollback**
5. **Inform HODs about the team-based change**

## 🆘 Rollback Plan (If Needed)

If something goes wrong:

```bash
# Restore from backup
mongorestore --uri="your_mongodb_connection_string" backup_team_migration

# Revert code changes
git checkout HEAD~1  # Or your previous commit
```

## 📚 Documentation

See `TEAM_MIGRATION_SUMMARY.md` for:

- Complete change list
- Architecture details
- Full testing checklist
- Troubleshooting guide

---

**Ready?** Run the migration script and test! 🎉
