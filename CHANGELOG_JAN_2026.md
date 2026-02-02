# Changelog - January 2026

## January 31, 2026 (Today)

### KPI Module Enhancements

#### 1. KPI Template Import - Owner Name Display
- **File:** `client/src/components/kpi/KPIHome.js`
- **Change:** Added owner's first name and last name beside the template name in the "Import from Team Member" dropdown
- **Before:** Dropdown only showed template name (e.g., "sample")
- **After:** Dropdown now shows template name with owner (e.g., "sample - John Doe")

#### 2. KPI Template Import - Duplicate Validation & Custom Name
- **Files:** 
  - `client/src/components/kpi/KPIHome.js`
  - `server/routes/kpi/kpiRoutes.mjs`
- **Changes:**
  - Added frontend validation to check for duplicate template names (case-insensitive)
  - Added input field to allow users to customize/modify template name before importing
  - Real-time validation with error message display
  - Import button disabled when duplicate name detected
  - Backend updated to accept `customName` parameter
  - Case-insensitive duplicate check on server side
  - Success message now includes the template name

#### 3. Admin Team Management
- **Files:**
  - `server/routes/team/teamRoutes.mjs`
  - `client/src/components/hod/HodManagement.js`
- **Changes:**
  - Created backend API endpoint to fetch all teams with HOD and member details
  - Modified frontend to fetch and display all teams for admin users
  - Display includes relevant details for each team, HOD, and members

---

## January 30, 2026 (Yesterday)

### User Profile Enhancements

#### 1. Profile Open Points View
- **Files:**
  - `client/src/components/userProfile/UserProfile.js`
  - Related service files
- **Changes:**
  - Display any user's open points on their profile page
  - User's name formatted as "First Name LAST NAME"
  - Admins can view any user's open points

### KPI Reviewer Dashboard

#### 2. Reviewer Dashboard
- **Files:**
  - `client/src/components/kpi/KPIReviewerDashboard.js` (new)
  - `server/routes/kpi/kpiRoutes.mjs`
- **Changes:**
  - Created reviewer dashboard for users assigned to check, verify, or approve KPI sheets
  - Displays all sheets pending review, categorized by action type (check, verify, approve)
  - Includes rejection reasons if applicable
  - Shows history of recently processed sheets
  - Displays counts of pending items

### Weighment Slip Improvements

#### 3. Update Weighment Slip Data
- **Files:**
  - `server/routes/weighment_slip_concor.py`
- **Changes:**
  - Prevent duplicate file uploads to S3
  - Always update data even if file already processed
  - Use existing S3 URL if file is duplicate, but still update database records
  - Updated status reporting to reflect whether data was updated on new or existing file

---

## Summary of Changes

| Date | Module | Feature | Status |
|------|--------|---------|--------|
| Jan 31 | KPI | Owner name in import dropdown | ✅ Complete |
| Jan 31 | KPI | Duplicate validation + custom name on import | ✅ Complete |
| Jan 31 | Admin | Team management for admins | ✅ Complete |
| Jan 30 | Profile | Open points view on profile | ✅ Complete |
| Jan 30 | KPI | Reviewer dashboard | ✅ Complete |
| Jan 30 | Weighment | Duplicate handling + data update | ✅ Complete |

---

*Last Updated: January 31, 2026 at 7:16 PM IST*
