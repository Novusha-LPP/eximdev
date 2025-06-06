import mongoose from "mongoose";

const fdSchema = new mongoose.Schema({
  comapny_name: { type: String },
  start_date: { type: String },
  end_date: { type: String },
  period: { type: String },
  roi: { type: String },
  remarks: { type: String },
});

const FD = mongoose.models.FD || mongoose.model("FD", fdSchema);

export default FD;
