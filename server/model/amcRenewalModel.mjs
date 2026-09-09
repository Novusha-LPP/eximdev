import mongoose from "mongoose";

const amcRenewalSchema = new mongoose.Schema(
  {
    equipmentServiceName: { type: String, required: true, trim: true },
    vendorName: { type: String, required: true, trim: true },
    underAmc: { type: String, enum: ["Yes", "No"], default: "Yes" },
    contractNo: { type: String, trim: true },
    location: { type: String, trim: true },
    yearlyServices: { type: String, trim: true },
    startMonthDate: { type: Date },
    previousDateOfService: { type: Date },
    nextDueDate: { type: Date },
    renewalDate: { type: Date },
    expireDate: { type: Date },
    contactPerson: { type: String, trim: true },
    contactNo: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Active", "Pending", "Expired"],
      default: "Active",
    },
    remarks: { type: String, trim: true },
    documentUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

const AmcRenewalModel = mongoose.model("AmcRenewal", amcRenewalSchema);
export default AmcRenewalModel;
