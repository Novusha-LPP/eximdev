import mongoose from "mongoose";

const rentSchema = new mongoose.Schema({
  address: { type: String },
  tenant_name: { type: String },
  property_in_name_of: { type: String },
  start_date: { type: String },
  end_date: { type: String },
  rent_amount: { type: String },
  increase_percentage: { type: String },
  remarks: { type: String },
});

export default mongoose.model("Rent", rentSchema);
