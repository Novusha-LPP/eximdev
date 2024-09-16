import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema({
  vendor_name: { type: String, trim: true },
  vendor_address: { type: String, trim: true },
  vendor_phone: { type: String, trim: true },
});

export default mongoose.model("Vendors", vendorSchema);
