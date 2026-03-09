const mongoose = require('mongoose');

// Helper to check deep equality for findChanges
function isDeepEqual(a, b) {
    if (a === b) return true;

    if (a === null || a === undefined || b === null || b === undefined) {
        return a === b;
    }

    // Handle Dates
    if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
    }

    // Handle ObjectIds
    if (
        (a instanceof mongoose.Types.ObjectId && b instanceof mongoose.Types.ObjectId) ||
        (a._bsontype === 'ObjectID' && b._bsontype === 'ObjectID') ||
        (a instanceof mongoose.Types.ObjectId && typeof b === 'string') ||
        (typeof a === 'string' && b instanceof mongoose.Types.ObjectId)
    ) {
        return a.toString() === b.toString();
    }

    // Handle Arrays
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!isDeepEqual(a[i], b[i])) return false;
        }
        return true;
    }

    // Handle Objects
    if (typeof a === 'object' && typeof b === 'object') {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        // Ignore Mongoose specific/internal keys for this comparison if needed, though findChanges filters them earlier usually.
        // But for a pure isEqual, we just compare all keys
        if (keysA.length !== keysB.length) return false;

        for (const key of keysA) {
            if (!isDeepEqual(a[key], b[key])) return false;
        }
        return true;
    }

    return false;
}

function findChanges(oldDoc, newDoc, parentPath = "", changes = []) {
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
                changes.push({
                    field: currentPath,
                    fieldPath: currentPath,
                    oldValue: undefined,
                    newValue: newDoc[i],
                    changeType: "ADDED",
                });
            } else if (i >= newDoc.length) {
                changes.push({
                    field: currentPath,
                    fieldPath: currentPath,
                    oldValue: oldDoc[i],
                    newValue: undefined,
                    changeType: "REMOVED",
                });
            } else {
                findChanges(oldDoc[i], newDoc[i], currentPath, changes);
            }
        }
        return changes;
    }

    if (
        typeof oldDoc === "object" &&
        typeof newDoc === "object" &&
        oldDoc !== null &&
        newDoc !== null &&
        !Array.isArray(oldDoc) &&
        !Array.isArray(newDoc)
    ) {

        // Check if these are equal objects (like same Date or same ObjectId)
        if (isDeepEqual(oldDoc, newDoc)) {
            return changes;
        }

        const allKeys = new Set([...Object.keys(oldDoc), ...Object.keys(newDoc)]);

        for (const key of allKeys) {
            if (key.startsWith("_") || key === "__v" || key === "updatedAt") continue;
            if (key === "detailed_status") continue;

            const currentPath = parentPath ? `${parentPath}.${key}` : key;

            if (currentPath.endsWith(".detailed_status") || currentPath === "detailed_status") continue;

            const oldValue = oldDoc[key];
            const newValue = newDoc[key];

            if (oldValue === undefined && newValue !== undefined) {
                changes.push({
                    field: key,
                    fieldPath: currentPath,
                    oldValue: undefined,
                    newValue: newValue,
                    changeType: "ADDED",
                });
            } else if (oldValue !== undefined && newValue === undefined) {
                changes.push({
                    field: key,
                    fieldPath: currentPath,
                    oldValue: oldValue,
                    newValue: undefined,
                    changeType: "REMOVED",
                });
            } else if (!isDeepEqual(oldValue, newValue)) {
                if (typeof oldValue === "object" || typeof newValue === "object") {
                    findChanges(oldValue, newValue, currentPath, changes);
                } else {
                    changes.push({
                        field: key,
                        fieldPath: currentPath,
                        oldValue: oldValue,
                        newValue: newValue,
                        changeType: "MODIFIED",
                    });
                }
            }
        }

        return changes;
    }

    if (oldDoc !== newDoc) {
        if (parentPath === "detailed_status" || parentPath.endsWith(".detailed_status")) return changes;

        changes.push({
            field: parentPath.split(".").pop() || "value",
            fieldPath: parentPath,
            oldValue: oldDoc,
            newValue: newDoc,
            changeType: "MODIFIED",
        });
    }

    return changes.filter((change) => {
        const shouldSkip =
            change.field === "detailed_status" ||
            change.fieldPath === "detailed_status" ||
            change.fieldPath.endsWith(".detailed_status");
        return !shouldSkip;
    });
}

// Test cases
const oldData = {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    status: 'pending',
    nested: {
        _id: new mongoose.Types.ObjectId('507f191e810c19729de860ea'), // Unchanged, but previously it was flagging it
        detail: 'old'
    },
    items: [
        {
            _id: new mongoose.Types.ObjectId('507f191e810c19729de860eb'), // Unchanged
            qty: 1
        }
    ],
    detailed_status: 'should be ignored', // Should be ignored
    someDate: new Date('2023-01-01T00:00:00.000Z')
};

const newData = {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
    createdAt: new Date('2023-01-01T00:00:00.000Z'), // Unchanged Date
    updatedAt: new Date('2023-01-02T00:00:00.000Z'), // Ignored usually by logic, but Date changed
    status: 'completed', // MODIFIED
    nested: {
        _id: new mongoose.Types.ObjectId('507f191e810c19729de860ea'), // Same ID, but diff instance
        detail: 'new' // MODIFIED
    },
    items: [
        {
            _id: new mongoose.Types.ObjectId('507f191e810c19729de860eb'), // Same ID, diff instance
            qty: 2 // MODIFIED
        }
    ],
    detailed_status: 'should STILL be ignored', // Ignored
    someDate: new Date('2023-02-01T00:00:00.000Z') // MODIFIED Date
};

const c = findChanges(oldData, newData);
console.log(JSON.stringify(c, null, 2));
