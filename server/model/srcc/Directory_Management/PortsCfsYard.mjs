import mongoose from "mongoose";

const PortsCfsYardSchema = new mongoose.Schema(
  {
    organisation: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organisation",
        required: true,
      },
    },
    name: { type: String, required: true, trim: true },
    icd_code: { type: String, required: true, trim: true, unique: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
    type: {
      type: String,
      enum: ["Air custodian", "CFS", "Ports", "Empty yard", "ICD", "Terminal"],
      required: true,
    },
    contactPersonName: { type: String, trim: true },
    contactPersonEmail: { type: String, trim: true },
    contactPersonPhone: { type: String, trim: true },
    isBranch: { type: Boolean, default: false },
    prefix: { type: String, trim: true },
    suffix: { type: String, trim: true },
  },
  { timestamps: true }
);

const PortICDcode = mongoose.model("PortICDcode", PortsCfsYardSchema);

export default PortICDcode;
