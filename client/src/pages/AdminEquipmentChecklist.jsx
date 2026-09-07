import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Upload,
  X,
} from "lucide-react";
import { equipmentChecklistAPI } from "../api/equipmentChecklistAPI";
import { UserContext } from "../contexts/UserContext";
import toast from "react-hot-toast";
import "../styles/scorecard.scss";

const EQUIPMENT_ITEMS = [
  { name: "Washroom", functionalChecks: ["OK", "Not OK"] },
  { name: "Water Dispenser / RO", functionalChecks: ["OK", "Not OK"] },
  { name: "Refrigerator / Microwave Oven", functionalChecks: ["OK", "Not OK"] },
  { name: "Biometric Device", functionalChecks: ["OK", "Not OK"] },
  { name: "Fire Extinguisher", functionalChecks: ["OK", "Not OK"] },
];

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmtDateTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getConditionBadgeClass = (condition) => {
  if (condition === "Good") return "badge-excellent";
  if (condition === "Fair") return "badge-good";
  if (condition === "Poor") return "badge-danger";
  return "badge-secondary";
};

export default function AdminEquipmentChecklist() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10 });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "All", "OK", "Repairs"
  const [loading, setLoading] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    totalCount: 0,
    allOkCount: 0,
    repairsCount: 0,
  });

  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLogId, setEditLogId] = useState(null);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetLog, setDeleteTargetLog] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [checkedBy, setCheckedBy] = useState(user?.username || "");
  const [checklistDate, setChecklistDate] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [formItems, setFormItems] = useState(
    EQUIPMENT_ITEMS.map((item) => ({
      equipmentName: item.name,
      assetId: "",
      location: "First Floor",
      condition: "Good",
      cleaningDone: "Yes",
      functionalCheck: item.functionalChecks[0],
      repairRequired: "No",
      amcVendor: "",
      remarks: "",
      image: null,
    }))
  );

  const fetchLogs = useCallback(
    async (page = 1, limit = pagination.limit) => {
      setLoading(true);
      try {
        const res = await equipmentChecklistAPI.getAll({
          search: searchQuery,
          page,
          limit,
        });
        if (res && res.success) {
          const list = res.data || [];
          const total = res.total || list.length;
          setLogs(list);
          setPagination({ total, page, limit });

          // Compute KPI counts
          const repairs = list.filter((l) =>
            l.items.some((i) => i.repairRequired === "Yes")
          ).length;
          const allOk = list.length - repairs;

          setStats({
            totalCount: total,
            allOkCount: allOk >= 0 ? allOk : 0,
            repairsCount: repairs,
          });
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load equipment checklist history");
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, pagination.limit]
  );

  useEffect(() => {
    fetchLogs(1, pagination.limit);
  }, [searchQuery]);

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
    fetchLogs(1, newLimit);
  };

  const handlePageChange = (newPage) => {
    const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;
    if (newPage < 1 || newPage > totalPages) return;
    setPagination((prev) => ({ ...prev, page: newPage }));
    fetchLogs(newPage, pagination.limit);
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

  const handleOpenAddDialog = () => {
    setModalMode("add");
    setEditLogId(null);
    setCheckedBy(user?.username || "");
    setChecklistDate(new Date().toISOString().substring(0, 10));
    setFormItems(
      EQUIPMENT_ITEMS.map((item) => ({
        equipmentName: item.name,
        assetId: "",
        location: "First Floor",
        condition: "Good",
        cleaningDone: "Yes",
        functionalCheck: item.functionalChecks[0],
        repairRequired: "No",
        amcVendor: "",
        remarks: "",
        image: null,
      }))
    );
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (log) => {
    setModalMode("edit");
    setEditLogId(log._id);
    setCheckedBy(log.checkedBy || user?.username || "");
    if (log.date) {
      setChecklistDate(new Date(log.date).toISOString().substring(0, 10));
    } else {
      setChecklistDate(new Date().toISOString().substring(0, 10));
    }

    // Merge existing items with default equipment list
    const itemsMap = new Map((log.items || []).map((i) => [i.equipmentName, i]));
    const mergedItems = EQUIPMENT_ITEMS.map((item) => {
      const existing = itemsMap.get(item.name);
      if (existing) {
        return {
          equipmentName: existing.equipmentName,
          assetId: existing.assetId || "",
          location: existing.location || "First Floor",
          condition: existing.condition || "Good",
          cleaningDone: existing.cleaningDone || "Yes",
          functionalCheck: existing.functionalCheck || item.functionalChecks[0],
          repairRequired: existing.repairRequired || "No",
          amcVendor: existing.amcVendor || "",
          remarks: existing.remarks || "",
          image: existing.image || null,
        };
      }
      return {
        equipmentName: item.name,
        assetId: "",
        location: "First Floor",
        condition: "Good",
        cleaningDone: "Yes",
        functionalCheck: item.functionalChecks[0],
        repairRequired: "No",
        amcVendor: "",
        remarks: "",
        image: null,
      };
    });

    setFormItems(mergedItems);
    setDialogOpen(true);
  };

  const handleItemChange = (index, field, value) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Convert Image to Base64
  const handleImageUpload = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        handleItemChange(index, "image", reader.result);
        toast.success("Image added successfully!");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleOpenImagePreview = (imageUrl) => {
    if (!imageUrl) {
      toast.error("No image uploaded for this item!");
      return;
    }
    setPreviewImageUrl(imageUrl);
    setImagePreviewOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkedBy.trim()) {
      toast.error("Please enter who checked the equipment");
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === "edit" && editLogId) {
        const res = await equipmentChecklistAPI.update(editLogId, {
          checkedBy: checkedBy.trim(),
          date: new Date(checklistDate),
          items: formItems,
        });
        if (res && res.success) {
          toast.success("Maintenance Checklist Updated Successfully!");
          setDialogOpen(false);
          fetchLogs(pagination.page);
        } else {
          toast.error(res?.message || "Failed to update checklist");
        }
      } else {
        const res = await equipmentChecklistAPI.create({
          checkedBy: checkedBy.trim(),
          date: new Date(checklistDate),
          items: formItems,
        });
        if (res && res.success) {
          toast.success("Maintenance Checklist Submitted!");
          setDialogOpen(false);
          fetchLogs(pagination.page);
        } else {
          toast.error(res?.message || "Failed to submit checklist");
        }
      }
    } catch (error) {
      console.error(error);
      const errMsg =
        error?.response?.data?.message ||
        (modalMode === "edit"
          ? "Failed to update checklist"
          : "Failed to submit checklist");
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestDelete = (e, log) => {
    e.stopPropagation();
    setDeleteTargetLog(log);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetLog?._id) return;
    setDeleting(true);
    try {
      const res = await equipmentChecklistAPI.remove(deleteTargetLog._id);
      if (res && res.success) {
        toast.success("Checklist entry deleted successfully");
        fetchLogs(pagination.page);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete checklist entry");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteTargetLog(null);
    }
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setViewDialogOpen(true);
  };

  // Filter logs by repair status if selected
  const displayedLogs = logs.filter((log) => {
    if (!statusFilter) return true;
    const hasRepair = log.items.some((item) => item.repairRequired === "Yes");
    if (statusFilter === "OK") return !hasRepair;
    if (statusFilter === "Repairs") return hasRepair;
    return true;
  });

  return (
    <>
      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <div className="topbar">
        <div className="topbar-left">
          <button
            className="btn btn-icon"
            onClick={() => navigate("/")}
            title="Back"
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
            }}
          >
            ←
          </button>
          <div>
            <div className="topbar-title">Admin Equipment Maintenance Checklist</div>
          </div>
        </div>
        <div className="topbar-right">
          <button
            className="btn btn-primary"
            onClick={handleOpenAddDialog}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Plus size={16} /> Add New Checklist
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* ── Stats Summary Cards ────────────────────────────────────── */}
        <div className="card mb-16">
          <div className="card-body">
            <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#4f46e5" }}>
                  {stats.totalCount}
                </div>
                <div className="stat-lbl">Total Submissions</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#10b981" }}>
                  {stats.allOkCount}
                </div>
                <div className="stat-lbl">All OK Checklists</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#f59e0b" }}>
                  {stats.repairsCount}
                </div>
                <div className="stat-lbl">Repairs Required</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filters Bar ────────────────────────────────────────────── */}
        <div className="card mb-16">
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <div className="form-field" style={{ flex: 2 }}>
                <label>Search</label>
                <input
                  type="text"
                  placeholder="Search by Checker name, equipment, asset ID…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Repair Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="OK">All OK</option>
                  <option value="Repairs">Repairs Required</option>
                </select>
              </div>
              <div className="form-field">
                <label style={{ visibility: "hidden" }}>Action</label>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("");
                  }}
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

        {/* ── Table Card ─────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📋 Equipment Maintenance Checklist History</div>
          </div>
          <div className="table-wrap">
            {loading ? (
              <div className="card-body text-muted">Loading…</div>
            ) : displayedLogs.length === 0 ? (
              <div className="card-body text-muted text-center" style={{ padding: "40px 0" }}>
                No checklist records found. Click 'Add New Checklist' to create one.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: "center", whiteSpace: "nowrap" }}>Srno</th>
                    <th style={{ minWidth: 120, whiteSpace: "nowrap" }}>Checklist Date</th>
                    <th style={{ minWidth: 160, whiteSpace: "nowrap" }}>Checked By</th>
                    <th style={{ textAlign: "center", whiteSpace: "nowrap", cursor: "default" }}>Total Equipment</th>
                    <th style={{ textAlign: "center", whiteSpace: "nowrap", cursor: "default" }}>Maintenance Status</th>
                    <th style={{ whiteSpace: "nowrap" }}>Created At</th>
                    <th style={{ width: 115, textAlign: "center", whiteSpace: "nowrap" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedLogs.map((log, idx) => {
                    const repairCount = log.items.filter((item) => item.repairRequired === "Yes").length;

                    return (
                      <tr key={log._id}>
                        <td className="text-muted" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          {(pagination.page - 1) * pagination.limit + idx + 1}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {fmtDate(log.date)}
                        </td>
                        <td className="fw-600" style={{ minWidth: 160 }}>
                          {log.checkedBy}
                        </td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap", cursor: "default", fontWeight: 600, color: "#334155" }}>
                          {log.items.length}
                        </td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap", cursor: "default" }}>
                          {repairCount > 0 ? (
                            <span style={{ color: "#d97706", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              <AlertTriangle size={15} color="#d97706" /> {repairCount} Equipment(s)
                            </span>
                          ) : (
                            <span style={{ color: "#16a34a", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              <CheckCircle size={15} color="#16a34a" /> All OK
                            </span>
                          )}
                        </td>
                        <td className="text-muted" style={{ whiteSpace: "nowrap" }}>
                          {fmtDateTime(log.createdAt)}
                        </td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "center" }}>
                            {/* 1. View Details (Eye) */}
                            <button
                              type="button"
                              className="btn btn-icon btn-info"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(log);
                              }}
                              title="View Details"
                              style={{ width: "28px", height: "28px" }}
                            >
                              <Eye size={14} color="#0284c7" />
                            </button>

                            {/* 2. Edit Record (Edit2) */}
                            <button
                              type="button"
                              className="btn btn-icon btn-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditDialog(log);
                              }}
                              title="Edit Checklist"
                              style={{ width: "28px", height: "28px" }}
                            >
                              <Edit2 size={14} color="#4f46e5" />
                            </button>

                            {/* 3. Delete Record (Trash2) */}
                            <button
                              type="button"
                              className="btn btn-icon btn-danger"
                              onClick={(e) => handleRequestDelete(e, log)}
                              title="Delete Checklist"
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
              <div style={{ display: "center", alignItems: "center", gap: "8px" }}>
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
      {viewDialogOpen && selectedLog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setViewDialogOpen(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "18px",
              width: "96vw",
              maxWidth: 1650,
              maxHeight: "94vh",
              boxShadow: "0 25px 70px -15px rgba(15, 23, 42, 0.35)",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 28px",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "8px",
                    background: "rgba(56, 189, 248, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Eye size={18} color="#38bdf8" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#ffffff" }}>
                    Equipment Maintenance Checklist Details
                  </h3>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                    Inspection Record — {fmtDate(selectedLog.date)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewDialogOpen(false)}
                style={{
                  border: "none",
                  background: "rgba(255, 255, 255, 0.1)",
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  cursor: "pointer",
                  color: "#e2e8f0",
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "18px 24px", overflowY: "auto", flexGrow: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Compact 4-Card Metadata Strip */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "12px",
                }}
              >
                <div style={{ background: "#f8fafc", padding: "10px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>📅 Checklist Date</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginTop: "3px" }}>{fmtDate(selectedLog.date)}</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "10px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>👤 Checked By</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginTop: "3px", wordBreak: "break-word" }}>{selectedLog.checkedBy}</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "10px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>🏢 Equipment Scope</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginTop: "3px" }}>{selectedLog.items.length} Items Inspected</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "10px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>🚦 Overall Status</div>
                  <div style={{ marginTop: "4px" }}>
                    {selectedLog.items.filter((i) => i.repairRequired === "Yes").length > 0 ? (
                      <span style={{ color: "#d97706", fontWeight: 700, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        <AlertTriangle size={15} color="#d97706" /> {selectedLog.items.filter((i) => i.repairRequired === "Yes").length} Device(s) Need Repair
                      </span>
                    ) : (
                      <span style={{ color: "#16a34a", fontWeight: 700, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        <CheckCircle size={15} color="#16a34a" /> All Equipment OK
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Breakdown Wide Table */}
              <div
                className="table-wrap"
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  overflowX: "auto",
                  maxHeight: "56vh",
                }}
              >
                <table style={{ width: "100%" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#f8fafc" }}>
                    <tr>
                      <th style={{ width: 36, textAlign: "center", whiteSpace: "nowrap", padding: "8px 6px" }}>#</th>
                      <th style={{ minWidth: 135, whiteSpace: "nowrap", padding: "8px 8px" }}>Equipment Name</th>
                      <th style={{ minWidth: 85, whiteSpace: "nowrap", padding: "8px 8px" }}>Asset ID</th>
                      <th style={{ minWidth: 105, whiteSpace: "nowrap", padding: "8px 8px" }}>Location</th>
                      <th style={{ minWidth: 80, textAlign: "center", whiteSpace: "nowrap", padding: "8px 6px" }}>Condition</th>
                      <th style={{ minWidth: 75, textAlign: "center", whiteSpace: "nowrap", padding: "8px 6px" }}>Cleaning</th>
                      <th style={{ minWidth: 85, textAlign: "center", whiteSpace: "nowrap", padding: "8px 6px" }}>Functionality</th>
                      <th style={{ minWidth: 80, textAlign: "center", whiteSpace: "nowrap", padding: "8px 6px" }}>Repair Req.</th>
                      <th style={{ minWidth: 150, padding: "8px 8px" }}>AMC Vendor</th>
                      <th style={{ minWidth: 230, padding: "8px 8px" }}>Remarks & Notes</th>
                      <th style={{ width: 55, textAlign: "center", whiteSpace: "nowrap", padding: "8px 6px" }}>Photo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLog.items.map((item, idx) => (
                      <tr
                        key={item.equipmentName}
                        style={{
                          backgroundColor: item.repairRequired === "Yes" ? "#fffbeb" : idx % 2 === 0 ? "#ffffff" : "#fafbfc",
                        }}
                      >
                        <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600, verticalAlign: "middle" }}>{idx + 1}</td>
                        <td className="fw-600" style={{ color: "#0f172a", verticalAlign: "middle" }}>{item.equipmentName}</td>
                        <td style={{ color: "#475569", verticalAlign: "middle" }}>{item.assetId || "—"}</td>
                        <td style={{ verticalAlign: "middle" }}>{item.location || "—"}</td>
                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                          <span className={`score-badge ${getConditionBadgeClass(item.condition)}`}>
                            {item.condition || "—"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                          <span
                            className={`score-badge ${
                              item.cleaningDone === "Yes" ? "badge-excellent" : "badge-warning"
                            }`}
                          >
                            {item.cleaningDone || "—"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                          <span
                            className={`score-badge ${
                              item.functionalCheck === "OK" ? "badge-excellent" : "badge-danger"
                            }`}
                          >
                            {item.functionalCheck || "—"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                          <span
                            className={`score-badge ${
                              item.repairRequired === "Yes" ? "badge-danger" : "badge-excellent"
                            }`}
                          >
                            {item.repairRequired || "—"}
                          </span>
                        </td>
                        <td style={{ color: "#334155", fontSize: "13px", lineHeight: 1.45, wordBreak: "break-word", whiteSpace: "pre-wrap", verticalAlign: "middle" }}>
                          {item.amcVendor || "—"}
                        </td>
                        <td style={{ fontSize: "13px", color: "#334155", lineHeight: 1.45, wordBreak: "break-word", whiteSpace: "pre-wrap", verticalAlign: "middle" }}>
                          {item.remarks ? (
                            <div
                              style={{
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "6px",
                                padding: "6px 10px",
                                wordBreak: "break-word",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {item.remarks}
                            </div>
                          ) : (
                            <span style={{ color: "#cbd5e1" }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                          {item.image ? (
                            <img
                              src={item.image}
                              alt="Inspection thumbnail"
                              onClick={() => handleOpenImagePreview(item.image)}
                              title="Click to preview full photo"
                              style={{
                                width: "38px",
                                height: "38px",
                                objectFit: "cover",
                                borderRadius: "7px",
                                border: "1.5px solid #6366f1",
                                cursor: "pointer",
                                boxShadow: "0 1px 4px rgba(99, 102, 241, 0.2)",
                                transition: "transform 0.15s ease",
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                              onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                            />
                          ) : (
                            <span style={{ color: "#cbd5e1", fontSize: "12px" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "14px 28px",
                borderTop: "1px solid #f1f5f9",
                background: "#fafbfc",
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <button
                className="btn"
                style={{
                  fontSize: "13.5px",
                  padding: "8px 24px",
                  fontWeight: 600,
                  color: "#334155",
                }}
                onClick={() => setViewDialogOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Checklist Modal ───────────────────────────────── */}
      {dialogOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setDialogOpen(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "18px",
              width: "96vw",
              maxWidth: 1650,
              boxShadow: "0 25px 70px -15px rgba(15, 23, 42, 0.35)",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
              maxHeight: "94vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 28px",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "8px",
                    background: modalMode === "edit" ? "rgba(79, 70, 229, 0.2)" : "rgba(16, 185, 129, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {modalMode === "edit" ? <Edit2 size={18} color="#818cf8" /> : <Plus size={18} color="#34d399" />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#ffffff" }}>
                    {modalMode === "edit"
                      ? "Edit Admin Equipment Maintenance Checklist"
                      : "New Admin Equipment Maintenance Checklist"}
                  </h3>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                    {modalMode === "edit" ? "Modify inspection line-items and remarks" : "Submit routine facilities inspection"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                style={{
                  border: "none",
                  background: "rgba(255, 255, 255, 0.1)",
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  cursor: "pointer",
                  color: "#e2e8f0",
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "18px 24px", overflowY: "auto", flexGrow: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Header Info Section */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "18px",
                  background: "#f8fafc",
                  padding: "14px 20px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px", display: "block", textTransform: "uppercase" }}>
                    👤 Checked By *
                  </label>
                  <input
                    type="text"
                    value={checkedBy}
                    onChange={(e) => setCheckedBy(e.target.value)}
                    placeholder="Enter inspector / auditor name"
                    required
                    style={{
                      width: "100%",
                      height: "38px",
                      padding: "0 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontSize: "13.5px",
                      fontWeight: 500,
                      color: "#0f172a",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "all 0.15s ease",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px", display: "block", textTransform: "uppercase" }}>
                    📅 Inspection Date *
                  </label>
                  <input
                    type="date"
                    value={checklistDate}
                    onChange={(e) => setChecklistDate(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      height: "38px",
                      padding: "0 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontSize: "13.5px",
                      fontWeight: 500,
                      color: "#0f172a",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "all 0.15s ease",
                    }}
                  />
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div
                className="table-wrap"
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  overflowX: "auto",
                  maxHeight: "56vh",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#f8fafc" }}>
                    <tr>
                      <th style={{ width: 36, textAlign: "center", whiteSpace: "nowrap", padding: "10px 8px" }}>#</th>
                      <th style={{ minWidth: 140, whiteSpace: "nowrap", padding: "10px 10px" }}>Equipment Name</th>
                      <th style={{ minWidth: 95, whiteSpace: "nowrap", padding: "10px 8px" }}>Asset ID</th>
                      <th style={{ minWidth: 120, whiteSpace: "nowrap", padding: "10px 8px" }}>Location</th>
                      <th style={{ minWidth: 90, textAlign: "center", whiteSpace: "nowrap", padding: "10px 8px" }}>Condition</th>
                      <th style={{ minWidth: 80, textAlign: "center", whiteSpace: "nowrap", padding: "10px 8px" }}>Cleaning</th>
                      <th style={{ minWidth: 90, textAlign: "center", whiteSpace: "nowrap", padding: "10px 8px" }}>Functional</th>
                      <th style={{ minWidth: 90, textAlign: "center", whiteSpace: "nowrap", padding: "10px 8px" }}>Repair Req.</th>
                      <th style={{ minWidth: 160, padding: "10px 8px" }}>AMC Vendor</th>
                      <th style={{ minWidth: 240, padding: "10px 10px" }}>Remarks & Notes</th>
                      <th style={{ width: 65, textAlign: "center", whiteSpace: "nowrap", padding: "10px 8px" }}>Photo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formItems.map((item, idx) => {
                      const matchingConf = EQUIPMENT_ITEMS.find((c) => c.name === item.equipmentName);

                      const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 8px center`;

                      const inputBaseStyle = {
                        width: "100%",
                        height: "36px",
                        padding: "0 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: "13px",
                        color: "#0f172a",
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "all 0.15s ease",
                      };

                      const selectBaseStyle = {
                        width: "100%",
                        height: "36px",
                        padding: "0 24px 0 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        background: `#ffffff ${selectChevron}`,
                        appearance: "none",
                        WebkitAppearance: "none",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#1e293b",
                        outline: "none",
                        cursor: "pointer",
                        boxSizing: "border-box",
                        transition: "all 0.15s ease",
                      };

                      const textareaBaseStyle = {
                        width: "100%",
                        minHeight: "44px",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: "12.5px",
                        lineHeight: "1.4",
                        color: "#0f172a",
                        outline: "none",
                        boxSizing: "border-box",
                        resize: "vertical",
                        fontFamily: "inherit",
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap",
                        transition: "all 0.15s ease",
                      };

                      return (
                        <tr
                          key={item.equipmentName}
                          style={{
                            backgroundColor: item.repairRequired === "Yes" ? "#fffbeb" : idx % 2 === 0 ? "#ffffff" : "#fcfdfd",
                          }}
                        >
                          <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600, padding: "8px 8px", verticalAlign: "middle" }}>{idx + 1}</td>
                          <td className="fw-600" style={{ color: "#0f172a", whiteSpace: "nowrap", padding: "8px 10px", verticalAlign: "middle" }}>
                            {item.equipmentName}
                          </td>
                          <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                            <input
                              type="text"
                              value={item.assetId}
                              onChange={(e) => handleItemChange(idx, "assetId", e.target.value)}
                              placeholder="Asset ID"
                              style={inputBaseStyle}
                            />
                          </td>
                          <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                            <select
                              value={item.location}
                              onChange={(e) => handleItemChange(idx, "location", e.target.value)}
                              style={selectBaseStyle}
                            >
                              <option value="First Floor">First Floor</option>
                              <option value="Second Floor">Second Floor</option>
                              <option value="Ground Floor">Ground Floor</option>
                              <option value="Server Room">Server Room</option>
                              <option value="Entire Premises">Entire Premises</option>
                            </select>
                          </td>
                          <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                            <select
                              value={item.condition}
                              onChange={(e) => handleItemChange(idx, "condition", e.target.value)}
                              style={selectBaseStyle}
                            >
                              <option value="Good">Good</option>
                              <option value="Fair">Fair</option>
                              <option value="Poor">Poor</option>
                            </select>
                          </td>
                          <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                            <select
                              value={item.cleaningDone}
                              onChange={(e) => handleItemChange(idx, "cleaningDone", e.target.value)}
                              style={selectBaseStyle}
                            >
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </td>
                          <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                            <select
                              value={item.functionalCheck}
                              onChange={(e) => handleItemChange(idx, "functionalCheck", e.target.value)}
                              style={selectBaseStyle}
                            >
                              {matchingConf?.functionalChecks.map((chk) => (
                                <option key={chk} value={chk}>
                                  {chk}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                            <select
                              value={item.repairRequired}
                              onChange={(e) => handleItemChange(idx, "repairRequired", e.target.value)}
                              style={{
                                ...selectBaseStyle,
                                color: item.repairRequired === "Yes" ? "#dc2626" : "#1e293b",
                                fontWeight: item.repairRequired === "Yes" ? 700 : 500,
                              }}
                            >
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                            </select>
                          </td>
                          <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                            <textarea
                              rows={2}
                              value={item.amcVendor}
                              onChange={(e) => handleItemChange(idx, "amcVendor", e.target.value)}
                              placeholder="Vendor details…"
                              style={textareaBaseStyle}
                            />
                          </td>
                          <td style={{ padding: "8px 8px", verticalAlign: "middle" }}>
                            <textarea
                              rows={2}
                              value={item.remarks}
                              onChange={(e) => handleItemChange(idx, "remarks", e.target.value)}
                              placeholder="Notes & observations…"
                              style={textareaBaseStyle}
                            />
                          </td>
                          <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "middle" }}>
                            {!item.image ? (
                              <label
                                title="Upload Inspection Photo"
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  background: "#f8fafc",
                                  border: "1px dashed #cbd5e1",
                                  color: "#64748b",
                                  borderRadius: "6px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  margin: 0,
                                  userSelect: "none",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.background = "#eff6ff";
                                  e.currentTarget.style.borderColor = "#3b82f6";
                                  e.currentTarget.style.color = "#3b82f6";
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.background = "#f8fafc";
                                  e.currentTarget.style.borderColor = "#cbd5e1";
                                  e.currentTarget.style.color = "#64748b";
                                }}
                              >
                                <Upload size={15} />
                                <input
                                  type="file"
                                  hidden
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(idx, e)}
                                />
                              </label>
                            ) : (
                              <div
                                style={{
                                  position: "relative",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  margin: "0 auto",
                                }}
                              >
                                <img
                                  src={item.image}
                                  alt="Inspection thumbnail"
                                  onClick={() => handleOpenImagePreview(item.image)}
                                  title="Click to preview photo"
                                  style={{
                                    width: "36px",
                                    height: "36px",
                                    objectFit: "cover",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    cursor: "pointer",
                                    transition: "transform 0.15s ease",
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.transform = "scale(1.08)";
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.transform = "scale(1)";
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleItemChange(idx, "image", null);
                                  }}
                                  title="Remove photo"
                                  style={{
                                    position: "absolute",
                                    top: "-5px",
                                    right: "-5px",
                                    width: "16px",
                                    height: "16px",
                                    borderRadius: "50%",
                                    background: "#ef4444",
                                    border: "1.5px solid #ffffff",
                                    color: "#ffffff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    padding: 0,
                                    zIndex: 2,
                                  }}
                                >
                                  <X size={11} strokeWidth={3} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #f1f5f9",
                background: "#fafbfc",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                flexShrink: 0,
              }}
            >
              <button className="btn" onClick={() => setDialogOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? "Saving…"
                  : modalMode === "edit"
                  ? "Update Checklist"
                  : "Submit Checklist"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen Image Preview Modal ─────────────────────────── */}
      {imagePreviewOpen && previewImageUrl && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
          onClick={() => setImagePreviewOpen(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "16px",
              maxWidth: "90vw",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                Equipment Inspection Photo Preview
              </h4>
              <button
                type="button"
                onClick={() => setImagePreviewOpen(false)}
                style={{
                  border: "none",
                  background: "rgba(15, 23, 42, 0.08)",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "15px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  color: "#0f172a",
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(15, 23, 42, 0.16)";
                  e.currentTarget.style.color = "#000000";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "rgba(15, 23, 42, 0.08)";
                  e.currentTarget.style.color = "#0f172a";
                }}
              >
                ✕
              </button>
            </div>
            <img
              src={previewImageUrl}
              alt="Equipment Preview"
              style={{
                maxWidth: "85vw",
                maxHeight: "78vh",
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />
          </div>
        </div>
      )}

      {/* ── Confirmation Delete Modal ───────────────────────────────── */}
      {deleteDialogOpen && deleteTargetLog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10002,
            padding: "20px",
          }}
          onClick={() => {
            if (!deleting) setDeleteDialogOpen(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "420px",
              maxWidth: "92vw",
              boxShadow: "0 25px 60px -15px rgba(15, 23, 42, 0.35)",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              textAlign: "center",
              padding: "26px 24px 22px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning Icon Badge */}
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#fef2f2",
                border: "1px solid #fee2e2",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
              }}
            >
              <Trash2 size={26} color="#ef4444" />
            </div>

            <h3 style={{ margin: "16px 0 6px", fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
              Delete Checklist Entry?
            </h3>

            <p style={{ margin: "0 0 22px", fontSize: "13.5px", color: "#64748b", lineHeight: 1.5 }}>
              Are you sure you want to delete the inspection record for{" "}
              <b style={{ color: "#0f172a" }}>{fmtDate(deleteTargetLog.date)}</b> by{" "}
              <b style={{ color: "#0f172a" }}>{deleteTargetLog.checkedBy}</b>? This action cannot be undone.
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                className="btn"
                style={{
                  flex: 1,
                  height: "40px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  color: "#475569",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  cursor: "pointer",
                }}
                disabled={deleting}
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{
                  flex: 1,
                  height: "40px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  borderRadius: "8px",
                  background: "#ef4444",
                  borderColor: "#ef4444",
                  color: "#ffffff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
                disabled={deleting}
                onClick={handleConfirmDelete}
              >
                {deleting ? (
                  "Deleting…"
                ) : (
                  <>
                    <Trash2 size={15} /> Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
