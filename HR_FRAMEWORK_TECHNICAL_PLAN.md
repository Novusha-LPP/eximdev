# AlVision HR Framework — Technical Implementation Plan

> **Scope:** Exact files, schemas, APIs, and components to be built.  
> **Author:** Kimi Code CLI (this agent will execute the build).  
> **Status:** Ready for implementation.

---

## 0. Implementation Order (What I Will Build, Step by Step)

### Sprint A — Foundation (Day 1–3)
1. **Models** — Create all Mongoose schemas (`server/model/hr/`)
2. **Profile Completion Engine** — Service + middleware + APIs
3. **Access Control Integration** — Lock/readonly logic in auth pipeline

### Sprint B — KPI Scoring (Day 4–6)
4. **HR KPI Models & Calculator** — Monthly weighted score engine
5. **KPI APIs** — Templates, calculation, approval workflow
6. **KPI Frontend** — Score cards, admin dashboard, manager review

### Sprint C — Org Visibility (Day 7–9)
7. **Org Chart** — Backend tree builder + frontend renderer
8. **Skill Matrix** — Model updates + grid UI
9. **Training Records** — Udayam session tracker
10. **Roles & Responsibilities** — Role description editor

### Sprint D — HR Documents (Day 10–12)
11. **Document Repository** — HR document CRUD + S3 upload
12. **E-signature Flow** — Signature tracking + reminders
13. **Pending Signature Dashboard** — HR view + escalation

### Sprint E — Sales & Governance (Day 13–15)
14. **Sales Performance** — Monthly calc + report + export
15. **Non-Performance Tracker** — PIP workflow + stage management
16. **HR Governance Dashboard** — Unified command centre

### Sprint F — Wiring (Day 16)
17. **Route registration** in `app.mjs`
18. **Navigation** — Sidebar/menu updates
19. **Cron jobs** — Register all scheduled tasks
20. **Scratch tests** — Validate end-to-end flows

---

## 1. Data Models (Exact Schemas)

### 1.1 `server/model/hr/profileCompletionConfigModel.mjs`
```js
import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const FieldRuleSchema = new mongoose.Schema({
  field_key: { type: String, required: true },
  label: { type: String, required: true },
  category: { type: String, enum: ["personal","contact","kyc","employment","skills","documents"], required: true },
  is_blocking: { type: Boolean, default: false },
  weight: { type: Number, default: 1 },
  data_type: { type: String, enum: ["string","number","date","boolean","array","file"], default: "string" }
}, { _id: false });

const ProfileCompletionConfigSchema = new mongoose.Schema({
  version: { type: Number, default: 1 },
  name: { type: String, default: "Default Profile Config" },
  mandatory_fields: [FieldRuleSchema],
  active: { type: Boolean, default: true },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

ProfileCompletionConfigSchema.plugin(auditPlugin, { documentType: "ProfileCompletionConfig" });
export default mongoose.model("ProfileCompletionConfig", ProfileCompletionConfigSchema);
```

### 1.2 `server/model/hr/employeeProfileScoreModel.mjs`
```js
import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const PendingFieldSchema = new mongoose.Schema({
  field_key: String,
  label: String,
  is_blocking: Boolean,
  category: String
}, { _id: false });

const EmployeeProfileScoreSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company", index: true },
  completion_percentage: { type: Number, default: 0, min: 0, max: 100 },
  filled_count: { type: Number, default: 0 },
  total_count: { type: Number, default: 0 },
  blocking_pending: [PendingFieldSchema],
  non_blocking_pending: [PendingFieldSchema],
  access_tier: { type: String, enum: ["FULL","READONLY","LOCKED"], default: "FULL" },
  last_profile_update: { type: Date },
  config_version: { type: Number, default: 1 },
  notified_manager_at: { type: Date },
  notified_hr_at: { type: Date }
}, { timestamps: true });

EmployeeProfileScoreSchema.index({ user: 1, config_version: 1 }, { unique: true });
EmployeeProfileScoreSchema.plugin(auditPlugin, { documentType: "EmployeeProfileScore" });
export default mongoose.model("EmployeeProfileScore", EmployeeProfileScoreSchema);
```

### 1.3 `server/model/hr/hrKpiTemplateModel.mjs`
```js
import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const KpiParamSchema = new mongoose.Schema({
  param_id: { type: String, required: true },
  name: { type: String, required: true },
  weight: { type: Number, required: true, min: 0, max: 1 },
  max_score: { type: Number, default: 10 },
  data_source: { type: String, enum: ["attendance","kpi_sheet","sales","profile_completion","manager_rating","manual"], required: true },
  formula_config: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const HrKpiTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  department: { type: String, default: "*" },
  designation: { type: String, default: "*" },
  parameters: [KpiParamSchema],
  is_active: { type: Boolean, default: true },
  effective_from: { type: Date, required: true },
  effective_to: { type: Date },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

HrKpiTemplateSchema.plugin(auditPlugin, { documentType: "HRKPITemplate" });
export default mongoose.model("HRKPITemplate", HrKpiTemplateSchema);
```

### 1.4 `server/model/hr/hrKpiScoreModel.mjs`
```js
import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const ParamScoreSchema = new mongoose.Schema({
  param_id: String,
  param_name: String,
  raw_score: Number,
  weight: Number,
  weighted_score: Number,
  source_snapshot: mongoose.Schema.Types.Mixed
}, { _id: false });

const HrKpiScoreSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  year: { type: Number, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  template_id: { type: mongoose.Schema.Types.ObjectId, ref: "HRKPITemplate", required: true },
  parameter_scores: [ParamScoreSchema],
  final_score: { type: Number, default: 0 },
  rag_status: { type: String, enum: ["RED","AMBER","GREEN"], default: "RED" },
  trend: { type: String, enum: ["UP","STABLE","DOWN","NEW"], default: "NEW" },
  previous_score: { type: Number },
  previous_score_id: { type: mongoose.Schema.Types.ObjectId, ref: "HRKPIScore" },
  calculated_at: { type: Date, default: Date.now },
  calculated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  manager_ratings_entered_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approved_at: { type: Date },
  status: { type: String, enum: ["DRAFT","PENDING_APPROVAL","FINALISED"], default: "DRAFT" }
}, { timestamps: true });

HrKpiScoreSchema.index({ user: 1, year: 1, month: 1 }, { unique: true });
HrKpiScoreSchema.index({ company_id: 1, year: 1, month: 1, rag_status: 1 });
HrKpiScoreSchema.plugin(auditPlugin, { documentType: "HRKPIScore" });
export default mongoose.model("HRKPIScore", HrKpiScoreSchema);
```

### 1.5 `server/model/hr/roleDescriptionModel.mjs`
```js
import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const RoleDescriptionSchema = new mongoose.Schema({
  designation: { type: String, required: true },
  department: { type: String, required: true },
  role_summary: { type: String },
  primary_kpis: [{ type: String }],
  accountabilities: [{ type: String }],
  decision_authority: { type: String },
  required_skills: [{ skill_name: String, min_level: Number }],
  is_active: { type: Boolean, default: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company" }
}, { timestamps: true });

RoleDescriptionSchema.plugin(auditPlugin, { documentType: "RoleDescription" });
export default mongoose.model("RoleDescription", RoleDescriptionSchema);
```

### 1.6 `server/model/hr/trainingRecordModel.mjs`
```js
import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const AttendeeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["Attended","Absent","Excused","Pending"], default: "Pending" },
  feedback_score: { type: Number, min: 1, max: 5 },
  feedback_comment: { type: String }
}, { _id: false });

const TrainingRecordSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["Udayam","External","Mandatory","Onboarding"], required: true },
  date: { type: Date, required: true },
  duration_hours: { type: Number, required: true },
  facilitator: { type: String },
  attendees: [AttendeeSchema],
  is_mandatory: { type: Boolean, default: false },
  department_scope: [{ type: String }],
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  description: { type: String }
}, { timestamps: true });

TrainingRecordSchema.plugin(auditPlugin, { documentType: "TrainingRecord" });
export default mongoose.model("TrainingRecord", TrainingRecordSchema);
```

### 1.7 `server/model/hr/hrDocumentModel.mjs`
```js
import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const HrDocumentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, enum: ["Policy","Contract","Compliance","Form","SOP","Other"], required: true },
  file_url: { type: String, required: true },
  file_name: { type: String },
  version: { type: String, default: "1.0" },
  issued_date: { type: Date, default: Date.now },
  valid_until: { type: Date },
  department_scope: [{ type: String }],
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  requires_signature: { type: Boolean, default: true },
  reminder_schedule: [{ type: Number }], // days after issue
  is_active: { type: Boolean, default: true },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

HrDocumentSchema.plugin(auditPlugin, { documentType: "HRDocument" });
export default mongoose.model("HRDocument", HrDocumentSchema);
```

### 1.8 `server/model/hr/documentSignatureModel.mjs`
```js
import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const ReminderSchema = new mongoose.Schema({
  day: Number,
  sent_at: Date
}, { _id: false });

const DocumentSignatureSchema = new mongoose.Schema({
  document: { type: mongoose.Schema.Types.ObjectId, ref: "HRDocument", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["Pending","Signed","Overdue","Rejected"], default: "Pending" },
  sent_date: { type: Date, default: Date.now },
  signed_date: { type: Date },
  signed_ip: { type: String },
  signed_user_agent: { type: String },
  acknowledgement_text: { type: String },
  reminders_sent: [ReminderSchema],
  escalated_to_manager: { type: Boolean, default: false },
  escalated_at: { type: Date },
  manager_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

DocumentSignatureSchema.index({ document: 1, user: 1 }, { unique: true });
DocumentSignatureSchema.index({ user: 1, status: 1 });
DocumentSignatureSchema.plugin(auditPlugin, { documentType: "DocumentSignature" });
export default mongoose.model("DocumentSignature", DocumentSignatureSchema);
```

### 1.9 `server/model/hr/salesPerformanceRecordModel.mjs`
```js
import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const SalesPerformanceRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  target: { type: Number, default: 0 },
  actual: { type: Number, default: 0 },
  variance: { type: Number, default: 0 },
  achievement_pct: { type: Number, default: 0 },
  new_leads: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  rag_status: { type: String, enum: ["RED","AMBER","GREEN"], default: "RED" },
  report_generated_at: { type: Date, default: Date.now },
  status: { type: String, enum: ["Draft","Finalised"], default: "Draft" },
  data_source: { type: String, enum: ["CRM","Manual","Hybrid"], default: "CRM" }
}, { timestamps: true });

SalesPerformanceRecordSchema.index({ user: 1, year: 1, month: 1 }, { unique: true });
SalesPerformanceRecordSchema.plugin(auditPlugin, { documentType: "SalesPerformanceRecord" });
export default mongoose.model("SalesPerformanceRecord", SalesPerformanceRecordSchema);
```

### 1.10 `server/model/hr/nonPerformanceClauseModel.mjs`
```js
import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const PIPTargetSchema = new mongoose.Schema({
  metric: String,
  target_value: Number,
  actual_value: Number,
  unit: String
}, { _id: false });

const WeeklyReviewSchema = new mongoose.Schema({
  week_no: Number,
  review_date: Date,
  notes: String,
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewed_by_name: String,
  rating: { type: Number, min: 1, max: 5 }
}, { _id: false });

const NonPerformanceClauseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  trigger_months: [{ type: String }], // ["2026-04","2026-05"]
  stage: {
    type: String,
    enum: ["MONITORING","VERBAL_COUNSELLING","WRITTEN_WARNING","PIP_ACTIVE","PIP_REVIEW","ESCALATED_HR","CLOSED"],
    default: "MONITORING"
  },
  verbal_counselling_date: { type: Date },
  written_warning_date: { type: Date },
  written_warning_doc_url: { type: String },
  pip_start_date: { type: Date },
  pip_end_date: { type: Date },
  pip_targets: [PIPTargetSchema],
  weekly_reviews: [WeeklyReviewSchema],
  final_outcome: { type: String, enum: ["MET","NOT_MET","IN_PROGRESS","WITHDRAWN"], default: "IN_PROGRESS" },
  outcome_notes: { type: String },
  closed_at: { type: Date },
  closed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  initiated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  manager_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

NonPerformanceClauseSchema.plugin(auditPlugin, { documentType: "NonPerformanceClause" });
export default mongoose.model("NonPerformanceClause", NonPerformanceClauseSchema);
```

### 1.11 `server/model/hr/hrActionLogModel.mjs`
```js
import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const HrActionLogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, enum: ["KPI","Profile","Document","Sales","PIP","Training","General"], required: true },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  due_date: { type: Date },
  status: { type: String, enum: ["Open","In Progress","Closed","Overdue"], default: "Open" },
  closed_at: { type: Date },
  closed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  priority: { type: String, enum: ["Low","Medium","High","Critical"], default: "Medium" }
}, { timestamps: true });

HrActionLogSchema.plugin(auditPlugin, { documentType: "HRActionLog" });
export default mongoose.model("HRActionLog", HrActionLogSchema);
```

---

## 2. Services (Business Logic Layer)

### 2.1 `server/services/profileCompletionService.mjs`
**Functions:**
- `calculateProfileScore(userId, configId)` — Computes completion %, blocking/non-blocking pending lists, determines access tier.
- `batchRecalculateAll(companyId, configId)` — Nightly batch job.
- `getAccessTier(userId)` — Returns FULL / READONLY / LOCKED.
- `notifyManagersAndHR()` — Sends emails for blocking-field gaps.

**Access Tier Rules:**
```
blocking_pending.length > 0          → LOCKED
completion_percentage < 70           → LOCKED
70 ≤ completion_percentage < 100     → READONLY
completion_percentage === 100        → FULL
```

### 2.2 `server/services/hrKpiCalculator.mjs`
**Functions:**
- `calculateMonthlyKpi(userId, year, month, templateId)` —
  1. Fetch template parameters.
  2. For each parameter, call the appropriate data source adapter:
     - `attendance` → count present days / working days from `AttendanceRecord`
     - `kpi_sheet` → read `KPISheet.summary.overall_percentage`
     - `sales` → read `SalesPerformanceRecord.achievement_pct`
     - `profile_completion` → read `EmployeeProfileScore.completion_percentage`
     - `manager_rating` → read `HRKPIScore.parameter_scores` where source=manual
  3. Compute weighted sum → `final_score` (0–10).
  4. Determine RAG: `< 5 = RED`, `5–7.5 = AMBER`, `> 7.5 = GREEN`.
  5. Compare with previous month for trend.
- `bulkCalculate(department, year, month)` — Batch calculation.

### 2.3 `server/services/salesPerformanceCalculator.mjs`
**Functions:**
- `calculateMonthlySales(userId, year, month)` — Pulls CRM data or manual override.
- `bulkCalculate(year, month)` — Entire sales team.
- `checkNonPerformanceTriggers(year, month)` — Finds users with `< 60%` for 2 consecutive months; auto-creates `NonPerformanceClause` at stage `VERBAL_COUNSELLING` or advances existing.

### 2.4 `server/services/hrDocumentReminderService.mjs`
**Functions:**
- `sendPendingReminders()` — Day 3, 7, 14 reminders.
- `escalateOverdue()` — > 7 days → manager email + flag.
- `issueDocumentToUsers(documentId, userIds[])` — Bulk-create `DocumentSignature` records.

---

## 3. API Routes (Exact Signatures)

### 3.1 Profile Completion (`server/routes/hr/profileCompletionRoutes.mjs`)
```
GET    /api/hr/profile-completion/config              → get active config
POST   /api/hr/profile-completion/config              → create/update config (HR)
GET    /api/hr/profile-completion/my-score            → get my score & pending fields
GET    /api/hr/profile-completion/scores              → list all scores (HR)
GET    /api/hr/profile-completion/report              → detailed report with filters (HR)
POST   /api/hr/profile-completion/recalculate/:userId → recalculate single user (HR)
POST   /api/hr/profile-completion/recalculate-all     → batch recalculate (HR / cron)
```

### 3.2 HR KPI (`server/routes/hr/hrKpiRoutes.mjs`)
```
GET    /api/hr/kpi/templates              → list templates
POST   /api/hr/kpi/templates              → create template (HR)
PUT    /api/hr/kpi/templates/:id          → update template (HR)
DELETE /api/hr/kpi/templates/:id          → soft delete (HR)

POST   /api/hr/kpi/calculate              → calculate for users/dept/month
GET    /api/hr/kpi/scores                 → list scores (filters: year, month, dept, rag)
GET    /api/hr/kpi/scores/:id             → single score detail
PUT    /api/hr/kpi/scores/:id/manager-rating  → input manual ratings (HOD)
PUT    /api/hr/kpi/scores/:id/finalise    → HR finalises
GET    /api/hr/kpi/scores/export          → PDF/Excel export
GET    /api/hr/kpi/dashboard/summary      → dept averages, RAG distribution
```

### 3.3 Organisation Visibility (`server/routes/hr/orgVisibilityRoutes.mjs`)
```
GET    /api/hr/org-chart                  → hierarchical tree
GET    /api/hr/org-chart/export           → PNG/PDF export

GET    /api/hr/role-descriptions          → list
POST   /api/hr/role-descriptions          → create (HR)
PUT    /api/hr/role-descriptions/:id      → update (HR)

GET    /api/hr/skills/matrix              → grid data
PUT    /api/hr/skills/:userId             → update user skills (self + manager validate)

GET    /api/hr/training                   → list sessions
POST   /api/hr/training                   → create session (HR)
PUT    /api/hr/training/:id               → update attendees (HR)
GET    /api/hr/training/attendance-report → completion report
GET    /api/hr/training/pending-alerts    → mandatory training misses

GET    /api/hr/reporting-structure/:userId → upward chain + dotted lines
```

### 3.4 HR Documents (`server/routes/hr/hrDocumentRoutes.mjs`)
```
GET    /api/hr/documents                  → list HR documents
POST   /api/hr/documents                  → upload + create (HR)
PUT    /api/hr/documents/:id              → update metadata (HR)
DELETE /api/hr/documents/:id              → soft delete (HR)
POST   /api/hr/documents/:id/issue        → issue to users/depts (HR)

GET    /api/hr/signatures/pending         → my pending signatures
POST   /api/hr/signatures/:id/sign        → digital acknowledge
GET    /api/hr/signatures/report          → HR report by dept/status
POST   /api/hr/signatures/:id/escalate    → manual escalation trigger (HR)
```

### 3.5 Sales Performance (`server/routes/hr/salesPerformanceRoutes.mjs`)
```
GET    /api/hr/sales-performance          → list records
POST   /api/hr/sales-performance/calculate → trigger calc
POST   /api/hr/sales-performance/upload   → manual Excel upload
GET    /api/hr/sales-performance/export   → PDF/Excel export
GET    /api/hr/sales-performance/dashboard → summary + top/bottom performers

GET    /api/hr/non-performance            → list active clauses
POST   /api/hr/non-performance            → create (HR)
GET    /api/hr/non-performance/:id        → detail
PUT    /api/hr/non-performance/:id/stage  → advance stage
POST   /api/hr/non-performance/:id/review → weekly review entry
PUT    /api/hr/non-performance/:id/close  → close with outcome
```

### 3.6 Governance (`server/routes/hr/hrGovernanceRoutes.mjs`)
```
GET    /api/hr/governance/summary         → KPI avg, profile avg, pending signatures, active PIPs, training %
GET    /api/hr/governance/action-log      → list action items
POST   /api/hr/governance/action-log      → create action item
PUT    /api/hr/governance/action-log/:id  → update / close
```

---

## 4. Middleware

### 4.1 `server/middleware/profileCompletionMiddleware.mjs`
Intercepts requests after `authMiddleware`:
- If `access_tier === "LOCKED"` and route is not `/api/hr/profile-completion/my-score` or user profile edit → return `403` with `{ redirectTo: "/profile-completion" }`.
- If `access_tier === "READONLY"` and method is POST/PUT/DELETE → return `403` with `{ banner: "Read-only until profile is complete" }`.

### 4.2 `server/middleware/requirePermission.mjs`
Generic permission checker:
```js
// usage: requirePermission("hr.kpi.manage")
// resolves user's effective permissions from role + direct grants
```

---

## 5. Frontend Components

### 5.1 Profile Completion
| Component | Path |
|-----------|------|
| `ProfileCompletionBanner` | `client/src/components/hr/ProfileCompletionBanner.jsx` |
| `ProfileCompletionPage` | `client/src/components/hr/ProfileCompletionPage.jsx` |
| `ProfileCompletionReport` | `client/src/components/hr/ProfileCompletionReport.jsx` |

### 5.2 KPI
| Component | Path |
|-----------|------|
| `KPIScoreCard` | `client/src/components/hr/KPIScoreCard.jsx` |
| `KPIAdminDashboard` | `client/src/components/hr/KPIAdminDashboard.jsx` |
| `KPIManagerReview` | `client/src/components/hr/KPIManagerReview.jsx` |
| `KPIExportButton` | `client/src/components/hr/KPIExportButton.jsx` |

### 5.3 Org Visibility
| Component | Path |
|-----------|------|
| `OrganisationChart` | `client/src/components/hr/OrganisationChart.jsx` |
| `SkillMatrixGrid` | `client/src/components/hr/SkillMatrixGrid.jsx` |
| `TrainingAttendanceLog` | `client/src/components/hr/TrainingAttendanceLog.jsx` |
| `TrainingAttendanceReport` | `client/src/components/hr/TrainingAttendanceReport.jsx` |
| `RolesResponsibilitiesMatrix` | `client/src/components/hr/RolesResponsibilitiesMatrix.jsx` |
| `ReportingStructureView` | `client/src/components/hr/ReportingStructureView.jsx` |

### 5.4 Documents
| Component | Path |
|-----------|------|
| `HRDocumentRepository` | `client/src/components/hr/HRDocumentRepository.jsx` |
| `DocumentUploadForm` | `client/src/components/hr/DocumentUploadForm.jsx` |
| `PendingSignaturesWidget` | `client/src/components/hr/PendingSignaturesWidget.jsx` |
| `SignatureTrackingDashboard` | `client/src/components/hr/SignatureTrackingDashboard.jsx` |
| `DigitalSignatureModal` | `client/src/components/hr/DigitalSignatureModal.jsx` |

### 5.5 Sales & PIP
| Component | Path |
|-----------|------|
| `SalesPerformanceDashboard` | `client/src/components/hr/SalesPerformanceDashboard.jsx` |
| `SalesPerformanceExport` | `client/src/components/hr/SalesPerformanceExport.jsx` |
| `NonPerformanceTracker` | `client/src/components/hr/NonPerformanceTracker.jsx` |
| `PIPReviewForm` | `client/src/components/hr/PIPReviewForm.jsx` |
| `NonPerformanceTimeline` | `client/src/components/hr/NonPerformanceTimeline.jsx` |

### 5.6 Governance
| Component | Path |
|-----------|------|
| `HRGovernanceDashboard` | `client/src/components/hr/HRGovernanceDashboard.jsx` |
| `HRActionLogTable` | `client/src/components/hr/HRActionLogTable.jsx` |
| `HRActionItemForm` | `client/src/components/hr/HRActionItemForm.jsx` |

### 5.7 Common / Shared
| Component | Path |
|-----------|------|
| `RAGBadge` | `client/src/components/hr/common/RAGBadge.jsx` |
| `TrendIndicator` | `client/src/components/hr/common/TrendIndicator.jsx` |
| `HRSectionHeader` | `client/src/components/hr/common/HRSectionHeader.jsx` |

---

## 6. Cron Jobs

Create `server/cron/hrCron.mjs`:

| Schedule | Job | Function |
|----------|-----|----------|
| `0 2 * * *` | `recalculate-profile-scores` | `profileCompletionService.batchRecalculateAll()` |
| `0 3 1 * *` | `calculate-monthly-hr-kpi` | `hrKpiCalculator.bulkCalculate()` for previous month |
| `0 9 * * *` | `document-signature-reminders` | `hrDocumentReminderService.sendPendingReminders()` |
| `0 9 * * *` | `document-escalations` | `hrDocumentReminderService.escalateOverdue()` |
| `0 18 L * *` | `calculate-sales-performance` | `salesPerformanceCalculator.bulkCalculate()` + `checkNonPerformanceTriggers()` |
| `0 8 * * MON` | `training-missing-alerts` | Notify employees missing mandatory trainings |

Register in `server/app.mjs` under the existing cluster-gated cron init.

---

## 7. Route Registration (app.mjs additions)

```js
// server/app.mjs — add these imports and mounts
import profileCompletionRoutes from "./routes/hr/profileCompletionRoutes.mjs";
import hrKpiRoutes from "./routes/hr/hrKpiRoutes.mjs";
import orgVisibilityRoutes from "./routes/hr/orgVisibilityRoutes.mjs";
import hrDocumentRoutes from "./routes/hr/hrDocumentRoutes.mjs";
import salesPerformanceRoutes from "./routes/hr/salesPerformanceRoutes.mjs";
import hrGovernanceRoutes from "./routes/hr/hrGovernanceRoutes.mjs";

app.use(profileCompletionRoutes);
app.use(hrKpiRoutes);
app.use(orgVisibilityRoutes);
app.use(hrDocumentRoutes);
app.use(salesPerformanceRoutes);
app.use(hrGovernanceRoutes);
```

---

## 8. User Model Updates

Add to `server/model/userModel.mjs`:
```js
skills: [{
  skill_name: String,
  level: { type: Number, min: 0, max: 4 },
  validated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  validated_at: Date
}],
reporting_lines: {
  primary_manager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  dotted_line_managers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  cross_functional_teams: [{ type: String }]
},
role_description_id: { type: mongoose.Schema.Types.ObjectId, ref: "RoleDescription" }
```

---

## 9. Scratch Test Scripts

| Script | Validates |
|--------|-----------|
| `server/scratch/test_profile_completion.mjs` | Batch calc, tier logic, middleware block |
| `server/scratch/test_hr_kpi_calc.mjs` | Weighted sum, RAG assignment, trend detection |
| `server/scratch/test_sales_performance.mjs` | 2-month trigger, auto-PIP creation |
| `server/scratch/test_doc_signature_flow.mjs` | Issue → sign → reminder → escalate |
| `server/scratch/test_org_chart.mjs` | Tree depth, dotted lines, export |

---

## 10. Go-Live Strategy

1. **Pre-deployment:**
   - Run migration script to seed `ProfileCompletionConfig` with all mandatory fields from `userModel.mjs`.
   - Backfill `EmployeeProfileScore` with `access_tier: "FULL"` (grace period).
   - Seed default `HRKPITemplate` for each department.

2. **Soft Launch:**
   - Enable profile completion tracking (no lockouts yet).
   - Communicate to employees: 30 days to complete profiles.

3. **Hard Launch:**
   - After 30 days, enable `profileCompletionMiddleware` lockout logic.
   - Begin monthly KPI calculations.
   - Issue all existing HR policies for e-signature.

---

*This plan is ready for execution. Each sprint can be implemented independently with clear hand-offs between backend → frontend → integration.*
