import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    postal_code: { type: String, required: true, unique: true, trim: true },
    city: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const Location = mongoose.model("Location", locationSchema);
export default Location;
