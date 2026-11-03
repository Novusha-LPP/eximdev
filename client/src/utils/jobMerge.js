// Three-way merge used when another user saves a job that is open on this page.
// base   = what this page last loaded from the server
// mine   = what the form holds now (including unsaved edits)
// theirs = what the server holds now
// Fields this user did not change take the server value; fields this user changed keep
// the user's value. When both changed the same field, the user's value is kept and the
// path is reported as a conflict.

const isPlainObject = (value) => {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

export function deepEqual(a, b) {
  if (a === b) return true;
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a).filter((k) => a[k] !== undefined);
    const keysB = Object.keys(b).filter((k) => b[k] !== undefined);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

const keyById = (item) => (item && item._id !== undefined && item._id !== null ? String(item._id) : undefined);
const hasSavedIds = (base, theirs) => {
  const saved = [...base, ...theirs];
  return saved.length > 0 && saved.every((item) => isPlainObject(item) && keyById(item) !== undefined);
};
const keyByContainerNumber = (item) => {
  const value = item && item.container_number !== undefined && item.container_number !== null ? String(item.container_number).trim() : "";
  return value ? value.toUpperCase() : undefined;
};
// Containers on this page have no _id: match them by container number when it is present and unique
const hasUniqueContainerNumbers = (...lists) =>
  lists.some((list) => list.length > 0) &&
  lists.every((list) => {
    const keys = list.map((item) => (isPlainObject(item) ? keyByContainerNumber(item) : undefined));
    return keys.every((k) => k !== undefined) && new Set(keys).size === keys.length;
  });

export function mergeThreeWay(base, mine, theirs, path = "", conflicts = []) {
  if (deepEqual(mine, base)) return theirs;
  if (deepEqual(theirs, base) || deepEqual(mine, theirs)) return mine;

  if (isPlainObject(base) && isPlainObject(mine) && isPlainObject(theirs)) {
    const out = {};
    const keys = new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(theirs)]);
    keys.forEach((key) => {
      const merged = mergeThreeWay(base[key], mine[key], theirs[key], path ? `${path}.${key}` : key, conflicts);
      if (merged !== undefined || key in mine) out[key] = merged;
    });
    return out;
  }

  // Saved subdocuments (e.g. queries) match by _id, so additions and deletions on either side survive
  if (Array.isArray(base) && Array.isArray(mine) && Array.isArray(theirs) && hasSavedIds(base, theirs)) {
    return mergeListByKey(base, mine, theirs, keyById, conflicts, `${path}:`);
  }
  if (Array.isArray(base) && Array.isArray(mine) && Array.isArray(theirs) && hasUniqueContainerNumbers(base, mine, theirs)) {
    return mergeListByKey(base, mine, theirs, keyByContainerNumber, conflicts, `${path}:`);
  }

  if (
    Array.isArray(base) &&
    Array.isArray(mine) &&
    Array.isArray(theirs) &&
    base.length === mine.length &&
    mine.length === theirs.length
  ) {
    return mine.map((item, i) => mergeThreeWay(base[i], item, theirs[i], `${path}[${i}]`, conflicts));
  }

  conflicts.push(path);
  return mine;
}

// Merge lists whose items are identified by a key (e.g. documents by document_name).
// Items without a key are rows this user is still filling in, so they are always kept.
export function mergeListByKey(baseList, mineList, theirsList, keyOf, conflicts = [], path = "") {
  const base = Array.isArray(baseList) ? baseList : [];
  const mine = Array.isArray(mineList) ? mineList : [];
  const theirs = Array.isArray(theirsList) ? theirsList : [];

  const baseMap = new Map(base.filter((i) => keyOf(i)).map((i) => [keyOf(i), i]));
  const theirsMap = new Map(theirs.filter((i) => keyOf(i)).map((i) => [keyOf(i), i]));
  const mineKeys = new Set();
  const out = [];

  mine.forEach((item) => {
    const key = keyOf(item);
    if (!key) {
      out.push(item);
      return;
    }
    mineKeys.add(key);
    const inBase = baseMap.has(key);
    const inTheirs = theirsMap.has(key);

    if (inBase && !inTheirs) {
      // Removed on the server: follow that unless this user edited the item
      if (deepEqual(item, baseMap.get(key))) return;
      conflicts.push(`${path}${key}`);
      out.push(item);
      return;
    }
    if (!inBase && !inTheirs) {
      out.push(item); // added by this user
      return;
    }
    out.push(mergeThreeWay(inBase ? baseMap.get(key) : undefined, item, theirsMap.get(key), `${path}${key}`, conflicts));
  });

  theirs.forEach((item) => {
    const key = keyOf(item);
    if (!key || mineKeys.has(key)) return;
    if (baseMap.has(key)) {
      // Removed by this user
      if (!deepEqual(item, baseMap.get(key))) conflicts.push(`${path}${key}`);
      return;
    }
    out.push(item); // added on the server
  });

  return out;
}

// Same overlay rule the job page uses on load: server documents override local ones by name
export function overlayByName(localList, serverList) {
  const out = (Array.isArray(localList) ? localList : []).map((d) => ({ ...d }));
  (Array.isArray(serverList) ? serverList : []).forEach((serverDoc) => {
    const idx = out.findIndex((d) => d.document_name === serverDoc.document_name);
    if (idx === -1) out.push(serverDoc);
    else out[idx] = { ...out[idx], ...serverDoc };
  });
  return out;
}

// Top-level field names from conflict paths, for a short message
export function conflictFieldNames(conflicts, limit = 5) {
  const names = [...new Set(conflicts.map((p) => String(p).split(/[.[:]/)[0]).filter(Boolean))];
  return names.length > limit ? [...names.slice(0, limit), `+${names.length - limit} more`] : names;
}
