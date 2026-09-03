import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, Edit2, Trash2, ChevronLeft, ChevronRight, MoveHorizontal } from "lucide-react";
import { amcRenewalAPI } from "../api/amcRenewalAPI";
import "../styles/scorecard.scss";

const PENDING_THRESHOLD_DAYS = 30; // Number of days before expiry to mark as "Pending"

const EMPTY_RECORD = {
  equipmentServiceName: "",
  vendorName: "",
  underAmc: "Yes",
  contractNo: "",
  location: "",
  yearlyServices: "",
  startMonthDate: "",
  previousDateOfService: "",
  nextDueDate: "",
  renewalDate: "",
  expireDate: "",
  contactPerson: "",
  contactNo: "",
  status: "Active",
  remarks: "",
  documentUrl: "",
};

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const statusClass = (s) => {
  switch (s) {
    case "Active": return "badge-excellent";
    case "Pending": return "badge-warning";
    case "Expired": return "badge-danger";
    default: return "badge-secondary";
  }
};

// Helper function to calculate status based on expireDate
const deriveStatus = (expireDateStr) => {
  if (!expireDateStr) return "Active"; // Default if no date is set

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize time to start of day

  const expireDate = new Date(expireDateStr);
  expireDate.setHours(0, 0, 0, 0);

  const diffTime = expireDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Expired";
  if (diffDays <= PENDING_THRESHOLD_DAYS) return "Pending";
  return "Active";
};

export default function AmcRenewalList() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ status: "", search: "" });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10 });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_RECORD });
  const [saving, setSaving] = useState(false);

  // View Modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);

  const fetchData = useCallback(
    async (page = 1, limit = pagination.limit) => {
      setLoading(true);
      try {
        const params = { page, limit };
        if (filters.status) params.status = filters.status;
        if (filters.search) params.search = filters.search;

        const [listRes, statsRes] = await Promise.all([
          amcRenewalAPI.getAll(params),
          amcRenewalAPI.getStats(),
        ]);
        setData(listRes.data || []);
        setPagination(listRes.pagination || { total: 0, page, limit });
        setStats(statsRes.data);
      } catch {
        toast.error("Failed to load AMC renewals");
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

  // ── Table Horizontal Scroll & Drag-to-Scroll State ──────────────
  const tableWrapRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    hasMoved: false,
  });

  const checkScroll = useCallback(() => {
    const el = tableWrapRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = tableWrapRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, data]);

  const handleScroll = (direction) => {
    const el = tableWrapRef.current;
    if (!el) return;
    const scrollAmount = Math.max(320, el.clientWidth * 0.45);
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button, a, input, select, textarea")) return;
    const el = tableWrapRef.current;
    if (!el) return;
    dragRef.current = {
      isDown: true,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
      hasMoved: false,
    };
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!dragRef.current.isDown) return;
    const el = tableWrapRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - dragRef.current.startX) * 1.3;
    if (Math.abs(walk) > 3) {
      dragRef.current.hasMoved = true;
    }
    el.scrollLeft = dragRef.current.scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    if (dragRef.current.isDown) {
      dragRef.current.isDown = false;
      setIsDragging(false);
    }
  };

  // Auto-calculate Status when Expire Date changes in the form
  useEffect(() => {
    if (form.expireDate) {
      const newStatus = deriveStatus(form.expireDate);
      setForm((prev) => ({ ...prev, status: newStatus }));
    }
  }, [form.expireDate]);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_RECORD });
    setShowModal(true);
  };

  const openView = (row) => {
    setViewRecord(row);
    setShowViewModal(true);
  };

  const openEdit = (row) => {
    setEditId(row._id);
    setForm({
      equipmentServiceName: row.equipmentServiceName || "",
      vendorName: row.vendorName || "",
      underAmc: row.underAmc || "Yes",
      contractNo: row.contractNo || "",
      location: row.location || "",
      yearlyServices: row.yearlyServices || "",
      startMonthDate: row.startMonthDate ? row.startMonthDate.split("T")[0] : "",
      previousDateOfService: row.previousDateOfService ? row.previousDateOfService.split("T")[0] : "",
      nextDueDate: row.nextDueDate ? row.nextDueDate.split("T")[0] : "",
      renewalDate: row.renewalDate ? row.renewalDate.split("T")[0] : "",
      expireDate: row.expireDate ? row.expireDate.split("T")[0] : "",
      contactPerson: row.contactPerson || "",
      contactNo: row.contactNo ? row.contactNo.replace(/\D/g, "").slice(-10) : "",
      status: row.status || "Active",
      remarks: row.remarks || "",
      documentUrl: row.documentUrl || "",
    });
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "contactNo") {
      // Only allow numeric digits, max 10 digits
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setForm((f) => ({ ...f, contactNo: digitsOnly }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.equipmentServiceName.trim() || !form.vendorName.trim()) {
      toast.error("Equipment/Service Name and Vendor Name are required");
      return;
    }

    if (form.contactNo && form.contactNo.trim().length > 0 && form.contactNo.trim().length !== 10) {
      toast.error("Contact number must be exactly 10 digits");
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await amcRenewalAPI.update(editId, form);
        toast.success("Record updated");
      } else {
        await amcRenewalAPI.create(form);
        toast.success("Record created");
      }
      setShowModal(false);
      fetchData(pagination.page);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this AMC renewal record?")) return;
    try {
      await amcRenewalAPI.remove(id);
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
          <button className="btn btn-icon" onClick={() => navigate("/")} title="Back" style={{ border: "1px solid #e2e8f0", background: "white", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, fontWeight: "bold", color: "#334155" }}>
            ←
          </button>
          <div>
            <div className="topbar-title">AMC Suppliers Renewal Sheet</div>
          </div>
        </div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={openCreate}>
            + Add Record
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
                  <div className="stat-lbl">Total AMC</div>
                </div>
                <div className="stat-card">
                  <div className="stat-val" style={{ color: "#10b981" }}>{stats.active}</div>
                  <div className="stat-lbl">Active</div>
                </div>
                <div className="stat-card">
                  <div className="stat-val" style={{ color: "#880e4f" }}>{stats.pending}</div>
                  <div className="stat-lbl">Pending</div>
                </div>
                <div className="stat-card">
                  <div className="stat-val" style={{ color: "#ef4444" }}>{stats.expired}</div>
                  <div className="stat-lbl">Expired</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Filters ───────────────────────────────────────────────── */}
        <div className="card mb-16">
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <div className="form-field">
                <label>Search</label>
                <input
                  type="text"
                  placeholder="Equipment / Vendor / Contract…"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="">All Statuses</option>
                  {["Active", "Pending", "Expired"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label style={{ visibility: "hidden" }}>Action</label>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setFilters({ status: "", search: "" })}
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
          <div
            className="card-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div className="card-title">📋 AMC Suppliers Renewal Sheet</div>

            {/* Horizontal Scroll Controls & Hint */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "#f1f5f9",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontWeight: 500,
                  userSelect: "none",
                }}
              >
                <MoveHorizontal size={13} color="#64748b" /> Drag or use arrows to scroll
              </span>

              <div style={{ display: "inline-flex", gap: "4px" }}>
                <button
                  type="button"
                  className="btn btn-icon"
                  onClick={() => handleScroll("left")}
                  disabled={!canScrollLeft}
                  title="Scroll Left"
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: canScrollLeft ? "white" : "#f8fafc",
                    color: canScrollLeft ? "#1e293b" : "#94a3b8",
                    cursor: canScrollLeft ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    boxShadow: canScrollLeft ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    opacity: canScrollLeft ? 1 : 0.5,
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="btn btn-icon"
                  onClick={() => handleScroll("right")}
                  disabled={!canScrollRight}
                  title="Scroll Right"
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: canScrollRight ? "white" : "#f8fafc",
                    color: canScrollRight ? "#1e293b" : "#94a3b8",
                    cursor: canScrollRight ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    boxShadow: canScrollRight ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    opacity: canScrollRight ? 1 : 0.5,
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ position: "relative" }}>
            {/* Floating Left Arrow */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => handleScroll("left")}
                title="Scroll Left"
                style={{
                  position: "absolute",
                  left: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 20,
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(4px)",
                  border: "1px solid #cbd5e1",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#1e293b",
                  transition: "all 0.15s ease",
                }}
              >
                <ChevronLeft size={18} />
              </button>
            )}

            {/* Floating Right Arrow */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => handleScroll("right")}
                title="Scroll Right"
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 20,
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(4px)",
                  border: "1px solid #cbd5e1",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#1e293b",
                  transition: "all 0.15s ease",
                }}
              >
                <ChevronRight size={18} />
              </button>
            )}

            <div
              ref={tableWrapRef}
              className="table-wrap"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              style={{
                cursor: isDragging ? "grabbing" : "grab",
                userSelect: isDragging ? "none" : "auto",
                WebkitOverflowScrolling: "touch",
                overflowX: "auto",
              }}
            >
              {loading ? (
                <div className="card-body text-muted">Loading…</div>
              ) : data.length === 0 ? (
                <div className="card-body text-muted" style={{ textAlign: "center", padding: "40px 0" }}>
                  No records found.{" "}
                  <button className="btn btn-primary btn-sm" onClick={openCreate}>Add one</button>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 44, textAlign: "center", whiteSpace: "nowrap" }}>Srno</th>
                      <th style={{ minWidth: 160, whiteSpace: "nowrap" }}>Equipment / Service Name</th>
                      <th style={{ minWidth: 130, whiteSpace: "nowrap" }}>Vendor Name</th>
                      <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Under AMC</th>
                      <th style={{ whiteSpace: "nowrap" }}>Contract No</th>
                      <th style={{ minWidth: 140 }}>Location</th>
                      <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Yearly Services</th>
                      <th style={{ whiteSpace: "nowrap" }}>Start Month/Date</th>
                      <th style={{ whiteSpace: "nowrap" }}>Previous Date of Service</th>
                      <th style={{ whiteSpace: "nowrap" }}>Next Due Date</th>
                      <th style={{ whiteSpace: "nowrap" }}>Renewal Date</th>
                      <th style={{ whiteSpace: "nowrap" }}>Expire Date</th>
                      <th style={{ minWidth: 120, whiteSpace: "nowrap" }}>Contact Person</th>
                      <th style={{ whiteSpace: "nowrap" }}>Contact No</th>
                      <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Status</th>
                      <th style={{ minWidth: 160 }}>Remarks</th>
                      <th style={{ width: 105, textAlign: "center", whiteSpace: "nowrap" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => (
                      <tr key={row._id}>
                        <td className="text-muted" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          {(pagination.page - 1) * pagination.limit + idx + 1}
                        </td>
                        <td className="fw-600" style={{ minWidth: 160 }}>{row.equipmentServiceName}</td>
                        <td style={{ minWidth: 130, whiteSpace: "nowrap" }}>{row.vendorName}</td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>{row.underAmc}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{row.contractNo || "—"}</td>
                        <td style={{ minWidth: 140 }}>{row.location || "—"}</td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>{row.yearlyServices || "—"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(row.startMonthDate)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(row.previousDateOfService)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(row.nextDueDate)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(row.renewalDate)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(row.expireDate)}</td>
                        <td style={{ minWidth: 120, whiteSpace: "nowrap" }}>{row.contactPerson || "—"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{row.contactNo || "—"}</td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          <span className={`score-badge ${statusClass(row.status)}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="text-muted" style={{ minWidth: 160 }}>{row.remarks || "—"}</td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "center" }}>
                            <button
                              type="button"
                              className="btn btn-icon btn-info"
                              onClick={(e) => {
                                e.stopPropagation();
                                openView(row);
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
                                openEdit(row);
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
                    ))}
                  </tbody>
                </table>
              )}
            </div>
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

      {/* ── View Details Modal ─────────────────────────────────────── */}
      {showViewModal && viewRecord && (
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
              maxWidth: 750,
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
                  {viewRecord.equipmentServiceName} — AMC Details
                </h3>
                <span className={`score-badge ${statusClass(viewRecord.status)}`} style={{ marginLeft: 8 }}>
                  {viewRecord.status}
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
              {/* Section 1: Equipment & Vendor */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "12px",
                  padding: "12px 18px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "12px",
                }}
              >
                <h4 style={{ margin: "0 0 8px 0", fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  📦 Equipment & Vendor Information
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Equipment / Service</span>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginTop: "1px" }}>{viewRecord.equipmentServiceName || "—"}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Vendor Name</span>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginTop: "1px" }}>{viewRecord.vendorName || "—"}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Under AMC</span>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: viewRecord.underAmc === "Yes" ? "#16a34a" : "#dc2626", marginTop: "1px" }}>{viewRecord.underAmc || "Yes"}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Contract Number</span>
                    <div style={{ fontSize: "13px", color: "#1e293b", marginTop: "1px" }}>{viewRecord.contractNo || "—"}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Location / Area</span>
                    <div style={{ fontSize: "13px", color: "#1e293b", marginTop: "1px" }}>{viewRecord.location || "—"}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Yearly Services</span>
                    <div style={{ fontSize: "13px", color: "#1e293b", marginTop: "1px" }}>{viewRecord.yearlyServices || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Section 2: Important Dates */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "12px",
                  padding: "12px 18px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "12px",
                }}
              >
                <h4 style={{ margin: "0 0 8px 0", fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  📅 Service & Renewal Schedule
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Start Month / Date</span>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#1e293b", marginTop: "1px" }}>{fmtDate(viewRecord.startMonthDate)}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Previous Service Date</span>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#1e293b", marginTop: "1px" }}>{fmtDate(viewRecord.previousDateOfService)}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Next Due Date</span>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0284c7", marginTop: "1px" }}>{fmtDate(viewRecord.nextDueDate)}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Renewal Date</span>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#1e293b", marginTop: "1px" }}>{fmtDate(viewRecord.renewalDate)}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Expire Date</span>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: viewRecord.status === "Expired" ? "#dc2626" : "#1e293b", marginTop: "1px" }}>{fmtDate(viewRecord.expireDate)}</div>
                  </div>
                </div>
              </div>

              {/* Section 3: Contact & Remarks */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "12px",
                  padding: "12px 18px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <h4 style={{ margin: "0 0 8px 0", fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  👤 Contact & Remarks
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "8px" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Contact Person</span>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#1e293b", marginTop: "1px" }}>{viewRecord.contactPerson || "—"}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Contact Number</span>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#1e293b", marginTop: "1px" }}>{viewRecord.contactNo || "—"}</div>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Remarks / Notes</span>
                  <div style={{ fontSize: "13px", color: "#475569", marginTop: "2px", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
                    {viewRecord.remarks || "No additional remarks."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────────────── */}
      {showModal && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "white", borderRadius: 16, width: "95%", maxWidth: 800,
              maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
              padding: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: "20px 28px", borderBottom: "1px solid #f1f5f9",
              background: "linear-gradient(to right, #f8fafc, white)",
              borderRadius: "16px 16px 0 0",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                {editId ? "Edit AMC Record" : "Add AMC Record"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#64748b" }}
              >✕</button>
            </div>

            <div style={{ padding: "24px 28px" }}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Equipment / Service Name *</label>
                  <input type="text" name="equipmentServiceName" value={form.equipmentServiceName} onChange={handleFormChange} placeholder="e.g. Air Conditioners" />
                </div>
                <div className="form-field">
                  <label>Vendor Name *</label>
                  <input type="text" name="vendorName" value={form.vendorName} onChange={handleFormChange} placeholder="Vendor name" />
                </div>
                <div className="form-field">
                  <label>Under AMC</label>
                  <select name="underAmc" value={form.underAmc} onChange={handleFormChange}>
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Contract No</label>
                  <input type="text" name="contractNo" value={form.contractNo} onChange={handleFormChange} placeholder="Contract number" />
                </div>
                <div className="form-field">
                  <label>Location</label>
                  <input type="text" name="location" value={form.location} onChange={handleFormChange} placeholder="e.g. 1 & 2 floor City office" />
                </div>
                <div className="form-field">
                  <label>Yearly Services</label>
                  <input type="text" name="yearlyServices" value={form.yearlyServices} onChange={handleFormChange} placeholder="e.g. 4" />
                </div>
                <div className="form-field">
                  <label>Start Month/Date</label>
                  <input type="date" name="startMonthDate" value={form.startMonthDate} onChange={handleFormChange} />
                </div>
                <div className="form-field">
                  <label>Previous Date of Service</label>
                  <input type="date" name="previousDateOfService" value={form.previousDateOfService} onChange={handleFormChange} />
                </div>
                <div className="form-field">
                  <label>Next Due Date</label>
                  <input type="date" name="nextDueDate" value={form.nextDueDate} onChange={handleFormChange} />
                </div>
                <div className="form-field">
                  <label>Renewal Date</label>
                  <input type="date" name="renewalDate" value={form.renewalDate} onChange={handleFormChange} />
                </div>
                <div className="form-field">
                  <label>Expire Date</label>
                  <input type="date" name="expireDate" value={form.expireDate} onChange={handleFormChange} />
                </div>
                <div className="form-field">
                  <label>Contact Person</label>
                  <input type="text" name="contactPerson" value={form.contactPerson} onChange={handleFormChange} placeholder="Contact person name" />
                </div>
                <div className="form-field">
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Contact No</span>
                    {form.contactNo && form.contactNo.length > 0 && form.contactNo.length < 10 && (
                      <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 500 }}>
                        {10 - form.contactNo.length} more digit{10 - form.contactNo.length > 1 ? "s" : ""} required
                      </span>
                    )}
                    {form.contactNo && form.contactNo.length === 10 && (
                      <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 500 }}>
                        ✓ 10 digits
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="contactNo"
                    value={form.contactNo}
                    onChange={handleFormChange}
                    placeholder="10-digit phone number"
                    maxLength={10}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    style={
                      form.contactNo && form.contactNo.length > 0 && form.contactNo.length < 10
                        ? { borderColor: "#ef4444", backgroundColor: "#fff5f5" }
                        : form.contactNo && form.contactNo.length === 10
                        ? { borderColor: "#10b981" }
                        : {}
                    }
                  />
                </div>
                <div className="form-field">
                  <label>Status (Auto-calculated by Expire Date)</label>
                  <select name="status" value={form.status} onChange={handleFormChange} style={{ opacity: 0.7 }}>
                    <option>Active</option>
                    <option>Pending</option>
                    <option>Expired</option>
                  </select>
                </div>
              </div>
              <div className="form-field" style={{ marginTop: 20 }}>
                <label>Remarks</label>
                <textarea
                  name="remarks"
                  rows={3}
                  value={form.remarks}
                  onChange={handleFormChange}
                  placeholder="Any remarks or notes…"
                />
              </div>
            </div>

            <div style={{
              padding: "16px 28px", borderTop: "1px solid #f1f5f9",
              display: "flex", justifyContent: "flex-end", gap: 12,
            }}>
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
