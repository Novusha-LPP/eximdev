# CRM UI Flow - Detailed Walkthrough

## Overview
The EXIM CRM system operates as a dual-interface platform with a **Sales Team CRM Module** and a **Customer KYC Portal**, both managing a single customer journey through three conversion stages.

---

## 📍 Entry Point: Authentication

```
Login Page (LoginPage.js)
    ↓
    ├─→ Sales Team User → CRM Module (CRMModule.jsx)
    └─→ End User/Customer → Customer KYC Portal (CustomerKyc.js)
```

---

## 🔵 SALES TEAM INTERFACE: CRM Module

### Level 1: Dashboard & Navigation
```
CRM Module (CRMModule.jsx)
    ↓
CRM Dashboard (CRMDashboard.jsx)
    - Overview of all pipeline stages
    - Metrics & performance indicators
    - Quick access to all three tabs
    ├───→ TAB 1: SUSPECTS
    ├───→ TAB 2: PROSPECTS  
    └───→ TAB 3: CUSTOMERS
```

---

## 📋 TAB 1: SUSPECTS TAB - Initial Lead Capture

### Screen Flow
```
Suspects Tab
    ↓
SuspectList.jsx
├─ Display all draft records
├─ Show only 4 key fields
├─ Filter & search functionality
├─ Bulk actions
│
├─→ [Create New] Button
│       ↓
│   AddSuspectKYC.jsx
│   • Quick entry form
│   • 4 mandatory fields only:
│     - Company Name
│     - IEC Number
│     - Business Category
│     - Status
│   • Save as Draft
│   • Submit for Approval
│
├─→ [Edit] Button
│       ↓
│   EditProspectKYC.jsx
│   • Full multi-section form
│   • All lookup fields available
│   • Pre-filled from quick add
│   • Save & Submit
│
└─→ [View] Button
        ↓
    Display read-only view
```

### Data State at End of Suspect Stage
```
Record Created with:
├─ draft: true
├─ approval: null
├─ 4 basic fields filled
└─ Status: Draft (Yellow Badge)
```

---

## ✅ VALIDATION GATE: Draft → Prospect

Before moving to Prospect stage, system validates:

```
✓ Address Section
  - Permanent Address OR Principal Office Address
  - Full address with postal code

✓ Contact Person Section
  - Name
  - Designation
  - Phone Number
  - Email Address

✓ Documents Required
  - PAN Certificate (uploaded & verified)
  - IEC Certificate (uploaded & verified)

✓ Basic KYC Information
  - Business category verified
  - Business details filled
```

**If validation FAILS:**
```
System blocks submission → Shows error messages
User must return to EditProspectKYC.jsx → Fix missing data
```

**If validation PASSES:**
```
Record moves to STAGE 2: PROSPECT
├─ draft: false
├─ approval: "Pending"
└─ Status: Pending Approval (Blue Badge)
```

---

## 📊 TAB 2: PROSPECTS TAB - Approval Queue

### Screen Flow
```
Prospects Tab
    ↓
ProspectList.jsx
├─ Display all pending approval records
├─ Show filtered prospects only (draft=false, approval=Pending)
├─ Advanced filters:
│  - Date range
│  - Category
│  - Source
│  - Submitted by
│
├─→ [Search] Box
│       ↓
│   Search by name, IEC, email
│
├─→ [Edit] Button
│       ↓
│   EditProspectKYC.jsx
│   • Full 8-section form
│   • 1. Basic Information
│   • 2. Address Details
│   • 3. Contact Persons
│   • 4. Factory Locations & GST
│   • 5. Bank Accounts
│   • 6. Documents
│   • 7. Additional Details
│   • 8. Open Points
│
└─→ [Action Buttons]
        ├─→ [Approve] Button
        │       ↓
        │   Update record:
        │   ├─ approval: "Approved"
        │   ├─ approvedDate: current date
        │   ├─ approvedBy: admin user
        │   └─ Status: Approved (Green Badge)
        │       ↓
        │   → Move to STAGE 3: CUSTOMER
        │
        ├─→ [Send for Revision] Button
        │       ↓
        │   Revert to STAGE 2 with:
        │   ├─ approval: "Sent for revision"
        │   ├─ feedbackComments: [admin notes]
        │   └─ Status: Revision Pending (Orange Badge)
        │       ↓
        │   → Customer notified of changes needed
        │
        └─→ [Escalate to HOD] Button
                ↓
            Update record:
            ├─ approval: "Pending HOD"
            ├─ escalatedDate: current date
            ├─ escalatedBy: admin user
            └─ Status: Escalated (Purple Badge)
                ↓
            → Moves to HOD Review (if HOD role exists)
                    ↓
                [HOD Reviews & Approves]
                ├─ approval: "Approved by HOD"
                └─ Status: HOD Approved (Green Badge)
                    ↓
                → Move to STAGE 3: CUSTOMER
```

---

## 🎯 TAB 3: CUSTOMERS TAB - Approved Accounts

### Screen Flow
```
Customers Tab
    ↓
CustomerList.jsx
├─ Display only approved records
├─ Filter conditions:
│  - draft: false
│  - approval: "Approved" OR "Approved by HOD"
├─ Status: Active (Green Badge)
├─ Sortable by:
│  - Date approved
│  - Company name
│  - Category
│
├─→ [View] Button
│       ↓
│   CompleteCustomerKYC.jsx
│   • Read-only full profile
│   • All sections visible:
│     - Company details
│     - All addresses
│     - Contact persons
│     - Bank accounts
│     - Documents with history
│     - Credit terms
│     - Additional info
│
└─→ [Manage] Button
        ↓
    OpenPoints.jsx
    • Compliance issues tracking
    • Non-confirmations
    • Outstanding items
    • Resolution tracking
    • Date follow-up required
```

---

## 🟢 GREEN INTERFACE: Customer KYC Portal

### Level 1: Portal Dashboard
```
Customer KYC Portal (CustomerKyc.js)
    ↓
Customer Dashboard Navigation
    ├─→ TAB 1: NEW APPLICATION
    ├─→ TAB 2: MY SUBMISSIONS
    ├─→ TAB 3: DRAFTS
    ├─→ TAB 4: COMPLETED
    └─→ TAB 5: REVISIONS
```

### TAB 1: NEW APPLICATION
```
New Application Tab
    ↓
CustomerKycForm.js
├─ Step-by-step wizard form
├─ Progress indicator
├─ Auto-save functionality
├─ Mandatory field validation
├─ Required documents:
│  - PAN
│  - IEC
│  - Address proof
│  - GST (if applicable)
│
└─→ [Submit] Button
        ↓
    Record created with:
    ├─ draft: false
    ├─ approval: "Pending"
    └─ Status: Submitted → Enters STAGE 2: PROSPECT
```

### TAB 2: MY SUBMISSIONS
```
My Submissions Tab
    ↓
ViewCustomerKyc.js
├─ Display all submitted applications
├─ Show current status
├─ Status indicators:
│  - Pending (Blue)
│  - Approved (Green)
│  - Revision Needed (Orange)
│  - Escalated (Purple)
│
└─→ [View Details] Button
        ↓
    Display read-only preview
    ├─ All submitted information
    ├─ Documents uploaded
    └─ Timeline of changes
```

### TAB 3: DRAFTS
```
Drafts Tab
    ↓
ViewDrafts.js
├─ Display unsaved draft applications
├─ Show completion percentage
├─ Last modified timestamp
├─ Auto-save indicator
│
└─→ [Continue] Button
        ↓
    Resume editing in CustomerKycForm.js
    (Same form, pre-filled data)
```

### TAB 4: COMPLETED
```
Completed Tab
    ↓
CompletedKyc.js
├─ Display all approved applications
├─ Status: Active/Completed
├─ Approval date shown
├─ Documents available for download
│
└─→ [View Profile] Button
        ↓
    Display read-only complete profile
    ├─ Final approved information
    └─ Confirmation documents
```

### TAB 5: REVISIONS
```
Revisions Tab
    ↓
ReviseCustomerKyc.js
├─ Display applications needing revision
├─ Show admin feedback/comments
├─ Highlight sections needing update
├─ Auto-populate previous responses
│
└─→ [Update & Resubmit] Button
        ↓
    Submit revised application
    ├─ Revisioncount incremented
    ├─ Timestamp updated
    └─ Returns to STAGE 2: PROSPECT awaiting re-review
```

---

## 🔄 Complete Customer Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                     CUSTOMER JOURNEY TIMELINE                      │
└─────────────────────────────────────────────────────────────────┘

STAGE 1: SUSPECT (Draft)
├─ Entry: Quick add form (4 fields)
├─ Status Badge: Yellow (Draft)
├─ Data Fields: Name, IEC, Category, Status
├─ Location: CRM -> Suspects Tab OR Customer Portal -> New App
├─ Duration: Minutes to hours
│
└─→ Validation Gate Check
    (Address, Contacts, PAN, IEC)
    
STAGE 2: PROSPECT (Under Review)
├─ Entry: Auto-moved after validation OR manual customer submission
├─ Status Badge: Blue (Pending), Orange (Revision), Purple (Escalated)
├─ Data Fields: Full form 8 sections
├─ Location: CRM -> Prospects Tab
├─ Duration: 1-7 days
├─ Approval Paths:
│  ├─ Admin Approval → STAGE 3
│  ├─ HOD Escalation → HOD Review → STAGE 3
│  └─ Send for Revision → Back to STAGE 2
│
└─→ Final Approval Decision
    
STAGE 3: CUSTOMER (Active)
├─ Entry: Admin or HOD approval
├─ Status Badge: Green (Approved/Active)
├─ Data Fields: Full read-only profile
├─ Location: CRM -> Customers Tab
├─ Duration: Ongoing (until deactivated)
├─ Features:
│  ├─ Complete profile view
│  ├─ Open points management
│  ├─ Transaction eligibility
│  ├─ Multi-location support
│  └─ Document history
│
└─→ Operations Ready
```

---

## 📊 Form Sections in EditProspectKYC.jsx

When editing a record (from any stage), users access:

```
┌─ SECTION 1: BASIC INFORMATION
│  ├─ Company Name (Required)
│  ├─ IEC Number (Required)
│  ├─ Business Category (Required)
│  ├─ Business Type
│  ├─ Year of Establishment
│  └─ Constitution

├─ SECTION 2: ADDRESS DETAILS
│  ├─ Permanent Address
│  │  ├─ Street, City, State, Pin
│  │  └─ Country
│  └─ Principal Office Address
│     ├─ Street, City, State, Pin
│     └─ Country

├─ SECTION 3: CONTACT PERSONS
│  ├─ Contact Name (Required)
│  ├─ Designation (Required)
│  ├─ Phone (Required)
│  ├─ Email (Required)
│  └─ [Add More] Button

├─ SECTION 4: FACTORY LOCATIONS & GST
│  ├─ Factory Name
│  ├─ Factory Address
│  ├─ GST Registration
│  └─ [Add More] Button

├─ SECTION 5: BANK ACCOUNTS
│  ├─ Bank Name
│  ├─ Account Number
│  ├─ Account Holder
│  ├─ Account Type
│  └─ [Add More] Button

├─ SECTION 6: DOCUMENTS
│  ├─ PAN Certificate
│  ├─ IEC Certificate
│  ├─ GST Certificate
│  ├─ Other Documents
│  └─ [Upload] Button

├─ SECTION 7: ADDITIONAL DETAILS
│  ├─ Credit Period (days)
│  ├─ Credit Limit
│  ├─ Advanced Payment Required
│  └─ Remarks

└─ SECTION 8: OPEN POINTS
   ├─ Non-confirmations
   ├─ Outstanding Items
   └─ Resolution Status
```

---

## 🎨 Status Badge System

```
┌──────────────────────┬──────────┬─────────────────────────────┐
│ Status               │ Color    │ Meaning                     │
├──────────────────────┼──────────┼─────────────────────────────┤
│ Draft                │ Yellow   │ Unsaved, in progress        │
│ Submitted            │ Blue     │ Waiting for admin review    │
│ Pending Approval     │ Blue     │ In approval queue           │
│ Sent for Revision    │ Orange   │ Feedback received, needs fix│
│ Escalated to HOD     │ Purple   │ Awaiting HOD review         │
│ Approved by Admin    │ Green    │ Admin approved              │
│ Approved by HOD      │ Green    │ HOD approved                │
│ Active               │ Green    │ Fully operational customer  │
│ Inactive/Deactivated │ Gray     │ No longer active            │
└──────────────────────┴──────────┴─────────────────────────────┘
```

---

## 🔌 Shared Components Used Across CRM

```
AddressForm.jsx
├─ Used in: All edit/add forms
├─ Handles: Address entry & validation
└─ Features: Multiple address types

BankAccountManager.jsx
├─ Used in: Customer editing & viewing
├─ Handles: Multiple bank account management
└─ Features: Add, edit, delete accounts

BranchManager.jsx
├─ Used in: Customer profile
├─ Handles: Branch information
└─ Features: Multi-branch support

ContactManager.jsx
├─ Used in: All forms requiring contacts
├─ Handles: Contact person management
└─ Features: Add, edit, delete contacts

FactoryAddressManager.jsx
├─ Used in: Customer editing & viewing
├─ Handles: Factory locations & GST
└─ Features: Multi-location management

FileUpload.jsx
├─ Used in: All document sections
├─ Handles: Document upload & storage
└─ Features: Category-based validation

StatusBadge.jsx
├─ Used in: All list views
├─ Handles: Visual status representation
└─ Features: Color-coded status display

OpenPoints.jsx
├─ Used in: Customer profile management
├─ Handles: Compliance issue tracking
└─ Features: Issue tracking & resolution
```

---

## 🔃 Data Flow & API Integration

```
Frontend Component
    ↓
useKyc.js Hook (Custom Hook)
├─ State Management
├─ Data Validation
├─ Error Handling
│
    ↓
REST API Call
├─ POST /api/kyc/create
├─ PUT /api/kyc/update/:id
├─ GET /api/kyc/:id
├─ POST /api/kyc/approve/:id
├─ POST /api/kyc/revise/:id
└─ POST /api/kyc/escalate/:id
    
    ↓
Backend API Handler (server/app.mjs routes)
├─ Request Validation
├─ Business Logic
├─ Database Operations
│
    ↓
MongoDB Database
├─ CustomerKyc Collection
├─ Audit Trail
└─ Document Storage
```

---

## ✨ Key Features by Component

| Component | Key Features |
|-----------|-------------|
| **CRMModule** | Tab-based navigation, sidebar menu, user profile |
| **CRMDashboard** | Pipeline metrics, stage breakdown, recent activity |
| **SuspectList** | Bulk operations, sorting, filtering, quick actions |
| **EditProspectKYC** | 8-section form, nested editors, auto-save, validation |
| **ProspectList** | Advanced filters, escalation queue, approval dashboard |
| **CompleteCustomerKYC** | Read-only view, document history, activity timeline |
| **CustomerKycForm** | Wizard interface, progress tracking, step validation |
| **OpenPoints** | Issue logging, deadline tracking, resolution status |

---

## 📱 Responsive Design Notes

- All views are mobile-responsive
- Forms stack vertically on mobile
- Touch-friendly buttons & inputs
- Drawer navigation on mobile for CRM module
- Bottom navigation for customer portal on mobile

---

## 🔐 Role-Based Access Control

```
CRM Admin / Sales Manager
├─ Access: All CRM tabs
├─ Actions: Create, Edit, Approve, Escalate
└─ View: All customer stages

HOD (Head of Department)
├─ Access: Escalated prospects only
├─ Actions: Review, Approve, Send back
└─ View: Escalated queue only

Sales Executive
├─ Access: Suspects & Prospects (assigned)
├─ Actions: Create, Edit suspects
└─ View: Own suspects only

End Customer
├─ Access: Customer KYC portal only
├─ Actions: Create, Submit, Revise, View status
└─ View: Own applications only

Operations User
├─ Access: Customers tab only
├─ Actions: View, Manage open points
└─ View: Approved customers only
```
