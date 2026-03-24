import mongoose from "mongoose";
import auditPlugin from "../plugins/auditPlugin.mjs";

const userBranchSchema = new mongoose.Schema({
    user_id: {
        type: String, // Assuming usernames or specific user identifiers are used based on app.mjs
        required: true
    },
    branch_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: true
    },
    assigned_at: {
        type: Date,
        default: Date.now
    }
});

userBranchSchema.index({ user_id: 1, branch_id: 1 }, { unique: true });

userBranchSchema.plugin(auditPlugin, { documentType: "UserBranch" });

const UserBranchModel = mongoose.model("UserBranch", userBranchSchema);
export default UserBranchModel;
