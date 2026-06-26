import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const quotationSchema = new mongoose.Schema(
  {
    insuranceCompany: String,
    idv: { type: Number, default: 0 },
    odPremium: { type: Number, default: 0 },
    liabilityPremium: { type: Number, default: 0 },
    totalPremium: { type: Number, default: 0 },
  },
  { _id: true }
);

const fleetInsuranceSopSchema = new mongoose.Schema(
  {
    srNo: { type: Number },
    registrationNo: { type: String, trim: true, required: true },
    registrationDate: { type: Date },
    makeModel: { type: String },
    fromOwner: { type: Date },
    toOwner: { type: Date },
    modelType: { type: String },
    size: { type: String },
    owner: { type: String },
    policyFromDate: { type: Date },
    policyToDate: { type: Date },
    insuranceCompany: { type: String },
    policyNo: { type: String },
    gvw: { type: Number },
    idv: { type: Number },
    premiumAmount: { type: Number },
    remarks: { type: String },
    ncbPercentage: { type: Number },
    premium: { type: Number },
    thisYearIdv: { type: Number },
    newIdv: { type: Number },
    newNcbPercentage: { type: Number },
    rsdTaken: { type: Number },
    imt23: { type: Number },
    zeroDepTowingCover: { type: String },
    premiumQuote: { type: Number },
    renewed: { type: String },
    newExpiryDate: { type: Date },
    renewedDate: { type: Date },

    // Quotation Comparison Data (UI only, doesn't break Excel format)
    quotations: { type: [quotationSchema], default: [] },
    selectedInsurerL1: { type: String },
    reasonForSelection: { type: String },
  },
  { timestamps: true }
);

fleetInsuranceSopSchema.plugin(auditPlugin, { documentType: "FleetInsuranceSop" });

const FleetInsuranceSopModel = mongoose.model(
  "FleetInsuranceSop",
  fleetInsuranceSopSchema
);
export default FleetInsuranceSopModel;
