import mongoose from "mongoose";

const repairTypeSchema = new mongoose.Schema({
  repair_type: {
    type: String,
    trim: true,
  },
});

export default mongoose.model("RepairTypes", repairTypeSchema);
