# Marketing Intelligence & EXIM System — Brain Knowledge Store

> **Purpose**: This `brain/` directory contains loss-less, authoritative Brain Reference Files (`_Brain.md`) created for the core PRD and database schema documents in this repository. Any AI agent or developer seeking full, zero-hallucination context regarding the Market Intelligence PRD or the EXIM database schemas should consult the brain files in this directory.

---

## 🧠 Brain Files Directory Index

| Brain Reference File | Target Source Document | Domain / Scope | Summary & Key Topics Covered |
| :--- | :--- | :--- | :--- |
| **[AIVision_MarketIntelligence_PRD_Brain.md](file:///home/aiserver/marketing_intelli/brain/AIVision_MarketIntelligence_PRD_Brain.md)** | `AIVision_MarketIntelligence_PRD_v1.1 (1).docx` | Market Intelligence Module PRD (v1.1) | Complete 17-section PRD codification: data federation architecture (6 sources, GSTIN dedup), core company & contact schemas, regulatory profile (DGFT IEC, Drug Licence, FSSAI), 5-factor Priority Score formula, CEO & Shipra dashboards, competitor tracking, Monthly Report algorithm (30 companies/mo), Sales CRM integration, 16 gap resolutions, access matrices, and build phases (0-4). |
| **[EximTransport_DB_Schema_Brain.md](file:///home/aiserver/marketing_intelli/brain/EximTransport_DB_Schema_Brain.md)** | `EximTransport_DB_Schema.md` | MongoDB Schema (103 Collections) | Complete Mongoose model mapping across 11 modules: core models (`User`, `Attendance`, `AuditLog`), transport (`PrData`, `Tr`, `EwayBill`, `DriverDetails`, `Vehicles`), directories (`Organisation`, `Elock`, `ShippingLine`), maintenance, cash registers, and vendor management. |
| **[EXPORT_DATABASE_SCHEMA_Brain.md](file:///home/aiserver/marketing_intelli/brain/EXPORT_DATABASE_SCHEMA_Brain.md)** | `EXPORT_DATABASE_SCHEMA.md` | Local `export` MongoDB Database (51 Collections) | Comprehensive schema reference for 25,737 export consignment jobs (`exportjobs`), 48,985 audit trail entries (`exportaudittrails`), tariff headings (`cths` - 24k docs), foreign ports (`fpods` - 33k docs), and DGFT incentive rate tables (`rodtep`, `drawbacks`, `rosctl`, `licenses`). |
| **[EXIM_Database_Reference_Brain.md](file:///home/aiserver/marketing_intelli/brain/EXIM_Database_Reference_Brain.md)** | `EXIM_Database_Reference.md` | Domain Architecture & Business Logic | System architecture diagram, consignment state machine (`ETA Pending` $\rightarrow$ `OOC` $\rightarrow$ `DO` $\rightarrow$ `Billed`), CRM pipeline (14 collections), customer KYC (`customerkycsimp`), dual billing ledgers (GIA vs GIR), HR attendance engine, EXIM domain glossaries, and marketing analytics use cases. |

---

## 📌 Usage Instructions for AI Agents & LLMs

1. **Zero-Hallucination Rule**: Always retrieve context from the specific `_Brain.md` file in this `brain/` folder before answering queries about business rules, database schema fields, API triggers, status transition rules, or PRD requirements.
2. **Data Federation & Deduplication**: Refer to Section 3 of `AIVision_MarketIntelligence_PRD_Brain.md` for GSTIN deduplication rules and data source mappings.
3. **Database Schema Queries**:
   - For Transport/E-way bill/Fleet schema fields: Consult `EximTransport_DB_Schema_Brain.md`.
   - For Export Jobs/FOB/Shipping Bill/Customs Tariff schema fields: Consult `EXPORT_DATABASE_SCHEMA_Brain.md`.
   - For Domain workflows, CRM pipelines, KYC, or EXIM terminology: Consult `EXIM_Database_Reference_Brain.md`.
