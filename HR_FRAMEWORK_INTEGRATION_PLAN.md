# AlVision HR Framework — Integration-First Implementation Plan

> **Principle:** Reuse existing interconnected services. Add only thin orchestration layers.  
> **What exists:** KPI Sheets (daily ops), Attendance Engine, CRM Opportunities, Teams/HODs, S3 Assets, Leave System.

---

## 0. What Already Exists (Verified)

| System | Existing Files | What It Does |
|--------|---------------|--------------|
| **Operational KPI** | `server/routes/kpi/kpiRoutes.mjs` (2408 lines), `model/kpi/kpiSheetModel.mjs`, `model/kpi/kpiTemplateModel.mjs` | Daily call/file/ops tracking with approval workflows, signatures, quadrants |
| **Attendance Engine** | `server/services/attendance/AttendanceEngine.js`, `WorkingDayEngine.js`, `PolicyResolver.js`, `LeaveCalculationService.js` | Full punch → record → leave → policy resolution pipeline |
| **CRM / Sales** | `server/model/crm/Opportunity.mjs`, `Lead.mjs`, `Account.mjs`, `server/routes/crm/reports.controller.mjs`, `salesTeams.controller.mjs` | Pipeline, forecasts, sales team assignments |
| **Teams / Org** | `server/model/teamModel.mjs`, `server/routes/team/teamRoutes.mjs` | HOD + members, dept grouping, allowedAdmins |
| **HR Assets** | `server/routes/hr/userAssetsRoutes.mjs` | S3 upload, employee photos, email signatures, profile proofs |
| **User Model** | `server/model/userModel.mjs` | 80+ fields including `quota`, `crmRole`, `teamId`, `department_id`, `company_id`, `hod_id`, `manager_id`, `skills` (string) |
| **Document Collection** | `server/model/documentCollectionModel.mjs` | Job-level doc tracking (not HR docs) |
| **Auth & Audit** | `authMiddleware.mjs`, `auditTrail.mjs`, `auditPlugin.mjs` | JWT + branch filter + auto audit |
| **Frontend KPI** | `client/src/components/kpi/KPIAdminDashboard.js`, `KPIPulseDashboard.js`, `KPIReviewerDashboard.js`, `KPISheet.js` | Full React dashboards |

---

## 1. What We Actually Need to Build (Minimal Additions)

### New Models (6 only — thin wrappers)
1. `EmployeeProfileScore` — computed field coverage over **existing** `User` model
2. `HRKPIScore` — monthly aggregation over **existing** attendance + CRM + ops KPI data
3. `HRDocument` + `DocumentSignature` — HR policy repo + e-sign tracking
4. `TrainingRecord` — Udayam session log (attendees linked to **existing** `User`)
5. `NonPerformanceClause` — PIP tracker (links to **existing** sales data)
6. `RoleDescription` — designation-level R&R (optional, can start without)

### New Services (3 thin orchestrators)
1. `profileCompletionService.mjs` — reads `User` fields, writes `EmployeeProfileScore`
2. `hrKpiAggregator.mjs` — queries AttendanceEngine + CRM + ops KPI, writes `HRKPIScore`
3. `salesPerformanceAggregator.mjs` — queries CRM Opportunities + `User.quota`, writes PIP triggers

### New Routes (3 route files — not 6)
1. `server/routes/hr/hrFrameworkRoutes.mjs` — profile completion, HR KPI, governance
2. `server/routes/hr/hrDocumentRoutes.mjs` — document repo + signatures
3. `server/routes/hr/salesPerformanceRoutes.mjs` — sales report + PIP tracker

### New Frontend (reuses existing KPI/Table patterns)
1. Reuse `KPIAdminDashboard.js` pattern for HR KPI view
2. Reuse `TeamDashboard.jsx` for org chart base
3. Reuse `UpdateEmployeeData.js` for profile completion wizard

---

## 2. Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HR FRAMEWORK LAYER                        │
│  (New: thin orchestration + 6 models + 3 route files)       │
├─────────────────────────────────────────────────────────────┤
│  Profile Completion  │  HR KPI Score   │  Sales Performance │
│  - Reads User fields │  - Reads AttendanceEngine output    │
│  - Writes score doc  │  - Reads CRM opportunities          │
│  - Middleware gate   │  - Reads ops KPI sheets             │
│                      │  - Writes monthly score             │
├─────────────────────────────────────────────────────────────┤
│  EXISTING SYSTEMS (unchanged)                               │
│  Attendance Engine │ CRM Pipeline │ Ops KPI │ Teams │ S3   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Sprint-by-Sprint Build (What I Will Code)

### Sprint A: Profile Completion + Access Gate (2 days)

**Day 1 — Backend**
- Create `server/model/hr/employeeProfileScoreModel.mjs` (fields: `user`, `completion_percentage`, `access_tier`, `pending_fields[]`)
- Create `server/services/profileCompletionService.mjs`:
  ```js
  calculateProfileScore(userId) {
    const user = await UserModel.findById(userId);
    const config = await ProfileCompletionConfig.findOne({ active: true });
    // Count filled fields from user document
    // Return { percentage, tier, pending }
  }
  ```
- Create `server/routes/hr/hrFrameworkRoutes.mjs`:
  - `GET /api/hr/profile-completion/config` (HR only)
  - `GET /api/hr/profile-completion/my-score` (any user)
  - `GET /api/hr/profile-completion/report` (HR only, with filters)
  - `POST /api/hr/profile-completion/recalculate` (HR / cron)
- Update `server/model/userModel.mjs`: add `skills[]`, `reporting_lines.primary_manager`, `role_description_id` (optional, backward-compatible)

**Day 2 — Middleware + Frontend**
- Create `server/middleware/profileCompletionMiddleware.mjs`:
  - Post-auth hook: lookup `EmployeeProfileScore` for user
  - If `access_tier === "LOCKED"` → 403 + `{ redirectTo: "/profile-completion" }`
  - If `access_tier === "READONLY"` → block POST/PUT/DELETE
- Register middleware in `server/app.mjs` **after** `authMiddleware`, **before** routes
- Frontend: `client/src/components/hr/ProfileCompletionBanner.jsx` (global banner when tier !== FULL)
- Frontend: `client/src/components/hr/ProfileCompletionReport.jsx` (HR view, reuse MUI DataGrid)
- **Reuse:** `userAssetsRoutes.mjs` S3 upload for profile photo/documents

---

### Sprint B: HR KPI Score — Thin Aggregation (2 days)

**Day 1 — Model + Calculator**
- Create `server/model/hr/hrKpiScoreModel.mjs` (fields: `user`, `year`, `month`, `parameter_scores[]`, `final_score`, `rag_status`, `trend`, `status`)
- Create `server/services/hrKpiAggregator.mjs`:
  ```js
  async calculateMonthlyHRKpi(userId, year, month) {
    // 1. Attendance Discipline
    const presentDays = await AttendanceRecord.countDocuments({ employee_id: userId, status: 'present', date: { $gte: start, $lte: end } });
    const workingDays = await WorkingDayEngine.getWorkingDays(user.company_id, year, month);
    const attendanceScore = (presentDays / workingDays) * 10;

    // 2. Operational KPI (from existing daily KPI sheets)
    const opsKpi = await KPISheet.findOne({ user: userId, year, month });
    const opsScore = opsKpi?.summary?.overall_percentage ? (opsKpi.summary.overall_percentage / 10) : 0;

    // 3. Sales Achievement (from CRM)
    const salesActual = await Opportunity.aggregate([{ $match: { ownerId: userId, stage: 'won', period: `${year}-${month}` } }, { $sum: '$value' }]);
    const salesTarget = user.quota || 0;
    const salesScore = salesTarget > 0 ? Math.min((salesActual / salesTarget) * 10, 10) : 0;

    // 4. Profile Completion
    const profile = await EmployeeProfileScore.findOne({ user: userId });
    const profileScore = profile ? (profile.completion_percentage / 10) : 0;

    // 5. Manager Rating (manual input stored in HRKPIScore)
    const managerScore = existing?.parameter_scores?.find(p => p.param_id === 'manager_rating')?.raw_score || 0;

    // Weighted sum (default weights: 0.2 each)
    const final = (attendanceScore * 0.2) + (opsScore * 0.2) + (salesScore * 0.2) + (profileScore * 0.2) + (managerScore * 0.2);
    
    // RAG: <5 RED, 5-7.5 AMBER, >7.5 GREEN
    const rag = final < 5 ? 'RED' : final <= 7.5 ? 'AMBER' : 'GREEN';
    
    await HRKPIScore.findOneAndUpdate({ user: userId, year, month }, { ... }, { upsert: true });
  }
  ```
- Add routes in `hrFrameworkRoutes.mjs`:
  - `POST /api/hr/kpi/calculate` (trigger for dept/all)
  - `GET /api/hr/kpi/scores`
  - `PUT /api/hr/kpi/scores/:id/manager-rating`
  - `PUT /api/hr/kpi/scores/:id/finalise`

**Day 2 — Frontend + Cron**
- Frontend: `client/src/components/hr/HRKPIScoreCard.jsx` (employee self-view)
- Frontend: `client/src/components/hr/HRKPIDashboard.jsx` (HR view — **reuse** `KPIAdminDashboard.js` pattern: MUI cards, RAG badges, export button)
- Cron: Add to `server/app.mjs` cron init: `0 3 1 * *` → `hrKpiAggregator.bulkCalculate()` for previous month

---

### Sprint C: Org Visibility — Reuse Teams (2 days)

**Day 1 — Org Chart + Skill Matrix**
- **Org Chart:** `GET /api/hr/org-chart` reuses `TeamModel.find()` + `UserModel.find()` to build tree:
  ```js
  // Company > Department > Team > Individual
  // Already have company_id, department, teamId on User
  ```
- Frontend: `client/src/components/hr/OrganisationChart.jsx` — uses `react-organizational-chart` or MUI TreeView. Export via html2canvas (already in project dependencies).
- **Skill Matrix:** Update `UserModel.skills` from `String` to array:
  ```js
  skills: [{ skill_name: String, level: Number, validated_by: ObjectId }]
  ```
- Route: `GET /api/hr/skills/matrix` → aggregate users by department, pivot skills
- Frontend: `client/src/components/hr/SkillMatrixGrid.jsx` — MUI DataGrid with color-coded cells (level 0=grey, 1=red, 2=yellow, 3=green, 4=blue)

**Day 2 — Training + R&R**
- Create `server/model/hr/trainingRecordModel.mjs` (name, type, date, attendees[] linked to User)
- Routes in `hrFrameworkRoutes.mjs`: `CRUD /api/hr/training`, `GET /api/hr/training/attendance-report`
- Frontend: `client/src/components/hr/TrainingAttendanceLog.jsx`
- **Roles & Responsibilities:** Optional MVP skip. Can add `roleDescription` text field to `User` model initially.

---

### Sprint D: HR Documents — Reuse S3 + Extend (2 days)

**Day 1 — Models + Upload**
- Create `server/model/hr/hrDocumentModel.mjs` (title, category, file_url, requires_signature, reminder_schedule)
- Create `server/model/hr/documentSignatureModel.mjs` (document, user, status, reminders_sent, escalated)
- **Reuse** existing S3 upload pattern from `userAssetsRoutes.mjs`:
  ```js
  // Same multer + S3Client + PutObjectCommand pattern
  // Key: hr-documents/${companyId}/${docId}/${filename}
  ```
- Routes in `hrDocumentRoutes.mjs`:
  - `POST /api/hr/documents` (upload + create)
  - `POST /api/hr/documents/:id/issue` (bulk create signatures for dept/users)

**Day 2 — Signature Flow + Reminders**
- Route: `POST /api/hr/signatures/:id/sign` → update status, capture IP, timestamp
- Route: `GET /api/hr/signatures/report` → pending counts by department
- Service: `server/services/hrDocumentReminderService.mjs`:
  - Queries `DocumentSignature` where status=Pending and sent_date is older than reminder_schedule days
  - Sends email via existing Nodemailer/SES
  - Escalates to manager after 7 days
- Cron: `0 9 * * *` → run reminder + escalation checks
- Frontend: `PendingSignaturesWidget.jsx` (global widget), `SignatureTrackingDashboard.jsx` (HR view)

---

### Sprint E: Sales Performance + PIP — Reuse CRM (2 days)

**Day 1 — Sales Aggregation**
- Create `server/model/hr/salesPerformanceRecordModel.mjs`
- Create `server/services/salesPerformanceAggregator.mjs`:
  ```js
  async calculateMonthlySales(userId, year, month) {
    const period = `${year}-${String(month).padStart(2,'0')}`;
    const actual = await Opportunity.aggregate([
      { $match: { ownerId: userId, stage: 'won', period } },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]);
    const target = (await UserModel.findById(userId)).quota || 0;
    const achievementPct = target > 0 ? (actual / target) * 100 : 0;
    // Write to SalesPerformanceRecord
  }
  ```
- Routes in `salesPerformanceRoutes.mjs`:
  - `POST /api/hr/sales-performance/calculate`
  - `GET /api/hr/sales-performance` (with filters)
  - `GET /api/hr/sales-performance/export` (PDF/Excel via existing `exceljs`/`jspdf`)
- Frontend: `SalesPerformanceDashboard.jsx` — reuse `KPIPulseDashboard.js` card pattern

**Day 2 — Non-Performance Tracker**
- Create `server/model/hr/nonPerformanceClauseModel.mjs`
- Service: Auto-trigger after sales calc:
  ```js
  if (achievementPct < 60) {
    const prevMonth = await SalesPerformanceRecord.findOne({ user: userId, year, month: month-1 });
    if (prevMonth?.achievementPct < 60) {
      // 2 consecutive months < 60% → create or advance NonPerformanceClause
      await createOrAdvanceClause(userId, [period, prevMonth.period]);
    }
  }
  ```
- Routes: `CRUD /api/hr/non-performance`, `POST /api/hr/non-performance/:id/review`
- Frontend: `NonPerformanceTracker.jsx` (stage timeline + weekly review form)

---

### Sprint F: Governance Dashboard + Wiring (1 day)

- Create `server/model/hr/hrActionLogModel.mjs`
- Route: `GET /api/hr/governance/summary` — aggregate query across:
  - `HRKPIScore` (avg score, RAG distribution)
  - `EmployeeProfileScore` (avg completion %)
  - `DocumentSignature` (pending count)
  - `NonPerformanceClause` (active PIPs)
  - `TrainingRecord` (completion %)
- Frontend: `HRGovernanceDashboard.jsx` — summary widgets + action log table
- **Route registration:** Add 3 router imports + `app.use()` calls in `server/app.mjs`
- **Navigation:** Add HR Framework menu item to existing sidebar (check `client/src/components/home/` for nav config)
- **Cron registration:** Add 3 cron jobs to existing cluster-gated cron init in `app.mjs`

---

## 4. Exact Reuse Points (No Rebuild)

| Feature | Reuse From | How |
|---------|-----------|-----|
| File Upload | `userAssetsRoutes.mjs` | Same multer + S3Client pattern |
| Attendance Data | `AttendanceEngine.js`, `AttendanceRecord` | Query present/absent counts directly |
| Sales Data | `Opportunity.mjs` | Aggregate `ownerId + stage: won + period` |
| Ops KPI Data | `KPISheet` model | Read `summary.overall_percentage` |
| Team Hierarchy | `TeamModel` + `UserModel` | Build org tree from existing refs |
| Auth / RBAC | `authMiddleware.mjs` + role checks | Add `hrOrAdminOnly` helper where needed |
| Audit Trail | `auditPlugin.mjs` | Apply to all new models |
| Email | Existing Nodemailer/SES | Reuse transport config |
| Frontend Tables | MUI DataGrid / Material React Table | Already in dependencies |
| Charts | ApexCharts / Recharts | Already in dependencies |
| Export | `exceljs`, `jspdf`, `html2canvas` | Already in dependencies |

---

## 5. File List (Complete — What I Will Create)

```
server/
  model/hr/
    employeeProfileScoreModel.mjs
    hrKpiScoreModel.mjs
    hrDocumentModel.mjs
    documentSignatureModel.mjs
    trainingRecordModel.mjs
    salesPerformanceRecordModel.mjs
    nonPerformanceClauseModel.mjs
    hrActionLogModel.mjs
    roleDescriptionModel.mjs          # optional
  services/
    profileCompletionService.mjs
    hrKpiAggregator.mjs
    salesPerformanceAggregator.mjs
    hrDocumentReminderService.mjs
  routes/hr/
    hrFrameworkRoutes.mjs             # profile + kpi + org + governance
    hrDocumentRoutes.mjs              # docs + signatures
    salesPerformanceRoutes.mjs        # sales + PIP
  middleware/
    profileCompletionMiddleware.mjs
  scratch/
    test_profile_completion.mjs
    test_hr_kpi_aggregation.mjs
    test_sales_pip_trigger.mjs

client/src/components/hr/
  ProfileCompletionBanner.jsx
  ProfileCompletionReport.jsx
  HRKPIScoreCard.jsx
  HRKPIDashboard.jsx
  OrganisationChart.jsx
  SkillMatrixGrid.jsx
  TrainingAttendanceLog.jsx
  PendingSignaturesWidget.jsx
  SignatureTrackingDashboard.jsx
  SalesPerformanceDashboard.jsx
  NonPerformanceTracker.jsx
  HRGovernanceDashboard.jsx
  common/
    RAGBadge.jsx
    TrendIndicator.jsx
```

---

## 6. Go-Live Sequence

1. **Deploy Sprint A** → Profile completion tracking begins (no lockout yet)
2. **30-day grace period** → Employees fill profiles
3. **Deploy Sprint B** → First monthly KPI calculation
4. **Enable lockout** → `profileCompletionMiddleware` active
5. **Deploy Sprints C–F** → Full framework live

---

*Total new code: ~8 models, 4 services, 3 route files, 12 React components, 1 middleware.  
Everything else reuses existing interconnected systems.*
