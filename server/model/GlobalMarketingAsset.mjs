import mongoose from "mongoose";

const globalMarketingAssetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  link: {
    type: String,
    required: true,
  },
  type: {
    type: String, // 'file' or 'text'
    default: 'file'
  },
  updatedBy: {
    type: String,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const GlobalMarketingAsset = mongoose.model("GlobalMarketingAsset", globalMarketingAssetSchema);
export default GlobalMarketingAsset;
