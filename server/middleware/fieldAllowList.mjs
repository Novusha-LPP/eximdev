/**
 * Field allow-list for save routes that write whatever fields they receive.
 *
 * Default (log-only): requests pass exactly as before; fields outside the list are logged so
 * any page sending extra fields can be found first.
 * FIELD_ALLOWLIST_ENFORCE=true: rejects such requests with 400, like the DO Billing route does.
 */
export const isFieldAllowListEnforced = () => process.env.FIELD_ALLOWLIST_ENFORCE === "true";

const LOG_INTERVAL_MS = 60 * 1000;
const lastLogged = new Map();

export default function fieldAllowList(label, allowedFields) {
  const allowed = new Set(allowedFields);
  return (req, res, next) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const unexpected = Object.keys(body).filter((key) => !allowed.has(key));
    if (unexpected.length === 0) return next();

    if (isFieldAllowListEnforced()) {
      return res.status(400).json({ success: false, message: "Invalid updates detected.", invalidFields: unexpected });
    }

    const key = `${label}|${unexpected.sort().join(",")}`;
    const now = Date.now();
    if (!lastLogged.has(key) || now - lastLogged.get(key) > LOG_INTERVAL_MS) {
      lastLogged.set(key, now);
      if (lastLogged.size > 5000) lastLogged.clear();
      console.warn(
        `[FieldAudit] ${label} received fields outside its allow-list: ${unexpected.join(", ")}. ` +
          "They will be rejected once FIELD_ALLOWLIST_ENFORCE=true."
      );
    }
    next();
  };
}
