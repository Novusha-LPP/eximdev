import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  const { logCreate, logRead, logUpdate, logDelete, logExport } = useModuleAuditLogs("Vendor");

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (typeof logRead === "function") {
        logRead("vendor-list-view", "Fetched vendor records", "info");
      }
      const res = await itHelpdeskAPI.vendors.getAll();
      const vendors = res.data || res;
      setData(Array.isArray(vendors) ? vendors : []);
    } catch (err) {
      if (typeof logCreate === "function") {
        logCreate(err.message, "Vendor fetch failed", "error");
      }
      toast.error("Failed to fetch vendors");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [logCreate, logRead]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered data
  const filteredData = data.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (item.name || "").toLowerCase().includes(term) ||
      (item.gst_number || "").toLowerCase().includes(term) ||
      (item.pan_number || "").toLowerCase().includes(term) ||
      (item.contact_person || "").toLowerCase().includes(term) ||
      (item.mobile_number || "").toLowerCase().includes(term) ||
      (item.email || "").toLowerCase().includes(term);

    const vendorType = item.vendor_type || item.type;
    const matchesType = !selectedType || vendorType === selectedType;
    const matchesStatus = !selectedStatus || item.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  // KPI counts
  const totalCount = data.length;
  const activeCount = data.filter((d) => d.status === "Active").length;
  const inactiveCount = totalCount - activeCount;
  const supplierCount = data.filter((d) => {
    const t = d.vendor_type || d.type;
    return t === "Supplier" || t === "Service Provider" || t === "Hardware" || t === "Software";
  }).length;

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredData.length / limit));
  const displayedRows = filteredData.slice((page - 1) * limit, page * limit);

  const handleOpen = (record = null) => {
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

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      !form.name.trim() ||
      !form.contact_person.trim() ||
      !form.mobile_number.trim() ||
      !form.email.trim()
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!emailRegex.test(form.email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        vendor_type: form.vendor_type || "Supplier",
        type: form.vendor_type || "Supplier",
        gst_number: form.gst_number?.trim() || "",
        pan_number: form.pan_number?.trim() || "",
        contact_person: form.contact_person.trim(),
        mobile_number: form.mobile_number.trim(),
        email: form.email.trim(),
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
      fetchData();
    } catch (err) {
      console.error("Vendor save failed:", err.message);
      toast.error("Failed to save vendor");
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

  const handleExportToExcel = () => {
    try {
      const excelData = filteredData.map((item, index) => ({
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
      toast.success("Vendor directory exported to Excel");
      logExport("vendors-export", `Exported Vendors & Suppliers directory to Excel (${excelData.length} records)`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export Excel");
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
            className="btn btn-icon"
            onClick={() => navigate("/it-helpdesk")}
            title="Back to IT Helpdesk"
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
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              transition: "all 0.2s ease",
            }}
          >
            ←
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
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    style={{ paddingLeft: "32px" }}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Vendor Type</label>
                <CustomSelect
                  value={selectedType}
                  onChange={(val) => {
                    setSelectedType(val);
                    setPage(1);
                  }}
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
                  value={selectedStatus}
                  onChange={(val) => {
                    setSelectedStatus(val);
                    setPage(1);
                  }}
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
                    setSearchTerm("");
                    setSelectedType("");
                    setSelectedStatus("");
                    setPage(1);
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
              Showing {displayedRows.length} of {filteredData.length} records
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
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: "36px 16px", color: "#94a3b8" }}>
                          No vendors found matching criteria
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((v, idx) => (
                        <tr key={v._id} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd" }}>
                          <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>
                            {(page - 1) * limit + idx + 1}
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
              page={page}
              totalPages={totalPages}
              totalRecords={filteredData.length}
              limit={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
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
              <form onSubmit={handleSave} style={{ padding: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div className="form-field" style={{ gridColumn: "span 2" }}>
                    <label>Company / Vendor Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Paramount Tech Solutions Pvt Ltd"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Vendor Type</label>
                    <select
                      value={form.vendor_type}
                      onChange={(e) => setForm({ ...form, vendor_type: e.target.value })}
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
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
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
                      value={form.gst_number}
                      onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>PAN Number</label>
                    <input
                      type="text"
                      placeholder="AAAAA0000A"
                      value={form.pan_number}
                      onChange={(e) => setForm({ ...form, pan_number: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Contact Person *</label>
                    <input
                      type="text"
                      required
                      placeholder="Mr. Rajesh Kumar"
                      value={form.contact_person}
                      onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Mobile Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="9876543210"
                      value={form.mobile_number}
                      onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
                    />
                  </div>

                  <div className="form-field" style={{ gridColumn: "span 2" }}>
                    <label>Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="rajesh@paramount.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
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
