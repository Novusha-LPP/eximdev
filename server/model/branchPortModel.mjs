import mongoose from "mongoose";

const branchPortSchema = new mongoose.Schema({
    branch_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: true
    },
    port_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Port",
        required: true
    },
    assigned_at: {
        type: Date,
        default: Date.now
    }
});

// Ensure unique combination of branch and port
branchPortSchema.index({ branch_id: 1, port_id: 1 }, { unique: true });

const BranchPortModel = mongoose.model("BranchPort", branchPortSchema);
export default BranchPortModel;
