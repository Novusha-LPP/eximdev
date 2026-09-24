# Default Leave Balance - 24 Days Implementation

## ✅ Changes Made

### 1. LeavePolicy Model
**File:** `server/routes/attendance/models/LeavePolicy.js`

**Change:**
```javascript
annual_quota: { type: Number, required: true, default: 24 }
```

- ✅ New leave policies will default to 24 days
- ✅ Applies when creating new policies without specifying quota

### 2. Leave Controller - getBalance()
**File:** `server/routes/attendance/controllers/leave.controller.js`

**Changes:**
- Added default quota constant: `const defaultQuota = 24;`
- When displaying balances, uses 24 if policy quota not set
- When creating new balance records, uses 24 if policy quota not set

**Code:**
```javascript
// Display balance
const policyQuota = policy.annual_quota || defaultQuota;
const total = userBalance ? (userBalance.opening_balance + (userBalance.credited || 0)) : policyQuota;

// Create new balance
const quota = policy.annual_quota || defaultQuota;
balanceRecord = new LeaveBalance({
    opening_balance: quota,
    closing_balance: quota,
    // ...
});
```

### 3. Leave Controller - applyLeave()
**File:** `server/routes/attendance/controllers/leave.controller.js`

**Change:**
- Uses default of 24 days when creating balance during leave application

### 4. HOD Controller - Leave Approval
**File:** `server/routes/attendance/controllers/HOD.controller.js`

**Change:**
- When approving leaves creates balance with 24 days default if policy quota not set

**Code:**
```javascript
const defaultQuota = 24;
const quota = policy?.annual_quota || defaultQuota;
balanceRecord = new LeaveBalance({
    opening_balance: quota,
    closing_balance: quota,
    // ...
});
```

### 5. Migration Script
**File:** `server/scripts/set_default_leave_balance.js`

**Purpose:**
- Updates existing leave policies to 24 days
- Updates existing leave balances with low balance to 24 days
- Provides verification and summary

## 🚀 How to Apply

### Step 1: Restart Backend Server
The code changes are already in place:
```bash
cd server
npm start
```

### Step 2: Run Migration Script (Optional)
Update existing data to use 24 days default:
```bash
node server/scripts/set_default_leave_balance.js
```

**What the script does:**
1. ✅ Updates LeavePolicy documents: Sets `annual_quota = 24` where missing or < 1
2. ✅ Updates LeaveBalance documents: Adjusts balances with closing_balance < 24
3. ✅ Skips unpaid leave types
4. ✅ Shows verification results

## 📊 Behavior

### For New Users:
- ✅ First time applying for leave → Balance created with 24 days
- ✅ First time viewing leave balance → Shows 24 days available
- ✅ Leave policies created without quota → Default to 24 days

### For Existing Users:
**Before Running Script:**
- Users see their current balance (may be less than 24)

**After Running Script:**
- ✅ Leave policies updated to 24 days annual quota
- ✅ Balances adjusted to reflect 24 days opening balance
- ✅ Current consumed/pending leaves preserved

### Example:
**Before:**
- Opening: 10 days
- Consumed: 3 days
- Closing: 7 days available

**After Script:**
- Opening: 24 days
- Consumed: 3 days
- Closing: 21 days available ✅

## 🧪 Testing

### Test 1: New User Leave Balance
1. Login as a new user (never applied leave before)
2. Go to Leave Management
3. Check balance cards
4. **Expected:** Shows 24 days available

### Test 2: Apply Leave Without Policy
1. Admin creates leave policy without setting annual_quota
2. Employee applies for leave
3. **Expected:** Balance created with 24 days, leave deducted correctly

### Test 3: Existing User After Migration
1. Run migration script
2. Login as existing user
3. Check leave balance
4. **Expected:** Shows updated balance with 24 days as base

## 📝 Configuration

To change the default from 24 to another value:

**Files to Update:**
1. `server/routes/attendance/models/LeavePolicy.js` - Line 9
2. `server/routes/attendance/controllers/leave.controller.js` - Lines with `defaultQuota = 24`
3. `server/routes/attendance/controllers/HOD.controller.js` - Line with `defaultQuota = 24`
4. `server/scripts/set_default_leave_balance.js` - Line 20

**Change:**
```javascript
const DEFAULT_QUOTA = 24;  // Change this value
```

## ✅ Benefits

1. **Consistency:** All users start with same leave quota
2. **Fair:** 24 days is standard annual leave in many countries
3. **Automatic:** No need to manually set quota for each policy
4. **Backward Compatible:** Existing balances preserved
5. **Flexible:** Can still override with specific policy quotas

## 🔄 Rollback

If needed to revert:

1. **Database Restore:**
   ```bash
   mongorestore --uri="your_uri" backup_folder
   ```

2. **Code Revert:**
   - Remove `default: 24` from LeavePolicy model
   - Remove `defaultQuota` variables from controllers
   - Use `policy.annual_quota` directly

## 📚 Related Files

- LeavePolicy Model: `server/routes/attendance/models/LeavePolicy.js`
- LeaveBalance Model: `server/routes/attendance/models/LeaveBalance.js`
- Leave Controller: `server/routes/attendance/controllers/leave.controller.js`
- HOD Controller: `server/routes/attendance/controllers/HOD.controller.js`
- Migration Script: `server/scripts/set_default_leave_balance.js`

---

**Status:** ✅ Implementation Complete - Ready to Use!
