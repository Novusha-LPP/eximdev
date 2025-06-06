import mongoose from "mongoose";

const electricitySchema = new mongoose.Schema({
  comapny_name: { type: String },
  address: { type: String },
  service_no: { type: String },
  billing_date: { type: String },
  due_date: { type: String },
  remarks: { type: String },
});

export default mongoose.model("Electricity", electricitySchema);
