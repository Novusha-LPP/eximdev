import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import "./dgft.scss";

// ===================== Constants =====================

const CATEGORY_OPTIONS = [
  "ADVANCE AUTHORIZATION",
  "Amendment of advance Authorization",
  "Revalidation of advance Authorization",
  "EO extension of advance Authorization",
  "EODC of advance Authorization",
  "Surrender",
  "EPCG Authorization",
  "Amendment of EPCG Authorization",
  "EPCG block extension",
  "EPCG overall period extension",
  "EODC of EPCG Authorization",
  "Surrender of EPCG Authorization",
  "RCMC application",
  "IEC application",
];

const JOB_STATUS_OPTIONS = [
  "Completed",
  "Pending",
  "Processed",
  "Documents Received",
  "Send to ICD",
   "Billing",
  "Closed",
  "Open",
  
];

const ROWS_PER_PAGE_OPTIONS = [25, 50, 100];

const INITIAL_FORM = {
  sr_no: "",
  job_status: "",
  job_no: "",
  date: "",
  party_name: "",
  category: "",
  licence_cif_value: "",
  docs_received_date: "",
  application_prepared_on: "",
  submitted_at_dgft_on: "",
  eft_amount: "",
  bid_no: "",
  bid_date: "",
  file_no_key_no: "",
  file_date: "",
  dh: "",
  ft_do: "",
  adg: "",
  d_dg: "",
  licence_no: "",
  licence_date: "",
  matter_closed_date: "",
  matter_closed_inv_no: "",
  matter_closed_inv_date: "",
  docs_handed_over_to_ac: "",
  remarks: "",
  accounts_inv_no: "",
  accounts_inv_date: "",
};

// Fields that must be valid dates
const DATE_FIELDS = new Set([
  "date",
  "docs_received_date",
  "application_prepared_on",
  "submitted_at_dgft_on",
  "bid_date",
  "file_date",
  "licence_date",
  "matter_closed_date",
  "matter_closed_inv_date",
  "accounts_inv_date",
]);

// All fields with label and optional type (sr_no is auto-generated, job_no auto-generated)
const FIELDS = [
  { key: "job_no", label: "JOB No.", readOnly: true },
  { key: "job_status", label: "Job Status", select: true, options: JOB_STATUS_OPTIONS },
  { key: "date", label: "Date", type: "date" },
  { key: "party_name", label: "Party's Name" },
  {
    key: "category",
    label: "Category",
    select: true,
    options: CATEGORY_OPTIONS,
    allowCustom: true,
  },
  { key: "licence_cif_value", label: "Licence / CIF Value" },
  { key: "docs_received_date", label: "Docs Recvd Date", type: "date" },
  { key: "application_prepared_on", label: "App. Prepared On", type: "date" },
  { key: "submitted_at_dgft_on", label: "Submitted at DGFT", type: "date" },
  { key: "eft_amount", label: "EFT Amount" },
  { key: "bid_no", label: "BID No" },
  { key: "bid_date", label: "BID Date", type: "date" },
  { key: "file_no_key_no", label: "File / Key No" },
  { key: "file_date", label: "File Date", type: "date" },
  { key: "dh", label: "D/H" },
  { key: "ft_do", label: "F/T Do" },
  { key: "adg", label: "ADG" },
  { key: "d_dg", label: "D.DG" },
  { key: "licence_no", label: "Licence No" },
  { key: "licence_date", label: "Licence Date", type: "date" },
  { key: "matter_closed_date", label: "Closed Date", type: "date" },
  { key: "matter_closed_inv_no", label: "INV No." },
  { key: "matter_closed_inv_date", label: "INV Date", type: "date" },
  { key: "docs_handed_over_to_ac", label: "Docs to A/c Dept." },
  { key: "remarks", label: "Remarks" },
  { key: "accounts_inv_no", label: "Acc INV No." },
  { key: "accounts_inv_date", label: "Acc INV Date", type: "date" },
];

// Flat column definitions for the table (no grouping)
const COLUMNS = [
  { key: "_actions", label: "Actions", width: 90 },
  { key: "sr_no", label: "Sr No", width: 40 },
  { key: "job_status", label: "Job Status", width: 80 },
  { key: "job_no", label: "Job No.", width: 80 },
  { key: "date", label: "Date", width: 85 },
  { key: "party_name", label: "Party's Name", width: 160 },
  { key: "category", label: "Category", width: 130 },
  { key: "licence_cif_value", label: "Licence / CIF Value", width: 100 },
  { key: "docs_received_date", label: "Docs Recvd Date", width: 90 },
  { key: "application_prepared_on", label: "App. Prepared On", width: 95 },
  { key: "submitted_at_dgft_on", label: "Submitted at DGFT", width: 90 },
  { key: "eft_amount", label: "EFT Amount", width: 80 },
  { key: "bid_no", label: "BID No", width: 80 },
  { key: "bid_date", label: "BID Date", width: 85 },
  { key: "file_no_key_no", label: "File / Key No", width: 80 },
  { key: "file_date", label: "File Date", width: 85 },
  { key: "dh", label: "D/H", width: 50 },
  { key: "ft_do", label: "F/T Do", width: 50 },
  { key: "adg", label: "ADG", width: 50 },
  { key: "d_dg", label: "D.DG", width: 50 },
  { key: "licence_no", label: "Licence No", width: 110 },
  { key: "licence_date", label: "Licence Date", width: 90 },
  { key: "matter_closed_date", label: "Closed Date", width: 85 },
  { key: "matter_closed_inv_no", label: "INV No.", width: 85 },
  { key: "matter_closed_inv_date", label: "INV Date", width: 85 },
  { key: "docs_handed_over_to_ac", label: "Docs to A/c Dept.", width: 80 },
  { key: "remarks", label: "Remarks", width: 130 },
  { key: "accounts_inv_no", label: "Acc INV No.", width: 85 },
  { key: "accounts_inv_date", label: "Acc INV Date", width: 85 },
];

// Inline styles matching the enterprise design
const s = {
  toolbar: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginBottom: "10px",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  toolbarLeft: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  toolbarRight: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  input: {
    height: "30px",
    padding: "0 8px",
    fontSize: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    outline: "none",
    color: "#333",
    minWidth: "180px",
  },
  filterSelect: {
    height: "30px",
    padding: "0 6px",
    fontSize: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    outline: "none",
    color: "#333",
    minWidth: "130px",
    background: "#fff",
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 14px",
    border: "none",
    borderRadius: "3px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    background: "#2563eb",
    color: "#fff",
  },
  btnEdit: {
    padding: "3px 10px",
    border: "1px solid #2563eb",
    background: "#fff",
    color: "#2563eb",
    borderRadius: "3px",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
  },
  btnDelete: {
    padding: "3px 10px",
    border: "1px solid #dc2626",
    background: "#fff",
    color: "#dc2626",
    borderRadius: "3px",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 4px",
    flexWrap: "wrap",
    gap: "8px",
    fontSize: "12px",
    color: "#374151",
  },
  pageBtn: {
    padding: "4px 10px",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    background: "#fff",
    cursor: "pointer",
    fontSize: "12px",
  },
  pageBtnDisabled: {
    padding: "4px 10px",
    border: "1px solid #e5e7eb",
    borderRadius: "3px",
    background: "#f9fafb",
    cursor: "not-allowed",
    fontSize: "12px",
    color: "#9ca3af",
  },
};

// ===================== Toast Component =====================

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

// ===================== Main Component =====================

function DgftRegisterList({ onCountChange }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [availableCategories, setAvailableCategories] = useState(CATEGORY_OPTIONS);
  const [categoryInput, setCategoryInput] = useState("");
  const fileInput = useRef(null);

  // Fetch data
  const getData = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-dgft-registers`
      );
      setRows(
        res.data.sort((a, b) => {
          const s1 = String(a.sr_no || "");
          const s2 = String(b.sr_no || "");
          return s1.localeCompare(s2, undefined, { numeric: true });
        })
      );
      if (onCountChange) onCountChange(res.data.length);
    } catch (err) {
      console.error(err);
    }
  }, [onCountChange]);

  const getCategories = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-dgft-categories`
      );
      // Merge unique categories from DB with standard options
      const unique = Array.from(new Set([...CATEGORY_OPTIONS, ...res.data]));
      setAvailableCategories(unique);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    getData();
    getCategories();
  }, [getData, getCategories]);

  // Validation
  const validate = () => {
    const errs = {};
    DATE_FIELDS.forEach((key) => {
      const val = formData[key];
      if (val && val.trim() !== "") {
        if (isNaN(Date.parse(val))) {
          errs[key] = "Invalid date";
        }
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const getNextJobNo = () => {
    if (rows.length === 0) return "DGFT/1";
    let maxNum = 0;
    rows.forEach((r) => {
      const match = (r.job_no || "").match(/\/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `DGFT/${maxNum + 1}`;
  };

  const handleOpenAdd = () => {
    setFormData({ ...INITIAL_FORM, job_no: getNextJobNo() });
    setEditingId(null);
    setErrors({});
    setCategoryInput("");
    setDialogOpen(true);
  };

  const handleAddCustomCategory = () => {
    if (categoryInput.trim() && !availableCategories.includes(categoryInput.trim())) {
      setAvailableCategories([...availableCategories, categoryInput.trim()]);
      showToast("Category added to list", "success");
      setCategoryInput("");
    }
  };

  const handleOpenEdit = (row) => {
    setEditingId(row._id);
    const data = {};
    FIELDS.forEach((f) => {
      data[f.key] = row[f.key] || "";
    });
    setFormData(data);
    setErrors({});
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_STRING}/delete-dgft-register/${id}`
      );
      showToast("Record deleted", "success");
      getData();
    } catch (err) {
      console.error(err);
      showToast("Delete failed", "error");
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      if (editingId) {
        await axios.put(
          `${process.env.REACT_APP_API_STRING}/update-dgft-register/${editingId}`,
          formData
        );
        showToast("Record updated", "success");
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_STRING}/add-dgft-register`,
          formData
        );
        showToast("Record added", "success");
      }
      setDialogOpen(false);
      getData();
    } catch (err) {
      console.error(err);
      showToast("Operation failed", "error");
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/upload-dgft-register-excel`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      showToast(res.data.message, "success");
      getData();
    } catch (err) {
      console.error(err);
      showToast("Excel upload failed", "error");
    }
    e.target.value = "";
  };

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const showToast = (message, severity) => {
    setToast({ open: true, message, severity });
  };

  // Filter rows by search + category + status
  const { filtered, grouped } = useMemo(() => {
    let result = rows.filter((row) => {
      // Category filter
      if (categoryFilter && !(row.category || "").toLowerCase().includes(categoryFilter.toLowerCase())) return false;
      // Status filter
      if (statusFilter && !(row.job_status || "").toLowerCase().includes(statusFilter.toLowerCase())) return false;
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(row.job_no || "").toLowerCase().includes(q) &&
          !(row.party_name || "").toLowerCase().includes(q) &&
          !(row.category || "").toLowerCase().includes(q) &&
          !(row.sr_no || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });

    // If category filter is applied, group by category
    let grouped_result = null;
    if (categoryFilter) {
      const groups = {};
      result.forEach((row) => {
        const cat = row.category || "Uncategorized";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(row);
      });
      grouped_result = groups;
    }

    return { filtered: result, grouped: grouped_result };
  }, [rows, search, categoryFilter, statusFilter]);

  // For pagination with grouping
  const renderRows = useMemo(() => {
    if (grouped) {
      // Flatten grouped data for display (with group headers)
      const flattened = [];
      Object.entries(grouped).forEach(([groupName, groupRows]) => {
        groupRows.forEach((row, idx) => {
          flattened.push({ ...row, _groupName: idx === 0 ? groupName : null });
        });
      });
      return flattened;
    }
    return filtered;
  }, [grouped, filtered]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, categoryFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(renderRows.length / rowsPerPage) || 1;
  const paginatedRows = renderRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Use flat columns directly
  const flatCols = COLUMNS;

  return (
    <div>
      {/* Toolbar */}
      <div style={s.toolbar}>
        <div style={s.toolbarLeft}>
          <input
            type="text"
            placeholder="Search Job No, Party..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={s.input}
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={s.filterSelect}
          >
            <option value="">All Categories</option>
            {availableCategories.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={s.filterSelect}
          >
            <option value="">All Statuses</option>
            {JOB_STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div style={s.toolbarRight}>
          <button style={s.btnPrimary} onClick={handleOpenAdd}>
            + Add New
          </button>
          <label className="dgft-upload-label">
            ↑ Upload Excel
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
            />
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="dgft-table-wrapper">
        <table>
          <thead>
            {/* Header row with column labels */}
            <tr className="header-sub">
              {flatCols.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width, minWidth: col.width }}
                  className={col.key === "_actions" ? "col-actions-head" : ""}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr className="dgft-empty-row">
                <td colSpan={flatCols.length}>No records found</td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => {
                // Render group header if this is the first row of a group
                if (row._groupName) {
                  return (
                    <React.Fragment key={`group-${row._groupName}`}>
                      <tr className="dgft-group-header">
                        <td colSpan={flatCols.length} style={{ fontWeight: "bold", background: "#f0f4f8", padding: "8px", borderBottom: "2px solid #d1d5db" }}>
                          {row._groupName}
                        </td>
                      </tr>
                      <tr key={row._id} className="dgft-data-row">
                        {flatCols.map((col) => {
                          if (col.key === "_actions") {
                            return (
                              <td key="_actions" className="col-actions-cell">
                                <div className="dgft-actions-cell">
                                  <button
                                    style={s.btnEdit}
                                    onClick={() => handleOpenEdit(row)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    style={s.btnDelete}
                                    onClick={() => handleDelete(row._id)}
                                  >
                                    Del
                                  </button>
                                </div>
                              </td>
                            );
                          }
                          if (col.key === "sr_no") {
                            return (
                              <td key={col.key}>
                                {page * rowsPerPage + idx + 1}
                              </td>
                            );
                          }
                          return <td key={col.key}>{row[col.key] || ""}</td>;
                        })}
                      </tr>
                    </React.Fragment>
                  );
                }

                return (
                  <tr key={row._id} className="dgft-data-row">
                    {flatCols.map((col) => {
                      if (col.key === "_actions") {
                        return (
                          <td key="_actions" className="col-actions-cell">
                            <div className="dgft-actions-cell">
                              <button
                                style={s.btnEdit}
                                onClick={() => handleOpenEdit(row)}
                              >
                                Edit
                              </button>
                              <button
                                style={s.btnDelete}
                                onClick={() => handleDelete(row._id)}
                              >
                                Del
                              </button>
                            </div>
                          </td>
                        );
                      }
                      if (col.key === "sr_no") {
                        return (
                          <td key={col.key}>
                            {page * rowsPerPage + idx + 1}
                          </td>
                        );
                      }
                      return <td key={col.key}>{row[col.key] || ""}</td>;
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={s.pagination}>
        <div>
          Showing {renderRows.length === 0 ? 0 : page * rowsPerPage + 1}–
          {Math.min((page + 1) * rowsPerPage, renderRows.length)} of{" "}
          {renderRows.length} records
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>Rows:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(0);
            }}
            style={{ ...s.filterSelect, minWidth: "60px" }}
          >
            {ROWS_PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={page === 0 ? s.pageBtnDisabled : s.pageBtn}
          >
            ‹ Prev
          </button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={page >= totalPages - 1 ? s.pageBtnDisabled : s.pageBtn}
          >
            Next ›
          </button>
        </div>
      </div>

      {/* Add/Edit Dialog (MUI Dialog allowed) */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          {editingId ? "Edit Record" : "Add New Record"}
          <IconButton onClick={() => setDialogOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <div className="dgft-form-grid">
            {FIELDS.map((field) => {
              // Handle category field with custom category input
              if (field.key === "category") {
                return (
                  <div className="dgft-form-group" key={field.key}>
                    <label>{field.label}</label>
                    <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                      <select
                        value={formData[field.key]}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                      >
                        <option value="">-- Select Category --</option>
                        {availableCategories.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <input
                          type="text"
                          placeholder="Add custom category..."
                          value={categoryInput}
                          onChange={(e) => setCategoryInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleAddCustomCategory()}
                          style={{ ...s.input, flex: 1, minWidth: "150px" }}
                        />
                        <button
                          onClick={handleAddCustomCategory}
                          style={{
                            padding: "4px 10px",
                            background: "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    {errors[field.key] && (
                      <span className="field-error">{errors[field.key]}</span>
                    )}
                  </div>
                );
              }

              // Skip rendering sr_no since it's auto-generated
              if (field.key === "sr_no") return null;

              // Handle read-only job_no
              if (field.readOnly) {
                return (
                  <div className="dgft-form-group" key={field.key}>
                    <label>{field.label}</label>
                    <input
                      type="text"
                      value={formData[field.key]}
                      readOnly
                      style={{ ...s.input, background: "#f3f4f6", color: "#666" }}
                    />
                  </div>
                );
              }

              return (
                <div className="dgft-form-group" key={field.key}>
                  <label>{field.label}</label>
                  {field.select ? (
                    <select
                      value={formData[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                    >
                      <option value="">-- Select --</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === "date" ? "date" : "text"}
                      value={formData[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className={errors[field.key] ? "input-error" : ""}
                    />
                  )}
                  {errors[field.key] && (
                    <span className="field-error">{errors[field.key]}</span>
                  )}
                </div>
              );
            })}
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
          <button
            style={{
              ...s.btnEdit,
              padding: "6px 18px",
              fontSize: "13px",
            }}
            onClick={() => setDialogOpen(false)}
          >
            Cancel
          </button>
          <button
            style={{
              ...s.btnPrimary,
              padding: "6px 18px",
              fontSize: "13px",
            }}
            onClick={handleSubmit}
          >
            {editingId ? "Update" : "Add"}
          </button>
        </div>
      </Dialog>

      {/* Toast */}
      <Toast
        toast={toast}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}

export default React.memo(DgftRegisterList);
