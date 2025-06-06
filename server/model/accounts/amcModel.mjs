import mongoose from "mongoose";

const amcSchema = new mongoose.Schema({
  service_name: { type: String },
  address: { type: String },
  service_provider: { type: String },
  start_date: { type: String },
  end_date: { type: String },
  remarks: { type: String },
});

export default mongoose.model("AMC", amcSchema);
