import mongoose from "mongoose";

const assetSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "asset_approval_config" },
    first_approver_username: { type: String, required: true, default: "shalini_arun", trim: true },
    first_approver_name: { type: String, default: "Shalini Arun", trim: true },
    first_approver_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by_username: { type: String, default: "manu_pillai" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

const AssetSetting = mongoose.model("AssetSetting", assetSettingSchema);
export default AssetSetting;
