# Phase 0 Discovery Report: Sales Tactic Tagging for AIVision Sales CRM

**Generated:** October 8, 2026  
**Repository:** `Novusha-LPP/eximdev`  
**Target:** Sales Tactic Tagging (T01–T30) as specified by `Sales_Tactic_Playbook_1.pdf`

---

## 1. Stack and Conventions

### 1.1 Language & Framework Versions
- **Backend**: Node.js ESM (`"type": "module"`), Express 4.21.2 (`server/package.json:31`), Mongoose 6.13.9 (`server/package.json:39`). Running on port 9006 (`server/.env:1`).
- **Frontend**: React 18.3.1 (`client/package.json:41`), React Router v6.23.1 (`client/package.json:48`), Ant Design 6.2.0 (`client/package.json:22`), Material-UI v5.18.0 (`client/package.json:15`), Bootstrap 5.3.3 (`client/package.json:26`), Framer Motion 12.23.6 (`client/package.json:33`), Axios 1.7.2 (`client/package.json:25`).
- **Package Manager**: `npm` in both `server/` and `client/`.

### 1.2 Database Engine, Migrations & Seeds
- **Engine**: MongoDB with Mongoose 6.13.9.
- **Connection Configuration**: `.env` specifies `DEV_MONGODB_URI="mongodb://localhost:27017/eximNew"` and `PROD_MONGODB_URI`.
- **Migration Convention**: Standalone ESM scripts located in `server/migrations/*.mjs`.
  - Evidence: `server/migrations/createCRMPhase1Collections.mjs`, `server/migrations/seedCRMData.mjs`.
  - Execution command: `node server/migrations/<migration-name>.mjs`.
  - Migrations directly instantiate Mongoose connections and create indexes/collections idempotently.
- **Seed Scripts**: Idempotent scripts using Mongoose models (e.g. `server/migrations/seedCRMData.mjs`).

### 1.3 Test Framework & Lint
- **Test Framework**: `jest` 30.2.0, `supertest` 7.2.2, `mongodb-memory-server` 11.0.1 in `server/package.json:57-59`.
- **Existing Test Practices**: Per `AGENTS.md`, no automated CI tests currently run on git pushes; ad-hoc verification uses scratch scripts in `server/scratch/` or smoke tests in `server/tests/`.
- **Lint**: `npm run lint` (`eslint .`) in `server/`.

### 1.4 Auth & Permissions Model
- **Token Resolution**: `server/middleware/authMiddleware.mjs` reads JWT from `httpOnly` cookie (`token`) or `Authorization: Bearer <token>` header (`authMiddleware.mjs:50-57`), sets `req.user`. Non-admin users are checked for profile completion.
- **CRM Roles**:
  - Defined in `server/model/userModel.mjs:20-24`:
    ```javascript
    crmRole: {
      type: String,
      enum: ['Admin', 'Manager', 'Sales Rep', 'Viewer'],
      default: 'Sales Rep'
    }
    ```
  - System roles in `server/model/userModel.mjs:15,25`: `role: String` ('Admin', 'HOD', etc.), `isHod: Boolean`, `crmManagedTeams: [ObjectId]`.
  - Sales Head / Manager equivalent: Users where `crmRole === 'Admin'`, `crmRole === 'Manager'`, or `isHod: true` with `crmManagedTeams`.
  - Salesperson equivalent: Users where `crmRole === 'Sales Rep'`.
- **Route Authorization**:
  - `server/routes/crm/middleware/crmRoleMiddleware.mjs` checks `req.user.crmRole`.
  - Ownership filtering is implemented dynamically via `buildOwnerFilter()` in `server/routes/crm/opportunities.controller.mjs:89-191` (Managers see team opportunities, Reps see own opportunities, Admins see all).

### 1.5 UI Component Library & Patterns
- **Forms & Inputs**: Ant Design components (`Select`, `Modal`, `Table`, `DatePicker`) alongside custom styling.
- **Multi-Select**: Ant Design `<Select mode="multiple" ...>` is already the established pattern in CRM forms (`client/src/components/crm/EditProspectKYC.jsx:195-200`).
- **Modals**: Used extensively across CRM (`client/src/components/crm/components/OpportunityDetailModal.jsx`, `AccountDetailModal.jsx`).
- **Notifications**: Ant Design `message.success()` and `message.error()` are universally used (`client/src/components/crm/CRMKanbanBoard.jsx:737-740`).
- **Feature Flags**: Centralized in `server/config/featureFlags.mjs` using `isFeatureEnabled('FLAG_NAME')` backed by environment variables.

---

## 2. Deal Domain

### 2.1 The Deal Entity
- **Model**: `Opportunity` defined in `server/model/crm/Opportunity.mjs` (collection `opportunities`).
- **Mount Point**: Mounted in `server/app.mjs:771-772` under both `/crm` and `/api/crm` via `server/routes/crm/crmRoutes.mjs`.
- **Key Relationships & Fields**:
  - `name`: String (Deal name).
  - `value`: Number (Deal value, default 0).
  - `stage`: String (Enum: `'lead'`, `'qualified'`, `'opportunity'`, `'sales_visit'`, `'proposal'`, `'negotiation'`, `'won'`, `'lost'`).
  - `forecastCategory`: Enum: `'pipeline'`, `'best_case'`, `'commit'`, `'closed'`.
  - `ownerId`: Ref `User` (Deal owner / salesperson).
  - `createdBy`: Ref `User`.
  - `accountId`: Ref `Account` (Customer company).
  - `primaryContactId`: Ref `Contact`.
  - `services`: Array of String (`['freight forwarding', 'dgft', 'e-lock', 'client', 'transportation', 'paramount', 'rabs', 'autorack']`).
  - `businessVertical`: Enum: `['Novusha', 'Paramount', 'Transportation', 'Freight Forwarding', 'Export', 'Import']`.
  - `closeReason`: String (Mandatory when lost).
  - `closeNotes`: String.
  - `stageHistory`: Array of `{ stage, enteredAt, exitedAt }`.
  - `remarks`: Array of `{ text, userId, userName, createdAt }`.
  - `convertedFromLead`: Ref `Lead`.

### 2.2 Closed Won and Closed Lost Representation
- **Representation**:
  - Won: `stage: 'won'`, `probability: 100`, `forecastCategory: 'closed'`.
  - Lost: `stage: 'lost'`, `probability: 0`, `forecastCategory: 'closed'`, `closeReason` (required), `closeNotes`.
- **All Code Paths Capable of Transitioning to Won/Lost**:
  1. `PUT /api/crm/opportunities/:id` (`server/routes/crm/opportunities.controller.mjs:1086-1202`): Main update endpoint. Enforces `dealValue > 0` before proposal/negotiation/won, and requires `closeReason` for lost.
  2. `PATCH /api/crm/opportunities/:id/stage` (`server/routes/crm/opportunities.controller.mjs:1205-1250`): Kanban quick stage transition endpoint.
  3. `PATCH /api/crm/opportunities/:id/close` (`server/routes/crm/opportunities.controller.mjs:1253-1290`): Dedicated close endpoint.
  4. UI drag-and-drop in Kanban: `client/src/components/crm/CRMKanbanBoard.jsx:699-745` (calls PUT `/:id` or opens `LostModal`).
  5. UI detail modal: `client/src/components/crm/components/OpportunityDetailModal.jsx:363-380` (calls PATCH `/:id/stage` and PUT `/:id`).

### 2.3 Business Line Mapping (FLAG - GATE 0)
- **Current State**:
  - `Opportunity.mjs` has `businessVertical` (`'Novusha'`, `'Paramount'`, `'Transportation'`, `'Freight Forwarding'`, `'Export'`, `'Import'`).
  - `Opportunity.mjs` has `services` (`'freight forwarding'`, `'dgft'`, `'e-lock'`, `'client'`, `'transportation'`, `'paramount'`, `'rabs'`, `'autorack'`).
- **Gap Against Playbook**:
  - The playbook specifies **9 Business Lines**:
    - `FF` Freight Forwarding
    - `CC` Customs Clearance (DPD/DPE)
    - `DG` DGFT & Licensing
    - `EL` SR E-Locks
    - `CR` Crates & Partitions
    - `AM` AutoMove (loose/part-load)
    - `CT` Container Transport
    - `SW` Software (AIVision)
    - `MB` Corporate Media & Branding
  - Neither `businessVertical` nor `services` currently maps 1:1 to these 9 codes.
  - **Resolution**: Add an additive field `businessLine` (enum: `['FF', 'CC', 'DG', 'EL', 'CR', 'AM', 'CT', 'SW', 'MB']`) to `Opportunity` schema and deal creation/edit forms.

### 2.4 Deal Value and Discount Given (FLAG - GATE 0)
- **Deal Value**: Stored as `value: { type: Number, default: 0 }` on `Opportunity`. Always represented in INR (₹) in CRM pipeline views and reports.
- **Discount Given**:
  - **Current State**: `Opportunity.mjs` does **not** contain any discount field.
  - While `Quote.mjs:44,53` has `discount` (%) and `totalDiscount`, quotes are only optionally linked to opportunities.
  - **Resolution**: Add additive fields on `Opportunity.mjs`:
    - `discountPercent`: `{ type: Number, default: 0, min: 0, max: 100 }`
    - `discountAmount`: `{ type: Number, default: 0, min: 0 }`

### 2.5 Deal Creation Entry Points
Every entry point that can instantiate an Opportunity:
1. **Lead Conversion**: `POST /api/crm/leads/:id/convert` (`server/routes/crm/leads.controller.mjs:481-575`). UI: `client/src/components/crm/LeadList.jsx:315-340`.
2. **Quote Conversion**: `POST /api/crm/quotes/:id/convert-to-opportunity` (`server/routes/crm/quotes.controller.mjs:889-921`). UI: `client/src/components/crm/components/QuoteDetailPanel.jsx`.
3. **Deal Duplication**: `POST /api/crm/opportunities/:id/duplicate` (`server/routes/crm/opportunities.controller.mjs:1464-1493`). UI: `client/src/components/crm/CRMKanbanBoard.jsx:834-856`.
4. **Direct API Create**: `POST /api/crm/opportunities` (`server/routes/crm/opportunities.controller.mjs:1034-1082`).
5. **Database Seed**: `server/migrations/seedCRMData.mjs`.
*(Note: There is no CSV/bulk Excel import route for opportunities in this codebase).*

### 2.6 Audit and Activity Logging
- `server/model/crm/Activity.mjs`: Records calls, emails, notes, visits linked to `relatedTo.model === 'Opportunity'`.
- `Opportunity.remarks`: Embedded array of notes with `userId`, `userName`, `createdAt`.
- `server/plugins/auditPlugin.mjs`: Auto-logs document mutations via AsyncLocalStorage (`server/utils/context.mjs`).

### 2.7 Partner / Vendor / Account Entities (FLAG - GATE 0)
- `server/model/crm/Account.mjs`: Dedicated to customer companies/organizations.
- `server/model/cfsModel.mjs`: Dedicated to operational CFS records for import clearance (`cfssimp` collection).
- `server/model/it-helpdesk/vendorModel.mjs`: Dedicated to IT department hardware/software vendors.
- **Finding**: None of the above models represent the Sales Playbook's referral partner network (CFS, Automotive tape brand, Labour contractor, Security contractor, Palletisation supplier, Fumigation supplier, Insurance dealer, CA, ERP reseller, Industry association, Other) across the 7 regional offices (Gandhidham, Hazira, Cochin, Ahmedabad, Baroda, Rajkot, Jaipur).
- **Resolution**: Introduce a new additive Mongoose model `CrmPartner` (`server/model/crm/Partner.mjs`) specifically for sales referral partners.

### 2.8 Existing Report Framework & CSV Export Pattern
- **Backend**: `server/routes/crm/reports.controller.mjs` provides endpoints like `/dashboard`, `/performance`, `/stage-analysis`, `/stagnation`, `/lost-leads-detailed`, `/leaderboard`.
- **Frontend**: `client/src/components/crm/CRMReportsDashboard.jsx`.
- **Export Pattern**: Client-side CSV generation via `Blob([csvContent], { type: 'text/csv;charset=utf-8;' })` and programmatic download anchor tag (`CRMReportsDashboard.jsx:394-448, 1714-1725`).

---

## 3. Data Volume & Risk Analysis

### 3.1 Live/Dev Database Counts (as of Oct 8, 2026)
- **Database**: `eximNew` on local MongoDB (`mongodb://localhost:27017/eximNew`).
- **Total Opportunities**: 311
  - `lost`: 186
  - `won`: 87
  - `lead`: 17
  - `opportunity`: 8
  - `proposal`: 6
  - `qualified`: 5
  - `negotiation`: 1
  - `sales_visit`: 1
- **Closed Deals Total**: 273 (`won` + `lost`)
- **Open Deals Total**: 38

### 3.2 Risks & Isolation
- **Legacy Deal Flagging**:
  - The 273 already-closed deals must be marked `tactics_legacy: true`. They must be cleanly excluded from tactic report metrics so historical figures are not distorted.
  - The 38 open deals will also have `tactics_legacy: true`. While they can continue to be edited, R3 requires that when they eventually transition to Won or Lost, tactics and tactic results must be provided.
- **Route Mounting**:
  - All new routes must be registered through `server/routes/crm/crmRoutes.mjs` which is mounted at both `/crm` and `/api/crm` in `server/app.mjs:771-772`.
- **Multi-Branch Isolation**:
  - Opportunities are team and owner filtered (`buildOwnerFilter`), not strictly bound to `UserBranchModel` like import jobs. All salespeople and sales heads can view the tactic report across lines as required by R7.
