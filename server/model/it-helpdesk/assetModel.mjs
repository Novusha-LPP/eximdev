import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const STATUS_ENUM = ["Available", "Assigned", "In Repair", "Repair", "repair", "Retired", "Lost", "Active", "active", "Inactive", "inactive", "Damaged", "damaged", "Spare", "spare", "Expired", "expired", "Suspended", "suspended", "Occupied", "Available", "Blocked", "Under Maintenance"];

const assetSchema = new mongoose.Schema({
  asset_tag: { type: String, required: true, unique: true, trim: true },
  serial_number: { type: String, trim: true },
  asset_type: { type: String, required: true, enum: ["Desktop", "Laptop", "Computer", "Printer", "Monitor", "Network Device", "Software", "Phone", "SIM Card", "Rack", "Cable", "Peripheral", "Unmanaged"], index: true },
  manufacturer: { type: String, trim: true },
  model: { type: String, trim: true },
  purchase_date: { type: Date, index: true },
  warranty_expiry: { type: Date, index: true },
  asset_name: { type: String, trim: true, required: function () { return this.asset_type === "Desktop" || this.asset_type === "Laptop"; } },
  processor: { type: String, trim: true, required: function () { return this.asset_type === "Desktop" || this.asset_type === "Laptop"; } },
  ram: { type: String, trim: true, required: function () { return this.asset_type === "Desktop" || this.asset_type === "Laptop"; } },
  storage: { type: String, trim: true, required: function () { return this.asset_type === "Desktop" || this.asset_type === "Laptop"; } },
  operating_system: { type: String, trim: true, required: function () { return this.asset_type === "Desktop" || this.asset_type === "Laptop"; } },
  printer_type: { type: String, trim: true, enum: ["Laser", "Inkjet", "Thermal", "Dot Matrix"], required: function () { return this.asset_type === "Printer"; } },
  connection_type: { type: String, trim: true, enum: ["USB", "Wi-Fi", "LAN"], required: function () { return this.asset_type === "Printer"; } },
  device_category: { type: String, trim: true, enum: ["Router", "Switch", "Firewall", "AP"], required: function () { return this.asset_type === "Network Device"; } },
  ip_address: { type: String, trim: true, required: function () { return this.asset_type === "Network Device"; } },
  mac_address: { type: String, trim: true, required: function () { return this.asset_type === "Network Device"; } },
  software_category: { type: String, trim: true, required: function () { return this.asset_type === "Software"; } },
  version: { type: String, trim: true, required: function () { return this.asset_type === "Software"; } },
  license_type: { type: String, trim: true, required: function () { return this.asset_type === "Software"; } },
  license_key_subscription_id: { type: String, trim: true, required: function () { return this.asset_type === "Software"; } },
  number_of_licenses: { type: Number, required: function () { return this.asset_type === "Software"; } },
  expiry_renewal_date: { type: Date, required: function () { return this.asset_type === "Software"; } },
  imei_number: { type: String, trim: true, required: function () { return this.asset_type === "Phone"; } },
  rack_name: { type: String, trim: true, required: function () { return this.asset_type === "Rack"; } },
  rack_type: { type: String, trim: true, required: function () { return this.asset_type === "Rack"; } },
  rack_size_u_height: { type: String, trim: true, required: function () { return this.asset_type === "Rack"; } },
  installation_date: { type: Date, required: function () { return this.asset_type === "Rack"; } },
  cable_name: { type: String, trim: true, required: function () { return this.asset_type === "Cable"; } },
  cable_type: { type: String, trim: true, required: function () { return this.asset_type === "Cable"; } },
  length: { type: Number, required: function () { return this.asset_type === "Cable"; } },
  department: { type: String, trim: true, required: function () { return this.asset_type === "SIM Card" || this.asset_type === "Desktop" || this.asset_type === "Laptop" || this.asset_type === "Printer" || this.asset_type === "Software" || this.asset_type === "Phone"; } },
  status: { type: String, required: true, enum: STATUS_ENUM, default: "Available", index: true },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assigned_date: { type: Date },
  location: { type: String, trim: true, index: true },
  purchase_cost: { type: Number },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "ItVendor" },
  description: { type: String },
  sim_number_iccid: { type: String, trim: true, required: function () { return this.asset_type === "SIM Card"; } },
  mobile_number: { type: String, trim: true, required: function () { return this.asset_type === "SIM Card" || this.asset_type === "Phone"; } },
  service_provider: { type: String, trim: true, enum: ["Airtel", "Jio", "Vi", "BSNL"], required: function () { return this.asset_type === "SIM Card"; } },
  allocation_date: { type: Date, required: function () { return this.asset_type === "SIM Card"; } },
  plan_type: { type: String, trim: true, enum: ["Prepaid", "Postpaid"], required: function () { return this.asset_type === "SIM Card"; } },
  monthly_plan_package: { type: String, trim: true, required: function () { return this.asset_type === "SIM Card"; } },
  imsi_number: { type: String, trim: true },
  puk_code: { type: String, trim: true },
  remarks: { type: String },
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
