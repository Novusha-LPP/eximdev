import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Download,
  Plus,
  Edit2,
  Trash2,
  X,
  Key,
  ChevronLeft,
  RotateCcw,
} from "lucide-react";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import CustomSelect from "./CustomSelect";
import ITPagination from "./ITPagination";
import { logExportAudit } from "./auditHelper";
import "../../styles/scorecard.scss";

// Compute license status from expiry date
function computeLicenseStatus(expiryDate) {
  if (!expiryDate) return { label: "No Expiry", cls: "badge-secondary" };
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "Expired", cls: "badge-danger" };
  if (diffDays <= 30) return { label: "Expiring Soon", cls: "badge-warning" };
  return { label: "Active", cls: "badge-excellent" };
}

const LICENSE_TYPES = [
  "Per User",
  "Per Device",
  "Subscription",
  "Enterprise",
  "OEM",
  "Trial",
];

const EMPTY_FORM = {
  license_name: "",
  license_code: "",
  software_name: "",
  vendor: "",
  license_type: "Subscription",
  expiry_date: "",
  cost: "",
  assigned_to: "",
  assigned_asset: "",
};

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function LicenseManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const limitParam = parseInt(searchParams.get("limit") || "10", 10);
  const statusParam = searchParams.get("status") || "";
  const typeParam = searchParams.get("type") || searchParams.get("license_type") || "";
  const searchParam = searchParams.get("search") || "";

  const [data, setData] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [searchInput, setSearchInput] = useState(searchParam);
  const [stats, setStats] = useState({ total: 0, active: 0, expiring: 0, expired: 0 });
  const [pagination, setPagination] = useState({
    page: pageParam,
    limit: limitParam,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  const updateQueryParams = (newParams) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    setSearchParams(params, { replace: true });
  };

  const normalize = (x) => {
    const rawAssignedTo =
      x.assigned_to ??
      x.assignedTo ??
      x.assigned_user ??
      x.assignedToUser ??
      x.assignedToEmail ??
      x.assignee ??
      x.assigned_user_email ??
      x.user ??
      x.owner ??
      x.employee ??
      x.assigned?.user ??
      x.assigned?.name ??
      x.assigned?.email ??
      null;

    const rawAssignedAsset =
      x.assigned_asset ??
      x.assignedAsset ??
      x.assigned_device ??
      x.asset ??
      x.device ??
      x.assigned?.asset ??
      null;

    let assigned_to = "";
    if (rawAssignedTo) {
      if (typeof rawAssignedTo === "string") {
        assigned_to = rawAssignedTo;
      } else if (typeof rawAssignedTo === "object") {
        assigned_to =
          rawAssignedTo.email ||
          rawAssignedTo.name ||
          rawAssignedTo.username ||
          rawAssignedTo.full_name ||
          rawAssignedTo.fullName ||
          rawAssignedTo.employee_name ||
          rawAssignedTo.label ||
          "";
      }
    }

    let assigned_asset = "";
    if (rawAssignedAsset) {
      if (typeof rawAssignedAsset === "string") {
        assigned_asset = rawAssignedAsset;
      } else if (typeof rawAssignedAsset === "object") {
        assigned_asset =
          rawAssignedAsset.name ||
          rawAssignedAsset.tag ||
          rawAssignedAsset.asset_tag ||
          rawAssignedAsset.assetTag ||
          rawAssignedAsset.code ||
          rawAssignedAsset.label ||
          "";
      }
    }

    return {
      _id: x._id,
      license_name: x.license_name || x.licenseName || x.name || x.license_title || "",
      license_code: x.license_code || x.licenseCode || x.code || x.license_id || "",
      license_type: x.license_type || x.licenseType || x.type || "",
      software_name: x.software_name || x.softwareName || x.product_name || "",
      vendor: x.vendor?._id || x.vendor || "",
      vendor_name: x.vendor?.name || x.vendor_name || x.publisher || "—",
      expiry_date: x.expiry_date || x.expiryDate || x.expires_at || x.expiry || "",
      cost: x.cost || 0,
      assigned_to,
      assigned_asset,
    };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusParam) params.status = statusParam;
      if (typeParam) {
        params.type = typeParam;
        params.license_type = typeParam;
      }
      if (searchParam) params.search = searchParam;
      params.page = pageParam;
      params.limit = limitParam;

      const res = await itHelpdeskAPI.licenses.getAll(params);

      setData((res.data || []).map(normalize));
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load licenses");
    } finally {
      setLoading(false);
    }
  }, [pageParam, limitParam, statusParam, typeParam, searchParam]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await itHelpdeskAPI.licenses.getStats();
      if (res && res.data) {
        setStats(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await itHelpdeskAPI.vendors.getAll({ all: "true" });
      setVendors(res.data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
    fetchStats();
  }, [fetchVendors, fetchStats]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (
      !form.license_name.trim() ||
      !form.license_code.trim() ||
      !form.software_name.trim() ||
      !form.vendor ||
      !form.license_type ||
      !form.expiry_date ||
      !form.assigned_to.trim()
    ) {
      toast.error("Please fill all mandatory fields");
      return;
    }

    if (form.assigned_to && !isValidEmail(form.assigned_to.trim())) {
      toast.error("Please enter a valid email address in Assigned To");
      return;
    }

    setSaving(true);
    const payload = {
      license_name: form.license_name.trim(),
      license_code: form.license_code.trim(),
      software_name: form.software_name.trim(),
      vendor: form.vendor,
      license_type: form.license_type,
      expiry_date: form.expiry_date || null,
      cost: Number(form.cost || 0),
      assigned_to: form.assigned_to.trim(),
      assigned_asset: form.assigned_asset?.trim() || "",
      total_seats: 0,
      used_seats: 0,
    };

    try {
      if (editId) {
        await itHelpdeskAPI.licenses.update(editId, payload);
        toast.success("License updated successfully");
      } else {
        await itHelpdeskAPI.licenses.create(payload);
        toast.success("License created successfully");
      }

      await Promise.all([fetchData(), fetchStats()]);
      setOpen(false);
      setEditId(null);
      setForm({ ...EMPTY_FORM });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save license");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditId(item._id);
    setForm({
      license_name: item.license_name,
      license_code: item.license_code,
      software_name: item.software_name,
      vendor: item.vendor?._id || item.vendor,
      license_type: item.license_type || "Subscription",
      expiry_date: item.expiry_date ? item.expiry_date.substring(0, 10) : "",
      cost: item.cost,
      assigned_to: item.assigned_to || "",
      assigned_asset: item.assigned_asset || "",
    });
    setOpen(true);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this software license?")) return;

    try {
      await itHelpdeskAPI.licenses.remove(id);
      toast.success("License deleted successfully");
      Promise.all([fetchData(), fetchStats()]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete license");
    }
  };

  const handleExportToExcel = async () => {
    try {
      const params = { limit: 10000 };
      if (statusParam) params.status = statusParam;
      if (typeParam) params.type = typeParam;
      if (searchParam) params.search = searchParam;

      const res = await itHelpdeskAPI.licenses.getAll(params);
      const exportItems = (res.data || []).map(normalize);

      const excelData = exportItems.map((item, index) => {
        const status = computeLicenseStatus(item.expiry_date);
        return {
          "Sr. No.": index + 1,
          "License Name": item.license_name || "",
          "License Code": item.license_code || "",
          "Software Name": item.software_name || "",
          "License Type": item.license_type || "",
          "Vendor": item.vendor_name || "",
          "Expiry Date": item.expiry_date ? new Date(item.expiry_date).toISOString().split("T")[0] : "No Expiry",
          "Status": status.label,
          "Assigned To": item.assigned_to || item.assigned_asset || "—",
          "Assigned Asset": item.assigned_asset || "—",
          "Cost": item.cost || 0,
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, "Software Licenses");

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `IT_Software_Licenses_${date}.xlsx`);
      toast.success("License directory exported to Excel");
      logExportAudit({
        module: "License",
        details: `Exported Software Licenses list to Excel (${excelData.length} licenses)`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export Excel");
    }
  };

  return (
    <>
      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <div className="topbar">
        <div className="topbar-left">
          <button
            className="back-btn"
            onClick={() => navigate("/it-helpdesk")}
            title="Back to IT Helpdesk"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="topbar-title">Software License Management</div>
            <div className="topbar-breadcrumb" style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Enterprise Software, SaaS Subscriptions, Expiry Tracking &amp; Assignee Management
            </div>
          </div>
        </div>

        <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportToExcel}
          >
            <Download size={15} /> <span>Export Excel</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditId(null);
              setForm({ ...EMPTY_FORM });
              setOpen(true);
            }}
          >
            <Plus size={15} /> <span>Add License</span>
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* ── KPI Summary Cards ─────────────────────────────────────── */}
        <div className="card mb-16">
          <div className="card-body">
            <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#0f172a" }}>
                  {stats.total}
                </div>
                <div className="stat-lbl">Total Licenses</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#10b981" }}>
                  {stats.active}
                </div>
                <div className="stat-lbl">Active Licenses</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#f59e0b" }}>
                  {stats.expiring}
                </div>
                <div className="stat-lbl">Expiring Soon</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#ef4444" }}>
                  {stats.expired}
                </div>
                <div className="stat-lbl">Expired</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filter Bar ────────────────────────────────────────────── */}
        <div className="card mb-16">
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
              <div className="form-field">
                <label>Search Directory</label>
                <div style={{ position: "relative" }}>
                  <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="License, software, vendor, assignee…"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      updateQueryParams({ search: e.target.value, page: 1 });
                    }}
                    style={{ paddingLeft: "32px" }}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>License Type</label>
                <CustomSelect
                  value={typeParam}
                  onChange={(val) => {
                    updateQueryParams({ type: val, license_type: val, page: 1 });
                  }}
                  options={[
                    { label: "All Types", value: "" },
                    ...LICENSE_TYPES.map((t) => ({ label: t, value: t })),
                  ]}
                  placeholder="All Types"
                  width="100%"
                />
              </div>

              <div className="form-field">
                <label>Expiry Status</label>
                <CustomSelect
                  value={statusParam}
                  onChange={(val) => {
                    updateQueryParams({ status: val, page: 1 });
                  }}
                  options={[
                    { label: "All Statuses", value: "" },
                    { label: "Active", value: "Active" },
                    { label: "Expiring Soon", value: "Expiring Soon" },
                    { label: "Expired", value: "Expired" },
                    { label: "No Expiry", value: "No Expiry" },
                  ]}
                  placeholder="All Statuses"
                  width="100%"
                />
              </div>

              <div className="form-field" style={{ minWidth: "130px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearchInput("");
                    setSearchParams({}, { replace: true });
                  }}
                  style={{
                    height: "38px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontWeight: 600,
                    fontSize: "13px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#475569",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  title="Clear Filters"
                >
                  <RotateCcw size={14} /> Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Table Card ────────────────────────────────────────────── */}
        <div className="card">
          <div
            className="card-header"
            style={{
              padding: "10px 16px",
              background: "linear-gradient(to right, #f8fafc, #ffffff)",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div className="card-title" style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
              <Key size={17} color="#0284c7" /> Software License Register
            </div>

            <span style={{ fontSize: "12px", color: "#64748b", background: "#f1f5f9", padding: "4px 10px", borderRadius: "12px", fontWeight: 600 }}>
              Showing {data.length} of {pagination.total} records
            </span>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                Loading licenses...
              </div>
            ) : (
              <div className="table-wrap">
                <table style={{ width: "100%", minWidth: "1280px" }}>
                  <thead>
                    <tr>
                      <th style={{ width: 44, minWidth: 44, textAlign: "center" }}>#</th>
                      <th style={{ minWidth: 200 }}>License Name</th>
                      <th style={{ minWidth: 140 }}>License Code</th>
                      <th style={{ minWidth: 150 }}>Software Product</th>
                      <th style={{ minWidth: 180 }}>Type</th>
                      <th style={{ minWidth: 180 }}>Vendor / Partner</th>
                      <th style={{ minWidth: 110 }}>Expiry Date</th>
                      <th style={{ minWidth: 100, textAlign: "center" }}>Status</th>
                      <th style={{ minWidth: 180 }}>Assigned To</th>
                      <th style={{ minWidth: 100, textAlign: "right" }}>Cost (₹)</th>
                      <th style={{ width: 80, minWidth: 80, textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={11} style={{ textAlign: "center", padding: "36px 16px", color: "#94a3b8" }}>
                          No software licenses found matching criteria
                        </td>
                      </tr>
                    ) : (
                      data.map((item, idx) => {
                        const status = computeLicenseStatus(item.expiry_date);

                        return (
                          <tr key={item._id} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd" }}>
                            <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>
                              {(pagination.page - 1) * pagination.limit + idx + 1}
                            </td>
                            <td className="fw-600" style={{ color: "#0f172a" }}>
                              {item.license_name}
                            </td>
                            <td style={{ color: "#4f46e5", fontFamily: "monospace", fontSize: "12px", whiteSpace: "nowrap" }}>
                              {item.license_code}
                            </td>
                            <td style={{ color: "#334155" }}>
                              {item.software_name}
                            </td>
                            <td style={{ minWidth: "180px", color: "#334155", fontSize: "13px" }}>
                              {item.license_type || "Standard"}
                            </td>
                            <td style={{ minWidth: "180px", color: "#475569" }}>
                              {item.vendor_name || item.vendor?.name || "—"}
                            </td>
                            <td style={{ color: "#64748b", fontSize: "12.5px", whiteSpace: "nowrap" }}>
                              {fmtDate(item.expiry_date)}
                            </td>
                            <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                              <span className={`score-badge ${status.cls}`}>
                                {status.label}
                              </span>
                            </td>
                            <td style={{ color: "#1e293b", fontSize: "12.5px" }}>
                              {item.assigned_to || item.assigned_asset || "—"}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>
                              {item.cost ? `₹${Number(item.cost).toLocaleString("en-IN")}` : "—"}
                            </td>
                            <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                              <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                                <button
                                  type="button"
                                  className="btn btn-icon btn-primary"
                                  onClick={() => handleEdit(item)}
                                  title="Edit License"
                                  style={{ width: "28px", height: "28px" }}
                                >
                                  <Edit2 size={14} color="#4f46e5" />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-icon btn-danger"
                                  onClick={(e) => handleDelete(e, item._id)}
                                  title="Delete License"
                                  style={{ width: "28px", height: "28px" }}
                                >
                                  <Trash2 size={13} color="#dc2626" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Pagination Footer ─────────────────────────────────── */}
            <ITPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalRecords={pagination.total}
              limit={pagination.limit}
              onPageChange={(newPage) => updateQueryParams({ page: newPage })}
              onLimitChange={(newLimit) => updateQueryParams({ limit: newLimit, page: 1 })}
            />
          </div>
        </div>

        {/* ── Add / Edit Modal ──────────────────────────────────────── */}
        {open && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(4px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                width: "100%",
                maxWidth: "600px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                overflow: "hidden",
                border: "1px solid #e2e8f0",
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "16px 20px",
                  background: "linear-gradient(to right, #0f172a, #1e293b)",
                  color: "#ffffff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                    {editId ? "✏️ Edit Software License" : "✨ Register New Software License"}
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                    Enter license key, publisher, expiry date, and assignee details
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "none",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSave} style={{ padding: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div className="form-field">
                    <label>License Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Microsoft 365 Business Standard"
                      value={form.license_name}
                      onChange={(e) => setForm({ ...form, license_name: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>License Key / Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="XXXXX-XXXXX-XXXXX"
                      value={form.license_code}
                      onChange={(e) => setForm({ ...form, license_code: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Software Product *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MS Office Suite"
                      value={form.software_name}
                      onChange={(e) => setForm({ ...form, software_name: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Vendor / Publisher *</label>
                    <select
                      required
                      value={form.vendor}
                      onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                    >
                      <option value="">Select Vendor</option>
                      {vendors.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>License Type *</label>
                    <select
                      value={form.license_type}
                      onChange={(e) => setForm({ ...form, license_type: e.target.value })}
                    >
                      {LICENSE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Expiry Date *</label>
                    <input
                      type="date"
                      required
                      value={form.expiry_date}
                      onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Assigned To (User Email) *</label>
                    <input
                      type="email"
                      required
                      placeholder="user@alvision.in"
                      value={form.assigned_to}
                      onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Cost (₹)</label>
                    <input
                      type="number"
                      placeholder="Annual / One-time cost"
                      value={form.cost}
                      onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: "12px",
                    marginTop: "20px",
                    paddingTop: "14px",
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setOpen(false)}
                    disabled={saving}
                    style={{
                      height: "38px",
                      padding: "0 18px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: "13.5px",
                      borderRadius: "8px",
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      color: "#334155",
                      margin: 0,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                    style={{
                      height: "38px",
                      padding: "0 18px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: "13.5px",
                      borderRadius: "8px",
                      margin: 0,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {saving ? "Saving..." : editId ? "Update License" : "Create License"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
