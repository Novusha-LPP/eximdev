import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const assetSchema = new mongoose.Schema({
  asset_tag: { type: String, required: true, unique: true, trim: true },
  serial_number: { type: String, trim: true },
  asset_type: { type: String, required: true, enum: ["Computer", "Laptop", "Monitor", "Printer", "Network Device", "Software", "Phone", "SIM Card", "Rack", "Cable", "Peripheral", "Unmanaged"], index: true },
  manufacturer: { type: String, trim: true },
  model: { type: String, trim: true },
  purchase_date: { type: Date, index: true },
  warranty_expiry: { type: Date, index: true },
  status: { type: String, required: true, enum: ["Available", "Assigned", "In Repair", "Retired", "Lost"], default: "Available", index: true },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assigned_date: { type: Date },
  location: { type: String, trim: true, index: true },
  purchase_cost: { type: Number },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "ItVendor" },
  description: { type: String },
  custom_fields: [{ fieldId: { type: mongoose.Schema.Types.ObjectId }, value: mongoose.Schema.Types.Mixed }],
  history: [{
    action: { type: String, required: true },
    changed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    timestamp: { type: Date, default: Date.now },
    remarks: String
  }]
}, { timestamps: true });

assetSchema.plugin(auditPlugin, { documentType: "ITAsset" });

export default mongoose.model("ITAsset", assetSchema);
