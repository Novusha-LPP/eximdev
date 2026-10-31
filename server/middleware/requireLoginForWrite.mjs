import jwt from "jsonwebtoken";
import authMiddleware from "./authMiddleware.mjs";

/**
 * Login check for write routes that historically had none.
 *
 * Default (log-only): requests pass exactly as before; calls without a valid login are logged
 * so unknown callers (bots, integrations, scripts) can be found and fixed first.
 * AUTH_ENFORCE_LEGACY_WRITES=true: runs the standard authMiddleware (401 without a valid login,
 * same rules as every other protected route).
 */
export const isLegacyWriteAuthEnforced = () => process.env.AUTH_ENFORCE_LEGACY_WRITES === "true";

const LOG_INTERVAL_MS = 60 * 1000;
const lastLogged = new Map();

const hasCredentials = (req) => {
  // API keys are validated by authMiddleware when enforcing; here a key only marks an identified caller
  if (req.headers["x-api-key"] || req.query?.api_key || req.query?.["x-api-key"]) return true;
  let token = req.cookies?.token;
  if (!token && typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.slice(7);
  }
  if (!token) return false;
  try {
    jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_do_not_use_in_prod");
    return true;
  } catch {
    return false;
  }
};

export default function requireLoginForWrite(req, res, next) {
  if (isLegacyWriteAuthEnforced()) return authMiddleware(req, res, next);

  if (!hasCredentials(req)) {
    const route = `${req.method} ${req.baseUrl || ""}${req.route?.path || req.path}`;
    const caller = req.ip || req.socket?.remoteAddress || "unknown";
    const key = `${route}|${caller}`;
    const now = Date.now();
    if (!lastLogged.has(key) || now - lastLogged.get(key) > LOG_INTERVAL_MS) {
      lastLogged.set(key, now);
      if (lastLogged.size > 5000) lastLogged.clear();
      console.warn(
        `[AuthAudit] Call without login: ${route} from ${caller} (${req.headers["user-agent"] || "no user-agent"}). ` +
          "It will be rejected once AUTH_ENFORCE_LEGACY_WRITES=true."
      );
    }
  }
  next();
}
