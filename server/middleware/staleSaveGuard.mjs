import JobModel from "../model/jobModel.mjs";
import { mergeRequestWithLatest } from "../utils/threeWayMerge.mjs";

// Kill switch: STALE_SAVE_GUARD_ENABLED=false restores the previous "page overwrites everything" saves
export const isStaleSaveGuardEnabled = () => process.env.STALE_SAVE_GUARD_ENABLED !== "false";

/**
 * Protects job saves from pages that were opened before someone else changed the job.
 *
 * Pages send `__base` (what they loaded, for the fields they save). Fields the page did not
 * change take the job's current value instead of the stale one. Requests without `__base`
 * (older pages) are passed through untouched. `__base` is always removed before the route runs.
 *
 * @param {(req) => object|null} findFilter - the same job filter the route itself uses
 */
export default function staleSaveGuard(findFilter) {
  return async (req, res, next) => {
    if (!req.body || typeof req.body !== "object" || !("__base" in req.body)) return next();

    const base = req.body.__base;
    delete req.body.__base;
    if (!isStaleSaveGuardEnabled() || !base || typeof base !== "object" || Array.isArray(base)) return next();

    try {
      const filter = findFilter(req);
      if (!filter) return next();
      const current = await JobModel.findOne(filter).lean();
      if (!current) return next();

      // Compare in the same JSON form the page received the job in
      const currentJson = JSON.parse(JSON.stringify(current));
      const { merged, conflicts } = mergeRequestWithLatest(req.body, base, currentJson);
      Object.assign(req.body, merged);

      if (conflicts.length > 0) {
        console.info(
          `[StaleSaveGuard] ${req.method} ${req.path}: kept this user's value where both users changed: ${conflicts.slice(0, 10).join(", ")}`
        );
      }
    } catch (err) {
      // Never block a save: on any problem, save exactly as before
      console.error("[StaleSaveGuard] merge skipped:", err.message);
    }
    next();
  };
}
