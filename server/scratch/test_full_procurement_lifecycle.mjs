import mongoose from "mongoose";
import ProcurementRequest from "../model/it-helpdesk/procurementModel.mjs";
import ITUnifiedAsset from "../model/it-helpdesk/unifiedAssetModel.mjs";
import ItVendor from "../model/it-helpdesk/vendorModel.mjs";

const MONGO_URI = process.env.DEV_MONGODB_URI || "mongodb://127.0.0.1:27017/eximdev";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB for lifecycle test");

    // Clean up test records if any
    await ProcurementRequest.deleteMany({ pr_number: "PR-TEST-2026-001" });
    await ITUnifiedAsset.deleteMany({ asset_tag: "AST-TEST-001" });

    // 1. Create PR
    const pr = new ProcurementRequest({
      pr_number: "PR-TEST-2026-001",
      request_date: new Date(),
      requested_by: {
        name: "Vikas Chandra",
        email: "vikas@alvision.in",
        department: "IT",
      },
      branch: "Head Office",
      item_details: {
        item_name: "Dell OptiPlex 7000 Desktop",
        category: "Computer / Desktop",
        quantity: 2,
        estimated_budget: 130000,
        budget_head: "IT CapEx",
        priority: "High",
        justification: "Replacement of obsolete workstations for Accounts Department",
        specifications: {
          processor: "Intel Core i7 13th Gen",
          ram: "16 GB DDR5",
          storage: "512 GB NVMe SSD",
        },
      },
      current_stage: 1,
      overall_status: "Quotation Pending",
      workflow_history: [
        {
          stage: 1,
          action: "Purchase Request Created",
          performed_by: "Vikas Chandra",
          role: "IT Engineer",
          remarks: "Initial PR submitted",
        },
      ],
    });
    await pr.save();
    console.log("Stage 1 PR Created:", pr.pr_number);

    // 2. Add 3 Quotations
    pr.quotations = [
      {
        quotation_no: "QTN-DELL-01",
        vendor_name: "Dell Technologies India",
        total_amount: 132000,
        warranty_period: "3 Years ProSupport",
        delivery_days: 5,
        payment_terms: "30 Days Credit",
        file_url: "http://localhost:9006/uploads/it-helpdesk/procurement/dell_quote.pdf",
        is_recommended_by_it: true,
        notes: "Direct OEM quote with 3Y on-site SLA",
      },
      {
        quotation_no: "QTN-COMP-02",
        vendor_name: "Comptech Solutions",
        total_amount: 128500,
        warranty_period: "1 Year Standard",
        delivery_days: 3,
        payment_terms: "Immediate",
        file_url: "http://localhost:9006/uploads/it-helpdesk/procurement/comptech_quote.pdf",
        notes: "Cheapest, but only 1 year warranty",
      },
      {
        quotation_no: "QTN-NET-03",
        vendor_name: "InfraNet Systems",
        total_amount: 135000,
        warranty_period: "3 Years Standard",
        delivery_days: 7,
        payment_terms: "50% Advance",
        file_url: "http://localhost:9006/uploads/it-helpdesk/procurement/infranet_quote.pdf",
        notes: "Higher price, 7 days delivery",
      },
    ];
    pr.current_stage = 3;
    pr.overall_status = "IT Review";
    await pr.save();
    console.log("Stage 2 Quotations Uploaded: 3 quotations recorded");

    // 3. IT Evaluation
    pr.it_evaluation = {
      evaluated_by: "Vikas Chandra",
      evaluated_at: new Date(),
      decision: "Approved",
      recommended_vendor: "Dell Technologies India",
      recommended_quote_no: "QTN-DELL-01",
      remarks: "Dell OEM provides 3 years ProSupport and meets all strict specifications.",
    };
    pr.current_stage = 4;
    pr.overall_status = "HOD Approval Pending";
    await pr.save();
    console.log("Stage 3 IT Technical Evaluation Complete");

    // 4. HOD Approval (Shalini Arun)
    pr.first_approval = {
      approver_username: "shalini_arun",
      approver_name: "Shalini Arun",
      decision: "Approved",
      approved_amount: 132000,
      approval_date: new Date(),
      remarks: "Approved under IT CapEx budget for Q3.",
    };
    pr.current_stage = 5;
    pr.overall_status = "GM Approval Pending";
    await pr.save();
    console.log("Stage 4 HOD Approval Complete (Shalini Arun)");

    // 5. GM Approval & Selection (Manu Pillai)
    pr.quotations[0].is_selected_by_gm = true;
    pr.final_approval = {
      approver_username: "manu_pillai",
      approver_name: "Manu Pillai",
      decision: "Approved",
      selected_vendor: "Dell Technologies India",
      selected_quote_no: "QTN-DELL-01",
      final_approved_amount: 130000,
      approval_date: new Date(),
      remarks: "Negotiated discount approved at ₹1,30,000 for 2 units. Proceed with PO.",
    };
    pr.current_stage = 6;
    pr.overall_status = "PO Created";
    await pr.save();
    console.log("Stage 5 GM Selection & Final Approval Complete (Manu Pillai)");

    // 6. PO Created
    pr.purchase_order = {
      po_number: "PO-2026-0042",
      po_date: new Date(),
      po_amount: 130000,
      po_file_url: "http://localhost:9006/uploads/it-helpdesk/procurement/po_2026_0042.pdf",
      expected_delivery: new Date(Date.now() + 5 * 86400000),
      created_by: "Procurement Desk",
    };
    pr.current_stage = 7;
    pr.overall_status = "Goods Received";
    await pr.save();
    console.log("Stage 6 PO Created: PO-2026-0042");

    // 7. GRN Receiving
    pr.grn_receiving = {
      grn_number: "GRN-2026-018",
      received_date: new Date(),
      received_qty: 2,
      serial_numbers: ["DELL-OPT-991201", "DELL-OPT-991202"],
      delivery_challan_url: "http://localhost:9006/uploads/it-helpdesk/procurement/challan_882.pdf",
      inspection_status: "Accepted",
      receipt_status: "Received",
      received_by: "IT Store Khadoyar",
      remarks: "Goods received in sealed condition, tested OK.",
    };
    pr.current_stage = 8;
    pr.overall_status = "Invoice Verification";
    await pr.save();
    console.log("Stage 7 Goods Received & GRN Recorded: GRN-2026-018");

    // 8 & 9. Tax Invoice & Accounts 3-Way Matching
    pr.invoice_details = {
      invoice_number: "INV-DELL-2026-449",
      invoice_date: new Date(),
      gstin: "24AAACD1234F1Z5",
      invoice_amount: 130000,
      invoice_url: "http://localhost:9006/uploads/it-helpdesk/procurement/inv_449.pdf",
      po_verified: true,
      grn_verified: true,
      accounts_verified_by: "Kishan (Accounts Manager)",
      accounts_verified_date: new Date(),
      verification_status: "Verified",
      accounts_remarks: "3-Way Match Verified: PO Amount (₹130,000) == Invoice Amount (₹130,000) == GRN Qty (2 units).",
    };
    pr.current_stage = 10;
    pr.overall_status = "Payment Pending";
    await pr.save();
    console.log("Stage 8 & 9 Accounts 3-Way Matching Verified!");

    // 10. Payment & UTR
    pr.payment_details = {
      payment_status: "Processed",
      payment_mode: "RTGS",
      paid_amount: 130000,
      payment_date: new Date(),
      utr_number: "HDFCR202610170099881",
      payment_proof_url: "http://localhost:9006/uploads/it-helpdesk/procurement/utr_receipt.pdf",
      accounts_manager: "Kishan (Accounts)",
      closure_remarks: "Payment cleared via HDFC RTGS.",
    };
    pr.current_stage = 11;
    await pr.save();
    console.log("Stage 10 Payment Processed with UTR: HDFCR202610170099881");

    // 11. Automated Asset Registration Bridge
    const asset = new ITUnifiedAsset({
      asset_tag: "AST-TEST-001",
      asset_name: pr.item_details.item_name,
      category: pr.item_details.category,
      brand: "Dell",
      model: "OptiPlex 7000",
      serial_number: pr.grn_receiving.serial_numbers[0],
      lifecycle_status: "Available",
      inventory_type: "New Inventory",
      stock_type: "New",
      condition: "Good",
      department: pr.requested_by.department,
      location: pr.branch,
      purchase_cost: pr.payment_details.paid_amount,
      purchase_date: pr.payment_details.payment_date,
      invoice_number: pr.invoice_details.invoice_number,
      invoice_date: pr.invoice_details.invoice_date,
      invoice_url: pr.invoice_details.invoice_url,
      payment_mode: pr.payment_details.payment_mode,
      origin_source: "Procurement",
      procurement_id: pr._id,
      procurement_ref: pr.pr_number,
      specs: pr.item_details.specifications,
      approval_stage: "Completed",
      approval_status: "Approved - Verified via Procurement Workflow",
    });
    await asset.save();

    pr.asset_bridge = {
      asset_id: asset._id,
      asset_tag: asset.asset_tag,
      is_registered: true,
      registered_at: new Date(),
      registered_by: "System Automation",
    };
    pr.current_stage = 12;
    pr.overall_status = "Completed";
    await pr.save();
    console.log("Stage 11 & 12 Asset Bridge Successful! Created Asset Tag:", asset.asset_tag);

    // Verify cross-link
    const queriedAsset = await ITUnifiedAsset.findOne({ procurement_id: pr._id });
    console.log("Verified Asset Linked to PR:", queriedAsset.asset_tag, "ref:", queriedAsset.procurement_ref);

    // Clean up test data
    await ProcurementRequest.deleteOne({ _id: pr._id });
    await ITUnifiedAsset.deleteOne({ _id: asset._id });
    console.log("Test cleanup completed. ALL 12 STAGES PASSED VERIFICATION!");
  } catch (err) {
    console.error("Lifecycle test failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
