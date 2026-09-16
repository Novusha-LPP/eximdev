# AlVision Exim Documentation Hub

Welcome to the centralized documentation directory for the **AlVision Exim** project. All project-level documentation, module specifications, workflow guides, architectural decisions, and testing suites are organized into structured subdirectories below.

---

## 📁 Directory Structure

```
docs/
├── attendance-and-hr/         # Attendance, Leave Policy, Shifts, Geofence & HR System
├── workflows-and-operations/  # Special Approvals, Operations, Maintenance & Workflows
├── modules/                   # Module-Specific Guides (DGFT, CRM, MRM, KPI, OpenPoints, etc.)
├── integrations-and-api/      # External Integrations, APIs, and Analytics
├── architecture-and-migration/# Architecture, Deployment, Changelogs & Migration Plans
└── testing/                   # Module-level Functional, Integration, Regression & Smoke Tests
```

---

## 📑 Category Index

### 1. Attendance & HR (`docs/attendance-and-hr/`)
* **[ATTENDANCE_SYSTEM_DOCUMENTATION.md](attendance-and-hr/ATTENDANCE_SYSTEM_DOCUMENTATION.md)** — Comprehensive attendance system overview.
* **[ATTENDANCE_DATA_FLOW_ANALYSIS.md](attendance-and-hr/ATTENDANCE_DATA_FLOW_ANALYSIS.md)** — Data flow analysis for punches and attendance tracking.
* **[ATTENDANCE_REDESIGN_PLAN.md](attendance-and-hr/ATTENDANCE_REDESIGN_PLAN.md)** — Architecture and redesign plan for attendance module.
* **[Attendance_README.md](attendance-and-hr/Attendance_README.md)** — Attendance module route and controller guide.
* **[DEFAULT_LEAVE_BALANCE_SETUP.md](attendance-and-hr/DEFAULT_LEAVE_BALANCE_SETUP.md)** — Setup and default rules for employee leave balances.
* **[LEAVE_BALANCE_MANAGEMENT.md](attendance-and-hr/LEAVE_BALANCE_MANAGEMENT.md)** — Leave balance calculation and management guidelines.
* **[leave_balance_logic.md](attendance-and-hr/leave_balance_logic.md)** — Core business logic for leave deductions and balances.
* **[leave_policy_guide.md](attendance-and-hr/leave_policy_guide.md)** — Organization-wide leave policies and rules.
* **[punch_and_shift_logic.md](attendance-and-hr/punch_and_shift_logic.md)** — Logic for shift timings, grace periods, and punches.
* **[REGULARIZATION_API.md](attendance-and-hr/REGULARIZATION_API.md)** — Attendance regularization API specifications.
* **[GEOFENCE_CONFIGURATION_GUIDE.md](attendance-and-hr/GEOFENCE_CONFIGURATION_GUIDE.md)** — Step-by-step setup for punch geofencing.
* **[GEOFENCE_PRODUCTION_FIX.md](attendance-and-hr/GEOFENCE_PRODUCTION_FIX.md)** — Production fixes and edge case handling for geofences.
* **[GEOFENCING_MULTI_ORG_IMPLEMENTATION_PLAN.md](attendance-and-hr/GEOFENCING_MULTI_ORG_IMPLEMENTATION_PLAN.md)** — Multi-organization geofencing implementation plan.
* **[HR_FRAMEWORK_IMPLEMENTATION_PLAN.md](attendance-and-hr/HR_FRAMEWORK_IMPLEMENTATION_PLAN.md)** — HR framework rollout and implementation plan.
* **[HR_FRAMEWORK_INTEGRATION_PLAN.md](attendance-and-hr/HR_FRAMEWORK_INTEGRATION_PLAN.md)** — HR framework integration points.
* **[HR_FRAMEWORK_TECHNICAL_PLAN.md](attendance-and-hr/HR_FRAMEWORK_TECHNICAL_PLAN.md)** — Technical blueprint for HR framework.
* **[TIMEZONE_FIX_SUMMARY.md](attendance-and-hr/TIMEZONE_FIX_SUMMARY.md)** — Summary of timezone normalization fixes across punches and shifts.

---

### 2. Workflows & Operations (`docs/workflows-and-operations/`)
* **[README_SPECIAL_APPROVAL_WORKFLOW.md](workflows-and-operations/README_SPECIAL_APPROVAL_WORKFLOW.md)** — Special approval workflow overview.
* **[SPECIAL_APPROVAL_WORKFLOW_QUICK_REFERENCE.md](workflows-and-operations/SPECIAL_APPROVAL_WORKFLOW_QUICK_REFERENCE.md)** — Quick reference guide for special approvals.
* **[SPECIAL_APPROVAL_WORKFLOW_FINAL_SUMMARY.md](workflows-and-operations/SPECIAL_APPROVAL_WORKFLOW_FINAL_SUMMARY.md)** — Summary of special approval features and rules.
* **[SPECIAL_APPROVAL_WORKFLOW_VERIFICATION.md](workflows-and-operations/SPECIAL_APPROVAL_WORKFLOW_VERIFICATION.md)** — Verification procedures for special approvals.
* **[SPECIAL_APPROVAL_WORKFLOW_COMPLETE_VERIFICATION.md](workflows-and-operations/SPECIAL_APPROVAL_WORKFLOW_COMPLETE_VERIFICATION.md)** — Complete test verification report.
* **[ADMIN_EQUIPMENT_MAINTENANCE_CHECKLIST.md](workflows-and-operations/ADMIN_EQUIPMENT_MAINTENANCE_CHECKLIST.md)** — Admin equipment maintenance checklist.
* **[TICKET_DATA_DISPLAY_GUIDE.md](workflows-and-operations/TICKET_DATA_DISPLAY_GUIDE.md)** — Guide on ticket display and formatting.
* **[importChargesGuide.md](workflows-and-operations/importChargesGuide.md)** — Guide on import charges calculation and billing.
* **[license_utilization_flow.md](workflows-and-operations/license_utilization_flow.md)** — License utilization and ledger tracking workflow.

---

### 3. Feature Modules (`docs/modules/`)
* **[DGFT_Readme.md](modules/DGFT_Readme.md)** — DGFT module guide and features.
* **[dgft_product_sync.md](modules/dgft_product_sync.md)** — DGFT product synchronization reference.
* **[CRM_README.md](modules/CRM_README.md)** — CRM backend routes and data model specifications.
* **[crm_changes.txt](modules/crm_changes.txt)** — Notes on CRM module changes.
* **[KPI_Readme.md](modules/KPI_Readme.md)** — Key Performance Indicator (KPI) module documentation.
* **[MRM_Readme.md](modules/MRM_Readme.md)** — Management Review Meeting (MRM) module documentation.
* **[MRM_2.0_SPECIFICATION_AND_BUILD_PLAN.md](modules/MRM_2.0_SPECIFICATION_AND_BUILD_PLAN.md)** — MRM 2.0 system specifications.
* **[OpenPoints_Readme.md](modules/OpenPoints_Readme.md)** — Open points and task tracking module guide.
* **[cuurency.txt](modules/cuurency.txt)** — Currency exchange rate scraping reference notes.

---

### 4. Integrations & APIs (`docs/integrations-and-api/`)
* **[tally_pro_api_docs.md](integrations-and-api/tally_pro_api_docs.md)** — Tally ERP API documentation and endpoints.
* **[SCMCUBE_INTEGRATION_REPORT.md](integrations-and-api/SCMCUBE_INTEGRATION_REPORT.md)** — SCMCube integration details and report.
* **[ANALYTICS_SUMMARY.md](integrations-and-api/ANALYTICS_SUMMARY.md)** — Analytics dashboards and data aggregations.

---

### 5. Architecture & Migration (`docs/architecture-and-migration/`)
* **[design.md](architecture-and-migration/design.md)** — Core system design document.
* **[deploy.md](architecture-and-migration/deploy.md)** — Deployment procedures and PM2/Docker configurations.
* **[MIGRATION_QUICK_START.md](architecture-and-migration/MIGRATION_QUICK_START.md)** — Quick start guide for running database migrations.
* **[Detailed_Status_migration.md](architecture-and-migration/Detailed_Status_migration.md)** — Detailed status schema migration documentation.
* **[TEAM_MIGRATION_SUMMARY.md](architecture-and-migration/TEAM_MIGRATION_SUMMARY.md)** — Migration summary for team assignments.
* **[CHANGELOG_JAN_2026.md](architecture-and-migration/CHANGELOG_JAN_2026.md)** — Changelog for January 2026 releases.
* **[CHANGES_SUMMARY.md](architecture-and-migration/CHANGES_SUMMARY.md)** — Summary of system changes and enhancements.
* **[CODE_CHANGES_DETAILED.md](architecture-and-migration/CODE_CHANGES_DETAILED.md)** — Detailed record of system code changes.
* **[COMPLETE_PACKAGE.md](architecture-and-migration/COMPLETE_PACKAGE.md)** — Package release summary.
* **[FINAL_VERIFICATION_REPORT.md](architecture-and-migration/FINAL_VERIFICATION_REPORT.md)** — End-to-end verification report.
* **[REFACTORING_INSTRUCTIONS.md](architecture-and-migration/REFACTORING_INSTRUCTIONS.md)** — Codebase refactoring guidance.
* **[PRIVACY_POLICY.md](architecture-and-migration/PRIVACY_POLICY.md)** — Application privacy policy.
* **[implementation_plan.md](architecture-and-migration/implementation_plan.md)** — Reference implementation plan archive.

---

### 6. Testing Specifications (`docs/testing/`)
The `docs/testing/` directory contains functional, integration, regression, and smoke test plans across all 26 application modules:
* `accounts/`, `admin/`, `analytics/`, `attendance/`, `audit/`, `audit5s/`, `billing/`, `client/`, `cloudflare/`, `crm/`, `customer-kyc/`, `dgft/`, `document-collection/`, `documentation/`, `e-sanchit/`, `employee-kyc/`, `employee-onboarding/`, `exit-interview/`, `first-aid/`, `hr/`, `import-do/`, `import-dsr/`, `import-operations/`, `inward-register/`, `kpi/`, `master-directory/`, `mrm/`, `open-points/`, `outward-register/`, `project-nucleus/`, `server/`, `submission/`.
