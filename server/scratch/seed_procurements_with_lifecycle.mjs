import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import ProcurementRequest from "../model/it-helpdesk/procurementModel.mjs";
import ITUnifiedAsset from "../model/it-helpdesk/unifiedAssetModel.mjs";
import ItVendor from "../model/it-helpdesk/vendorModel.mjs";

const MONGO_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/eximNew";

async function main() {
  console.log("Connecting to MongoDB:", MONGO_URI);
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected successfully to", mongoose.connection.name);

  // 1. Fetch or create sample vendors
  let vendorDell = await ItVendor.findOne({ vendor_name: /dell/i });
  if (!vendorDell) {
    vendorDell = await ItVendor.create({
      vendor_code: "VND-DELL-001",
      vendor_name: "Dell Technologies India Pvt Ltd",
      contact_person: "Rohit Verma",
      email: "rohit.verma@dell.com",
      phone: "+91 98200 11223",
      city: "Mumbai",
      gstin: "27AAACD1234F1Z5",
      status: "Active",
    });
  }

  let vendorCisco = await ItVendor.findOne({ vendor_name: /cisco|nettech/i });
  if (!vendorCisco) {
    vendorCisco = await ItVendor.create({
      vendor_code: "VND-CISCO-002",
      vendor_name: "NetTech Solutions & Networks",
      contact_person: "Amit Shah",
      email: "amit@nettechsolutions.in",
      phone: "+91 98250 44556",
      city: "Baroda",
      gstin: "24AABCN5678K1Z9",
      status: "Active",
    });
  }

  let vendorLenovo = await ItVendor.findOne({ vendor_name: /lenovo/i });
  if (!vendorLenovo) {
    vendorLenovo = await ItVendor.create({
      vendor_code: "VND-LNV-003",
      vendor_name: "Lenovo Commercial Direct",
      contact_person: "Sneha Patel",
      email: "sneha.patel@lenovo.com",
      phone: "+91 98980 99887",
      city: "Ahmedabad",
      gstin: "24AACCL9988P1Z2",
      status: "Active",
    });
  }

  // Clear previous test PRs to ensure a fresh, consistent seed
  const prNumbers = [
    "PR-2026-001",
    "PR-2026-002",
    "PR-2026-003",
    "PR-2026-004",
    "PR-2026-005",
    "PR-2026-006",
  ];
  await ProcurementRequest.deleteMany({ pr_number: { $in: prNumbers } });
  await ITUnifiedAsset.deleteMany({ procurement_ref: "PR-2026-006" });
  console.log("Cleared old test PR entries for clean seed.");

  // ── SEED PR 1: Stage 1 — Quotation Pending (Draft/New) ──────────────────────
  const pr1 = await ProcurementRequest.create({
    pr_number: "PR-2026-001",
    request_date: new Date(Date.now() - 4 * 86400000),
    required_by_date: new Date(Date.now() + 10 * 86400000),
    requested_by: {
      name: "Ravi Sharma",
      email: "ravi.sharma@alvision.in",
      department: "Export Operations",
    },
    branch: "Baroda ICD",
    item_details: {
      item_name: "High-Performance Workstations for Export Documentation",
      category: "Computer / Desktop",
      quantity: 3,
      estimated_budget: 210000,
      budget_head: "IT CapEx",
      priority: "High",
      justification: "Existing 7-year old Core i3 systems freezing during heavy EDI filing and customs clearance.",
      specifications: {
        processor: "Intel Core i7 13th Gen",
        ram: "32 GB DDR5",
        storage: "1 TB NVMe SSD",
        graphics: "Dedicated 4GB GPU",
      },
    },
    current_stage: 1,
    overall_status: "Quotation Pending",
    workflow_history: [
      {
        stage: 1,
        action: "Purchase Request Submitted",
        performed_by: "Ravi Sharma",
        role: "Export Manager",
        remarks: "Urgent requisition for smooth EDI filing.",
      },
    ],
  });
  console.log("Seeded PR-2026-001: Stage 1 (Quotation Pending)");

  // ── SEED PR 2: Stage 2 — Quotations Uploaded (Multi-vendor quotes) ──────────
  const pr2 = await ProcurementRequest.create({
    pr_number: "PR-2026-002",
    request_date: new Date(Date.now() - 3 * 86400000),
    required_by_date: new Date(Date.now() + 7 * 86400000),
    requested_by: {
      name: "Karan Joshi",
      email: "karan.joshi@alvision.in",
      department: "IT Network",
    },
    branch: "Mundra Port",
    item_details: {
      item_name: "Cisco Catalyst 24-Port Gigabit PoE Managed Switch",
      category: "Network Device",
      quantity: 1,
      estimated_budget: 65000,
      budget_head: "IT Infrastructure",
      priority: "Normal",
      justification: "Port expansion for newly deployed IP surveillance cameras in Mundra ICD yard.",
      specifications: {
        ports: "24 x 10/100/1000 PoE+ Ports",
        poe_budget: "370W",
        uplink: "4 x 10G SFP+ Uplinks",
      },
    },
    quotations: [
      {
        quotation_no: "QTN-NETTECH-881",
        vendor_id: vendorCisco._id,
        vendor_name: vendorCisco.vendor_name,
        total_amount: 62500,
        warranty_period: "3 Years ProSupport",
        delivery_days: 4,
        payment_terms: "30 Days Credit",
        file_url: "https://exim-images-p1.s3.ap-south-1.amazonaws.com/it-procurement/sample_quote1.pdf",
        is_recommended_by_it: true,
        notes: "Authorized Cisco Tier-1 distributor with direct OEM on-site replacement warranty.",
      },
      {
        quotation_no: "QTN-CYBER-092",
        vendor_name: "CyberByte Networks Surat",
        total_amount: 64000,
        warranty_period: "2 Years Standard",
        delivery_days: 7,
        payment_terms: "15 Days Credit",
        file_url: "https://exim-images-p1.s3.ap-south-1.amazonaws.com/it-procurement/sample_quote2.pdf",
        notes: "Includes free rack-mount bracket kit.",
      },
      {
        quotation_no: "QTN-INFRA-334",
        vendor_name: "InfraWorld Comms Mumbai",
        total_amount: 67800,
        warranty_period: "3 Years Standard",
        delivery_days: 5,
        payment_terms: "50% Advance",
        file_url: "https://exim-images-p1.s3.ap-south-1.amazonaws.com/it-procurement/sample_quote3.pdf",
        notes: "Higher rate due to air freight charges.",
      },
    ],
    current_stage: 2,
    overall_status: "Quotation Pending",
    workflow_history: [
      {
        stage: 1,
        action: "Purchase Request Created",
        performed_by: "Karan Joshi",
        role: "Network Engineer",
      },
      {
        stage: 2,
        action: "3 Competitive Quotations Uploaded",
        performed_by: "Vikas Chandra",
        role: "IT Desk",
        remarks: "Uploaded 3 vendor quotes for comparative technical evaluation.",
      },
    ],
  });
  console.log("Seeded PR-2026-002: Stage 2 (Quotations Uploaded)");

  // ── SEED PR 3: Stage 4 — HOD Approval Pending (IT Evaluated) ────────────────
  const pr3 = await ProcurementRequest.create({
    pr_number: "PR-2026-003",
    request_date: new Date(Date.now() - 2 * 86400000),
    required_by_date: new Date(Date.now() + 5 * 86400000),
    requested_by: {
      name: "Pooja Mehta",
      email: "pooja.mehta@alvision.in",
      department: "Documentation & Branding",
    },
    branch: "Head Office",
    item_details: {
      item_name: "MacBook Pro M3 Max 36GB for Digital Portals & Creative",
      category: "Laptop",
      quantity: 1,
      estimated_budget: 250000,
      budget_head: "IT CapEx",
      priority: "Normal",
      justification: "Required for corporate marketing, high-res EXIM documentation layouts, and web development.",
      specifications: {
        processor: "Apple M3 Max 14-core CPU",
        ram: "36 GB Unified Memory",
        storage: "1 TB SSD",
        display: "16-inch Liquid Retina XDR",
      },
    },
    quotations: [
      {
        quotation_no: "QTN-UNICORN-551",
        vendor_name: "Unicorn Apple Premium Reseller",
        total_amount: 244900,
        warranty_period: "1 Year AppleCare+",
        delivery_days: 2,
        payment_terms: "Immediate Bank Transfer",
        file_url: "https://exim-images-p1.s3.ap-south-1.amazonaws.com/it-procurement/sample_quote_apple.pdf",
        is_recommended_by_it: true,
        notes: "Authorized Apple corporate discount applied (₹5,100 off MRP).",
      },
      {
        quotation_no: "QTN-RELIANCE-991",
        vendor_name: "Reliance Digital Enterprise",
        total_amount: 248000,
        warranty_period: "1 Year Standard",
        delivery_days: 4,
        payment_terms: "100% Advance",
        file_url: "https://exim-images-p1.s3.ap-south-1.amazonaws.com/it-procurement/sample_quote_apple2.pdf",
        notes: "Standard retail quote without corporate SLA.",
      },
    ],
    it_evaluation: {
      evaluated_by: "Vikas Chandra",
      evaluated_at: new Date(Date.now() - 1 * 86400000),
      decision: "Approved",
      recommended_vendor: "Unicorn Apple Premium Reseller",
      recommended_quote_no: "QTN-UNICORN-551",
      remarks: "Unicorn is official enterprise partner with free on-site setup and lower pricing.",
    },
    first_approval: {
      approver_username: "shalini_arun",
      approver_name: "Shalini Arun",
      decision: "Pending",
    },
    current_stage: 4,
    overall_status: "HOD Approval Pending",
    workflow_history: [
      {
        stage: 1,
        action: "Purchase Request Submitted",
        performed_by: "Pooja Mehta",
        role: "Creative Head",
      },
      {
        stage: 2,
        action: "Multi-Vendor Quotations Received",
        performed_by: "Vikas Chandra",
      },
      {
        stage: 3,
        action: "IT Technical Evaluation Approved",
        performed_by: "Vikas Chandra",
        role: "IT Manager",
        remarks: "Recommended Unicorn Apple Reseller.",
      },
    ],
  });
  console.log("Seeded PR-2026-003: Stage 4 (HOD Approval Pending)");

  // ── SEED PR 4: Stage 6 — PO Created ─────────────────────────────────────────
  const pr4 = await ProcurementRequest.create({
    pr_number: "PR-2026-004",
    request_date: new Date(Date.now() - 5 * 86400000),
    requested_by: {
      name: "Ramesh Dave",
      email: "ramesh.dave@alvision.in",
      department: "Accounts",
    },
    branch: "Baroda ICD",
    item_details: {
      item_name: "HP LaserJet Enterprise MFP 500 Network Heavy-Duty Printer",
      category: "Printer",
      quantity: 1,
      estimated_budget: 80000,
      budget_head: "IT Office Equipment",
      priority: "Normal",
      justification: "High-volume invoice and shipping bill printing (over 5,000 pages/month).",
      specifications: {
        type: "Monochrome Laser All-in-One",
        speed: "45 ppm",
        duplex: "Automatic Two-Sided",
        connectivity: "Gigabit Ethernet & AirPrint",
      },
    },
    quotations: [
      {
        quotation_no: "QTN-HP-2026-01",
        vendor_name: "HP India Commercial Partners",
        total_amount: 76500,
        warranty_period: "3 Years Onsite",
        delivery_days: 5,
        payment_terms: "30 Days Credit",
        is_recommended_by_it: true,
        is_selected_by_gm: true,
      },
      {
        quotation_no: "QTN-OFFICE-88",
        vendor_name: "OfficePro Vadodara",
        total_amount: 79000,
        warranty_period: "1 Year Standard",
        delivery_days: 3,
      },
    ],
    it_evaluation: {
      evaluated_by: "Vikas Chandra",
      evaluated_at: new Date(Date.now() - 4 * 86400000),
      decision: "Approved",
      recommended_vendor: "HP India Commercial Partners",
      recommended_quote_no: "QTN-HP-2026-01",
      remarks: "HP quote includes 3 years full onsite warranty and 2 complimentary toner cartridges.",
    },
    first_approval: {
      approver_username: "shalini_arun",
      approver_name: "Shalini Arun",
      decision: "Approved",
      approved_amount: 76500,
      approval_date: new Date(Date.now() - 3 * 86400000),
      remarks: "Approved for Accounts Dept invoice counter.",
    },
    final_approval: {
      approver_username: "manu_pillai",
      approver_name: "Manu Pillai",
      decision: "Approved",
      selected_vendor: "HP India Commercial Partners",
      selected_quote_no: "QTN-HP-2026-01",
      final_approved_amount: 76500,
      approval_date: new Date(Date.now() - 2 * 86400000),
      remarks: "Best commercial terms with 3-year warranty. Release PO.",
    },
    purchase_order: {
      po_number: "PO-2026-004",
      po_date: new Date(Date.now() - 1 * 86400000),
      po_amount: 76500,
      po_file_url: "https://exim-images-p1.s3.ap-south-1.amazonaws.com/it-procurement/sample_po_004.pdf",
      expected_delivery: new Date(Date.now() + 4 * 86400000),
      created_by: "Procurement Desk",
      notes: "Delivery to Baroda ICD Accounts Dept, Ground Floor.",
    },
    current_stage: 6,
    overall_status: "PO Created",
    workflow_history: [
      { stage: 1, action: "PR Created", performed_by: "Ramesh Dave" },
      { stage: 3, action: "IT Evaluated", performed_by: "Vikas Chandra" },
      { stage: 4, action: "HOD Approved", performed_by: "Shalini Arun" },
      { stage: 5, action: "GM Approved & Vendor Selected", performed_by: "Manu Pillai" },
      { stage: 6, action: "Purchase Order Issued: PO-2026-004", performed_by: "Procurement Desk" },
    ],
  });
  console.log("Seeded PR-2026-004: Stage 6 (PO Created)");

  // ── SEED PR 5: Stage 10 — Invoice Verification (GRN Done) ───────────────────
  const pr5 = await ProcurementRequest.create({
    pr_number: "PR-2026-005",
    request_date: new Date(Date.now() - 8 * 86400000),
    requested_by: {
      name: "Deepak Chauhan",
      email: "deepak.chauhan@alvision.in",
      department: "Security & Safety",
    },
    branch: "Khadoyar Yard",
    item_details: {
      item_name: "CP PLUS 32-Channel 4K NVR + 16x Outdoor Bullet Cameras",
      category: "Network Device",
      quantity: 1,
      estimated_budget: 150000,
      budget_head: "Yard Security Infrastructure",
      priority: "Urgent",
      justification: "Mandatory Customs AEO compliance requirement for container yard perimeter monitoring.",
      specifications: {
        nvr_channels: "32-Channel 4K H.265+",
        cameras: "16 x 5MP Smart IR IP Bullet",
        storage: "2 x 6TB Surveillance HDDs",
      },
    },
    quotations: [
      {
        quotation_no: "QTN-CPPLUS-007",
        vendor_name: "CP PLUS Security Enterprise Solutions",
        total_amount: 142000,
        warranty_period: "2 Years Replacement",
        is_recommended_by_it: true,
        is_selected_by_gm: true,
      },
    ],
    it_evaluation: {
      evaluated_by: "Vikas Chandra",
      evaluated_at: new Date(Date.now() - 7 * 86400000),
      decision: "Approved",
      recommended_vendor: "CP PLUS Security Enterprise Solutions",
      recommended_quote_no: "QTN-CPPLUS-007",
    },
    first_approval: {
      approver_username: "shalini_arun",
      approver_name: "Shalini Arun",
      decision: "Approved",
      approved_amount: 142000,
      approval_date: new Date(Date.now() - 6 * 86400000),
    },
    final_approval: {
      approver_username: "manu_pillai",
      approver_name: "Manu Pillai",
      decision: "Approved",
      selected_vendor: "CP PLUS Security Enterprise Solutions",
      final_approved_amount: 142000,
      approval_date: new Date(Date.now() - 5 * 86400000),
    },
    purchase_order: {
      po_number: "PO-2026-005",
      po_date: new Date(Date.now() - 5 * 86400000),
      po_amount: 142000,
      po_file_url: "https://exim-images-p1.s3.ap-south-1.amazonaws.com/it-procurement/sample_po_005.pdf",
    },
    grn_receiving: {
      grn_number: "GRN-2026-005",
      received_date: new Date(Date.now() - 2 * 86400000),
      received_qty: 1,
      serial_numbers: ["CPP-NVR-32CH-99014", "CPP-CAM-5MP-88102"],
      inspection_status: "Accepted",
      receipt_status: "Received",
      received_by: "Prakash Patel (Yard Incharge)",
      remarks: "All 16 cameras tested OK on PoE switch, NVR firmware updated.",
    },
    invoice_details: {
      invoice_number: "INV-CPP-2026-901",
      invoice_date: new Date(Date.now() - 1 * 86400000),
      gstin: "24AACCS4321Q1Z4",
      invoice_amount: 142000,
      po_verified: true,
      grn_verified: true,
      verification_status: "Pending",
      accounts_remarks: "Tax invoice uploaded, 3-way match in progress with Accounts desk.",
    },
    current_stage: 10,
    overall_status: "Invoice Verification",
    workflow_history: [
      { stage: 1, action: "PR Created", performed_by: "Deepak Chauhan" },
      { stage: 5, action: "Approved by Management", performed_by: "Manu Pillai" },
      { stage: 6, action: "PO Issued", performed_by: "Procurement Desk" },
      { stage: 9, action: "Goods Received & Accepted (GRN-2026-005)", performed_by: "Prakash Patel" },
      { stage: 10, action: "Tax Invoice Uploaded for 3-Way Match", performed_by: "Procurement Desk" },
    ],
  });
  console.log("Seeded PR-2026-005: Stage 10 (Invoice Verification)");

  // ═════════════════════════════════════════════════════════════════════════════
  // ── COMPLETE 12-STAGE LIFECYCLE TEST: PR-2026-006 ───────────────────────────
  // ═════════════════════════════════════════════════════════════════════════════
  console.log("\n============================================================");
  console.log("STARTING FULL 12-STAGE LIFECYCLE RUN FOR PR-2026-006...");
  console.log("============================================================");

  // Stage 1: Create PR
  const pr6 = new ProcurementRequest({
    pr_number: "PR-2026-006",
    request_date: new Date(Date.now() - 10 * 86400000),
    requested_by: {
      name: "Siddharth Trivedi",
      email: "siddharth.trivedi@alvision.in",
      department: "Import Customs Clearance",
    },
    branch: "Baroda ICD",
    item_details: {
      item_name: "Lenovo ThinkPad T14 Gen 4 Business Laptop",
      category: "Laptop",
      quantity: 1,
      estimated_budget: 100000,
      budget_head: "IT CapEx",
      priority: "High",
      justification: "On-field mobile laptop for port audits and customs examination officer coordination.",
      specifications: {
        processor: "AMD Ryzen 7 PRO 7840U",
        ram: "16 GB LPDDR5x",
        storage: "512 GB PCIe 4.0 SSD",
        operating_system: "Windows 11 Pro 64",
        screen_size: "14-inch WUXGA IPS Anti-Glare",
      },
    },
    current_stage: 1,
    overall_status: "Quotation Pending",
    workflow_history: [
      {
        stage: 1,
        action: "PR Initiated",
        performed_by: "Siddharth Trivedi",
        role: "Import Supervisor",
        remarks: "Requisition for port officer audit laptop.",
      },
    ],
  });
  await pr6.save();
  console.log("✓ Stage 1 Passed: PR Created (PR-2026-006)");

  // Stage 2: Add 3 Quotations
  pr6.quotations = [
    {
      quotation_no: "QTN-LNV-T14-01",
      vendor_id: vendorLenovo._id,
      vendor_name: vendorLenovo.vendor_name,
      total_amount: 97500,
      warranty_period: "3 Years Premier Support + Accidental Damage Protection",
      delivery_days: 3,
      payment_terms: "30 Days Credit",
      file_url: "https://exim-images-p1.s3.ap-south-1.amazonaws.com/it-procurement/quote_lenovo.pdf",
      is_recommended_by_it: true,
      notes: "Official Lenovo enterprise tier pricing with 3Y ADP warranty included.",
    },
    {
      quotation_no: "QTN-INFOTECH-02",
      vendor_name: "Infotech Systems Vadodara",
      total_amount: 99000,
      warranty_period: "1 Year Standard",
      delivery_days: 2,
      payment_terms: "Immediate",
      file_url: "https://exim-images-p1.s3.ap-south-1.amazonaws.com/it-procurement/quote_infotech.pdf",
      notes: "Local reseller quote, higher price.",
    },
    {
      quotation_no: "QTN-COMPUMART-03",
      vendor_name: "CompuMart Solutions Ahmedabad",
      total_amount: 102000,
      warranty_period: "3 Years Standard",
      delivery_days: 7,
      payment_terms: "50% Advance",
      file_url: "https://exim-images-p1.s3.ap-south-1.amazonaws.com/it-procurement/quote_compumart.pdf",
      notes: "Higher quote with 7 days delivery lead time.",
    },
  ];
  pr6.current_stage = 2;
  await pr6.save();
  console.log("✓ Stage 2 Passed: 3 Multi-Vendor Quotations Logged");

  // Stage 3: IT Technical Evaluation
  pr6.it_evaluation = {
    evaluated_by: "Vikas Chandra",
    evaluated_at: new Date(Date.now() - 9 * 86400000),
    decision: "Approved",
    recommended_vendor: "Lenovo Commercial Direct",
    recommended_quote_no: "QTN-LNV-T14-01",
    remarks: "Lenovo Direct offers lowest commercial quote (₹97,500) and 3-Year ADP Premier Support.",
  };
  pr6.current_stage = 3;
  pr6.overall_status = "IT Review";
  await pr6.save();
  console.log("✓ Stage 3 Passed: IT Technical Evaluation & Recommendation");

  // Stage 4: First HOD Approval (Shalini Arun)
  pr6.first_approval = {
    approver_username: "shalini_arun",
    approver_name: "Shalini Arun",
    decision: "Approved",
    approved_amount: 97500,
    approval_date: new Date(Date.now() - 8 * 86400000),
    remarks: "Verified against Q3 IT CapEx Budget. Approved.",
  };
  pr6.current_stage = 4;
  pr6.overall_status = "HOD Approval Pending";
  await pr6.save();
  console.log("✓ Stage 4 Passed: 1st Admin / HOD Approval (Shalini Arun)");

  // Stage 5: Final GM Approval & Vendor Selection (Manu Pillai)
  pr6.quotations[0].is_selected_by_gm = true;
  pr6.final_approval = {
    approver_username: "manu_pillai",
    approver_name: "Manu Pillai",
    decision: "Approved",
    selected_vendor: "Lenovo Commercial Direct",
    selected_vendor_id: vendorLenovo._id,
    selected_quote_no: "QTN-LNV-T14-01",
    final_approved_amount: 97500,
    approval_date: new Date(Date.now() - 7 * 86400000),
    remarks: "Commercial selection approved for Lenovo ThinkPad T14. Release PO immediately.",
  };
  pr6.current_stage = 5;
  pr6.overall_status = "GM Approval Pending";
  await pr6.save();
  console.log("✓ Stage 5 Passed: Final GM Approval & Selection (Manu Pillai)");

  // Stage 6: Purchase Order Generated
  pr6.purchase_order = {
    po_number: "PO-2026-006",
    po_date: new Date(Date.now() - 6 * 86400000),
    po_amount: 97500,
    po_file_url: "https://exim-images-p1.s3.ap-south-1.amazonaws.com/it-procurement/po_2026_006.pdf",
    expected_delivery: new Date(Date.now() - 3 * 86400000),
    created_by: "Procurement Desk",
    notes: "Deliver to Baroda ICD IT Helpdesk, Attn: Siddharth Trivedi.",
  };
  pr6.current_stage = 6;
  pr6.overall_status = "PO Created";
  await pr6.save();
  console.log("✓ Stage 6 Passed: PO Generated (PO-2026-006)");

  // Stage 7: Vendor Acknowledgment
  pr6.workflow_history.push({
    stage: 7,
    action: "Vendor Acknowledged PO",
    performed_by: "Lenovo Commercial Direct (Sneha Patel)",
    remarks: "PO-2026-006 accepted. Order placed in manufacturing dispatch queue.",
  });
  pr6.current_stage = 7;
  await pr6.save();
  console.log("✓ Stage 7 Passed: Vendor Acknowledgment");

  // Stage 8: Dispatched & In-Transit
  pr6.workflow_history.push({
    stage: 8,
    action: "Goods Dispatched",
    performed_by: "BlueDart Logistics",
    remarks: "Air express consignment booked: Waybill #BLUEDART-882901844",
  });
  pr6.current_stage = 8;
  await pr6.save();
  console.log("✓ Stage 8 Passed: Dispatched with Waybill Tracking");

  // Stage 9: GRN Inward Receiving
  pr6.grn_receiving = {
    grn_number: "GRN-2026-006",
    received_date: new Date(Date.now() - 3 * 86400000),
    received_qty: 1,
    serial_numbers: ["LNV-T14-PF49A028"],
    delivery_challan_url: "https://exim-images-p1.s3.ap-south-1.amazonaws.com/it-procurement/challan_lenovo_006.pdf",
    inspection_status: "Accepted",
    receipt_status: "Received",
    received_by: "Vikas Chandra (IT)",
    remarks: "Lenovo original factory packaging sealed. Booted Windows 11 Pro successfully.",
  };
  pr6.current_stage = 9;
  pr6.overall_status = "Goods Received";
  await pr6.save();
  console.log("✓ Stage 9 Passed: Goods Received & GRN Created (GRN-2026-006)");

  // Stage 10: Physical Quality Check & Acceptance
  pr6.workflow_history.push({
    stage: 10,
    action: "Quality Check & Hardware Diagnostics",
    performed_by: "Vikas Chandra",
    role: "IT Specialist",
    remarks: "Full diagnostic scan passed: 100% battery health, screen flawless, ports verified.",
  });
  pr6.current_stage = 10;
  await pr6.save();
  console.log("✓ Stage 10 Passed: IT Hardware Diagnostics & Physical Acceptance");

  // Stage 11: Tax Invoice & Accounts 3-Way Match Verification
  pr6.invoice_details = {
    invoice_number: "INV-LNV-2026-4482",
    invoice_date: new Date(Date.now() - 2 * 86400000),
    gstin: "24AACCL9988P1Z2",
    invoice_amount: 97500,
    invoice_url: "https://exim-images-p1.s3.ap-south-1.amazonaws.com/it-procurement/invoice_lenovo_4482.pdf",
    po_verified: true,
    grn_verified: true,
    accounts_verified_by: "Kishan (Accounts Manager)",
    accounts_verified_date: new Date(Date.now() - 2 * 86400000),
    verification_status: "Verified",
    accounts_remarks: "3-Way Match Approved: PO Amount (₹97,500) == Invoice Amount (₹97,500) == GRN Qty (1 Laptop). Ready for payment.",
  };
  pr6.current_stage = 11;
  pr6.overall_status = "Payment Pending";
  await pr6.save();
  console.log("✓ Stage 11 Passed: 3-Way Match Verified by Accounts");

  // Stage 12: RTGS Payment & Auto-Bridge to Unified Asset Registry
  pr6.payment_details = {
    payment_status: "Processed",
    payment_mode: "RTGS",
    paid_amount: 97500,
    payment_date: new Date(Date.now() - 1 * 86400000),
    utr_number: "HDFCR202610170044991",
    payment_proof_url: "https://exim-images-p1.s3.ap-south-1.amazonaws.com/it-procurement/utr_receipt_44991.pdf",
    accounts_manager: "Kishan (Accounts)",
    closure_remarks: "Full payment of ₹97,500 remitted via HDFC RTGS to Lenovo Commercial Direct.",
  };

  // Determine next asset tag for registration
  const currentYear = new Date().getFullYear();
  const yearPrefix = `AST-${currentYear}-`;
  const existingAssets = await ITUnifiedAsset.find(
    { asset_tag: new RegExp(`^AST-${currentYear}-([0-9]+)$`, "i") },
    { asset_tag: 1 }
  ).lean();

  let maxSeq = 0;
  for (const item of existingAssets) {
    if (!item.asset_tag) continue;
    const match = item.asset_tag.match(new RegExp(`^AST-${currentYear}-([0-9]+)$`, "i"));
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    }
  }
  const nextAssetTag = `${yearPrefix}${String(maxSeq + 1).padStart(3, "0")}`;

  // Automatically provision the asset into IT Unified Hub
  const bridgedAsset = new ITUnifiedAsset({
    asset_tag: nextAssetTag,
    asset_name: pr6.item_details.item_name,
    category: "Laptop",
    asset_type: "Laptop",
    brand: "Lenovo",
    model: "ThinkPad T14 Gen 4",
    serial_number: pr6.grn_receiving.serial_numbers[0],
    lifecycle_status: "In Stock",
    inventory_type: "New Inventory",
    stock_type: "New",
    condition: "Good",
    department: pr6.requested_by.department,
    location: pr6.branch,
    vendor: vendorLenovo._id,
    vendor_name: vendorLenovo.vendor_name,
    purchase_cost: pr6.payment_details.paid_amount,
    purchase_date: pr6.payment_details.payment_date,
    invoice_number: pr6.invoice_details.invoice_number,
    invoice_date: pr6.invoice_details.invoice_date,
    invoice_url: pr6.invoice_details.invoice_url,
    payment_mode: pr6.payment_details.payment_mode,
    warranty_start_date: pr6.payment_details.payment_date,
    warranty_end_date: new Date(Date.now() + 3 * 365 * 86400000),
    origin_source: "Procurement",
    procurement_id: pr6._id,
    procurement_ref: pr6.pr_number,
    specs: {
      processor: "AMD Ryzen 7 PRO 7840U",
      ram: "16 GB LPDDR5x",
      storage: "512 GB PCIe 4.0 SSD",
      operating_system: "Windows 11 Pro 64",
    },
    approval_stage: "Completed",
    approval_status: "Approved - Verified via Procurement Workflow",
    remarks: `Auto-bridged from IT Procurement Pipeline (${pr6.pr_number}) on complete payment verification.`,
  });
  await bridgedAsset.save();

  pr6.asset_bridge = {
    asset_id: bridgedAsset._id,
    asset_tag: bridgedAsset.asset_tag,
    is_registered: true,
    registered_at: new Date(),
    registered_by: "System Automation Pipeline",
  };
  pr6.current_stage = 12;
  pr6.overall_status = "Completed";
  pr6.workflow_history.push({
    stage: 12,
    action: "Procurement Closed & Auto-Bridged to Unified Asset Registry",
    performed_by: "Automated Bridge",
    remarks: `Registered new physical asset [${bridgedAsset.asset_tag}] into IT Unified Inventory Hub.`,
  });
  await pr6.save();

  console.log(`✓ Stage 12 Passed: Asset Registry Auto-Bridge COMPLETE!`);
  console.log(`  → Provisioned Asset Tag : ${bridgedAsset.asset_tag}`);
  console.log(`  → Serial Number         : ${bridgedAsset.serial_number}`);
  console.log(`  → Purchase Cost         : ₹${bridgedAsset.purchase_cost.toLocaleString()}`);
  console.log(`  → Linked Procurement PR : ${bridgedAsset.procurement_ref}`);

  // Summary counts
  const totalPRs = await ProcurementRequest.countDocuments();
  const stagesCount = await ProcurementRequest.aggregate([
    { $group: { _id: "$current_stage", count: { $sum: 1 }, items: { $push: "$pr_number" } } },
    { $sort: { _id: 1 } },
  ]);

  console.log("\n============================================================");
  console.log(`SEEDING & LIFECYCLE TEST COMPLETED SUCCESSFULLY!`);
  console.log(`Total Procurements in DB: ${totalPRs}`);
  console.log("Stages Breakdown:");
  for (const s of stagesCount) {
    console.log(`  Stage ${s._id.toString().padStart(2, " ")}: ${s.count} PR(s) [${s.items.join(", ")}]`);
  }
  console.log("============================================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
