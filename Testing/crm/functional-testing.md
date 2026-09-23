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
- **Status:** Open
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
- **Status:** Open
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

---

### 2. Customer Interaction History
<!-- Log bugs related to Customer Interaction History -->


---

### 3. Quotation & Proposal Tracking
<!-- Log bugs related to Quotation & Proposal Tracking -->


---

### 4. CRM Pipeline & Conversion Analytics
<!-- Log bugs related to CRM Pipeline & Conversion Analytics -->



---

## Reported Bugs Summary

| Bug ID | Sub-Module | Description | Severity | Priority | Status | Reported Date |
| --- | --- | --- | --- | --- | --- | --- |
| **CRM-BUG-001** | Lead & Inquiry / Filters | Duplicate & unstandardized location filter values (Mundra, Nhava Sheva) | High | High | Open | 2026-09-23 |
| **CRM-BUG-002** | Lead Conversion | HTTP 500 on converting "Novusha" lead due to missing enum in Account/Contact schema | Critical | High | Open | 2026-09-23 |

