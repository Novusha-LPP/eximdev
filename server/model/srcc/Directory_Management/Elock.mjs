import mongoose from "mongoose";

const ElockSchema = new mongoose.Schema(
  {
    FAssetID: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    FTokenID: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    FAgentGUID: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    AssetGUID: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    ElockCode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  { timestamps: true }
);

const Elock = mongoose.model("Elock", ElockSchema);

export default Elock; // Ensure the model is exported as default
