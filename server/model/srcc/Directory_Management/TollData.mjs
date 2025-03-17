import mongoose from "mongoose";

const TollDataSchema = new mongoose.Schema(
  {
    tollBoothName: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleType: [
      {
        name: { type: String, required: true, trim: true }, // Full name of vehicle
        shortName: { type: String, required: true, trim: true }, // Short name (code)
        GVW: { type: String, required: true, trim: true }, // Gross Vehicle Weight
      },
    ],
    fastagClassId: {
      type: String,
      required: true,
      trim: true,
    },
    singleAmount: {
      type: Number,
    },
    returnAmount: {
      type: Number,
    },
    secondPassTollBooth: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const TollData = mongoose.model("TollData", TollDataSchema);

export default TollData;
