# Special Approval Workflow - Quick Reference Guide

## Overview
The leave approval system now routes applications differently based on the requester's role, automatically skipping certain stages for senior members.

---

## Routing Matrix

### Route 1: Regular Employee
```
Regular Employee
    ↓
Stage 1: Team HOD (Pending)
    ↓ Approves
Stage 2: Shalini Arun (Pending)
    ↓ Approves
Stage 3: Final Approver - manu_pillai (Pending)
    ↓ Approves
APPROVED
```

### Route 2: HOD Applicant
```
HOD (Team Head)
    ↓
Stage 1: SKIPPED (marked as approved)
Stage 2: Shalini Arun (Pending)
    ↓ Approves
Stage 3: Final Approver - manu_pillai (Pending)
    ↓ Approves
APPROVED
```

### Route 3: Shalini Arun (Stage 2 Approver)
```
Shalini Arun
    ↓
Stage 1: SKIPPED (marked as approved)
Stage 2: SKIPPED (marked as approved)
Stage 3: Final Approver - Manu Pillai (Pending)
    ↓ Approves
APPROVED
```

### Route 4: Final Approver (Manu, Suraj, Rajan)
```
Manu/Suraj/Rajan
    ↓
Stage 1: SKIPPED (marked as approved)
Stage 2: SKIPPED (marked as approved)
Stage 3: Self-assigned (Pending)
    ↓ Self-approves
APPROVED
```

---

## Key Files

| File | Purpose | Key Functions |
|------|---------|----------------|
| [leave.controller.js](server/controllers/attendance/leave.controller.js) | Handles leave creation & routing | `getShaliniApprover()`, `getApproverByUsername()`, routing logic at Line 945+ |
| [HOD.controller.js](server/controllers/attendance/HOD.controller.js) | Handles approvals & permissions | `canActorActOnLeave()`, `approveRequest()` |

---

## Constants

### Usernames
- **Stage 2 Approver:** `shalini_arun`
- **Final Approvers:** `manu_pillai`, `suraj_rajan`, `rajan_aranamkatte`

### Stages
- **Stage 1:** `stage_1_hod`
- **Stage 2:** `stage_2_shalini`
- **Stage 3:** `stage_3_final`

---

## Database Fields

### LeaveApplication Schema
```javascript
{
  approval_status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'withdrawn',
  approval_stage: 'stage_1_hod' | 'stage_2_shalini' | 'stage_3_final' | null,
  current_approver_id: ObjectId, // Who should approve next
  approval_chain: [
    {
      level: 1,
      stage: 'stage_1_hod',
      approver_id: ObjectId,
      action: 'pending' | 'approved' | 'rejected',
      action_date: Date,
      comments: String
    },
    // ... more stages
  ]
}
```

---

## API Endpoints

### Create Leave Request
**POST** `/api/attendance/leaves`

**Request:**
```json
{
  "leave_type": "casual",
  "from_date": "2026-04-28",
  "to_date": "2026-04-30",
  "total_days": 3,
  "reason": "Personal leave"
}
```

**Response:** Application is routed based on requester's role
- Regular employee → Stage 1 (HOD)
- HOD → Stage 2 (Shalini)
- Shalini → Stage 3 (Manu)
- Final Approver → Stage 3 (Self)

### Approve Leave
**POST** `/api/attendance/approve`

**Request:**
```json
{
  "id": "leave_application_id",
  "type": "leave",
  "status": "approved",
  "comments": "Looks good"
}
```

**Authorization:** Must be the `current_approver_id`

---

## Test Scripts

### 1. Verify Routing Structure
```bash
node server/scripts/test_special_approval_workflow.mjs
```
- Creates test applications for each scenario
- Verifies correct routing
- Checks approval chain structure
- **Expected Result:** 4/4 tests PASS

### 2. Verify Approval Flow
```bash
node server/scripts/test_approval_flow.mjs
```
- Simulates complete approval journey
- Tests permissions at each stage
- Verifies applications reach "approved" status
- **Expected Result:** 3/3 flows PASS

---

## Common Scenarios

### Scenario 1: Team Member Applies
**What happens:**
1. Application created with `approval_stage = 'stage_1_hod'`
2. Team HOD receives notification
3. HOD approves → Moves to Shalini
4. Shalini approves → Moves to Final Approver
5. Final Approver approves → APPROVED

### Scenario 2: HOD Applies
**What happens:**
1. Application created with `approval_stage = 'stage_2_shalini'`
2. Stage 1 automatically marked as SKIPPED
3. Shalini receives notification
4. Shalini approves → Moves to Final Approver
5. Final Approver approves → APPROVED

### Scenario 3: Shalini Applies
**What happens:**
1. Application created with `approval_stage = 'stage_3_final'`
2. Stages 1 & 2 automatically marked as SKIPPED
3. Manu Pillai receives notification
4. Manu approves → APPROVED

### Scenario 4: Manu/Suraj/Rajan Applies
**What happens:**
1. Application created with `approval_stage = 'stage_3_final'`
2. Stages 1 & 2 automatically marked as SKIPPED
3. Current Approver = Self (creator)
4. They can self-approve → APPROVED

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Unable to route leave approval: shalini_arun is not configured" | Shalini account not found | Add Shalini with username `shalini_arun` |
| "Unable to route leave approval: manu_pillai is not configured" | Manu account not found | Add Manu with username `manu_pillai` |
| "Unauthorized: You cannot process your own leave application" | Regular user trying to self-approve | Only admins in the exception list can self-approve |
| "Request is already finalized" | Trying to approve an already processed leave | Can only approve pending applications |

---

## Approval Chain Comments

When stages are skipped, the `approval_chain` includes explanatory comments:

```
Stage 1: "Stage skipped for HOD/admin requester"
Stage 2: "Stage skipped for senior admin requester"
Stage 3: "Final approver group: manu_pillai, suraj_rajan, rajan_aranamkatte"
```

These help audit the approval process and understand why stages were bypassed.

---

## Verification Checklist

- [ ] Test scripts run successfully (4/4 + 3/3)
- [ ] Applications create with correct routing
- [ ] Approvers can only approve when assigned
- [ ] Skipped stages marked as approved with comments
- [ ] Final approvers can self-approve
- [ ] Regular users cannot self-approve
- [ ] Audit trail shows correct approval flow

---

## Support

For issues or questions:
1. Check [SPECIAL_APPROVAL_WORKFLOW_VERIFICATION.md](SPECIAL_APPROVAL_WORKFLOW_VERIFICATION.md)
2. Review test outputs from the scripts
3. Check application's `approval_chain` in database
4. Review `approval_stage` and `current_approver_id` fields

**Last Updated:** April 20, 2026  
**Status:** ✅ Production Ready
