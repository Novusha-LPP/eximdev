export const KPI_BLOCKER_CATEGORIES = [
    {
        name: "IT & INFRASTRUCTURE",
        blockers: [
            "Internet / Network Issues",
            "System / PC Problems",
            "PC Shortage",
            "Software Issues (Roboflow, VGG, Design Software)",
            "EXIM / DGFT Upload Failures",
            "Second Logisys ID Needed",
            "Automatic Entries Done from Single ID"
        ]
    },
    {
        name: "DOCUMENTATION & COMPLIANCE",
        blockers: [
            "Improper Documentation",
            "Document Delays from Parties",
            "Pending Original Documents",
            "Late Custom Duty",
            "Late Filing",
            "OBL Release After 3:30–4:30 PM",
            "SIMS / NFMIMS Copy Delays"
        ]
    },
    {
        name: "OPERATIONS & LOGISTICS",
        blockers: [
            "Late D.O. Planning",
            "Transport / Courier Delays",
            "Weightment Issues",
            "Container Gate-In After Office Hours",
            "Export Shipment Affected During Absence",
            "Majority Work in Logisys — Single ID Bottleneck"
        ]
    },
    {
        name: "MANPOWER & HR",
        blockers: [
            "Operators on Leave / Manpower Shortage",
            "Field Boy Strength — Needs +2 More",
            "Office Boy Strength — Needs +1 More",
            "HOD Unavailability",
            "Miscellaneous Work (O/S Follow-up) Consuming Productive Time",
            "Support Needed from HOD, Export & FF Team for O/S Collection"
        ]
    },
    {
        name: "COMMUNICATION & BEHAVIOR",
        blockers: [
            "Rude Behavior Between Team Members",
            "Inter-Team Conflicts & Heated Arguments",
            "No Landline — Communication Gap",
            "Delay in Response to Queries / Emails"
        ]
    },
    {
        name: "PROCESS & EFFICIENCY",
        blockers: [
            "Overchecking / Duplicate Entries",
            "ETA-Based Shipment Allocation Missing",
            "Content Pipeline Exhaustion",
            "Power Cuts & Odoo Issues",
            "Miscellaneous Work Blocking Core Tasks"
        ]
    },
    {
        name: "FINANCIAL & PARTY MANAGEMENT",
        blockers: [
            "Approval & Vendor Delays",
            "Late Fund for Customs Duty",
            "Maximum Advance from Parties",
            "O/S Collection Pending"
        ]
    }
];

export const OTHER_BLOCKER = "OTHERS: Others";
export const ALL_BLOCKERS = [
    ...KPI_BLOCKER_CATEGORIES.flatMap(cat => cat.blockers.map(b => `${cat.name}: ${b}`)),
    OTHER_BLOCKER
];
export const BUSINESS_LOSS_CATEGORIES = [
    {
        name: "TRANSPORTATION",
        losses: [
            { type: "Cargo Shortage in Transit", description: "Goods dispatched but quantity short at destination; weight/count difference", triggers: "Delivery receipt shows less qty; driver signature missing" },
            { type: "Cargo Damage in Transit", description: "Physical damage to goods during road/rail/air movement", triggers: "Consignee raises damage claim; accident; mishandling" },
            { type: "Pilferage / Theft of Cargo", description: "Partial or full theft during transit or at transit point", triggers: "Night transit, multiple transshipment, open truck" },
            { type: "Wrong Delivery – Re-delivery Cost", description: "Goods delivered to wrong consignee requiring return and re‑delivery", triggers: "Incorrect LR address; driver error" },
            { type: "Vehicle Detention Charges", description: "Truck held beyond free loading/unloading hours", triggers: "Factory delay, port congestion, slow clearance" },
            { type: "Container Demurrage at Port/ICD", description: "Container not returned within free days", triggers: "Customs hold, delayed clearance" },
            { type: "Railway Wagon Detention", description: "Railway wagon not released within permissible time", triggers: "Loading delay, siding congestion" },
            { type: "Traffic / Overloading Fine", description: "Fine for overloaded vehicle or invalid permits", triggers: "Random RTO checking" },
            { type: "GST E‑Way Bill Penalty", description: "Penalty for expired or incorrect e‑way bill", triggers: "EWB expired or vehicle change not updated" },
            { type: "Permit / State Entry Violation", description: "Fine for movement without valid permit", triggers: "Inter‑state checking" }
        ]
    },
    {
        name: "IMPORT",
        losses: [
            { type: "Customs Penalty – Misdeclaration", description: "Penalty due to wrong value, quantity or HS code in Bill of Entry", triggers: "Customs audit detects mismatch" },
            { type: "Excess Duty Paid – Refund Lapsed", description: "Excess customs duty paid but refund not claimed in time", triggers: "Wrong assessment or missed deadline" },
            { type: "Anti‑Dumping Duty Surprise", description: "ADD imposed during shipment not planned in costing", triggers: "Government notification after order" },
            { type: "Warehousing Duty Interest", description: "Bonded goods stored beyond allowed period", triggers: "Delayed clearance" },
            { type: "Port Demurrage", description: "Container remains at port beyond free days", triggers: "Customs hold or document delay" },
            { type: "CFS Storage Charges", description: "Cargo stored beyond free storage at CFS", triggers: "Inspection delays" },
            { type: "Short Landing", description: "Received quantity less than BL quantity", triggers: "Packing error or port theft" },
            { type: "Quality Rejection", description: "Imported goods fail QC and require rework", triggers: "Supplier quality issue" }
        ]
    },
    {
        name: "EXPORT",
        losses: [
            { type: "CN – Price Reduction Claim", description: "Buyer requests credit note due to market price drop", triggers: "Price protection clause" },
            { type: "CN – Quality Claim", description: "Buyer rejects goods for quality defect", triggers: "QC failure at destination" },
            { type: "Short Shipment Adjustment", description: "Invoice quantity more than shipped", triggers: "Packing error" },
            { type: "Cargo Rejection", description: "Buyer refuses cargo", triggers: "Severe quality issue" },
            { type: "Late Shipment Penalty", description: "Buyer deducts penalty for delayed shipment", triggers: "Production delay or missed vessel" },
            { type: "Forex Loss", description: "Exchange rate fluctuation reduces realisation", triggers: "Payment delay" },
            { type: "Duty Drawback Lapse", description: "Export incentive not claimed in time", triggers: "Late filing" }
        ]
    },
    {
        name: "DGFT",
        losses: [
            { type: "EPCG Export Obligation Shortfall", description: "Export obligation under EPCG licence not met", triggers: "Lower export orders" },
            { type: "BG Encashment", description: "Bank guarantee invoked due to non‑compliance", triggers: "Delay in filing EODC" },
            { type: "Advance Authorisation Default", description: "Export obligation not completed for AA licence", triggers: "Production failure" },
            { type: "RoDTEP Scrip Expiry", description: "Generated RoDTEP credit expires unused", triggers: "No tracking of validity" },
            { type: "DGFT Compounding Fee", description: "Violation of FTP settled through penalty", triggers: "Licence misuse" }
        ]
    },
    {
        name: "ACCOUNTS",
        losses: [
            { type: "Bad Debt Write‑off", description: "Customer payment not received and written off", triggers: "Customer insolvency" },
            { type: "Doubtful Debt Provision", description: "Outstanding receivable becomes unrecoverable", triggers: "Long overdue invoices" },
            { type: "Advance to Supplier Lost", description: "Advance paid but goods not delivered", triggers: "Supplier default" },
            { type: "Credit Note Issued to Customer", description: "Price reduction or dispute settlement", triggers: "Commercial adjustment" },
            { type: "GST ITC Reversal", description: "Input tax credit reversed due to compliance rules", triggers: "Mixed use supplies" },
            { type: "GST ITC Lapse", description: "Supplier not filed return; ITC not available", triggers: "GSTR‑2B mismatch" },
            { type: "GST Interest", description: "Interest paid for late GST payment", triggers: "Cash flow issue" },
            { type: "Excess Bank Charges", description: "Unexpected LC/BG or banking fees", triggers: "LC amendments" },
            { type: "Stock Write‑off", description: "Physical stock less than book stock", triggers: "Damage, theft, counting error" }
        ]
    }
];

export const OTHER_BUSINESS_LOSS = "OTHERS: Others";
export const ALL_BUSINESS_LOSS_TYPES = [
    ...BUSINESS_LOSS_CATEGORIES.flatMap(cat => cat.losses.map(l => `${cat.name}: ${l.type}`)),
    OTHER_BUSINESS_LOSS
];
