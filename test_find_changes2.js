const originalDocument = {
    date: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
    status: "open",
    number: 1,
    nested: {
        objId: "5f8d04f1b54764421b7156e0"
    }
};
const updatedDocument = {
    date: new Date("2023-01-02"), // Should be modified
    status: "open", // Unchanged
    number: "1", // Should be modified (type change)
    nested: {
        objId: "5f8d04f1b54764421b7156e1" // Should be modified
    }
};

function findChanges(oldDoc, newDoc, parentPath = "", changes = []) {
    if (!oldDoc && !newDoc) return changes;

    if (!oldDoc && newDoc) {
        changes.push({ field: parentPath, oldValue: null, newValue: newDoc, changeType: "ADDED" });
        return changes;
    }
    if (oldDoc && !newDoc) {
        changes.push({ field: parentPath, oldValue: oldDoc, newValue: null, changeType: "REMOVED" });
        return changes;
    }

    if (Array.isArray(oldDoc) && Array.isArray(newDoc)) {
        const maxLength = Math.max(oldDoc.length, newDoc.length);
        for (let i = 0; i < maxLength; i++) {
            findChanges(oldDoc[i], newDoc[i], parentPath ? `${parentPath}.${i}` : `${i}`, changes);
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
        // Check if both are Dates
        if (oldDoc instanceof Date && newDoc instanceof Date) {
            if (oldDoc.getTime() !== newDoc.getTime()) {
                changes.push({ field: parentPath.split(".").pop() || "value", fieldPath: parentPath, oldValue: oldDoc, newValue: newDoc, changeType: "MODIFIED" });
            }
            return changes;
        }

        // ObjectId comparison?
        if (oldDoc.toString && newDoc.toString && typeof oldDoc.toString === "function" && typeof newDoc.toString === "function") {
            // ... wait, in the original script it iterates keys.
        }

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
            } else if (oldValue !== newValue) {
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
        changes.push({ field: parentPath.split(".").pop() || "value", fieldPath: parentPath, oldValue: oldDoc, newValue: newDoc, changeType: "MODIFIED" });
    }

    return changes;
}

console.log(JSON.stringify(findChanges(originalDocument, updatedDocument), null, 2));
