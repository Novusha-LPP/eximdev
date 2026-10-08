# Phase 1: Technical Design — Sales Tactic Tagging

**Document:** `docs/tactics/DESIGN.md`  
**Status:** Pending Gate 1 Human Approval  
**Base Architecture:** Express 4 ESM + Mongoose 6 + React 18 / Ant Design  
**Feature Flag:** `SALES_TACTICS_ENABLED` in `server/config/featureFlags.mjs`

---

## 1. Schema & Data Model (Mongoose ESM)

All additions are strictly additive, non-destructive, and backward compatible.

### 1.1 Model: `Tactic` (`server/model/crm/Tactic.mjs`)
Reference collection for the 30 tactics (T01–T30) specified in the Playbook.
```javascript
import mongoose from 'mongoose';

const tacticSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true, // 'T01' ... 'T30'
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true // e.g. 'Problem-Solution Chain'
  },
  stage: {
    type: String,
    required: true,
    enum: ['Foundations', 'Attraction', 'Upsell', 'Downsell', 'Continuity', 'Optimisation'],
    index: true
  },
  sort_order: {
    type: Number,
    required: true,
    default: 1
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  }
}, { timestamps: true });

export default mongoose.model('Tactic', tacticSchema, 'crm_tactics');
```

### 1.2 Model: `TacticLineFit` (`server/model/crm/TacticLineFit.mjs`)
Records the Playbook star ratings (★ fit) per tactic and business line for UI suggestions and comparative reporting.
```javascript
import mongoose from 'mongoose';

const tacticLineFitSchema = new mongoose.Schema({
  tactic_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tactic',
    required: true,
    index: true
  },
  tactic_code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  business_line: {
    type: String,
    required: true,
    enum: ['FF', 'CC', 'DG', 'EL', 'CR', 'AM', 'CT', 'SW', 'MB'],
    index: true
  },
  is_starred: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

tacticLineFitSchema.index({ tactic_id: 1, business_line: 1 }, { unique: true });

export default mongoose.model('TacticLineFit', tacticLineFitSchema, 'crm_tactic_line_fits');
```

### 1.3 Model: `Partner` (`server/model/crm/Partner.mjs`)
Stores strategic affiliates, CFS operators, and industry partners for T29.
```javascript
import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  partner_type: {
    type: String,
    required: true,
    enum: [
      'CFS',
      'Automotive tape brand',
      'Labour contractor',
      'Security contractor',
      'Palletisation supplier',
      'Wooden pallet supplier',
      'Fumigation supplier',
      'Insurance dealer',
      'CA',
      'ERP reseller',
      'Industry association',
      'Other'
    ],
    index: true
  },
  office: {
    type: String,
    enum: ['Gandhidham', 'Hazira', 'Cochin', 'Ahmedabad', 'Baroda', 'Rajkot', 'Jaipur', 'All', null],
    default: null,
    index: true
  },
  contact_person: { type: String, trim: true },
  contact_phone: { type: String, trim: true },
  contact_email: { type: String, trim: true, lowercase: true },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

export default mongoose.model('CrmPartner', partnerSchema, 'crm_partners');
```

### 1.4 Model: `DealTactic` (`server/model/crm/DealTactic.mjs`)
The relational link between Deal (Opportunity) and Tactic. Implements immutability (R2) and captures outcome at close (R3, R4).
```javascript
import mongoose from 'mongoose';

const dealTacticSchema = new mongoose.Schema({
  deal_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opportunity',
    required: true,
    index: true
  },
  tactic_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tactic',
    required: true,
    index: true
  },
  tactic_code: {
    type: String,
    required: true,
    uppercase: true
  },
  added_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  added_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  deal_status_when_added: {
    type: String,
    required: true // e.g. 'lead', 'opportunity', 'proposal'
  },
  result: {
    type: String,
    enum: ['worked', 'did_not_work', 'not_used', null],
    default: null,
    index: true
  },
  result_note: {
    type: String,
    trim: true,
    default: null
  },
  result_set_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  result_set_at: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Prevent duplicate assignment of the same tactic to the same deal
dealTacticSchema.index({ deal_id: 1, tactic_id: 1 }, { unique: true });
// Compound index for high-performance reporting queries
dealTacticSchema.index({ tactic_id: 1, result: 1 });

export default mongoose.model('DealTactic', dealTacticSchema, 'crm_deal_tactics');
```

### 1.5 Additive Schema Fields on `Opportunity.mjs`
Added to `server/model/crm/Opportunity.mjs` (all nullable or defaulted):
```javascript
// Additive fields for Sales Tactics Playbook
businessLine: {
  type: String,
  enum: ['FF', 'CC', 'DG', 'EL', 'CR', 'AM', 'CT', 'SW', 'MB', null],
  default: null,
  index: true
},
partner_source_id: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'CrmPartner',
  default: null,
  index: true
},
discountPercent: {
  type: Number,
  default: 0,
  min: 0,
  max: 100
},
discountAmount: {
  type: Number,
  default: 0,
  min: 0
},
tactics_legacy: {
  type: Boolean,
  default: false,
  index: true
}
```

---

## 2. Shared Domain Validation Service (`server/services/crm/tacticValidationService.mjs`)

A single source of truth for tactic business rules, called by:
- Deal create (`POST /api/crm/opportunities`)
- Deal update (`PUT /api/crm/opportunities/:id`)
- Quick stage change (`PATCH /api/crm/opportunities/:id/stage`)
- Close endpoint (`PATCH /api/crm/opportunities/:id/close`)
- Lead conversion (`POST /api/crm/leads/:id/convert`)
- Quote conversion (`POST /api/crm/quotes/:id/convert-to-opportunity`)
- Deal duplication (`POST /api/crm/opportunities/:id/duplicate`)

### Validation Rules Matrix:
1. **Rule R1 (Mandatory on Create)**:
   - When `isFeatureEnabled('SALES_TACTICS_ENABLED')` is `true`:
   - Any new deal creation must include `tactic_ids` with `length >= 1`.
   - If missing or empty: returns `400 Bad Request` ("At least one sales tactic must be selected.").
2. **Rule R2 (Immutable History)**:
   - No `DELETE` endpoint will be registered for `deal_tactics`.
   - Adding tactics via `POST /api/crm/opportunities/:id/tactics` is idempotent (uses `updateOne({ deal_id, tactic_id }, { $setOnInsert: ... }, { upsert: true })`).
3. **Rule R3 & R4 (Results & Notes on Close)**:
   - When deal stage transitions to `won` or `lost`:
   - If deal is marked `tactics_legacy === true` and has 0 tactics, closing is rejected with: "Please assign at least one sales tactic and record the tactic results before closing this deal."
   - Every `DealTactic` attached to the deal must have `result` in `['worked', 'did_not_work', 'not_used']` and a non-empty `result_note`.
   - Any missing result or note blocks transition with HTTP `400` specifying which tactics lack results.
4. **Rule R5 (T29 Strategic Affiliates Conditional)**:
   - If `T29` is present among the deal's tactics, `partner_source_id` is mandatory.
   - If `T29` is not present, `partner_source_id` must be null.
5. **Reopening Deals**:
   - Reopening a deal from Won/Lost to an open stage preserves all existing `DealTactic` records and notes.
6. **Adding Tactic to Closed Deals**:
   - Permitted only if the request supplies `result` and `result_note` at the time of addition.

---

## 3. API Specification

All routes mounted under `server/routes/crm/crmRoutes.mjs` (accessible via `/api/crm` and `/crm`).

| Method | Endpoint | Description | Auth / Role |
|---|---|---|---|
| `GET` | `/api/crm/tactics` | Get list of all 30 tactics, grouped by stage. Supports query `?business_line=FF` to include star recommendations. | Authenticated |
| `GET` | `/api/crm/partners` | Get active partners. Query filters: `?type=CFS&office=Gandhidham`. | Authenticated |
| `POST` | `/api/crm/partners` | Create a new partner. | Manager / Admin / Sales Head |
| `GET` | `/api/crm/opportunities/:id/tactics` | Get all tactics attached to a deal with results, notes, and who added them. | Authenticated |
| `POST` | `/api/crm/opportunities/:id/tactics` | Add one or more tactics to a deal. Idempotent. | Authenticated |
| `PUT` | `/api/crm/opportunities/:id/tactics/results` | Save tactic results and notes (mandatory when closing). | Authenticated |
| `GET` | `/api/crm/reports/tactics` | Tactic analytics report. Query params: `view` (`by_tactic`, `by_line`, `by_salesperson`, `matrix`), `tactic_id`, `business_line`, `salesperson_id`, `date_from`, `date_to`, `format` (`json` or `csv`). | All Salespeople + Sales Heads |

---

## 4. Tactic Report Metrics & Formulas

The report aggregates data across non-legacy deals:

| Metric | Definition & Formula | Note |
|---|---|---|
| **Deals Tagged** | Count of distinct non-legacy deals where the tactic was applied. | A deal with 3 tactics counts once under each tactic. |
| **Won Deals** | Count of tagged deals where `stage === 'won'`. | |
| **Lost Deals** | Count of tagged deals where `stage === 'lost'`. | |
| **Win Rate (%)** | `(Won Deals / (Won Deals + Lost Deals)) * 100` | Excludes deals where this tactic's result is `not_used`. |
| **Worked Rate (%)** | `(Count(result == 'worked') / (Count(result == 'worked') + Count(result == 'did_not_work'))) * 100` | Shows effectiveness when actively used. |
| **Average Deal Value** | `Sum(deal.value) / Won Deals` | Shown for won deals. |
| **Average Discount Given** | `Sum(deal.discountPercent) / Count(tagged deals)` | And total discount value. |
| **Small-Sample Warning** | Highlighted badge if deal count `< 5` | Prevents over-reading thin monthly data. |

---

## 5. UI Architecture

1. **Deal Create Form** (in Kanban / Lead Conversion / Opportunity modals):
   - Multi-select dropdown `Tactics Used *` showing `T01 Money Model`, `T12 Decoy`, etc. grouped by Playbook stage.
   - Recommended tactics for the selected `Business Line` are badged with a gold star (★ *Suggested for line*).
   - Conditional `Partner Source *` dropdown appears dynamically when `T29` is selected.
2. **Deal Detail View** (`OpportunityDetailModal.jsx`):
   - Read-only audit list of previously added tactics (showing author and timestamp).
   - "Add Tactic" dropdown to append new tactics mid-deal.
   - **No remove / delete icon or action exists**.
3. **Close Deal Modal** (`CloseDealTacticModal.jsx`):
   - Triggered on drag-and-drop to Won/Lost in Kanban or when changing stage in detail modal.
   - Renders a table with one row per attached tactic:
     - Tactic code & name.
     - Result toggle: `Worked` (Green), `Did not work` (Red), `Not used` (Gray).
     - Result note text input: "One-line reason why...".
   - Submit button is disabled until all rows are completed.
4. **Tactic Report Dashboard** (New tab in `CRMReportsDashboard.jsx` or sub-view):
   - 4 Views:
     1. **By Tactic**: Table with Deals Tagged, Won, Lost, Win Rate, Worked Rate, Avg Value, Discount.
     2. **By Business Line**: Breakdown by the 9 business lines.
     3. **By Salesperson**: Coaching breakdown by rep.
     4. **Tactic x Line Matrix**: Interactive 30x9 heat-map grid showing win rates and deal volumes.
   - 4 Filters: Tactic multi-select, Business line dropdown, Salesperson dropdown, Month/Date Range picker.
   - One-click CSV Export button matching screen data.

---

## 6. Migration & Legacy Data Strategy

1. **Step 1 Migration (`server/migrations/createSalesTacticsCollections.mjs`)**:
   - Creates indexes on `crm_tactics`, `crm_tactic_line_fits`, `crm_partners`, `crm_deal_tactics`.
   - Seeds 30 tactics (T01–T30) matching Playbook names and stages.
   - Seeds `tactic_line_fits` from Playbook star ratings.
   - Seeds initial partner types and 7 regional offices.
2. **Step 2 Migration (`server/migrations/flagLegacyDeals.mjs`)**:
   - Sets `tactics_legacy: true` on all existing 311 deals (`opportunities`).
   - Ensures zero breaking changes to existing production data.
3. **Feature Flag Deployment**:
   - `SALES_TACTICS_ENABLED=true` in `server/.env`.
   - Can be turned off instantly without schema or data loss.
