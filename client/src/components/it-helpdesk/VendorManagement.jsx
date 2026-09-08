import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Download,
  Plus,
  Edit2,
  Trash2,
  X,
  Building2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import { useModuleAuditLogs } from "./AuditLogs";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import CustomSelect from "./CustomSelect";
import ITPagination from "./ITPagination";
import "../../styles/scorecard.scss";

const VENDOR_TYPES = [
  "Supplier",
  "Service Provider",
  "Hardware",
  "Software",
  "Network",
  "Transporter",
  "CHA",
  "Shipping Line",
  "Other",
];

const STATUS_OPTIONS = ["Active", "Inactive"];

// Validation patterns for standard Indian registrations and contact details
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Reusable field-level validator for Vendor form
 */
export const validateVendorField = (fieldName, value) => {
  const val = typeof value === "string" ? value.trim() : "";
  switch (fieldName) {
    case "name":
      if (!val) return "Company / Vendor name is required";
      return "";
    case "contact_person":
      if (!val) return "Contact person name is required";
      return "";
    case "mobile_number":
      if (!val) return "Mobile number is required";
      if (!MOBILE_REGEX.test(val)) {
        return "Must be 10 digits starting with 6, 7, 8, or 9";
      }
      return "";
    case "email":
      if (!val) return "Email address is required";
      if (!EMAIL_REGEX.test(val)) {
        return "Invalid email format (e.g. name@domain.com)";
      }
      return "";
    case "gst_number":
      if (val) {
        if (!GSTIN_REGEX.test(val.toUpperCase())) {
          return "Invalid GSTIN format (e.g. 24AAAAA0000A1Z5 - 15 characters)";
        }
      }
      return "";
    case "pan_number":
      if (val) {
        if (!PAN_REGEX.test(val.toUpperCase())) {
          return "Invalid PAN format (e.g. AAAAA0000A - 10 characters)";
        }
      }
      return "";
    default:
      return "";
  }
};

/**
 * Reusable form-level validator for Vendor form
 */
export const validateVendorForm = (formData) => {
  const errors = {};
  const fields = ["name", "contact_person", "mobile_number", "email", "gst_number", "pan_number"];
  fields.forEach((field) => {
    const error = validateVendorField(field, formData[field]);
    if (error) {
      errors[field] = error;
    }
  });
  return errors;
};

const EMPTY_FORM = {
  name: "",
  vendor_type: "Supplier",
  gst_number: "",
  pan_number: "",
  contact_person: "",
  mobile_number: "",
  email: "",
  status: "Active",
};

export default function VendorManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { logCreate, logRead, logUpdate, logDelete, logExport } = useModuleAuditLogs("Vendor");

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [stats, setStats] = useState(null);

  // Parse parameters from URL query string
  const statusParam = searchParams.get("status") || "";
  const typeParam = searchParams.get("vendor_type") || searchParams.get("type") || "";
  const searchParam = searchParams.get("search") || "";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const limitParam = parseInt(searchParams.get("limit") || "15", 10);

  const updateQueryParams = useCallback(
    (newParams) => {
      setSearchParams((prevParams) => {
        const updated = new URLSearchParams(prevParams);
        Object.entries(newParams).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== "") {
            updated.set(key, String(val));
          } else {
            updated.delete(key);
          }
        });
        return updated;
      });
    },
    [setSearchParams]
  );

  const [searchInput, setSearchInput] = useState(searchParam);
  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  const fetchData = useCallback(
    async (overridePage) => {
      if (typeof overridePage === "number") {
        updateQueryParams({ page: overridePage });
        return;
      }
      setLoading(true);
      try {
        if (typeof logRead === "function") {
          logRead("vendor-list-view", "Fetched vendor records", "info");
        }
        const params = {
          page: pageParam,
          limit: limitParam,
        };
        if (statusParam) params.status = statusParam;
        if (typeParam) params.vendor_type = typeParam;
        if (searchParam) params.search = searchParam;

        const [listRes, statsRes] = await Promise.all([
          itHelpdeskAPI.vendors.getAll(params),
          itHelpdeskAPI.vendors.getStats ? itHelpdeskAPI.vendors.getStats().catch(() => null) : Promise.resolve(null),
        ]);

        const vendors = listRes.data || listRes;
        setData(Array.isArray(vendors) ? vendors : []);
        if (listRes.pagination) {
          setPagination(listRes.pagination);
        } else {
          setPagination({ page: pageParam, limit: limitParam, total: vendors.length, totalPages: 1 });
        }
        if (statsRes && statsRes.data) {
          setStats(statsRes.data);
        }
      } catch (err) {
        if (typeof logCreate === "function") {
          logCreate(err.message, "Vendor fetch failed", "error");
        }
        toast.error("Failed to fetch vendors");
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [pageParam, limitParam, statusParam, typeParam, searchParam, updateQueryParams, logCreate, logRead]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // KPI counts
  const totalCount = stats?.total ?? pagination.total ?? data.length;
  const activeCount = stats?.active ?? data.filter((d) => d.status === "Active").length;
  const inactiveCount = stats?.inactive ?? (totalCount - activeCount);
  const supplierCount = stats?.suppliers ?? data.filter((d) => {
    const t = d.vendor_type || d.type;
    return t === "Supplier" || t === "Service Provider" || t === "Hardware" || t === "Software";
  }).length;

  const handleOpen = (record = null) => {
    setErrors({});
    if (record) {
      setEditId(record._id);
      setForm({
        name: record.name || "",
        vendor_type: record.vendor_type || record.type || "Supplier",
        gst_number: record.gst_number || "",
        pan_number: record.pan_number || "",
        contact_person: record.contact_person || "",
        mobile_number: record.mobile_number || "",
        email: record.email || "",
        status: record.status || "Active",
      });
    } else {
      setEditId(null);
      setForm({ ...EMPTY_FORM });
      if (typeof logRead === "function") {
        logRead("vendor-creation-intent", "Opened vendor creation form", "info");
      }
    }
    setShowModal(true);
  };

  /**
   * Handle real-time input change with auto-formatting and error clearance
   */
  const handleFieldChange = (field, rawValue) => {
    let value = rawValue;

    // Auto-formatting: GST/PAN uppercase and no spaces
    if (field === "gst_number" || field === "pan_number") {
      value = rawValue.toUpperCase().replace(/\s/g, "");
    } else if (field === "mobile_number") {
      // Numbers only, max 10 digits
      value = rawValue.replace(/\D/g, "").slice(0, 10);
    }

    setForm((prev) => ({ ...prev, [field]: value }));

    // Immediate error removal when valid
    const fieldError = validateVendorField(field, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (!fieldError) {
        delete next[field];
      } else if (prev[field]) {
        // If field already had an error, update message
        next[field] = fieldError;
      }
      return next;
    });
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    // Comprehensive format validation across all fields
    const validationErrors = validateVendorForm(form);

    // Client-side uniqueness pre-check against existing vendor list
    const duplicateErrors = {};
    const normalizedName = (form.name || "").trim().toLowerCase();
    const normalizedMobile = (form.mobile_number || "").trim();
    const normalizedGst = (form.gst_number || "").trim().toUpperCase();
    const normalizedPan = (form.pan_number || "").trim().toUpperCase();

    data.forEach((item) => {
      if (editId && item._id === editId) return;

      if (normalizedName && (item.name || "").trim().toLowerCase() === normalizedName) {
        duplicateErrors.name = "A vendor with this name already exists";
      }
      if (normalizedMobile && (item.mobile_number || "").trim() === normalizedMobile) {
        duplicateErrors.mobile_number = "A vendor with this mobile number already exists";
      }
      if (normalizedGst && (item.gst_number || "").trim().toUpperCase() === normalizedGst) {
        duplicateErrors.gst_number = "A vendor with this GST number already exists";
      }
      if (normalizedPan && (item.pan_number || "").trim().toUpperCase() === normalizedPan) {
        duplicateErrors.pan_number = "A vendor with this PAN number already exists";
      }
    });

    const combinedErrors = { ...validationErrors, ...duplicateErrors };
    if (Object.keys(combinedErrors).length > 0) {
      setErrors(combinedErrors);
      const firstErrorMessage = Object.values(combinedErrors)[0];
      toast.error(firstErrorMessage || "Please fix validation errors before submitting");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        vendor_type: form.vendor_type || "Supplier",
        type: form.vendor_type || "Supplier",
        gst_number: form.gst_number?.trim().toUpperCase() || "",
        pan_number: form.pan_number?.trim().toUpperCase() || "",
        contact_person: form.contact_person.trim(),
        mobile_number: form.mobile_number.trim(),
        email: form.email.trim().toLowerCase(),
        status: form.status || "Active",
      };

      if (editId) {
        await itHelpdeskAPI.vendors.update(editId, payload);
        if (typeof logUpdate === "function") {
          logUpdate(`Updated vendor ${payload.name}`, editId);
        }
        toast.success("Vendor updated successfully");
      } else {
        await itHelpdeskAPI.vendors.create(payload);
        if (typeof logCreate === "function") {
          logCreate(`Created vendor ${payload.name}`);
        }
        toast.success("Vendor created successfully");
      }

      setShowModal(false);
      setEditId(null);
      setForm({ ...EMPTY_FORM });
      setErrors({});
      fetchData();
    } catch (err) {
      console.error("Vendor save failed:", err);
      const serverMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to save vendor";

      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
      toast.error(serverMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this vendor record?")) return;

    try {
      await itHelpdeskAPI.vendors.remove(id);
      if (typeof logDelete === "function") {
        logDelete(`Deleted vendor with ID: ${id}`);
      }
      toast.success("Vendor deleted successfully");
      fetchData();
    } catch (err) {
      console.error("Vendor delete failed:", err.message);
      toast.error("Failed to delete vendor");
    }
  };

  const handleExportToExcel = async () => {
    try {
      toast.loading("Preparing export...", { id: "export-vendors" });
      const params = { limit: 10000 };
      if (statusParam) params.status = statusParam;
      if (typeParam) params.vendor_type = typeParam;
      if (searchParam) params.search = searchParam;

      const res = await itHelpdeskAPI.vendors.getAll(params);
      const vendorsToExport = res.data || [];

      const excelData = vendorsToExport.map((item, index) => ({
        "Sr. No.": index + 1,
        "Company / Vendor Name": item.name || "",
        "Vendor Type": item.vendor_type || item.type || "Other",
        "GST Number": item.gst_number || "—",
        "PAN Number": item.pan_number || "—",
        "Contact Person": item.contact_person || "",
        "Mobile Number": item.mobile_number || "",
        "Email": item.email || "",
        "Status": item.status || "Active",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, "Vendors & Suppliers");

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `IT_Vendors_List_${date}.xlsx`);
      toast.success("Vendor directory exported to Excel", { id: "export-vendors" });
      logExport("vendors-export", `Exported Vendors & Suppliers directory to Excel (${excelData.length} records)`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export Excel", { id: "export-vendors" });
    }
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case "Supplier":
        return "badge-excellent";
      case "Service Provider":
        return "badge-good";
      case "Hardware":
      case "Software":
      case "Network":
        return "badge-info";


        case "CHA":
      case "Transporter":
        return "badge-primary";
      case "Shipping Line":
        return "badge-warning";
      default:
        return "badge-secondary";
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
            <div className="topbar-title">Vendors &amp; AMC Suppliers</div>
            <div className="topbar-breadcrumb" style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              IT Hardware Suppliers, Maintenance Partners &amp; Service Providers
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
            onClick={() => handleOpen()}
          >
            <Plus size={15} /> <span>Add Vendor</span>
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
                  {totalCount}
                </div>
                <div className="stat-lbl">Total Vendors</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#10b981" }}>
                  {activeCount}
                </div>
                <div className="stat-lbl">Active Partners</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#64748b" }}>
                  {inactiveCount}
                </div>
                <div className="stat-lbl">Inactive</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#4f46e5" }}>
                  {supplierCount}
                </div>
                <div className="stat-lbl">Suppliers / Services</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filters Card ──────────────────────────────────────────── */}
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
                    placeholder="Company, contact, email, GST…"
                    value={searchInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchInput(val);
                      updateQueryParams({ search: val, page: 1 });
                    }}
                    style={{ paddingLeft: "32px" }}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Vendor Type</label>
                <CustomSelect
                  value={typeParam}
                  onChange={(val) => updateQueryParams({ vendor_type: val, page: 1 })}
                  options={[
                    { label: "All Types", value: "" },
                    ...VENDOR_TYPES.map((t) => ({ label: t, value: t })),
                  ]}
                  placeholder="All Types"
                  width="100%"
                />
              </div>

              <div className="form-field">
                <label>Status</label>
                <CustomSelect
                  value={statusParam}
                  onChange={(val) => updateQueryParams({ status: val, page: 1 })}
                  options={[
                    { label: "All Statuses", value: "" },
                    ...STATUS_OPTIONS.map((s) => ({ label: s, value: s })),
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
                    setSearchParams({ page: "1", limit: String(limitParam) });
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
              <Building2 size={17} color="#4f46e5" /> Vendor Directory
            </div>

            <span style={{ fontSize: "12px", color: "#64748b", background: "#f1f5f9", padding: "4px 10px", borderRadius: "12px", fontWeight: 600 }}>
              Showing {data.length} of {pagination.total || 0} records
            </span>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                Loading vendors...
              </div>
            ) : (
              <div className="table-wrap">
                <table style={{ width: "100%", minWidth: "1150px" }}>
                  <thead>
                    <tr>
                      <th style={{ width: 44, minWidth: 44, textAlign: "center" }}>#</th>
                      <th style={{ minWidth: 180 }}>Company Name</th>
                      <th style={{ minWidth: 130 }}>Vendor Type</th>
                      <th style={{ minWidth: 140 }}>GST / PAN</th>
                      <th style={{ minWidth: 150 }}>Contact Person</th>
                      <th style={{ minWidth: 130 }}>Mobile Number</th>
                      <th style={{ minWidth: 170 }}>Email Address</th>
                      <th style={{ minWidth: 100, textAlign: "center" }}>Status</th>
                      <th style={{ width: 90, minWidth: 90, textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: "36px 16px", color: "#94a3b8" }}>
                          No vendors found matching criteria
                        </td>
                      </tr>
                    ) : (
                      data.map((v, idx) => (
                        <tr key={v._id} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd" }}>
                          <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>
                            {(pagination.page - 1) * pagination.limit + idx + 1}
                          </td>
                          <td className="fw-600" style={{ color: "#0f172a" }}>
                            {v.name}
                          </td>
                          <td style={{ color: "#334155", fontSize: "13px", fontWeight: 500 }}>
                            {v.vendor_type || v.type || "—"}
                          </td>
                          <td style={{ color: "#475569", fontSize: "12.5px" }}>
                            {v.gst_number || v.pan_number ? (
                              <div>
                                {v.gst_number && <div>GST: {v.gst_number}</div>}
                                {v.pan_number && <div style={{ color: "#64748b" }}>PAN: {v.pan_number}</div>}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td style={{ color: "#1e293b", fontWeight: 500 }}>
                            {v.contact_person || "—"}
                          </td>
                          <td style={{ color: "#334155", fontSize: "13px" }}>
                            {v.mobile_number || "—"}
                          </td>
                          <td style={{ color: "#334155", fontSize: "13px" }}>
                            {v.email || "—"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={`score-badge ${v.status === "Active" ? "badge-excellent" : "badge-secondary"}`}>
                              {v.status || "Active"}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                              <button
                                type="button"
                                className="btn btn-icon btn-primary"
                                onClick={() => handleOpen(v)}
                                title="Edit Vendor"
                                style={{ width: "28px", height: "28px" }}
                              >
                                <Edit2 size={14} color="#4f46e5" />
                              </button>
                              <button
                                type="button"
                                className="btn btn-icon btn-danger"
                                onClick={(e) => handleDelete(e, v._id)}
                                title="Delete Vendor"
                                style={{ width: "28px", height: "28px" }}
                              >
                                <Trash2 size={13} color="#dc2626" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Pagination Footer ─────────────────────────────────── */}
            <ITPagination
              page={pagination.page || pageParam}
              totalPages={pagination.totalPages || 1}
              totalRecords={pagination.total || 0}
              limit={pagination.limit || limitParam}
              onPageChange={(newPage) => updateQueryParams({ page: newPage })}
              onLimitChange={(newLimit) => updateQueryParams({ limit: newLimit, page: 1 })}
            />
          </div>
        </div>

        {/* ── Add / Edit Modal ──────────────────────────────────────── */}
        {showModal && (
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
                    {editId ? "✏️ Edit Vendor Details" : "✨ Add New Vendor / Supplier"}
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                    Enter contact and registration information for the partner
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
              <form onSubmit={handleSave} noValidate style={{ padding: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div className="form-field" style={{ gridColumn: "span 2" }}>
                    <label>Company / Vendor Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Paramount Tech Solutions Pvt Ltd"
                      value={form.name}
                      onChange={(e) => handleFieldChange("name", e.target.value)}
                      style={{
                        ...(errors.name
                          ? { borderColor: "#ef4444 !important", boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.15) !important" }
                          : {}),
                      }}
                    />
                    {errors.name && (
                      <span style={{ color: "#ef4444", fontSize: "11.5px", marginTop: "4px", display: "block", fontWeight: 500 }}>
                        {errors.name}
                      </span>
                    )}
                  </div>

                  <div className="form-field">
                    <label>Vendor Type</label>
                    <select
                      value={form.vendor_type}
                      onChange={(e) => handleFieldChange("vendor_type", e.target.value)}
                    >
                      {VENDOR_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => handleFieldChange("status", e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>GST Number</label>
                    <input
                      type="text"
                      placeholder="24AAAAA0000A1Z5"
                      maxLength={15}
                      value={form.gst_number}
                      onChange={(e) => handleFieldChange("gst_number", e.target.value)}
                      style={{
                        ...(errors.gst_number
                          ? { borderColor: "#ef4444 !important", boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.15) !important" }
                          : {}),
                      }}
                    />
                    {errors.gst_number && (
                      <span style={{ color: "#ef4444", fontSize: "11.5px", marginTop: "4px", display: "block", fontWeight: 500 }}>
                        {errors.gst_number}
                      </span>
                    )}
                  </div>

                  <div className="form-field">
                    <label>PAN Number</label>
                    <input
                      type="text"
                      placeholder="AAAAA0000A"
                      maxLength={10}
                      value={form.pan_number}
                      onChange={(e) => handleFieldChange("pan_number", e.target.value)}
                      style={{
                        ...(errors.pan_number
                          ? { borderColor: "#ef4444 !important", boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.15) !important" }
                          : {}),
                      }}
                    />
                    {errors.pan_number && (
                      <span style={{ color: "#ef4444", fontSize: "11.5px", marginTop: "4px", display: "block", fontWeight: 500 }}>
                        {errors.pan_number}
                      </span>
                    )}
                  </div>

                  <div className="form-field">
                    <label>Contact Person *</label>
                    <input
                      type="text"
                      placeholder="Mr. Rajesh Kumar"
                      value={form.contact_person}
                      onChange={(e) => handleFieldChange("contact_person", e.target.value)}
                      style={{
                        ...(errors.contact_person
                          ? { borderColor: "#ef4444 !important", boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.15) !important" }
                          : {}),
                      }}
                    />
                    {errors.contact_person && (
                      <span style={{ color: "#ef4444", fontSize: "11.5px", marginTop: "4px", display: "block", fontWeight: 500 }}>
                        {errors.contact_person}
                      </span>
                    )}
                  </div>

                  <div className="form-field">
                    <label>Mobile Number *</label>
                    <input
                      type="text"
                      placeholder="9876543210"
                      maxLength={10}
                      value={form.mobile_number}
                      onChange={(e) => handleFieldChange("mobile_number", e.target.value)}
                      style={{
                        ...(errors.mobile_number
                          ? { borderColor: "#ef4444 !important", boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.15) !important" }
                          : {}),
                      }}
                    />
                    {errors.mobile_number && (
                      <span style={{ color: "#ef4444", fontSize: "11.5px", marginTop: "4px", display: "block", fontWeight: 500 }}>
                        {errors.mobile_number}
                      </span>
                    )}
                  </div>

                  <div className="form-field" style={{ gridColumn: "span 2" }}>
                    <label>Email Address *</label>
                    <input
                      type="email"
                      placeholder="rajesh@paramount.com"
                      value={form.email}
                      onChange={(e) => handleFieldChange("email", e.target.value)}
                      style={{
                        ...(errors.email
                          ? { borderColor: "#ef4444 !important", boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.15) !important" }
                          : {}),
                      }}
                    />
                    {errors.email && (
                      <span style={{ color: "#ef4444", fontSize: "11.5px", marginTop: "4px", display: "block", fontWeight: 500 }}>
                        {errors.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div
                  style={{
                    display: "flex",
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
                    onClick={() => setShowModal(false)}
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
                    }}
                  >
                    {saving ? "Saving..." : editId ? "Update Vendor" : "Create Vendor"}
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
