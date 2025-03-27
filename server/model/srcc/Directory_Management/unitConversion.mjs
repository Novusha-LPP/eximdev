import mongoose from "mongoose";
const UnitConversionSchema = new mongoose.Schema(
  {
    uqc: {
      type: String,
      required: true,
      trim: true,
    },
    uqc_desc: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const UnitConversion = mongoose.model("UnitConversion", UnitConversionSchema);

export default UnitConversion;
