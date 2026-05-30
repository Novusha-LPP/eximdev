import mongoose from "mongoose";
import auditPlugin from "../plugins/auditPlugin.mjs";

const licenseUtilizationSchema = new mongoose.Schema(
  {
    authorization_no: { type: String, required: true },
    license_sr: { type: Number, required: true },
    job_no: { type: String, required: true },
    job_id: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    be_no: { type: String },
    be_date: { type: String },
    hs_code: { type: String },
    item_description: { type: String },
    qty: { type: Number, default: 0 },
    unit: { type: String },
    cif_usd: { type: Number, default: 0 },
    cif_inr: { type: Number, default: 0 },
    exchange_rate_used: { type: Number, default: 0 },
    port: { type: String },
    created_at: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

licenseUtilizationSchema.plugin(auditPlugin, { documentType: "LicenseUtilization" });

const LicenseUtilizationModel = mongoose.model(
  "LicenseUtilization",
  licenseUtilizationSchema
);

export default LicenseUtilizationModel;
