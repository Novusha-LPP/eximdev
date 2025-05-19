import mongoose from "mongoose";

const LrTrackingStagesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const LrTrackingStages = mongoose.model(
  "LrTrackingStages",
  LrTrackingStagesSchema
);
export default LrTrackingStages;
