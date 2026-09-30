import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const TransportDirectIncomeSchema = new mongoose.Schema(
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
    amount: {
      type: Number,
      required: true,
      min: [0, "Direct Income amount cannot be negative"],
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
    collection: "transport_direct_incomes"
  }
);

// Compound unique index ensuring isolation per user and date
TransportDirectIncomeSchema.index({ user_id: 1, date: 1 }, { unique: true });
TransportDirectIncomeSchema.index({ date: 1 });

TransportDirectIncomeSchema.plugin(auditPlugin, { documentType: "TransportDirectIncome" });

const TransportDirectIncomeModel = mongoose.model(
  "TransportDirectIncome",
  TransportDirectIncomeSchema
);

export default TransportDirectIncomeModel;
