const originalDocument = { date: new Date("2023-01-01"), objId: "5f8d04f1b54764421b7156e0" };
const updatedDocument = { date: new Date("2023-01-02"), objId: "5f8d04f1b54764421b7156e0".toString() };

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
            findChanges(oldDoc[i], newDoc[i], `${parentPath}.${i}`, changes);
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
        // FIX applied here for Date and ObjectId? No, keeping original code.
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

const sameObjId1 = { id: { _bsontype: "ObjectID", id: "buffer..." } };
const sameObjId2 = { id: { _bsontype: "ObjectID", id: "buffer..." } };
console.log(JSON.stringify(findChanges(sameObjId1, sameObjId2), null, 2));

