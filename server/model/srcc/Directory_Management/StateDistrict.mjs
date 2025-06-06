import mongoose from "mongoose";

const stateDistrictSchema = new mongoose.Schema(
  {
    states: [
      {
        state: { type: String, required: true, unique: true },
        districts: { type: [String], required: true },
      },
    ],
  },
  { timestamps: true }
);

const StateDistrict = mongoose.model("StateDistrict", stateDistrictSchema);
export default StateDistrict;
