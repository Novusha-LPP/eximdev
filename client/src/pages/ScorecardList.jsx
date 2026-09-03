import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, Edit2, Trash2 } from "lucide-react";
import { scorecardAPI } from "../api/scorecardAPI";
import { getRatingLabel, getStatusClass, fmtDate } from "../utils";
import "../styles/scorecard.scss";

export default function ScorecardList() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ branch: "", status: "", supplierName: "" });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10 });

  // View Modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);

  const fetchData = useCallback(
    async (page = 1, limit = pagination.limit) => {
      setLoading(true);
      try {
        const params = { page, limit };
        if (filters.branch) params.branch = filters.branch;
        if (filters.status) params.status = filters.status;
        if (filters.supplierName) params.supplierName = filters.supplierName;

        const [listRes, statsRes] = await Promise.all([
          scorecardAPI.getAll(params),
          scorecardAPI.getStats(),
        ]);
        setData(listRes.data || []);
        setPagination(listRes.pagination || { total: 0, page, limit });
        setStats(statsRes.data);
      } catch {
        toast.error("Failed to load scorecards");
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit]
  );

  useEffect(() => {
    fetchData(1, pagination.limit);
  }, [filters]);

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
    fetchData(1, newLimit);
  };

  const handlePageChange = (newPage) => {
    const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;
    if (newPage < 1 || newPage > totalPages) return;
    setPagination((prev) => ({ ...prev, page: newPage }));
    fetchData(newPage, pagination.limit);
  };

  const totalPages = Math.max(1, Math.ceil(pagination.total / (pagination.limit || 10)));

  const getPageNumbers = () => {
    const total = totalPages;
    const current = pagination.page;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, "...", total];
    }
    if (current >= total - 3) {
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  const handleView = async (row) => {
    try {
      const res = await scorecardAPI.getById(row._id);
      setViewDoc(res.data);
      setShowViewModal(true);
    } catch {
      toast.error("Failed to load scorecard details");
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this scorecard?")) return;
    try {
      await scorecardAPI.remove(id);
      toast.success("Deleted");
      fetchData(pagination.page);
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <>
      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <div className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="btn btn-icon"
            onClick={() => navigate("/")}
            title="Back to Home"
            style={{
              border: "1px solid #e2e8f0",
              background: "white",
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 18,
              fontWeight: "bold",
              color: "#334155",
              marginRight: 10
            }}
          >
            ←
          </button>
          <div>
            <div className="topbar-title">Supplier Scorecards</div>
          </div>
        </div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => navigate("/scorecards/new")}>
            + New Scorecard
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* ── Stats ─────────────────────────────────────────────────── */}
        {stats && (
          <div className="card mb-16">
            <div className="card-body">
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-val">{stats.total}</div>
                  <div className="stat-lbl">Total Scorecards</div>
                </div>
                {stats.breakdown.map((b) => (
                  <div className="stat-card" key={b._id}>
                    <div className="stat-val">{b.count}</div>
                    <div className="stat-lbl">{b._id || "Unrated"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Filters ───────────────────────────────────────────────── */}
        <div className="card mb-16">
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <div className="form-field">
                <label>Supplier Name</label>
                <input
                  type="text"
                  placeholder="Search…"
                  value={filters.supplierName}
                  onChange={(e) => setFilters((f) => ({ ...f, supplierName: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label>Branch</label>
                <select
                  value={filters.branch}
                  onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))}
                >
                  <option value="">All Branches</option>
                  {["SEA", "AIR", "HQ"].map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="">All Statuses</option>
                  {["Draft", "Submitted", "Approved"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label style={{ visibility: "hidden" }}>Action</label>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setFilters({ branch: "", status: "", supplierName: "" })}
                  style={{
                    height: "38px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                    color: "#0f172a",
                    fontWeight: 600,
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────── */}
        <div className="card">
          <div className="table-wrap">
            {loading ? (
              <div className="card-body text-muted">Loading…</div>
            ) : data.length === 0 ? (
              <div className="card-body text-muted text-center" style={{ padding: "40px 0" }}>
                No scorecards found. <button className="btn btn-primary btn-sm" onClick={() => navigate("/scorecards/new")}>Create one</button>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Supplier Name</th>
                    <th>Service Type</th>
                    <th>Branch</th>
                    <th>Period</th>
                    <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Score</th>
                    <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Rating</th>
                    <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Status</th>
                    <th style={{ whiteSpace: "nowrap" }}>Date</th>
                    <th style={{ width: 120, textAlign: "center", whiteSpace: "nowrap" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => {
                    const rating = row.percentage > 0 ? getRatingLabel(row.percentage) : null;
                    return (
                      <tr key={row._id}>
                        <td className="fw-600">{row.supplierName}</td>
                        <td className="text-muted">{row.serviceType || "—"}</td>
                        <td>{row.branch}</td>
                        <td>{row.evaluationPeriod || "—"}</td>
                        <td className="text-center" style={{ whiteSpace: "nowrap" }}>
                          <span
                            className={`score-badge ${rating?.badgeClass || "badge-empty"}`}
                            style={{ whiteSpace: "nowrap", cursor: "default" }}
                          >
                            {row.totalScore != null ? Number(row.totalScore).toFixed(2) : "—"} / {row.maxScore}
                          </span>
                        </td>
                        <td className="text-center" style={{ whiteSpace: "nowrap" }}>
                          <span
                            className={`score-badge ${rating?.badgeClass || "badge-empty"}`}
                            style={{ whiteSpace: "nowrap", cursor: "default" }}
                          >
                            {row.overallRating || "—"}
                          </span>
                        </td>
                        <td className="text-center" style={{ whiteSpace: "nowrap" }}>
                          <span className={`score-badge ${getStatusClass(row.status)}`} style={{ whiteSpace: "nowrap" }}>
                            {row.status}
                          </span>
                        </td>
                        <td className="text-muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(row.date)}</td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "center" }}>
                            <button
                              type="button"
                              className="btn btn-icon btn-info"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleView(row);
                              }}
                              title="View Details"
                              style={{ width: "28px", height: "28px" }}
                            >
                              <Eye size={14} color="#0284c7" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-icon btn-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/scorecards/${row._id}/edit`);
                              }}
                              title="Edit"
                              style={{ width: "28px", height: "28px" }}
                            >
                              <Edit2 size={14} color="#2563eb" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-icon btn-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(e, row._id);
                              }}
                              title="Delete"
                              style={{ width: "28px", height: "28px" }}
                            >
                              <Trash2 size={14} color="#dc2626" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Pagination Footer ───────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              borderTop: "1px solid #e2e8f0",
              padding: "12px 16px",
              background: "#fafbfc",
            }}
          >
            {/* Left side: Rows per page selector + Showing entries count */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>
                  Show
                </span>
                <select
                  value={pagination.limit}
                  onChange={handleLimitChange}
                  style={{
                    padding: "4px 10px",
                    height: "32px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "white",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1e293b",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {[5, 10, 25, 50].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>
                  entries per page
                </span>
              </div>

              <span style={{ fontSize: "13px", color: "#64748b" }}>
                {pagination.total === 0 ? (
                  "Showing 0 entries"
                ) : (
                  <>
                    Showing <b style={{ color: "#0f172a" }}>{(pagination.page - 1) * pagination.limit + 1}</b> to{" "}
                    <b style={{ color: "#0f172a" }}>
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </b>{" "}
                    of <b style={{ color: "#0f172a" }}>{pagination.total}</b> entries
                  </>
                )}
              </span>
            </div>

            {/* Right side: Page navigation */}
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  style={{
                    height: "32px",
                    padding: "0 10px",
                    border: "1px solid #cbd5e1",
                    background: pagination.page <= 1 ? "#f1f5f9" : "white",
                    color: pagination.page <= 1 ? "#94a3b8" : "#334155",
                    cursor: pagination.page <= 1 ? "not-allowed" : "pointer",
                    borderRadius: "6px",
                    fontWeight: 600,
                    fontSize: "12.5px",
                  }}
                >
                  ‹ Prev
                </button>

                {getPageNumbers().map((item, idx) =>
                  item === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      style={{ padding: "0 6px", color: "#94a3b8", fontWeight: 600, userSelect: "none" }}
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className="btn btn-sm"
                      onClick={() => handlePageChange(item)}
                      style={{
                        minWidth: "32px",
                        height: "32px",
                        padding: "0 8px",
                        border: item === pagination.page ? "1px solid #4f46e5" : "1px solid #cbd5e1",
                        background: item === pagination.page ? "#4f46e5" : "white",
                        color: item === pagination.page ? "white" : "#334155",
                        fontWeight: item === pagination.page ? 700 : 500,
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        boxShadow:
                          item === pagination.page ? "0 1px 3px rgba(79, 70, 229, 0.3)" : "none",
                      }}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={pagination.page >= totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  style={{
                    height: "32px",
                    padding: "0 10px",
                    border: "1px solid #cbd5e1",
                    background: pagination.page >= totalPages ? "#f1f5f9" : "white",
                    color: pagination.page >= totalPages ? "#94a3b8" : "#334155",
                    cursor: pagination.page >= totalPages ? "not-allowed" : "pointer",
                    borderRadius: "6px",
                    fontWeight: 600,
                    fontSize: "12.5px",
                  }}
                >
                  Next ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── View Scorecard Modal ─────────────────────────────────────── */}
      {showViewModal && viewDoc && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setShowViewModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "20px",
              width: "95%",
              maxWidth: 820,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #f1f5f9",
                background: "linear-gradient(to right, #f8fafc, white)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Eye size={20} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                  {viewDoc.supplierName} — Scorecard Details
                </h3>
                <span className={`score-badge ${getStatusClass(viewDoc.status)}`} style={{ marginLeft: 8 }}>
                  {viewDoc.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "16px 24px 20px 24px" }}>
              {/* Meta Grid */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "12px",
                  padding: "12px 18px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "14px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Supplier Name</span>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginTop: "1px" }}>{viewDoc.supplierName}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Service Type</span>
                    <div style={{ fontSize: "13px", color: "#1e293b", marginTop: "1px" }}>{viewDoc.serviceType || "—"}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Branch</span>
                    <div style={{ fontSize: "13px", color: "#1e293b", marginTop: "1px" }}>{viewDoc.branch}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Period</span>
                    <div style={{ fontSize: "13px", color: "#1e293b", marginTop: "1px" }}>{viewDoc.evaluationPeriod || "—"}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Overall Rating</span>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f766e", marginTop: "1px" }}>
                      {viewDoc.overallRating || "—"} ({viewDoc.percentage != null ? viewDoc.percentage.toFixed(1) : 0}%)
                    </div>
                  </div>
                </div>
              </div>

              {/* Evaluation Items Breakdown Table */}
              {viewDoc.evaluationItems && viewDoc.evaluationItems.length > 0 && (
                <div style={{ marginBottom: viewDoc.remarks ? "14px" : 0 }}>
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#475569",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    📊 Criteria Ratings & Scores
                  </h4>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                          <th style={{ padding: "6px 12px", width: 36, color: "#64748b" }}>#</th>
                          <th style={{ padding: "6px 12px", color: "#475569" }}>Criteria</th>
                          <th style={{ padding: "6px 12px", textAlign: "center", width: 80, color: "#475569" }}>Weightage</th>
                          <th style={{ padding: "6px 12px", textAlign: "center", width: 80, color: "#475569" }}>Rating (/10)</th>
                          <th style={{ padding: "6px 12px", textAlign: "center", width: 80, color: "#475569" }}>Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewDoc.evaluationItems.map((item, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "5px 12px", color: "#94a3b8" }}>{item.srNo || i + 1}</td>
                            <td style={{ padding: "5px 12px", fontWeight: 500, color: "#1e293b" }}>{item.criteria}</td>
                            <td style={{ padding: "5px 12px", textAlign: "center", color: "#64748b" }}>{item.weightage}</td>
                            <td style={{ padding: "5px 12px", textAlign: "center", fontWeight: 600, color: "#0284c7" }}>{item.rating}</td>
                            <td style={{ padding: "5px 12px", textAlign: "center", fontWeight: 700, color: "#0f172a" }}>
                              {item.score != null ? Number(item.score).toFixed(1) : item.score}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: "#f8fafc", fontWeight: 700, borderTop: "2px solid #cbd5e1" }}>
                          <td colSpan={4} style={{ padding: "8px 12px", textAlign: "right", color: "#334155" }}>Total Score:</td>
                          <td style={{ padding: "8px 12px", textAlign: "center", color: "#0f766e", fontSize: "13px" }}>
                            {viewDoc.totalScore != null ? Number(viewDoc.totalScore).toFixed(1) : viewDoc.totalScore} / {viewDoc.maxScore}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Remarks */}
              {viewDoc.remarks && (
                <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "10px 14px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Remarks</span>
                  <div style={{ fontSize: "13px", color: "#334155", marginTop: "2px" }}>{viewDoc.remarks}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
