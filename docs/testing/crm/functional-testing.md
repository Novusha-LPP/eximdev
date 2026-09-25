# Customer Relationship Management (CRM) - Functional Testing

## Module Coverage Breakdown
This test suite covers functional testing across all 4 sub-modules of Customer Relationship Management (CRM):
1. **Lead & Inquiry Management**
2. **Customer Interaction History**
3. **Quotation & Proposal Tracking**
4. **CRM Pipeline & Conversion Analytics**

---

## Sub-Module Section & Bug Templates

### 1. Lead & Inquiry Management
<!-- Log bugs related to Lead & Inquiry Management -->

#### CRM-BUG-001: Duplicate and Inconsistent Location Entries in CRM Filter Autocomplete
- **Issue Type:** Bug / Defect
- **Component / Sub-Module:** Lead & Inquiry Management / CRM Kanban & Grid Filters
- **Severity:** High (Data Fragmentation & Filtering Inaccuracy)
- **Priority:** High
- **Status:** Resolved
- **Environment:** Staging / Production (`client` SPA + `server` CRM APIs)
- **Summary:** Searching for a single port/location (e.g., "Mundra", "Nhava Sheva") returns multiple fragmented and unstandardized location entries in the filter dropdown.
- **Description:** 
  When typing a location name in the CRM Location filter (e.g., `mu` or `mundra`), the autocomplete dropdown displays multiple redundant entries representing the same physical location with different formatting styles:
  - `(INMUN) MUNDRA`
  - `INMUN1 - MUNDRA`
  - `MUNDRA, INDIA`
  
  The same behavior occurs for Nhava Sheva (`(INNSA) NHAVA SHEVA`, `INNSA1 - NHAVA SHEVA`, `NHAVA SHEVA, INDIA`).
  
  Selecting one variation only filters records matching that exact string, causing users to miss all leads/deals tagged under the other variations of the same location.
- **Steps to Reproduce:**
  1. Navigate to **CRM** -> **Kanban Board** / **Leads / Deals View**.
  2. Locate the **LOCATION** search filter at the top bar.
  3. Type `mu` or `mundra` in the location input field.
  4. Observe the suggestions rendered in the autocomplete dropdown list.
  5. Repeat step 3 with `nhava` or `innsa`.
- **Expected Result:**
  - The location filter dropdown should present a **single, standardized location entry** per port/city (e.g., `MUNDRA (INMUN)` or standardized UN/LOCODE master).
  - Selecting that location should aggregate and query all associated deals/leads regardless of historical input casing or formatting.
- **Actual Result:**
  - Multiple duplicate options are displayed for the same location (`(INMUN) MUNDRA`, `INMUN1 - MUNDRA`, `MUNDRA, INDIA`).
  - Filtering by one variant excludes records saved under the other variants, leading to incomplete analytics and missed records.
- **Impact:** 
  - Fragmented pipeline views and false zero/low count metrics for sales teams.
  - High risk of missed follow-ups on lost deals.
- **Suggested Resolution / Fix:**
  1. Normalize and deduplicate location/port records at the database aggregation query level or master directory sync using canonical UN/LOCODE codes (`INMUN`, `INNSA`).
  2. Implement data sanitation or alias mapping on the backend CRM filter endpoint (`/api/crm/...`).

#### CRM-BUG-002: Lead Conversion Throws HTTP 500 Error Due to `businessVertical: 'Novusha'` Enum Validation Failure on Account Creation
- **Issue Type:** Bug / Defect
- **Component / Sub-Module:** Lead & Inquiry Management / Lead Conversion Flow
- **Severity:** Critical (Blocks core business workflow: Lead -> Account / Contact / Opportunity conversion)
- **Priority:** High
- **Status:** Resolved
- **Environment:** Staging / Development / Production (`server` Node ESM / Express + Mongoose)
- **API Endpoint:** `POST /api/crm/leads/:id/convert`
- **Summary:** Converting a lead assigned to "Novusha" business vertical fails with HTTP 500 Internal Server Error due to missing `'Novusha'` in the `Account` and `Contact` Mongoose schema enum.
- **Description:** 
  When an authorized user attempts to convert a lead that has `businessVertical` set to `"Novusha"` (e.g. leads created under "Novusha Direct"), the backend API endpoint (`POST /api/crm/leads/:id/convert`) crashes with a Mongoose ValidationError:
  ```json
  {
      "success": false,
      "message": "Account validation failed: businessVertical: `Novusha` is not a valid enum value for path `businessVertical`.",
      "code": "CONVERSION_FAILED"
  }
  ```
  **Root Cause:**
  - `server/model/crm/Lead.mjs` and `Opportunity.mjs` include `'Novusha'` in their `businessVertical` enum (`['Novusha', 'Paramount', 'Transportation', 'Freight Forwarding', 'Export', 'Import']`).
  - However, `server/model/crm/Account.mjs` and `server/model/crm/Contact.mjs` schemas only permit `['Paramount', 'Transportation', 'Freight Forwarding', 'Export', 'Import']`.
  - During lead conversion, `leads.controller.mjs` instantiates a new `Account` and `Contact` passing `lead.businessVertical` (`"Novusha"`), triggering schema rejection upon `account.save()`.
- **Steps to Reproduce:**
  1. Navigate to **CRM** -> **Lead Management** (`/crm/leads`).
  2. Create or select an existing Lead with `businessVertical` = `"Novusha"` (or "Novusha Direct").
  3. Click the green **Convert** button on the lead row / detail modal.
  4. Observe the network response and alert notification on the screen.
- **Expected Result:**
  - Lead converts successfully into an **Account**, **Primary Contact**, and **Opportunity**.
  - Returns HTTP 200/201 with `{ success: true, ... }`.
- **Actual Result:**
  - Request fails with HTTP 500 Internal Server Error.
  - Alert banner displays: *"Account validation failed: businessVertical: `Novusha` is not a valid enum value for path `businessVertical`."*
  - Lead status remains unconverted.
- **Impact:**
  - Sales reps and CRM managers cannot convert any leads tagged with the "Novusha" business vertical into active accounts or pipeline deals.
- **Suggested Resolution / Fix:**
  Add `'Novusha'` to the `businessVertical` enum list in both:
  1. `server/model/crm/Account.mjs`
  2. `server/model/crm/Contact.mjs`

#### CRM-BUG-003: Lead Management "Reason for Loss" Column Displays Empty (`—`) for Converted Leads Whose Downstream Deals Are Lost
- **Issue Type:** Bug / Defect
- **Component / Sub-Module:** Lead & Inquiry Management / Lead Table Grid (`LeadList.jsx`)
- **Severity:** Medium (Data Disconnect / Reporting Inconsistency)
- **Priority:** High
- **Status:** Resolved
- **Environment:** Staging / Production (`client` SPA + `server` CRM APIs)
- **Summary:** In the Lead Management table, the "Reason for Loss" column displays a blank dash (`—`) for converted leads even when their converted Opportunities/Deals are marked as "Lost" with recorded loss reasons.
- **Description:** 
  When a lead is converted to an Opportunity/Deal, and that Deal is subsequently moved to the **`Lost`** stage in the CRM Pipeline with a recorded Reason for Loss (e.g., `"Lost on price"`, `"Volume split, we were not primary"`):
  - In **Lost Deals** view (`/crm/pipeline` -> Lost), the deals properly display their Reason for Loss badges.
  - In **Lead Management** table (`/crm/leads`), the same records show `STATUS: Converted` and `REASON FOR LOSS: —`.
  
  Because the downstream Opportunity's loss state and `closeReason` are not populated onto the parent Lead record, the column remains empty (`—`) for all converted leads that were ultimately lost, creating a disconnect between the Lead Management view and Pipeline outcomes.
- **Steps to Reproduce:**
  1. Navigate to **CRM** -> **Lead Management** (`/crm/leads`).
  2. Create a lead and click **Convert** to generate an Opportunity/Deal.
  3. Navigate to **CRM** -> **Kanban / Pipeline**, open the converted deal, and move it to **`Lost`** with Reason: `"Lost on price"`.
  4. Verify the deal shows `"Lost on price"` in the **Lost Deals** view.
  5. Return to **Lead Management** (`/crm/leads`) and check the **REASON FOR LOSS** column for that converted lead.
- **Expected Result:**
  - The "Reason for Loss" column in Lead Management should either:
    1. Populate the associated Opportunity's Reason for Loss (e.g., badge showing `"Lost on price" (Deal Lost)`), OR
    2. Only render the "Reason for Loss" column when filtering by Lost leads, to prevent permanent empty column values on converted leads.
- **Actual Result:**
  - Converted leads whose deals are marked as lost still show `STATUS: Converted` and `REASON FOR LOSS: —`.
- **Impact:**
  - Sales and marketing teams analyzing the Lead Management grid cannot see which converted leads eventually resulted in lost deals and why.
- **Suggested Resolution / Fix:**
  - In `leads.controller.mjs` (GET `/api/crm/leads`), populate or lookup the converted Opportunity's stage and `closeReason` when `lead.status === 'converted'`.
  - In `LeadList.jsx`, if `lead.status === 'converted'` and associated Opportunity is `lost`, display the Opportunity's `closeReason`.

---

### 2. Customer Interaction History
<!-- Log bugs related to Customer Interaction History & Calendar -->

#### CRM-BUG-004: Tasks, Activities, and Planned Visits Duplicate Across Consecutive Days (Today and Tomorrow) in Calendar Views
- **Issue Type:** Bug / Defect
- **Component / Sub-Module:** Customer Interaction History / Activity Calendar (`ActivityCalendar.jsx`)
- **Severity:** High (UI Inconsistency & Schedule Misleading)
- **Priority:** High
- **Status:** Resolved
- **Environment:** Staging / Production (`client` SPA `ActivityCalendar.jsx`)
- **Summary:** Adding a task, activity, or planned visit for a single day causes it to render duplicated on both the scheduled day and the following day (e.g. shows on both 23rd and 24th, or 9th and 10th).
- **Description:** 
  When a user schedules an activity, task, or planned visit for a specific date (e.g., September 23, 2026), the event appears twice on the calendar: once in the cell for the scheduled date (September 23) and again in the cell for the subsequent date (September 24).
  
  This behavior reproduces consistently across Month and Week calendar views (e.g., events created on Wed 9th also appear on Thu 10th; events created on Wed 23rd also appear on Thu 24th).
  
  **Root Cause Analysis:**
  In `client/src/components/crm/components/ActivityCalendar.jsx`, the helper function `isSameDay(a, b)` independently checks both local date components (`getDate()`) AND UTC date components (`getUTCDate()`):
  ```javascript
  // Condition 1: Local date match
  if (da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()) return true;
  // Condition 2: da UTC matching db local
  if (da.getUTCFullYear() === db.getFullYear() && da.getUTCMonth() === db.getMonth() && da.getUTCDate() === db.getDate()) return true;
  ```
  In Indian Standard Time (IST, UTC+5:30), dates stored with evening UTC timestamps (or converted to ISO strings) have differing UTC day numbers versus local day numbers (e.g., UTC date = 23, Local date in IST = 24).
  Because both conditions return `true` with fallback `OR` evaluations, cell 23 matches via Condition 2, and cell 24 matches via Condition 1, resulting in duplicate rendering on two consecutive days.
- **Steps to Reproduce:**
  1. Navigate to **CRM** -> **Calendar** (`/crm/calendar`).
  2. Select Month view for **September 2026**.
  3. Click the **+ Add** button to create a new Task or Activity scheduled specifically for **September 23, 2026**.
  4. Save the task/activity.
  5. Observe the calendar grid: the event is displayed inside the **23rd** cell AND inside the **24th** cell.
- **Expected Result:**
  - The task/activity/visit should render **only once** on the specific date it was scheduled for (e.g., September 23 only).
- **Actual Result:**
  - The event renders simultaneously in two day cells (e.g. on both September 23 and September 24).
- **Impact:**
  - Sales reps and managers see misleading task/visit schedules and risk duplicate calls or missed deadlines.
- **Suggested Resolution / Fix:**
  - Standardize date comparison in `ActivityCalendar.jsx` using consistent local date parsing or an established date library (e.g., `dayjs(a).isSame(dayjs(b), 'day')` or `date-fns/isSameDay`) instead of mixing UTC and local date comparisons.

---

### 3. Quotation & Proposal Tracking
<!-- Log bugs related to Quotation & Proposal Tracking -->

#### CRM-BUG-005: Overlapping Header Text, Corrupted Currency Glyphs, and Number Spacing Glitches in Quotation PDF Layout
- **Issue Key:** CRM-BUG-005
- **Issue Type:** Bug / Defect
- **Component / Sub-Module:** CRM / Quotation & Proposal Tracking (`pdfGenerator.js` / Quotation Preview & PDF Generation)
- **Severity:** High (Client-Facing Document Defect & Layout Degradation)
- **Priority:** High
- **Status:** Open
- **Reported Date:** 2026-09-25
- **Environment:** Staging / Development / Production (`client` SPA + jsPDF / `jspdf-autotable` / HTML Canvas PDF renderer)
- **Summary:** In the CRM Quotation PDF export and preview, company address lines in the header overlap each other, table headers contain spelling mistakes (`peices`) and corrupted currency symbols (`Rate ( \` )`), and summary totals render with abnormal digit spacing (`8, 0 2, 7 3 4`).
- **Description:** 
  When generating, previewing, or downloading a PDF quotation from CRM (e.g., Quotation Quote `# QT-2026-00023`), multiple visual layout, text overlapping, and character rendering defects occur across the document:

  1. **Company Header Address Overlapping:**
     - The multi-line company address and contact information (`Address line 1`, `Address line 2`, `Ph / Email`, `Postal Code / City`) beneath the company logo/name are rendered at fixed or improperly calculated vertical Y-coordinates.
     - Consequently, the second line of text (`Cupiditate uxor labere...`) overlaps directly on top of the phone and email row (`Ph: 9658741230 | Email: ...`), making both lines illegible.

  2. **Table Header Encoding & Spelling Defects:**
     - **Currency Symbol Distortion:** Column headers for rate and total render as `"Rate ( \` )"` and `"Total ( \` )"` instead of proper Indian Rupee (`₹` / `Rs.`) or currency denomination due to missing Unicode font glyph support or incorrect fallback in standard jsPDF fonts (`helvetica`).
     - **Spelling Typo:** Column header for piece quantity is misspelled as `"quantity in peices"` (should be `"Quantity in Pieces"` / `"Qty (Pcs)"`).

  3. **Summary / Totals Abnormal Digit Spacing (Kerning Glitch):**
     - In the bottom-right summary calculation block, the monetary figures are displayed with excessive spacing between digits and punctuation:
       - `Subtotal:      \` 8, 0 2, 7 3 4` (instead of `₹ 8,02,734` or `Rs. 8,02,734.00`)
       - `Discount:    - \` 5, 3 2, 5 5 1`
       - `Tax (GST):   + \` 1 2, 5 6, 6 7 5`
       - `Total Amount:  \` 1 5, 2 6, 8 5 8`
     - This occurs due to custom letter-spacing / character kerning rules or font splitting across individual numerical glyphs during PDF rendering.

- **Steps to Reproduce:**
  1. Navigate to **CRM** -> **Quotations** (`/crm/quotes`) or open a Deal detail modal with an attached quotation.
  2. Select an existing quotation with multiple line items, volume, container size, discount, and GST details (e.g. `QT-2026-00023`).
  3. Click **Download PDF** or open the **PDF Preview** modal.
  4. Inspect the generated PDF layout:
     - Check the company address section below the top header title.
     - Check the Line Items table column headers (`Rate`, `Total`, `quantity in peices`).
     - Check the right-side Subtotal, Discount, Tax, and Total Amount summary block.

- **Expected Result:**
  - Company address lines should wrap dynamically with proper vertical line-height (no overlapping text).
  - Column headers should use correct spelling (`Quantity in Pieces` / `Qty (Pcs)`) and clean currency labels (e.g., `Rate (₹)` / `Rate (INR)` / `Rate (Rs.)`).
  - Monetary values in the summary block should render formatted with standard Indian currency numbering without wide gaps between digits (e.g., `₹ 8,02,734.00` / `₹ 15,26,858.00`).

- **Actual Result:**
  - Company address text lines collision/overlap rendering them unreadable.
  - Column header has typo (`quantity in peices`) and broken currency symbols (`Rate ( \` )`).
  - Total numbers are spread out with wide whitespace gaps between every character (`1 5, 2 6, 8 5 8`).

- **Impact:**
  - **High**: Quotations are customer-facing legal and commercial documents sent to external clients and prospective buyers. Layout overlapping and corrupted numbers damage corporate brand credibility and can cause commercial disputes regarding quote validity.

- **Root Cause Analysis:**
  1. **Address Overlap:** Fixed hardcoded Y-offset increments (e.g., `y + 4`) without accounting for `doc.splitTextToSize()` wrapped line count.
  2. **Corrupted Rupee Symbol:** Standard jsPDF core fonts (`helvetica`, `times`, `courier`) do not support Unicode `₹` (U+20B9). When passed raw Unicode, it falls back to an invalid backtick/apostrophe or accent glyph.
  3. **Character Spacing Glitch:** `letter-spacing` or `charSpace` property set erroneously in jsPDF/HTML-to-canvas options, or monospaced font mapping splitting digits with artificial character offsets.
  4. **Typo:** Hardcoded string `"quantity in peices"` in table column definition.

- **Suggested Resolution / Fix:**
  1. In `client/src/components/crm/utils/pdfGenerator.js`:
     - Calculate dynamic Y-coordinates using `lines.length * lineHeight` for multi-line address blocks.
     - Replace unsupported Unicode `₹` symbol with standard `Rs.` or `INR` in standard fonts, or embed a UTF-8 compliant font (e.g., Roboto / Noto Sans).
     - Fix typo `"quantity in peices"` to `"Qty (Pieces)"` or `"Quantity (Pcs)"`.
     - Reset `doc.setCharSpace(0)` and ensure standard `toLocaleString('en-IN')` string output for all totals.

---

### 4. CRM Pipeline & Conversion Analytics
<!-- Log bugs related to CRM Pipeline & Conversion Analytics -->



---

## Reported Bugs Summary

| Bug ID | Sub-Module | Description | Severity | Priority | Status | Reported Date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **CRM-BUG-001** | Lead & Inquiry / Filters | Duplicate & unstandardized location filter values (Mundra, Nhava Sheva) | High | High | Resolved | 2026-09-23 |
| **CRM-BUG-002** | Lead Conversion | HTTP 500 on converting "Novusha" lead due to missing enum in Account/Contact schema | Critical | High | Resolved | 2026-09-23 |
| **CRM-BUG-003** | Lead Management Grid | Converted leads with lost deals show empty (`—`) in Reason for Loss column | Medium | High | Resolved | 2026-09-23 |
| **CRM-BUG-004** | Activity Calendar | Tasks, activities & visits duplicate across consecutive days (today & tomorrow) | High | High | Resolved | 2026-09-23 |
| **CRM-BUG-005** | Quotation & Proposal Tracking | Overlapping header text, corrupted currency glyphs (`\``) & digit spacing glitches in PDF | High | High | Open | 2026-09-25 |
