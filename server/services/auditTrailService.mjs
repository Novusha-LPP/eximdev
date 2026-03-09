import AuditTrailModel from "../model/auditTrailModel.mjs";
import mongoose from "mongoose";

/**
 * Audit Trail Service
 * Centralized logic for tracking database changes
 */

// Helper to check deep equality
export function isDeepEqual(a, b) {
    if (a === b) return true;
    if (a === null || a === undefined || b === null || b === undefined) return a === b;

    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();

    if (
        (a instanceof mongoose.Types.ObjectId && b instanceof mongoose.Types.ObjectId) ||
        (a._bsontype === 'ObjectID' && b._bsontype === 'ObjectID') ||
        (a instanceof mongoose.Types.ObjectId && typeof b === 'string') ||
        (typeof a === 'string' && b instanceof mongoose.Types.ObjectId)
    ) {
        return a.toString() === b.toString();
    }

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!isDeepEqual(a[i], b[i])) return false;
        }
        return true;
    }

    if (typeof a === 'object' && typeof b === 'object') {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        for (const key of keysA) {
            if (!isDeepEqual(a[key], b[key])) return false;
        }
        return true;
    }

    return false;
}

// Compare two objects and find differences
export function findChanges(oldDoc, newDoc, parentPath = "", changes = []) {
    if (!oldDoc && !newDoc) return changes;

    if (!oldDoc && newDoc) {
        if (parentPath === "detailed_status" || parentPath.endsWith(".detailed_status")) return changes;
        changes.push({
            field: parentPath || "document",
            fieldPath: parentPath,
            oldValue: null,
            newValue: newDoc,
            changeType: "ADDED",
        });
        return changes;
    }

    if (oldDoc && !newDoc) {
        if (parentPath === "detailed_status" || parentPath.endsWith(".detailed_status")) return changes;
        changes.push({
            field: parentPath || "document",
            fieldPath: parentPath,
            oldValue: oldDoc,
            newValue: null,
            changeType: "REMOVED",
        });
        return changes;
    }

    if (Array.isArray(oldDoc) && Array.isArray(newDoc)) {
        const maxLength = Math.max(oldDoc.length, newDoc.length);
        for (let i = 0; i < maxLength; i++) {
            const currentPath = parentPath ? `${parentPath}.${i}` : `${i}`;
            if (currentPath.endsWith(".detailed_status") || currentPath === "detailed_status") continue;

            if (i >= oldDoc.length) {
                changes.push({ field: currentPath, fieldPath: currentPath, oldValue: undefined, newValue: newDoc[i], changeType: "ADDED" });
            } else if (i >= newDoc.length) {
                changes.push({ field: currentPath, fieldPath: currentPath, oldValue: oldDoc[i], newValue: undefined, changeType: "REMOVED" });
            } else {
                findChanges(oldDoc[i], newDoc[i], currentPath, changes);
            }
        }
        return changes;
    }

    if (typeof oldDoc === "object" && typeof newDoc === "object" && oldDoc !== null && newDoc !== null) {
        if (isDeepEqual(oldDoc, newDoc)) return changes;

        const allKeys = new Set([...Object.keys(oldDoc), ...Object.keys(newDoc)]);
        for (const key of allKeys) {
            if (key.startsWith("_") || key === "__v" || key === "updatedAt") continue;
            if (key === "detailed_status") continue;

            const currentPath = parentPath ? `${parentPath}.${key}` : key;
            const oldValue = oldDoc[key];
            const newValue = newDoc[key];

            if (oldValue === undefined && newValue !== undefined) {
                changes.push({ field: key, fieldPath: currentPath, oldValue: undefined, newValue: newValue, changeType: "ADDED" });
            } else if (oldValue !== undefined && newValue === undefined) {
                changes.push({ field: key, fieldPath: currentPath, oldValue: oldValue, newValue: undefined, changeType: "REMOVED" });
            } else if (!isDeepEqual(oldValue, newValue)) {
                if (typeof oldValue === "object" || typeof newValue === "object") {
                    findChanges(oldValue, newValue, currentPath, changes);
                } else {
                    changes.push({ field: key, fieldPath: currentPath, oldValue: oldValue, newValue: newValue, changeType: "MODIFIED" });
                }
            }
        }
        return changes;
    }

    if (oldDoc !== newDoc) {
        changes.push({
            field: parentPath.split(".").pop() || "value",
            fieldPath: parentPath,
            oldValue: oldDoc,
            newValue: newDoc,
            changeType: "MODIFIED",
        });
    }

    return changes;
}

// Generate a proper heading for the audit trail entry
export function generateHeading(documentType, action, doc, changes) {
    const identifiers = [];
    if (doc?.job_no) identifiers.push(`Job ${doc.job_no}/${doc.year || ''}`);
    if (doc?.username) identifiers.push(`User '${doc.username}'`);
    if (doc?.user_id) identifiers.push(`User '${doc.user_id}'`);
    if (doc?.importer_name) identifiers.push(`Importer '${doc.importer_name}'`);
    if (doc?.branch_name) identifiers.push(`Branch '${doc.branch_name}'`);
    if (doc?.branch_code && !doc.branch_name) identifiers.push(`Branch '${doc.branch_code}'`);
    if (doc?.party_name) identifiers.push(`Party '${doc.party_name}'`);
    if (doc?.name && !doc.username && !doc.branch_name) identifiers.push(`'${doc.name}'`);

    if (identifiers.length === 0) {
        if (doc?.id_no) identifiers.push(`ID ${doc.id_no}`);
        if (doc?.title) identifiers.push(`'${doc.title}'`);
    }

    const idStr = identifiers.length > 0 ? ` (${identifiers.join(', ')})` : '';
    const actionLabel = action.charAt(0) + action.slice(1).toLowerCase();

    return `${documentType}${idStr} ${actionLabel}`;
}

// core logging function
export async function logAuditTrail(data) {
    try {
        const auditEntry = new AuditTrailModel(data);
        return await auditEntry.save();
    } catch (error) {
        console.error("❌ AuditTrailService: Log failed", error);
        return null;
    }
}

export const getModel = async (documentType) => {
    try {
        switch (documentType) {
            case "Job": return (await import("../model/jobModel.mjs")).default;
            case "User": return (await import("../model/userModel.mjs")).default;
            case "inwardRegister": return (await import("../model/inwardRegisterModel.mjs")).default;
            case "outwardRegister": return (await import("../model/outwardRegisterModel.mjs")).default;
            case "Importer": return (await import("../model/importerSchemaModel.mjs")).default;
            case "Team": return (await import("../model/teamModel.mjs")).default;
            case "KPI_Sheet": return (await import("../model/kpi/kpiSheetModel.mjs")).default;
            case "KPI_Template": return (await import("../model/kpi/kpiTemplateModel.mjs")).default;
            case "KPI_Settings": return (await import("../model/kpi/kpiSettingsModel.mjs")).default;
            case "MRM_Item": return (await import("../model/mrm/mrmItemModel.mjs")).default;
            case "MRM_Metadata": return (await import("../model/mrm/mrmMetadataModel.mjs")).default;
            case "ReleaseNote": return (await import("../model/releaseNoteModel.js")).default;
            case "Feedback": return (await import("../model/feedbackModel.js")).default;
            case "ExitInterview": return (await import("../model/exitInterviewModel.mjs")).default;
            case "OpenPointProject": return (await import("../model/openPoints/openPointProjectModel.mjs")).default;
            case "OpenPoint": return (await import("../model/openPoints/openPointModel.mjs")).default;
            case "Branch": return (await import("../model/branchModel.mjs")).default;
            case "UserBranch": return (await import("../model/userBranchModel.mjs")).default;
            case "CurrencyRate": return (await import("../model/CurrencyRate.mjs")).default;
            default: return null;
        }
    } catch (error) {
        return null;
    }
};
