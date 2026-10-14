/**
 * Utility to resolve Import & Export API URLs dynamically across
 * localhost, LAN IPs, and production domains.
 *
 * In Create React App, environment variables MUST be referenced directly
 * (e.g. process.env.REACT_APP_API_STRING) so that Webpack's DefinePlugin
 * can statically inline their values into the production bundle.
 */

// Direct references so Webpack DefinePlugin inlines string literals at compile time
const STATIC_IMPORT_API =
  process.env.REACT_APP_IMPORT_API_STRING ||
  process.env.REACT_APP_API_STRING ||
  "";

const STATIC_EXPORT_API =
  process.env.REACT_APP_EXPORT_API_STRING ||
  "";

export function getTradeApis(currentBaseUrl, isImportProject = true) {
  let importApi = "";
  let exportApi = "";

  const hasWindow = typeof window !== "undefined" && window.location;
  const protocol = hasWindow ? window.location.protocol : "http:";
  const hostname = hasWindow ? (window.location.hostname || "localhost") : "localhost";

  const base = (currentBaseUrl || STATIC_IMPORT_API || "").trim().replace(/\/+$/, "");
  const exportEnv = (STATIC_EXPORT_API || "").trim().replace(/\/+$/, "");

  // 1. If explicit export override is provided from env, use it
  if (base && exportEnv) {
    return {
      importApi: isImportProject ? base : (STATIC_IMPORT_API || base),
      exportApi: exportEnv,
    };
  }

  // 2. Derive export/import from configured base URL (.env)
  if (base) {
    if (base.includes("/import/api")) {
      return {
        importApi: base,
        exportApi: base.replace("/import/api", "/export/api"),
      };
    }

    if (base.includes("/export/api")) {
      return {
        importApi: base.replace("/export/api", "/import/api"),
        exportApi: base,
      };
    }

    if (base.includes(":9006")) {
      let resolvedImport = base;
      let resolvedExport = base.replace(":9006", ":9002");
      // If accessed from LAN (e.g. 192.168.x.x) and base is localhost, rewrite hostname to LAN IP
      if (hasWindow && hostname !== "localhost" && hostname !== "127.0.0.1") {
        try {
          const u1 = new URL(resolvedImport);
          if (u1.hostname === "localhost" || u1.hostname === "127.0.0.1") {
            u1.hostname = hostname;
            resolvedImport = u1.toString().replace(/\/+$/, "");
          }
          const u2 = new URL(resolvedExport);
          if (u2.hostname === "localhost" || u2.hostname === "127.0.0.1") {
            u2.hostname = hostname;
            resolvedExport = u2.toString().replace(/\/+$/, "");
          }
        } catch (_) {}
      }
      return { importApi: resolvedImport, exportApi: resolvedExport };
    }

    if (base.includes(":9002")) {
      let resolvedExport = base;
      let resolvedImport = base.replace(":9002", ":9006");
      if (hasWindow && hostname !== "localhost" && hostname !== "127.0.0.1") {
        try {
          const u1 = new URL(resolvedImport);
          if (u1.hostname === "localhost" || u1.hostname === "127.0.0.1") {
            u1.hostname = hostname;
            resolvedImport = u1.toString().replace(/\/+$/, "");
          }
          const u2 = new URL(resolvedExport);
          if (u2.hostname === "localhost" || u2.hostname === "127.0.0.1") {
            u2.hostname = hostname;
            resolvedExport = u2.toString().replace(/\/+$/, "");
          }
        } catch (_) {}
      }
      return { importApi: resolvedImport, exportApi: resolvedExport };
    }

    if (/testingimport\./i.test(base)) {
      return {
        importApi: base,
        exportApi: base.replace(/testingimport\./i, "testingexport."),
      };
    }

    if (/testingexport\./i.test(base)) {
      return {
        importApi: base.replace(/testingexport\./i, "testingimport."),
        exportApi: base,
      };
    }

    // Default derivation from base URL
    if (isImportProject) {
      return {
        importApi: base,
        exportApi: base.replace(/9006/g, "9002").replace(/import/gi, "export"),
      };
    } else {
      return {
        importApi: base.replace(/9002/g, "9006").replace(/export/gi, "import"),
        exportApi: base,
      };
    }
  }

  // 3. Fallback when NO .env / base URL is provided
  // Never point API to import.alvision.in or export.alvision.in (those are S3 static web hosts, not API servers!)
  const isLocalOrIp =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname);

  if (isLocalOrIp) {
    importApi = `${protocol}//${hostname}:9006/api`;
    exportApi = `${protocol}//${hostname}:9002/api`;
    return { importApi, exportApi };
  }

  // Production fallback: API server is eximbot.alvision.in
  return {
    importApi: "https://eximbot.alvision.in/import/api",
    exportApi: "https://eximbot.alvision.in/export/api",
  };
}
