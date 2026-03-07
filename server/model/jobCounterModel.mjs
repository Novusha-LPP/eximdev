import mongoose from "mongoose";

const jobCounterSchema = new mongoose.Schema({
    branch_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: true
    },
    trade_type: {
        type: String,
        required: true,
        enum: ["IMP", "EXP"]
    },
    mode: {
        type: String,
        required: true,
        enum: ["SEA", "AIR"]
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

// Unique index to prevent duplicate counters
jobCounterSchema.index({ branch_id: 1, trade_type: 1, mode: 1, financial_year: 1 }, { unique: true });

const JobCounterModel = mongoose.model("JobCounter", jobCounterSchema);
export default JobCounterModel;
