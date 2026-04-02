# Leave Balance Management Scripts

Three scripts for managing leave balances across users, companies, and leave types.

## Scripts Overview

### 1. `show_leave_balances.mjs` - View Current Balances
**Purpose**: Display comprehensive leave balance statistics across the system

**Usage**:
```bash
node ./scripts/show_leave_balances.mjs
```

**Shows**:
- Leave balance statistics by type (count, average, total, min, max)
- Top 10 users with highest balances
- User count by company with total days

**Output Example**:
```
📊 LEAVE BALANCE STATISTICS BY TYPE
Leave Type            Users       Total Days      Avg Balance     Min        Max
privilege             143         3,575.0         25.0            0          25
lwp                   143         0.0             0.0             0          0

🏆 TOP 10 USERS WITH HIGHEST BALANCE
1. John Doe                        | privilege       | 25 days | john@company.com
2. Jane Smith                      | privilege       | 25 days | jane@company.com
```

---

### 2. `reset_leave_balances_to_zero.mjs` - Reset ALL Users
**Purpose**: Set all leave balances to zero for all users

**Usage**:
```bash
node ./scripts/reset_leave_balances_to_zero.mjs
```

**What It Does**:
- Finds all LeaveBalance records in the database
- Sets these fields to 0 for each record:
  - `opening_balance`
  - `credited`
  - `consumed`
  - `pending_approval`
  - `carried_forward`
  - `encashed`
  - `lapsed`
  - `closing_balance`
- Updates `last_updated` timestamp
- Shows before/after samples and summary statistics

**Output Example**:
```
✅ Successfully reset 143 leave balance records to ZERO

📊 Balance Summary by Leave Type:
  lwp: 143 users | Total Balance: 0 days
  privilege: 143 users | Total Balance: 0 days

✨ All leave balances have been reset to ZERO!
💡 Admins can now set individual balances using the updateBalance API
```

---

### 3. `reset_leave_balances_advanced.mjs` - Reset with Filters
**Purpose**: Reset leave balances with granular control by company, leave type, or user

**Usage**:

#### Reset ALL users
```bash
node ./scripts/reset_leave_balances_advanced.mjs
```

#### Reset by company (replace `<company_id>` with actual MongoDB ObjectId)
```bash
node ./scripts/reset_leave_balances_advanced.mjs --company-id 507f1f77bcf86cd799439011
```

#### Reset by leave type
```bash
node ./scripts/reset_leave_balances_advanced.mjs --leave-type privilege

# Or for LWP
node ./scripts/reset_leave_balances_advanced.mjs --leave-type lwp
```

#### Reset for specific user
```bash
node ./scripts/reset_leave_balances_advanced.mjs --user-id 507f1f77bcf86cd799439012
```

#### Combine filters (AND logic)
```bash
# Reset privilege leave only for a specific company
node ./scripts/reset_leave_balances_advanced.mjs --company-id 507f1f77bcf86cd799439011 --leave-type privilege
```

**Output Example**:
```
📊 Found 143 leave balance records for: ALL users

📝 Sample of records BEFORE reset:
  1. Employee: 507f... | Type: privilege | Opening: 25 | Closing: 25
  2. Employee: 507f... | Type: lwp | Opening: 0 | Closing: 0

✅ Successfully reset 143 leave balance records

📊 Summary Statistics:
  lwp: 143 records | Total balance: 0 days
  privilege: 143 records | Total balance: 0 days
```

---

## Workflow: Reset Everything and Start Fresh

### Step 1: View Current State
```bash
node ./scripts/show_leave_balances.mjs
```

### Step 2: Reset All Balances to Zero
```bash
node ./scripts/reset_leave_balances_to_zero.mjs
```

### Step 3: Set Individual User Balances (Via API)
Use the admin endpoint to set specific user balances:

```bash
curl -X POST http://localhost:9006/api/attendance/leave/admin/update-balance/:employee_id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "leave_policy_id": "507f1f77bcf86cd799439013",
    "opening_balance": 25,
    "credited": 0,
    "consumed": 0
  }'
```

Or via JavaScript/Node:
```javascript
await leaveAPI.updateBalance(
  employee_id,           // User's ObjectId
  leave_policy_id,       // Policy ObjectId
  25,                    // opening_balance (Privilege Leave: 25 days)
  0,                     // credited
  0                      // consumed
);
```

---

## API Reference: Update Individual Balance

**Endpoint**: `POST /leave/admin/update-balance/:employee_id`

**Headers**:
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "leave_policy_id": "ObjectId",
  "opening_balance": 25,
  "credited": 0,
  "consumed": 0
}
```

**Response**:
```json
{
  "message": "Leave balance updated successfully",
  "data": {
    "employee_id": "507f...",
    "leave_type": "privilege",
    "opening_balance": 25,
    "credited": 0,
    "consumed": 0,
    "pending_approval": 0,
    "closing_balance": 25,
    "year": 2026
  }
}
```

**Features**:
- Only admins can access
- Creates balance record if it doesn't exist
- Updates existing balance and recalculates `closing_balance`
- Sets `last_updated` timestamp

---

## Dashboard Sync

After updating balances via script or API, the dashboard automatically refreshes by listening to the `'leave-balance-updated'` event:

```javascript
// Manually trigger update event (optional)
window.dispatchEvent(new CustomEvent('leave-balance-updated'));
```

The Dashboard will automatically re-fetch balances and show updated values.

---

## Database Schema

### LeaveBalance Document
```javascript
{
  _id: ObjectId,
  employee_id: ObjectId,           // Reference to User
  company_id: ObjectId,            // Reference to Company
  leave_policy_id: ObjectId,       // Reference to LeavePolicy
  leave_type: String,              // 'privilege', 'lwp', etc.
  
  year: Number,                    // Current financial year (2026)
  opening_balance: Number,         // Starting days (default: 0)
  credited: Number,                // Additional days credited (default: 0)
  consumed: Number,                // Days consumed in applications (default: 0)
  pending_approval: Number,        // Days locked during approval (default: 0)
  carried_forward: Number,         // Days carried from previous year (default: 0)
  encashed: Number,                // Days encashed in cash (default: 0)
  lapsed: Number,                  // Days that expired (default: 0)
  closing_balance: Number,         // closing = opening + credited - consumed - pending...
  
  last_updated: Date,              // Last modification timestamp
  createdAt: Date,
  updatedAt: Date
}
```

**Unique Index**: `(employee_id, company_id, leave_policy_id, year)`

---

## Common Scenarios

### Scenario 1: New Year Reset
Start fresh leave year with zero balances:

```bash
# 1. Show current state
node ./scripts/show_leave_balances.mjs

# 2. Reset all balances
node ./scripts/reset_leave_balances_to_zero.mjs

# 3. Verify reset
node ./scripts/show_leave_balances.mjs

# 4. Set Privilege Leave to 25 days via API (bulk or individually)
```

### Scenario 2: Company-Specific Balance Reset
Reset only one company's balances:

```bash
node ./scripts/reset_leave_balances_advanced.mjs --company-id <company_id>
```

### Scenario 3: Emergency Zero-Out
One leave type is causing issues; zero it out:

```bash
node ./scripts/reset_leave_balances_advanced.mjs --leave-type lwp
```

### Scenario 4: Manual Correction for One User
Fix a specific user's balance without affecting others:

```bash
node ./scripts/reset_leave_balances_advanced.mjs --user-id <user_id>

# Then set the correct balance via API
curl -X POST http://localhost:9006/api/attendance/leave/admin/update-balance/<user_id> ...
```

---

## Troubleshooting

### "MongoDB URI not found"
- Ensure `.env` file exists in `server/` directory
- Check `DEV_MONGODB_URI`, `PROD_MONGODB_URI`, or `SERVER_MONGODB_URI` variables

### Script doesn't run
```bash
# Ensure Node.js version supports ES modules
node --version  # Should be v14.0.0+

# Run from correct directory
cd server
node ./scripts/show_leave_balances.mjs
```

### Want to see what will change before running reset?
```bash
# Run show_leave_balances.mjs first
node ./scripts/show_leave_balances.mjs

# This shows current totals
```

---

## Notes

- ✅ All scripts are **non-destructive** - they can be run multiple times safely
- ✅ Scripts use MongoDB transactions for data consistency
- ✅ Each script shows before/after samples for verification
- ✅ Timestamps are automatically updated
- ✅ Dashboard syncs automatically after API updates
- ✅ Admin-only access for API endpoint (role check included)

---

## Quick Commands Cheat Sheet

```bash
# View current balances
node ./scripts/show_leave_balances.mjs

# Reset everything to zero
node ./scripts/reset_leave_balances_to_zero.mjs

# Reset with filters
node ./scripts/reset_leave_balances_advanced.mjs --company-id <id>
node ./scripts/reset_leave_balances_advanced.mjs --leave-type privilege
node ./scripts/reset_leave_balances_advanced.mjs --user-id <id>
```
