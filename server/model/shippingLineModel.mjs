import mongoose from "mongoose";

const shippingLineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, trim: true },
  pincode: { type: String, trim: true },
  gst: { type: String, trim: true },
  tds: { type: String, trim: true },
  pan: { type: String, trim: true, uppercase: true },
  active: { type: String, default: "Yes" },
  branches: [{
    branchName: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    country: { type: String, trim: true },
    gst: { type: String, trim: true },
    pan: { type: String, trim: true, uppercase: true },
    bankName: { type: String, trim: true },
    accountNo: { type: String, trim: true },
    ifsc: { type: String, trim: true },
    adCode: { type: String, trim: true },
  }],
  created_at: { type: Date, default: Date.now },
});

const ShippingLineModel = mongoose.model("ShippingLine", shippingLineSchema);
export default ShippingLineModel;
