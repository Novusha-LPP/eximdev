import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import "./dgft.scss";

// ===================== Constants =====================

const SCHEME_OPTIONS = [
  "AEO",
  "EMI",
  "IEC",
  "IEC MODIFICATION",
  "EPM",
  "EMC",
  "AA",
  "AA REVALIDATION",
  "AA EO EXTENSION",
  "AA EODC",
  "AA SURRENDER",
  "EPCG",
  "EPCG AMENDMENT",
  "EPCG BLOCK EXTENSION",
  "EPCG OVERALL EXTENSION",
  "EPCG EODC",
  "EPCG SURRENDER",
];

const JOB_STATUS_OPTIONS = [
  "OPEN",
  "IN PROCESS",
  "DEFICIENT",
  "APPROVED",
  "REJECTED",
  "BILLING",
  "CLOSED",
];

const ROWS_PER_PAGE_OPTIONS = [25, 50, 100];

const INITIAL_FORM = {
  sr_no: "",
  job_status: "",
  job_no: "",
  date: "",
  party_name: "",
  iec_no: "",
  scheme: "",
  file_no: "",
  port_of_registration: "",
  licence_cif_value: "",
  docs_received_date: "",
  online_submission_date: "",
  documents_send_to_accounts_date: "",
  payment_details: "",
  transaction_id: "",
  transaction_amount: "",
  transaction_date: "",
  qty_export: "",
  unit_export: "",
  export_value_fob_usd: "",
  export_value_rs: "",
  hs_code_export: "",
  item_description_export: "",
  qty_import: "",
  unit_import: "",
  import_value_fob_usd: "",
  import_value_rs: "",
  hs_code_import: "",
  item_description_import: "",
  import_validity: "",
  export_validity: "",
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
  "online_submission_date",
  "documents_send_to_accounts_date",
  "transaction_date",
  "import_validity",
  "export_validity",
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
  { key: "party_name", label: "Firm Name" },
  { key: "licence_no", label: "Authorization No." },
  { key: "licence_date", label: "Auth Date", type: "date" },
  { key: "scheme", label: "Scheme", select: true, options: SCHEME_OPTIONS },
  { key: "file_no", label: "File Number" },
  { key: "file_date", label: "File Date", type: "date" },
  { key: "port_of_registration", label: "Port of Registration" },
  { key: "iec_no", label: "IEC No." },
  {
    key: "category",
    label: "Legacy Category",
    select: true,
    options: SCHEME_OPTIONS,
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
  { key: "job_no", label: "JOB NUMBER", width: 110 },
  { key: "date", label: "DATE", width: 95 },
  { key: "party_name", label: "FIRM NAME", width: 220 },
  { key: "licence_no", label: "AUTHORIZATION NO.", width: 155 },
  { key: "licence_date", label: "AUTH DATE", width: 100 },
  { key: "scheme", label: "SCHEME", width: 170 },
  { key: "file_no", label: "FILE NUMBER", width: 120 },
  { key: "file_date", label: "FILE DATE", width: 100 },
  { key: "job_status", label: "JOB STATUS", width: 130 },
  { key: "_actions", label: "ACTIONS", width: 100 },
];

// Sort icon
function SortIcon({ dir }) {
  return (
    <span className="ar-sort-icon">
      {dir === "asc" ? "↑" : dir === "desc" ? "↓" : "↕"}
    </span>
  );
}

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

// ===================== Date Helpers =====================
const toNativeDate = (val) => {
  if (!val || typeof val !== "string") return val || "";
  const trimmed = val.trim();
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) return trimmed; // YYYY-MM-DD
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  const parts = trimmed.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return trimmed;
};

const formatDateToDdMmYyyy = (val) => {
  if (!val) return "";
  const raw = String(val).trim();
  if (!raw) return "";

  // Match YYYY-MM-DD
  const matchYmd = raw.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})$/);
  if (matchYmd) {
    return `${matchYmd[3]}-${matchYmd[2]}-${matchYmd[1]}`;
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const matchDmy = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (matchDmy) {
    const dd = matchDmy[1].padStart(2, "0");
    const mm = matchDmy[2].padStart(2, "0");
    const yyyy = matchDmy[3].length === 2 ? "20" + matchDmy[3] : matchDmy[3];
    return `${dd}-${mm}-${yyyy}`;
  }

  return raw;
};

// ===================== Main Component =====================

function DgftRegisterList({ onCountChange }) {
  const navigate = useNavigate();
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
  const [availableCategories, setAvailableCategories] = useState(SCHEME_OPTIONS);
  const [categoryInput, setCategoryInput] = useState("");
  const fileInput = useRef(null);
  const [sort, setSort] = useState({ key: null, dir: null });
  const containerRef = useRef(null);

  const handleSort = (key) =>
    setSort((prev) => ({
      key,
      dir: prev.key === key ? (prev.dir === "asc" ? "desc" : "asc") : "asc",
    }));

  // Fetch data
  const getData = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-dgft-registers`
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
        `${process.env.REACT_APP_API_STRING}/get-dgft-categories`
      );
      // Merge unique categories from DB with standard options
      const unique = Array.from(new Set([...SCHEME_OPTIONS, ...res.data]));
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
      let val = row[f.key] || "";
      if (DATE_FIELDS.has(f.key) && val) {
        val = toNativeDate(val);
      }
      data[f.key] = val;
    });
    setFormData(data);
    setErrors({});
    setCategoryInput("");
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

  const handleDeleteAll = async () => {
    if (!window.confirm("ARE YOU SURE? This will permanently delete ALL records in this tab.")) return;
    if (!window.confirm("Final confirmation: This action cannot be undone. Delete all?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_STRING}/delete-all-dgft-registers`);
      showToast("All records deleted", "success");
      getData();
    } catch (err) { console.error(err); showToast("Bulk delete failed", "error"); }
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

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/update-dgft-register/${id}`,
        { job_status: newStatus }
      );
      setRows((prev) =>
        prev.map((r) => (r._id === id ? { ...r, job_status: newStatus } : r))
      );
      showToast("Status updated", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to update status", "error");
    }
  };

  const showToast = (message, severity) => {
    setToast({ open: true, message, severity });
  };

  // Filter rows by search + category + status
  const { filtered, grouped } = useMemo(() => {
    let result = rows.filter((row) => {
      // Category filter
      const rowScheme = row.scheme || row.category || "";
      if (categoryFilter && !rowScheme.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
      // Status filter
      if (statusFilter && !(row.job_status || "").toLowerCase().includes(statusFilter.toLowerCase())) return false;
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(row.job_no || "").toLowerCase().includes(q) &&
          !(row.party_name || "").toLowerCase().includes(q) &&
          !(row.category || "").toLowerCase().includes(q) &&
          !(row.scheme || "").toLowerCase().includes(q) &&
          !(row.licence_no || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });

    if (sort.key) {
      result = [...result].sort((a, b) => {
        const va = String(a[sort.key] || "").toLowerCase();
        const vb = String(b[sort.key] || "").toLowerCase();
        return sort.dir === "asc"
          ? va.localeCompare(vb, undefined, { numeric: true })
          : vb.localeCompare(va, undefined, { numeric: true });
      });
    }

    return { filtered: result, grouped: null };
  }, [rows, search, categoryFilter, statusFilter, sort]);

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
  }, [search, categoryFilter, statusFilter, sort]);

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
      {/* ── Toolbar ── */}
      <div className="ar-toolbar">
        <div className="ar-toolbar-left">
          <div className="ar-search-wrap">
            <input
              type="text"
              placeholder="Search Job No, Party..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="ar-filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Schemes</option>
            {availableCategories.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <select
            className="ar-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {JOB_STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div className="ar-toolbar-right">
          <button className="ar-btn ar-btn-primary" onClick={handleOpenAdd}>
            + Add New
          </button>
          <label className="ar-btn ar-btn-upload">
            ↑ Upload Excel
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              style={{ display: "none" }}
            />
          </label>
          <button className="ar-btn ar-btn-danger" onClick={handleDeleteAll}>
            🗑 Delete All
          </button>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="ar-table-outer">
        <div 
          ref={containerRef}
          className="ar-table-scroll"
          onMouseDown={(e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "BUTTON") return;
            const el = containerRef.current;
            el.dataset.isDown = "true";
            el.dataset.startX = e.pageX - el.offsetLeft;
            el.dataset.scrollLeft = el.scrollLeft;
            el.dataset.dragged = "false";
          }}
          onMouseLeave={() => {
            const el = containerRef.current;
            el.dataset.isDown = "false";
          }}
          onMouseUp={() => {
            const el = containerRef.current;
            el.dataset.isDown = "false";
          }}
          onMouseMove={(e) => {
            const el = containerRef.current;
            if (el.dataset.isDown !== "true") return;
            const x = e.pageX - el.offsetLeft;
            const walk = (x - Number(el.dataset.startX)) * 2;
            if (Math.abs(walk) > 5) {
              el.dataset.dragged = "true";
              e.preventDefault();
              el.scrollLeft = Number(el.dataset.scrollLeft) - walk;
            }
          }}
        >
          <table className="ar-table">
            <thead>
              <tr>
                {flatCols.map((col) => {
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
                <tr className="dgft-empty-row">
                  <td colSpan={flatCols.length}>
                    <div className="ar-empty-state">No records found</div>
                  </td>
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
                        <tr key={row._id} className="ar-data-row">
                          {flatCols.map((col) => {
                            if (col.key === "_actions") {
                              return (
                                <td
                                  key="_actions"
                                  className="ar-td-sticky ar-td-actions"
                                  style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="ar-actions-cell">
                                    <button
                                      className="ar-btn ar-btn-edit ar-btn-sm"
                                      onClick={(e) => { e.stopPropagation(); handleOpenEdit(row); }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="ar-btn ar-btn-danger ar-btn-sm"
                                      onClick={(e) => { e.stopPropagation(); handleDelete(row._id); }}
                                    >
                                      Del
                                    </button>
                                  </div>
                                </td>
                              );
                            }
                            if (col.key === "job_no") {
                              const raw = row.job_no || "";
                              const displayJobNo = String(raw).includes("/") ? raw : `DGFT/${raw}`;
                              return (
                                <td key={col.key} onClick={() => navigate(`/dgft/register-details/${row._id}`)}>
                                  <span className="ar-job-link">{displayJobNo}</span>
                                </td>
                              );
                            }
                            if (col.key === "job_status") {
                              return (
                                <td key={col.key} onClick={(e) => e.stopPropagation()}>
                                  <select
                                    value={row.job_status || ""}
                                    onChange={(e) => handleStatusChange(row._id, e.target.value)}
                                    style={{ padding: "4px 8px", borderRadius: "3px", border: "1px solid #d0d7e2", width: "100%", fontSize: "11px", outline: "none", background: "#fff" }}
                                  >
                                    <option value="">-- Select --</option>
                                    {JOB_STATUS_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              );
                            }
                            if (col.key === "scheme") {
                              return <td key={col.key}>{row.scheme || row.category || ""}</td>;
                            }
                            if (col.key === "file_no") {
                              return <td key={col.key}>{row.file_no || row.file_no_key_no || ""}</td>;
                            }
                            if (DATE_FIELDS.has(col.key)) {
                              return <td key={col.key}>{formatDateToDdMmYyyy(row[col.key])}</td>;
                            }
                            return <td key={col.key}>{row[col.key] || ""}</td>;
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  }

                  return (
                    <tr key={row._id} className="ar-data-row">
                      {flatCols.map((col) => {
                        if (col.key === "_actions") {
                          return (
                            <td
                              key="_actions"
                              className="ar-td-sticky ar-td-actions"
                              style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="ar-actions-cell">
                                <button
                                  className="ar-btn ar-btn-edit ar-btn-sm"
                                  onClick={(e) => { e.stopPropagation(); handleOpenEdit(row); }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="ar-btn ar-btn-danger ar-btn-sm"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(row._id); }}
                                >
                                  Del
                                </button>
                              </div>
                            </td>
                          );
                        }
                        if (col.key === "job_no") {
                          const raw = row.job_no || "";
                          const displayJobNo = String(raw).includes("/") ? raw : `DGFT/${raw}`;
                          return (
                            <td key={col.key} onClick={() => navigate(`/dgft/register-details/${row._id}`)}>
                              <span className="ar-job-link">{displayJobNo}</span>
                            </td>
                          );
                        }
                        if (col.key === "job_status") {
                          return (
                            <td key={col.key} onClick={(e) => e.stopPropagation()}>
                              <select
                                value={row.job_status || ""}
                                onChange={(e) => handleStatusChange(row._id, e.target.value)}
                                style={{ padding: "4px 8px", borderRadius: "3px", border: "1px solid #d0d7e2", width: "100%", fontSize: "11px", outline: "none", background: "#fff" }}
                              >
                                <option value="">-- Select --</option>
                                {JOB_STATUS_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        }
                        if (col.key === "scheme") {
                          return <td key={col.key}>{row.scheme || row.category || ""}</td>;
                        }
                        if (col.key === "file_no") {
                          return <td key={col.key}>{row.file_no || row.file_no_key_no || ""}</td>;
                        }
                        if (DATE_FIELDS.has(col.key)) {
                          return <td key={col.key}>{formatDateToDdMmYyyy(row[col.key])}</td>;
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

        {/* Pagination inside table card */}
        <div className="ar-pagination">
          <div className="ar-pagination-info">
            Showing {filtered.length === 0 ? 0 : page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, filtered.length)} of {filtered.length} records
          </div>
          <div className="ar-pagination-controls">
            <span style={{ color: "#000000ff" }}>Rows:</span>
            <select className="ar-rows-select" value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}>
              {ROWS_PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button className="ar-page-btn" onClick={() => setPage((p) => Math.max(0, p - 1))}           disabled={page === 0}              >‹ Prev</button>
            <span>Page {page + 1} of {totalPages}</span>
            <button className="ar-page-btn" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next ›</button>
          </div>
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
                          style={{ height: "30px", padding: "0 8px", fontSize: "12px", border: "1px solid #d1d5db", borderRadius: "3px", outline: "none", flex: 1, minWidth: "150px" }}
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
                      style={{ height: "30px", padding: "0 8px", fontSize: "12px", border: "1px solid #d1d5db", borderRadius: "3px", outline: "none", background: "#f3f4f6", color: "#666" }}
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
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", padding: "14px 20px", borderTop: "1px solid #e5e7eb" }}>
          <button className="ar-btn ar-btn-secondary" onClick={() => setDialogOpen(false)}>Cancel</button>
          <button className="ar-btn ar-btn-primary" onClick={handleSubmit}>{editingId ? "Update" : "Add"}</button>
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
