import mongoose from 'mongoose';
import auditPlugin from "../../plugins/auditPlugin.mjs";

const mrmItemSchema = new mongoose.Schema({
    month: { type: String, required: true }, // e.g., "01", "02"
    year: { type: Number, required: true }, // e.g., 2026
    processDescription: { type: String },
    objective: { type: String },
    target: { type: String },
    monitoringFrequency: { type: String },
    responsibility: { type: String },
    actual: { type: String },
    plan: { type: String },
    actionPlan: { type: String },
    responsibilityAction: { type: String },
    targetDate: { type: Date },
    status: { type: String, default: 'Gray' }, // Green, Red, Yellow
    remarks: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    seq: { type: Number, default: 0 },
}, { timestamps: true });

// Compound index to ensure uniqueness if needed, or just for querying
mrmItemSchema.index({ month: 1, year: 1 });

mrmItemSchema.plugin(auditPlugin, { documentType: "MRM_Item" });

const MRMItem = mongoose.model('MRMItem', mrmItemSchema);
export default MRMItem;
