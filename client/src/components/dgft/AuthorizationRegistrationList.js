import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  category: "",
  licence_no: "",
  licence_date: "",
  licence_amount: "",
  lic_recd_from_party: "",
  date_send_to_icd_ports: "",
  bond_challan_amount: "",
  iec_no: "",
  completed: "",
  registration_date: "",
  month: "",
  billing_done_or_not: "",
  bill_number: "",
  bg_number: "",
  bg_amount: "",
  bg_date: "",
  bg_expiry_date: "",
  bond_number: "",
  bond_date: "",
  port_code: "",
};

const DATE_FIELDS = new Set([
  "date", "licence_date", "date_send_to_icd_ports",
  "registration_date", "bg_date", "bg_expiry_date", "bond_date",
  "lic_recd_from_party", "completed", "billing_done_or_not",
]);

const CATEGORY_OPTIONS = [
  "ADVANCE AUTHORIZATION",
  "Amendment of advance Authorization",
  "Revalidation of advance Authorization",
  "EO", "EODC", "Surrender",
  "EPCG Authorization", "Amendment of EPCG Authorization",
  "EPCG block extension", "EPCG overall period extension",
  "EODC of EPCG Authorization", "Surrender of EPCG Authorization",
  "RCMC application", "IEC application",
];

const DEFAULT_JOB_TYPE_OPTIONS = [
  "AA", "EPCG", "BOND AA", "BOND EPCG", "BG AA", "BG EPCG",
  "BOND CANCELLATION AA", "BOND CANCELLATION EPCG",
  "Non utilization certificate",
];

const PORT_CODE_OPTIONS = [
  "INAMD4", "INSBI6", "INSAU6", "INAKV6", "INVRM6", "INMUN1", "INKDL6", "INHZA1"
];

const JOB_STATUS_OPTIONS = [
  "Completed", "Pending", "Processed",
  "Documents Received", "Send to ICD", "Billing", "Closed", "Open",
];

const ROWS_PER_PAGE_OPTIONS = [25, 50, 100];

const SUBROW_FIELDS = [
  { key: "import_validity",        label: "Import Validity" },
  { key: "export_validity",        label: "Export Validity" },
  { key: "hs_code",                label: "HS Code" },
  { key: "item_description",       label: "Import Item Description" },
  { key: "export_item_description", label: "Export Item Description" },
  { key: "value_usd",              label: "Value USD" },
  { key: "value_rs",               label: "Value Rs" },
  { key: "qty",                    label: "Qty" },
  { key: "utilized_qty",           label: "Utilized Qty" },
  { key: "balance_qty",            label: "Balance Qty" },
  { key: "boe_details",            label: "BOE Details" },
  { key: "sb_details",             label: "SB Details" },
  { key: "documents_received_date",label: "Documents Received Date" },
  { key: "documents_send_to_icd",  label: "Documents Send to ICD" },
  { key: "documents_send_to_account", label: "Documents Send to Account" },
];

// Form fields for dialog
const FIELDS = [
  { key: "job_no",               label: "JOB No" },
  { key: "date",                 label: "Date", type: "date" },
  { key: "job_type",             label: "Job Category", select: true, allowCustom: true },
  { key: "party_name",           label: "Firm Name" },
  { key: "iec_no",               label: "IEC Number" },
  { key: "licence_no",           label: "Authorization Number" },
  { key: "licence_date",         label: "Auth Date", type: "date" },
  { key: "import_validity",      label: "Import Validity", type: "date" },
  { key: "export_validity",      label: "Export Validity", type: "date" },
  { key: "bg_number",            label: "BG Number" },
  { key: "bg_amount",            label: "BG Amount" },
  { key: "bg_date",              label: "BG Date", type: "date" },
  { key: "bg_expiry_date",       label: "BG Expiry Date", type: "date" },
  { key: "bond_number",          label: "Bond Number" },
  { key: "bond_date",            label: "Bond Date", type: "date" },
  { key: "job_status",           label: "Job Status", select: true, options: JOB_STATUS_OPTIONS },
  // { key: "port_name",            label: "Port Name" },
  // { key: "category",             label: "Category", select: true, allowCustom: true },
  { key: "licence_amount",       label: "Licence Amount" },
  { key: "lic_recd_from_party",  label: "Lic. Recd From Party", type: "date" },
  { key: "date_send_to_icd_ports", label: "Send to ICDs/Ports", type: "date" },
  { key: "bond_challan_amount",   label: "Bond / Challan Amount" },
  { key: "completed",            label: "Completed", type: "date" },
  { key: "registration_date",    label: "Registration Date", type: "date" },
  // { key: "month",                label: "Month" },
  { key: "billing_done_or_not",  label: "Billing Done", type: "date" },
  { key: "bill_number",          label: "Bill Number" },
  { key: "port_code",            label: "Port Code", select: true, options: PORT_CODE_OPTIONS },
];

// Table columns — per image 1 (no Sr No, actions first)
const TABLE_COLUMNS = [
  { key: "job_no",       label: "JOB NUMBER",          width: 120 },
  { key: "date",         label: "DATE",                width: 100 },
  { key: "party_name",   label: "FIRM NAME",           width: 200 },
  { key: "iec_no",       label: "IEC NAME",            width: 150 },
  { key: "licence_no",   label: "AUTHORIZATION NUMBER",width: 180 },
  { key: "licence_date", label: "AUTHORIZATION DATE",  width: 110 },
  { key: "bg_number",    label: "BG NUMBER",           width: 130 },
  { key: "port_code",    label: "PORT CODE",           width: 100 },
  { key: "job_status",   label: "JOB STATUS",          width: 140 },
  { key: "documents_send_to_accounts", label: "DOCUMENTS DATE SEND TO ACCOUNTS", width: 220 },
  { key: "_actions",     label: "ACTIONS",             width: 100 },
];




// Status badge — mono font, colour-coded with border
function StatusBadge({ value }) {
  if (!value) return <span style={{ color: "#a0aab8" }}>—</span>;
  const cls = {
    completed:           "s-completed",
    pending:             "s-pending",
    processed:           "s-processed",
    billing:             "s-billing",
    closed:              "s-closed",
    open:                "s-open",
    "documents received": "s-docs",
    "send to icd":       "s-icd",
  }[value.toLowerCase()] || "s-default";
  return <span className={`ar-status ${cls}`}>{value}</span>;
}

// Sort icon
function SortIcon({ dir }) {
  return (
    <span className="ar-sort-icon">
      {dir === "asc" ? "↑" : dir === "desc" ? "↓" : "↕"}
    </span>
  );
}

// ===================== Toast =====================
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (toast.open) { const t = setTimeout(() => onClose(), 4000); return () => clearTimeout(t); }
  }, [toast.open, onClose]);
  if (!toast.open) return null;
  return (
    <div className={`dgft-toast ${toast.severity}`}>
      {toast.message}<button onClick={onClose}>✕</button>
    </div>
  );
}

// ===================== CustomSelectField =====================
function CustomSelectField({ label, fieldKey, value, options, onChange, inputValue, onInputChange, onAdd, placeholder, error }) {
  return (
    <div className="dgft-form-group">
      <label>{label}</label>
      <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
        <select value={value} onChange={(e) => onChange(fieldKey, e.target.value)}>
          <option value="">-- Select {label} --</option>
          {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <div style={{ display: "flex", gap: "4px" }}>
          <input
            type="text" placeholder={placeholder} value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && onAdd()}
            style={{ height: "30px", padding: "0 8px", fontSize: "12px", border: "1px solid #d1d5db", borderRadius: "3px", outline: "none", flex: 1 }}
          />
          <button onClick={onAdd} style={{ padding: "4px 10px", background: "#10b981", color: "white", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "12px" }}>Add</button>
        </div>
      </div>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

// SubRow removed in favor of separate page view





// ===================== Main Component =====================
function AuthorizationRegistrationList({ onCountChange }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [filterJobType, setFilterJobType]   = useState("");
  const [filterFirmName, setFilterFirmName] = useState("");
  const [filterIec, setFilterIec]           = useState("");
  const [filterStatus, setFilterStatus]     = useState("");
  const [filterPortCode, setFilterPortCode] = useState("");
  const [sort, setSort] = useState({ key: null, dir: null });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [formData, setFormData]     = useState(INITIAL_FORM);
  const [errors, setErrors]         = useState({});
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [page, setPage]               = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [availableCategories, setAvailableCategories]     = useState(CATEGORY_OPTIONS);
  const [categoryInput, setCategoryInput]                 = useState("");
  const [availableJobTypeOptions, setAvailableJobTypeOptions] = useState(DEFAULT_JOB_TYPE_OPTIONS);
  const [jobTypeInput, setJobTypeInput] = useState("");
  const fileInput = React.useRef(null);
  const navigate = React.useCallback(useNavigate(), []);

  const getData = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-authorization-registrations`);
      const sorted = res.data.sort((a, b) =>
        String(a.job_no || "").localeCompare(String(b.job_no || ""), undefined, { numeric: true })
      );
      setRows(sorted);
      if (onCountChange) onCountChange(sorted.length);
    } catch (err) { console.error(err); }
  }, [onCountChange]);

  const getCategories = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-auth-reg-categories`);
      setAvailableCategories(Array.from(new Set([...CATEGORY_OPTIONS, ...res.data])));
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { getData(); getCategories(); }, [getData, getCategories]);

  // Unique filter options derived from data
  const filterOptions = useMemo(() => {
    const jt = new Set(DEFAULT_JOB_TYPE_OPTIONS);
    const fn = new Set();
    const ic = new Set();
    const st = new Set(JOB_STATUS_OPTIONS);
    rows.forEach((r) => {
      if (r.job_type?.trim())   jt.add(r.job_type.trim());
      if (r.party_name?.trim()) fn.add(r.party_name.trim());
      if (r.iec_no?.trim())     ic.add(r.iec_no.trim());
      if (r.job_status?.trim()) st.add(r.job_status.trim());
    });
    return {
      job_type:   Array.from(jt).sort(),
      party_name: Array.from(fn).sort(),
      iec_no:     Array.from(ic).sort(),
      job_status: Array.from(st).sort(),
      port_code:  PORT_CODE_OPTIONS,
    };
  }, [rows]);

  const validate = () => {
    const errs = {};
    DATE_FIELDS.forEach((key) => {
      const val = formData[key];
      if (val && val.trim() && isNaN(Date.parse(val))) errs[key] = "Invalid date";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const getNextJobNo = () => {
    let maxNum = 0;
    rows.forEach((r) => {
      const m = (r.job_no || "").match(/\/(\d+)$/);
      if (m && parseInt(m[1], 10) > maxNum) maxNum = parseInt(m[1], 10);
    });
    return `LIC/${maxNum + 1}`;
  };

  const handleOpenAdd = () => {
    setFormData({ ...INITIAL_FORM, job_no: getNextJobNo() });
    setEditingId(null); setErrors({}); setCategoryInput(""); setJobTypeInput(""); setDialogOpen(true);
  };

  const handleOpenEdit = (row) => {
    setEditingId(row._id);
    const data = {};
    FIELDS.forEach((f) => { data[f.key] = row[f.key] || ""; });
    setFormData(data); setErrors({}); setCategoryInput(""); setJobTypeInput(""); setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_STRING}/delete-authorization-registration/${id}`);
      showToast("Record deleted", "success");
      getData();
    } catch (err) { console.error(err); showToast("Delete failed", "error"); }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("ARE YOU SURE? This will permanently delete ALL records in this tab.")) return;
    if (!window.confirm("Final confirmation: This action cannot be undone. Delete all?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_STRING}/delete-all-authorization-registrations`);
      showToast("All records deleted", "success");
      getData();
    } catch (err) { console.error(err); showToast("Bulk delete failed", "error"); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_STRING}/update-authorization-registration/${id}`, { job_status: newStatus });
      setRows((prev) => prev.map((r) => (r._id === id ? { ...r, job_status: newStatus } : r)));
      showToast("Status updated", "success");
    } catch (err) { console.error(err); showToast("Failed to update status", "error"); }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      if (editingId) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/update-authorization-registration/${editingId}`, formData);
        showToast("Record updated", "success");
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/add-authorization-registration`, formData);
        showToast("Record added", "success");
      }
      setDialogOpen(false); getData();
    } catch (err) { console.error(err); showToast("Operation failed", "error"); }
  };

  const handleChange = (key, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value };
      
      // Auto-fill validity from licence_date (Auth Date)
      if (key === "licence_date" && value) {
        try {
          // Assuming date format is YYYY-MM-DD from the input type="date"
          const authDate = new Date(value);
          if (!isNaN(authDate.getTime())) {
            // Helper to format Date to YYYY-MM-DD
            const fmt = (d) => d.toISOString().split("T")[0];
            
            // Add 12 months for import, 18 months for export
            const impDate = new Date(authDate);
            impDate.setMonth(impDate.getMonth() + 12);
            
            const expDate = new Date(authDate);
            expDate.setMonth(expDate.getMonth() + 18);
            
            updated.import_validity = fmt(impDate);
            updated.export_validity = fmt(expDate);
          }
        } catch (e) {
          console.error("Validity calculation error:", e);
        }
      }
      
      return updated;
    });
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_STRING}/upload-authorization-registration-excel`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      showToast(res.data.message, "success");
      getData();
    } catch (err) { console.error(err); showToast("Excel upload failed", "error"); }
    e.target.value = "";
  };

  const showToast = (message, severity) => setToast({ open: true, message, severity });

  const handleSubRowSave = (rowId, subData) =>
    setRows((prev) => prev.map((r) => (r._id === rowId ? { ...r, ...subData } : r)));

  const handleSort = (key) =>
    setSort((prev) => ({
      key,
      dir: prev.key === key ? (prev.dir === "asc" ? "desc" : "asc") : "asc",
    }));

  useEffect(() => { setPage(0); }, [search, filterJobType, filterFirmName, filterIec, filterStatus, filterPortCode]);

  // Filter + sort
  const displayed = useMemo(() => {
    let result = rows.filter((row) => {
      if (filterJobType  && row.job_type   !== filterJobType)  return false;
      if (filterFirmName && row.party_name !== filterFirmName) return false;
      if (filterIec      && row.iec_no     !== filterIec)      return false;
      if (filterStatus   && row.job_status !== filterStatus)   return false;
      if (filterPortCode && row.port_code  !== filterPortCode) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(row.job_no     || "").toLowerCase().includes(q) &&
          !(row.party_name || "").toLowerCase().includes(q) &&
          !(row.licence_no || "").toLowerCase().includes(q) &&
          !(row.iec_no     || "").toLowerCase().includes(q)
        ) return false;
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
    return result;
  }, [rows, search, filterJobType, filterFirmName, filterIec, filterStatus, filterPortCode, sort]);

  const totalPages  = Math.ceil(displayed.length / rowsPerPage) || 1;
  const paginatedRows = displayed.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const containerRef = React.useRef(null);

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="ar-toolbar">
        <div className="ar-toolbar-left">
          <div className="ar-search-wrap">
            <input
              type="text"
              placeholder="Search Job No, Party, Auth No, IEC…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="ar-filter-select" value={filterJobType}  onChange={(e) => setFilterJobType(e.target.value)}>
            <option value="">All Job Categories</option>
            {availableJobTypeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className="ar-filter-select" value={filterFirmName} onChange={(e) => setFilterFirmName(e.target.value)}>
            <option value="">All Firms</option>
            {filterOptions.party_name.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className="ar-filter-select" value={filterIec}      onChange={(e) => setFilterIec(e.target.value)}>
            <option value="">All IEC</option>
            {filterOptions.iec_no.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className="ar-filter-select" value={filterStatus}   onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {filterOptions.job_status.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className="ar-filter-select" value={filterPortCode} onChange={(e) => setFilterPortCode(e.target.value)}>
            <option value="">All Ports</option>
            {filterOptions.port_code.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="ar-toolbar-right">
          <button className="ar-btn ar-btn-primary" onClick={handleOpenAdd}>+ Add New</button>
          <label className="ar-btn ar-btn-upload">
            ↑ Upload Excel
            <input ref={fileInput} type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} style={{ display: "none" }} />
          </label>
          <button className="ar-btn ar-btn-danger" onClick={handleDeleteAll}>🗑 Delete All</button>
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
                {TABLE_COLUMNS.map((col) => {
                  const sorted = sort.key === col.key;
                  if (col.key === "_actions") return <th key="_actions" className="ar-th-sticky ar-th-actions">ACTIONS</th>;
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
                          <td key="_actions" className="ar-td-sticky ar-td-actions" onClick={(e) => e.stopPropagation()}>
                            <div className="ar-actions-cell">
                              <button className="ar-btn ar-btn-edit ar-btn-sm" onClick={(e) => { e.stopPropagation(); handleOpenEdit(row); }}>Edit</button>
                              <button className="ar-btn ar-btn-danger ar-btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(row._id); }}>Del</button>
                            </div>
                          </td>
                        );
                      }
                      const val = row[col.key] || "";
                      if (col.key === "job_no") {
                        const sVal = String(val);
                        const displayVal = sVal.includes("/") ? sVal : `LIC/${sVal}`;
                        return (
                          <td key={col.key} onClick={(e) => { e.stopPropagation(); navigate(`/dgft/authorization-details/${row._id}`); }}>
                            <span className="ar-job-link">{displayVal}</span>
                          </td>
                        );
                      }
                      if (col.key === "job_status") {
                        return (
                          <td key={col.key} onClick={(e) => e.stopPropagation()}>
                            <select
                              value={val}
                              onChange={(e) => handleStatusChange(row._id, e.target.value)}
                              style={{ padding: "4px 8px", borderRadius: "3px", border: "1px solid #d0d7e2", width: "100%", fontSize: "11px", outline: "none", background: "#fff" }}
                            >
                              <option value="">-- Select --</option>
                              {JOB_STATUS_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </td>
                        );
                      }
                      if (col.key === "party_name") {
                        return <td key={col.key} style={{ whiteSpace: "normal", wordBreak: "break-word", maxWidth: 180 }}>{val}</td>;
                      }
                      return <td key={col.key}>{val}</td>;
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination inside table card */}
        <div className="ar-pagination">
          <div className="ar-pagination-info">
            Showing {displayed.length === 0 ? 0 : page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, displayed.length)} of {displayed.length} records
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

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          {editingId ? "Edit Record" : "Add New Record"}
          <IconButton onClick={() => setDialogOpen(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <div className="dgft-form-grid">
            {FIELDS.map((field) => {
              if (field.key === "category") {
                return (
                  <CustomSelectField
                    key={field.key} label={field.label} fieldKey={field.key}
                    value={formData[field.key]} options={availableCategories}
                    onChange={handleChange} inputValue={categoryInput}
                    onInputChange={setCategoryInput}
                    onAdd={() => {
                      const t = categoryInput.trim();
                      if (t && !availableCategories.includes(t)) { setAvailableCategories((p) => [...p, t]); showToast("Category added", "success"); setCategoryInput(""); }
                    }}
                    placeholder="Add custom category…" error={errors[field.key]}
                  />
                );
              }
              if (field.key === "job_type") {
                return (
                  <CustomSelectField
                    key={field.key} label={field.label} fieldKey={field.key}
                    value={formData[field.key]} options={availableJobTypeOptions}
                    onChange={handleChange} inputValue={jobTypeInput}
                    onInputChange={setJobTypeInput}
                    onAdd={() => {
                      const t = jobTypeInput.trim();
                      if (t && !availableJobTypeOptions.includes(t)) { setAvailableJobTypeOptions((p) => [...p, t].sort()); showToast("Job type added", "success"); setJobTypeInput(""); }
                    }}
                    placeholder="Add custom job type…" error={errors[field.key]}
                  />
                );
              }
              if (field.select && field.options) {
                return (
                  <div className="dgft-form-group" key={field.key}>
                    <label>{field.label}</label>
                    <select value={formData[field.key]} onChange={(e) => handleChange(field.key, e.target.value)}>
                      <option value="">-- Select --</option>
                      {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    {errors[field.key] && <span className="field-error">{errors[field.key]}</span>}
                  </div>
                );
              }
              return (
                <div className="dgft-form-group" key={field.key}>
                  <label>{field.label}</label>
                  <input
                    type={field.type === "date" ? "date" : "text"}
                    value={formData[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className={errors[field.key] ? "input-error" : ""}
                  />
                  {errors[field.key] && <span className="field-error">{errors[field.key]}</span>}
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

      <Toast toast={toast} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
}

export default React.memo(AuthorizationRegistrationList);
