
import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  vendor_code: { type: String, trim: true },
  vendor_type: { type: String, enum: ["Transporter", "CHA", "Shipping Line", "Supplier", "Service Provider", "Other"], default: "Supplier" },
  contact_person: { type: String, trim: true },
  mobile_number: { type: String, trim: true },
  email: { type: String, trim: true },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  amc_contracts: [{ type: mongoose.Schema.Types.ObjectId, ref: "ITContract" }],
  documents: [{ file_url: String, file_name: String, uploaded_at: { type: Date, default: Date.now } }],
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

vendorSchema.plugin(auditPlugin, { documentType: "ItVendor" });

export default mongoose.model("ItVendor", vendorSchema);
