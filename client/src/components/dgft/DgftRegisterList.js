import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,

} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import "./dgft.scss";

// ===================== Constants =====================

const CATEGORY_OPTIONS = [
  "IEC",
  "RCMC",
  "ADV AUTHORIZATION",
  "AMENDMEND OF ADV AUTHORIZATION",
  "REVALIDATION OF ADV AUTHORIZATION",
  "EO EXTENSION OF ADV AUTHORIZATION",
  "SURRENDER OF ADV AUTHORIZATION",
  "EODC OF ADV AUTHORIZATION",
  "EPCG AUTHORIZATION",
  "AMENDMEND OF EPCG AUTHORIZATION",
  "INSTALLATION OF EPCG AUTHORIZATION",
  "BLOCK WISE EXTENSION",
  "EO PERIOD EXTENSION",
  "SURRENDER OF EPCG AUTHORIZATION",
  "EODC OF EPCG AUTHORIZATION",
];

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
  licence_no_date: "",
  matter_closed_date: "",
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
  "matter_closed_date",
  "accounts_inv_date",
]);

// All fields with label and optional type
const FIELDS = [
  { key: "sr_no", label: "Sr No" },
  { key: "job_no", label: "JOB No." },
  { key: "job_status", label: "Job Status" },
  { key: "date", label: "Date", type: "date" },
  { key: "party_name", label: "Party's Name" },
  {
    key: "category",
    label: "Category",
    select: true,
    options: CATEGORY_OPTIONS,
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
  { key: "licence_no_date", label: "Licence No & Date" },
  { key: "matter_closed_date", label: "Closed Date", type: "date" },
  { key: "docs_handed_over_to_ac", label: "Docs to A/c Dept." },
  { key: "remarks", label: "Remarks" },
  { key: "accounts_inv_no", label: "Acc INV No." },
  { key: "accounts_inv_date", label: "Acc INV Date", type: "date" },
];

// Grouped column definitions for the table header
const COLUMN_GROUPS = [
  {
    group: "Actions",
    colSpan: 1,
    columns: [{ key: "_actions", label: "Actions", width: 90 }],
  },
  {
    group: "Job Info",
    colSpan: 3,
    columns: [
      { key: "sr_no", label: "Sr", width: 40 },
      { key: "job_no", label: "Job No.", width: 80 },
      { key: "job_status", label: "Status", width: 80 },
    ],
  },
  {
    group: "Party & Category",
    colSpan: 3,
    columns: [
      { key: "date", label: "Date", width: 85 },
      { key: "party_name", label: "Party Name", width: 160 },
      { key: "category", label: "Category", width: 130 },
    ],
  },
  {
    group: "Licence / CIF",
    colSpan: 2,
    columns: [
      { key: "licence_cif_value", label: "Value", width: 100 },
      { key: "licence_no_date", label: "No. & Date", width: 120 },
    ],
  },
  {
    group: "Dates / DGFT",
    colSpan: 3,
    columns: [
      { key: "docs_received_date", label: "Docs Recvd", width: 90 },
      { key: "application_prepared_on", label: "App. Prepared", width: 95 },
      { key: "submitted_at_dgft_on", label: "At DGFT", width: 90 },
    ],
  },
  {
    group: "EFT / BID",
    colSpan: 3,
    columns: [
      { key: "eft_amount", label: "EFT Amt", width: 80 },
      { key: "bid_no", label: "BID No", width: 80 },
      { key: "bid_date", label: "BID Date", width: 85 },
    ],
  },
  {
    group: "File / Officers",
    colSpan: 5,
    columns: [
      { key: "file_no_key_no", label: "File/Key", width: 80 },
      { key: "file_date", label: "Date", width: 85 },
      { key: "dh", label: "D/H", width: 50 },
      { key: "ft_do", label: "F/T", width: 50 },
      { key: "adg", label: "ADG", width: 50 },
    ],
  },
  {
    group: "Completion",
    colSpan: 3,
    columns: [
      { key: "d_dg", label: "D.DG", width: 50 },
      { key: "matter_closed_date", label: "Closed", width: 85 },
      { key: "docs_handed_over_to_ac", label: "To A/c", width: 80 },
    ],
  },
  {
    group: "Accounts / Remarks",
    colSpan: 3,
    columns: [
      { key: "remarks", label: "Remarks", width: 130 },
      { key: "accounts_inv_no", label: "INV No.", width: 85 },
      { key: "accounts_inv_date", label: "INV Date", width: 85 },
    ],
  },
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
    minWidth: "200px",
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
  th: {
    padding: "8px 6px",
    textAlign: "left",
    fontWeight: "700",
    fontSize: "13px",
    color: "#ffffff",
    borderBottom: "1px solid #dbdbdb",
    borderRight: "1px solid #dbdbdb",
    whiteSpace: "normal",
    wordBreak: "break-word",
    verticalAlign: "top",
    top: 0,
    zIndex: 10,
  },
  td: {
    padding: "5px 6px",
    borderBottom: "1px solid #dbdbdb",
    color: "#1f2937",
    whiteSpace: "normal",
    wordBreak: "break-word",
    verticalAlign: "middle",
  },
  message: {
    padding: "40px",
    textAlign: "center",
    color: "#9ca3af",
    fontStyle: "italic",
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });
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

  useEffect(() => {
    getData();
  }, [getData]);

  // Validation
  const validate = () => {
    const errs = {};
    DATE_FIELDS.forEach((key) => {
      const val = formData[key];
      if (val && val.trim() !== "") {
        // Must be a valid date (YYYY-MM-DD from input type=date)
        if (isNaN(Date.parse(val))) {
          errs[key] = "Invalid date";
        }
      }
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

  // Filter rows by search
  const filtered = rows.filter((row) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (row.job_no || "").toLowerCase().includes(q) ||
      (row.party_name || "").toLowerCase().includes(q) ||
      (row.category || "").toLowerCase().includes(q) ||
      (row.sr_no || "").toLowerCase().includes(q)
    );
  });

  // Flatten columns for cell rendering
  const flatCols = COLUMN_GROUPS.flatMap((g) => g.columns);

  return (
    <div>
      {/* Toolbar */}
      <div style={s.toolbar}>
        <div style={s.toolbarLeft}>
          <input
            type="text"
            placeholder="Search by Job No, Party, Category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={s.input}
          />
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
            {/* Group header row */}
            <tr className="header-group">
              {COLUMN_GROUPS.map((g, i) => (
                <th key={i} colSpan={g.colSpan}>
                  {g.group}
                </th>
              ))}
            </tr>
            {/* Sub header row */}
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
            {filtered.length === 0 ? (
              <tr className="dgft-empty-row">
                <td colSpan={flatCols.length}>No records found</td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row._id}>
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
                    return <td key={col.key}>{row[col.key] || ""}</td>;
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
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
            {FIELDS.map((field) => (
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
