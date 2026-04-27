import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, uppercase: true },
  branches: [
    {
      branch_no: { type: String, trim: true, uppercase: true },
      branch_name: { type: String, trim: true, uppercase: true },
      address: { type: String, trim: true, uppercase: true },
      city: { type: String, trim: true, uppercase: true },
      country: { type: String, trim: true, uppercase: true },
      postal_code: { type: String, trim: true, uppercase: true },
      gst: { type: String, trim: true, uppercase: true },
      pan: { type: String, trim: true, uppercase: true },
      accounts: [{
        bankName: { type: String, trim: true, uppercase: true },
        accountNo: { type: String, trim: true, uppercase: true },
        ifsc: { type: String, trim: true, uppercase: true },
        adCode: { type: String, trim: true, uppercase: true },
      }]
    },
  ],
  active: { type: String, default: "Yes", uppercase: true },
  tds_percent: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
});

const SupplierModel = mongoose.model("Supplier", supplierSchema, "suppliersimp");
export default SupplierModel;
