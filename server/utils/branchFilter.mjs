import mongoose from "mongoose";

/**
 * Generates a MongoDB match object for branch filtering.
 * @param {string} branchId - The specific branch ID to filter by.
 * @param {string} category - The category (mode) to filter by (SEA/AIR).
 * @returns {object} - A match object (e.g., { branch_id: ObjectId(...) } or { mode: 'SEA' }).
 */
export const getBranchMatch = (branchId, category, authorizedBranchIds = null) => {
    let match = {};

    const isAll = !branchId || branchId.toString().toLowerCase() === "all" || branchId === "";

    if (!isAll) {
        if (Array.isArray(branchId)) {
            match.branch_id = { $in: branchId.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) };
        } else if (mongoose.Types.ObjectId.isValid(branchId)) {
            match.branch_id = new mongoose.Types.ObjectId(branchId);
        } else {
            match.branch_id = branchId;
        }
    } else if (authorizedBranchIds && Array.isArray(authorizedBranchIds)) {
        match.branch_id = { $in: authorizedBranchIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) };
    }

    if (category && category.toString().toLowerCase() !== "all") {
        match.mode = category;
    }

    return match;
};
