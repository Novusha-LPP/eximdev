import mongoose from "mongoose";

const CountrySchema = new mongoose.Schema(
  {
    cntry_cd: { type: String}, // Country Code
    cntry_nm: { type: String}, // Country Name
    dgcis_cd: { type: String }, // DGCIS Code
    cntry_cd_old: { type: String }, // Old Country Code
    aepc_cntry_cd: { type: String }, // AEPC Country Code
    cntry_grp: { type: String }, // Country Group
    ref_cntry_cd: { type: String }, // Reference Country Code
    status: { type: String }, // Status
  },
  { timestamps: true } // Adds createdAt and updatedAt fields
);

export default mongoose.model("Country", CountrySchema);
