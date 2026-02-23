import React, { useEffect, useState, useCallback, useMemo } from "react";
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

const INITIAL_FORM = {
  job_no: "",
  job_status: "",
  date: "",
  party_name: "",
  job_type: "",
  port_name: "",
  licence_no: "",
  licence_date: "",
  licence_amount: "",
  lic_recd_from_party: "",
  date_send_to_icd_ports: "",
  bond_challan_no: "",
  iec_no: "",
  completed: "",
  registration_date: "",
  month: "",
  billing_done_or_not: "",
  bill_number: "",
};

const DATE_FIELDS = new Set([
  "date",
  "licence_date",
  "date_send_to_icd_ports",
  "registration_date",
]);

const CATEGORY_OPTIONS = [
  "ADVANCE AUTHORIZATION",
  "Amendment of advance Authorization",
  "Revalidation of advance Authorization",
  "EO",
  "EODC",
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
  "Billing",
  "Closed",
  "Open",
];

const ROWS_PER_PAGE_OPTIONS = [25, 50, 100];

const FIELDS = [
  { key: "job_no", label: "JOB No"},
  // { key: "job_status", label: "Job Status", select: true, options: JOB_STATUS_OPTIONS },
  { key: "date", label: "Date", type: "date" },
  { key: "party_name", label: "Party's Name" },
  { key: "job_type", label: "Job Type" },
  { key: "port_name", label: "Port Name" },
  // { key: "category", label: "Category", select: true, options: CATEGORY_OPTIONS, allowCustom: true },
  { key: "licence_no", label: "Licence No" },
  { key: "licence_date", label: "Licence Date", type: "date" },
  { key: "licence_amount", label: "Licence Amount" },
  { key: "lic_recd_from_party", label: "Lic. Recd From Party" },
  { key: "date_send_to_icd_ports", label: "Send to ICDs/Ports", type: "date" },
  { key: "bond_challan_no", label: "Bond / Challan No" },
  { key: "iec_no", label: "IEC No." },
  { key: "completed", label: "Completed" },
  { key: "registration_date", label: "Registration Date", type: "date" },
  { key: "month", label: "Month" },
  { key: "billing_done_or_not", label: "Billing Done" },
  { key: "bill_number", label: "Bill Number" },
];

// Table columns (Actions first, then Sr No auto-generated, then data)
const TABLE_COLUMNS = [
  { key: "_actions", label: "Actions", width: 90 },
  { key: "_sr_no", label: "Sr", width: 40 },
  { key: "job_no", label: "JOB No", width: 90 },
  // { key: "job_status", label: "Status", width: 80 },
  { key: "date", label: "Date", width: 85 },
  { key: "party_name", label: "Party's Name", width: 180 },
  { key: "job_type", label: "Job Type", width: 100 },
  { key: "port_name", label: "Port Name", width: 120 },
  // { key: "category", label: "Category", width: 130 },
  { key: "licence_no", label: "Licence No", width: 100 },
  { key: "licence_date", label: "Lic. Date", width: 85 },
  { key: "licence_amount", label: "Lic. Amount", width: 100 },
  { key: "lic_recd_from_party", label: "Lic. Recd", width: 100 },
  { key: "date_send_to_icd_ports", label: "To ICDs", width: 90 },
  { key: "bond_challan_no", label: "Bond/Challan", width: 110 },
  { key: "iec_no", label: "IEC No.", width: 90 },
  { key: "completed", label: "Completed", width: 85 },
  { key: "registration_date", label: "Reg. Date", width: 90 },
  { key: "month", label: "Month", width: 70 },
  { key: "billing_done_or_not", label: "Billing", width: 80 },
  { key: "bill_number", label: "Bill No.", width: 90 },
];

// Inline styles
const s = {
  toolbar: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginBottom: "10px",
    flexWrap: "wrap",
    justifyContent: "space-between",
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

function AuthorizationRegistrationList({ onCountChange }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("");
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
  const fileInput = React.useRef(null);

  const getData = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-authorization-registrations`
      );
      setRows(
        res.data.sort((a, b) => {
          const s1 = String(a.job_no || "");
          const s2 = String(b.job_no || "");
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
        `${process.env.REACT_APP_API_STRING}/get-auth-reg-categories`
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
    if (rows.length === 0) return "LIC/1";
    let maxNum = 0;
    rows.forEach((r) => {
      const match = (r.job_no || "").match(/\/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `LIC/${maxNum + 1}`;
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
        `${process.env.REACT_APP_API_STRING}/delete-authorization-registration/${id}`
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
          `${process.env.REACT_APP_API_STRING}/update-authorization-registration/${editingId}`,
          formData
        );
        showToast("Record updated", "success");
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_STRING}/add-authorization-registration`,
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

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };



  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/upload-authorization-registration-excel`,
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

  const showToast = (message, severity) => {
    setToast({ open: true, message, severity });
  };

  // Filter rows by search + jobType + status with grouping support
  const { filtered, grouped } = useMemo(() => {
    let result = rows.filter((row) => {
      // Job Type filter
      if (jobTypeFilter && !(row.job_type || "").toLowerCase().includes(jobTypeFilter.toLowerCase())) return false;
      // Status filter
      if (statusFilter && !(row.job_status || "").toLowerCase().includes(statusFilter.toLowerCase())) return false;
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(row.job_no || "").toLowerCase().includes(q) &&
          !(row.party_name || "").toLowerCase().includes(q) &&
          !(row.licence_no || "").toLowerCase().includes(q) &&
          !(row.port_name || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });

    // If jobType filter is applied, group by job_type
    let grouped_result = null;
    if (jobTypeFilter) {
      const groups = {};
      result.forEach((row) => {
        const jt = row.job_type || "Unspecified";
        if (!groups[jt]) groups[jt] = [];
        groups[jt].push(row);
      });
      grouped_result = groups;
    }

    return { filtered: result, grouped: grouped_result };
  }, [rows, search, jobTypeFilter, statusFilter]);

  // Compute unique job types for the dropdown
  const availableJobTypes = useMemo(() => {
    const types = new Set();
    rows.forEach((r) => {
      if (r.job_type) types.add(r.job_type.trim());
    });
    return Array.from(types).sort();
  }, [rows]);

  // For display with grouping
  const renderRows = useMemo(() => {
    if (grouped) {
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
  }, [search, jobTypeFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(renderRows.length / rowsPerPage) || 1;
  const paginatedRows = renderRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <div>
      {/* Toolbar */}
      <div style={s.toolbar}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search Job No, Party, Licence, Port..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={s.input}
          />
          <select
            value={jobTypeFilter}
            onChange={(e) => setJobTypeFilter(e.target.value)}
            style={s.filterSelect}
          >
            <option value="">All Job Types</option>
            {availableJobTypes.map((opt) => (
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
        <div style={{ display: "flex", gap: "8px" }}>
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

      {/* Table — single header (no grouping) */}
      <div className="dgft-table-wrapper">
        <table>
          <thead>
            <tr className="header-single">
              {TABLE_COLUMNS.map((col) => (
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
                <td colSpan={TABLE_COLUMNS.length}>No records found</td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => {
                // Render group header if this is the first row of a group
                if (row._groupName) {
                  return (
                    <React.Fragment key={`group-${row._groupName}`}>
                      <tr className="dgft-group-header">
                        <td colSpan={TABLE_COLUMNS.length} style={{ fontWeight: "bold", background: "#f0f4f8", padding: "8px", borderBottom: "2px solid #d1d5db" }}>
                          {row._groupName}
                        </td>
                      </tr>
                      <tr key={row._id} className="dgft-data-row">
                        {TABLE_COLUMNS.map((col) => {
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
                          if (col.key === "_sr_no") {
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
                    {TABLE_COLUMNS.map((col) => {
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
                      if (col.key === "_sr_no") {
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

      {/* Add/Edit Dialog */}
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

export default React.memo(AuthorizationRegistrationList);
