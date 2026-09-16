# AlVision HR Framework — Implementation Plan

> Derived from: `AlVision_HR_Framework_v1.0.docx`  
> Date: 2026-06-03  
> Status: DRAFT — Pending stakeholder review

---

## 1. Executive Summary

This plan operationalises the **AlVision HR Management System** document into buildable software phases. It maps each framework section to:
- **Data Model** (MongoDB / Mongoose)
- **API Surface** (Express routes)
- **UI Components** (React / MUI)
- **Integration Points** (existing modules)
- **Priority & Effort**

**Existing assets we leverage:**
| Asset | What it gives us |
|-------|-----------------|
| `User` model | Employee master data, KYC fields, attendance links, manager refs |
| `KPISheet` / `KPITemplate` | Daily operational KPI tracking (Import/Export ops) |
| `Team` model | HOD + member associations, department grouping |
| `Company` / `Department` / `Shift` | Org structure primitives |
| `Attendance` / `Leave` | Punch data, leave records, regularisation |
| Document collection (S3) | File upload infrastructure |
| `authMiddleware` + `branchMiddleware` | RBAC and multi-org filtering |

---

## 2. Gap Analysis: Document vs. Existing System

| Framework Section | Exists? | Gap |
|-------------------|---------|-----|
| **1. KPI Framework** (weighted score /10, 5 params, RAG) | ⚠️ Partial | Existing KPI is *daily operational* (calls, files, etc.). We need a **monthly HR KPI score** with 5 weighted parameters, RAG, and trend analysis. |
| **2. Profile Completion Control** | ❌ No | No completion % logic, no access gating based on profile completeness. |
| **3. Organisation Visibility** | ⚠️ Partial | Teams exist, but no org-chart renderer, no skill matrix, no training log, no R&R matrix. |
| **4. Digital HR Documentation** | ⚠️ Partial | Generic document upload exists; no HR-specific categories, no e-signature workflow, no reminder engine for pending signatures. |
| **5. Sales Performance Monitoring** | ⚠️ Partial | CRM roles and `quota` exist on User; no monthly sales report, no non-performance clause tracker/PIP workflow. |
| **6. HR Ownership & Accountability** | ❌ No | Dashboard widgets and scheduled reports for HR governance. |

---

## 3. Phase Breakdown

### PHASE 1 — Foundation & Profile Completion (Week 1–2)
**Goal:** Establish the profile completeness engine and access control layer that underpins everything else.

#### 3.1.1 Data Model: `ProfileCompletionConfig`
```js
// server/model/hr/profileCompletionConfigModel.mjs
{
  version: Number,           // config versioning
  mandatory_fields: [{       // fields from User schema + new ones
    field_key: String,       // e.g. "permanent_address_line_1"
    label: String,
    category: String,        // "personal" | "contact" | "kyc" | "employment" | "skills"
    is_blocking: Boolean,    // Block = YES in doc
    weight: Number           // for scoring
  }],
  updated_by: ObjectId(ref: "User")
}
```

#### 3.1.2 Data Model: `EmployeeProfileScore`
```js
// server/model/hr/employeeProfileScoreModel.mjs
{
  user: ObjectId(ref: "User"),
  completion_percentage: Number,   // 0–100
  blocking_fields_pending: [String],
  non_blocking_fields_pending: [String],
  last_calculated_at: Date,
  access_tier: String,             // "FULL" | "READONLY" | "LOCKED"
  calculated_by_config_version: Number
}
```

#### 3.1.3 Backend APIs
| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/hr/profile-completion/config` | Fetch current mandatory field config (HR only) |
| `POST` | `/api/hr/profile-completion/config` | Update mandatory field config (HR only) |
| `GET` | `/api/hr/profile-completion/score` | Get my completion score & pending fields |
| `GET` | `/api/hr/profile-completion/report` | HR report: all employees, %, pending fields, days since update |
| `POST` | `/api/hr/profile-completion/recalculate` | Trigger batch recalculation (HR / cron) |

#### 3.1.4 Frontend
- **Component:** `client/src/components/hr/ProfileCompletionBanner.jsx`
  - Global banner injected into `App` layout when `access_tier !== "FULL"`.
- **Component:** `client/src/components/hr/ProfileCompletionPage.jsx`
  - Redirect target for locked users. Wizard-style form filling.
- **Component:** `client/src/components/hr/ProfileCompletionReport.jsx`
  - HR-only report with filters (department, % range, blocking status).

#### 3.1.5 Access Control Integration
Modify `authMiddleware.mjs` (or create a new `profileCompletionMiddleware.mjs`) to:
1. After JWT validation, lookup `EmployeeProfileScore` for the user.
2. If `access_tier === "LOCKED"` and route is not profile-related → `403` with redirect payload.
3. If `access_tier === "READONLY"` and route is mutating → `403` with banner payload.

#### 3.1.6 Cron / Background
- Nightly job to recalculate all profile scores (or reactive update on User save).
- Email notification to manager + HR when blocking fields are missing (Day 1, Day 3, Day 7).

---

### PHASE 2 — Monthly KPI Performance Scoring (Week 2–3)
**Goal:** Build the **HR KPI engine** (distinct from existing operational KPI sheets).

#### 3.2.1 Data Model: `HRKPITemplate`
```js
// server/model/hr/hrKpiTemplateModel.mjs
{
  department: String,          // "Sales" | "Operations" | "HR" | "*" (all)
  designation: String,         // optional granularity
  parameters: [
    {
      param_id: String,        // e.g. "attendance_discipline"
      name: String,
      weight: Number,          // e.g. 0.20
      max_score: Number,       // 10
      data_source: String,     // "attendance" | "crm" | "manual" | "kpi_sheet" | "manager"
      formula_hint: String     // human-readable calc rule
    }
  ],
  is_active: Boolean,
  effective_from: Date,
  effective_to: Date
}
```

#### 3.2.2 Data Model: `HRKPIScore`
```js
// server/model/hr/hrKpiScoreModel.mjs
{
  user: ObjectId(ref: "User"),
  year: Number,
  month: Number,               // 1–12
  template_id: ObjectId(ref: "HRKPITemplate"),
  parameter_scores: [
    {
      param_id: String,
      raw_score: Number,       // 0–10
      weighted_score: Number,  // raw * weight
      source_data: Mixed       // snapshot of source values
    }
  ],
  final_score: Number,         // 0.00 – 10.00
  rag_status: String,          // "RED" | "AMBER" | "GREEN"
  trend: String,               // "UP" | "STABLE" | "DOWN"
  previous_score: Number,
  calculated_at: Date,
  calculated_by: ObjectId,
  approved_by: ObjectId,
  status: String               // "DRAFT" | "PENDING_APPROVAL" | "FINALISED"
}
```

**RAG Thresholds (configurable in `KPISettings`):**
- RED: `< 5.0`
- AMBER: `5.0 – 7.5`
- GREEN: `> 7.5`

#### 3.2.3 Calculation Engine
Create `server/services/hrKpiCalculator.mjs`:
1. **Attendance Discipline** (source: `AttendanceRecord`)
   - Calculate % present days vs working days.
2. **Task Completion / Operational KPI** (source: existing `KPISheet`)
   - Derive from `summary.overall_percentage` or `total_value_score`.
3. **Sales Achievement** (source: CRM / manual upload)
   - % of `quota` achieved.
4. **Profile Completion** (source: `EmployeeProfileScore`)
   - Map 0–100% → 0–10 scale.
5. **Manager Rating** (source: manual input)
   - Stored via `HRKPIScore` draft edit by HOD before finalisation.

> **Note:** The document mentions 5 parameters but does not specify them. The above are inferred from AlVision’s existing data. These should be confirmed with HR.

#### 3.2.4 Backend APIs
| Method | Route | Purpose |
|--------|-------|---------|
| `GET/POST` | `/api/hr/kpi-template` | CRUD for HR KPI templates |
| `POST` | `/api/hr/kpi-scores/calculate` | Trigger monthly calculation for a department/all |
| `GET` | `/api/hr/kpi-scores` | List scores with filters (month, dept, RAG) |
| `GET` | `/api/hr/kpi-scores/:id` | Individual score card |
| `PUT` | `/api/hr/kpi-scores/:id/manager-rating` | HOD inputs manual parameter scores |
| `PUT` | `/api/hr/kpi-scores/:id/finalise` | HR finalises the score |
| `GET` | `/api/hr/kpi-scores/export` | PDF / Excel export |

#### 3.2.5 Frontend
- **Component:** `client/src/components/hr/KPIScoreCard.jsx` — employee self-view
- **Component:** `client/src/components/hr/KPIAdminDashboard.jsx` — HR view with RAG distribution, trends, department averages
- **Component:** `client/src/components/hr/KPIManagerReview.jsx` — HOD inputs manager ratings before finalisation

---

### PHASE 3 — Organisation Visibility (Week 3–4)
**Goal:** Build the org chart, skill matrix, training log, and R&R matrix.

#### 3.3.1 Data Model Additions

**A. `User` schema extensions (minor):**
```js
// Add to userModel.mjs
skills: [
  {
    skill_name: String,
    level: Number,        // 0=None, 1=Beginner, 2=Intermediate, 3=Advanced, 4=Expert
    validated_by: ObjectId,
    validated_at: Date
  }
],
reporting_lines: {
  primary_manager: ObjectId(ref: "User"),
  dotted_line_managers: [ObjectId(ref: "User")],
  cross_functional_teams: [String]
},
role_description_id: ObjectId(ref: "RoleDescription")
```

**B. `RoleDescription` model:**
```js
// server/model/hr/roleDescriptionModel.mjs
{
  designation: String,
  department: String,
  role_summary: String,
  primary_kpis: [String],
  accountabilities: [String],
  decision_authority: String,
  is_active: Boolean
}
```

**C. `TrainingRecord` model:**
```js
// server/model/hr/trainingRecordModel.mjs
{
  name: String,                 // "Udayam Session — Communication"
  type: String,                 // "Udayam" | "External" | "Mandatory"
  date: Date,
  duration_hours: Number,
  facilitator: String,
  attendees: [
    {
      user: ObjectId(ref: "User"),
      status: String,           // "Attended" | "Absent" | "Excused"
      feedback_score: Number
    }
  ],
  is_mandatory: Boolean,
  department_scope: [String]    // ["Sales"] or ["All"]
}
```

#### 3.3.2 Backend APIs
| Module | Route | Purpose |
|--------|-------|---------|
| **Org Chart** | `GET /api/hr/org-chart` | Recursive tree: Company → Division → Dept → Team → Individual |
| **Org Chart** | `GET /api/hr/org-chart/export` | PNG / PDF export (using html2canvas + jsPDF) |
| **Roles** | `CRUD /api/hr/role-descriptions` | R&R matrix management |
| **Skills** | `GET /api/hr/skills/matrix` | Grid: employees × skills with level badges |
| **Skills** | `PUT /api/hr/skills/:userId` | Update skill levels (manager can validate/override) |
| **Training** | `CRUD /api/hr/training` | Training session management |
| **Training** | `GET /api/hr/training/attendance-report` | Dept / company-level completion |
| **Training** | `GET /api/hr/training/pending-alerts` | Employees missing mandatory sessions |
| **Reporting** | `GET /api/hr/reporting-structure/:userId` | Upward chain + dotted lines |

#### 3.3.3 Frontend Components
- `client/src/components/hr/OrganisationChart.jsx` — D3.js or MUI Tree / react-organizational-chart
- `client/src/components/hr/RolesResponsibilitiesMatrix.jsx`
- `client/src/components/hr/SkillMatrix.jsx` — MUI Data Grid with color-coded cells
- `client/src/components/hr/TrainingAttendanceLog.jsx`
- `client/src/components/hr/ReportingStructureView.jsx`

---

### PHASE 4 — Digital HR Documentation (Week 4–5)
**Goal:** HR-specific document repository with e-signature tracking.

#### 3.4.1 Data Model: `HRDocument`
```js
// server/model/hr/hrDocumentModel.mjs
{
  title: String,
  category: String,            // "Policy" | "Contract" | "Compliance" | "Form"
  file_url: String,            // S3 URL
  version: String,
  issued_date: Date,
  department_scope: [String],  // ["All"] or specific
  requires_signature: Boolean,
  reminder_schedule: [Number], // days after issue: [3, 7, 14]
  is_active: Boolean
}
```

#### 3.4.2 Data Model: `DocumentSignature`
```js
// server/model/hr/documentSignatureModel.mjs
{
  document: ObjectId(ref: "HRDocument"),
  user: ObjectId(ref: "User"),
  status: String,              // "Pending" | "Signed" | "Overdue" | "Rejected"
  sent_date: Date,
  signed_date: Date,
  signature_hash: String,      // audit trail
  ip_address: String,
  reminders_sent: [
    { day: Number, sent_at: Date }
  ],
  escalated_to_manager: Boolean,
  escalated_at: Date
}
```

#### 3.4.3 Backend APIs
| Method | Route | Purpose |
|--------|-------|---------|
| `CRUD` | `/api/hr/documents` | Manage HR document master |
| `POST` | `/api/hr/documents/:id/issue` | Issue document to users/depts |
| `POST` | `/api/hr/signatures/:id/sign` | Employee digital acknowledgement |
| `GET` | `/api/hr/signatures/pending` | My pending signatures |
| `GET` | `/api/hr/signatures/report` | HR dashboard: counts by dept, overdue items |
| `POST` | `/api/hr/signatures/:id/escalate` | One-click manager escalation (> 7 days overdue) |

#### 3.4.4 Frontend
- `client/src/components/hr/HRDocumentRepository.jsx`
- `client/src/components/hr/PendingSignaturesWidget.jsx` — global widget for employees
- `client/src/components/hr/SignatureTrackingDashboard.jsx` — HR view

#### 3.4.5 Cron Jobs
- Daily at 09:00 IST: scan `DocumentSignature` for `status === "Pending"` and send reminder emails at configured intervals.
- Daily at 09:30 IST: flag overdue (> 7 days) and auto-notify manager.

---

### PHASE 5 — Sales Performance Monitoring (Week 5–6)
**Goal:** Monthly sales report, non-performance clause tracker, PIP workflow.

#### 3.5.1 Data Model: `SalesPerformanceRecord`
```js
// server/model/hr/salesPerformanceRecord.mjs
{
  user: ObjectId(ref: "User"),
  year: Number,
  month: Number,
  target: Number,
  actual: Number,
  variance: Number,            // actual - target
  achievement_pct: Number,     // (actual / target) * 100
  rag_status: String,          // "GREEN" | "AMBER" | "RED"
  new_leads: Number,
  conversions: Number,
  report_generated_at: Date,
  status: String               // "Draft" | "Finalised"
}
```

#### 3.5.2 Data Model: `NonPerformanceClause` (PIP Tracker)
```js
// server/model/hr/nonPerformanceClauseModel.mjs
{
  user: ObjectId(ref: "User"),
  trigger_months: [String],    // ["2026-04", "2026-05"]
  stage: String,               // "MONITORING" | "VERBAL_COUNSELLING" | "WRITTEN_WARNING" | "PIP_ACTIVE" | "PIP_REVIEW" | "CLOSED"
  pip_start_date: Date,
  pip_end_date: Date,
  pip_targets: [{
    metric: String,
    target_value: Number
  }],
  weekly_reviews: [
    {
      week_no: Number,
      date: Date,
      notes: String,
      reviewed_by: ObjectId
    }
  ],
  final_outcome: String,       // "MET" | "NOT_MET" | "IN_PROGRESS"
  closed_at: Date,
  closed_by: ObjectId
}
```

#### 3.5.3 Calculation Engine
Create `server/services/salesPerformanceCalculator.mjs`:
- Runs on last working day of each month (cron).
- Pulls CRM deal data (needs integration with CRM module) or accepts manual upload.
- Computes `achievement_pct`, RAG, variance.
- Auto-creates `NonPerformanceClause` entry when `achievement_pct < 60` for 2 consecutive months.

#### 3.5.4 Backend APIs
| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/hr/sales-performance` | List monthly records |
| `POST` | `/api/hr/sales-performance/calculate` | Trigger monthly calculation |
| `POST` | `/api/hr/sales-performance/upload` | Manual Excel upload fallback |
| `GET` | `/api/hr/sales-performance/export` | PDF / Excel export |
| `GET` | `/api/hr/non-performance` | List employees under clause |
| `POST` | `/api/hr/non-performance` | Create manual entry (HR) |
| `PUT` | `/api/hr/non-performance/:id/stage` | Advance stage (verbal → written → PIP) |
| `POST` | `/api/hr/non-performance/:id/review` | Weekly PIP review entry |
| `PUT` | `/api/hr/non-performance/:id/close` | Close with outcome |

#### 3.5.5 Frontend
- `client/src/components/hr/SalesPerformanceDashboard.jsx`
  - Individual sales cards (target, actual, variance, RAG)
  - Team summary with top 3 / bottom 3
  - Month-over-month trend (Recharts)
- `client/src/components/hr/NonPerformanceTracker.jsx`
  - Active PIP list
  - Stage timeline + weekly review form

---

### PHASE 6 — HR Governance Dashboard (Week 6)
**Goal:** Unified HR command centre.

#### 3.6.1 Backend APIs
| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/hr/governance/summary` | KPI avg, profile completion avg, pending signatures, active PIPs, training completion % |
| `GET` | `/api/hr/governance/action-log` | Live action log of open items |
| `POST` | `/api/hr/governance/action-log` | Add action item |
| `PUT` | `/api/hr/governance/action-log/:id/close` | Close action item |

#### 3.6.2 Frontend
- `client/src/components/hr/HRGovernanceDashboard.jsx`
  - Summary widgets (KPI avg, signatures pending, PIPs active)
  - RAG distribution charts (ApexCharts)
  - Action log table with status

---

## 4. Cross-Cutting Concerns

### 4.1 RBAC & Permissions
Introduce a fine-grained permission map:

| Permission Key | HR | HOD | Manager | Employee |
|----------------|----|-----|---------|----------|
| `hr.kpi.manage` | ✅ | ❌ | ❌ | ❌ |
| `hr.kpi.review` | ✅ | ✅ | ❌ | ❌ |
| `hr.kpi.view_own` | ✅ | ✅ | ✅ | ✅ |
| `hr.profile.view_all` | ✅ | ❌ | ❌ | ❌ |
| `hr.profile.edit_own` | ✅ | ✅ | ✅ | ✅ |
| `hr.org.view` | ✅ | ✅ | ✅ | ✅ |
| `hr.org.edit` | ✅ | ❌ | ❌ | ❌ |
| `hr.document.manage` | ✅ | ❌ | ❌ | ❌ |
| `hr.document.sign` | ✅ | ✅ | ✅ | ✅ |
| `hr.sales.view_all` | ✅ | ✅ | ❌ | ❌ |
| `hr.sales.view_own` | ✅ | ✅ | ✅ | ✅ |
| `hr.pip.manage` | ✅ | ✅ | ❌ | ❌ |

**Implementation:**
- Extend `requireRole.mjs` or create `requirePermission.mjs` middleware.
- Store permissions in `User` model or a new `RolePermission` model.

### 4.2 Audit Trail
All new models apply `auditPlugin.mjs` (already configured for CREATE/UPDATE/DELETE).

### 4.3 Notifications
Re-use existing email infrastructure (Nodemailer / SES):
- Profile incomplete reminders
- Document signature reminders (Day 3, 7, 14)
- Manager escalation emails
- PIP stage transition alerts
- Monthly KPI finalisation notice

### 4.4 Scheduled Jobs
Add to the existing cron initialization in `app.mjs`:
```js
// server/cron/hrCron.mjs
- "0 2 * * *"  → recalculate profile scores
- "0 3 1 * *"  → calculate monthly HR KPI scores
- "0 9 * * *"  → document signature reminders
- "0 9 * * *"  → overdue signature escalations
- "0 18 * * *" → stale sales performance calc (last working day logic)
```

### 4.5 Multi-Org / Branch Filtering
All new HR routes respect `branchMiddleware.mjs` and `req.user.authorizedBranchIds`. New models should include `branch_id` or `company_id` where applicable.

---

## 5. File & Route Registration Checklist

| # | Task | File Path |
|---|------|-----------|
| 1 | Create models | `server/model/hr/*.mjs` |
| 2 | Create service layer | `server/services/hrKpiCalculator.mjs`, `salesPerformanceCalculator.mjs` |
| 3 | Create routes | `server/routes/hr/hrFrameworkRoutes.mjs` (or split by subdomain) |
| 4 | Mount routes | Import + `app.use()` in `server/app.mjs` |
| 5 | Create frontend components | `client/src/components/hr/*.jsx` |
| 6 | Add nav items | Update sidebar/nav in `client/src/components/home/` or relevant layout |
| 7 | Add cron jobs | `server/cron/hrCron.mjs`, register in `app.mjs` |

---

## 6. Data Migration Strategy

1. **Profile Completion:**
   - Backfill `EmployeeProfileScore` for all active users by running a one-off script.
   - Set `access_tier = "FULL"` initially to avoid lockouts, then tighten after communication.

2. **HR KPI:**
   - Seed `HRKPITemplate` with default 5-parameter template per department.
   - Historical data: start from current month; no back-dating required for MVP.

3. **Training Records:**
   - Bulk import past Udayam Sessions via Excel upload utility.

4. **HR Documents:**
   - Upload existing policies to S3, create `HRDocument` entries, mass-issue to all employees.

---

## 7. Testing Strategy (Manual / Scratch)

Given the project has no automated test suite, create scratch scripts:

| Script | Purpose |
|--------|---------|
| `server/scratch/test_profile_completion.mjs` | Batch calculate scores, verify tier logic |
| `server/scratch/test_hr_kpi_calc.mjs` | Trigger KPI calc for a user, verify weighted sum & RAG |
| `server/scratch/test_sales_performance.mjs` | Simulate 2-month underperformance, verify PIP auto-trigger |
| `server/scratch/test_document_signature.mjs` | Issue doc, simulate sign, verify reminder cron |

---

## 8. Immediate Deliverables (Aligned with Document Section 7)

| # | Deliverable | Phase | Effort |
|---|-------------|-------|--------|
| 1 | Profile Completion Score + Access Control | Phase 1 | 3 d |
| 2 | Profile Completion Report (HR) | Phase 1 | 2 d |
| 3 | Monthly KPI Score Engine (5 params, weighted, RAG) | Phase 2 | 4 d |
| 4 | KPI Dashboard (employee + HR views) | Phase 2 | 3 d |
| 5 | Organisation Chart (live, exportable) | Phase 3 | 3 d |
| 6 | Skill Matrix | Phase 3 | 2 d |
| 7 | Training Attendance Log + Udayam tracking | Phase 3 | 2 d |
| 8 | HR Document Repository + E-signature workflow | Phase 4 | 4 d |
| 9 | Pending Signature Report + Reminders | Phase 4 | 2 d |
| 10 | Monthly Sales Performance Report | Phase 5 | 3 d |
| 11 | Non-Performance Clause / PIP Tracker | Phase 5 | 3 d |
| 12 | HR Governance Dashboard | Phase 6 | 2 d |
| | **Total** | | **~33 dev-days** |

---

## 9. Open Questions for Stakeholders

1. **KPI Parameters:** Confirm the 5 parameters and their weightages. The document references them but does not list them.
2. **Sales Data Source:** Is CRM deal data reliable for auto-calculating sales performance, or is manual Excel upload the primary source?
3. **Digital Signature:** Is a simple "I agree" checkbox with timestamp sufficient, or is Aadhaar eSign / Docusign required?
4. **Org Chart Granularity:** The document mentions Division > Department > Team. Does AlVision currently have a "Division" entity, or should we use Company > Department > Team?
5. **Profile Blocking:** Should the lockout be immediate upon go-live, or a 30-day grace period for employees to complete profiles?

---

*Plan prepared by: Kimi Code CLI*  
*Review required before implementation begins.*
