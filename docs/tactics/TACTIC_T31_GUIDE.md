# Adding a New Sales Tactic (e.g. T31) Without Code Changes

The Sales Tactic tagging system in AIVision CRM is designed to be **100% data-driven**. Master tactics (T01–T30), business line fits (star ratings ★), and partner sources are all driven by database collections rather than hard-coded constants in UI or backend logic.

This guide explains how to add a new tactic (such as **T31**) without writing or modifying application source code.

---

## 1. Relevant Collections

| Collection | Model File | Purpose |
|---|---|---|
| `crm_tactics` | `server/model/crm/Tactic.mjs` | Master catalog of tactics |
| `crm_tactic_line_fits` | `server/model/crm/TacticLineFit.mjs` | ★ Star ratings per business line / service |
| `crm_partners` | `server/model/crm/Partner.mjs` | Strategic CFS / logistics partners for T29 |

---

## 2. Step-by-Step Procedure to Add T31

### Step A: Insert the Master Tactic into `crm_tactics`

Run the following MongoDB snippet (or MongoDB Compass / mongo shell / node script):

```javascript
db.crm_tactics.insertOne({
  code: "T31",
  name: "Value-Added Green Freight / ESG Incentive",
  stage: "Solution & Proposal",  // One of: 'Discovery', 'Solution & Proposal', 'Negotiation & Closing', 'Expansion & Strategic'
  description: "Pitching lower-emission logistics routing and green certifications to multinational enterprise shippers.",
  sort_order: 31,
  is_active: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
```

### Step B: Configure Business Line Fits (★ Star Ratings) in `crm_tactic_line_fits`

For each business line where T31 is particularly recommended (starred ★), insert fit records. The system supports both playbook 2-letter codes and Suraj Group familiar line names:

```javascript
const linesWithStar = [
  { code: "FF", familiar: "freight forwarding" },
  { code: "CC", familiar: "customs clearance" },
  { code: "CT", familiar: "transportation" }
];

const fitsToInsert = [];
for (const line of linesWithStar) {
  fitsToInsert.push({
    tactic_code: "T31",
    business_line: line.code,
    is_starred: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  fitsToInsert.push({
    tactic_code: "T31",
    business_line: line.familiar,
    is_starred: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

db.crm_tactic_line_fits.insertMany(fitsToInsert);
```

---

## 3. Immediate Behavior in the CRM

Once inserted into MongoDB:

1. **New Deal Forms & Tactic Selector**:
   - `GET /api/crm/tactics` immediately returns T31 grouped under the specified stage ("Solution & Proposal").
   - The multi-select tactic selector in the Deal creation modal, deal detail view, and duplicate deal modal displays T31 with its description and star badge (★) for recommended lines.

2. **Deal Closure Validation (Rules R3 & R4)**:
   - When a deal tagged with T31 transitions to **Won** or **Lost**, the validation service dynamically detects that T31 is attached and enforces an outcome (`Worked`, `Did not work`, or `Not used`) plus a 1-line result note.

3. **Analytics & Reports (Rule R7)**:
   - T31 automatically appears in the **Sales Tactics Playbook Analytics** tab:
     - **By Tactic**: T31 row appears with deals tagged, won/lost counts, win rate %, and worked rate %.
     - **Tactic × Line Matrix**: A new row for T31 appears across all 9 business lines.
     - **CSV Export**: Automatically includes T31 without modification.

---

## 4. Deactivating or Renaming a Tactic

- **Deactivate**: Set `{ is_active: false }` on the `crm_tactics` document. It will no longer appear as an option for new deals, but historical deals and reports retain full integrity (Rule R2).
- **Update Name/Description**: Update `{ name: "...", description: "..." }` on the `crm_tactics` document.
