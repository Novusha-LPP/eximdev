import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Download,
  Plus,
  Edit2,
  Trash2,
  X,
  HardDrive,
  Package,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import { useModuleAuditLogs } from "./AuditLogs";
import toast from "react-hot-toast";
import CustomSelect from "./CustomSelect";
import ITPagination from "./ITPagination";
import "../../styles/scorecard.scss";

const CATEGORIES = [
  "Computer",
  "Laptop",
  "Printer",
  "Monitor",
  "Server",
  "Network Device",
  "Mobile Device",
  "Software License",
  "Other",
];

const EMPTY_FORM = {
  item_id: "",
  brand: "",
  model: "",
  category: "Computer",
  inventory_type: "Old",
  warranty_start_date: "",
  warranty_end_date: "",
};

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const computeWarrantyStatus = (endStr) => {
  if (!endStr) return { label: "No Warranty", cls: "badge-secondary" };
  const end = new Date(endStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "Expired", cls: "badge-danger" };
  if (diffDays <= 30) return { label: "Expiring Soon", cls: "badge-warning" };
  return { label: "Active", cls: "badge-excellent" };
};

export default function InventoryManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { logCreate, logUpdate, logDelete, logExport } = useModuleAuditLogs("Inventory");

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [stats, setStats] = useState(null);

  // Parse parameters from URL query string
  const rawTypeParam = searchParams.get("inventory_type") || "Old";
  const activeTab = rawTypeParam.toLowerCase() === "new" ? "new" : "old";
  const categoryParam = searchParams.get("category") || "";
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

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return isNaN(date) ? "" : date.toISOString().split("T")[0];
  };

  const fetchData = useCallback(
    async (overridePage) => {
      if (typeof overridePage === "number") {
        updateQueryParams({ page: overridePage });
        return;
      }
      setLoading(true);
      try {
        const targetType = activeTab === "new" ? "New" : "Old";
        const params = {
          inventory_type: targetType,
          page: pageParam,
          limit: limitParam,
        };
        if (categoryParam) params.category = categoryParam;
        if (searchParam) params.search = searchParam;

        const [listRes, statsRes] = await Promise.all([
          itHelpdeskAPI.inventory.getAll(params),
          itHelpdeskAPI.inventory.getStats ? itHelpdeskAPI.inventory.getStats().catch(() => null) : Promise.resolve(null),
        ]);

        const items = listRes.data || listRes;
        setData(Array.isArray(items) ? items : []);
        if (listRes.pagination) {
          setPagination(listRes.pagination);
        } else {
          setPagination({ page: pageParam, limit: limitParam, total: items.length, totalPages: 1 });
        }
        if (statsRes && statsRes.data) {
          setStats(statsRes.data);
        }
      } catch (err) {
        console.error("Failed to load inventory:", err);
        toast.error("Failed to load inventory data");
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, pageParam, limitParam, categoryParam, searchParam, updateQueryParams]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // KPI calculations
  const grandTotal = stats?.total ?? pagination.total ?? data.length;
  const totalOld = stats?.old ?? (activeTab === "old" ? (pagination.total || data.length) : 0);
  const totalNew = stats?.new ?? (activeTab === "new" ? (pagination.total || data.length) : 0);
  const activeWarrantyCount = stats?.activeWarranty ?? 0;

  const handleOpenAdd = () => {
    setEditId(null);
    setForm({
      ...EMPTY_FORM,
      inventory_type: activeTab === "old" ? "Old" : "New",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditId(item._id);
    setForm({
      item_id: item.item_id || "",
      brand: item.brand || "",
      model: item.model || "",
      category: item.category || "Computer",
      inventory_type: item.inventory_type || (activeTab === "old" ? "Old" : "New"),
      warranty_start_date: formatDateForInput(item.warranty_start_date),
      warranty_end_date: formatDateForInput(item.warranty_end_date),
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (
      !form.item_id.trim() ||
      !form.brand.trim() ||
      !form.model.trim() ||
      !form.category
    ) {
      toast.error("Please fill all required fields (Item ID, Brand, Model, Category)");
      return;
    }

    setSaving(true);
    const targetType = form.inventory_type || (activeTab === "old" ? "Old" : "New");
    const payload = {
      item_id: form.item_id.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      category: form.category,
      inventory_type: targetType,
      warranty_start_date: form.warranty_start_date ? new Date(form.warranty_start_date) : null,
      warranty_end_date: form.warranty_end_date ? new Date(form.warranty_end_date) : null,
    };

    try {
      if (editId) {
        await itHelpdeskAPI.inventory.update(editId, payload);
        if (typeof logUpdate === "function") {
          logUpdate(editId, `Updated inventory item: ${form.item_id}`);
        }
        toast.success("Inventory item updated");
      } else {
        await itHelpdeskAPI.inventory.create(payload);
        if (typeof logCreate === "function") {
          logCreate("new-item", `Created inventory item: ${form.item_id}`);
        }
        toast.success("Inventory item added");
      }

      setShowModal(false);
      setForm(EMPTY_FORM);
      updateQueryParams({ inventory_type: targetType, page: 1 });
      await fetchData();
    } catch (err) {
      console.error("Error saving inventory:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, id, itemId) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete item "${itemId}"?`)) return;

    try {
      await itHelpdeskAPI.inventory.remove(id);
      if (typeof logDelete === "function") {
        logDelete(id, `Deleted inventory item: ${itemId}`);
      }
      toast.success("Inventory item deleted");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete inventory item");
    }
  };

  const handleExportToExcel = async () => {
    setExporting(true);
    try {
      // Backend queries all inventory items directly from DB and streams binary .xlsx
      const response = await itHelpdeskAPI.inventory.export();

      if (response.data && response.data.type === "application/json") {
        const text = await response.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || "Failed to generate inventory report");
      }

      let fileName = `IT_Inventory_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const disposition = response.headers ? response.headers["content-disposition"] : null;
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          fileName = match[1];
        }
      }

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Inventory directory exported to Excel");
      logExport("inventory-export", "Exported complete inventory directory to Excel via backend generator");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(error.message || "Failed to export Excel");
    } finally {
      setExporting(false);
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
            <div className="topbar-title">Inventory &amp; Spares Management</div>
            <div className="topbar-breadcrumb" style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              IT Hardware Stock, Spare Components &amp; Warranty Tracking
            </div>
          </div>
        </div>

        <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportToExcel}
            disabled={exporting}
            style={{ opacity: exporting ? 0.7 : 1, cursor: exporting ? "not-allowed" : "pointer" }}
          >
            <Download size={15} /> <span>{exporting ? "Generating Excel..." : "Export Excel"}</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAdd}
          >
            <Plus size={15} /> <span>Add {activeTab === "old" ? "Old" : "New"} Item</span>
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
                  {grandTotal}
                </div>
                <div className="stat-lbl">Total Inventory</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#3b82f6" }}>
                  {totalOld}
                </div>
                <div className="stat-lbl">Old Inventory</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#10b981" }}>
                  {totalNew}
                </div>
                <div className="stat-lbl">New Stock</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#f59e0b" }}>
                  {activeWarrantyCount}
                </div>
                <div className="stat-lbl">Under Warranty</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs & Filter Bar ─────────────────────────────────────── */}
        <div className="card mb-16">
          <div className="card-body">
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px", marginBottom: "12px" }}>
              {/* Pill Segment Tabs */}
              <div style={{ display: "inline-flex", background: "#f1f5f9", padding: "4px", borderRadius: "10px", gap: "4px" }}>
                <button
                  type="button"
                  onClick={() => updateQueryParams({ inventory_type: "Old", page: 1 })}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    background: activeTab === "old" ? "#ffffff" : "transparent",
                    color: activeTab === "old" ? "#0f172a" : "#64748b",
                    fontWeight: activeTab === "old" ? 700 : 500,
                    fontSize: "13px",
                    cursor: "pointer",
                    boxShadow: activeTab === "old" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Package size={15} color={activeTab === "old" ? "#2563eb" : "#64748b"} />
                  Old Inventory
                  <span style={{ fontSize: "11px", fontWeight: 700, background: activeTab === "old" ? "#eff6ff" : "#e2e8f0", color: activeTab === "old" ? "#2563eb" : "#64748b", padding: "1px 6px", borderRadius: "10px" }}>
                    {totalOld}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => updateQueryParams({ inventory_type: "New", page: 1 })}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    background: activeTab === "new" ? "#ffffff" : "transparent",
                    color: activeTab === "new" ? "#0f172a" : "#64748b",
                    fontWeight: activeTab === "new" ? 700 : 500,
                    fontSize: "13px",
                    cursor: "pointer",
                    boxShadow: activeTab === "new" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Sparkles size={15} color={activeTab === "new" ? "#10b981" : "#64748b"} />
                  New Stock
                  <span style={{ fontSize: "11px", fontWeight: 700, background: activeTab === "new" ? "#ecfdf5" : "#e2e8f0", color: activeTab === "new" ? "#059669" : "#64748b", padding: "1px 6px", borderRadius: "10px" }}>
                    {totalNew}
                  </span>
                </button>
              </div>

              {/* Filters: Search Box + Category Dropdown + Clear Filters side-by-side */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  flexWrap: "nowrap",
                }}
              >
                <div style={{ position: "relative", width: "260px" }}>
                  <Search
                    size={15}
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search item, brand, model…"
                    value={searchInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchInput(val);
                      updateQueryParams({ search: val, page: 1 });
                    }}
                    style={{ paddingLeft: "32px", height: "38px", width: "100%" }}
                  />
                </div>

                <div style={{ width: "200px" }}>
                  <CustomSelect
                    value={categoryParam}
                    onChange={(val) => updateQueryParams({ category: val, page: 1 })}
                    options={[
                      { label: "All Categories", value: "" },
                      ...CATEGORIES.map((cat) => ({ label: cat, value: cat })),
                    ]}
                    placeholder="All Categories"
                    width="100%"
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearchInput("");
                    setSearchParams({ inventory_type: activeTab === "new" ? "New" : "Old", page: "1", limit: String(limitParam) });
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
                    padding: "0 14px",
                    whiteSpace: "nowrap",
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
              <HardDrive size={17} color="#059669" />
              {activeTab === "old" ? "Old Inventory Items" : "New Inventory Stock"}
            </div>

            <span style={{ fontSize: "12px", color: "#64748b", background: "#f1f5f9", padding: "4px 10px", borderRadius: "12px", fontWeight: 600 }}>
              Showing {data.length} of {pagination.total || 0} records
            </span>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                Loading inventory...
              </div>
            ) : (
              <div className="table-wrap">
                <table style={{ width: "100%", minWidth: "1150px" }}>
                  <thead>
                    <tr>
                      <th style={{ width: 44, minWidth: 44, textAlign: "center" }}>#</th>
                      <th style={{ minWidth: 140 }}>Item ID / Tag</th>
                      <th style={{ minWidth: 130 }}>Brand</th>
                      <th style={{ minWidth: 180 }}>Model</th>
                      <th style={{ minWidth: 130 }}>Category</th>
                      <th style={{ minWidth: 100 }}>Type</th>
                      <th style={{ minWidth: 120 }}>Warranty Start</th>
                      <th style={{ minWidth: 120 }}>Warranty End</th>
                      <th style={{ minWidth: 110, textAlign: "center" }}>Status</th>
                      <th style={{ width: 80, minWidth: 80, textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: "center", padding: "36px 16px", color: "#94a3b8" }}>
                          No {activeTab} inventory records found
                        </td>
                      </tr>
                    ) : (
                      data.map((item, idx) => {
                        const warranty = computeWarrantyStatus(item.warranty_end_date);

                        return (
                          <tr key={item._id} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd" }}>
                            <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>
                              {(pagination.page - 1) * pagination.limit + idx + 1}
                            </td>
                            <td className="fw-600" style={{ color: "#0f172a" }}>
                              {item.item_id}
                            </td>
                            <td style={{ color: "#334155" }}>{item.brand || "—"}</td>
                            <td style={{ color: "#475569" }}>{item.model || "—"}</td>
                            <td style={{ color: "#334155", fontSize: "13px", fontWeight: 500 }}>
                              {item.category || "—"}
                            </td>
                            <td style={{ color: "#334155", fontSize: "13px", fontWeight: 500 }}>
                              {item.inventory_type || (activeTab === "old" ? "Old" : "New")}
                            </td>
                            <td style={{ color: "#64748b", fontSize: "12.5px" }}>
                              {fmtDate(item.warranty_start_date)}
                            </td>
                            <td style={{ color: "#64748b", fontSize: "12.5px" }}>
                              {fmtDate(item.warranty_end_date)}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span className={`score-badge ${warranty.cls}`}>
                                {warranty.label}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                                <button
                                  type="button"
                                  className="btn btn-icon btn-primary"
                                  onClick={() => handleOpenEdit(item)}
                                  title="Edit Item"
                                  style={{ width: "28px", height: "28px" }}
                                >
                                  <Edit2 size={14} color="#4f46e5" />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-icon btn-danger"
                                  onClick={(e) => handleDelete(e, item._id, item.item_id)}
                                  title="Delete Item"
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
                maxWidth: "560px",
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
                    {editId ? "✏️ Edit Inventory Item" : `✨ Add ${form.inventory_type} Inventory Item`}
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                    Enter item specifications and warranty duration
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
                  <div className="form-field">
                    <label>Item ID / Asset Tag *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AST-00129"
                      value={form.item_id}
                      onChange={(e) => setForm({ ...form, item_id: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Inventory Type</label>
                    <select
                      value={form.inventory_type}
                      onChange={(e) => setForm({ ...form, inventory_type: e.target.value })}
                    >
                      <option value="Old">Old Inventory</option>
                      <option value="New">New Stock</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Brand *</label>
                    <input
                      type="text"
                      required
                      placeholder="Dell, HP, Lenovo…"
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Model *</label>
                    <input
                      type="text"
                      required
                      placeholder="OptiPlex 7090, ThinkPad E14…"
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                    />
                  </div>

                  <div className="form-field" style={{ gridColumn: "span 2" }}>
                    <label>Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Warranty Start Date</label>
                    <input
                      type="date"
                      value={form.warranty_start_date}
                      onChange={(e) => setForm({ ...form, warranty_start_date: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Warranty End Date</label>
                    <input
                      type="date"
                      value={form.warranty_end_date}
                      onChange={(e) => setForm({ ...form, warranty_end_date: e.target.value })}
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
                    {saving ? "Saving..." : editId ? "Update Item" : "Add to Inventory"}
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
