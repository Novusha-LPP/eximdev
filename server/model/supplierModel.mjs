import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  address: { type: String, trim: true },
  country: { type: String, trim: true },
  active: { type: String, default: "Yes" },
  created_at: { type: Date, default: Date.now },
});

const SupplierModel = mongoose.model("Supplier", supplierSchema);
export default SupplierModel;
