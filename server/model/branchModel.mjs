import mongoose from "mongoose";

const branchSchema = new mongoose.Schema({
    branch_name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    icd_list: [
        {
            type: String,
            trim: true,
        },
    ],
    categories: [
        {
            type: String,
            enum: ["SEA", "AIR"],
            trim: true,
        },
    ],
    sea_behavior: {
        type: String,
        enum: ["HO SEA", "Other SEA"],
        default: "Other SEA",
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const BranchModel = mongoose.model("Branch", branchSchema);
export default BranchModel;
