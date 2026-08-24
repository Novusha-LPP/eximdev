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
        const catStr = category.toString().trim().toLowerCase();
        if (catStr === 'sea' || catStr === 'ocean') {
            match.mode = { $in: ["SEA", "sea", "Sea", "OCEAN", "ocean", "Ocean", "BY SEA", "by sea", "By Sea"] };
        } else if (catStr === 'air') {
            match.mode = { $in: ["AIR", "air", "Air", "BY AIR", "by air", "By Air"] };
        } else {
            match.mode = new RegExp(`^${category.toString().trim()}$`, 'i');
        }
    }

    return match;
};

/**
 * Generates a MongoDB match object specifically for exportjobs collection.
 * exportjobs stores branches as `branch_code` (e.g. 'AMD', 'GIM') and mode as `transportMode`.
 * Resolves ObjectIds to branch_codes when necessary.
 */
export const getExportBranchMatch = async (branchId, category, authorizedBranchIds = null) => {
    let match = {};

    const isAll = !branchId || branchId.toString().toLowerCase() === "all" || branchId === "";
    let targetBranchCodes = [];

    const db = mongoose.connection;
    let branchDocs = null;
    const getBranches = async () => {
        if (!branchDocs) {
            try {
                branchDocs = await db.collection("branches").find({}).toArray();
            } catch {
                branchDocs = [];
            }
        }
        return branchDocs || [];
    };

    if (!isAll) {
        const ids = Array.isArray(branchId) ? branchId : [branchId];
        const allBranches = await getBranches();
        for (const id of ids) {
            if (!id) continue;
            const idStr = id.toString().trim();
            if (mongoose.Types.ObjectId.isValid(idStr) && idStr.length === 24) {
                const found = allBranches.filter(b => b._id.toString() === idStr);
                found.forEach(b => {
                    if (b.branch_code) targetBranchCodes.push(b.branch_code);
                });
            } else {
                targetBranchCodes.push(idStr);
            }
        }
    } else {
        const ctx = getContext();
        const user = ctx?.user;
        const authIds = authorizedBranchIds || user?.authorizedBranchIds;

        if (user && user.role !== 'Admin' && Array.isArray(authIds) && authIds.length > 0) {
            const allBranches = await getBranches();
            const authIdStrs = authIds.map(i => i.toString());
            const allowed = allBranches.filter(b => authIdStrs.includes(b._id.toString()));
            targetBranchCodes = allowed.map(b => b.branch_code).filter(Boolean);
        }
    }

    if (targetBranchCodes.length > 0) {
        const uniqueCodes = Array.from(new Set(targetBranchCodes.map(c => c.toUpperCase())));
        match.branch_code = {
            $in: uniqueCodes.map(c => new RegExp(`^${c}$`, 'i'))
        };
    }

    if (category && category.toString().toLowerCase() !== "all") {
        const catStr = category.toString().trim().toLowerCase();
        if (catStr === 'sea' || catStr === 'ocean') {
            match.transportMode = { $in: ["SEA", "sea", "Sea", "OCEAN", "ocean", "Ocean", "BY SEA", "by sea", "By Sea"] };
        } else if (catStr === 'air') {
            match.transportMode = { $in: ["AIR", "air", "Air", "BY AIR", "by air", "By Air"] };
        } else {
            match.transportMode = new RegExp(`^${category.toString().trim()}$`, 'i');
        }
    }

    return match;
};
