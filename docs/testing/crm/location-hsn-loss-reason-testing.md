# CRM Lost Deals & Opportunity Analysis - Testing Scenarios
## Focus: Location-Wise & HSN Code Filtering with "Reason for Loss" Column

This document outlines comprehensive test scenarios, edge cases, RBAC security validations, and automated Selenium test checklists for verifying **Location-wise** and **HSN Code-wise** filtering alongside the dedicated **Reason for Loss** column in CRM.

---

## 1. Functional Test Scenarios

### A. Location Filter Testing *(Primary Focus)*

| Scenario ID | Test Case Objective | Test Steps / Inputs | Expected Result | Status / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **TC-LOC-01** | **Single Location Selection** | Select a specific location (e.g., *Mundra / Delhi ICD / Nhava Sheva*). | Grid reloads immediately showing **only** records matching that location. | **Pass** |
| **TC-LOC-02** | **Multi-Location Selection** | Select 2+ locations from dropdown/chips. | Multiple locations selection support. | **N/A** (Feature Not Available in current UI) |
| **TC-LOC-03** | **Clear / Reset Location Filter** | Select a location, verify filtered results, then click `Clear` / `All Locations`. | Filter resets and all accessible records across all locations re-populate. | **Pass** |
| **TC-LOC-04** | **Location Hierarchy / Sub-location** | Filter by parent branch/state vs. specific port/ICD terminal. | Data resolves accurately without showing records from sibling branches. | **N/A** (No sub-category hierarchy in current implementation) |
| **TC-LOC-05** | **Empty Location Data** | Filter on a location that has 0 records/leads. | Shows an appropriate *"No records found for the selected location"* empty-state message (no infinite loader or UI crash). | **Pass** |


---

### B. HSN Code Filter Testing

| Scenario ID | Test Case Objective | Test Steps / Inputs | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-HSN-01** | **Exact HSN Match** | Enter exact 8-digit HSN code (e.g., `84713010`). | Only records strictly matching the 8-digit HSN code appear. |
| **TC-HSN-02** | **Prefix / Chapter Search (2 / 4 / 6 Digits)** | Enter Chapter level (`84` or `8471`). | Returns all records falling under chapter/heading `8471`. |
| **TC-HSN-03** | **Special Characters / Spaces in HSN** | Enter `8471.30.10`, ` 84713010 `, or invalid characters (`84@71`). | Spaces trimmed automatically; formatted HSNs matched without breaking the query parser. |
| **TC-HSN-04** | **Non-Existent HSN** | Enter an invalid/unmapped HSN (e.g., `99999999`). | Grid returns clean empty-state with 0 rows. |

---

### C. Combined Filtering (Location + HSN Code)

| Scenario ID | Test Case Objective | Test Steps / Inputs | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-COMB-01** | **Location AND HSN Code Intersection** | Select Location = *Nhava Sheva* AND HSN = *8471*. | Only records having **both** Location = *Nhava Sheva* and HSN = *8471* are displayed (AND logic). |
| **TC-COMB-02** | **Valid Location + Invalid HSN** | Select valid Location + non-existent HSN code. | Result: 0 records found. |
| **TC-COMB-03** | **Dynamic Counter / Summary Cards** | Apply Location and HSN filters and check top metrics (Total Count, Lost Deals Value). | Metric counters update dynamically to reflect only the filtered subset. |

---

## 2. "Reason for Loss" Column Testing

| Scenario ID | Test Case Objective | Test Steps / Inputs | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-RFL-01** | **Column Visibility & Placement** | Load the CRM grid/report. | "Reason for Loss" column appears as a dedicated column, logically positioned near status/location. |
| **TC-RFL-02** | **Status-Specific Value Display** | Check rows with status `Lost` vs. `Won` / `In Progress` / `Open`. | • **Lost status**: Shows recorded reason (e.g., *Competitor Pricing, Transit Delay, Customs Clearance Delay*).<br>• **Non-lost status**: Shows `-` or `N/A` (clean fallback, not `null` or `undefined`). |
| **TC-RFL-03** | **Long Text & Truncation Handling** | View a record with a multi-line or 200+ character loss description. | Cell text is truncated with ellipsis (`...`) and full text is readable via hover tooltip or row click modal. |
| **TC-RFL-04** | **Sorting by Reason for Loss** | Click the column header to sort Ascending / Descending. | Rows sort alphabetically; null/empty values consistently grouped at the top or bottom. |
| **TC-RFL-05** | **Filter/Search within Reason for Loss** | Search for keyword *"Price"* or select *"Pricing"* category. | Only records with matching loss reasons are displayed. |
| **TC-RFL-06** | **Converted Lead Downstream Loss Sync** | Check a converted lead whose generated deal is marked `Lost`. | Lead grid reflects the downstream deal's Reason for Loss badge (or contextual loss indicator). |

---

## 3. Location-Centric & Security / RBAC Scenarios *(Critical)*

| Scenario ID | Test Case Objective | Test Steps / Inputs | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-SEC-01** | **Branch-Scoped User Isolation** | Log in as a User restricted to Branch/Location *Ahmedabad*. | • Location filter dropdown **only** shows *Ahmedabad* (or is auto-locked).<br>• Cannot access other locations' loss records via API URL manipulation or filter spoofing. |
| **TC-SEC-02** | **Admin Bypass** | Log in as an Admin. | Able to view, filter, and switch between all global locations. |
| **TC-SEC-03** | **Cross-Location Reason for Loss Analysis** | Check if same HSN code has different loss reasons in different locations (e.g., Mumbai vs. Delhi). | Location breakdown displays accurately without aggregated data cross-contaminating. |

---

## 4. Edge Cases & Boundary Conditions

- [ ] **Trailing/Leading Whitespaces:** Verify filters trim whitespace before triggering queries.
- [ ] **Pagination with Active Filters:** Filter by Location & HSN -> Navigate to Page 2 -> Ensure filters remain applied and do not reset to Page 1 unfiltered data.
- [ ] **Refresh / Deep Linking:** Apply filters -> Refresh browser (`F5`) or copy URL with query params (`?location=MUM&hsn=8471`) -> Verify the same filtered state loads.
- [ ] **Special Characters in Loss Reason:** Verify reasons with quotes, commas, ampersands (e.g., `Client's Budget & Terms`, `Freight > 15%`) render without HTML/script injection or corrupting table layout.

---

## 5. Export & Reporting Verification (Excel / CSV / PDF)

| Scenario ID | Test Case Objective | Test Steps / Inputs | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-EXP-01** | **Filtered Export Integrity** | Apply Location = *Mundra*, HSN = *7308* -> Click **Export to Excel/CSV**. | Downloaded file contains **only** the filtered rows, not the entire database. |
| **TC-EXP-02** | **Reason for Loss in Export** | Check exported Excel file columns. | "Reason for Loss" column is present with correct formatting, headers, and un-truncated text. |
| **TC-EXP-03** | **Export with Empty Filters** | Export with no filters selected. | Full dataset is exported with proper location and reason mappings. |

---

## 6. Selenium / Automation Checklist

### Test Data Setup (Pre-requisites)
- **Record A:** Location = `MUMBAI`, HSN = `8471`, Status = `Lost`, Reason = `High Customs Duty`
- **Record B:** Location = `MUMBAI`, HSN = `8471`, Status = `Won`, Reason = `N/A`
- **Record C:** Location = `DELHI`, HSN = `8471`, Status = `Lost`, Reason = `Competitor Lower Freight`
- **Record D:** Location = `DELHI`, HSN = `2905`, Status = `Lost`, Reason = `Port Congestion`

### Sample Automation Assertions Pattern (Java / Selenium)
```java
// 1. Assert Location Filter
selectDropdownOption(locationFilterDropdown, "MUMBAI");
assertAllRowsContainColumnValue(tableRows, "Location", "MUMBAI");

// 2. Assert HSN Code Filter
typeInput(hsnFilterInput, "8471");
assertAllRowsContainColumnValue(tableRows, "HSN Code", "8471");

// 3. Assert "Reason for Loss" Column
assertColumnHeaderPresent("Reason for Loss");
assertCellText(recordARow, "Reason for Loss", "High Customs Duty");
assertCellText(recordBRow, "Reason for Loss", "-");

// 4. Assert Export matches UI row count
int uiRowCount = getTableRowCount();
int exportedRowCount = getCsvRowCount(downloadedFile);
assertEquals(uiRowCount, exportedRowCount);
```

---

## 7. Execution Status & Defect Log

| Test Case ID | Status (`Pass` / `Fail` / `Blocked` / `N/A`) | Tested By | Date | Defect / Execution Notes |
| :--- | :--- | :--- | :--- | :--- |
| **TC-LOC-01** | **Pass** | QA Team | 2026-09-23 | Verified single location selection functions properly. |
| **TC-LOC-02** | **N/A** | QA Team | 2026-09-23 | Multi-location selection functionality is not available in current UI. |
| **TC-LOC-03** | **Pass** | QA Team | 2026-09-23 | Reset/Clear location filter successfully reloads full records. |
| **TC-LOC-04** | **N/A** | QA Team | 2026-09-23 | No sub-category / hierarchy structure in current implementation. |
| **TC-LOC-05** | **Pass** | QA Team | 2026-09-23 | Empty location query displays clean empty state without crashing. |
| **TC-HSN-01** | Pass | QA Team | 2026-09-23 | |
| **TC-HSN-02** | Pass | QA Team | 2026-09-23 | |
| **TC-HSN-03** | Pass | QA Team | 2026-09-23 | |
| **TC-HSN-04** | Pass | QA Team | 2026-09-23 | |
| **TC-COMB-01** | Pass | QA Team | 2026-09-23 | |
| **TC-COMB-02** | Pass | QA Team | 2026-09-23 | |
| **TC-COMB-03** | In Progress | QA Team | 2026-09-23 | |
| **TC-RFL-01** | Pass | QA Team | 2026-09-23 | |
| **TC-RFL-02** | Pass | QA Team | 2026-09-23 | |
| **TC-RFL-03** | Pass | QA Team | 2026-09-23 | |
| **TC-RFL-04** | Pass | QA Team | 2026-09-23 | |
| **TC-RFL-05** | Pass | QA Team | 2026-09-23 | |
| **TC-RFL-06** | **Fail** | QA Team | 2026-09-23 | **CRM-BUG-003** (Converted leads whose deals are marked lost still show `—` in Reason for Loss) |
| **TC-SEC-01** | Pass | QA Team | 2026-09-23 | |
| **TC-SEC-02** | Pass | QA Team | 2026-09-23 | |
| **TC-SEC-03** | Pass | QA Team | 2026-09-23 | |
| **TC-EXP-01** | Pass | QA Team | 2026-09-23 | |
| **TC-EXP-02** | Pass | QA Team | 2026-09-23 | |
| **TC-EXP-03** | Pass | QA Team | 2026-09-23 | |



