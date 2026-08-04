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

    // ─── F Data-NEW Fields (Insurance Portal Granular Data) ───
    renewalDate: { type: Date },
    engineNumber: { type: String },
    chassisNumber: { type: String },
    cubicCapacityKw: { type: String }, // "5883 / 45500" format from Excel
    mfgYear: { type: String },        // "2018 / 13-06-2018" format from Excel
    electricalAccessoriesIdv: { type: Number, default: 0 },
    cngKitIdv: { type: Number, default: 0 },
    totalIdv: { type: Number, default: 0 },       // vehicleIDV + electricalIDV + cngKitIDV
    odPremium: { type: Number, default: 0 },
    imt24: { type: Number, default: 0 },
    imt25: { type: Number, default: 0 },
    totalOdPremium: { type: Number, default: 0 },  // OD + IMT23 + IMT24 + IMT25 + NCB
    imt17: { type: Number, default: 0 },
    imt252: { type: Number, default: 0 },
    imt28: { type: Number, default: 0 },
    imt29: { type: Number, default: 0 },
    liabilityPremium: { type: Number, default: 0 },
    totalGst: { type: Number, default: 0 },
    totalPolicyPremium: { type: Number, default: 0 },

    // Quotation Comparison Data (UI only, doesn't break Excel format)
    quotations: { type: [quotationSchema], default: [] },
    selectedInsurerL1: { type: String },
    reasonForSelection: { type: String },

    // Renewal Workflow Fields
    prNumber: { type: String },
    prDate: { type: Date },
    financialApprovalStatus: { type: String, enum: ["Draft", "Pending", "Approved", "Rejected"], default: "Pending" },
    paymentUtr: { type: String },
    paymentDate: { type: Date },
    renewalStatus: { type: String, enum: ["Pending", "Renewed", "Not Renewed"], default: "Pending" },
    tat: { type: Number },

    // ─── Renewed Policy Details ───
    newInsuranceCompany: { type: String },
    newPolicyNo: { type: String },
    newPolicyFromDate: { type: Date },
    newPolicyToDate: { type: Date },
    newElectricalAccessoriesIdv: { type: Number, default: 0 },
    newCngKitIdv: { type: Number, default: 0 },
    newTotalIdv: { type: Number, default: 0 },
    newPremiumAmount: { type: Number },
    newNcb: { type: Number },
    newPremium: { type: Number },
    newRemarks: { type: String },

    // ─── Renewed Insurance Premium Breakdown ───
    newOdPremium: { type: Number, default: 0 },
    newImt23: { type: Number, default: 0 },
    newImt24: { type: Number, default: 0 },
    newImt25: { type: Number, default: 0 },
    newTotalOdPremium: { type: Number, default: 0 },
    newImt17: { type: Number, default: 0 },
    newImt252: { type: Number, default: 0 },
    newImt28: { type: Number, default: 0 },
    newImt29: { type: Number, default: 0 },
    newLiabilityPremium: { type: Number, default: 0 },
    newTotalGst: { type: Number, default: 0 },
    newTotalPolicyPremium: { type: Number, default: 0 },

    // ─── PR Generation Readiness ───
    readyForPr: { type: String, enum: ["Yes", "No", ""], default: "" },
  },
  { timestamps: true }
);

fleetInsuranceSopSchema.plugin(auditPlugin, { documentType: "FleetInsuranceSop" });

const FleetInsuranceSopModel = mongoose.model(
  "FleetInsuranceSop",
  fleetInsuranceSopSchema
);
export default FleetInsuranceSopModel;
