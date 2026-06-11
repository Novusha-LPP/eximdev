import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const licenseSchema = new mongoose.Schema({
  software_name: { type: String, required: true, trim: true, index: true },
  license_key: { type: String, trim: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "ItVendor" },
  total_seats: { type: Number, required: true },
  used_seats: { type: Number, default: 0 },
  purchase_date: { type: Date, index: true },
  expiry_date: { type: Date, index: true },
  cost: { type: Number },
  assigned_to_users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  status: { type: String, enum: ["Active", "Expiring Soon", "Expired"], default: "Active", index: true }
}, { timestamps: true });

licenseSchema.plugin(auditPlugin, { documentType: "ITLicense" });

export default mongoose.model("ITLicense", licenseSchema);
