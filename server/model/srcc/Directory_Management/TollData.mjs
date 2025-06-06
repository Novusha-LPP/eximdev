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
          type: mongoose.Schema.Types.ObjectId,
          ref: "VehicleType",
        }
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
      type: mongoose.Schema.Types.ObjectId,
      ref: "TollData",
    },
  },
  { timestamps: true }
);

const TollData = mongoose.model("TollData", TollDataSchema);

export default TollData;
