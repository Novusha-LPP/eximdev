import mongoose from "mongoose";

const ShippingLineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Uncomment if you want to enforce uniqueness
    },
  },
  { timestamps: true }
);

const ShippingLine = mongoose.model("ShippingLine", ShippingLineSchema);

export default ShippingLine;
