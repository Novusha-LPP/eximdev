import mongoose from "mongoose";

const ShippingLineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    organisation: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organisation",
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
    },
    code: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  { timestamps: true }
);

const ShippingLine = mongoose.model("ShippingLine", ShippingLineSchema);

export default ShippingLine;
