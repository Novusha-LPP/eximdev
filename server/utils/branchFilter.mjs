import mongoose from "mongoose";

/**
 * Generates a MongoDB match object for branch filtering.
 * @param {string} branchId - The branch ID to filter by.
 * @returns {object} - A match object (e.g., { branch_id: ObjectId(...) }).
 */
export const getBranchMatch = (branchId) => {
    if (!branchId || branchId.toString().toLowerCase() === "all" || branchId === "") {
        return {};
    }

    try {
        // If it's a valid hex string, convert to ObjectId
        if (mongoose.Types.ObjectId.isValid(branchId)) {
            return { branch_id: new mongoose.Types.ObjectId(branchId) };
        }
        // Otherwise return as is (could be a string identifier in some cases)
        return { branch_id: branchId };
    } catch (e) {
        return { branch_id: branchId };
    }
};
