import mongoose from "mongoose";

const shippingLineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, uppercase: true },
  active: { type: String, default: "Yes", uppercase: true },
  branches: [{
    branch_no: { type: String, trim: true, uppercase: true },
    branchName: { type: String, trim: true, uppercase: true },
    address: { type: String, trim: true, uppercase: true },
    city: { type: String, trim: true, uppercase: true },
    state: { type: String, trim: true, uppercase: true },
    pincode: { type: String, trim: true, uppercase: true },
    country: { type: String, trim: true, uppercase: true },
    gst: { type: String, trim: true, uppercase: true },
    pan: { type: String, trim: true, uppercase: true },
    accounts: [{
      bankName: { type: String, trim: true, uppercase: true },
      accountNo: { type: String, trim: true, uppercase: true },
      ifsc: { type: String, trim: true, uppercase: true },
      adCode: { type: String, trim: true, uppercase: true },
    }]
  }],
  tds_percent: { type: Number, default: 0 },
  credit_terms: { type: String, trim: true, uppercase: true },
  cin: { type: String, trim: true, uppercase: true },
  created_at: { type: Date, default: Date.now },
});

const ShippingLineModel = mongoose.model("ShippingLine", shippingLineSchema);
export default ShippingLineModel;
