import mongoose from "mongoose";

const Schema = mongoose.Schema;

const KPIRowSchema = new Schema({
    id: {
        type: String,
        required: true, // e.g. 'billing_cc' - stable ID across versions
    },
    label: {
        type: String, // Display Name
        required: true,
    },
    category: {
        type: String, // Grouping header if any
    },
    type: {
        type: String,
        enum: ["numeric", "calculated"],
        default: "numeric",
    },
    is_high_volume: {
        type: Boolean,
        default: false,
    },
});

const KPITemplateSchema = new Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        department: {
            type: [String],
            required: true,
        },
        rows: [KPIRowSchema],
        version: {
            type: Number,
            default: 1,
        },
        is_active: {
            type: Boolean,
            default: true,
        },
        parent_template: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "KPITemplate", // If imported from another user
        },
    },
    { timestamps: true }
);

// Compound index to ensure unique template name per owner? Or maybe just per dept?
// Prompt says: "Each KPI sheet is uniquely identified by User + Dept + Year + Month"
// Templates are reusable.
// "Templates can be: System-provided, User-created, Imported"

const KPITemplate = mongoose.model("KPITemplate", KPITemplateSchema);
export default KPITemplate;
