import mongoose from "mongoose";

const procurementCompanySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    shortName: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    companyKey: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    addressBillTo: {
      type: String,
      default: "",
      trim: true,
    },
    addressShipTo: {
      type: String,
      default: "",
      trim: true,
    },
    gstin: {
      type: String,
      uppercase: true,
      trim: true,
      default: "",
    },
    pan: {
      type: String,
      uppercase: true,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      default: "purchase@surajgroupofcompanies.com",
      trim: true,
    },
    contactNumbers: {
      type: String,
      default: "99980 27301 / 99243 01166",
      trim: true,
    },
    departments: {
      type: [String],
      default: [],
    },
    branches: {
      type: [String],
      default: [],
    },
    settings: {
      showDeliveryLocation: { type: Boolean, default: true },
      showDeliveryContact: { type: Boolean, default: true },
      showSectionC: { type: Boolean, default: true },
      showSectionD: { type: Boolean, default: true },
      responsibleTeam: { type: String, default: "Operations Team" },
      hodApproverName: { type: String, default: "MOHIT SINGH" },
      hodApproverEmail: { type: String, default: "" },
      defaultPoFormatStyle: { type: String, default: "standard" },
      themeColor: { type: String, default: "#163b65" },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const ProcurementCompanyModel =
  mongoose.models.ProcurementCompany ||
  mongoose.model("ProcurementCompany", procurementCompanySchema);

export default ProcurementCompanyModel;
