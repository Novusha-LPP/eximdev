import mongoose from "mongoose";

const CommoditySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    hsn_code: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const CommodityCode = mongoose.model("CommodityCode", CommoditySchema);

export default CommodityCode;
