import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

export const SUNDRY_DEBTOR_PARTICULARS = [
  "Direct Party",
  "Suraj Forwarders Pvt. Ltd.",
  "Additional Transporter"
];

const TransportSundryDebtorSchema = new mongoose.Schema(
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
    particulars: {
      type: String,
      required: true,
      enum: SUNDRY_DEBTOR_PARTICULARS,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Sundry Debtor amount cannot be negative"],
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
    collection: "transport_sundry_debtors"
  }
);

// Compound unique index ensuring isolation per user, date, and sundry debtor category
TransportSundryDebtorSchema.index({ user_id: 1, date: 1, particulars: 1 }, { unique: true });
TransportSundryDebtorSchema.index({ user_id: 1, date: 1 });
TransportSundryDebtorSchema.index({ date: 1, particulars: 1 });

TransportSundryDebtorSchema.plugin(auditPlugin, { documentType: "TransportSundryDebtor" });

const TransportSundryDebtorModel = mongoose.model(
  "TransportSundryDebtor",
  TransportSundryDebtorSchema
);

export default TransportSundryDebtorModel;
