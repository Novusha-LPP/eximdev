/**
 * Three-way merge for job saves made from a page that may be out of date.
 *
 *   base   = the value the page loaded (sent back by the page as __base)
 *   mine   = the value the page is saving now
 *   theirs = the value in the database now
 *
 * Rules (in this order):
 *   1. Nobody else changed the field since the page loaded -> save exactly what the page sent.
 *      A normal single-user save is therefore unchanged.
 *   2. Only someone else changed it -> keep their value.
 *   3. Both changed it -> merge inside lists/objects where possible; where both changed the
 *      same value, the page's value wins (the previous behaviour).
 *
 * Values are compared loosely so an untouched form field matches what was loaded:
 * missing, null, "", false, [] and {} count as the same "empty" value, and primitives
 * compare by their string form (5 === "5", true === "true").
 */

const isPlainObject = (value) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const isEmptyish = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  value === false ||
  (Array.isArray(value) && value.length === 0) ||
  (isPlainObject(value) && Object.keys(value).length === 0);

export function sameValue(a, b) {
  if (a === b) return true;
  if (isEmptyish(a) && isEmptyish(b)) return true;

  const aIsObject = a !== null && typeof a === "object";
  const bIsObject = b !== null && typeof b === "object";
  if (!aIsObject && !bIsObject) {
    if (a === null || a === undefined || b === null || b === undefined) return false;
    return String(a) === String(b);
  }
  if (aIsObject !== bIsObject || Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    return a.length === b.length && a.every((item, i) => sameValue(item, b[i]));
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!sameValue(a[key], b[key])) return false;
  }
  return true;
}

const isPrimitive = (value) => value === null || (typeof value !== "object" && typeof value !== "function");

const idOf = (item) => (item._id === undefined || item._id === null ? undefined : String(item._id));
const containerNumberOf = (item) => {
  const value = item.container_number === undefined || item.container_number === null ? "" : String(item.container_number).trim();
  return value ? value.toUpperCase() : undefined;
};
const hasUniqueKeys = (list, keyOf) => {
  const keys = list.map(keyOf);
  return keys.every((k) => k !== undefined) && new Set(keys).size === keys.length;
};

// How list items are matched, or null to match by position:
//  - plain values by value (e.g. file URLs)
//  - subdocuments by _id, when the page keeps _ids (new items on the page may not have one yet)
//  - otherwise by container number, when it is present and unique in every version
const listKeyFor = (base, mine, theirs) => {
  const all = [...base, ...mine, ...theirs];
  if (all.length === 0) return null;
  if (all.every(isPrimitive)) return (item) => JSON.stringify(item);
  if (!all.every((item) => isPlainObject(item))) return null;

  const saved = [...base, ...theirs];
  const pageKeepsIds = mine.length === 0 || mine.some((item) => idOf(item) !== undefined);
  if (pageKeepsIds && hasUniqueKeys(base, idOf) && hasUniqueKeys(theirs, idOf) && saved.every((item) => idOf(item) !== undefined)) {
    return idOf;
  }
  if ([base, mine, theirs].every((list) => hasUniqueKeys(list, containerNumberOf))) {
    return containerNumberOf;
  }
  return null;
};

function mergeKeyedList(base, mine, theirs, keyOf, path, conflicts) {
  const baseMap = new Map();
  base.forEach((item) => baseMap.set(keyOf(item), item));
  const theirsMap = new Map();
  theirs.forEach((item) => theirsMap.set(keyOf(item), item));

  const out = [];
  const mineKeys = new Set();

  mine.forEach((item) => {
    const key = keyOf(item);
    if (key === undefined) {
      out.push(item); // new on this page
      return;
    }
    mineKeys.add(key);
    const inBase = baseMap.has(key);
    const inTheirs = theirsMap.has(key);

    if (inBase && !inTheirs) {
      // Someone else removed it: follow that unless this page edited it
      if (sameValue(item, baseMap.get(key))) return;
      conflicts.push(`${path}[${key}]`);
      out.push(item);
      return;
    }
    if (!inTheirs) {
      out.push(item);
      return;
    }
    out.push(merge3(baseMap.get(key), item, theirsMap.get(key), `${path}[${key}]`, conflicts));
  });

  theirs.forEach((item) => {
    const key = keyOf(item);
    if (key === undefined || mineKeys.has(key)) return;
    if (baseMap.has(key)) {
      // Removed on this page
      if (!sameValue(item, baseMap.get(key))) conflicts.push(`${path}[${key}]`);
      return;
    }
    out.push(item); // added by someone else
  });

  return out;
}

export function merge3(base, mine, theirs, path = "", conflicts = []) {
  if (sameValue(theirs, base)) return mine;
  if (sameValue(mine, base)) return theirs;
  if (sameValue(mine, theirs)) return mine;

  if (Array.isArray(mine) && Array.isArray(theirs) && (Array.isArray(base) || base === undefined || base === null)) {
    const baseList = Array.isArray(base) ? base : [];
    const keyOf = listKeyFor(baseList, mine, theirs);
    if (keyOf) return mergeKeyedList(baseList, mine, theirs, keyOf, path, conflicts);
    if (baseList.length === mine.length && mine.length === theirs.length) {
      return mine.map((item, i) => merge3(baseList[i], item, theirs[i], `${path}[${i}]`, conflicts));
    }
    conflicts.push(path);
    return mine;
  }

  if (isPlainObject(mine) && isPlainObject(theirs) && (isPlainObject(base) || base === undefined || base === null)) {
    const baseObj = isPlainObject(base) ? base : {};
    const out = {};
    const keys = new Set([...Object.keys(baseObj), ...Object.keys(mine), ...Object.keys(theirs)]);
    keys.forEach((key) => {
      if (!(key in mine) && !(key in theirs)) return;
      const merged = merge3(baseObj[key], mine[key], theirs[key], path ? `${path}.${key}` : key, conflicts);
      if (merged !== undefined || key in mine) out[key] = merged;
    });
    return out;
  }

  conflicts.push(path);
  return mine;
}

const NEVER_MERGED = new Set(["_id", "jobId", "__base"]);

/**
 * Merge a save request with the job's current state. Only values change: the set of
 * keys in the request is kept, so route logic that checks which fields were sent is unaffected.
 */
export function mergeRequestWithLatest(body, base, current) {
  const conflicts = [];
  const merged = {};
  Object.keys(body).forEach((key) => {
    merged[key] = NEVER_MERGED.has(key) ? body[key] : merge3(base[key], body[key], current[key], key, conflicts);
  });
  return { merged, conflicts };
}
