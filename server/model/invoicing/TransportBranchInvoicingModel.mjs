import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

export const TRANSPORT_BRANCHES = [
  "ICD Khodiyar",
  "ICD Sanand",
  "ICD Mundra",
  "ICD Airport",
  "ICD Hazira",
  "ICD Sachana",
  "ICD Baroda"
];

const TransportBranchInvoicingSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    username: {
      type: String,
      required: true,
      index: true
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      index: true
    },
    branch: {
      type: String,
      required: true,
      enum: TRANSPORT_BRANCHES,
      index: true
    },
    invoice_count: {
      type: Number,
      required: true,
      min: [0, "Invoice count cannot be negative"],
      default: 0
    },
    invoice_amount: {
      type: Number,
      required: true,
      min: [0, "Invoice amount cannot be negative"],
      default: 0
    },
    pending_lrs: {
      type: Number,
      required: true,
      min: [0, "Pending LRs cannot be negative"],
      default: 0
    },
    created_by: {
      type: String,
      default: ""
    },
    updated_by: {
      type: String,
      default: ""
    },
    audit_trail: [
      {
        action: { type: String, enum: ["CREATE", "UPDATE", "UPLOAD_UPDATE", "DELETE"] },
        field: { type: String },
        old_value: { type: mongoose.Schema.Types.Mixed },
        new_value: { type: mongoose.Schema.Types.Mixed },
        user: { type: String },
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
        reason: { type: String }
      }
    ]
  },
  {
    timestamps: true,
    collection: "transport_branch_invoicings"
  }
);

// Compound unique index ensuring complete isolation per user, date, and branch
TransportBranchInvoicingSchema.index({ user_id: 1, date: 1, branch: 1 }, { unique: true });
TransportBranchInvoicingSchema.index({ user_id: 1, date: 1 });
TransportBranchInvoicingSchema.index({ date: 1, branch: 1 });

TransportBranchInvoicingSchema.plugin(auditPlugin, { documentType: "TransportBranchInvoicing" });

const TransportBranchInvoicingModel = mongoose.model(
  "TransportBranchInvoicing",
  TransportBranchInvoicingSchema
);

export default TransportBranchInvoicingModel;
