import mongoose from "mongoose";

const tyreSupplierSchema = new mongoose.Schema(
  {
    supplierName: { type: String, required: true, unique: true, uppercase: true, trim: true },
    contactPerson: { type: String, default: "" },
    phoneNumber: { type: String, default: "" },
    emailWhatsApp: { type: String, default: "" },
    gstNumber: { type: String, default: "" },
    bankAccountNo: { type: String, default: "" },
    bankName: { type: String, default: "" },
    bankIfscCode: { type: String, default: "" },
    bankBranchCode: { type: String, default: "" },
    supplierNameInBank: { type: String, default: "" },
    paymentTerms: { type: String, default: "" },
    address: { type: String, default: "" },
    deliveryLocation: { type: String, default: "" },
  },
  { timestamps: true }
);

const TyreSupplierModel = mongoose.model("TyreSupplier", tyreSupplierSchema);

export default TyreSupplierModel;
