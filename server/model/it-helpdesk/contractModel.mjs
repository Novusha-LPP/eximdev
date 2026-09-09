import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const contractSchema = new mongoose.Schema({
  contract_type: { type: String, required: true, enum: ["AMC", "Warranty"], index: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "ItVendor" },
  contract_number: { type: String, required: true, trim: true },
  start_date: { type: Date, index: true },
  end_date: { type: Date, index: true },
  coverage_details: { type: String },
  renewal_reminder_days: { type: Number, default: 30 },
  status: { type: String, enum: ["Active", "Expiring Soon", "Expired"], default: "Active", index: true },
  document_url: { type: String }
}, { timestamps: true });

contractSchema.plugin(auditPlugin, { documentType: "ITContract" });

export default mongoose.model("ITContract", contractSchema);
