# CRM Module System Design & Architecture Guide

This guide describes the architecture, database schema, workflow lifecycles, business rules, and API integration flows of the **Customer Relationship Management (CRM) Module** in AlVision Exim. It is designed to assist engineers in understanding the current implementation and performing system design for new features.

---

## 1. High-Level Module Overview

The CRM module is a multi-tenant, full-featured system integrated with AlVision Exim's core Customer KYC database. It tracks suspects, prospects, and customers through a linear, stage-gated sales pipeline. 

### Core Capability Layers
1. **Sales pipeline tracking**: Lead ingestion, conversion, contact profiling, opportunity estimation, and quote management.
2. **Sales Operations**: Sales team hierarchy mapping, territory boundaries, and automated lead routing rules.
3. **Advanced Analytics**: Expected vs. weighted forecasting, aging deal indicators, performance statistics, and loss reason analytics.
4. **Intelligent Automation**: Rule-based trigger execution (e.g., auto-assigning leads or updating scores on activity logging).

---

## 2. Complete Workflow Lifecycle

The CRM module manages two distinct lifecycles: the **Lead Ingestion & Conversion Lifecycle** and the **Opportunity Pipeline (Kanban Board)**. It also integrates with the core **Customer KYC Progression**.

### 2.1 Lead Ingestion & Conversion
A lead enters the system through manual creation or automatic capture and moves through standard statuses:
*   **Statuses**: `new` → `contacted` → `qualified` / `unqualified` → `converted`.
*   **Conversion Action**: Qualifying a lead converts it, automatically creating:
    1.  An **Account** (the company entity).
    2.  A **Contact** (the contact person at the company).
    3.  An **Opportunity** (the sales deal, placed in the Kanban pipeline with stage set to `lead`).

### 2.2 Opportunity Pipeline (Kanban Board Stages)
Once an opportunity is created, sales reps track it through the visual Kanban board by moving it through the pipeline:
1.  **Lead**: Freshly converted deal, starting qualification.
2.  **Qualified**: Identified customer needs and verified alignment.
3.  **Opportunity**: Formally recognized interest and engagement.
4.  **Sales Visit**: Planned/conducted client meeting.
5.  **Proposal**: Quotation prepared and submitted.
6.  **Negotiation**: Terms, pricing, and services discussion.
7.  **Won**: Deal successfully closed (transition to customer registration).
8.  **Lost**: Deal lost (reason for loss recorded).

### 2.3 Customer KYC Integration Stages
Separately, the core **Customer KYC** record progresses through verification stages to manage risk and HOD audits:
*   **KYC Stages**: `suspect (1) → prospect (2) → qualified_lead (3) → opportunity (4) → customer (5)`

---

## 3. Core Business Rules

To ensure data integrity and process compliance, the following business rules are enforced:

*   **Linear KYC Stage Progression (Transition Guard)**:
    *   For the **Customer KYC** progression, records must progress sequentially through `suspect → prospect → qualified_lead → opportunity → customer`.
    *   Skipping stages forward is blocked.
    *   *Implementation Reference*: [crmTransitionGuard.mjs](file:///c:/Users/india/Desktop/Projects/eximdev/server/routes/crm/middleware/crmTransitionGuard.mjs).
*   **Customer KYC Rollback Protection**:
    *   Once a KYC record reaches the `customer` stage (5), it is permanently locked. Demotions back to earlier stages (suspect/prospect) are prohibited.
*   **KYC Approval Requirement for Customer Stage**:
    *   A KYC record cannot transition to the `customer` stage unless its status is explicitly flagged as `Approved` or `Approved by HOD`.
    *   *Implementation Reference*: [crmStageValidator.mjs](file:///c:/Users/india/Desktop/Projects/eximdev/server/routes/crm/middleware/crmStageValidator.mjs).
*   **CRM Ownership Filter**:
    *   `Admin` users bypass all restrictions and can view all leads, opportunities, and activities.
    *   Sales Team Managers (`managerId` on a `SalesTeam`) are authorized to view and modify data belonging to all members of their team (`memberIds`).
    *   Individual sales representatives can only view and modify records where they are marked as the `ownerId`.
    *   *Implementation Reference*: `buildOwnerFilter` in [leads.controller.mjs](file:///c:/Users/india/Desktop/Projects/eximdev/server/routes/crm/leads.controller.mjs).

---

## 4. Database Models & Schema Relationships

All CRM schemas are located in **[server/model/crm/](file:///c:/Users/india/Desktop/Projects/eximdev/server/model/crm)**.

### 4.1 Lead Schema ([Lead.mjs](file:///c:/Users/india/Desktop/Projects/eximdev/server/model/crm/Lead.mjs))
Represents individual prospects prior to qualification/conversion.
*   `ownerId` (ObjectId, ref: 'User'): The assigned sales representative.
*   `status` (String): `new`, `contacted`, `qualified`, `unqualified`, `converted`.
*   `interestedServices` (Array of Strings): Services such as `custom clearance`, `freight forwarding`, `dgft`, `rabs`.
*   `score` (Number): Dynamic score calculated by the lead scoring engine.
*   `grade` (String): Letter grade `A`, `B`, `C`, `D` based on score.
*   `convertedTo` (Sub-document): Maps references to the created `{ accountId, contactId, opportunityId }` upon conversion.

### 4.2 Account Schema ([Account.mjs](file:///c:/Users/india/Desktop/Projects/eximdev/server/model/crm/Account.mjs))
Represents verified business entities/companies.
*   `name` (String, required): The company name.
*   `parentAccountId` (ObjectId, ref: 'Account'): Hierarchical corporate tree references.
*   `healthScore` (Number): Engagement score based on task completions and activities.

### 4.3 Opportunity Schema ([Opportunity.mjs](file:///c:/Users/india/Desktop/Projects/eximdev/server/model/crm/Opportunity.mjs))
Represents active sales deals.
*   `accountId` (ObjectId, ref: 'Account', required): Linked company.
*   `primaryContactId` (ObjectId, ref: 'Contact'): Primary contact person for the deal.
*   `value` (Number): Nominated financial size of the deal.
*   `stage` (String): Stage of deal (`lead`, `qualified`, `opportunity`, `sales_visit`, `proposal`, `negotiation`, `won`, `lost`).
*   `probability` (Number): Range `0` to `100` representing win likelihood.
*   `stageHistory` (Array): Tracks timestamps for when the deal entered and exited each stage.
*   `plannedVisits` (Array): Scheduled site or office visits.

### 4.4 AutomationRule Schema ([AutomationRule.mjs](file:///c:/Users/india/Desktop/Projects/eximdev/server/model/crm/AutomationRule.mjs))
Configurable business triggers to automate task creation, assignments, and tags.
*   `type` (String): `lead`, `opportunity`, `account`, `contact`, etc.
*   `trigger` (Document): Specifies the trigger condition:
    *   `event`: `record_created`, `record_updated`, `field_changed`, `lead_scored`, `deal_won`.
    *   `triggerField` / `triggerValue`: Specific criteria matching.
    *   `conditions` (Array): Grouped evaluation clauses (`equals`, `contains`, etc.).
*   `actions` (Array): List of actions to execute (`assign_to`, `change_field`, `create_task`, `send_email`, `add_tag`).

---

## 5. Important Calculations & Logic Formulae

### 5.1 Lead Score Grading
Lead grades are resolved dynamically based on the total accumulated score from four input variables:

$$\text{Total Score} = \min(100, \text{baseScore} + \text{sourceScore} + \text{activityScore} + \text{engagementScore})$$

The letter grade and qualification status are assigned as follows:
*   **Grade A**: Score $\ge 80$ (Auto-qualified = `true`)
*   **Grade B**: Score $\ge 60$ (Auto-qualified = `true`)
*   **Grade C**: Score $\ge 40$ (Auto-qualified = `false`)
*   **Grade D**: Score $< 40$ (Auto-qualified = `false`)

*   *Implementation Reference*: [leadScoring.controller.mjs](file:///c:/Users/india/Desktop/Projects/eximdev/server/routes/crm/leadScoring.controller.mjs).

### 5.2 Forecast Revenue Calculations
*   **Expected Revenue**: Base value adjusted by the raw likelihood of closing the deal:

$$\text{Expected Revenue} = \text{Opportunity Value} \times \left( \frac{\text{Probability}}{100} \right)$$

*   **Weighted Sales Forecast**: Expected value further adjusted by custom risk factors (e.g., competition level, timeline delays, or budget delays):

$$\text{Weighted Revenue} = \text{Expected Revenue} \times \prod_{i=1}^{n} \left( 1 + \frac{\text{Adjustment}_i}{100} \right)$$

*   *Implementation Reference*: [forecasting.controller.mjs](file:///c:/Users/india/Desktop/Projects/eximdev/server/routes/crm/forecasting.controller.mjs).

### 5.3 Quote Item Calculations
Line item math is calculated to verify correctness before storage:
1.  **Line Subtotal**:
    $$\text{lineSubtotal} = \text{quantity} \times \text{unitPrice}$$
2.  **Item Discount**:
    $$\text{itemDiscount} = \text{lineSubtotal} \times \left( \frac{\text{discountPercentage}}{100} \right)$$
3.  **Item Tax**:
    $$\text{itemTax} = (\text{lineSubtotal} - \text{itemDiscount}) \times \left( \frac{\text{taxPercentage}}{100} \right)$$
4.  **Line Total**:
    $$\text{lineTotal} = \text{lineSubtotal} - \text{itemDiscount} + \text{itemTax}$$
5.  **Grand Total**:
    $$\text{Grand Total} = \sum \text{lineSubtotal} - \sum \text{itemDiscount} + \sum \text{itemTax}$$

*   *Implementation Reference*: [quotes.controller.mjs](file:///c:/Users/india/Desktop/Projects/eximdev/server/routes/crm/quotes.controller.mjs).

---

## 6. API Integration Flow & Routing Structure

All routes are mounted under `/api/crm` in the server and authenticate using JWT cookie verification.

### Tenant Resolution Middleware
Every CRM API endpoint requires multi-tenancy context. The **[tenant.mjs](file:///c:/Users/india/Desktop/Projects/eximdev/server/routes/crm/middleware/tenant.mjs)** middleware extracts the tenant ID:
1.  Checks `req.user.tenantId` populated from the authenticated JWT token.
2.  If missing, fallback check for the `x-tenant-id` header in the HTTP request.
3.  If both are missing or the ID is not in a valid 24-character hex format, the request is rejected with `401 Unauthorized (MISSING_TENANT)`.

### Core Routing Structure

| Path | Method | Purpose | Authentication |
| :--- | :--- | :--- | :--- |
| `/api/crm/leads` | `GET` / `POST` | List and create leads. | User cookie |
| `/api/crm/leads/:id/convert` | `POST` | Convert lead to Account + Contact + Opportunity. | User cookie |
| `/api/crm/lead-scoring/leads/:leadId/score` | `POST` | Calculate and persist score metrics. | User cookie |
| `/api/crm/opportunities` | `GET` / `PUT` | List and update deals and stages. | User cookie |
| `/api/crm/quotes` | `POST` | Create line-item quotes. | User cookie |
| `/api/crm/forecasts/period/:period`| `GET` | Get forecasted revenues and pipeline health. | User cookie |
| `/api/crm/reports/dashboard` | `GET` | Retrieve sales analytics and lost reasons. | User cookie |

---

## 7. Folder Structure & Code Locations

```
.
├── client/
│   └── src/
│       └── components/
│           └── crm/                      # Frontend CRM Views
│               ├── CRMModule.jsx         # Entrypoint & Tab Handler
│               ├── CRMDashboard.jsx      # Performance widgets
│               ├── CRMKanbanBoard.jsx    # Visual drag-and-drop pipeline
│               ├── CRMReportsDashboard.css# Charts & Stage-wise metrics
│               └── components/
│                   ├── AccountsList.jsx  # Company listings
│                   ├── ContactsList.jsx  # Individual profiles
│                   ├── SalesTeamManagement.jsx # Hierarchy configurations
│                   └── LeadScoringModule.jsx # Rule factor displays
│
└── server/
    ├── model/
    │   └── crm/                          # Mongoose Schemas
    │       ├── Lead.mjs
    │       ├── Account.mjs
    │       ├── Contact.mjs
    │       ├── Opportunity.mjs
    │       ├── LeadScore.mjs
    │       ├── OpportunityForecast.mjs
    │       ├── AutomationRule.mjs
    │       └── Territory.mjs
    │
    └── routes/
        └── crm/                          # Controller Routers
            ├── crmRoutes.mjs             # Main router registry
            ├── leads.controller.mjs      # Ingestion & conversion
            ├── opportunities.controller.mjs # Deal flow & visits
            ├── quotes.controller.mjs     # Quote generations
            ├── forecasting.controller.mjs# Expected value math
            └── middleware/               # Validation checks
                ├── tenant.mjs            # Multi-tenancy check
                ├── crmStageValidator.mjs # Stage check
                └── crmTransitionGuard.mjs# Sequence check
```

---

## 8. Environment & Configuration Variables

### Client (`client/.env`)
*   `REACT_APP_API_STRING`: Backend server URL (e.g. `http://localhost:9006`).

### Server (`server/.env`)
*   `PORT`: Port binding for the server (defaults to `9006`).
*   `DEV_MONGODB_URI`: Local development database URI connection string.
*   `JWT_SECRET`: Signing token to unpack the logged-in user object, which holds `tenantId` and `crmRole`.

---

## 9. Troubleshooting Tips

### 1. `MISSING_TENANT` 401 Error
*   **Symptom**: Requests return `{ success: false, code: "MISSING_TENANT" }`.
*   **Resolution**: Ensure the frontend request includes credentials (`withCredentials: true` on Axios) so the user cookie is sent. Alternatively, verify that the request includes the `x-tenant-id` header with a valid 24-character hexadecimal ObjectId.

### 2. `OverwriteModelError` during testing
*   **Symptom**: Database test/scratch scripts crash with `OverwriteModelError: Cannot overwrite model once compiled`.
*   **Resolution**: CRM models use ES modules. Do not redefine models with `mongoose.model('ModelName', ...)` if the schema file has already been loaded. Instead, import the compiled model directly:
    ```javascript
    import Lead from '../../model/crm/Lead.mjs';
    ```

### 3. Stage Skip Rejected (400 Bad Request)
*   **Symptom**: Updating the opportunity stage returns `Cannot skip stages. Target stage: proposal, Current stage: suspect`.
*   **Resolution**: Check the sequence. If you need to jump multiple stages for test data, you must update the database document directly (via MongoDB compass or script) or progress the record sequentially through the API.

---

## 10. Future Improvements
1.  **Bulk Excel / CSV Ingest**: Implement import/export endpoints for bulk lead and contact ingestion.
2.  **Email Client Integration**: Connect with IMAP/SMTP services to auto-log emails sent/received as Activities under lead/account timelines.
3.  **Real-Time Tasks Notifications**: Push instant notification triggers to team members when a task is created or reassigned to them using the existing WebSocket servers.
