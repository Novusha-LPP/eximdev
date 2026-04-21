import mongoose from "mongoose";

const billSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
        required: true
    },
    billNo: {
        type: String,
        required: true
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
    roundOff: Number,
    finalTotal: Number,
    lastSaved: {
        type: Date,
        default: Date.now
    },
    generatedByFirstName: String,
    generatedByLastName: String,
    generatedAt: Date
}, { timestamps: true });

// Index for quick retrieval and uniqueness by job and type
billSchema.index({ jobId: 1, type: 1 }, { unique: true });

// Partial unique index for billNo: Ensure real invoice numbers are globally unique, 
// but allow multiple draft bills with empty strings.
billSchema.index({ billNo: 1 }, { 
    unique: true, 
    partialFilterExpression: { billNo: { $gt: "" } } 
});

const BillModel = mongoose.model("Bill", billSchema);
export default BillModel;
