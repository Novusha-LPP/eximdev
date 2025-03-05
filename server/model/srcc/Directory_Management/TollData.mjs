import mongoose from "mongoose";

const TollDataSchema = new mongoose.Schema(
  {
    tollBoothName: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleType: {
      type: String, // or reference an ObjectId if needed
      required: true,
      trim: true,
    },
    fastagClassId: {
      type: String,
      required: true,
      trim: true,
    },
    singleAmount: {
      type: Number,
      required: true,
    },
    returnAmount: {
      type: Number,
      required: true,
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
