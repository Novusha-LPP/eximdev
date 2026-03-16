# CRM UI Flow & Architecture Documentation

## 1. CRM UI Flow & Pipeline Architecture

```mermaid
graph TD
    A[Login Page] -->|Authenticated| B{User Role}
    B -->|Sales Team| C[CRM Module<br/>CRMModule.jsx]
    B -->|End User| D[Customer KYC<br/>CustomerKyc.js]
    
    C --> C1[CRM Dashboard<br/>CRMDashboard.jsx]
    C1 -->|Tab Navigation| C2[Suspects Tab]
    C1 -->|Tab Navigation| C3[Prospects Tab]
    C1 -->|Tab Navigation| C4[Customers Tab]
    
    C2 -->|View & Manage| C2A["SuspectList.jsx<br/>- Draft records<br/>- 4 required fields"]
    C2A -->|Create New| C2B["AddSuspectKYC.jsx<br/>- Quick Add<br/>- Name, IEC, Category, Status"]
    C2A -->|Edit| C2C["EditProspectKYC.jsx<br/>- Full form editor<br/>- All fields available"]
    C2B -->|Submit| E["STAGE 1: SUSPECT<br/>Draft = True<br/>Status = Draft"]
    C2C -->|Submit| E
    
    E -->|Validation<br/>Address + Contacts<br/>+ PAN + IEC| F["STAGE 2: PROSPECT<br/>Draft = False<br/>Approval = Pending"]
    
    C3 -->|Review & Approve| C3A["ProspectList.jsx<br/>- Pending approval queue<br/>- With filters & search"]
    C3A -->|Edit| C3B["EditProspectKYC.jsx<br/>- Full editing<br/>- Multi-section form"]
    C3A -->|Actions| C3C["Approve / Revise<br/>Send Back / Escalate"]
    C3C -->|Approved By Admin| G["Admin Approved<br/>Approval = Approved"]
    C3C -->|Escalated| H["Escalated to HOD<br/>Approval = Pending HOD"]
    H -->|HOD Reviews| H1["HOD Approval<br/>Approval = Approved by HOD"]
    G --> I["STAGE 3: CUSTOMER<br/>Approved Status<br/>Operations Ready"]
    H1 --> I
    C3C -->|Send for Revision| F
    
    C4 -->|View Approved| C4A["CustomerList.jsx<br/>- All approved customers<br/>- Active accounts"]
    C4A -->|View Profile| C4B["CompleteCustomerKYC.jsx<br/>- Full customer details<br/>- Read-only view"]
    C4B -->|Manage| C4C["Open Points<br/>Compliance Tracking"]
    I --> C4A
    
    D -.->|New Application| D1["CustomerKycForm.js<br/>- Self-service form<br/>- Step-by-step"]
    D --> D2["Dashboard Navigation"]
    D2 -->|View| D3["ViewCustomerKyc.js<br/>- Submitted KYCs<br/>- Status tracking"]
    D2 -->|Edit Drafts| D4["ViewDrafts.js<br/>- Draft applications<br/>- Save & continue"]
    D2 -->|Completed| D5["CompletedKyc.js<br/>- Approved KYCs<br/>- Confirmations"]
    D2 -->|Revise| D6["ReviseCustomerKyc.js<br/>- Feedback incorporation<br/>- Resubmit"]
    D3 --> F
    D1 --> E
    
    style E fill:#fff3cd
    style F fill:#fff3cd
    style G fill:#d4edda
    style H fill:#cfe2ff
    style H1 fill:#d4edda
    style I fill:#d4edda
    style A fill:#e2e3e5
    style B fill:#e2e3e5
    style C fill:#007bff
    style D fill:#28a745
```

---

## 2. CRM Pipeline: 3-Stage Conversion Flow with Validation

```mermaid
graph LR
    subgraph STAGE1 ["📋 STAGE 1: SUSPECT (Draft)"]
        S1["Quick Entry<br/>4 Required Fields:<br/>• Name<br/>• IEC<br/>• Category<br/>• Status"]
        S1 -->|Status: DRAFT| S1A["Record State:<br/>draft = true<br/>approval = pending"]
    end
    
    subgraph VALIDATION ["✅ VALIDATION GATE"]
        V["Must Complete:<br/>✓ Address<br/>✓ Contact Person<br/>✓ PAN Document<br/>✓ IEC Document<br/>✓ Basic KYC Info"]
    end
    
    subgraph STAGE2 ["📊 STAGE 2: PROSPECT (Under Review)"]
        S2["Pending Approval<br/>Record State:<br/>draft = false<br/>approval = Pending"]
        S2 -->|Admin Review| S2A["Admin Actions:<br/>• Approve<br/>• Send for Revision<br/>• Escalate to HOD"]
        S2A -->|Approved| S2B["✓ Approved By Admin"]
        S2A -->|Escalated| S2C["⬆ Escalated to HOD<br/>for final review"]
        S2C -->|HOD Approves| S2D["✓ Approved By HOD"]
    end
    
    subgraph STAGE3 ["🎯 STAGE 3: CUSTOMER (Active)"]
        S3["Full Customer Account<br/>Record State:<br/>draft = false<br/>approval = Approved/Approved by HOD"]
        S3 -->|Operational Access| S3A["Full Features:<br/>• View Complete Profile<br/>• Open Points Management<br/>• Branch Management<br/>• Bank Accounts<br/>• Multi-location Support<br/>• Document Management<br/>• Credit Terms"]
    end
    
    S1A -->|Submit & Pass| V
    V -->|Entry| S2
    S2B --> STAGE3
    S2D --> STAGE3
    S2A -->|Revision Needed| STAGE1
    
    style STAGE1 fill:#fff3cd,stroke:#ffc107
    style VALIDATION fill:#ffe5e5,stroke:#dc3545
    style STAGE2 fill:#d1ecf1,stroke:#17a2b8
    style STAGE3 fill:#d4edda,stroke:#28a745
```

---

## 3. CRM Component Architecture & Data Flow

```mermaid
graph TB
    subgraph ROOT["🏠 ROOT: CRMModule.jsx"]
        TABS["Tab Navigation:<br/>Suspects | Prospects | Customers"]
    end
    
    subgraph SUSPECT_FLOW["📝 SUSPECT MANAGEMENT"]
        SL["SuspectList.jsx<br/>Display & Manage"]
        AS["AddSuspectKYC.jsx<br/>Quick 4-field add"]
        EP["EditProspectKYC.jsx<br/>Full form editor"]
        SL -->|Create| AS
        SL -->|Edit| EP
    end
    
    subgraph PROSPECT_FLOW["📋 PROSPECT MANAGEMENT"]
        PL["ProspectList.jsx<br/>Queue awaiting approval"]
        PL -->|Edit| EP2["EditProspectKYC.jsx<br/>Full editing"]
        PL -->|Review & Act| PA["Admin Actions:<br/>Approve / Revise<br/>/ Escalate"]
    end
    
    subgraph CUSTOMER_FLOW["🎯 CUSTOMER MANAGEMENT"]
        CL["CustomerList.jsx<br/>All approved accounts"]
        CCK["CompleteCustomerKYC.jsx<br/>Full profile view"]
        CL -->|View| CCK
        CCK -->|Manage| OP["OpenPoints.jsx<br/>Compliance tracking"]
    end
    
    subgraph SHARED_COMPONENTS["🔧 SHARED SUB-COMPONENTS"]
        AF["AddressForm.jsx<br/>Address Entry"]
        BAM["BankAccountManager.jsx<br/>Multiple bank accounts"]
        BRM["BranchManager.jsx<br/>Branch management"]
        CM["ContactManager.jsx<br/>Contact persons"]
        FM["FactoryAddressManager.jsx<br/>Multi-location + GST"]
        FU["FileUpload.jsx<br/>Document upload"]
        SB["StatusBadge.jsx<br/>Status display"]
    end
    
    subgraph HOOKS["🪝 CUSTOM HOOKS"]
        KC["useKyc.js<br/>KYC data management"]
        FUH["useFileUpload.js<br/>File operations"]
    end
    
    subgraph BACKEND["🔌 API CALLS"]
        API["REST API Endpoints<br/>Create / Read / Update<br/>Approve / Reject<br/>File Upload"]
    end
    
    subgraph DATA["📦 DATA LAYER"]
        DB["MongoDB Collection:<br/>CustomerKyc Schema"]
    end
    
    ROOT --> TABS
    TABS -->|Tab 1| SUSPECT_FLOW
    TABS -->|Tab 2| PROSPECT_FLOW
    TABS -->|Tab 3| CUSTOMER_FLOW
    
    AS -.->|Uses| AF
    EP -.->|Uses| AF
    EP -.->|Uses| BAM
    EP -.->|Uses| BRM
    EP -.->|Uses| CM
    EP -.->|Uses| FM
    EP -.->|Uses| FU
    EP2 -.->|Uses| AF
    EP2 -.->|Uses| BAM
    EP2 -.->|Uses| BRM
    EP2 -.->|Uses| CM
    EP2 -.->|Uses| FM
    EP2 -.->|Uses| FU
    CCK -.->|Uses| AF
    CCK -.->|Uses| BAM
    CCK -.->|Uses| BRM
    CCK -.->|Uses| CM
    CCK -.->|Uses| FM
    CCK -.->|Uses| OP
    
    SL -.->|Uses| KC
    AS -.->|Uses| KC
    EP -.->|Uses| KC
    PL -.->|Uses| KC
    EP2 -.->|Uses| KC
    CL -.->|Uses| KC
    CCK -.->|Uses| KC
    
    FU -.->|Uses| FUH
    
    AF -.->|Display| SB
    PA -.->|Uses| SB
    CL -.->|Uses| SB
    
    KC -->|Calls| API
    FUH -->|Calls| API
    API -->|Query/Update| DB
    
    style ROOT fill:#007bff,color:#fff
    style SUSPECT_FLOW fill:#fff3cd,stroke:#ffc107
    style PROSPECT_FLOW fill:#d1ecf1,stroke:#17a2b8
    style CUSTOMER_FLOW fill:#d4edda,stroke:#28a745
    style SHARED_COMPONENTS fill:#f8f9fa,stroke:#6c757d
    style HOOKS fill:#e7e8ea,stroke:#495057
    style BACKEND fill:#dc3545,color:#fff
    style DATA fill:#6c757d,color:#fff
```

---

## Summary Tables

### CRM Stages Overview

| Stage | Name | Status | Key Characteristics |
|-------|------|--------|-------------------|
| 1 | **SUSPECT** | Draft | 4 required fields only, `draft = true` |
| 2 | **PROSPECT** | Pending Approval | Validation gates passed, awaiting admin review |
| 3 | **CUSTOMER** | Approved | Full access, operations ready |

### Component Files & Locations

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Main Module | `client/src/components/crm/CRMModule.jsx` | Entry point with tab navigation |
| Dashboard | `client/src/components/crm/CRMDashboard.jsx` | Pipeline overview & metrics |
| Suspect List | `client/src/components/crm/SuspectList.jsx` | Display drafted leads |
| Add Suspect | `client/src/components/crm/AddSuspectKYC.jsx` | Quick 4-field entry |
| Prospect List | `client/src/components/crm/ProspectList.jsx` | Approval queue |
| Edit Form | `client/src/components/crm/EditProspectKYC.jsx` | Full multi-section editor |
| Customer List | `client/src/components/crm/CustomerList.jsx` | Approved customers |
| Customer View | `client/src/components/crm/CompleteCustomerKYC.jsx` | Full profile view |

### Validation Gates

Records must pass these validation rules to move from **Suspect → Prospect**:

- ✅ **Address**: Permanent OR Principal address required
- ✅ **Contact Person**: Name, Designation, Phone, Email
- ✅ **PAN Document**: Uploaded & verified
- ✅ **IEC Document**: Uploaded & verified
- ✅ **Basic KYC Info**: All mandatory fields completed

### Approval Workflow

1. **Admin Review**: Can approve or send for revision
2. **HOD Escalation**: For high-value or complex cases
3. **Final Approval**: Either admin or HOD authorization required
4. **Revision Loop**: Send back to prospect stage for corrections

### Key Features by Stage

#### Suspect Stage
- Quick entry with 4 fields
- Draft save functionality
- Can edit before submission

#### Prospect Stage
- Multi-section detailed form
- Document attachment
- Admin review & decision making
- Escalation options

#### Customer Stage
- Read-only complete profile
- Open points management
- Multi-location support
- Bank account management
- Document history
- Credit terms & limits

---

## User Interfaces

### Sales Team Interface (CRM Module)
- Access: `CRMModule.jsx`
- Views: Dashboard → Suspects → Prospects → Customers
- Actions: Create, Edit, Approve, Escalate, Track

### Customer Interface (KYC Portal)
- Access: `CustomerKyc.js`
- Views: Dashboard → Forms → Submissions → Status
- Actions: Apply, Draft, Edit, Resubmit, Track Status
