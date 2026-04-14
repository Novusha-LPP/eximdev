import mongoose from "mongoose";
import { getContext } from "./context.mjs";

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
    } else {
        // Handle 'all' branches with authorization check
        const ctx = getContext();
        const user = ctx?.user;
        const authIds = authorizedBranchIds || user?.authorizedBranchIds;

        if (user && user.role !== 'Admin' && Array.isArray(authIds)) {
            match.branch_id = { $in: authIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) };
        }
        // Admin with 'all' or no authorized IDs results in no branch_id filter (showing all)
    }

    if (category && category.toString().toLowerCase() !== "all") {
        match.mode = category;
    }

    return match;
};
