# DGFT ↔ Product Details Sync (DGFT Register & Import DSR)

This document explains how DGFT (DGFT Register / Authorization) and product details (Import DSR jobs) are synchronized in this codebase.

## High-level summary

- DGFT data is stored in two main collections:
  - `dgftRegister` ([server/model/dgftRegisterModel.mjs](server/model/dgftRegisterModel.mjs#L1-L200))
  - `authorizationRegistration` ([server/model/authorizationRegistrationModel.mjs](server/model/authorizationRegistrationModel.mjs#L1-L300))
- Import DSR product details live on the Job model (`jobModel.mjs`) under `description_details`.
- When DSR product rows reference an Authorization (license) number and serial (`license_no`, `license_sr`), the system records per-job utilization transactions in `LicenseUtilization` and then recalculates per-license balances shown on the Authorization document.

## Where the code lives

- DGFT upload & auth endpoints: [server/routes/dgft/dgftRoutes.mjs](server/routes/dgft/dgftRoutes.mjs#L1-L800)
  - Excel upload for DGFT register: `POST /api/upload-dgft-register-excel` (parses XLSX, normalizes dates, upserts by `job_no`).
  - Excel upload for Authorization Registration: `POST /api/upload-authorization-registration-excel` (maps headers, splits combined licence/date fields, upserts by `job_no`).
  - Authorization update handler triggers synchronization of certain fields back to `JobModel` when BE numbers exist.

- Authorization model (licensed items + utilization summaries): [server/model/authorizationRegistrationModel.mjs](server/model/authorizationRegistrationModel.mjs#L1-L350)
  - `import_details_array`: licensed items with `sr_no`, `qty`, `value_usd`, `value_rs`, and computed fields like `licensed_qty`, `total_utilized_qty`, `balance_qty`, `balance_cif_usd`.
  - `utilization_records`: read-only list populated from `LicenseUtilizationModel`.

- License utilization service: [server/services/licenseUtilizationService.mjs](server/services/licenseUtilizationService.mjs#L1-L400)
  - `validateLicenseUtilization(...)` — run during DSR save to validate license existence, expiry, HS code match, quantity & value availability, and duplicate utilization.
  - `recalculateLicenseUtilization(authorizationNo)` — reads `LicenseUtilization` transactions for a license and rebuilds `import_details_array` balances.
  - `recalculateLicenseUtilizationForJob(jobDoc)` — syncs a specific job's `description_details` to `LicenseUtilization` (deletes old job records, creates new ones) and invokes recalculation for affected licenses.

- License transaction model: [server/model/licenseUtilizationModel.mjs](server/model/licenseUtilizationModel.mjs#L1-L200)
  - Records: `authorization_no`, `license_sr`, `job_no`, `job_id`, `be_no`, `qty`, `cif_usd`, `cif_inr`, `exchange_rate_used`.

## Data flow (simplified)

1. User uploads DGFT/Authorization Excel or edits an Authorization — server upserts records into `authorizationRegistration`.
2. User creates/updates an Import DSR job with product rows containing `license_no` + `license_sr`.
3. On job save/update/delete, the system should invoke `recalculateLicenseUtilizationForJob(jobDoc)` (service) which:
   - Deletes old `LicenseUtilization` rows for that job.
   - Iterates `jobDoc.description_details` and creates new `LicenseUtilization` rows for each referenced license item (calculates CIF USD/INR using job exchange rate).
   - Collects affected license numbers and calls `recalculateLicenseUtilization(licenseNo)` for each.
4. `recalculateLicenseUtilization` aggregates all `LicenseUtilization` rows for a license, sums utilized quantities and values per `sr_no`, computes balances and utilization percent, updates `authorizationRegistration.import_details_array` and clears `utilization_records` (the UI reads computed summaries from `import_details_array` and can also fetch `license-utilization/records`).

## Validation rules and edge-cases

- Authorization must exist (searches `registration_no` or `licence_no`).
- License expiry (`import_validity`) is checked; expired licenses cause validation errors when used in DSR.
- HS Code mismatch between DSR item and license item is flagged.
- Quantity and CIF USD value availability are validated against existing utilization records (excluding the current job when updating).
- Duplicate prevention: the service prevents reusing the same BE or job against the same license item.
- Exchange rate: historical `job.exrate` is used when available; otherwise the latest `CurrencyRate` import rate is used (fallback `84`).

## UI integration

- Authorization details page shows dynamic utilization & balance under each import item (values are sourced from `import_details_array` after recalculation).
- DSR UI provides autocompletion for authorizations by IEC (`/api/get-authorizations-by-iec`) and fetching an authorization by number for auto-population (`/api/get-authorization-by-no`).

## Relevant endpoints (quick list)

- `GET /api/get-dgft-registers` — list DGFT register entries
- `POST /api/upload-dgft-register-excel` — upload DGFT register XLSX
- `POST /api/upload-authorization-registration-excel` — upload Authorization XLSX
- `GET /api/get-authorization-by-no?authorization_no=...` — fetch auth by number
- `GET /api/get-authorizations-by-iec?iec_no=...` — list authorizations for IEC
- `GET /api/license-utilization/records?authorization_no=...` — fetch utilization records

(See [server/routes/dgft/dgftRoutes.mjs](server/routes/dgft/dgftRoutes.mjs#L1-L800) for exact implementations.)

## Where to hook if you need to extend or debug

- Job save/update/delete path: find where `JobModel` is created/updated and call `recalculateLicenseUtilizationForJob(jobDoc)` after the job is persisted to ensure utilization records are in sync.
- For UI refresh issues, ensure the client fetches the latest authorization document and/or the license-utilization records endpoint after saving a DSR.
- For currency conversions, check `server/services/licenseUtilizationService.mjs` and `server/model/CurrencyRate.mjs`.

---

Created from existing code and flow diagrams in the repo (see `license_utilization_flow.md`).
