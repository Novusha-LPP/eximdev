You are building a reusable **Charges Management Component** for a logistics/freight 
forwarding ERP system. This component must work across multiple modules (Job, Shipment, 
Booking, Invoice, etc.). Implement it end-to-end: MongoDB schema, backend API, and 
frontend UI.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 1. OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The Charges component allows users to define revenue and cost entries for any parent 
module (e.g., a Job). Each charge has:
- A charge head (vendor/party name)
- A category (Reimbursement, Freight, Insurance, etc.)
- A cost center
- Separate Revenue and Cost lines, each with basis, qty, rate, currency, amount,
  receivable/payable party, and flags (Override Auto Rate, Posted, Copy to Cost)
- File attachments per charge row
- A predefined charge list plus support for custom user-defined charges

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 2. MONGODB SCHEMA  —  models/Charge.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ChargeLineSchema (sub-document, used for both Revenue and Cost)
{
  chargeDescription : String,
  basis: {
    type    : String,
    enum    : [
      "Per Package","By Gross Wt","By Chg Wt","By Volume",
      "Per Container","Per TEU","Per FEU","% of Other Charges",
      "% of Assessable Value","% of AV+Duty","% of CIF Value",
      "Per Vehicle","% of Invoice Value","Per License",
      "Per B/E - Per Shp","% of Product Value","Per Labour",
      "Per Product","By Net Wt","Per Invoice"
    ],
    default : "Per B/E - Per Shp"
  },
  qty              : { type: Number, default: 1 },
  unit             : { type: String, default: "" },
  currency         : { type: String, default: "INR" },
  rate             : { type: Number, default: 0 },
  amount           : { type: Number, default: 0 },
  amountINR        : { type: Number, default: 0 },
  exchangeRate     : { type: Number, default: 1 },
  overrideAutoRate : { type: Boolean, default: false },
  isPosted         : { type: Boolean, default: false },
  party            : { type: mongoose.Schema.Types.ObjectId, ref: "Party" },
  partyName        : { type: String },
  branchCode       : { type: String }
}

### ChargeSchema (main document)
{
  parentId     : { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  parentModule : {
    type     : String,
    required : true,
    enum     : ["Job","Shipment","Booking","Invoice","Consignment"],
    index    : true
  },

  chargeHead    : { type: String, required: true },
  chargeHeadRef : { type: mongoose.Schema.Types.ObjectId, ref: "Party" },
  category      : { type: String },
  costCenter    : { type: String },
  remark        : { type: String },

  revenue    : ChargeLineSchema,
  cost       : ChargeLineSchema,
  copyToCost : { type: Boolean, default: true },

  // File attachments (stored as references or base64 metadata)
  attachments: [{
    fileName    : { type: String, required: true },
    fileSize    : { type: Number },          // bytes
    mimeType    : { type: String },
    storagePath : { type: String },          // S3 key / GridFS id / local path
    uploadedAt  : { type: Date, default: Date.now },
    uploadedBy  : { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  }],

  createdBy  : { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedBy  : { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt  : { type: Date, default: Date.now },
  updatedAt  : { type: Date, default: Date.now }
}

### ChargeHeadSchema  —  models/ChargeHead.js
Store the predefined + custom charge catalogue separately so it is 
reusable across parent modules and editable by admins:
{
  name       : { type: String, required: true, unique: true },
  category   : { type: String },
  isSystem   : { type: Boolean, default: false },  // true = shipped with app
  isActive   : { type: Boolean, default: true },
  createdBy  : { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt  : { type: Date, default: Date.now }
}

Seed the following system records on app startup (isSystem: true):
  "EDI CHARGES"                                        → Service Charge
  "ODEX INDIA SOLUTIONS PVT LTD"                       → Reimbursement
  "HASTI PETRO CHEMICALS & SHIPPING LTD - IMPORT"      → Freight
  "CONTAINER CORPN OF INDIA LTD."                      → Freight
  "SR CONTAINER CARRIERS"                              → Transport
  "BOND PAPER EXP."                                    → Document
  "THAR LOGISTICS"                                     → Transport
  "CUSTOMS DUTY"                                       → Customs
  "LABOUR & MISC CHARGES"                              → Miscellaneous
  "OTHER DOCUMENT"                                     → Document

### Indexes
- Compound index: { parentId: 1, parentModule: 1 }
- Text index on ChargeHead.name for search: { name: "text" }

### Pre-save middleware on ChargeSchema
- revenue.amountINR = revenue.amount * revenue.exchangeRate
- cost.amountINR    = cost.amount    * cost.exchangeRate
- if copyToCost === true and this is a new document:
    copy revenue.rate, revenue.amount, revenue.currency into cost

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 3. BACKEND API  —  routes/charges.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All routes prefixed: /api/charges

### Charge CRUD
  GET    /api/charges
         Query: ?parentId=&parentModule=
         Returns all charges for the parent, sorted by createdAt asc.

  POST   /api/charges
         Body: { parentId, parentModule, chargeHead, category, costCenter,
                 remark, revenue{...}, cost{...}, copyToCost }
         Returns the created charge.

  PUT    /api/charges/:id
         Body: partial charge fields to update.
         Re-calculates amountINR on save.

  DELETE /api/charges/:id
         Also deletes any stored file attachments from storage.

  GET    /api/charges/summary?parentId=&parentModule=
         Returns: { totalRevenue, totalCost, totalRevINR, totalCostINR }

### File attachment endpoints
  POST   /api/charges/:id/attachments
         Content-Type: multipart/form-data
         Field: files[] (multiple)
         Stores files (S3 / GridFS / disk) and appends metadata to
         charge.attachments[].
         Returns updated charge with attachments array.

  DELETE /api/charges/:id/attachments/:attachmentId
         Removes file from storage and pulls from charge.attachments.

  GET    /api/charges/:id/attachments/:attachmentId/download
         Streams the file back to the client with correct Content-Type.

### ChargeHead catalogue endpoints
  GET    /api/charge-heads?search=
         Returns active ChargeHead records, optionally filtered by name
         (case-insensitive contains). Used to power the predefined list
         and search in the Add Charge modal.

  POST   /api/charge-heads
         Body: { name, category }
         Creates a custom (isSystem: false) charge head for this org.
         Returns the new ChargeHead.

### Validation rules (express-validator or joi)
  - parentId and parentModule are required on POST /api/charges
  - rate and qty must be >= 0
  - currency must be a valid ISO 4217 code
  - basis must be one of the 20 enum values
  - File upload: max 10 MB per file, allowed types: pdf, jpg, png, xlsx, docx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 4. FRONTEND COMPONENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Build a self-contained React component: components/ChargesGrid/index.jsx

### Props
{
  parentId     : string,    // MongoDB ObjectId of the parent record
  parentModule : string,    // "Job" | "Shipment" | "Booking" | "Invoice" | "Consignment"
  readOnly?    : boolean    // disables all editing when true
}

━━━━━━━━━━━━━━━━━━━━━━━━━
### A. TOOLBAR
━━━━━━━━━━━━━━━━━━━━━━━━━

Render a toolbar bar ABOVE the tab bar containing:
  [ + Add Charge ]   [ Delete Selected ]

- "Add Charge" → opens the Add Charge modal (see section D).
- "Delete Selected" → confirms and deletes the currently highlighted row.
  Show a browser confirm() or a custom confirm dialog before deleting.
- In readOnly mode, hide both buttons.

━━━━━━━━━━━━━━━━━━━━━━━━━
### B. TAB BAR + GRID
━━━━━━━━━━━━━━━━━━━━━━━━━

Replace the old single wide table with THREE TABS. Each tab shows
the same rows but different columns. Switching tabs must NOT re-fetch
data — use shared in-memory state.

Tab 1 — Particulars
  Columns: Charge Head | Curr | Basis | Category | Cost Center | Files

Tab 2 — Revenue
  Columns: Charge Head | Curr | Basis | Rate | Amount | Amount (INR) | Receivable | Files

Tab 3 — Cost
  Columns: Charge Head | Curr | Basis | Rate | Amount | Amount (INR) | Payable | Files

Shared row behaviour (all tabs):
  - Clicking a data cell → highlights row (background #d9d9ff) and opens 
    the Edit Charge modal populated with that row's data.
  - Clicking the Files cell → opens the File Upload modal (NOT the Edit modal).
  - Highlighted row persists when switching tabs.

Files column cell rules:
  - 0 attachments  → show [ ⬆ Upload ] button
  - 1+ attachments → show [ 📎 N ] badge (N = count)
  - Clicking either opens the File Upload modal for that row.

━━━━━━━━━━━━━━━━━━━━━━━━━
### C. EDIT CHARGE MODAL
━━━━━━━━━━━━━━━━━━━━━━━━━

Opens when the user clicks any data cell in a row (not the Files cell).
Title bar text: "Edit Charge"

Top section (two columns):
  Left:
    Charge      [searchable text input + 🔍 button]
    Category    [text input]
    Cost Center [searchable text input + 🔍 button]
  Right:
    Remark      [textarea, ~4 rows]

Below top section — mini inner table with two clickable rows:

  Header columns:
    (blank) | Basis | Qty/Unit | (curr) | Rate | Amount | Amount(INR) | Ovrd | Pstd | ▼

  Row 1: Revenue  → displays revenue line summary values
  Row 2: Cost     → displays cost line summary values

Clicking a Revenue or Cost row EXPANDS an inline detail panel below it.
Clicking the same row again COLLAPSES the panel.
Only one panel can be open at a time — opening one auto-closes the other.
The ▼/▲ arrow button also toggles the panel.

#### Revenue expand panel contains:
  Full width: Charge Description [text input]

  Left column:
    Basis          [dropdown — all 20 options, default "Per B/E - Per Shp"]
    Qty/Unit       [number input] [unit text input]
    Rate           [number input] [currency select: INR/USD/EUR]
    Amount         [number input, auto-calculated] INR
    Amount(INR)    [number input, auto-calculated] INR

  Right column:
    Override Auto Rate   [checkbox]
    Receivable Type      [select: Customer / Agent / Carrier]
    Receivable From      [searchable input + 🔍] [BRANCH CODE link]

  Bottom right:
    Copy to Cost         [checkbox — when checked, mirrors revenue values to cost]

#### Cost expand panel contains:
  Same layout as Revenue panel except:
  - Right column shows: Payable Type [select: Vendor / Agent / Carrier]
                        Payable To   [searchable input + 🔍]
  - No "Copy to Cost" checkbox

#### Footer buttons:
  [ Update ] [ Update & Close ] [ Update & New ] [ Cancel ]

  Update          → save changes, keep modal open, re-fetch grid
  Update & Close  → save changes, close modal, re-fetch grid
  Update & New    → save changes, reset modal to empty for a new charge
  Cancel          → discard changes, close modal

━━━━━━━━━━━━━━━━━━━━━━━━━
### D. ADD CHARGE MODAL
━━━━━━━━━━━━━━━━━━━━━━━━━

Opens from the "+ Add Charge" toolbar button.
Title bar text: "Add Charge"

#### Section 1 — Search & select predefined charges
  Search box (filters the list below in real-time, case-insensitive contains)

  Scrollable list of ChargeHead records fetched from GET /api/charge-heads.
  Each list item shows:
    [checkbox]  CHARGE NAME                    [Category badge]

  - Clicking a row toggles its checkbox and highlights the row (#d9d9ff).
  - Multiple rows can be selected simultaneously.
  - A counter "N charges selected" updates live at the bottom of the modal.

  Predefined system charges (shown by default):
    EDI CHARGES                                       Service Charge
    ODEX INDIA SOLUTIONS PVT LTD                      Reimbursement
    HASTI PETRO CHEMICALS & SHIPPING LTD - IMPORT     Freight
    CONTAINER CORPN OF INDIA LTD.                     Freight
    SR CONTAINER CARRIERS                             Transport
    BOND PAPER EXP.                                   Document
    THAR LOGISTICS                                    Transport
    CUSTOMS DUTY                                      Customs
    LABOUR & MISC CHARGES                             Miscellaneous
    OTHER DOCUMENT                                    Document

#### Section 2 — Add Custom Charge
  Shown below the predefined list as a dashed-border box.

  [Charge name input..................] [Category select ▼] [Add to List]

  - "Add to List" calls POST /api/charge-heads to persist the new charge head,
    then adds it to the top of the predefined list, pre-checked.
  - Duplicate names (case-insensitive) must be rejected with an inline error.
  - Category select options: Freight | Reimbursement | Insurance | Surcharge |
    Transport | Service Charge | Customs | Miscellaneous | Document

#### Footer buttons:
  [N charges selected]        [ Add Selected ]  [ Cancel ]

  "Add Selected":
    - For each selected charge head, call POST /api/charges with:
      { parentId, parentModule, chargeHead: name, category, costCenter: "",
        revenue: { basis: "Per B/E - Per Shp", qty: 1, rate: 0, currency: "INR" },
        cost:    { basis: "Per B/E - Per Shp", qty: 1, rate: 0, currency: "INR" } }
    - After all creates succeed, close modal and re-fetch the grid.

━━━━━━━━━━━━━━━━━━━━━━━━━
### E. FILE UPLOAD MODAL
━━━━━━━━━━━━━━━━━━━━━━━━━

Opens when the user clicks the Files cell of any row.
Title bar: "Attach Files — [CHARGE NAME]"

Contains:
  Drag-and-drop zone:
    ⬆  Drag & drop files here
       or [browse to upload]
    PDF, JPG, PNG, XLSX, DOCX supported

  File list (below the drop zone, max-height scrollable):
    Each attached file shows:  📄 filename.pdf  (12.4 KB)    [✕ remove]

  Pre-populate the list with files already saved in charge.attachments[].
  New files are staged locally until the user clicks Attach.
  Removing an existing file from the list marks it for deletion on save.

Footer buttons:
  [ Attach ]  [ Cancel ]

  Attach:
    1. For each new (staged) file: POST /api/charges/:id/attachments
    2. For each removed existing file: DELETE /api/charges/:id/attachments/:aid
    3. Update the Files badge in the grid row to show the new count.

━━━━━━━━━━━━━━━━━━━━━━━━━
### F. STATE MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━

Use React Query (or SWR). Key patterns:

  // Fetch charges for parent
  useQuery(['charges', parentId, parentModule], () =>
    fetch(`/api/charges?parentId=${parentId}&parentModule=${parentModule}`)
  )

  // Create charge
  useMutation(newCharge => fetch('/api/charges', { method:'POST', body: JSON.stringify(newCharge) }), {
    onSuccess: () => queryClient.invalidateQueries(['charges', parentId, parentModule])
  })

  // Update charge
  useMutation(({ id, data }) => fetch(`/api/charges/${id}`, { method:'PUT', body: JSON.stringify(data) }), {
    onSuccess: () => queryClient.invalidateQueries(['charges', parentId, parentModule])
  })

  // Delete charge
  useMutation(id => fetch(`/api/charges/${id}`, { method:'DELETE' }), {
    onSuccess: () => queryClient.invalidateQueries(['charges', parentId, parentModule])
  })

  // Upload files
  useMutation(({ id, files }) => {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    return fetch(`/api/charges/${id}/attachments`, { method:'POST', body: form });
  }, {
    onSuccess: () => queryClient.invalidateQueries(['charges', parentId, parentModule])
  })

  Local UI state (useState):
    - activeTab         : 'particulars' | 'revenue' | 'cost'
    - selectedRowId     : string | null
    - editModalOpen     : boolean
    - addModalOpen      : boolean
    - fileModalOpen     : boolean
    - fileModalRowId    : string | null
    - expandedPanel     : 'rev' | 'cost' | null   (inside edit modal)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 5. INTEGRATION EXAMPLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To use the component in the Job module:

  import ChargesGrid from "@/components/ChargesGrid";

  <ChargesGrid parentId={job._id} parentModule="Job" />

To use in the Shipment module:

  <ChargesGrid parentId={shipment._id} parentModule="Shipment" />

To use in read-only mode (e.g. on a printed invoice view):

  <ChargesGrid parentId={invoice._id} parentModule="Invoice" readOnly />

No other changes needed — all data fetching, modals, tabs, and file 
handling are fully self-contained inside the component.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 6. FOLDER STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

backend/
  models/
    Charge.js              ← Mongoose schema (with attachments sub-array)
    ChargeHead.js          ← Predefined + custom charge catalogue
  routes/
    charges.js             ← CRUD + file attachment routes
    chargeHeads.js         ← Catalogue search + custom charge creation
  controllers/
    chargeController.js
    chargeHeadController.js
  middleware/
    uploadMiddleware.js    ← multer / S3 config for file uploads
  seeds/
    chargeHeads.seed.js    ← Seeds the 10 system charge heads on startup

frontend/
  components/
    ChargesGrid/
      index.jsx            ← Root component; owns state, tab, row selection
      Toolbar.jsx          ← Add Charge + Delete Selected buttons
      TabBar.jsx           ← Particulars / Revenue / Cost tabs
      ChargesTable.jsx     ← Table for the active tab; renders rows
      EditChargeModal.jsx  ← Full edit modal with top form
      RevenuePanel.jsx     ← Expandable Revenue detail form
      CostPanel.jsx        ← Expandable Cost detail form
      AddChargeModal.jsx   ← Predefined list + custom charge input
      FileUploadModal.jsx  ← Drag-drop upload, staged file list
      useCharges.js        ← React Query hooks
      useChargeHeads.js    ← React Query hook for catalogue fetch/create
      charges.css          ← All styles scoped to this component

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 7. STYLING REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Base font           : Arial/Helvetica, 12px
Table header        : linear-gradient(#f4f6f9, #dfe5ec)
Group header        : linear-gradient(#e6ebf2, #cfd6df)
Selected row        : background #d9d9ff
Hover row           : background #eef4ff
Modal background    : #dde4ed,  border: 2px solid #7a9cbf
Modal title bar     : linear-gradient(#7fa8d0, #5580a8), white text, bold 13px
Expand panel bg     : #eef2f8,  border-top: 2px solid #7a9cbf
All inputs          : border: 1px solid #8faec7, border-radius: 2px, bg white
Buttons             : linear-gradient(to bottom, #f0f4f9, #d8e2ec), border #7a9cbf
Delete button       : linear-gradient(to bottom, #faf0f0, #edd8d8), border #c09090
Toolbar background  : linear-gradient(#f0f4f9, #e2e8f0), border #9aa7b4
Tab bar background  : linear-gradient(#eef1f6, #d8e0ea), border #9aa7b4
Active tab          : background white, color #1a3a5c, border-bottom: 2px solid white
Upload button       : no fill, border #9aacbd, color #3a6a9a
File badge          : background #d0e8ff, border #7ab8e0, border-radius 10px
Predefined list bg  : white, border #b0bfcc
Category badge      : background #eaf0f8, border #c0d4e8, border-radius 8px
Drop zone           : border: 2px dashed #7a9cbf, background #f4f8fc
Drop zone hover     : background #ddeeff, border #3a70b0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 8. BUSINESS RULES & NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Basis dropdown
  Must always contain exactly these 20 options in this exact order:
  Per Package, By Gross Wt, By Chg Wt, By Volume, Per Container, Per TEU,
  Per FEU, % of Other Charges, % of Assessable Value, % of AV+Duty,
  % of CIF Value, Per Vehicle, % of Invoice Value, Per License,
  Per B/E - Per Shp, % of Product Value, Per Labour, Per Product,
  By Net Wt, Per Invoice
  Default selected: "Per B/E - Per Shp"

Copy to Cost
  When checked on the Revenue panel, auto-mirror these fields into Cost:
  rate, amount, amountINR, currency, basis.
  This is applied both on the frontend in real-time and re-applied on the
  backend pre-save hook for new documents.

Amount calculation
  amount    = rate × qty
  amountINR = amount × exchangeRate  (exchangeRate defaults to 1 for INR)
  These are always calculated — never manually editable by the user.

File attachments
  - Max 10 MB per file.
  - Allowed MIME types: application/pdf, image/jpeg, image/png,
    application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
    application/vnd.openxmlformats-officedocument.wordprocessingml.document
  - Files are staged locally in the UI before being sent to the server.
  - Removing a previously-uploaded file marks it for deletion; the actual
    server-side delete happens only when the user clicks Attach.
  - The Files badge in the grid always reflects the server-confirmed count
    from the charge.attachments array.

Tab switching
  Tab switching must never trigger a re-fetch. All three tabs share the
  same data array from the single React Query cache entry. Only the
  visible columns differ per tab.

Row selection
  Selected row ID is stored in a single piece of state. When the user
  switches tabs, the same row remains highlighted across all three tabs.
  Clicking an already-selected row does NOT deselect it; only clicking
  a different row moves the selection.

Add Charge modal
  - Search filters the list client-side if the full catalogue is already
    loaded, or calls GET /api/charge-heads?search= with debounce (300 ms)
    for large catalogues.
  - Custom charges created here are persisted to the ChargeHead catalogue
    via POST /api/charge-heads and are then available in future sessions
    across all parent modules.
  - Duplicate charge names (case-insensitive) must be blocked at both the
    UI level (inline error) and the API level (409 Conflict).

Delete
  - Only one row can be deleted at a time (the currently selected row).
  - Show a confirmation dialog before making the DELETE API call.
  - After deletion, clear selectedRowId and re-fetch the grid.

readOnly mode
  - Hide toolbar (Add Charge, Delete Selected).
  - Row clicks do not open the Edit modal.
  - Files cell is still clickable (users can view/download attachments).
  - File upload drop zone and remove buttons are hidden in readOnly mode;
    show existing files as a read-only list with download links only.

Component isolation
  The component must NOT import from or depend on any parent module's
  store, context, or internal logic. The only coupling is the two props:
  parentId and parentModule.