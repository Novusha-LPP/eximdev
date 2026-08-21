import mongoose from "mongoose";
import { getContext } from "./context.mjs";

/**
 * Generates a MongoDB match object for branch filtering.
 * Supports both branch ObjectIds and branch codes (e.g. 'AMD', 'GIM').
 * @param {string|Array} branchId - The specific branch ID or branch code to filter by.
 * @param {string} category - The category (mode) to filter by (SEA/AIR).
 * @param {Array} authorizedBranchIds - Optional array of authorized branch IDs for non-admin users.
 * @returns {object} - A match object (e.g., { branch_id: ObjectId(...) } or { mode: 'SEA' }).
 */
export const getBranchMatch = (branchId, category, authorizedBranchIds = null) => {
    let match = {};

    const isAll = !branchId || branchId.toString().toLowerCase() === "all" || branchId === "";

    if (!isAll) {
        if (Array.isArray(branchId)) {
            const objectIds = [];
            const codes = [];
            branchId.forEach(id => {
                if (id) {
                    const idStr = id.toString();
                    if (mongoose.Types.ObjectId.isValid(idStr) && idStr.length === 24) {
                        objectIds.push(new mongoose.Types.ObjectId(idStr));
                    } else {
                        codes.push(idStr);
                    }
                }
            });
            if (objectIds.length > 0 && codes.length > 0) {
                match.$or = [
                    { branch_id: { $in: objectIds } },
                    { branch_code: { $in: codes.map(c => new RegExp(`^${c}$`, 'i')) } }
                ];
            } else if (objectIds.length > 0) {
                match.branch_id = { $in: objectIds };
            } else if (codes.length > 0) {
                match.branch_code = { $in: codes.map(c => new RegExp(`^${c}$`, 'i')) };
            }
        } else if (mongoose.Types.ObjectId.isValid(branchId) && branchId.toString().length === 24) {
            match.$or = [
                { branch_id: new mongoose.Types.ObjectId(branchId) },
                { branch_code: new RegExp(`^${branchId}$`, 'i') }
            ];
        } else {
            match.branch_code = new RegExp(`^${branchId}$`, 'i');
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
        const catStr = category.toString();
        match.mode = { $in: [catStr, catStr.toLowerCase(), catStr.toUpperCase()] };
    }

    return match;
};
