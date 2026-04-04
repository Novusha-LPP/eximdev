# SCM Cube API Integration Report - Comprehensive Details

This document provides a full detailed checklist of all fields implemented in the SCM Cube job data integration API. Every field has been validated against the requirements for type, length, and mandatory/optional status.

## ✅ Summary of Validations
- **String Lengths**: Automatically truncated to specified `C(n)` limits.
- **Numeric Precision**: Enforced for all `N(n)` and `N(n,d)` fields.
- **Mandatory Fields**: Guaranteed to be present with safe defaults if data is missing.
- **Date Formats**: Standardized ISO-8601 formatting for all date fields.

---

## 1. CHADetails - Field Details
| SLNo | Field Description | Type | Length | status | Validation Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | CHA Code | C | 5 | M | ✅ Correct (Max 5 chars) |
| 2 | CHA Branch Code | C | 6 | M | ✅ Correct (Max 6 chars) |
| 3 | Financial Year | C | 9 | M | ✅ Correct (e.g., 2025-2026) |
| 4 | SenderID | C | 15 | M | ✅ Correct (Max 15 chars) |

---

## 2. BE_Details - Field Details
| SLNo | Field Description | Type | Length | status | Validation Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Custom House Code | C | 6 | M | ✅ Correct |
| 2 | Running SequenceNo | N | 6 | M | ✅ Correct |
| 3 | RNoPrifix | C | 6 | O | ✅ Correct |
| 4 | RNoSufix | C | 6 | O | ✅ Correct |
| 5 | User Job No. | N | 15 | O | ✅ Correct |
| 6 | User Job Date | Date | - | O | ✅ Correct |
| 7 | BE Type | C | 4 | M | ✅ Correct (H, W, X logic) |
| 8 | IEC Code | N | 10 | M | ✅ Correct |
| 9 | Branch Sr. No | N | 3 | M | ✅ Correct |
| 10 | Name of the importer | C | 50 | O | ✅ Correct |
| 11 | Address 1 | C | 35 | O | ✅ Correct |
| 12 | Address 2 | C | 35 | O | ✅ Correct |
| 13 | City | C | 35 | O | ✅ Correct |
| 14 | State | C | 25 | O | ✅ Correct |
| 15 | Pin | C | 6 | O | ✅ Correct |
| 16 | State Code | C | 2 | M | ✅ Correct (Derived from GST) |
| 17 | Commercial Tax Type | C | 1 | M | ✅ Correct (G for GST) |
| 18 | Commercial Tax RegNo | C | 20 | M | ✅ Correct (GSTIN) |
| 19 | Class | C | 1 | M | ✅ Correct (N) |
| 20 | Mode of Transport | C | 1 | M | ✅ Correct (L, S, A logic) |
| 21 | ImporterType | C | 1 | M | ✅ Correct (P) |
| 22 | Kachcha BE | C | 1 | M | ✅ Correct (N) |
| 23 | High sea sale flag | C | 1 | M | ✅ Correct (Y/N) |
| 24 | Port of Origin | C | 6 | M | ✅ Correct |
| 25 | CHA Code | C | 15 | M | ✅ Correct |
| 26 | Country of Origin | C | 2 | M | ✅ Correct |
| 27 | Country of Consignment| C | 2 | M | ✅ Correct |
| 28 | Port Of Shipment | C | 6 | M | ✅ Correct |
| 29 | Green Channel Req | C | 1 | M | ✅ Correct (N) |
| 30 | Section 48 Requested | C | 1 | M | ✅ Correct (N) |
| 31 | Whether Prior BE | C | 1 | M | ✅ Correct (Y/N) |
| 32 | Authorized Dealer Code| C | 10 | M | ✅ Correct |
| 33 | First Check Requested | C | 1 | M | ✅ Correct (Y/N) |
| 34 | Warehouse Code | C | 8 | O | ✅ Correct |
| 35 | Warehouse Customs ID | N | 6 | O | ✅ Correct |
| 36 | Ware house BE No | C | 7 | O | ✅ Correct |
| 37 | Ware house BE Date | Date | - | O | ✅ Correct |
| 38 | Packages released | N | 8 | O | ✅ Correct |
| 39 | Package Code | C | 3 | O | ✅ Correct |
| 40 | Gross Weight | N | 12,3 | O | ✅ Correct (3 decimals) |
| 41 | Unit of Measurement | C | 3 | O | ✅ Correct |
| 42 | Payment method code | C | 1 | M | ✅ Correct (T/D) |

---

## 3. IGMS - Field Details
| SLNo | Field Description | Type | Length | status | Validation Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | IGM No. | N | 7 | M | ✅ Correct |
| 2 | IGM Date | Date | - | M | ✅ Correct |
| 3 | Inward Date | Date | - | M | ✅ Correct |
| 4 | Gateway IGM Number | N | 7 | O | ✅ Correct |
| 5 | Gateway IGM date | Date | - | O | ✅ Correct |
| 6 | Gateway Port Code | C | 6 | O | ✅ Correct |
| 7 | MAWB.BL No | C | 20 | M | ✅ Correct |
| 8 | MAWB.BL Date | Date | - | M | ✅ Correct |
| 9 | HAWB.HBL No | C | 20 | O | ✅ Correct |
| 10 | HAWB.HBL Date | Date | - | O | ✅ Correct |
| 11 | Total No. Of Packages | N | 8 | M | ✅ Correct |
| 12 | Gross Weight | N | 9,3 | M | ✅ Correct (3 decimals) |
| 13 | Unit Quantity Code | C | 3 | M | ✅ Correct |
| 14 | Package Code | C | 3 | M | ✅ Correct |
| 15 | Marks And Numbers 1 | C | 40 | M | ✅ Correct |
| 16 | Marks And Numbers 2 | C | 40 | O | ✅ Correct |
| 17 | Marks And Numbers 3 | C | 40 | O | ✅ Correct |

---

## 4. CONTAINER - Field Details
| SLNo | Field Description | Type | Length | status | Validation Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | IGM Number | N | 7 | M | ✅ Correct |
| 2 | IGM Date | Date | - | M | ✅ Correct |
| 3 | LCL.FCL | C | 1 | M | ✅ Correct (L/F) |
| 4 | Container Number | C | 11 | M | ✅ Correct |
| 5 | Seal Number | C | 10 | M | ✅ Correct |
| 6 | Truck Number | C | 15 | O | ✅ Correct |

---

## 5. SUPPORTINGDOCUMENTLIST - Field Details
| SLNo | Field Description | Type | Length | status | Validation Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Document Code | C | 8 | O | ✅ Correct |
| 2 | Document Name | C | 50 | M | ✅ Correct |
| 3 | Document Public Path | C | 200 | M | ✅ Correct |
| 4 | Document File Format | C | 10 | M | ✅ Correct (PDF) |

---
**Report Status**: Finalized
**Last Updated**: 2026-03-29