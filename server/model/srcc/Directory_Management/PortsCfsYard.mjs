import mongoose from "mongoose";

const PortsCfsYardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    icd_code: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true }, // Default value to true (active)
    type: {
      type: String,
      enum: ["Air custodian", "CFS", "Ports", "Empty yard", "ICD", "Terminal"],
      required: true, // Make sure it's always required
    },
    contactPersonName: { type: String, required: true, trim: true },
    contactPersonEmail: { type: String, required: true, trim: true },
    contactPersonPhone: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const PortICDcode = mongoose.model("PortICDcode", PortsCfsYardSchema);

export default PortICDcode;
