// models/Elock.js
import mongoose from "mongoose";

const ElockSchema = new mongoose.Schema(
  {
    FAssetID: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^\d+$/.test(v); // Only allows digits
        },
        message: (props) =>
          `${props.value} is not a valid number! Only numbers are allowed.`,
      },
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "LOST"],
    },
  },
  { timestamps: true }
);

const Elock = mongoose.model("Elock", ElockSchema);

export default Elock;
