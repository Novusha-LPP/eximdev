import mongoose from "mongoose";

const CountrySchema = new mongoose.Schema(
  {
    cntry_cd: { type: String}, // Country Code
    cntry_nm: { type: String}, // Country Name
  },
  { timestamps: true } // Adds createdAt and updatedAt fields
);

export default mongoose.model("Country", CountrySchema);
