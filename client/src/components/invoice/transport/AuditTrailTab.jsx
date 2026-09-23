import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export default function AuditTrailTab({ activeUserId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState("");

  const fetchAuditEvents = async () => {
    setLoading(true);
    try {
      let url = `${process.env.REACT_APP_API_STRING}/transport-invoicing/audit-trail?limit=150`;
      if (dateFilter) url += `&date=${dateFilter}`;
      if (activeUserId) url += `&userId=${activeUserId}`;

      const res = await axios.get(url, { withCredentials: true });
      if (res.data?.success) {
        setEvents(res.data.events || []);
      }
    } catch (err) {
      console.error("Failed to load audit trail:", err);
      toast.error(err.response?.data?.message || "Failed to load audit trail");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditEvents();
  }, [dateFilter, activeUserId]);

  const renderVal = (val) => {
    if (val === null || val === undefined) return "-";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="ti-audit-tab">
      <div className="ti-filter-bar">
        <div className="ti-filter-group">
          <span style={{ fontWeight: 700, color: "#334155" }}>Filter by Date:</span>
          <input
            type="date"
            className="ti-input"
            style={{ width: "auto" }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          {dateFilter && (
            <button
              type="button"
              className="ti-btn ti-btn-secondary"
              onClick={() => setDateFilter("")}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            className="ti-btn ti-btn-secondary"
            onClick={fetchAuditEvents}
            disabled={loading}
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>

        <div className="ti-filter-group">
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
            Showing <strong>{events.length}</strong> latest audit events
          </span>
        </div>
      </div>

      <div className="ti-card">
        <div className="ti-card-header">
          <h3 className="ti-card-title">
            <span>📜</span> Transport Invoicing Audit Log
          </h3>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
            Section 12 & 15: Full transparency of creates, edits, and Excel upload updates.
          </span>
        </div>
        <div className="ti-card-body" style={{ padding: 0 }}>
          <div className="ti-table-responsive" style={{ maxHeight: "550px", overflowY: "auto" }}>
            <table className="ti-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Module Head</th>
                  <th>Target / Branch</th>
                  <th>Entry Date</th>
                  <th>Modified By</th>
                  <th>Previous Value</th>
                  <th>New Value</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                      Loading audit events...
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  events.map((ev, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: "0.78rem", color: "#64748b", whiteSpace: "nowrap" }}>
                        {new Date(ev.timestamp).toLocaleString("en-IN")}
                      </td>
                      <td>
                        <span
                          className={`ti-badge ${
                            ev.action === "CREATE"
                              ? "ti-badge-new"
                              : ev.action === "UPLOAD_UPDATE"
                              ? "ti-badge-dup"
                              : "ti-badge-update"
                          }`}
                        >
                          {ev.action}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: "0.82rem" }}>{ev.type}</td>
                      <td style={{ fontWeight: 600, color: "#1e293b" }}>{ev.target}</td>
                      <td style={{ fontFamily: "monospace" }}>{ev.date}</td>
                      <td style={{ fontWeight: 600, color: "#4f46e5" }}>{ev.user || ev.username}</td>
                      <td style={{ fontSize: "0.8rem", color: "#b91c1c", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {renderVal(ev.old_value)}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "#15803d", fontWeight: 700, maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {renderVal(ev.new_value)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
