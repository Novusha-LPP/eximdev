import mongoose from "mongoose";

/**
 * Generates a MongoDB match object for branch filtering.
 * @param {string} branchId - The specific branch ID to filter by.
 * @param {string} category - The category (mode) to filter by (SEA/AIR).
 * @returns {object} - A match object (e.g., { branch_id: ObjectId(...) } or { mode: 'SEA' }).
 */
export const getBranchMatch = (branchId, category) => {
    let match = {};

    if (branchId && branchId.toString().toLowerCase() !== "all" && branchId !== "") {
        if (mongoose.Types.ObjectId.isValid(branchId)) {
            match.branch_id = new mongoose.Types.ObjectId(branchId);
        } else {
            match.branch_id = branchId;
        }
    }

    if (category) {
        match.mode = category;
    }

    return match;
};
