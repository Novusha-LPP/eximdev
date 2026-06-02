import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { scorecardAPI } from "../api/scorecardAPI";
import { getRatingLabel, getStatusClass, fmtDate } from "../utils";
import "../styles/scorecard.scss";

export default function ScorecardList() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ branch: "", status: "", supplierName: "" });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20 });

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.limit };
      if (filters.branch) params.branch = filters.branch;
      if (filters.status) params.status = filters.status;
      if (filters.supplierName) params.supplierName = filters.supplierName;

      const [listRes, statsRes] = await Promise.all([
        scorecardAPI.getAll(params),
        scorecardAPI.getStats(),
      ]);
      setData(listRes.data);
      setPagination(listRes.pagination);
      setStats(statsRes.data);
    } catch {
      toast.error("Failed to load scorecards");
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  useEffect(() => { fetchData(1); }, [fetchData]);

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
              <div className="form-field" style={{ justifyContent: "flex-end" }}>
                <label>&nbsp;</label>
                <button className="btn" onClick={() => setFilters({ branch: "", status: "", supplierName: "" })}>
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
                    <th style={{ textAlign: "center" }}>Score</th>
                    <th style={{ textAlign: "center" }}>Rating</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                    <th>Date</th>
                    <th style={{ width: 60 }} />
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => {
                    const rating = row.percentage > 0 ? getRatingLabel(row.percentage) : null;
                    return (
                      <tr
                        key={row._id}
                        onClick={() => navigate(`/scorecards/${row._id}/edit`)}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="fw-600">{row.supplierName}</td>
                        <td className="text-muted">{row.serviceType || "—"}</td>
                        <td>{row.branch}</td>
                        <td>{row.evaluationPeriod || "—"}</td>
                        <td className="text-center">
                          <span className={`score-badge ${rating?.badgeClass || "badge-empty"}`}>
                            {row.totalScore?.toFixed(2) || "—"} / {row.maxScore}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className={`score-badge ${rating?.badgeClass || "badge-empty"}`}>
                            {row.overallRating || "—"}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className={`score-badge ${getStatusClass(row.status)}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="text-muted">{fmtDate(row.date)}</td>
                        <td>
                          <button
                            className="btn btn-icon btn-danger"
                            onClick={(e) => handleDelete(e, row._id)}
                            title="Delete"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="card-body flex-center gap-8" style={{ justifyContent: "flex-end", borderTop: "1px solid var(--border)" }}>
              <span className="text-muted" style={{ fontSize: 12 }}>
                {pagination.total} total
              </span>
              {Array.from({ length: Math.ceil(pagination.total / pagination.limit) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`btn btn-sm ${p === pagination.page ? "btn-primary" : ""}`}
                  onClick={() => fetchData(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
