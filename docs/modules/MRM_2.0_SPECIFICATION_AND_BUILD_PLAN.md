# MRM 2.0 — Team KPI Roll-Up & HOD Performance Scoring
## Comprehensive Engineering Build Specification & 100% Verification Document
**Document Version:** 2.1.0 (Audited & Fully Aligned with Suraj's Brief)  
**Target Audience:** Masood (Full-Stack Engineering), Suraj Rajan (Executive Leadership), HODs  
**Source Brief:** `MRM_KPI_RollUp_Brief_for_Masood.pdf` (Suraj Group of Companies)  
**Audit Date:** September 2026  

---

## Table of Contents
1. [Executive Summary & Purpose](#1-executive-summary--purpose)
2. [Current State vs. New Extension Scope](#2-current-state-vs-new-extension-scope)
3. [Two-Tier Approval & Submission Workflow](#3-two-tier-approval--submission-workflow)
4. [Sub-Team Architecture & Administration](#4-sub-team-architecture--administration)
5. [Derived Segment-Level RAG Engine](#5-derived-segment-level-rag-engine)
6. [Monthly HOD Performance Scoring Engine (70/30 Weighted Blend)](#6-monthly-hod-performance-scoring-engine)
7. [Mandatory Fields & "Nothing to Report" Submission Enforcement](#7-mandatory-fields--nothing-to-report-submission-enforcement)
8. [Open Points Integration at KPI Submission](#8-open-points-integration-at-kpi-submission)
9. [Recurring Blocker Pattern Detection & Escalation](#9-recurring-blocker-pattern-detection--escalation)
10. [Annual Business Loss Roll-Up to HOD Level](#10-annual-business-loss-roll-up-to-hod-level)
11. [Report Format: Department, Segment & Individual Hierarchical Layout](#11-report-format-department-segment--individual-hierarchical-layout)
12. [Accountability & Pre-Deadline Submission Tracking](#12-accountability--pre-deadline-submission-tracking)
13. [Database Models & Backend Schemas](#13-database-models--backend-schemas)
14. [API Contracts & Endpoint Specifications](#14-api-contracts--endpoint-specifications)
15. [PDF Sentence-by-Sentence Mapping & Gap Audit Matrix](#15-pdf-sentence-by-sentence-mapping--gap-audit-matrix)

---

## 1. Executive Summary & Purpose

The Suraj Group monthly MRM module is live and functioning for HODs (displaying focus-area tiles, objectives, plan versus actual, target-based RAG, save/lock workflows, and action plans). Concurrently, individual team members across every department separately log day-wise KPI counts (approx. 7–15 task types), blockers, business loss (INR), and open points.

**The Gap:** Today, team-member data lives in a separate operational silo from the HOD-level MRM that Suraj reviews each month. Suraj and HODs have no unified screen showing how daily team execution connects to department outcomes.

**The Solution (MRM 2.0):** Pulls team-member submissions into structured, clustered **sub-team segments** within the **same monthly HOD MRM** that HODs already present. It computes:
1. **Automated Segment-Level RAG** derived from historical trend deviation and operational flags (blockers / business loss / missed submissions), with explicit root-cause callouts.
2. **Monthly HOD Performance Score** blended 70% from team KPI performance across segments and 30% from HOD individual focus areas.
3. **Pre-Deadline Submission Tracking** enabling HODs to chase late team entries before deadlines pass.
4. **Recurring Blocker Pattern Detection** ensuring persistent month-over-month impediments are surfaced to Suraj.
5. **Annual Business Loss Rollup** rolling up onto the HOD's annual scorecard for total executive accountability.

---

## 2. Current State vs. New Extension Scope

| Feature Area | Current State (What Already Exists) | MRM 2.0 Extension (What This Extension Adds) |
|---|---|---|
| **KPI Logging** | Team members log day-wise counts against 7–15 personal task types and save daily. | Unchanged at daily entry. At month-end submission, mandatory validation is added for blockers, business loss, and open points with "Nothing to report" options. |
| **KPI Targets** | Raw counts of work completed; no targets against a planned quota. | KPIs continue to carry no arbitrary targets; segment RAG is derived purely from statistical trend deviation and operational flags. |
| **Department Aggregation** | Flat list of individual sheets or standalone admin reviewer dashboard. | **Sub-Team Clustering:** Members grouped into named sub-teams (e.g. "DU", "Submission" under Import) with rolled-up segment totals and bracketed member names. |
| **RAG Rating** | Manual RAG or target-based Auto-RAG only on HOD focus areas. | **Derived Segment RAG:** Automated 2-signal engine (Trend Deviation + Flags), cold-start handling (first 3 months), and non-submission red default. |
| **RAG Transparency** | Single color dot. | **Root-Cause Badges:** Color displayed alongside the explicit trigger: `[Trend Deviation]`, `[Flagged Blocker / Loss]`, or `[Both]`. |
| **HOD Evaluation** | Qualitative review during meetings or individual MRM focus-area achievement. | **Single Blended Monthly HOD Score:** 70% Team KPI Performance + 30% HOD Focus Area Achievement. |
| **Submissions Follow-up** | Discovered by Suraj or HOD only after monthly deadlines pass. | **Pre-Deadline Submission Status Indicator:** Real-time visibility into who has/hasn't submitted prior to the deadline, empowering HODs to act. |
| **Blockers & Escalation** | Single-month text entry; risks being buried. | **Recurrence Pattern Detection:** Highlights blockers that recur month-over-month as chronic operational friction points. |
| **Annual Rollup** | Objectives aggregate annually (via `mrmAnalyticsService`). | **HOD Business Loss Rollup:** Annual team business loss rolled up directly onto the HOD's annual view and scorecard. |

---

## 3. Two-Tier Approval & Submission Workflow

The brief explicitly states:
> *"Once submitted, the HOD reviews and clicks approve; it then reaches Suraj."*

```
┌─────────────────────────┐       1. Submit       ┌─────────────────────────┐       2. Approve       ┌─────────────────────────┐
│   Team Member (Daily)   │ ────────────────────> │    HOD Review & Action  │ ────────────────────>  │    Suraj Rajan Review   │
│  • Day-wise KPI Counts  │                       │  • Review Sub-Team Seg. │                        │  • Executive MRM View   │
│  • Month-End Single Sub │                       │  • Resolve Blockers     │                        │  • Focus on Reds First  │
│  • Mandatory Fields     │                       │  • Approve & Lock Dept  │                        │  • Increments & Coaching│
└─────────────────────────┘                       └─────────────────────────┘                        └─────────────────────────┘
```

1. **Tier 1 (Team Member Submission):**
   * Member fills daily KPI numbers throughout the month.
   * At month end, member performs a single submit action bundling: task totals, blockers, business loss (INR + remarks), and open points.
2. **Tier 2 (HOD Review & Approval):**
   * HOD views all sub-team segments, unsubmitted sheets, and flagged items.
   * HOD clicks **"Approve & Roll Up to MRM"**. This locks team-member sheets and calculates the final monthly segment scores and the 70/30 HOD score.
3. **Executive Review (Suraj Rajan):**
   * Suraj reviews the combined HOD MRM report with sub-team segments clustered and filtered to "Reds First".

---

## 4. Sub-Team Architecture & Administration

### 4.1. Conceptual Organization
Every department is partitioned into named sub-teams. For example, in **Import**:
* **Sub-Team 1: "DU"** (Members: *Ramesh Patel*, *Kavita Shah*)
* **Sub-Team 2: "Submission"** (Members: *Amit Sharma*, *Priya Verma*, *Deepak Joshi*)
* **Sub-Team 3: "Operations"** (Members: *Suresh Nair*, *Vikas Mehta*)

### 4.2. Rollup Aggregation Rules
1. **No Flat Member Dumping:** An HOD with 5 sub-teams sees **5 discrete segment blocks**, not a flat list of 20 individuals.
2. **Bracketed Member Attribution:** The segment title displays the sub-team name followed by contributors in brackets:  
   `DU Sub-Team [Ramesh Patel, Kavita Shah]`
3. **Task-Level Summation:** If *Ramesh* completed 140 "BOE Filings" and *Kavita* completed 110, the "DU" segment displays:  
   `BOE Filings: 250 (Ramesh: 140, Kavita: 110)`
4. **Hierarchical Drill-Down:**
   - Level 1: Sub-Team Segment summary row.
   - Level 2: Individual contributing member rows directly nested beneath the segment.

### 4.3. Sub-Team Management Interface
* HODs and Admins have a dedicated management drawer/modal in the MRM settings:
  * Create/rename sub-teams within the department.
  * Drag-and-drop or select users to assign them to a sub-team.
  * Persisted in `UserModel.sub_team`.

---

## 5. Derived Segment-Level RAG Engine

Segment RAG is **never manually edited**. It is continuously derived from two distinct operational signals:

```
                            ┌────────────────────────────────────────┐
                            │      Segment-Level RAG Evaluation      │
                            └────────────────────┬───────────────────┘
                                                 │
                  ┌──────────────────────────────┴──────────────────────────────┐
                  ▼                                                             ▼
    ┌───────────────────────────┐                                 ┌───────────────────────────┐
    │  Signal 1: Trend Dev.     │                                 │   Signal 2: Flags         │
    │  (Current vs Trailing 3M) │                                 │   (Blockers / Loss / Late)│
    └─────────────┬─────────────┘                                 └─────────────┬─────────────┘
                  │                                                             │
                  ▼                                                             ▼
   • Drop >= 20%  --> RED                                          • Non-submission  --> RED
   • Drop 10-19%  --> AMBER                                        • Business Loss   --> RED
   • Drop < 10%   --> GREEN                                        • Unresolved Blk. --> RED
   • Months 1-3   --> OFF (Cold Start)                             • Clean / None    --> GREEN
                  │                                                             │
                  └──────────────────────────────┬──────────────────────────────┘
                                                 │
                                                 ▼
                             ┌───────────────────────────────────────┐
                             │       Final Worst-Case Resolution     │
                             │  RED > AMBER > GREEN                  │
                             │  + Display Explicit Cause Tag(s)      │
                             └───────────────────────────────────────┘
```

### 5.1. Signal 1: Trend Deviation Thresholds & Formulas
Let $V_m$ be the total KPI output count for the segment in current month $m$.  
Let $T_{3M} = \frac{V_{m-1} + V_{m-2} + V_{m-3}}{3}$ be the trailing 3-month average.

$$\text{Deviation Percentage } (\Delta\%) = \left( \frac{V_m - T_{3M}}{T_{3M}} \right) \times 100$$

* **RED Status:** $\Delta\% \le -20.0\%$ (Output dropped 20% or more below historical average).
* **AMBER Status:** $-19.99\% \le \Delta\% \le -10.0\%$ (Output dropped between 10% and 19.99% below average).
* **GREEN Status:** $\Delta\% > -10.0\%$ (Output is within normal variation, equal to, or above average).

#### The 3-Month Cold-Start Rule (Explicit Requirement)
* During the first 3 months after go-live (Months 1, 2, and 3), historical baseline data does not exist.
* **Cold-Start Behavior:** The Trend Signal is **automatically disabled** ($T_{3M} = \text{N/A}$).
* During this window, RAG evaluates **purely on Signal 2 (Flags)**.
* Starting in Month 4, once exactly 3 completed months exist, the Trend Signal switches on automatically without manual configuration.

### 5.2. Signal 2: Presence of Flags
A segment triggers an immediate **RED** flag if any of the following occur:
1. **Business Loss Reported:** Any contributing member in the segment logs a `business_loss > 0` that is not marked "nothing to report".
2. **Active Blockers Reported:** Any contributing member logs one or more unresolved blockers that are not marked "nothing to report".
3. **Non-Submission by Deadline:** Any team member has failed to submit their monthly KPI sheet by the monthly deadline.

### 5.3. Combination & Precedence Matrix
The segment color takes the **worst-case status** across both signals:

| Signal 1 (Trend Deviation) | Signal 2 (Flags: Blockers/Loss/Late) | Final Segment RAG | Explicit Reason Badge Displayed |
|---|---|---|---|
| Red ($\le -20\%$) | Flagged (Loss / Blocker / Late) | **RED** | `[Trend (-X%) & Blockers/Loss]` |
| Red ($\le -20\%$) | Clean ("Nothing to Report") | **RED** | `[Trend Deviation (-X%)]` |
| Amber / Green | Flagged (Loss / Blocker / Late) | **RED** | `[Operational Flag: Loss / Blocker]` |
| Amber ($-10\%$ to $-19\%$) | Clean ("Nothing to Report") | **AMBER** | `[Trend Deviation (-X%)]` |
| Green ($> -10\%$) | Clean ("Nothing to Report") | **GREEN** | `[On Trend & Clean]` |
| *Cold Start (Months 1–3)* | Flagged | **RED** | `[Operational Flag (Cold Start)]` |
| *Cold Start (Months 1–3)* | Clean | **GREEN** | `[Clean (Cold Start)]` |

### 5.4. Non-Submission Handling (Never Drop Missed Submissions)
* If a team member has not submitted by the monthly deadline, **their segment defaults to RED**.
* The segment is **NOT excluded** from the rollup. Missing data counts as zero output for that member, penalizing both the trend volume and triggering the non-submission flag.
* The UI displays an explicit warning tag: `[Missed Submission: Member Name]`.

---

## 6. Monthly HOD Performance Scoring Engine

Suraj requires a single, objective monthly score for every HOD to track performance over time and establish an annual ranking for increments, bonuses, and coaching.

$$\text{Monthly HOD Performance Score } (S_{\text{HOD}}) = \left( S_{\text{Team}} \times 0.70 \right) + \left( S_{\text{Focus}} \times 0.30 \right)$$

### 6.1. Component 1: Team KPI Performance Score ($S_{\text{Team}}$, Weight = 70%)
Calculated as the average score across all $N$ sub-team segments belonging to the HOD:

$$S_{\text{Team}} = \frac{1}{N} \sum_{i=1}^{N} \text{SegmentScore}_i$$

Where each segment's score ($\text{SegmentScore}_i$) is graded based on its derived RAG and severity:
* **GREEN Segment:** 100 points
* **AMBER Segment:** 70 points
* **RED Segment:**
  * Red due to 1 trigger (e.g. Trend alone OR Flag alone): 40 points
  * Red due to BOTH triggers (Trend deviation AND Blocker/Loss): 20 points
  * Red due to Unsubmitted Sheet: 0 points

### 6.2. Component 2: HOD Focus Areas Score ($S_{\text{Focus}}$, Weight = 30%)
Calculated from the HOD's own live MRM tiles/objectives (plan vs. actual target-based RAG):

$$S_{\text{Focus}} = \frac{(N_{\text{Green}} \times 100) + (N_{\text{Yellow}} \times 60) + (N_{\text{Red}} \times 0)}{N_{\text{Total Objectives}}}$$

### 6.3. Executive Ranking & Annual Compounding
* Every month, $S_{\text{HOD}}$ is logged in `mrmHodScoreSchema`.
* Suraj's Executive Dashboard sorts HODs by $S_{\text{HOD}}$ to instantly show the month's top and bottom performers.
* The trailing 12-month average serves as the empirical base for annual increment and appraisal discussions.

---

## 7. Mandatory Fields & "Nothing to Report" Enforcement

To eliminate ambiguous blank entries while keeping submission practical, the system enforces a strict validation gate.

### 7.1. The 3 Mandatory Submission Fields
1. **Business Loss (INR):** Rupee amount + action recommendation note.
2. **Blockers:** Operational roadblocks encountered.
3. **Open Points:** Workload items requiring cross-functional resolution.

### 7.2. "Nothing to Report" Selectable Option
A blank field is strictly prohibited and blocks form submission. However, an uneventful month must not force fabricated data.  
* For each field, the employee can select a dedicated toggle / checkbox: **"Nothing to report"**.
* Selecting "Nothing to report" explicitly stores:
  ```json
  {
    "business_loss": 0,
    "business_loss_nothing_to_report": true,
    "business_loss_remarks": "Nothing to report - Clean operations",
    "blockers_nothing_to_report": true,
    "open_points_nothing_to_report": true
  }
  ```
* This ensures 100% data presence while distinguishing a true zero-incident month from an incomplete submission.

### 7.3. Actionable Business Loss Remarks
When `business_loss > 0`:
* The remarks field is validated with a minimum character threshold (e.g., 20 chars).
* Field label and placeholder state:  
  *“State the concrete recommendation or remedial action taken to prevent recurrence (Reviewed by HOD & Suraj Rajan)”*.
* Free-form non-actionable remarks (e.g. "N/A", "Lost money", "Customer delayed") are rejected.

---

## 8. Open Points Integration at KPI Submission

The brief specifies:
> *"At month end, each team member has a single 'submit' action. This one submission bundles: the monthly total per task type... blockers faced that month, business loss... and open points."*  
> *"Business loss, blockers, and open points are mandatory (non-blank) fields at the point of monthly submission... Each of these three fields includes a 'nothing to report' option..."*  
> *"Workload / open points: Open points associated with the team member, as already captured at submission."*

### 8.1. Submission Capture UI
In the KPI submission modal, the employee sees the **Open Points Section**:
* **Option A: "Nothing to report" Checkbox** (for members with no pending open points).
* **Option B: Add / Link Open Points**:
  * Title / Description of the open item.
  * Target Resolution Date.
  * Responsible Party / Department (e.g. IT, Accounts, Port Operations).
  * Priority (High, Medium, Low).
* Automatically syncs into the central Open Points module (`originModule: 'MRM_KPI'`).

---

## 9. Recurring Blocker Pattern Detection & Escalation

The brief specifies:
> *"HODs are accountable for resolving or escalating their team's blockers — an unresolved blocker that recurs month over month should be visible as a pattern, not buried in a single month's entry."*

### 9.1. Recurrence Matching Engine
When a blocker is submitted:
1. **Recurrence Key Tagging:** The user selects or inputs the blocker category/sub-category (e.g. `SYSTEM: ICEGATE Port Timeout`, `VENDOR: CFS Gate Pass Delay`).
2. **Historical Comparison:** The system queries the team member's and sub-team's previous 2 months' submissions.
3. **Pattern Detection:** If the same root cause or recurrence key appeared in the preceding month ($m-1$) and remained unresolved, it increments the recurrence counter:
   * **Month 1:** Regular Blocker.
   * **Month 2 (Consecutive):** `⚠️ Recurring Blocker (2nd Month)` — Alert sent to HOD.
   * **Month 3+ (Chronic):** `🔥 Chronic Blocker (3+ Months)` — Escalated directly to Suraj's HOD MRM view as an unresolved HOD governance failure.

---

## 10. Annual Business Loss Roll-Up to HOD Level

The brief stipulates:
> *"The annual business-loss figure should also reflect and roll up onto the HOD's own annual view, not just sit at the team-member or segment level, since HOD accountability for team business loss is part of the point of this extension."*

### 10.1. Annual Rollup Integration
* Integrates directly into the existing `mrmAnalyticsService.mjs` annual rollup engine without building a redundant pipeline.
* Queries all approved KPI sheets across all department members for Months 1 through 12.
* Computes:
  1. Total Department Annual Business Loss = $\sum \text{business\_loss}$.
  2. Loss Breakdown by Sub-Team Segment.
  3. Loss Breakdown by Root-Cause Category.
* Surfaces the aggregate figure prominently at the top of the **HOD's Annual MRM View** alongside their personal objective targets:
  ```
  [ Annual Team Business Loss: ₹ 3,45,000 | 4 Incidents | Primary Driver: Documentation Discrepancies ]
  ```
* Connects into the HOD's annual performance score as a deduction factor or governance metric.

---

## 11. Report Format: Department, Segment & Individual Hierarchical Layout

Page 3 of the brief explicitly defines the monthly HOD MRM report table format:

| Field from Brief | What It Shows (from Brief) | Where & How It Appears in UI |
|---|---|---|
| **Plan vs. Actual vs. Variance** | Existing focus-area fields at the HOD level — unchanged. | **Section 1: HOD Strategic Focus Areas Table** (top of report). Unchanged from current live MRM. |
| **KPI numbers** | Raw count of work completed per task type, rolled up per segment and per individual. | **Section 2: Sub-Team KPI Segments Table**. Shows segment sum row + expandable rows for each individual member. |
| **Blockers** | As submitted monthly by the team member; visible per segment and per individual. | Displayed in Segment header banner + detailed blocker cards per contributing individual. |
| **Workload / open points** | Open points associated with the team member, as already captured at submission. | Open points count and active items displayed in both segment summary and individual member cards. |
| **Action plan, responsible person, remarks** | Existing MRM fields — unchanged. | Displayed on HOD focus-area rows and on segment-level corrective action rows. |
| **Status (Red / Yellow / Green)** | Existing at HOD focus-area level (target-based); new derived version at segment level (trend-and-flag-based). | Dual RAG badges: Target-based RAG on Section 1; Trend-and-flag-based RAG with reason tags on Section 2. |

### Visual Layout Diagram
```
====================================================================================================
 SURAJ GROUP OF COMPANIES — MONTHLY HOD MRM REPORT
 Department: IMPORT | Month: AUGUST 2026 | HOD: Rajesh Sharma | Monthly Score: 82.4/100 (Rank #2)
====================================================================================================

 [FILTER CONTROLS]: [All Segments (5)] | [🔴 Reds First (2)] | [⚠️ Ambers (1)] | [🟢 Greens (2)]
 [PRE-DEADLINE TRACKER]: 14/15 Team Members Submitted (93%) | ⚠️ 1 Pending Submission [Deepak Joshi]

----------------------------------------------------------------------------------------------------
 SECTION 1: HOD STRATEGIC FOCUS AREAS (Weight: 30% | Score: 88.0%)
----------------------------------------------------------------------------------------------------
 Process Description | Target | Plan | Actual | Variance | RAG    | Action Plan | Owner | Due Date
 Customs Clearance   | < 24h  | 24h  | 21.5h  | +2.5h    | 🟢 Grn | Ongoing SOP | RS    | 31-Aug
 Demurrage Incident  | 0      | 0    | 1      | -1       | 🔴 Red | Escalate CFS| RS    | 15-Aug

----------------------------------------------------------------------------------------------------
 SECTION 2: SUB-TEAM KPI PERFORMANCE SEGMENTS (Weight: 70% | Score: 80.0%)
 Filtered to Reds First
----------------------------------------------------------------------------------------------------

 ▶ 🔴 SEGMENT: DU SUB-TEAM [Ramesh Patel, Kavita Shah]
    Trigger Reason: ⚡ Trend Deviation (-24.2% vs 3M Avg) + Flagged Blocker
    • Current Month Total: 380 tasks | Trailing 3M Avg: 501 tasks | Variance: -24.2% (🔴 Red)
    • Business Loss: ₹ 0 [Nothing to report]
    • Blockers Reported: "EDI server port timeout during peak hours (3 days)" (🔴 Red)
    • Open Points: 3 items pending IT Helpdesk
    
    [▼ EXPANDED SEGMENT DRILLDOWN: TASKS & INDIVIDUAL MEMBERS]
    ------------------------------------------------------------------------------------------------
    Task Item                   | Segment Total | Ramesh Patel | Kavita Shah | Historical 3M Trend
    ------------------------------------------------------------------------------------------------
    BE Checklist Preparation    | 190           | 100          | 90          | 260 (-26.9%) 🔴
    Job File Verification       | 190           | 95           | 95          | 241 (-21.1%) 🔴
    
    Individual Member Details:
    • Ramesh Patel: Total: 195 | Blockers: "EDI port timeout" | Business Loss: ₹ 0 | Open Points: 2
    • Kavita Shah:  Total: 185 | Blockers: None               | Business Loss: ₹ 0 | Open Points: 1

 ▶ 🔴 SEGMENT: SUBMISSION SUB-TEAM [Amit Sharma, Priya Verma, Deepak Joshi]
    Trigger Reason: ⚠️ Non-Submission by Deadline [Deepak Joshi] + Business Loss
    • Current Month Total: 520 tasks | Trailing 3M Avg: 540 tasks | Variance: -3.7% (🟢 Grn)
    • Business Loss: ₹ 18,500 [Late penalty on B/L surrender - CFS amendment needed]
    • Blockers Reported: None [Nothing to report]
    • Submission Status: ⚠️ Deepak Joshi missed 4th Sep deadline (Defaults Segment to 🔴 Red)

 ▶ 🟢 SEGMENT: OPERATIONS SUB-TEAM [Suresh Nair, Vikas Mehta]
    Trigger Reason: 🟢 On Trend (+4.1%) & Clean
    • Current Month Total: 840 tasks | Trailing 3M Avg: 807 tasks | Variance: +4.1%
    • Business Loss: ₹ 0 [Nothing to report]
    • Blockers Reported: None [Nothing to report]
    • Submission Status: All 2/2 Submitted on time
====================================================================================================
```

---

## 12. Accountability & Pre-Deadline Submission Tracking

### 12.1. Pre-Deadline Submission Status Indicator
* **The Problem:** In the past, HODs discovered team members hadn't submitted their KPI sheet only after the deadline expired, leading to Suraj having to intervene.
* **The Solution:** The HOD dashboard features a live **Pre-Deadline Status Indicator**:
  * Visible starting on the 1st of the month until the submission deadline (e.g. 4th of the month, governed by `KPISettings.submission_deadline_override`).
  * Shows a progress gauge: `Submitted: 11 / 14 (78.5%)`.
  * Lists pending members with a **1-click Chase Action**:  
    `[⚠️ Deepak Joshi — Not Submitted — Send Reminder]`.
  * Gives the HOD ownership to resolve gaps while there is still time to act.

---

## 13. Database Models & Backend Schemas

### 13.1. `UserModel` Extension (`server/model/userModel.mjs`)
```javascript
sub_team: {
    type: String,
    trim: true,
    index: true,
    default: "General"
},
sub_team_role: {
    type: String,
    enum: ["Member", "Lead"],
    default: "Member"
}
```

### 13.2. `KPISheet` Summary Extension (`server/model/kpi/kpiSheetModel.mjs`)
```javascript
summary: {
    business_loss: { type: Number, default: 0, required: true },
    business_loss_nothing_to_report: { type: Boolean, default: false },
    business_loss_remarks: { type: String, default: "" },
    
    blockers: { type: String, default: "" },
    blockers_nothing_to_report: { type: Boolean, default: false },
    blockers_root_cause: { type: String, default: "" },
    blockers_recurrence_key: { type: String, default: "" },
    
    open_points: [{
        title: String,
        targetDate: Date,
        responsibility: String,
        priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" }
    }],
    open_points_nothing_to_report: { type: Boolean, default: false },
    
    submission_date: { type: Date },
    is_submitted_on_time: { type: Boolean, default: true }
}
```

### 13.3. `MRMSegmentRollup` Model (`server/model/mrm/mrmSegmentRollupModel.mjs` - [NEW])
Stores monthly snapshotted aggregates for each sub-team segment to preserve historical auditability.

### 13.4. `MRMHodScore` Model (`server/model/mrm/mrmHodScoreModel.mjs` - [NEW])
Stores the weighted 70/30 monthly score, rankings, and annual cumulative team business loss for each HOD.

---

## 14. API Contracts & Endpoint Specifications

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/mrm/segments/rollup` | HOD / Admin | Fetches clustered sub-team segments for a department/month, including member names, rolled-up task counts, 2-signal RAG, and trigger reasons. |
| `GET` | `/api/mrm/hod-score` | HOD / Admin | Returns the 70/30 blended monthly performance score for the HOD, component breakdowns, and historical rankings. |
| `GET` | `/api/mrm/pre-deadline-tracker` | HOD / Admin | Real-time submission status of all department members prior to the monthly deadline. |
| `GET` | `/api/mrm/recurring-blockers` | HOD / Admin | Identifies blockers that have recurred month-over-month across department sub-teams. |
| `GET` | `/api/mrm/annual-business-loss` | HOD / Admin | Aggregates annual team business loss rolled up onto the HOD's annual view. |
| `POST`| `/api/kpi/sheet/submit` | Employee | Enhanced with validation requiring non-blank Business Loss, Blockers, and Open Points (or explicit "Nothing to Report"). |
| `POST`| `/api/mrm/sub-teams/manage` | Admin / HOD | Create, update, or assign users to named sub-teams within a department. |

---

## 15. PDF Sentence-by-Sentence Mapping & Gap Audit Matrix

Below is the exhaustive, sentence-by-sentence mapping of the original PDF brief against the build specification, detailing exact coverage and identifying previously underspecified nuances that have now been resolved.

| # | Exact Text from Suraj's PDF Brief | Page / Location in PDF | Status in Spec v2.0 | What Was Missing / Under-Specified & How It Is Resolved in Spec v2.1 | Coverage |
|---|---|---|---|---|:---:|
| **1** | *"The monthly MRM module Masood already built — tiles, objectives, plan versus actual, RAG entry, save — is live and working for HODs."* | Page 1, Why Extension Exists | Covered | Preserves existing live MRM tiles and objective workflows completely unchanged in Section 1. | 100% |
| **2** | *"What's missing is the layer underneath it: individual team members across every department are separately filling in day-wise KPI data, blockers, business loss, and open points, and today that data lives apart from the HOD-level MRM Suraj reviews each month."* | Page 1, Why Extension Exists | Covered | Sub-team segments directly pull the underlying team KPI submissions into the HOD MRM. | 100% |
| **3** | *"This extension closes that gap — it pulls team-member submissions up into a clustered, scored view inside the same MRM that HODs already present, so performance at every level, from the individual up to the HOD, is visible in one place."* | Page 1, Why Extension Exists | Covered | Unified screen architecture designed in Section 11. Both levels visible in one place. | 100% |
| **4** | *"The end goal: a monthly HOD MRM that shows team performance clustered by sub-team, colour-coded so Suraj can go straight to the red areas in his HOD meetings, feeding into an annual score that helps identify top and bottom performers for increments and coaching."* | Page 1, Why Extension Exists | Covered | "Reds First" default meeting view + 12-month score tracking for appraisals. | 100% |
| **5** | *"Team members already log day-wise KPI entries against their own personal list of task types (roughly seven to fifteen per person) — they flag and update whichever tasks occurred that day and save."* | Page 1, Current State | Covered | Reuses existing daily logging UI in `KPISheet.js`; no changes required to daily workflow. | 100% |
| **6** | *"At month end, each team member has a single “submit” action. This one submission bundles: the monthly total per task type (auto-summed from their daily entries), blockers faced that month, business loss (a rupee figure, with a text remarks field already present), and open points."* | Page 1, Current State | **Under-specified in v2.0** | **Clarified in v2.1:** Added explicit Open Points entry array (`open_points`) in submission modal alongside task totals, blockers, and rupee loss with action remarks. | 100% |
| **7** | *"Once submitted, the HOD reviews and clicks approve; it then reaches Suraj."* | Page 1, Current State | **Missing in v2.0** | **Added in v2.1 (Section 3):** Two-tier approval lifecycle explicitly defined: Tier 1 (Member submits) $\to$ Tier 2 (HOD reviews sub-teams & clicks Approve) $\to$ Reaches Suraj. | 100% |
| **8** | *"KPIs themselves currently have no targets — they are raw counts of work completed, not measured against a plan."* | Page 1, Current State | Covered | Reaffirmed in Section 5: zero quotas/targets applied to team KPIs; RAG uses trend deviation instead. | 100% |
| **9** | *"HOD-level MRM (tiles, objectives, plan versus actual, RAG, action plans) is already live and separately in use — this is where targets and RAG status currently exist."* | Page 1, Current State | Covered | Maintained unchanged in Section 1 of the HOD MRM report. | 100% |
| **10** | *"The MRM Open Points integration and annual rollup/forecasting module (auto-syncing action plans, approval-and-lock workflow, annual aggregation) is already underway as a separate, related build — business-loss annual aggregation should be handled by that same rollup, not rebuilt here."* | Page 1, Current State | Covered | Reuses `mrmAnalyticsService.mjs` and `mrmOpenPointsSyncService.mjs` without building duplicate pipelines. | 100% |
| **11** | *"Team members within a department are organised into named sub-teams (for example, under Import: a “DU” sub-team and a “Submission” sub-team, each with its own two or three people)."* | Page 1, Adds - 1 | **Under-specified in v2.0** | **Added in v2.1 (Section 4.3):** Added sub-team management UI modal for HODs/Admins to configure members per sub-team. | 100% |
| **12** | *"Each sub-team's individual KPI submissions should be summed and clustered into a single segment view for that HOD, with the contributing team members' names shown in brackets under the segment."* | Page 1, Adds - 1 | Covered | Rendered as `[Ramesh Patel, Kavita Shah]` with summed task totals. | 100% |
| **13** | *"An HOD with five sub-teams should see five distinct segments, each rolling up its members' numbers, rather than one flat list of individuals."* | Page 1, Adds - 1 | Covered | Hierarchical layout groups $N$ members into 5 distinct segment cards. | 100% |
| **14** | *"KPIs still carry no targets, so RAG at the segment level is not a manual entry — it is derived automatically from two signals together: Trend deviation ... Presence of flags"* | Page 1 & 2, Adds - 2 | Covered | Automated 2-signal engine specified in Section 5. | 100% |
| **15** | *"A segment can turn red from either signal, or both. This lets an HOD (and Suraj) see at a glance, across all of an HOD's five-or-so sub-teams, which ones need attention that month — filterable to reds first, which is how Suraj runs HOD MRM meetings today."* | Page 2, Adds - 2 | Covered | Worst-case evaluation logic + "Reds First" filter toggle. | 100% |
| **16** | *"Note: this segment-level RAG is distinct from the existing HOD-level MRM RAG... one is target-based (existing), the other is trend-and-flag-based (new)."* | Page 2, Adds - 2 | Covered | Distinct RAG formulas and badges on Section 1 vs Section 2. | 100% |
| **17** | *"The segment view must show the HOD which of the two triggers caused a red status — trend deviation, a flagged blocker/business loss, or both — directly alongside the colour itself, not just the colour on its own."* | Page 2, Adds - 2 | Covered | Explicit reason badges rendered side-by-side with color dot. | 100% |
| **18** | *"Trend-deviation threshold: a segment is flagged red on the trend signal when its current-month KPI output falls 20 percent or more below its own trailing 3-month average; 10–19 percent below trend is amber."* | Page 2, Adds - 2 | Covered | Exact thresholds implemented: $\le -20\% \implies \text{Red}$, $-10\%$ to $-19.99\% \implies \text{Amber}$. | 100% |
| **19** | *"For the first three months after this extension goes live, a segment has no trend history to compare against — during that window, RAG runs on the flag signal alone ... and the trend signal switches on automatically once three months of data exist."* | Page 2, Adds - 2 | Covered | Cold-start logic automated in Section 5.1. | 100% |
| **20** | *"Non-submission handling: if a team member has not submitted by the monthly deadline, their segment defaults to red for that month and is flagged accordingly in the HOD's view — it is not excluded from the roll-up."* | Page 2, Adds - 2 | Covered | Missed submission forces segment to Red and enters rollup with zero count. | 100% |
| **21** | *"Each HOD receives one monthly score, calculated as a weighted blend: Team KPI performance (rolled up from all of the HOD's segments) [70%], HOD's own individual focus areas (existing MRM tiles/objectives) [30%]."* | Page 2, Adds - 3 | Covered | Blended formula: $(S_{\text{Team}} \times 0.70) + (S_{\text{Focus}} \times 0.30)$. | 100% |
| **22** | *"This score is what lets Suraj compare HODs against each other over time and, annually, identify the strongest and weakest performers for increment and coaching conversations."* | Page 2, Adds - 3 | Covered | HOD performance ranking leaderboard and 12-month trend tracking. | 100% |
| **23** | *"Business loss, blockers, and open points are mandatory (non-blank) fields at the point of monthly submission — a team member cannot submit a blank month."* | Page 2, Adds - 4 | Covered | Server-side and client-side validation blocking empty submissions. | 100% |
| **24** | *"Each of these three fields includes a “nothing to report” option as a deliberate, selectable answer for a clean month, distinct from leaving the field blank..."* | Page 2, Adds - 4 | Covered | Distinct boolean checkboxes with clean default state. | 100% |
| **25** | *"The business-loss field carries a rupee amount with a text remarks field; the remarks field should function as a genuine recommendation/action note rather than free text..."* | Page 2, Adds - 4 | Covered | Rupee input + action note validation requiring actionable recommendations. | 100% |
| **26** | *"Business loss should aggregate annually the same way the existing MRM annual rollup module already handles other objectives — no separate build needed here."* | Page 2, Adds - 5 | Covered | Reuses existing annual rollup in `mrmAnalyticsService.mjs`. | 100% |
| **27** | *"One addition: the annual business-loss figure should also reflect and roll up onto the HOD's own annual view, not just sit at the team-member or segment level, since HOD accountability for team business loss is part of the point of this extension."* | Page 2, Adds - 5 | Covered | Aggregated team loss displayed directly on HOD annual scorecard. | 100% |
| **28** | *"Report Format — What the HOD MRM Should Show: For every team member, from the top of the department down to the individual, the monthly HOD MRM report should show: Plan vs. Actual vs. Variance, KPI numbers, Blockers, Workload / open points, Action plan, responsible person, remarks, Status (Red/Yellow/Green)."* | Page 3, Report Format | **Under-specified in v2.0** | **Clarified in v2.1 (Section 11):** Hierarchical view designed showing department top-level $\to$ segment aggregate rows $\to$ individual team member rows under each segment. | 100% |
| **29** | *"HODs are accountable for resolving or escalating their team's blockers — an unresolved blocker that recurs month over month should be visible as a pattern, not buried in a single month's entry."* | Page 3, Accountability | **Under-specified in v2.0** | **Added in v2.1 (Section 9):** Recurrence matching engine tracks consecutive months ($\ge 2$) and flags chronic patterns to Suraj. | 100% |
| **30** | *"Since the HOD's monthly score is directly tied to team KPI performance, an HOD has a direct incentive to chase down team members who are not submitting or who are consistently in the red, rather than that follow-up falling to Suraj by default."* | Page 3, Accountability | Covered | Incentives aligned via 70% weighting + pre-deadline tracking. | 100% |
| **31** | *"To support this, the HOD's view includes a submission-status indicator visible before the monthly deadline — showing at a glance who on the team has and hasn't submitted yet — so an HOD can chase a late submission while there's still time to act, rather than discovering the gap only after the deadline has passed."* | Page 3, Accountability | Covered | Live pre-deadline tracker widget with 1-click chase action. | 100% |
| **32** | *"This extension takes team-member KPI data that already exists and gives it structure: clustered into named sub-team segments under each HOD, coloured automatically from trend and flags rather than manual entry, and rolled into a single monthly HOD score weighted 70/30 between team and individual performance. Every field that matters — blockers, business loss, open points, submission status, the reason behind a red — is visible in one place, with no separate reporting cycle and no open items left for Masood to resolve before scoping the build."* | Page 3, Summary | Covered | Complete synthesis in unified screen; zero open dependencies. | 100% |
