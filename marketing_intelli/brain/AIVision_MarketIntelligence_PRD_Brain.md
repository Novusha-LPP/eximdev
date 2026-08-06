# AIVision Market Intelligence PRD v1.1 — Comprehensive Brain Reference Document

> **Document Type**: Loss-Less Brain Reference File (LLM Knowledge Store)
> **Source File**: `AIVision_MarketIntelligence_PRD_v1.1 (1).docx` (v1.1 — May 2026)
> **Purpose**: Authoritative single-source-of-truth reference for the AIVision Market Intelligence PRD v1.1. Contains 100% complete business logic, full data schemas, priority scoring models, gap analysis resolutions, workflow specifications, integration rules, build phases, access control matrices, open questions, and glossary definitions.

---

SURAJ GROUP

AIVision Platform

Market Intelligence Module

Product Requirements Document

### v1.1 — Revised with Gap Analysis, Recommendations, Monthly Report & Sales Integration

| Document Version | v1.1 — May 2026 (supersedes v1.0) |
| :--- | :--- |
| Prepared By | Strategy & Technology Office, Suraj Group |
| For | Puneet (AIVision Product Lead) & Uday (Tech Lead, Alluvium IoT Solutions) |
| Current Access | CEO (Suraj Aranamkatte Rajan) and Shipra (Outreach Team Lead) only |
| Data Entry Owner | Shipra — accountable for all data entry, updates, and monthly report distribution |
| Scope | Centralised Market Intelligence Module — Gujarat & Rajasthan |
| Classification | Internal Confidential — CEO + Shipra access only at this stage |


Document Changelog

| Version | Date | Changes |
| :--- | :--- | :--- |
| v1.0 | May 2026 | Initial PRD — full data model, federation architecture, competitor module, build phases |
| v1.1 | May 2026 | Added: access control update (CEO + Shipra only); all 16 gap resolutions; account priority scoring; account ownership model; status transition criteria; WhatsApp fields; personal data governance policy; regulatory fields; seasonal demand fields; data quality leaderboard; competitor update cadence; financial confidence tags; duplicate contact detection; IEC prospecting; mobile quick-entry spec; geographic visit clustering; Novusha campaign export; Monthly Market Intelligence Report (Section 9); Sales Module Integration (Section 10); revised build phases. |


1. Executive Summary

The Market Intelligence (MI) Module is a centralised intelligence layer within AIVision that aggregates company-level and contact-level data from all five operating divisions of Suraj Group — Import (SFPL), Export, Transport (SRCC), Factory (Rabs/Paramount), and E-Lock (SR E-Locks) — plus manual data uploads from external sources such as trade directories, IndiaMART, and Canton Fair leads.

| v1.1 Key Update — Access & OwnershipIn this version, the module is restricted to two users only: (1) Suraj Aranamkatte Rajan (CEO) — full read access and executive dashboard view; (2) Shipra (Outreach Team Lead) — full read/write access, responsible for all data entry, record updates, contact maintenance, and generation and distribution of the Monthly Market Intelligence Report. Access will be expanded to division heads and sales team in a future phase as decided by the CEO. |
| :--- |


A new Monthly Market Intelligence Report feature (Section 9) auto-generates a curated list of the top 5 Yellow/potential companies per business vertical every month. Shipra reviews and distributes this report to the Sales module, where the sales team engages the companies through the existing Sales CRM pipeline — Kanban view, lead tracking, conversion monitoring — and all outcomes feed back into the MI module.

2. Strategic Context & Objectives

### 2.1 Why This Module Exists

Currently, customer and prospect data lives in isolated pockets across the group — SFPL customs files, SRCC driver logs, Rabs supplier contacts, IndiaMART leads, and individuals' WhatsApp lists. There is no single source of truth for account intelligence, and the group loses commercial opportunity every time a contact moves to a new company and the relationship is not tracked.

### 2.2 Roles & Accountability (v1.1)

All data entry, record maintenance, stale data resolution, and monthly report generation is the responsibility of Shipra (Outreach Team Lead). She is the sole data steward for this module. The CEO reviews the module and monthly reports. No other team member has access at this stage.

| User | Access Level | Responsibilities |
| :--- | :--- | :--- |
| Suraj Aranamkatte Rajan (CEO) | Full read access. Can update company status and add notes. Cannot bulk edit or delete. | Reviews MI dashboard weekly. Approves monthly report before distribution. Final authority on Red-flagging companies. |
| Shipra (Outreach Team Lead) | Full read + write access across all records. | All data entry and updates. Contact maintenance. Approach log entries. Stale data resolution. Monthly report generation and distribution to Sales module. Canton Fair and IndiaMART lead imports. |


| Future Access ExpansionAccess will be expanded to division heads (Mohit — Transport, Renjith — Customs, Ajith — Factory) and to the broader sales team in Phase 3, subject to the CEO's decision. At that point, role-based access tiers defined in Section 13 will apply. |
| :--- |


3. Data Federation Architecture

### 3.1 Source Organisations

Data flows into the MI Module from six sources. The module does not replace any source system — it aggregates, deduplicates, and enriches.

| Source Org | System / Source | Data Contributed | Sync Method |
| :--- | :--- | :--- | :--- |
| SFPL — Import | AIVision Customs Module, TallyPrime Cloud | Customer IDs, GSTIN, shipment volumes, commodity codes, Bill of Entry data, IEC codes | Auto-sync via API |
| SFPL — Export | AIVision Customs Module | Exporter accounts, destination markets, product categories | Auto-sync via API |
| SRCC — Transport | AIVision GPS / Route Master, TallyPrime | Transporter accounts, lane data, trip frequency, vehicle utilisation by customer | Auto-sync via API |
| Rabs / Paramount — Factory | AIVision Factory Module, Tally | Supplier/buyer entities, product categories, order volumes | Auto-sync via API |
| SR E-Locks | AIVision E-Lock Dashboard, Jointech server | Active lock customers, container routes, usage frequency | Auto-sync via API |
| Manual Upload (Shipra) | Excel, IndiaMART exports, trade directories, Canton Fair leads, KYC forms | New prospects, directory companies, manually verified data | CSV/Excel import + manual entry form — Shipra only |


### 3.2 Deduplication Rules

Primary deduplication key: GSTIN (most reliable unique identifier for Indian companies)

Secondary key: exact or fuzzy match on company name + city + pincode

When a GSTIN match is found, records are merged into a single company profile with all source tags retained

Conflicts flagged for Shipra's manual resolution — she is the sole conflict-resolution owner

Manual uploads always require Shipra's review step before merging with an auto-synced record

4. Company Intelligence — Full Data Model

### 4.1 Core Identity

| Field | Type | Source | Notes |
| :--- | :--- | :--- | :--- |
| Company Name | Text | All sources | Required. Canonical name used across all modules |
| GSTIN | Text (15-char) | Tally / Manual | Primary dedup key. Auto-validated format |
| IEC Code (DGFT) | Text (10-char) | DGFT API / Manual | Importer Exporter Code. Free public lookup. Qualifies as SFPL prospect |
| CIN / PAN | Text | Manual | Optional. Used for MCA/ROC financial verification |
| City | Text | All sources | Required |
| Area / Industrial Zone | Text | Manual | e.g. VKIA, Sitapura, Changodar, GIDC |
| Pincode | Number | Manual | Used for geographic clustering and field visit planning |
| State | Dropdown | Auto from pincode | Gujarat / Rajasthan / Other |


### 4.2 Industry & Manufacturing Profile

| Field | Type | Values / Format | Why It Matters |
| :--- | :--- | :--- | :--- |
| Primary Industry | Dropdown | Automotive / Pharma / Chemical / FMCG / Textile / Engineering / Packaging / Logistics / Food & Bev / Electronics / Other | Drives segment dashboard and MI filters |
| Products Manufactured | Multi-tag | e.g. Injection-moulded parts, API, PVC granules | Identifies crate, transport, customs fit |
| Raw Material Imports | Boolean + text | Yes/No + commodity | Flags customs clearance opportunity |
| Import Commodity Codes | Multi-tag (HS) | HS code tags | Auto-populated from SFPL BOE data if customer |
| Export Activity | Boolean + text | Yes/No + markets | Flags SFPL export opportunity |
| Factory/Warehouse Count | Number | Integer | Indicates logistics complexity |
| No. of Employees (Band) | Dropdown | <50 / 50-200 / 200-500 / 500-2000 / 2000+ | Proxy for company scale |


### 4.3 Regulatory & Compliance Profile (New in v1.1)

These fields are critical for SFPL customs clearance. A company's regulatory licences determine which documents are required and whether SFPL can handle their shipments.

| Field | Type | Notes |
| :--- | :--- | :--- |
| IEC Code (DGFT) | Text | Primary import/export identifier. Free DGFT API lookup. Auto-populates from SFPL BOE if customer. |
| Drug Licence Number | Text | Pharma companies only. Required for API/finished pharma imports via SFPL. |
| FSSAI Licence | Text | Food & Beverage companies. Required for food ingredient imports. |
| DGFT Authorisation Type | Dropdown | None / Advance Licence / EPCG / DFIA / SEIS. For restricted/incentivised goods. |
| Hazmat / ADR Certification | Boolean | Chemical companies. Flags special handling requirement for SRCC transport. |
| GST Filing Status | Dropdown | Regular / Composition / Exempt / Non-filer. Signals financial health. |


### 4.4 Financial Intelligence

| Field | Type | Source | Notes |
| :--- | :--- | :--- | :--- |
| Estimated Annual Turnover | Dropdown (band) | Manual / MCA | <1Cr / 1-10Cr / 10-50Cr / 50-200Cr / 200Cr-1000Cr / 1000Cr+ |
| Data Confidence Tag | Dropdown | Auto / Manual | Verified (MCA/self-declared) / Estimated (team assessment) / Unknown. Shown on all financial fields. |
| Revenue Growth Trend | Dropdown | Manual | Growing fast / Growing steadily / Flat / Declining / Unknown |
| Last 3 Years Trend | Text (3 values) | Manual | e.g. FY23: Rs.42Cr, FY24: Rs.58Cr, FY25: Rs.71Cr |
| Credit Rating / Risk | Dropdown | Manual | Low / Medium / High / Unknown |
| Payment History (with us) | Auto from Tally | TallyPrime Cloud | Avg. days to pay, overdue flags |
| Seasonal Demand Pattern | 4x dropdown | Manual | Q1/Q2/Q3/Q4 demand intensity per service: Low / Medium / High / Peak |
| Best Approach Window | Text | Manual | e.g. Approach Oct-Dec for crates (festive stocking) |


### 4.5 Account Status, Priority Score & Ownership (New in v1.1)

| GREEN — Active Customer | Company currently billed in Tally for at least one Suraj Group service. Auto-assigned when an active invoice exists. Manual override requires CEO approval. |
| :--- | :--- |
| YELLOW — Opportunity | Company assessed as approachable for one or more services. Requires: name + industry + city + one contact with mobile. Account Owner must be assigned within 14 days. |
| RED — Not Suitable | Competitor / financial risk / do-not-approach. Red status requires a mandatory reason code. CEO can override to Yellow with a note. |


### Status Transition Rules (New in v1.1)

The following transitions are enforced by the system — they cannot be changed without meeting the criteria:

New to Yellow: requires company name + industry + city + at least one contact with mobile number. Shipra must assign an Account Owner within 14 days of Yellow status, or the system escalates to CEO dashboard as 'Unassigned Yellow.'

Yellow to Green: auto-triggered when Tally billing sync detects a new active invoice for this company. Manual override by CEO only with a mandatory note.

Yellow to Red: Shipra or CEO must select a reason code from: Competitor / Financial Risk / Policy Conflict / Too Small / Bad Experience / Out of Geography / Duplicate Record. Free text note required.

Green to Yellow: triggered if no invoice activity in Tally for 180+ days. System flags as 'At-risk customer' first for 30 days, then auto-moves to Yellow unless CEO overrides.

Red to Yellow: CEO only. Requires removal of the original reason code and a new note.

### Account Priority Score (New in v1.1)

Auto-calculated score (0-100) for all Yellow accounts. Used to rank companies in the Monthly Report and on the dashboard. Updated daily.

| Component | Max Points | Calculation Logic |
| :--- | :--- | :--- |
| Turnover band | 25 pts | 1000Cr+=25, 200-1000Cr=20, 50-200Cr=15, 10-50Cr=10, 1-10Cr=5, <1Cr=2 |
| Service gaps count | 30 pts | 6 pts per unengaged service (max 5 gaps x 6 = 30) |
| Revenue growth trend | 20 pts | Growing fast=20, Growing steadily=15, Flat=8, Declining=0, Unknown=5 |
| Contact quality | 15 pts | Decision authority contact with mobile+WhatsApp=15, Mobile only=10, Contact exists=5, No contact=0 |
| Interaction recency | 10 pts | Never approached=10, <30 days=5, 30-90 days=8, 90-180 days=3, 180+ days=1 |
| Penalty | Up to -15 | Days since last interaction: 90+ days with no action = -5. Financial risk flag = -10. |


### Account Ownership (New in v1.1)

Every Yellow account must have an Account Owner (a named Suraj Group team member accountable for conversion or qualification)

Current phase: Shipra is the default Account Owner for all Yellow accounts. She is responsible for initiating first contact and logging all interactions.

When access is expanded to the sales team (Phase 3), ownership will be re-assigned by division and geography

If a Yellow account has no owner for 14+ days, it appears on the CEO dashboard as 'Unassigned Priority Yellow' and Shipra is notified

Account Owner receives all alerts (re-engagement, birthday, stale data) for their assigned accounts

5. Contact Intelligence — Full Data Model

### 5.1 Philosophy: People Are Independent Entities

A person can work at multiple companies over their career. Their relationship with Suraj Group follows them, not their employer. A contact record belongs to the person, not to the company — and is linked (many-to-many) to company records with a current/former designation.

### 5.2 Professional Profile

| Field | Type | Values / Format | Notes |
| :--- | :--- | :--- | :--- |
| Full Name | Text | Required | |
| Current Designation | Dropdown + Text | Purchase Manager / Import Manager / Export Manager / Accounts-Finance / Operations Head / CEO-MD / Logistics Manager / Plant Head / Other | Primary role for sales routing |
| Current Company | Lookup | Company in MI database | Live link. Changes when person moves |
| Employment History | Structured list | [Company, Role, From, To, Left on good terms Y/N] | Core tracking feature. Never deleted |
| Decision Authority | Dropdown | Final decision / Recommends / Influences / No authority | For sales routing — who signs the PO |
| Mobile (Primary) | Phone | E.164 format | WhatsApp active flag: Y/N |
| WhatsApp Number | Phone | E.164 format | May differ from mobile. WhatsApp active Y/N flag. Primary B2B communication channel. (New in v1.1) |
| Email (Work) | Email |  | Active / Bounce flag |
| Email (Personal) | Email |  | Critical for tracking when contact changes jobs |
| LinkedIn URL | URL |  | For job change monitoring in Phase 4 |
| No Outreach Flag | Boolean | Y/N | Contact has requested no marketing communication. Respected in all Novusha campaign exports. |


### 5.3 Job Change Tracking

When Shipra or any authorised user updates a contact's Current Company, the system prompts: 'Where have they moved? Do you have new contact details?'

The old company link is retained as [Former — Left: date — Left on good terms: Y/N]

If the new employer is already in MI, the contact is linked and the new company's contact list is updated

If the new employer is not in MI, the system prompts to add it as a new company

A Job Change event is logged in the approach history of both companies

A 'Pending New Employer' status exists for when the contact has left but new employer is unknown — triggers a 30-day follow-up alert for Shipra

### 5.4 Relationship Intelligence Profile (Access: CEO only)

This section captures attributes that help build genuine, personalised relationships. All fields are optional and are visible to the CEO only. Shipra can enter and edit these fields.

| Data Ethics NoteThese fields must only be used for respectful relationship-building. They must never be shared externally, used to discriminate, or accessed by anyone other than the CEO and Shipra. Every access to these fields is logged with a timestamp. |
| :--- |


| Field | Type | Purpose / How To Use |
| :--- | :--- | :--- |
| Age / Date of Birth | Date | Birthday alerts. CEO makes personal birthday call. Helps gauge career stage and decision-making experience. |
| Hometown / Native State | Text | Conversation starter. Important in relationship-based selling in Gujarat/Rajasthan. |
| Religion / Community | Dropdown | Appropriate gift choices, festival greetings, meeting scheduling around observances. |
| Vegetarian / Non-Vegetarian | Dropdown | Critical for lunch/dinner meetings. Flag: Jain / Vegan / Non-veg. |
| Interests & Hobbies | Multi-tag | Cricket / Golf / Chess / Travel / Stock market. Topic-based relationship building. |
| Best Time To Call | Dropdown | Morning (9-11am) / Post-lunch (2-4pm) / Evening (5-7pm) / Avoid evenings. |
| Communication Preference | Multi-select | Phone / WhatsApp / Email / In-person only. |
| Language Preference | Dropdown | Gujarati / Hindi / English / Marwari / Tamil / Other. |
| Personality / Approach Style | Dropdown | Relationship-driven / Data-driven / Price-sensitive / Process-oriented. |
| Known Dislikes / Sensitivities | Text (CEO access only) | Past bad experience, competitor loyalty, topics to avoid. |
| Relationship Quality Score | 1-5 rating | Subjective warmth rating. Drives who should lead the next interaction. |
| Consent Recorded | Boolean | Contact has been informed their data is stored. Must be ticked before personal fields are populated. |


6. Dashboard Design & View Specifications

### 6.1 CEO Dashboard

The CEO dashboard is the primary view for Suraj. It aggregates all MI data into a single command view. Accessible from the AIVision main menu.

Row 1 — Account Summary: Total companies (all status), Green count + %, Yellow count + %, Red count + %, Total contacts

Row 2 — Priority Attention: Top 5 Yellow accounts by Priority Score (auto-ranked). Unassigned Yellows count. At-risk Greens (180+ days no invoice). Re-engagement overdue contacts.

Row 3 — Service Coverage: One card per service. # currently engaged, # opportunity, estimated market size, Suraj Group market share %.

Row 4 — Segment Heatmap: Rows = industry, Columns = service. Each cell shows Green/Yellow count. Clicking opens filtered company list.

Row 5 — Monthly Report Status: Was this month's report generated? When? How many approached? Conversion rate from last month's report.

### 6.2 Shipra's Work Dashboard

Shipra's default view focuses on data quality, pending tasks, and monthly report workflow.

Data quality overview: Record completeness % across all companies. Number of records below 60% completeness. Stale records (180+ days no update).

Task queue: New companies to profile from last IndiaMART import. Contacts with Pending New Employer status. Duplicate contact alerts pending resolution.

Monthly report: Days to next report. Companies selected (preview). Last report stats (sent, approached, converted).

Recent activity feed: all additions and updates logged by source (auto-sync vs. manual entry by Shipra).

7. Competitor Intelligence Sub-Module

### 7.1 Overview

The Competitor Module tracks the capabilities, reach, pricing posture, and vulnerability of key competitors across each of the five Suraj Group service verticals. It runs in parallel to the Customer/Prospect intelligence module.

### 7.2 Competitor Capability Fields by Vertical

| Vertical | Capability Fields to Track |
| :--- | :--- |
| Transport / Logistics | Fleet size (owned vehicles), Fleet composition (trailer/container/FTL/LTL), Key operating lanes, Depot locations, GPS/TMS tech stack, Comparison vs SRCC: smaller/similar/larger, Estimated monthly trips |
| Customs Clearance | Licensed CHA number, Ports of operation, DPD access Y/N, Commodity specialisations, Estimated bill count per month, SFPL comparison gaps/advantages |
| Freight Forwarding | Modes (sea/air/road), NVOCC licence Y/N, Key trade lanes (China/Middle East/Europe), Agent network, FCL/LCL capability |
| Packaging / Crates | Product range and sizes, Manufacturing capacity (units/day), Key customers, Price point vs Paramount, Quality certifications |
| GPS E-Locks | Product brands, Active lock count (estimated), Subscription vs one-time model, Server hosting model, Integration capabilities |


### 7.3 Competitor Update Cadence (New in v1.1)

The competitor module requires a designated owner per vertical and a quarterly update cycle:

| Vertical | Intelligence Owner | Update Cadence |
| :--- | :--- | :--- |
| Transport / Logistics | Mohit / Sreekumar | Quarterly review (30 min). Data entered by Shipra post-discussion. |
| Customs Clearance | Renjith | Quarterly review. Tied to MRM cycle. |
| Freight Forwarding | Renjith / Anurag | Quarterly review. |
| Packaging / Crates | Krishnapal | Quarterly review. Include market pricing update. |
| GPS E-Locks | Puneet | Quarterly review. Include new product launches. |


Records not updated in 90+ days show amber warning. Records not updated in 180+ days show red warning on the competitor dashboard.

Shipra schedules the quarterly competitor review meeting and enters updates post-meeting.

8. Automation & Smart Workflows

### 8.1 Alert System

| Alert Type | Trigger | Action |
| :--- | :--- | :--- |
| Re-engagement Alert | Active customer contact not touched in 90+ days | Push notification to Shipra and CEO. Appears on both dashboards. |
| Unassigned Yellow | Yellow account with no owner for 14+ days | Appears on CEO dashboard as priority item. Shipra auto-assigned if not resolved. |
| Job Change Flag | Contact's Current Company updated | Prompts new employer search. Creates follow-up task for Shipra. Notifies CEO if High-value contact. |
| Birthday Alert | Contact DOB within 7 days | Triggers birthday card workflow via Novusha Media. CEO receives reminder for personal call. |
| Stale Data Warning | Any manual field not updated in 180+ days | Field highlighted amber. Shipra notified weekly for resolution. |
| At-Risk Customer | No Tally invoice activity for 180+ days for Green account | CEO notified. Status flagged 'At-risk' before auto-moving to Yellow. |
| Seasonal Approach Window | Company with seasonal pattern entering its Peak quarter | Shipra notified to prioritise this company in the upcoming monthly report. |
| Priority Upsell | Active customer with 3+ service gaps and turnover >50Cr | Flags on CEO dashboard as priority upsell. Shipra prompted to add to next monthly report. |


### 8.2 Claude AI Call Prep Card (New in v1.1)

Using the existing Claude API integration in AIVision, the system generates an on-demand Account Brief for any company. Triggered by Shipra or the CEO via a 'Prepare Brief' button on the company detail view.

Input: company profile + contact list + service gaps + approach history + industry context + seasonal pattern

Output: 3-line company summary, which contact to approach first and why, recommended opening for first call, one relevant market insight tied to their industry

The brief is saved as a note on the company record with a timestamp

This brief is auto-included in the Monthly Market Intelligence Report for each featured company

### 8.3 Data Quality Leaderboard (New in v1.1)

Since only Shipra does data entry at this stage, the completeness score is a performance metric for her data entry quality, not a competition.

Record Completeness Score per company: % of required fields populated (0-100%)

Dashboard shows: % of all records above 80% completeness, % below 60% completeness (needs attention)

Monthly completeness target for Shipra: 75% of all active Yellow records above 80% completeness

When access is expanded in Phase 3, this becomes a team leaderboard tied to the AIVision Karma/KPI board

### 8.4 Geographic Visit Clustering (New in v1.1)

When Shipra or a future field team member plans a visit to a city, the 'Plan Visit' view groups Yellow accounts by industrial zone (Sitapura, VKIA, Changodar, Hazira, etc.) for efficient scheduling.

Team member selects city + date

System shows all Yellow and re-engagement-due Green accounts in that city, grouped by industrial zone

One-click to select accounts for the day, see estimated drive time between stops

Generates a day itinerary and auto-creates pre-visit call prep cards for each company

Built on Google Maps embed. No GIS complexity required in Phase 2.

9. Monthly Market Intelligence Report

### 9.1 Purpose and Overview

The Monthly Market Intelligence Report is an automatically curated, Shipra-reviewed document that surfaces the top 5 Yellow or high-potential companies per business vertical every month. It is the primary mechanism through which MI intelligence drives active sales activity.

| Core WorkflowShipra generates the report on the last business day of each month. She reviews and adds any manual annotations. The CEO approves it. Shipra then distributes it to the Sales module, where the companies appear as new leads in the 'MI Monthly Focus' pipeline stage. The sales team (currently Shipra) engages these companies and logs all interactions back into the MI module and Sales CRM. The next month's report includes a section on last month's conversion outcomes. |
| :--- |


### 9.2 Vertical Coverage and Company Count

The report covers all 6 Suraj Group service verticals. Each vertical features 5 companies = 30 companies per monthly report.

| Business Vertical | Suraj Group Entity | Focus Opportunity |
| :--- | :--- | :--- |
| Customs Clearance | SFPL | Companies with IEC code, active imports, not yet SFPL customers |
| Freight Forwarding | SFPL | Companies importing from China / Middle East needing door-to-door |
| Transport / Logistics | SRCC | Manufacturers needing Mundra corridor transport; existing customs customers without transport |
| Packaging / Crates (Autorack) | Paramount Propack | Automotive, pharma, FMCG companies buying crates from competitors |
| GPS E-Locks | SR E-Locks | Logistics and transport companies not using E-Locks; existing transport customers without E-Locks |
| RFID / AutoRack Connect | Alluvium IoT Solutions | Automotive manufacturers with large crate pools; warehouse operators |


### 9.3 Company Selection Criteria

The system auto-selects the top 5 companies per vertical based on the following rules applied in order:

Status = Yellow or Approached (never Green — they are already customers; never Red)

Has at least one contact with a mobile number

Priority Score >= 50

Not featured in the Monthly Report for the past 2 months (rotation logic to prevent repetition)

Service gap must match the vertical being populated (e.g. for the Customs Clearance vertical, company must have Customs Clearance in their service gap list)

Seasonal fit check: if a company's seasonal pattern shows Low demand in the current quarter, it is deprioritised in favour of a Peak/High company

Ties broken by Priority Score (highest first). Shipra can manually substitute up to 2 companies per vertical with a note explaining the substitution.

### 9.4 Report Contents Per Company

For each of the 30 companies featured, the report includes the following:

| Report Section | Content |
| :--- | :--- |
| Company Header | Name, industry, city, area, status badge, turnover band, growth trend indicator |
| Service Opportunity | Specific service gap for this vertical. Estimated monthly value of winning this account (Shipra's estimate). |
| Priority Score | Prominently displayed (0-100). Breakdown of score components visible on hover. |
| Key Contact | Name, designation, mobile, WhatsApp flag, best time to call, language preference (if known) |
| AI Account Brief | 3-line brief generated by Claude API: company context, recommended opener, one market insight. Auto-generated or Shipra-written. |
| Recommended Approach | Suggested first step: Call / WhatsApp intro / Email / Visit. Suggested timing based on seasonal pattern. |
| Last Interaction | Date and outcome of last approach log entry for this company (if any). |


### 9.5 Report Format and Distribution

Format: PDF report (auto-generated from AIVision) + in-app view in Sales module

Cover page: month, total companies, breakdown by vertical, last month's conversion summary

Shipra generates the draft on the last business day of the month

CEO reviews and approves (simple 'Approve' button in AIVision) — target turnaround: 24 hours

Upon CEO approval, Shipra distributes to the Sales module — the 30 companies auto-populate as new lead cards in the 'MI Monthly Focus' pipeline stage

A copy is sent to the CEO's AIVision notification centre

### 9.6 Month-End Conversion Summary

Each monthly report begins with a 'Last Month's Outcomes' section showing:

How many of last month's 30 companies were approached (Shipra logs this)

How many converted to a qualified lead in the Sales CRM pipeline

How many converted to a paying customer (Green status)

Total estimated pipeline value created from the report

Which vertical had the highest conversion rate

Any companies that were Red-flagged after approach (reason code)

10. Sales Module Integration

### 10.1 Overview

The MI module and the Sales CRM module share a common data layer. The Monthly Market Intelligence Report is the primary bridge between them: MI identifies who to approach, Sales tracks how the approach went, and the outcome feeds back to update the MI record.

| Key Design PrincipleThe Sales CRM does not replicate company or contact data — it references the MI module records. All company profiles, contact details, and approach history exist once (in MI) and are displayed in both modules. No double-entry. |
| :--- |


### 10.2 Lead Pipeline Flow

When the CEO approves the Monthly Report and Shipra distributes it, the system auto-creates lead cards in the Sales CRM for all 30 featured companies. Each lead card is pre-populated with the MI record data.

| Pipeline Stage | Definition |
| :--- | :--- |
| MI Monthly Focus | Auto-created from monthly report. Company has been identified as a priority. No contact yet. |
| Approached | First contact made (call, WhatsApp, email, visit). Interaction logged. No commitment yet. |
| Engaged | Company has responded positively. Follow-up scheduled or meeting arranged. |
| Meeting / Demo Scheduled | A specific meeting, site visit, or product demo has been agreed. |
| Proposal Sent | A formal quotation or service proposal has been sent to the company. |
| Negotiation | Company is reviewing the proposal. Price or terms discussion underway. |
| Converted — Won | Service agreement signed or first invoice raised. MI status auto-changes to Green. |
| Closed — Lost | Company declined. MI status updated per reason code. May remain Yellow for future. |


### 10.3 Lead Card Contents

Each lead card in the Sales CRM Kanban contains:

Company name, industry, city, MI status badge (Yellow), Priority Score

Service being targeted (the gap identified in the MI monthly report)

Key contact name + mobile + WhatsApp flag

Account Brief (Claude AI generated, if available)

Last approach date and outcome (from MI approach log)

Quick actions: Call / WhatsApp / Log Interaction / Move Stage

### 10.4 Interaction Logging and Feedback Loop

Every interaction logged in the Sales CRM is simultaneously written to the MI approach log. There is one log, two views.

When Shipra logs a call in the Sales CRM: date, method (call/WhatsApp/email/visit), outcome (OUTCOMES list), next action, notes

This entry appears immediately in the company's MI profile under the Approach Log tab

If the outcome is 'Converted — Won': MI status auto-changes Yellow to Green. Tally billing sync is awaited for confirmation.

If the outcome is 'Closed — Lost': a reason code is required. MI status stays Yellow unless CEO marks it Red with justification.

If no interaction is logged within 30 days of a lead card being created in MI Monthly Focus stage, Shipra receives a re-engagement alert

### 10.5 Monthly Conversion Tracking

The Sales module generates a monthly MI Conversion Report showing:

| Metric | Notes |
| :--- | :--- |
| Companies featured in report | Total = 30 (5 per vertical) |
| Companies approached | Count + % of 30. Logged by Shipra in Sales CRM. |
| Qualified leads generated | Moved to Engaged stage or beyond |
| Proposals sent | Moved to Proposal Sent stage |
| Converted to customer | Moved to Converted Won. MI status = Green. Invoice in Tally. |
| Conversion rate | Converted / Featured x 100% |
| Pipeline value created | Sum of estimated deal values for all leads Engaged or beyond |
| Best performing vertical | Vertical with highest conversion rate this month |
| Companies Red-flagged | Companies moved to Red after approach, with reason codes |


This report is shared with the CEO on the 5th of the following month. It feeds into the MRM Commercial HoD scorecard.

11. Gap Analysis & Resolutions (SWOT Findings — v1.1)

The following 16 gaps were identified through a structured SWOT analysis of the v1.0 PRD. Each gap has been addressed in v1.1 as detailed below. Gaps are categorised by priority.

### 11.1 Priority 1 — Critical (addressed before Phase 1 build)

| Gap 1: No Account Priority Score  [Critical]500+ Yellow accounts with no ranking logic. Team defaults to calling whoever they already know.Recommendation: Implemented in Section 4.5: auto-calculated Priority Score (0-100) using weighted formula: Turnover band (25 pts) + Service gaps count (30 pts) + Revenue growth (20 pts) + Contact quality (15 pts) + Interaction recency (10 pts) - penalties. Updated daily. Top-ranked Yellows appear prominently on CEO and Shipra dashboards. |
| :--- |


| Gap 2: No Account Ownership Model  [Critical]No team member was responsible for any Yellow. Alerts fired but nobody acted.Recommendation: Implemented in Section 4.5: every Yellow must have an Account Owner within 14 days. Current phase: Shipra is the default owner. Unassigned Yellows escalate to CEO dashboard after 14 days. When access is expanded to the sales team in Phase 3, ownership re-assigned by division and geography. |
| :--- |


| Gap 3: Personal Data Governance Vague  [Critical]One sentence on PDPA compliance. No audit trail, no deletion policy, no consent mechanism.Recommendation: Implemented in Section 5.4: access log on all personal field views (user + timestamp). Data deletion capability for CEO and Shipra. Consent recorded flag required before personal fields are populated. 2-year retention policy for inactive contacts. UI labels 'Relationship Intelligence' not 'Personal Profile.' |
| :--- |


| Gap 4: Status Transition Criteria Undefined  [Critical]Two team members marking the same company differently. Green/Yellow/Red became opinion-based.Recommendation: Implemented in Section 4.5: explicit enforced transition rules. Yellow to Green: auto-triggered by Tally billing sync (manual CEO override only). Yellow to Red: mandatory reason code from defined list. New to Yellow: minimum data requirements enforced. Green to Yellow: auto-triggered at 180 days no invoice activity. |
| :--- |


### 11.2 Priority 2 — High (addressed in Phase 2 or Phase 3)

| Gap 5: WhatsApp Entirely Absent  [High]Primary B2B communication channel in Gujarat/Rajasthan not captured anywhere in the PRD.Recommendation: Implemented in Section 5.2: WhatsApp number as a distinct contact field (separate from mobile) with active/inactive flag. 'WhatsApp message' added as an interaction type in the approach log. Phase 3 stretch: WhatsApp Business API to auto-log outbound messages from the company's official number. |
| :--- |


| Gap 6: No Next Best Action Intelligence  [High]Module showed gaps but gave no guidance on what to do about them.Recommendation: Implemented in Section 8.2: Claude AI Call Prep Card. On-demand brief generated per company using existing AIVision Claude API integration. Input: full company profile. Output: 3-line company summary, recommended first contact, suggested opener, market insight. Auto-included in Monthly MI Report for all 30 featured companies. |
| :--- |


| Gap 7: No Data Quality Mechanism  [High]No way to measure whether records were being populated correctly. Garbage-in went undetected.Recommendation: Implemented in Section 8.3: Record Completeness Score (0-100%) per company. Dashboard shows % above 80% and % below 60%. Monthly target for Shipra: 75% of Yellow records above 80% completeness. In Phase 3, becomes a team leaderboard in the AIVision Karma board. |
| :--- |


| Gap 8: Missing Regulatory / Compliance Fields  [High]No fields for Drug Licence, IEC code, FSSAI, DGFT. Critical for SFPL customs clearance customers.Recommendation: Implemented in Section 4.3: full Regulatory Profile section added — IEC code (DGFT free API), Drug Licence, FSSAI, DGFT Authorisation type, Hazmat certification, GST Filing Status. IEC code is particularly valuable: DGFT public database enables prospecting for all importers in a pincode. |
| :--- |


| Gap 9: No Geographic Visit Clustering  [Medium]Field visits were ad hoc. No view to group Yellow accounts by industrial zone for efficient day planning.Recommendation: Implemented in Section 8.4: 'Plan Visit' view. Select city + date, see all Yellow and re-engagement-due accounts grouped by industrial zone. One-click day itinerary with drive time estimates and pre-visit call prep cards per company. Built on Google Maps embed in Phase 2. |
| :--- |


| Gap 10: No Seasonal Demand Intelligence  [Medium]No visibility into when companies peak in demand. Team approached companies at the wrong time of year.Recommendation: Implemented in Section 4.4: Seasonal Demand Pattern field (Q1/Q2/Q3/Q4: Low/Medium/High/Peak per service). Best Approach Window text field. Seasonal fit check in Monthly Report selection criteria. Alerts fire when a company enters its Peak quarter. |
| :--- |


### 11.3 Priority 3 — Medium (Phase 3 or Phase 4 enhancements)

| Gap 11: No Novusha Campaign Export  [Medium]No structured pipeline from MI data to Novusha Media outreach campaigns.Recommendation: Phase 3: Campaign Export feature. Shipra selects filters (industry + city + status + service gap), previews the resulting list, adds personalisation fields, and exports to CSV or directly to Novusha Media module as a campaign brief. Includes No Outreach flag respect and opt-out tracking. |
| :--- |


| Gap 12: Competitor Module No Update Owner  [Medium]Competitor data would go stale within 90 days without a forcing function.Recommendation: Implemented in Section 7.3: vertical-specific intelligence owners assigned (Mohit for Transport, Renjith for Customs, etc.). Quarterly review cadence tied to MRM cycle. Shipra enters updates post-discussion. Amber/Red warnings for records not updated in 90/180 days. |
| :--- |


| Gap 13: Financial Data No Validation Layer  [Medium]Team estimates of turnover could vary wildly. Market size calculations unreliable.Recommendation: Implemented in Section 4.4: Data Confidence Tag on all financial fields (Verified / Estimated / Unknown). Market size cards on dashboard show confidence intervals. Phase 4: MCA API pull for automatic Verified override where CIN/PAN exists. CIBIL Commercial integration for credit risk scoring. |
| :--- |


| Gap 14: No Duplicate Contact Detection  [Low]Two team members could add the same person with different spellings, creating ghost contacts.Recommendation: Phase 2: on contact creation, system runs fuzzy match on name + mobile number. Similarity >80% triggers a warning: 'A contact with a similar name and mobile already exists. Is this the same person?' Mobile number treated as a soft unique key with manual merge option for Shipra. |
| :--- |


| Gap 15: No IEC Prospecting Pipeline  [Low]DGFT public database of all Indian importers/exporters was not mentioned despite being free government data.Recommendation: Implemented in Section 4.3: IEC code as first-class field with DGFT API lookup. Phase 4: query DGFT database for all IEC holders in Gujarat whose commodity codes overlap with SFPL's specialisation — generates a qualified prospect list auto-populating MI as Yellow with source = DGFT IEC Registry. |
| :--- |


| Gap 16: No Mobile-First Design Specification  [Low]Field team (Krishnapal, Anurag) on phones. Multi-tab desktop views unusable in the field.Recommendation: Phase 1 minimum mobile view specified: search by name (autocomplete), see status + contacts + last interaction in 3 lines. One-tap 'Log interaction' with voice-to-text for notes. One-tap 'Add contact' from phone contacts. One-tap status update. Full data entry stays desktop. Mobile = capture speed; Desktop = deep research. |
| :--- |


12. Access Control

### 12.1 Current Phase — CEO + Shipra Only

| Current Access PolicyAs of this version (v1.1), the MI Module is accessible to exactly two users: (1) Suraj Aranamkatte Rajan (CEO and MD) and (2) Shipra (Outreach Team Lead and Data Steward). No other user has access to any part of this module. This will be reviewed and expanded at the CEO's discretion. |
| :--- |


| User | Access Level | Scope |
| :--- | :--- | :--- |
| Suraj (CEO / MD) | Full read. Write for status updates and notes only. | All company profiles, all contacts including Relationship Intelligence fields, Competitor module, all dashboards, Monthly Report view and approval, audit logs. |
| Shipra (Data Steward) | Full read + write. | All company and contact data entry. Approach log entries. Monthly Report generation and distribution. Competitor data entry. Campaign export. Duplicate resolution. Data quality management. Cannot delete records — only archive (CEO approval for deletion). |


### 12.2 Future Access Tiers (Phase 3 — subject to CEO decision)

| Role | Access Level | Restrictions |
| :--- | :--- | :--- |
| Division Head (Mohit, Renjith, Ajith) | Full read + edit for own division's data. | Can view Relationship Intelligence for their accounts. No access to other divisions' competitor vulnerability data. |
| Senior Sales / BDM | Read + edit company and contact professional profiles only. | No Relationship Intelligence fields (religion, dislikes). Can log approaches. Cannot delete or Red-flag. |
| Field Team / Executive | Read company and contact professional profiles only. | No personal intelligence fields. Can add contacts and log interactions. |
| Finance / Accounts (Chirag) | Read-only for financial fields and payment history only. | No contact profiles, no approach log, no personal data. |
| Tech / Admin (Puneet / Uday) | System admin. | Can configure fields and integrations. Cannot edit contact personal data. |


13. Integration Specifications

### 13.1 AIVision Internal Modules

Sales CRM Module: approach log is a shared data layer. Every interaction logged in MI is accessible in Sales CRM. CRM lead cards reference MI company and contact records. No double-entry. See Section 10 for full integration spec.

KYC / Onboarding Module: when a prospect converts to Green, MI record auto-links to the KYC record. GSTIN and identity fields are shared.

AIVision Pulse TV: MI summary widget (Green/Yellow/Red counts, top opportunities, monthly report conversion rate) available as a Pulse TV card.

MRM Module: MI dashboard data (market coverage %, service gaps by segment, monthly report conversion rate) feeds into the Monthly Review scorecard for the Commercial HoD.

Novusha Media Module: Shipra exports targeted company + contact lists from MI for outreach campaigns. Phase 3 implementation.

### 13.2 External Data Sources (by Phase)

| Phase | Integration | Data Source | Use Case |
| :--- | :--- | :--- | :--- |
| Phase 1 | TallyPrime Cloud (billing + payment) | SFPL/SRCC/Rabs Tally | Green status trigger, payment history |
| Phase 2 | SRCC Route Master GPS | AIVision GPS module | Trip frequency by customer |
| Phase 2 | Jointech E-Lock server | SR E-Locks platform | Active lock assignments |
| Phase 2 | GST Portal API | Government | GSTIN auto-populate company name + address |
| Phase 3 | DGFT IEC Registry API | Government (free) | IEC lookup + Gujarat importer prospecting list |
| Phase 3 | Claude API | Anthropic (existing) | Call Prep Card + Monthly Report AI briefs |
| Phase 4 | MCA / ROC API | Government | Financial data verification (turnover) |
| Phase 4 | LinkedIn API | LinkedIn | Automated job change detection for contacts |
| Phase 4 | CIBIL Commercial | Credit bureau | Credit risk scoring for financial intelligence |


14. Revised Build Phases

| Phase | Timeline | Scope | Outcome |
| :--- | :--- | :--- | :--- |
| Phase 0 | June 2026 (2 weeks) | Data model design with all v1.1 updates, schema definition, access control setup (CEO + Shipra only), UI wireframes sign-off, mobile quick-entry spec design | Design locked and approved by Suraj |
| Phase 1 | July 2026 (4 weeks) | Company CRUD, Contact CRUD with job history and WhatsApp field, Regulatory profile fields, Priority Score calculation, Account Ownership model, Status transition rule enforcement, Approach log, Monthly Report generation (manual for now), Sales CRM basic lead card creation, Mobile quick-entry view, CEO + Shipra access only | Core module live. Manual data entry by Shipra functional. First monthly report can be generated. |
| Phase 2 | August 2026 (4 weeks) | TallyPrime sync (Green status auto-trigger), SRCC GPS sync, E-Lock sync, GST Portal GSTIN lookup, Full CEO + Shipra dashboards, Priority Score automation, Alert system, Duplicate contact detection, Geographic visit clustering (Google Maps), Seasonal demand fields, Competitor update cadence and warnings, Data completeness score | Full data federation live. Dashboards meaningful. Monthly report automated and enriched with live data. |
| Phase 3 | September 2026 (3 weeks) | Claude API Call Prep Card, DGFT IEC code lookup, Monthly Report AI briefs, Novusha Media campaign export, Personal intelligence fields with audit log, Birthday alert workflow, MRM integration, Pulse TV card, Sales CRM full Kanban pipeline and conversion tracking, Phase 3 access expansion to division heads | Complete MI Module. Full sales loop closed. Monthly report fully automated. |
| Phase 4 | Q4 2026 | MCA/ROC API financial verification, LinkedIn job change monitoring, CIBIL Commercial credit scoring, Business card OCR, WhatsApp Business API, Full team access expansion per v1.1 access tiers | Full automation. Minimum manual data entry. Complete intelligence loop. |


15. Open Questions for Sign-Off

DGFT IEC API access: confirm budget and timeline for DGFT API subscription. Free public portal data may need to be scraped vs. paid API access. Renjith to confirm.

Monthly Report frequency: confirm last business day of the month as the generation date. Should the CEO receive a draft 2 days before for pre-review, or is same-day approval acceptable?

Sales CRM ownership: when the Monthly Report creates lead cards, Shipra is the default assignee. When the team is expanded in Phase 3, who decides lead assignment by vertical?

Competitor intelligence data sources: beyond team knowledge, should Shipra subscribe to any trade publications, tender portals, or industry databases for competitor monitoring? Budget?

MCA API: confirm whether CIN / PAN will be collected for all companies or only for the top 50 priority accounts. This affects Phase 4 scope.

WhatsApp Business API: confirm whether the existing company WhatsApp number is a Business API-enabled number or a standard account. If standard, API integration is not possible and Phase 4 WhatsApp automation is limited to logging only.

16. Glossary

| Term | Definition |
| :--- | :--- |
| MI Module | Market Intelligence Module — this document's subject |
| Priority Score | Auto-calculated 0-100 score ranking Yellow accounts by conversion potential |
| Account Owner | Named team member accountable for converting or qualifying a Yellow account. Currently: Shipra. |
| Monthly MI Report | Auto-generated monthly report of top 5 Yellow companies per vertical, reviewed by Shipra, approved by CEO, distributed to Sales module |
| Data Steward | Shipra — sole person responsible for all data entry, quality, and monthly report generation |
| Record Completeness Score | % of required fields populated for a company record (0-100%) |
| Relationship Intelligence | The personal profile section of a contact record (age, religion, habits, etc.) visible to CEO only |
| IEC Code | Importer Exporter Code — DGFT-issued identifier for all Indian importers/exporters. Free public lookup. |
| Call Prep Card | Claude AI-generated 3-line brief for a company: context, recommended opener, market insight |
| Green Account | Company currently billing with at least one Suraj Group division. Auto-confirmed by Tally sync. |
| Yellow Account | Identified opportunity account. Has Account Owner (Shipra currently). Priority Score >= 50 to appear in Monthly Report. |
| Red Account | Not suitable. Requires mandatory reason code. CEO can override. |
| MI Monthly Focus | First stage in Sales CRM pipeline for companies featured in the Monthly MI Report |
| Seasonal Pattern | Q1-Q4 demand intensity per service for a company. Used in Monthly Report selection criteria. |
| DPD | Direct Port Delivery — SFPL's key differentiator on the Mundra corridor |
| MRM | Monthly Review Meeting — the group-level management reporting cycle within AIVision |


17. Sign-Off

| Name | Role | Approval Date |
| :--- | :--- | :--- |
| Suraj Aranamkatte Rajan | Managing Director & CEO, Suraj Group | |
| Shipra | Outreach Team Lead & MI Data Steward | |
| Puneet | AIVision Product Lead | |
| Uday | Tech Lead, Alluvium IoT Solutions | |


This is version 1.1. All amendments must be approved by the MD before implementation begins. The module remains restricted to CEO and Shipra access until Phase 3 expansion.
