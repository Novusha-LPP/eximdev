import mongoose from "mongoose";

const licSchema = new mongoose.Schema({
  policy_name: { type: String },
  policy_no: { type: String },
  insured_person_name: { type: String },
  start_date: { type: String },
  end_date: { type: String },
  insured_amount: { type: String },
  premium_amount: { type: String },
  premium_term: { type: String },
  remarks: { type: String },
});

export default mongoose.model("LIC", licSchema);
