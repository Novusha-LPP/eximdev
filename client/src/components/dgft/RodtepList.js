import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import "./dgft.scss";

// Sort icon helper
function SortIcon({ dir }) {
  return (
    <span className="ar-sort-icon">
      {dir === "asc" ? "↑" : dir === "desc" ? "↓" : "↕"}
    </span>
  );
}

// Toast helper
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (toast.open) {
      const t = setTimeout(() => onClose(), 4000);
      return () => clearTimeout(t);
    }
  }, [toast.open, onClose]);
  if (!toast.open) return null;
  return (
    <div className={`dgft-toast ${toast.severity}`}>
      {toast.message}
      <button onClick={onClose}>✕</button>
    </div>
  );
}

const INITIAL_FORM = {
  rodtep: "",
  issue_date: "",
  expiry_date: "",
  value_inr: "",
  iec_code: "",
};

const DATE_FIELDS = new Set(["issue_date", "expiry_date"]);
const ROWS_PER_PAGE_OPTIONS = [25, 50, 100];

const TABLE_COLUMNS = [
  { key: "sr_no",          label: "SR NO",           width: 80 },
  { key: "rodtep",         label: "RODTEP NO",       width: 180 },
  { key: "issue_date",     label: "ISSUE DATE",      width: 120 },
  { key: "expiry_date",    label: "EXPIRY DATE",     width: 120 },
  { key: "value_inr",      label: "VALUE INR",       width: 150 },
  { key: "utilized_amount",label: "UTILIZED INR",    width: 150 },
  { key: "balance_amount", label: "BALANCE INR",     width: 150 },
  { key: "iec_code",       label: "IEC CODE",        width: 150 },
  { key: "_actions",       label: "ACTIONS",         width: 130 },
];

const FIELDS = [
  { key: "rodtep",      label: "RODTEP Certificate No", required: true },
  { key: "issue_date",  label: "Issue Date", type: "date" },
  { key: "expiry_date", label: "Expiry Date", type: "date" },
  { key: "value_inr",   label: "Value in INR", type: "number", required: true },
  { key: "iec_code",    label: "IEC Code", required: true },
];

const formatDateToDdMmYyyy = (val) => {
  if (!val) return "";
  const raw = String(val).trim();
  if (!raw) return "";

  // Match YYYY-MM-DD
  const matchYmd = raw.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})$/);
  if (matchYmd) {
    return `${matchYmd[3]}-${matchYmd[2]}-${matchYmd[1]}`;
  }

  // Match DD/MM/YYYY
  const matchDmy = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (matchDmy) {
    const dd = matchDmy[1].padStart(2, "0");
    const mm = matchDmy[2].padStart(2, "0");
    const yyyy = matchDmy[3].length === 2 ? "20" + matchDmy[3] : matchDmy[3];
    return `${dd}-${mm}-${yyyy}`;
  }

  return raw;
};

const toNativeDate = (val) => {
  if (!val || typeof val !== "string") return val;
  if (val.includes("-")) return val; // Already YYYY-MM-DD
  const parts = val.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return val;
};

export default function RodtepList({ onCountChange }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: null, dir: null });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Utilization Modal states
  const [utilizationModalOpen, setUtilizationModalOpen] = useState(false);
  const [utilizationRows, setUtilizationRows] = useState([]);
  const [selectedRodtepNo, setSelectedRodtepNo] = useState("");
  const [utilizationLoading, setUtilizationLoading] = useState(false);

  const containerRef = useRef(null);

  const showToast = (message, severity) => setToast({ open: true, message, severity });

  const getData = useCallback(async () => {
    try {
      const api = process.env.REACT_APP_API_STRING;
      const res = await axios.get(`${api}/get-rodteps`);
      const sorted = res.data.sort((a, b) => (Number(a.sr_no) || 0) - (Number(b.sr_no) || 0));
      setRows(sorted);
      if (onCountChange) onCountChange(sorted.length);
    } catch (err) {
      console.error("Error fetching RODTEPs:", err);
      showToast("Error fetching RODTEP data", "error");
    }
  }, [onCountChange]);

  useEffect(() => {
    getData();
  }, [getData]);

  const validate = () => {
    const errs = {};
    if (!formData.rodtep || !formData.rodtep.trim()) errs.rodtep = "RODTEP number is required";
    if (!formData.value_inr || isNaN(formData.value_inr) || Number(formData.value_inr) <= 0) {
      errs.value_inr = "Valid value in INR is required";
    }
    if (!formData.iec_code || !formData.iec_code.trim()) errs.iec_code = "IEC code is required";

    DATE_FIELDS.forEach((key) => {
      const val = formData[key];
      if (val && val.trim() && isNaN(Date.parse(val))) errs[key] = "Invalid date";
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleOpenAdd = () => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setErrors({});
    setDialogOpen(true);
  };

  const handleOpenEdit = (row) => {
    setEditingId(row._id);
    const data = { ...INITIAL_FORM, ...row };
    Object.keys(data).forEach((key) => {
      if (DATE_FIELDS.has(key) && data[key]) {
        data[key] = toNativeDate(data[key]);
      }
    });
    setFormData(data);
    setErrors({});
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this RODTEP record?")) return;
    try {
      const api = process.env.REACT_APP_API_STRING;
      await axios.delete(`${api}/delete-rodtep/${id}`);
      showToast("RODTEP record deleted successfully", "success");
      getData();
    } catch (err) {
      console.error(err);
      showToast("Delete failed", "error");
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const api = process.env.REACT_APP_API_STRING;
      // Convert dates to DD/MM/YYYY for consistency in storage
      const payload = { ...formData };
      DATE_FIELDS.forEach((key) => {
        if (payload[key]) {
          const parts = payload[key].split("-");
          if (parts.length === 3) {
            payload[key] = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
        }
      });

      if (editingId) {
        await axios.put(`${api}/update-rodtep/${editingId}`, payload);
        showToast("RODTEP record updated successfully", "success");
      } else {
        await axios.post(`${api}/add-rodtep`, payload);
        showToast("RODTEP record added successfully", "success");
      }
      setDialogOpen(false);
      getData();
    } catch (err) {
      console.error(err);
      showToast("Operation failed", "error");
    }
  };

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSort = (key) => {
    setSort((prev) => ({
      key,
      dir: prev.key === key ? (prev.dir === "asc" ? "desc" : "asc") : "asc",
    }));
  };

  const handleOpenUtilization = async (rodtepNo) => {
    setSelectedRodtepNo(rodtepNo);
    setUtilizationRows([]);
    setUtilizationLoading(true);
    setUtilizationModalOpen(true);
    try {
      const api = process.env.REACT_APP_API_STRING;
      const res = await axios.get(`${api}/get-rodtep-utilization?rodtep=${rodtepNo}`);
      setUtilizationRows(res.data || []);
    } catch (err) {
      console.error("Error fetching RODTEP utilization details:", err);
      showToast("Error loading utilization details", "error");
    } finally {
      setUtilizationLoading(false);
    }
  };

  // Filter + Sort Logic
  const displayed = useMemo(() => {
    let result = rows.filter((row) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          String(row.rodtep || "").toLowerCase().includes(q) ||
          String(row.iec_code || "").toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sort.key) {
      result = [...result].sort((a, b) => {
        let va = a[sort.key];
        let vb = b[sort.key];

        if (sort.key === "sr_no" || sort.key === "value_inr" || sort.key === "utilized_amount" || sort.key === "balance_amount") {
          va = Number(va) || 0;
          vb = Number(vb) || 0;
          return sort.dir === "asc" ? va - vb : vb - va;
        }

        va = String(va || "").toLowerCase();
        vb = String(vb || "").toLowerCase();
        return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }

    return result;
  }, [rows, search, sort]);

  const totalPages = Math.ceil(displayed.length / rowsPerPage) || 1;
  const paginatedRows = displayed.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  useEffect(() => {
    setPage(0);
  }, [search]);

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="ar-toolbar">
        <div className="ar-toolbar-left">
          <div className="ar-search-wrap">
            <input
              type="text"
              placeholder="Search RODTEP No, IEC Code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="ar-toolbar-right">
          <button className="ar-btn ar-btn-primary" onClick={handleOpenAdd}>
            + Add New
          </button>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="ar-table-outer">
        <div
          ref={containerRef}
          className="ar-table-scroll"
          onMouseDown={(e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "BUTTON" || e.target.tagName === "A" || e.target.classList.contains("ar-job-link")) return;
            const el = containerRef.current;
            el.dataset.isDown = "true";
            el.dataset.startX = e.pageX - el.offsetLeft;
            el.dataset.scrollLeft = el.scrollLeft;
          }}
          onMouseLeave={() => {
            if (containerRef.current) containerRef.current.dataset.isDown = "false";
          }}
          onMouseUp={() => {
            if (containerRef.current) containerRef.current.dataset.isDown = "false";
          }}
          onMouseMove={(e) => {
            const el = containerRef.current;
            if (!el || el.dataset.isDown !== "true") return;
            const x = e.pageX - el.offsetLeft;
            const walk = (x - Number(el.dataset.startX)) * 2;
            if (Math.abs(walk) > 5) {
              e.preventDefault();
              el.scrollLeft = Number(el.dataset.scrollLeft) - walk;
            }
          }}
        >
          <table className="ar-table">
            <thead>
              <tr>
                {TABLE_COLUMNS.map((col) => {
                  const sorted = sort.key === col.key;
                  if (col.key === "_actions") {
                    return (
                      <th
                        key="_actions"
                        className="ar-th-sticky ar-th-actions"
                        style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                      >
                        ACTIONS
                      </th>
                    );
                  }
                  return (
                    <th
                      key={col.key}
                      className={sorted ? "ar-th-sorted" : undefined}
                      style={{ width: col.width, minWidth: col.width }}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label} <SortIcon dir={sorted ? sort.dir : null} />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_COLUMNS.length}>
                    <div className="ar-empty-state">No records found</div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row._id} className="ar-data-row">
                    {TABLE_COLUMNS.map((col) => {
                      if (col.key === "_actions") {
                        return (
                          <td
                            key="_actions"
                            className="ar-td-sticky ar-td-actions"
                            style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                          >
                            <div className="ar-actions-cell">
                              <button
                                className="ar-btn ar-btn-edit ar-btn-sm"
                                onClick={() => handleOpenEdit(row)}
                              >
                                Edit
                              </button>
                              <button
                                className="ar-btn ar-btn-danger ar-btn-sm"
                                onClick={() => handleDelete(row._id)}
                              >
                                Del
                              </button>
                            </div>
                          </td>
                        );
                      }

                      const val = row[col.key] || "";

                      if (col.key === "rodtep") {
                        return (
                          <td key={col.key}>
                            <span
                              className="ar-job-link"
                              onClick={() => handleOpenUtilization(row.rodtep)}
                            >
                              {val}
                            </span>
                          </td>
                        );
                      }

                      if (DATE_FIELDS.has(col.key)) {
                        return <td key={col.key}>{formatDateToDdMmYyyy(val)}</td>;
                      }

                      if (col.key === "value_inr" || col.key === "utilized_amount" || col.key === "balance_amount") {
                        const num = Number(val) || 0;
                        return (
                          <td key={col.key} style={{ fontWeight: col.key !== "value_inr" ? 600 : "normal" }}>
                            ₹{num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        );
                      }

                      return <td key={col.key}>{val}</td>;
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="ar-pagination">
          <div className="ar-pagination-info">
            Showing {displayed.length === 0 ? 0 : page * rowsPerPage + 1}–
            {Math.min((page + 1) * rowsPerPage, displayed.length)} of {displayed.length} records
          </div>
          <div className="ar-pagination-controls">
            <span>Rows:</span>
            <select
              className="ar-rows-select"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(0);
              }}
            >
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              className="ar-page-btn"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              ‹ Prev
            </button>
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <button
              className="ar-page-btn"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next ›
            </button>
          </div>
        </div>
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          {editingId ? "Edit RODTEP details" : "Add RODTEP details"}
          <IconButton onClick={() => setDialogOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <div className="dgft-form-grid" style={{ gridTemplateColumns: "1fr" }}>
            {FIELDS.map((field) => (
              <div className="dgft-form-group" key={field.key}>
                <label>
                  {field.label} {field.required && <span style={{ color: "red" }}>*</span>}
                </label>
                <input
                  type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                  value={formData[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className={errors[field.key] ? "input-error" : ""}
                />
                {errors[field.key] && <span className="field-error">{errors[field.key]}</span>}
              </div>
            ))}
          </div>
        </DialogContent>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            padding: "14px 20px",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <button className="ar-btn ar-btn-secondary" onClick={() => setDialogOpen(false)}>
            Cancel
          </button>
          <button className="ar-btn ar-btn-primary" onClick={handleSubmit}>
            {editingId ? "Update" : "Add"}
          </button>
        </div>
      </Dialog>

      {/* ── Utilization Details Modal ── */}
      <Dialog open={utilizationModalOpen} onClose={() => setUtilizationModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <span>Utilisation Details for RODTEP: <strong>{selectedRodtepNo}</strong></span>
          <IconButton onClick={() => setUtilizationModalOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {utilizationLoading ? (
            <div style={{ textAlign: "center", padding: "30px", fontSize: "14px", color: "#666" }}>
              Loading utilization logs...
            </div>
          ) : (
            <div className="ap-table-responsive" style={{ maxHeight: "400px", overflowY: "auto" }}>
              <table className="ap-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "10px 8px", fontSize: "11px", fontWeight: "600", color: "#475569", textAlign: "left" }}>JOB NO</th>
                    <th style={{ padding: "10px 8px", fontSize: "11px", fontWeight: "600", color: "#475569", textAlign: "left" }}>IEC CODE</th>
                    <th style={{ padding: "10px 8px", fontSize: "11px", fontWeight: "600", color: "#475569", textAlign: "left" }}>ITEM DESCRIPTION</th>
                    <th style={{ padding: "10px 8px", fontSize: "11px", fontWeight: "600", color: "#475569", textAlign: "right" }}>AMOUNT</th>
                    <th style={{ padding: "10px 8px", fontSize: "11px", fontWeight: "600", color: "#475569", textAlign: "right" }}>AMOUNT INR</th>
                  </tr>
                </thead>
                <tbody>
                  {utilizationRows.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: "20px", textTransform: "none", textAlign: "center", color: "#888" }}>
                        No jobs have utilized this RODTEP scrip yet.
                      </td>
                    </tr>
                  ) : (
                    utilizationRows.map((rec, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px", fontWeight: 600 }}>{rec.job_no || "—"}</td>
                        <td style={{ padding: "8px" }}>{rec.ie_code_no || "—"}</td>
                        <td style={{ padding: "8px" }}>{rec.description || "—"}</td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          {rec.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {rec.currency}
                        </td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: 600 }}>
                          ₹{rec.amount_inr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 20px", borderTop: "1px solid #e5e7eb" }}>
          <button className="ar-btn ar-btn-secondary" onClick={() => setUtilizationModalOpen(false)}>
            Close
          </button>
        </div>
      </Dialog>

      <Toast toast={toast} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
}
