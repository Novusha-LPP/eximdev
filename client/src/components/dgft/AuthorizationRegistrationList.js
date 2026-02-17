import React, { useEffect, useState, useCallback } from "react";
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

const FIELDS = [
  { key: "job_no", label: "JOB No" },
  { key: "date", label: "Date", type: "date" },
  { key: "party_name", label: "Party's Name" },
  { key: "job_type", label: "Job Type" },
  { key: "port_name", label: "Port Name" },
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

// Table columns (Actions first, then data)
const TABLE_COLUMNS = [
  { key: "_actions", label: "Actions", width: 90 },
  { key: "job_no", label: "JOB No", width: 90 },
  { key: "date", label: "Date", width: 85 },
  { key: "party_name", label: "Party's Name", width: 180 },
  { key: "job_type", label: "Job Type", width: 100 },
  { key: "port_name", label: "Port Name", width: 120 },
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

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

  useEffect(() => {
    getData();
  }, [getData]);

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

  const fileInput = React.useRef(null);

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

  // Filter rows
  const filtered = rows.filter((row) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (row.job_no || "").toLowerCase().includes(q) ||
      (row.party_name || "").toLowerCase().includes(q) ||
      (row.licence_no || "").toLowerCase().includes(q) ||
      (row.port_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Toolbar */}
      <div style={s.toolbar}>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="Search by Job No, Party, Licence, Port..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={s.input}
          />
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
            {filtered.length === 0 ? (
              <tr className="dgft-empty-row">
                <td colSpan={TABLE_COLUMNS.length}>No records found</td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row._id}>
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
                    return <td key={col.key}>{row[col.key] || ""}</td>;
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
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
            {FIELDS.map((field) => (
              <div className="dgft-form-group" key={field.key}>
                <label>{field.label}</label>
                <input
                  type={field.type === "date" ? "date" : "text"}
                  value={formData[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className={errors[field.key] ? "input-error" : ""}
                />
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

export default React.memo(AuthorizationRegistrationList);
