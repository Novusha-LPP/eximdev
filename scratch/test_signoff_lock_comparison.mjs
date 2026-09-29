import { isDeepStrictEqual } from "node:util";

function normalizeForComparison(val) {
  if (val === null || val === undefined || val === "") return "";
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? "" : val.toISOString();
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    return trimmed.toUpperCase();
  }
  if (typeof val === "number") return val;
  if (typeof val === "boolean") return val;
  if (Array.isArray(val)) {
    return val.map(normalizeForComparison);
  }
  if (typeof val === "object") {
    const res = {};
    const keys = Object.keys(val).sort();
    for (const key of keys) {
      if (
        key === "_id" ||
        key === "__v" ||
        key === "createdAt" ||
        key === "updatedAt"
      ) {
        continue;
      }
      const norm = normalizeForComparison(val[key]);
      if (norm !== "") {
        res[key] = norm;
      }
    }
    return res;
  }
  return val;
}

function areStagesEqual(existingStage, payloadStage) {
  const normExisting = normalizeForComparison(existingStage?.toObject ? existingStage.toObject() : existingStage);
  const normPayload = normalizeForComparison(payloadStage);
  return isDeepStrictEqual(normExisting, normPayload);
}

// Test 1: Unchanged Stage 1 (DB stage has _id fields and mixed casing, payload has no _id and uppercase)
const existingStage1 = {
  _id: "66f432109876543210abcdef",
  prNumber: "PR/SEP/05/26-27",
  preparedBy: "Hajari Yadav",
  routingChecklist: [
    { _id: "66f432109876543210abcde0", step: "Step 1", action: "PR Raised by Requester", responsible: "Operations Team", status: "Done" }
  ],
  hodValidation: {
    _id: "66f432109876543210abcde1",
    validatedBy: "MOHIT SINGH",
    designation: ""
  }
};

const payloadStage1 = {
  prNumber: "PR/SEP/05/26-27",
  preparedBy: "HAJARI YADAV",
  routingChecklist: [
    { step: "Step 1", action: "PR Raised by Requester", responsible: "Operations Team", status: "Done" }
  ],
  hodValidation: {
    validatedBy: "MOHIT SINGH"
  }
};

console.log("Test 1 - Unchanged Stage 1 equal?", areStagesEqual(existingStage1, payloadStage1));

// Test 2: Modified Stage 1 (User changes preparedBy)
const payloadStage1Modified = {
  ...payloadStage1,
  preparedBy: "NEW USER NAME"
};

console.log("Test 2 - Modified Stage 1 equal?", areStagesEqual(existingStage1, payloadStage1Modified));

if (areStagesEqual(existingStage1, payloadStage1) === true && areStagesEqual(existingStage1, payloadStage1Modified) === false) {
  console.log("SUCCESS: Stage lock comparison works correctly!");
} else {
  console.error("FAIL: Stage lock comparison failed logic!");
  process.exit(1);
}
