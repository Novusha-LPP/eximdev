import UserBranchModel from "../model/userBranchModel.mjs";
import BranchModel from "../model/branchModel.mjs";
import mongoose from "mongoose";

/**
 * Gets a match object for branch filtering, respecting user assignments.
 * @param {object} req - Express request object (containing user/headers)
 * @param {string} branchId - Specific branch ID or 'all'
 * @param {string} category - SEA or AIR
 * @returns {Promise<object>} - MongoDB match object
 */
export const getAuthorizedBranchMatch = async (req, branchId, category) => {
    let match = {};
    const userId = req.headers['user-id'] || req.user?.username || req.user?._id;
    const role = req.user?.role;

    // 1. If a specific branch is requested
    if (branchId && branchId.toString().toLowerCase() !== "all" && branchId !== "") {
        if (mongoose.Types.ObjectId.isValid(branchId)) {
            match.branch_id = new mongoose.Types.ObjectId(branchId);
        } else {
            match.branch_id = branchId;
        }
    }
    // 2. If 'all' branches are requested, filter by assignments
    else if (userId) {
        const assignments = await UserBranchModel.find({ user_id: userId });

        if (assignments.length > 0) {
            const branchIds = assignments.map(a => a.branch_id);
            match.branch_id = { $in: branchIds.map(id => new mongoose.Types.ObjectId(id)) };
        } else if (role !== 'Admin') {
            // Non-admin with no assignments sees nothing
            match.branch_id = { $in: [] };
        }
        // Admin with no assignments sees everything (no branch_id filter)
    }

    // 3. Category Filter
    if (category) {
        match.mode = category;
    }

    return match;
};
