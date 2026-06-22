import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
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
  if (diffDays <= PENDING_THRESHOLD_DAYS) return "P \
  ending";
  return "Active";
};

export default function AmcRenewalList() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ status: "", search: "" });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50 });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_RECORD });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.limit };
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const [listRes, statsRes] = await Promise.all([
        amcRenewalAPI.getAll(params),
        amcRenewalAPI.getStats(),
      ]);
      setData(listRes.data);
      setPagination(listRes.pagination);
      setStats(statsRes.data);
    } catch {
      toast.error("Failed to load AMC renewals");
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  useEffect(() => { fetchData(1); }, [fetchData]);

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
      contactNo: row.contactNo || "",
      status: row.status || "Active",
      remarks: row.remarks || "",
      documentUrl: row.documentUrl || "",
    });
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.equipmentServiceName.trim() || !form.vendorName.trim()) {
      toast.error("Equipment/Service Name and Vendor Name are required");
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
              <div className="form-field" style={{ justifyContent: "flex-end" }}>
                <label>&nbsp;</label>
                <button className="btn" onClick={() => setFilters({ status: "", search: "" })}>
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📋 AMC Suppliers Renewal Sheet</div>
          </div>
          <div className="table-wrap">
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
                    <th style={{ width: 40 }}>Srno</th>
                    <th>Equipment / Service Name</th>
                    <th>Vendor Name</th>
                    <th style={{ textAlign: "center" }}>Under AMC</th>
                    <th>Contract No</th>
                    <th>Location</th>
                    <th style={{ textAlign: "center" }}>Yearly Services</th>
                    <th>Start Month/Date</th>
                    <th>Previous Date of Service</th>
                    <th>Next Due Date</th>
                    <th>Renewal Date</th>
                    <th>Expire Date</th>
                    <th>Contact Person</th>
                    <th>Contact No</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                    <th>Remarks</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={row._id} onClick={() => openEdit(row)} style={{ cursor: "pointer" }}>
                      <td className="text-muted">{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                      <td className="fw-600">{row.equipmentServiceName}</td>
                      <td>{row.vendorName}</td>
                      <td style={{ textAlign: "center" }}>{row.underAmc}</td>
                      <td>{row.contractNo || "—"}</td>
                      <td>{row.location || "—"}</td>
                      <td style={{ textAlign: "center" }}>{row.yearlyServices || "—"}</td>
                      <td>{fmtDate(row.startMonthDate)}</td>
                      <td>{fmtDate(row.previousDateOfService)}</td>
                      <td>{fmtDate(row.nextDueDate)}</td>
                      <td>{fmtDate(row.renewalDate)}</td>
                      <td>{fmtDate(row.expireDate)}</td>
                      <td>{row.contactPerson || "—"}</td>
                      <td>{row.contactNo || "—"}</td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`score-badge ${statusClass(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="text-muted">{row.remarks || "—"}</td>
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
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="card-body flex-center gap-8" style={{ justifyContent: "flex-end", borderTop: "1px solid #e2e8f0" }}>
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
                  <label>Contact No</label>
                  <input type="text" name="contactNo" value={form.contactNo} onChange={handleFormChange} placeholder="Phone number" />
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
