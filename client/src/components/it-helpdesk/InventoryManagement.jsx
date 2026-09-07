import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import { useModuleAuditLogs } from "./AuditLogs";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
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
  const { logCreate, logUpdate, logDelete } = useModuleAuditLogs("Inventory");

  const [activeTab, setActiveTab] = useState("old"); // "old" | "new"
  const [oldData, setOldData] = useState([]);
  const [newData, setNewData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return isNaN(date) ? "" : date.toISOString().split("T")[0];
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [oldRes, newRes] = await Promise.all([
        itHelpdeskAPI.inventory.getAll({ inventory_type: "Old" }),
        itHelpdeskAPI.inventory.getAll({ inventory_type: "New" }),
      ]);
      setOldData(oldRes.data || []);
      setNewData(newRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentDataset = activeTab === "old" ? oldData : newData;

  const filteredData = currentDataset.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (item.item_id || "").toLowerCase().includes(term) ||
      (item.brand || "").toLowerCase().includes(term) ||
      (item.model || "").toLowerCase().includes(term) ||
      (item.category || "").toLowerCase().includes(term);

    const matchesCategory = !categoryFilter || item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // KPI calculations
  const totalOld = oldData.length;
  const totalNew = newData.length;
  const grandTotal = totalOld + totalNew;
  const activeWarrantyCount = [...oldData, ...newData].filter(
    (item) => item.warranty_end_date && new Date(item.warranty_end_date) > new Date()
  ).length;

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredData.length / limit));
  const displayedRows = filteredData.slice((page - 1) * limit, page * limit);

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
      !form.category ||
      !form.warranty_start_date ||
      !form.warranty_end_date
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    const payload = {
      item_id: form.item_id.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      category: form.category,
      inventory_type: form.inventory_type,
      warranty_start_date: new Date(form.warranty_start_date),
      warranty_end_date: new Date(form.warranty_end_date),
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
      fetchData();
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

  const handleExportToExcel = () => {
    try {
      const excelData = currentDataset.map((item, index) => ({
        "Sr. No.": index + 1,
        "Item ID / Serial": item.item_id || "",
        "Brand": item.brand || "",
        "Model": item.model || "",
        "Category": item.category || "",
        "Inventory Type": item.inventory_type || "",
        "Warranty Start": item.warranty_start_date ? formatDateForInput(item.warranty_start_date) : "—",
        "Warranty End": item.warranty_end_date ? formatDateForInput(item.warranty_end_date) : "—",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, `${activeTab === "old" ? "Old" : "New"} Inventory`);

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `IT_Inventory_${activeTab.toUpperCase()}_${date}.xlsx`);
      toast.success("Inventory exported to Excel");
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
            <div className="topbar-title">Inventory &amp; Spares Management</div>
            <div className="topbar-breadcrumb" style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              IT Hardware Stock, Spare Components &amp; Warranty Tracking
            </div>
          </div>
        </div>

        <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="btn"
            onClick={handleExportToExcel}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#0f172a",
              fontWeight: 600,
              fontSize: "13px",
              padding: "7px 14px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            <Download size={15} color="#059669" /> Export Excel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAdd}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              padding: "7px 16px",
              borderRadius: "8px",
              fontWeight: 600,
            }}
          >
            <Plus size={15} /> Add {activeTab === "old" ? "Old" : "New"} Item
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
                  onClick={() => {
                    setActiveTab("old");
                    setPage(1);
                  }}
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
                  onClick={() => {
                    setActiveTab("new");
                    setPage(1);
                  }}
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

              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", minWidth: "220px" }}>
                  <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    placeholder="Search item, brand, model…"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    style={{
                      paddingLeft: "32px",
                      height: "36px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      fontSize: "13px",
                      width: "100%",
                      outline: "none",
                    }}
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    height: "36px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "13px",
                    padding: "0 10px",
                    fontWeight: 500,
                    color: "#0f172a",
                    outline: "none",
                  }}
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {(searchTerm || categoryFilter) && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setSearchTerm("");
                      setCategoryFilter("");
                      setPage(1);
                    }}
                    style={{ height: "36px", fontSize: "12px", fontWeight: 600, padding: "0 10px" }}
                  >
                    Clear
                  </button>
                )}
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
              Showing {displayedRows.length} of {filteredData.length} records
            </span>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                Loading inventory...
              </div>
            ) : (
              <div className="table-wrap">
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ width: 44, textAlign: "center" }}>#</th>
                      <th style={{ minWidth: 130 }}>Item ID / Tag</th>
                      <th style={{ minWidth: 120 }}>Brand</th>
                      <th style={{ minWidth: 130 }}>Model</th>
                      <th style={{ minWidth: 120 }}>Category</th>
                      <th style={{ minWidth: 100 }}>Type</th>
                      <th style={{ minWidth: 110 }}>Warranty Start</th>
                      <th style={{ minWidth: 110 }}>Warranty End</th>
                      <th style={{ minWidth: 100, textAlign: "center" }}>Status</th>
                      <th style={{ width: 80, textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: "center", padding: "36px 16px", color: "#94a3b8" }}>
                          No {activeTab} inventory records found
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((item, idx) => {
                        const warranty = computeWarrantyStatus(item.warranty_end_date);

                        return (
                          <tr key={item._id} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd" }}>
                            <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>
                              {(page - 1) * limit + idx + 1}
                            </td>
                            <td className="fw-600" style={{ color: "#0f172a" }}>
                              {item.item_id}
                            </td>
                            <td style={{ color: "#334155" }}>{item.brand || "—"}</td>
                            <td style={{ color: "#475569" }}>{item.model || "—"}</td>
                            <td>
                              <span className="score-badge badge-primary">
                                {item.category || "Other"}
                              </span>
                            </td>
                            <td>
                              <span className={`score-badge ${item.inventory_type === "New" ? "badge-excellent" : "badge-secondary"}`}>
                                {item.inventory_type || "Old"}
                              </span>
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
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    background: "rgba(79, 70, 229, 0.1)",
                                    border: "none",
                                  }}
                                >
                                  <Edit2 size={13} color="#4f46e5" />
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
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>Show</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  {[10, 15, 25, 50].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>entries per page</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    padding: "5px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    opacity: page <= 1 ? 0.5 : 1,
                  }}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span style={{ fontSize: "13px", color: "#475569", fontWeight: 600, padding: "0 8px" }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    padding: "5px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    opacity: page >= totalPages ? 0.5 : 1,
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
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
                    <label>Warranty Start Date *</label>
                    <input
                      type="date"
                      required
                      value={form.warranty_start_date}
                      onChange={(e) => setForm({ ...form, warranty_start_date: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Warranty End Date *</label>
                    <input
                      type="date"
                      required
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
                    gap: "10px",
                    marginTop: "20px",
                    paddingTop: "14px",
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                    style={{ fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                    style={{ fontWeight: 600 }}
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
