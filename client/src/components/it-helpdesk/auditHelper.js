// src/components/it-helpdesk/auditHelper.js
import axios from "axios";

/**
 * Logs an audit trail entry for export actions across IT Helpdesk
 * @param {Object} options
 * @param {string} options.module - Module name (e.g. "Helpdesk", "Asset", "Inventory", "License", "Vendor", "Administration")
 * @param {string} options.details - Human-readable details of what was exported
 * @param {string} [options.action="EXPORT"] - Action name
 * @param {string} [options.severity="info"] - Log severity
 */
export const logExportAudit = async ({
  module = "General",
  details = "Exported data to Excel",
  action = "EXPORT",
  severity = "info",
} = {}) => {
  try {
    const apiString = process.env.REACT_APP_API_STRING || "http://localhost:9006/api";
    const user = JSON.parse(localStorage.getItem("exim_user")) || {};
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    await axios.post(
      `${apiString}/audit-trail/custom`,
      {
        action,
        module,
        details,
        severity,
        user: user.name || user.username || "System",
      },
      {
        headers,
        withCredentials: true,
      }
    );
  } catch (err) {
    console.warn("Failed to log export audit:", err?.message || err);
  }
};

export default logExportAudit;
