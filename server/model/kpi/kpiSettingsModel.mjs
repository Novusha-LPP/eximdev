import mongoose from "mongoose";

const Schema = mongoose.Schema;

const KPISettingsSchema = new Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
        },
        value: {
            type: Schema.Types.Mixed,
            required: true,
        },
        updated_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

const KPISettings = mongoose.model("KPISettings", KPISettingsSchema);
export default KPISettings;
