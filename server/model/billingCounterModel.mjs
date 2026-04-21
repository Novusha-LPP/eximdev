import mongoose from "mongoose";

const billingCounterSchema = new mongoose.Schema({
    prefix: {
        type: String,
        required: true,
        enum: ["GIA", "GIR", "BILLING"]
    },
    financial_year: {
        type: String,
        required: true
    },
    last_sequence: {
        type: Number,
        default: 0
    }
});

// Unique index to prevent duplicates
billingCounterSchema.index({ prefix: 1, financial_year: 1 }, { unique: true });

const BillingCounterModel = mongoose.model("BillingCounter", billingCounterSchema);
export default BillingCounterModel;
