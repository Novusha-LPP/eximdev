/**
 * Utility to resolve Import & Export API URLs dynamically across
 * localhost, LAN IPs, and production domains.
 *
 * All production URLs should come from environment variables:
 *   CRA  → REACT_APP_API_STRING / REACT_APP_EXPORT_API_STRING
 *   Vite → VITE_API_STRING      / VITE_IMPORT_API_STRING
 */

// ── helpers ──────────────────────────────────────────────────────────
function readEnv(key) {
  // Vite
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  // CRA / Node
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  return "";
}

function getExplicitOverrides() {
  // Try reading an explicit cross-trade env var (set in .env)
  const importOverride =
    readEnv("REACT_APP_IMPORT_API_STRING") ||
    readEnv("VITE_IMPORT_API_STRING");

  const exportOverride =
    readEnv("REACT_APP_EXPORT_API_STRING") ||
    readEnv("VITE_EXPORT_API_STRING");

  return { importOverride, exportOverride };
}

// ── main ─────────────────────────────────────────────────────────────
export function getTradeApis(currentBaseUrl, isImportProject = true) {
  let importApi = "";
  let exportApi = "";

  const hasWindow = typeof window !== "undefined" && window.location;
  const protocol = hasWindow ? window.location.protocol : "http:";
  const hostname = hasWindow ? (window.location.hostname || "localhost") : "localhost";

  // Check if access is local or LAN IP
  const isLocalOrIp =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname);

  // ─── 1. Localhost / LAN → port-based ───────────────────────────────
  if (isLocalOrIp) {
    importApi = `${protocol}//${hostname}:9006/api`;
    exportApi = `${protocol}//${hostname}:9002/api`;
    return { importApi, exportApi };
  }

  // ─── 2. Derive from base URL (comes from .env) ────────────────────
  const base = (currentBaseUrl || "").trim().replace(/\/+$/, "");

  if (base.includes("/import/api")) {
    importApi = base;
    exportApi = base.replace("/import/api", "/export/api");
    return { importApi, exportApi };
  }

  if (base.includes("/export/api")) {
    exportApi = base;
    importApi = base.replace("/export/api", "/import/api");
    return { importApi, exportApi };
  }

  // ─── 3. Explicit env overrides ─────────────────────────────────────
  const { importOverride, exportOverride } = getExplicitOverrides();

  if (importOverride && exportOverride) {
    return { importApi: importOverride, exportApi: exportOverride };
  }

  // ─── 4. Testing subdomains ─────────────────────────────────────────
  if (/^testingimport\./i.test(hostname)) {
    importApi = `${protocol}//${hostname}/api`;
    exportApi = `${protocol}//${hostname.replace(/^testingimport\./i, "testingexport.")}/api`;
    return { importApi, exportApi };
  }

  if (/^testingexport\./i.test(hostname)) {
    exportApi = `${protocol}//${hostname}/api`;
    importApi = `${protocol}//${hostname.replace(/^testingexport\./i, "testingimport.")}/api`;
    return { importApi, exportApi };
  }

  // ─── 5. Partial overrides (one side from env, derive the other) ────
  if (importOverride) {
    importApi = importOverride;
    exportApi = importOverride.replace(/import/gi, "export");
    return { importApi, exportApi };
  }
  if (exportOverride) {
    exportApi = exportOverride;
    importApi = exportOverride.replace(/export/gi, "import");
    return { importApi, exportApi };
  }

  // ─── 6. Subdomain-based derivation (base is just a domain) ────────
  if (base.includes("import.")) {
    importApi = base;
    exportApi = base.replace(/import\./i, "export.");
    return { importApi, exportApi };
  }

  if (base.includes("export.")) {
    exportApi = base;
    importApi = base.replace(/export\./i, "import.");
    return { importApi, exportApi };
  }

  // ─── 7. Last-resort fallback (origin-based) ────────────────────────
  const originBase = hasWindow ? `${window.location.origin}/api` : "";
  const effective = base || originBase;

  if (isImportProject) {
    importApi = effective;
    exportApi = effective.includes("9006")
      ? effective.replace(/9006/g, "9002")
      : (effective.includes("import") ? effective.replace(/import/gi, "export") : effective);
  } else {
    exportApi = effective;
    importApi = effective.includes("9002")
      ? effective.replace(/9002/g, "9006")
      : (effective.includes("export") ? effective.replace(/export/gi, "import") : effective);
  }

  return { importApi, exportApi };
}
