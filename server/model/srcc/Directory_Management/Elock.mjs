import mongoose from "mongoose";

const ElockSchema = new mongoose.Schema(
  {
    ElockNumber: {  // Renamed from FAssetID
      type: String,
      required: true,
      trim: true,
      unique: true,
    }
  },
  { timestamps: true }
);

const Elock = mongoose.model("Elock", ElockSchema);

export default Elock;