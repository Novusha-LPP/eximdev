import mongoose from "mongoose";

const billSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
        required: true
    },
    billNo: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        required: true,
        enum: ["GIA", "GIR"]
    },
    rows: {
        type: Array,
        default: []
    },
    editableFields: {
        type: Object,
        default: {}
    },
    totalTaxable: Number,
    totalNonGst: Number,
    totalCgst: Number,
    totalSgst: Number,
    finalTotal: Number,
    lastSaved: {
        type: Date,
        default: Date.now
    },
    generatedByFirstName: String,
    generatedByLastName: String,
    generatedAt: Date
}, { timestamps: true });

// Index for quick retrieval by job and type
billSchema.index({ jobId: 1, type: 1 });

const BillModel = mongoose.model("Bill", billSchema);
export default BillModel;
