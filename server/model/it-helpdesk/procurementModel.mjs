import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const PRIORITY_ENUM = ["Normal", "High", "Urgent"];

const IT_EVALUATION_DECISION_ENUM = [
  "Pending",
  "Approved",
  "Rejected",
  "Clarification Required",
];

const APPROVAL_DECISION_ENUM = ["Pending", "Approved", "Rejected", "Returned"];

const INSPECTION_STATUS_ENUM = ["Pending", "Accepted", "Rejected"];

const RECEIPT_STATUS_ENUM = [
  "Not Ordered",
  "Ordered",
  "Partially Received",
  "Received",
  "Rejected",
];

const INVOICE_VERIFICATION_ENUM = [
  "Pending",
  "Verified",
  "Mismatch",
  "Rejected",
];

const PAYMENT_STATUS_ENUM = ["Pending", "Processed", "Hold", "Failed"];

const PAYMENT_MODE_ENUM = [
  "Bank Transfer",
  "NEFT",
  "RTGS",
  "IMPS",
  "Cheque",
  "UPI",
  "Card",
];

const OVERALL_STATUS_ENUM = [
  "Draft",
  "Quotation Pending",
  "IT Review",
  "HOD Approval Pending",
  "GM Approval Pending",
  "PO Created",
  "Goods Received",
  "Invoice Verification",
  "Payment Pending",
  "Completed",
  "Rejected",
  "Returned",
];

const quotationItemSchema = new mongoose.Schema(
  {
    quotation_no: { type: String, trim: true, default: "" },
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ItVendor",
      default: null,
    },
    vendor_name: { type: String, trim: true, default: "" },
    total_amount: { type: Number, default: 0 },
    warranty_period: { type: String, trim: true, default: "1 Year" },
    delivery_days: { type: Number, default: 7 },
    payment_terms: { type: String, trim: true, default: "30 Days Credit" },
    file_url: { type: String, trim: true, default: "" },
    uploaded_at: { type: Date, default: Date.now },
    is_recommended_by_it: { type: Boolean, default: false },
    is_selected_by_gm: { type: Boolean, default: false },
    notes: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const procurementRequestSchema = new mongoose.Schema(
  {
    pr_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    request_date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    required_by_date: {
      type: Date,
      default: null,
    },
    requested_by: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, default: "" },
      department: { type: String, trim: true, default: "" },
    },
    branch: {
      type: String,
      trim: true,
      default: "Head Office",
      index: true,
    },
    company: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
      name: { type: String, trim: true, default: "" },
      code: { type: String, trim: true, default: "" },
    },
    company_name: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    department: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    designated_hod: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, trim: true, default: "" },
      username: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, default: "" },
      designation: { type: String, trim: true, default: "" },
    },
    item_details: {
      item_name: { type: String, required: true, trim: true },
      category: {
        type: String,
        required: true,
        trim: true,
        default: "Computer / Desktop",
      },
      quantity: { type: Number, required: true, min: 1, default: 1 },
      estimated_budget: { type: Number, default: 0 },
      budget_head: { type: String, trim: true, default: "IT CapEx" },
      priority: {
        type: String,
        enum: PRIORITY_ENUM,
        default: "Normal",
        index: true,
      },
      justification: { type: String, trim: true, default: "" },
      specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    quotations: [quotationItemSchema],

    it_evaluation: {
      evaluated_by: { type: String, trim: true, default: "" },
      evaluated_by_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      evaluated_at: { type: Date, default: null },
      decision: {
        type: String,
        enum: IT_EVALUATION_DECISION_ENUM,
        default: "Pending",
      },
      recommended_vendor: { type: String, trim: true, default: "" },
      recommended_quote_no: { type: String, trim: true, default: "" },
      remarks: { type: String, trim: true, default: "" },
    },

    first_approval: {
      approver_username: {
        type: String,
        trim: true,
        default: "shalini_arun",
      },
      approver_name: {
        type: String,
        trim: true,
        default: "Shalini Arun",
      },
      approver_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      decision: {
        type: String,
        enum: APPROVAL_DECISION_ENUM,
        default: "Pending",
      },
      approved_amount: { type: Number, default: 0 },
      approval_date: { type: Date, default: null },
      remarks: { type: String, trim: true, default: "" },
    },

    final_approval: {
      approver_username: {
        type: String,
        trim: true,
        default: "manu_pillai",
      },
      approver_name: {
        type: String,
        trim: true,
        default: "Manu Pillai",
      },
      approver_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      decision: {
        type: String,
        enum: APPROVAL_DECISION_ENUM,
        default: "Pending",
      },
      selected_vendor: { type: String, trim: true, default: "" },
      selected_vendor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ItVendor",
        default: null,
      },
      selected_quote_no: { type: String, trim: true, default: "" },
      final_approved_amount: { type: Number, default: 0 },
      approval_date: { type: Date, default: null },
      remarks: { type: String, trim: true, default: "" },
    },

    purchase_order: {
      po_number: { type: String, trim: true, default: "" },
      po_date: { type: Date, default: null },
      po_amount: { type: Number, default: 0 },
      po_file_url: { type: String, trim: true, default: "" },
      expected_delivery: { type: Date, default: null },
      created_by: { type: String, trim: true, default: "" },
      notes: { type: String, trim: true, default: "" },
    },

    grn_receiving: {
      grn_number: { type: String, trim: true, default: "" },
      received_date: { type: Date, default: null },
      received_qty: { type: Number, default: 0 },
      serial_numbers: [{ type: String, trim: true }],
      delivery_challan_url: { type: String, trim: true, default: "" },
      inspection_status: {
        type: String,
        enum: INSPECTION_STATUS_ENUM,
        default: "Pending",
      },
      receipt_status: {
        type: String,
        enum: RECEIPT_STATUS_ENUM,
        default: "Not Ordered",
      },
      received_by: { type: String, trim: true, default: "" },
      remarks: { type: String, trim: true, default: "" },
    },

    invoice_details: {
      vendor_name: { type: String, trim: true, default: "" },
      vendor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ItVendor",
        default: null,
      },
      invoice_number: { type: String, trim: true, default: "" },
      invoice_date: { type: Date, default: null },
      gstin: { type: String, trim: true, default: "" },
      invoice_amount: { type: Number, default: 0 },
      invoice_url: { type: String, trim: true, default: "" },
      po_verified: { type: Boolean, default: false },
      grn_verified: { type: Boolean, default: false },
      accounts_verified_by: { type: String, trim: true, default: "" },
      accounts_verified_date: { type: Date, default: null },
      verification_status: {
        type: String,
        enum: INVOICE_VERIFICATION_ENUM,
        default: "Pending",
      },
      accounts_remarks: { type: String, trim: true, default: "" },
    },

    payment_details: {
      payment_status: {
        type: String,
        enum: PAYMENT_STATUS_ENUM,
        default: "Pending",
      },
      payment_mode: {
        type: String,
        enum: PAYMENT_MODE_ENUM,
        default: "Bank Transfer",
      },
      paid_amount: { type: Number, default: 0 },
      payment_date: { type: Date, default: null },
      utr_number: { type: String, trim: true, default: "" },
      payment_proof_url: { type: String, trim: true, default: "" },
      accounts_manager: { type: String, trim: true, default: "" },
      closure_remarks: { type: String, trim: true, default: "" },
    },

    asset_bridge: {
      asset_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ITUnifiedAsset",
        default: null,
      },
      asset_tag: { type: String, trim: true, default: "" },
      is_registered: { type: Boolean, default: false },
      registered_at: { type: Date, default: null },
      registered_by: { type: String, trim: true, default: "" },
    },

    assignment_handover: {
      assigned_to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      assigned_to_name: { type: String, trim: true, default: "" },
      department: { type: String, trim: true, default: "" },
      location: { type: String, trim: true, default: "" },
      handover_date: { type: Date, default: null },
      warranty_end_date: { type: Date, default: null },
      remarks: { type: String, trim: true, default: "" },
    },

    current_stage: {
      type: Number,
      min: 1,
      max: 12,
      default: 1,
      index: true,
    },
    overall_status: {
      type: String,
      enum: OVERALL_STATUS_ENUM,
      default: "Draft",
      index: true,
    },
    workflow_history: [
      {
        stage: { type: Number, default: 1 },
        action: { type: String, required: true },
        performed_by: { type: String, default: "" },
        performed_by_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        role: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now },
        remarks: { type: String, default: "" },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for high performance querying
procurementRequestSchema.index({ overall_status: 1, createdAt: -1 });
procurementRequestSchema.index({ current_stage: 1, createdAt: -1 });
procurementRequestSchema.index({ branch: 1, current_stage: 1 });
procurementRequestSchema.index({ "requested_by.name": "text", pr_number: "text", "item_details.item_name": "text" });

procurementRequestSchema.plugin(auditPlugin, { documentType: "ITProcurement" });

const ProcurementRequest =
  mongoose.models.ProcurementRequest ||
  mongoose.model("ProcurementRequest", procurementRequestSchema, "it_procurement_requests");

export default ProcurementRequest;
