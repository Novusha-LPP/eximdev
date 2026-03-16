# Customer KYC & CRM Module Documentation

---

## Table of Contents
1. [KYC vs CRM: Architecture & Integration](#kyc-vs-crm)
2. [KYC Module - What Makes It Different](#kyc-module-differences)
3. [CRM Module Architecture](#crm-module-architecture)
4. [CRM Pipeline Flow](#crm-pipeline-flow)
5. [CRM UI Flow & User Interface](#crm-ui-flow)
6. [Technical Fields & Database Schema](#technical-fields)
7. [Workflow States & Transitions](#workflow-states)
8. [Role-Based Access Control](#role-based-access)
9. [API Endpoints Summary](#api-endpoints)

---

## KYC vs CRM: Architecture & Integration

### **What is the KYC Module?**

The **KYC (Know Your Customer) Module** is a **standalone compliance & data collection system** designed to:

- **Capture comprehensive customer information** required for regulatory compliance and business operations
- **Store complete customer profiles** with all personal, financial, and compliance data
- **Support multiple entity types** with tailored documentation requirements
- **Maintain historical records** of customer information with audit trails
- **Enable customer self-service** for independent application submission and management

#### **KYC Module Characteristics:**
```
Purpose: Data Collection & Record Management
Scope: Individual customer/company information
Users: Customers, Admins, Auditors
Actions: Create, Edit, View, Store, Approve
Output: Approved customer record stored in database
Workflow: Linear (New → Draft → Complete → Stored)
Access: Direct form-based (independent routing)
```

#### **KYC Module Components:**
- `CustomerKyc.js` - Main navigation & tab management
- `CustomerKycForm.js` - Form for new applications
- `ViewCustomerKyc.js` - View submitted KYCs
- `ReviseCustomerKyc.js` - Edit applications with feedback
- `CustomerKycStatus.js` - Admin dashboard to see all submissions
- `ViewDrafts.js` - List draft applications
- `CompletedKyc.js` - View approved customers
- **Routes**: `/customer-kyc`, `/view-customer-kyc/:id`, `/revise-customer-kyc/:id`
- **Database**: Single `CustomerKyc` collection

#### **KYC Module Access Points:**
```
Sidebar Menu: "Customer KYC"
Direct URLs: 
  - /customer-kyc (Main hub)
  - /customer-kyc?tab=1 (New Application)
  - /customer-kyc?tab=2 (My Drafts)
  - /customer-kyc?tab=3 (Revisions)
  - /customer-kyc?tab=4 (Completed)
```

---

### **What is the CRM Module?**

The **CRM (Customer Relationship Management) Module** is a **sales pipeline & customer lifecycle management system** that:

- **Manages customer relationships** through multiple stages of engagement
- **Implements a structured pipeline** (Suspect → Prospect → Customer)
- **Tracks business interactions** with quality metrics (days pending, revision loops)
- **Enables team collaboration** with approval workflows and escalations
- **Provides competitive analysis** (stagnant prospects, at-risk customers)

#### **CRM Module Characteristics:**
```
Purpose: Sales Pipeline & Relationship Management
Scope: Customer lifecycle from initial interest to approved customer
Users: Sales Team, Managers, HOD, Admin
Actions: Create, Qualify, Review, Approve, Escalate
Output: Customer progression through pipeline stages
Workflow: Multi-stage (Suspect → Prospect → Customer with approval gates)
Access: Tab-based navigation with list/detail views
```

#### **CRM Module Components:**
- `CRMModule.jsx` - Main navigation & dashboard
- `CRMDashboard.jsx` - Pipeline overview with metrics
- `SuspectList.jsx` - List of potential customers (drafts)
- `AddSuspectKYC.jsx` - Quick prospect creation
- `ProspectList.jsx` - Pending approval queue with filters
- `EditProspectKYC.jsx` - Detailed prospect form
- `CustomerList.jsx` - Approved customers
- `CompleteCustomerKYC.jsx` - Full customer profile with operations
- `OpenPoints.jsx` - Compliance item tracking
- **Routes**: `/crm`, `/crm?tab=dashboard`, `/crm?tab=suspects`, etc.
- **Database**: Same `CustomerKyc` collection (with workflow fields)

#### **CRM Module Access Points:**
```
Sidebar Menu: "CRM Pipeline"
Direct URL: /crm
Tabs:
  - Dashboard (stats & overview)
  - Suspects (draft candidates)
  - Prospects (pending approval)
  - Customers (approved & active)
```

---

### **Key Differences: KYC vs CRM**

| Aspect | KYC Module | CRM Module |
|--------|-----------|-----------|
| **Purpose** | Compliance collection | Sales pipeline management |
| **Primary User** | Customer | Sales/Approval team |
| **Focus** | Data accuracy, completeness | Revenue, relationships, approval status |
| **Navigation Model** | Tabs (Admin/Non-Admin split) | Tabs + Detail views with state routing |
| **Key Workflow** | Linear (Create → Complete) | Non-linear (3-stage with loops) |
| **Approval Model** | Single-gate (Approved/Not) | Multi-stage (Pending → Approved → Escalate) |
| **Data Entry** | By customer or admin | By sales/management |
| **Revision Loop** | Simple (edit & resubmit) | Complex (rejection + revision) |
| **Team Coordination** | Individual submissions | Team-based approvals |
| **Document Tracking** | Compliance focused | Compliance + operations |
| **Primary Stakeholder** | Compliance/Admin | Sales & Management |

---

### **How They Are Linked: The Integration Model**

Both modules use **the same database collection** (`CustomerKyc`) but view it through **different lenses** and **workflow processes**:

#### **Single Database, Dual Interface**

```
┌─────────────────────────────────────────────────────┐
│         MongoDB: CustomerKyc Collection              │
│  (Single source of truth for all customer data)      │
└────────────────┬──────────────────────────┬──────────┘
                 │                          │
        ┌────────▼────────┐        ┌────────▼────────┐
        │   KYC Module    │        │   CRM Module    │
        │  (Customer View)│        │ (Sales Pipeline)│
        └─────────────────┘        └─────────────────┘
```

#### **Data Bridge Architecture**

**KYC Module → CRM Module Conversion:**

```javascript
// When customer submits KYC through Customer KYC module
1. Create record with draft: "true"
2. Customer fills form and saves
3. Customer clicks "Submit"
   ↓
4. Record moves to CRM as draft: "false"
5. Status: approval: "Pending"
6. Automatically appears in CRM → Prospects tab
```

**Information Flow Example:**

```
Customer Portal                Database               CRM Pipeline
(KYC Module)                   (MongoDB)             (CRM Module)

Create KYC Application
    ↓
CustomerKyc Document
  - name_of_individual: "ABC Industries"
  - iec_no: "0512ABC001"
  - category: "Company"
  - status: "Manufacturer"
  - [All 100+ fields]
  - draft: "true"
  - approval: "Pending"
    ↓
[Admin clicks Submit]
    ↓
Same Document Updated         Same Document
  - draft: "false"           Now appears in:
  - approval: "Pending"      CRM → Suspects → List
    ↓
[CRM Manager reviews]         Manager can:
    ↓                         • Edit prospect
  - approval: "Approved"      • Send for revision
  - approved_by: "Manager1"   • Escalate to HOD
    ↓
Customer sees:                Customer/Ops see:
"Application Approved"        "Customer Active"
in KYC module                 in CRM module
```

---

### **Three Integration Points**

#### **1. Shared Data Model**
Both modules read/write to the same `CustomerKyc` collection with these key fields:

```javascript
// Shared across both modules
{
  _id: ObjectId,
  name_of_individual: String,
  iec_no: String,
  category: Enum,
  status: Enum,
  
  // [All 100+ customer data fields]
  
  // WORKFLOW FIELDS - Bridge between KYC and CRM
  draft: "true" | "false",
  approval: "Pending" | "Approved" | "Approved by HOD" | "Sent for revision",
  approved_by: String,
  remarks: String,
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**KYC Module sees**: `draft: "true"` → "Incomplete Application"  
**CRM Module sees**: `draft: "false"` + `approval: "Pending"` → "Prospect needing approval"

#### **2. Unified API Layer**

Despite different UI, both modules use the same backend:

```javascript
// Both KYC and CRM call same endpoints
API Routes (Backend):

// Shared routes
POST   /api/add-customer-kyc           ← Both modules
GET    /api/view-all-customer-kyc      ← Both modules
GET    /api/view-customer-kyc/:id      ← Both modules

// CRM-specific routing
GET    /api/crm/suspects               ← Queries: draft="true"
GET    /api/crm/prospects              ← Queries: draft="false" + approval="Pending"
GET    /api/crm/customers              ← Queries: approval="Approved"

// All routes update same database
```

#### **3. Status Synchronization**

Changes in one module immediately reflect in the other:

```javascript
// KYC Module Action → CRM Module Effect

Action in KYC Module          What Changes          Visible in CRM Module
─────────────────────────────────────────────────────────────────────
Customer submits form    →    draft: "true" → "false"  →  Appears in Prospects
Admin sends for revision →    approval→"Sent for revision" → Status updates  
CRM Manager approves     →    approval → "Approved"     → Moves to Customers
User edits draft         →    updatedAt updated         → "Recently updated" flag
```

---

### **Workflow Separation & Linking**

#### **KYC Module Workflow (Standalone)**
```
User creates application
    ↓
Fills form gradually  
    ↓
Saves as draft (optional)
    ↓
Submits for approval
    ↓
Receives feedback (revision)
    ↓
Edits application
    ↓
Gets approved
    ↓
Application complete
```

#### **CRM Module Workflow (Sales Pipeline)**
```
Sales team adds suspect (quick 4-field entry)
    ↓
Moves to prospect status (full form required)
    ↓
Manager/Admin reviews completeness
    ↓
Sends for revision OR approves
    ↓
HOD escalation (if complex)
    ↓
Final approval
    ↓
Customer becomes active
    ↓
Operations can process orders/shipments
```

#### **Linking Point: The Shared Approval Field**

```
draft field = "true"  ━━━┓
                         ├━━━ SUSPECT (In creation)
approval = "Pending"  ━━━┛

draft field = "false" ━━━┐
                         ├━━━ PROSPECT (Awaiting approval)
approval = "Pending"  ━━━┛

draft field = "false" ━━┐
                        ├━━━ CUSTOMER (Approved & Active)
approval = "Approved" ━━┘
```

---

### **Why Separate Modules?**

#### **KYC = Customer Self-Service**
- Customers manage their own data
- Personal, step-by-step experience
- Focused on data quality & completeness
- Multiple application states (draft, submitted, revision, completed)
- Customer-centric messaging & guidance

#### **CRM = Business Operations**
- Sales/management team view
- Pipeline metrics (funnel, stagnation, aging)
- Approval workflows with team coordination
- Escalation paths & authority levels
- Revenue-focused insights

#### **Why Not Merge Them?**
✅ **Separation of concerns**: Different user personas  
✅ **Flexible workflows**: KYC for data, CRM for sales  
✅ **Permission control**: Customers see only their app, CRM team sees all  
✅ **Different UX needs**: Linear form vs. pipeline dashboard  
✅ **Scalability**: Can optimize each based on usage patterns  

---

### **Integration Examples**

#### **Example 1: New Customer Journey**

```
Day 1 - KYC Module:
  Customer accesses /customer-kyc
  → Creates new application
  → Fills basic info (4 fields minimum)
  → Saves as draft

Day 3 - KYC Module:
  Customer returns to /customer-kyc?tab=2 (My Drafts)
  → Continues filling form
  → Adds factory address, banking, contacts
  → Uploads documents
  → Clicks "Submit for Approval"

At this moment ↓↓↓ THE LINK HAPPENS ↓↓↓
  
  Same record updates:
  - draft: "true" → "false"
  - updatedAt: new timestamp

Day 4 - CRM Module:
  Sales Manager opens /crm?tab=2 (Prospects)
  → Sees "ABC Industries" in the pending queue
  → "Days Pending: 1"
  → Reviews completeness (form sections green-lit)
  → Clicks "Approve"
  → approval: "Pending" → "Approved"

At this moment ↓↓↓ THE SYNC HAPPENS ↓↓↓

Day 4 - KYC Module (if customer checks):
  Customer logs into /customer-kyc?tab=4 (Completed KYC)
  → Sees "ABC Industries - Approved"
  → Can view read-only copy of submitted data

Day 4 - CRM Module:
  Customer now appears in /crm?tab=4 (Customers)
  → Operations team can use customer for orders/shipments
  → Create import-export documents
  → Process shipments
```

#### **Example 2: Revision Loop**

```
CRM Manager reviewing prospect:
  → Sees form incomplete (1 address missing)
  → Clicks "Send for Revision"
  → Enters remarks: "Please add factory address"

Backend updates same record:
  - approval: "Pending" → "Sent for revision"
  - remarks: "Please add factory address"

Customer sees in KYC Module:
  → /customer-kyc?tab=3 (Revisions)
  → "ABC Industries - Revision Required"
  → "Please add factory address"
  → Clicks Edit

Customer edits and resubmits:
  → approval: "Sent for revision" → "Pending"
  → Record goes back to CRM manager queue

CRM Manager reviews again:
  → Same customer reappears in Prospects
  → Now has complete data
  → Approves
```

---

### **Summary: The Integration Strategy**

| Aspect | KYC | CRM | Integration |
|--------|-----|-----|-------------|
| **Database** | CustomerKyc collection | CustomerKyc collection | Same collection |
| **User Interface** | Form-based, tabs | Dashboard + lists | Different UIs, same data |
| **Workflow Control** | draft field | approval field | Two fields manage both flows |
| **Data Ownership** | Customer | Management | Both own different aspects |
| **Approval Authority** | Admin (approval/revision) | Admin/HOD (escalation) | Layered approvals |
| **Visibility** | Customer sees own record | Team sees all in pipeline | Access controlled |
| **Real-time Sync** | Automatic via shared DB | Automatic via shared DB | Instant updates |

**Key Insight**: KYC and CRM aren't separate products—they're **two different lenses on the same customer data**, optimized for two different user groups using the same underlying truth.

---

## KYC Module - What Makes It Different

### 1. **Entity-Type Specific Document Requirements**
Unlike generic KYC systems, this module supports **four different entity categories** with tailored document requirements:

#### **Individual / Proprietary Firm**
- Passport Image
- Voter Card Image
- Driving License Image
- Bank Statement Image
- Ration Card Image
- Aadhar Card Image

#### **Partnership Firm**
- Registration Certificate
- Partnership Deed
- Power of Attorney
- Valid Document
- Aadhar Card (Front & Back)
- Telephone Bill

#### **Company**
- Certificate of Incorporation
- Memorandum of Association
- Articles of Association
- Power of Attorney
- Telephone Bill
- PAN Allotment Letter

#### **Trust / Foundation**
- Certificate of Registration
- Power of Attorney
- Officially Valid Document
- Resolution of Managing Body
- Telephone Bill
- Trustee Names
- Founder Information

### 2. **Multi-Stage Approval Pipeline**
This KYC system implements a **3-level approval workflow**:

```
Suspect → Prospect → Customer
(Draft)  (Pending)  (Approved)
```

**Key Differentiators:**
- **Suspect Phase**: Quick initial data capture (only 4 mandatory fields)
- **Prospect Phase**: Comprehensive form completion with validation gates
- **Customer Phase**: Final approval with open points tracking

### 3. **Comprehensive Location & Business Data**
Captures multiple addresses in a single KYC:

- **Permanent Business Address** (Primary)
- **Principal Business Address** (Operating location)
- **Factory Addresses** (Multiple with individual GST tracking)
- **Branch Information** (Multiple branches with GST numbers)
- **Auto-copy functionality**: "Same as Permanent Address" flag

### 4. **Manufacturing & Export-Specific Fields**
Beyond standard KYC, includes:

- **Factory Photographs**
  - Factory name board image
  - Factory selfie image
- **HSN Codes** (Harmonized System Nomenclature)
- **SPCB Registration** (State Pollution Control Board)
- **Factory Verification Images**
- **GST Returns** (for each location)
- **Date of Incorporation** (for companies)

### 5. **Financial & Credit Information**
Embedded credit management:

- **Credit Period** (duration negotiated)
- **Credit Limit Validity Date**
- **Quotation Requirement** (Yes/No flag)
- **Outstanding Limit** (as string for flexibility)
- **Advance Payment Requirement** (boolean flag)

### 6. **Multi-Bank Account Management**
Supports multiple bank accounts per customer:

```javascript
banks: [
  {
    bankers_name: "HDFC Bank",
    branch_address: "Mumbai Branch",
    account_no: "1234567890",
    ifsc: "HDFC0000123",
    adCode: "12345",
    adCode_file: ["URL"]  // Advance Directive Code
  }
]
```

### 7. **Contact Person Management**
Flexible contact tracking:

```javascript
contacts: [
  {
    name: "John Doe",
    designation: "Operations Manager",
    phone: "+91-9876543210",
    email: "john@company.com"
  }
]
```

### 8. **Built-in Approval Tracking**
- **Approval Field**: Enum-based status (Pending, Approved, Approved by HOD, Sent for revision)
- **Approved By**: Username/ID of approver
- **Remarks**: Audit trail comments
- **Timestamps**: Auto-tracked creation & modification

### 9. **Draft Management**
- Full draft capability without triggering approval
- Ability to save incomplete applications
- Separate draft view for users

### 10. **Open Points & Compliance Tracking**
- Not stored in main schema but managed separately
- Tracks outstanding compliance items
- Resolution tracking with timestamps

---

## CRM Module Architecture

### Module Structure

```
CRM Module (Master Pipeline)
├── Dashboard (Stats & Overview)
├── Suspects Tab (Draft Records)
│   ├── List View
│   └── Add New Suspect
├── Prospects Tab (Pending Approval)
│   ├── List View
│   ├── Filter (Pending / Sent for Revision)
│   └── Edit Prospect
├── Customers Tab (Approved Records)
│   ├── List View
│   └── Complete Customer KYC View
└── Open Points (Compliance Items)
```

### Key Technologies
- **Frontend**: React with Material-UI & Ant Design components
- **Backend**: Express.js with MongoDB
- **State Management**: Custom hooks (`useKyc`) with Axios
- **Database**: MongoDB with indexed fields

---

## CRM Pipeline Flow

### **Stage 1: SUSPECT (Draft Creation)**

**Entry Point**: CRM → Suspects Tab → Add New Suspect

**Characteristics:**
- Minimum viable data collection
- **Only 4 mandatory fields**:
  1. Company/Individual Name (`name_of_individual`)
  2. IEC Number (`iec_no`) - with real-time availability check
  3. Category (`category`) - Individual/Partnership/Company/Trust
  4. Status (`status`) - Manufacturer/Trader

**Data Structure:**
```javascript
{
  _id: ObjectId,
  name_of_individual: "ABC Exports Ltd",
  iec_no: "0512ABC001",
  category: "Company",
  status: "Manufacturer",
  draft: "true",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Frontend Components:**
- `AddSuspectKYC.jsx` - Form with validation
- `SuspectList.jsx` - List & management

**Backend Endpoints:**
```
GET    /api/crm/suspects              → Fetch all drafts
POST   /api/crm/suspects              → Create new suspect
PUT    /api/crm/suspects/:id          → Update suspect
DELETE /api/crm/suspects/:id          → Delete suspect
POST   /api/crm/suspects/:id/submit   → Convert to prospect
GET    /api/crm/suspects/check-iec/:iec → IEC availability check
```

**Actions Available:**
- ✏️ Edit suspect
- 🗑️ Delete suspect
- ✅ Submit for approval (moves to Prospects)
- 💾 Save as draft

---

### **Stage 2: PROSPECT (Pending Approval)**

**Entry Point**: Automatically after submitting suspect OR from customer edit

**Characteristics:**
- **Full KYC form completion** with validation gates
- Status: `draft: "false"` and `approval: "Pending"` or `"Sent for revision"`
- Admin & HOD review stage

**Phase 2 Completion Gates** (Must Pass to Submit):

1. ✅ **Address Validation** - Must have at least ONE complete address:
   - Permanent address (Line 1, City, State, Pin)
   - OR Principal business address (Line 1, City, State, Pin)

2. ✅ **Contact Requirement** - At least 1 contact person with:
   - Name
   - Designation
   - Phone
   - Email

3. ✅ **PAN Documentation**:
   - PAN number (`pan_no`)
   - PAN copy document uploaded

4. ✅ **IEC Documentation**:
   - IEC copy document uploaded

**Data Structure:**
```javascript
{
  _id: ObjectId,
  
  // Phase 1 Data
  name_of_individual: "ABC Exports Ltd",
  iec_no: "0512ABC001",
  category: "Company",
  status: "Manufacturer",
  
  // Phase 2 Data
  permanent_address_line_1: "123 Business Street",
  permanent_address_line_2: "Suite 500",
  permanent_address_city: "Mumbai",
  permanent_address_state: "Maharashtra",
  permanent_address_pin_code: "400001",
  permanent_address_telephone: "+91-22-1234-5678",
  permanent_address_email: "info@abc.com",
  
  principle_business_address_line_1: "456 Factory Road",
  principle_business_address_city: "Pune",
  principle_business_address_state: "Maharashtra",
  principle_business_address_pin_code: "411001",
  principle_business_website: "www.abcexports.com",
  principle_business_telephone: "+91-20-5678-1234",
  principle_address_email: "ops@abc.com",
  
  // Contacts
  contacts: [
    {
      name: "Raj Kumar",
      designation: "Chief Operations Officer",
      phone: "+91-9876543210",
      email: "raj@abc.com"
    }
  ],
  
  // Documents
  pan_no: "ABCDE1234F",
  pan_copy: ["url_to_pan_document"],
  iec_copy: ["url_to_iec_document"],
  
  // Multi-factory support
  factory_addresses: [
    {
      factory_address_line_1: "Plot 100, Industrial Area",
      factory_address_city: "Bangalore",
      factory_address_state: "Karnataka",
      factory_address_pin_code: "560001",
      gst: "18AABCU1234A1Z0",
      gst_reg: ["url_to_gst_certificate"]
    }
  ],
  
  // Banking
  banks: [
    {
      bankers_name: "ICICI Bank",
      branch_address: "Fort, Mumbai",
      account_no: "0123456789",
      ifsc: "ICIC0000001",
      adCode: "12345",
      adCode_file: ["url"]
    }
  ],
  
  // Compliance
  approval: "Pending",
  draft: "false",
  remarks: "",
  approved_by: null,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Frontend Components:**
- `ProspectList.jsx` - List with filters
- `EditProspectKYC.jsx` - Form editing
- `ContactManager.jsx` - Contact sub-form
- `FileUpload.jsx` - Document upload

**Backend Endpoints:**
```
GET    /api/crm/prospects              → Fetch prospects (with filter)
GET    /api/crm/prospects/:id          → Fetch single prospect
PUT    /api/crm/prospects/:id          → Update prospect
POST   /api/crm/prospects/:id/submit   → Submit for manager approval
POST   /api/crm/prospects/:id/approve  → Approve (Admin role)
POST   /api/crm/prospects/:id/revision → Send for revision
POST   /api/crm/prospects/:id/escalate → Escalate to HOD
POST   /api/crm/prospects/:id/hod-approve → HOD final approval
```

**Prospect Filters:**
- **All** - Show all prospects
- **Pending** - Awaiting initial approval
- **Sent for revision** - Returned for corrections

**Approval Workflow:**

```
Prospect Created
    ↓
[Admin Reviews]
    ├→ ✅ Approve → "Approved"
    ├→ ❌ Send for Revision → "Sent for revision"
    │   └→ User edits → Back to Pending
    └→ 🚀 Escalate to HOD → "Pending" (awaits HOD)
    
[HOD Review (if escalated)]
    ├→ ✅ HOD Approve → "Approved by HOD"
    └→ ❌ Send for Revision → "Sent for revision"
```

**Metrics Tracked:**
- `daysPending` - Calculated: days since last update
- Stagnant prospects: Pending → 30+ days without update

---

### **Stage 3: CUSTOMER (Fully Approved)**

**Entry Point**: Automatically when prospect reaches "Approved" or "Approved by HOD" state

**Characteristics:**
- Complete KYC profile locked (read-only by default)
- Open points can still be added/resolved
- Status: `approval: "Approved"` or `"Approved by HOD"`
- Available for:
  - Credit management
  - Order processing
  - Shipment creation

**Database Query Logic:**
```javascript
// Get all customers
WHERE approval IN ["Approved", "Approved by HOD"]
  AND draft = "false"
```

**Frontend Components:**
- `CustomerList.jsx` - List of approved customers
- `CompleteCustomerKYC.jsx` - Full profile view with tabs:
  - Overview
  - Documents
  - Locations (Factories & Branches)
  - Banking
  - Finance
  - Contacts
  - Compliance & Open Points

**Backend Endpoints:**
```
GET    /api/crm/customers              → Fetch all customers
GET    /api/crm/customers/:id          → Fetch customer details
PUT    /api/crm/customers/:id          → Update customer
POST   /api/crm/customers/:id/open-points      → Add open point
PATCH  /api/crm/customers/:id/open-points/:idx/resolve → Resolve open point
GET    /api/crm/customers/:id/open-points      → Fetch open points
```

**Data Available for Operations:**
- Credit details (period, limit, validity)
- Banking information
- Contact details
- Factory locations & GST numbers
- Outstanding limits
- Advance payment requirements

---

## Technical Fields & Database Schema

### **Core Identity Fields**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | Auto | MongoDB primary key |
| `iec_no` | String | ✅ | IEC number - Unique, auto-uppercase |
| `pan_no` | String | ❌ | PAN - auto-uppercase |
| `category` | Enum | ✅ | Individual/Partnership/Company/Trust |
| `status` | Enum | ✅ | Manufacturer/Trader |
| `name_of_individual` | String | ✅ | Company/Individual name |

### **Address Fields (Permanent)**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `permanent_address_line_1` | String | Phase 2 Gate | Main address |
| `permanent_address_line_2` | String | ❌ | Secondary address |
| `permanent_address_city` | String | Phase 2 Gate | City |
| `permanent_address_state` | String | Phase 2 Gate | Indian state |
| `permanent_address_pin_code` | String | Phase 2 Gate | 6-digit PIN |
| `permanent_address_telephone` | String | ❌ | Contact number |
| `permanent_address_email` | String | ❌ | Email (lowercase) |

### **Address Fields (Principal Business)**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `principle_business_address_line_1` | String | Phase 2 Gate* | Operating address |
| `principle_business_address_line_2` | String | ❌ | Secondary line |
| `principle_business_address_city` | String | Phase 2 Gate* | City |
| `principle_business_address_state` | String | Phase 2 Gate* | State |
| `principle_business_address_pin_code` | String | Phase 2 Gate* | PIN code |
| `principle_business_telephone` | String | ❌ | Landline |
| `principle_address_email` | String | ❌ | Operations email |
| `principle_business_website` | String | ❌ | Company website |
| `sameAsPermanentAddress` | Boolean | ❌ | Auto-copy toggle |

*Gate: Must have either Permanent OR Principal address

### **Multi-Location Fields**

#### **Factory Addresses Array**
```javascript
factory_addresses: [
  {
    factory_address_line_1: String,
    factory_address_line_2: String,
    factory_address_city: String,
    factory_address_state: String,
    factory_address_pin_code: String,
    gst: String,  // GST registration number
    gst_reg: [String]  // Array of GST certificate URLs
  }
]
```

#### **Branches Array**
```javascript
branches: [
  {
    branch_name: String,
    branch_code: String,
    gst_no: String,
    address: String,
    city: String,
    state: String,
    postal_code: String,
    country: String,  // Default: "India"
    mobile: String,
    email: String  // Auto-lowercase
  }
]
```

### **Banking Fields**

```javascript
banks: [
  {
    bankers_name: String,        // e.g., "HDFC Bank"
    branch_address: String,      // Physical branch address
    account_no: String,          // Account number
    ifsc: String,                // IFSC code
    adCode: String,              // Advance Directive Code
    adCode_file: [String]        // Array of document URLs
  }
]
```

### **Contact Fields**

```javascript
contacts: [
  {
    name: String,               // Contact person name
    designation: String,        // Job title
    phone: String,             // Phone number
    email: String              // Auto-lowercase
    // No _id: prevents nested MongoDB ID generation
  }
]
```

### **Finance Fields**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `credit_period` | String | ❌ | Negotiated credit duration |
| `credit_limit_validity_date` | Date | ❌ | When credit limit expires |
| `quotation` | Enum | ❌ | "Yes"/"No" - requires quote before supply |
| `outstanding_limit` | String | ❌ | Stored as string for flexibility |
| `advance_payment` | Boolean | ❌ | Whether advance payment required |

### **Compliance & Document Fields**

#### **IEC Documents**
```javascript
iec_copy: [String]  // Array of URLs
```

#### **PAN Documents**
```javascript
pan_copy: [String]  // Array of URLs
```

#### **General Documents**
```javascript
other_documents: [String],
spcb_reg: [String],             // State Pollution Control Board
kyc_verification_images: [String],
gst_returns: [String]
```

#### **Category-Specific Document Fields**

*Individual/Proprietary Firm:*
```javascript
individual_passport_img: [String],
individual_voter_card_img: [String],
individual_driving_license_img: [String],
individual_bank_statement_img: [String],
individual_ration_card_img: [String],
individual_aadhar_card: [String]
```

*Partnership Firm:*
```javascript
partnership_registration_certificate_img: [String],
partnership_deed_img: [String],
partnership_power_of_attorney_img: [String],
partnership_valid_document: [String],
partnership_aadhar_card_front_photo: [String],
partnership_aadhar_card_back_photo: [String],
partnership_telephone_bill: [String]
```

*Company:*
```javascript
company_certificate_of_incorporation_img: [String],
company_memorandum_of_association_img: [String],
company_articles_of_association_img: [String],
company_power_of_attorney_img: [String],
company_telephone_bill_img: [String],
company_pan_allotment_letter_img: [String]
```

*Trust/Foundation:*
```javascript
trust_certificate_of_registration_img: [String],
trust_power_of_attorney_img: [String],
trust_officially_valid_document_img: [String],
trust_resolution_of_managing_body_img: [String],
trust_telephone_bill_img: [String],
trust_name_of_trustees: String,
trust_name_of_founder: String,
trust_address_of_founder: String,
trust_telephone_of_founder: String,
trust_email_of_founder: String
```

### **Manufacturing Fields**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `hsn_codes` | [String] | ❌ | Array of HSN codes for products |
| `date_of_incorporation` | Date | ❌ | Company registration date |
| `factory_name_board_img` | [String] | ❌ | Proof of factory ownership |
| `factory_selfie_img` | [String] | ❌ | On-site verification photo |

### **Workflow Fields**

| Field | Type | Default | Values |
|-------|------|---------|--------|
| `draft` | String | "false" | "true" \| "false" |
| `approval` | String | "Pending" | "Pending" \| "Approved" \| "Approved by HOD" \| "Sent for revision" |
| `approved_by` | String | null | Username/ID of approver |
| `remarks` | String | "" | Audit trail comments |
| `createdAt` | Timestamp | Auto | Record creation time |
| `updatedAt` | Timestamp | Auto | Last modification time |

### **Database Indexes**

Optimized queries:

```javascript
customerKycSchema.index({ iec_no: 1 });           // IEC lookups
customerKycSchema.index({ approval: 1 });         // Approval filtering
customerKycSchema.index({ draft: 1 });            // Draft filtering  
customerKycSchema.index({ approved_by: 1 });      // Approver history
customerKycSchema.index({ category: 1 });         // Entity type filtering
customerKycSchema.index({ createdAt: -1 });       // Recency sorting
```

---

## Workflow States & Transitions

### **State Diagram**

```
                    [SUSPECT PHASE]
                          ↓
        User creates basic KYC (4 fields)
        draft: "true"
        approval: "Pending"
                          ↓
                    [User Edits]
        ┌───────────────────┬──────────────────────┐
        ↓                   ↓                      ↓
    [SAVE DRAFT]      [SUBMIT FOR APPROVAL]   [DELETE]
        ↓                   ↓
    Stays in                [PROSPECT PHASE]
    Suspects                draft: "false"
                            approval: "Pending"
                                      ↓
                        [Admin/Manager Reviews]
        ┌─────────────────┬──────────────────┬─────────────────┐
        ↓                 ↓                  ↓                 ↓
    [APPROVE]      [SEND REVISION]   [ESCALATE to HOD]   [REJECT]
        ↓                 ↓                  ↓
    approval:       remarks added      approval unchanged
    "Approved"      User can edit      Waits for HOD
        ↓                 ↓                  ↓
    [CUSTOMER       Back to editing    [HOD APPROVES]
     PHASE]         (Revision loop)          ↓
        ↓                                approval:
    Can perform:                        "Approved by HOD"
    • View full profile                     ↓
    • Update customer                   [CUSTOMER PHASE]
    • Add open points                       ↓
    • Process orders              Full access for operations


[Open Points Lifecycle]
Customer created → Add compliance items → Resolve items → Close point
```

### **Status Enum Definition**

**Draft Field:**
- `"true"` - Under active creation (Suspect stage)
- `"false"` - Submitted for review (Prospect/Customer stages)

**Approval Field:**
- `"Pending"` - Awaiting initial approval OR returned for revision
- `"Approved"` - Admin-approved, ready for customer operations
- `"Approved by HOD"` - HOD-approved (for escalated cases)
- `"Sent for revision"` - Returned with remarks for corrections

---

## Role-Based Access Control

### **Admin Role**
- Full access to all KYC records
- View all suspects, prospects, customers
- Approve prospects
- Send prospects for revision
- Escalate to HOD
- Add/edit any customer
- View approval history

### **HOD (Head of Department) Role**
- Final approval authority for escalated cases
- View prospects sent for HOD approval
- Approve or send for revision
- Cannot see initial approval queue (unless escalated)

### **Manager Role**
- View assigned prospects
- Can recommend approval/rejection
- Cannot approve directly

### **Regular User Role**
- Create their own KYC applications
- View only their own drafts
- Edit their own submitted applications
- Cannot see other users' applications

---

## API Endpoints Summary

### **Dashboard Stats**
```
GET /api/crm/stats
Response: {
  suspects: number,    // Count of draft records
  prospects: number,   // Count pending approval
  customers: number,   // Count approved
  stagnant: number     // Prospects > 30 days old
}
```

### **Suspect Operations**
```
GET    /api/crm/suspects
POST   /api/crm/suspects
GET    /api/crm/suspects/check-iec/:iec
PUT    /api/crm/suspects/:id
DELETE /api/crm/suspects/:id
POST   /api/crm/suspects/:id/submit
```

### **Prospect Operations**
```
GET    /api/crm/prospects
GET    /api/crm/prospects/:id
PUT    /api/crm/prospects/:id
POST   /api/crm/prospects/:id/submit
POST   /api/crm/prospects/:id/approve
POST   /api/crm/prospects/:id/revision
POST   /api/crm/prospects/:id/escalate
POST   /api/crm/prospects/:id/hod-approve
```

### **Customer Operations**
```
GET    /api/crm/customers
GET    /api/crm/customers/:id
PUT    /api/crm/customers/:id
POST   /api/crm/customers/:id/open-points
GET    /api/crm/customers/:id/open-points
PATCH  /api/crm/customers/:id/open-points/:index/resolve
```

---

## Key Business Features

### **1. IEC Availability Check**
Real-time validation before customer creation:
```javascript
GET /api/crm/suspects/check-iec/0512ABC001
Response: {
  available: true,
  message: "IEC number is available"
}
```

### **2. Phase 2 Validation Gates**
Prevents incomplete submissions:
- Minimum 1 complete address
- Minimum 1 contact person
- PAN documentation required
- IEC documentation required

### **3. Days Pending Calculation**
Automatic tracking of stagnation:
```javascript
daysPending = Math.floor((now - updatedAt) / 86400000)
```

### **4. Open Points Management**
Track compliance items per customer:
- Add point with description
- Assign to person
- Track status
- Resolve with comments

### **5. Multi-Approval Support**
Flexible approval hierarchy:
- Single-level: Admin approval
- Two-level: Admin + HOD confirmation
- Revision loop for corrections

---

## Data Flow Example: Complete KYC Journey

```
1. SUSPECT CREATION (Phase 1)
   ├─ Input: name, IEC, category, status
   ├─ Validation: IEC uniqueness check
   ├─ Save: draft = "true"
   └─ Status: "Pending"

2. SUSPECT TO PROSPECT CONVERSION
   ├─ Trigger: Submit button
   ├─ Update: draft = "false"
   ├─ Status: Changed from "Pending" (draft) to "Pending" (submitted)
   └─ Action: Move to Prospects tab

3. PROSPECT COMPLETION (Phase 2)
   ├─ Add: Addresses, Contacts, Documents
   ├─ Validate: Phase 2 gates
   ├─ Save: Each section updates timestamp
   └─ Ready: For admin review

4. PROSPECT APPROVAL
   ├─ Admin Reviews
   ├─ Option A: Approve → approval = "Approved"
   ├─ Option B: Revision → approval = "Sent for revision"
   ├─ Option C: Escalate → Awaits HOD review
   └─ Move: To Customers tab (if approved)

5. CUSTOMER OPERATIONS
   ├─ Access Full Profile
   ├─ Update Details
   ├─ Add Open Points
   ├─ Manage Banking
   └─ Track Compliance
```

---

## Summary

This KYC system differs from standard solutions by:

✅ **Entity-specific compliance** - Tailored docs per business type  
✅ **Manufacturing-focused** - Factory photos, HSN codes, location management  
✅ **Multi-stage pipeline** - Structured Suspect → Prospect → Customer flow  
✅ **Real-time validation** - IEC checks, phase gates, required fields  
✅ **Approval orchestration** - Multi-level reviews with escalation  
✅ **Compliance tracking** - Open points per customer  
✅ **Financial integration** - Credit period, limits, payment terms  
✅ **Location intelligence** - Multiple factories, branches, GST tracking  
✅ **Audit trails** - Complete approval history & remarks  
✅ **Role-based access** - Admin, HOD, Manager, User permissions  

---

**Last Updated**: March 13, 2026  
**Document Version**: 1.0
