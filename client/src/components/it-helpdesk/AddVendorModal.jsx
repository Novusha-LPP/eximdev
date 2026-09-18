import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Typography,
} from "@mui/material";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";

const VENDOR_TYPES = [
  "Supplier",
  "Service Provider",
  "Hardware",
  "Software",
  "Network",
  "Transporter",
  "CHA",
  "Shipping Line",
  "Other",
];

const STATUS_OPTIONS = ["Active", "Inactive"];

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export const validateVendorField = (fieldName, value) => {
  const val = typeof value === "string" ? value.trim() : "";
  switch (fieldName) {
    case "name":
      if (!val) return "Company / Vendor name is required";
      return "";
    case "contact_person":
      if (!val) return "Contact person name is required";
      return "";
    case "mobile_number":
      if (!val) return "Mobile number is required";
      if (!MOBILE_REGEX.test(val)) {
        return "Must be 10 digits starting with 6, 7, 8, or 9";
      }
      return "";
    case "email":
      if (!val) return "Email address is required";
      if (!EMAIL_REGEX.test(val)) {
        return "Invalid email format (e.g. name@domain.com)";
      }
      return "";
    case "gst_number":
      if (val) {
        if (!GSTIN_REGEX.test(val.toUpperCase())) {
          return "Invalid GSTIN format (e.g. 24AAAAA0000A1Z5 - 15 characters)";
        }
      }
      return "";
    case "pan_number":
      if (val) {
        if (!PAN_REGEX.test(val.toUpperCase())) {
          return "Invalid PAN format (e.g. AAAAA0000A - 10 characters)";
        }
      }
      return "";
    case "ifsc_code":
      if (val) {
        if (!IFSC_REGEX.test(val.toUpperCase())) {
          return "Invalid IFSC format (e.g. HDFC0000123 - 11 characters)";
        }
      }
      return "";
    default:
      return "";
  }
};

export const validateVendorForm = (formData) => {
  const errors = {};
  const fields = ["name", "contact_person", "mobile_number", "email", "gst_number", "pan_number", "ifsc_code"];
  fields.forEach((field) => {
    const error = validateVendorField(field, formData[field]);
    if (error) {
      errors[field] = error;
    }
  });
  return errors;
};

const EMPTY_FORM = {
  name: "",
  vendor_type: "Supplier",
  gst_number: "",
  pan_number: "",
  contact_person: "",
  mobile_number: "",
  email: "",
  bank_name: "",
  bank_branch: "",
  ifsc_code: "",
  account_no: "",
  status: "Active",
};

export default function AddVendorModal({ isOpen, onClose, onSuccess, defaultVendorType = "Supplier" }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, vendor_type: defaultVendorType });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    const error = validateVendorField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleClose = () => {
    if (saving) return;
    setForm({ ...EMPTY_FORM, vendor_type: defaultVendorType });
    setErrors({});
    if (onClose) onClose();
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    const validationErrors = validateVendorForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstErrorMessage = Object.values(validationErrors)[0];
      toast.error(firstErrorMessage || "Please fix validation errors before submitting");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        vendor_type: form.vendor_type || "Supplier",
        type: form.vendor_type || "Supplier",
        gst_number: form.gst_number?.trim().toUpperCase() || "",
        pan_number: form.pan_number?.trim().toUpperCase() || "",
        contact_person: form.contact_person.trim(),
        mobile_number: form.mobile_number.trim(),
        email: form.email.trim().toLowerCase(),
        bank_name: form.bank_name?.trim() || "",
        bank_branch: form.bank_branch?.trim() || "",
        ifsc_code: form.ifsc_code?.trim().toUpperCase() || "",
        account_no: form.account_no?.trim() || "",
        status: form.status || "Active",
      };

      const res = await itHelpdeskAPI.vendors.create(payload);
      const createdVendor = res?.data || res;

      toast.success("Vendor created successfully");
      setForm({ ...EMPTY_FORM, vendor_type: defaultVendorType });
      setErrors({});

      if (onSuccess) {
        onSuccess(createdVendor);
      }
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error("Vendor save failed:", err);
      const serverMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to create vendor";

      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
      toast.error(serverMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={Boolean(isOpen)}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      sx={{
        zIndex: 1450,
      }}
      PaperProps={{
        sx: {
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
        },
      }}
    >
      {/* Modal Header */}
      <Box
        sx={{
          padding: "16px 20px",
          background: "linear-gradient(to right, #0f172a, #1e293b)",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography sx={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>
            ✨ Add New Vendor / Supplier
          </Typography>
          <Typography sx={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>
            Enter contact and registration information for the partner
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            background: "rgba(255, 255, 255, 0.1)",
            color: "#ffffff",
            "&:hover": { background: "rgba(255, 255, 255, 0.2)" },
          }}
        >
          <X size={16} />
        </IconButton>
      </Box>

      {/* Modal Body */}
      <form onSubmit={handleSave} noValidate>
        <DialogContent sx={{ p: 2.5 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div className="form-field" style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Company / Vendor Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Paramount Tech Solutions Pvt Ltd"
                value={form.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: errors.name ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: "#ffffff",
                  ...(errors.name ? { boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.15)" } : {}),
                }}
              />
              {errors.name && (
                <span style={{ color: "#ef4444", fontSize: "11.5px", marginTop: "4px", display: "block", fontWeight: 500 }}>
                  {errors.name}
                </span>
              )}
            </div>

            <div className="form-field">
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Vendor Type
              </label>
              <select
                value={form.vendor_type}
                onChange={(e) => handleFieldChange("vendor_type", e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: "#ffffff",
                }}
              >
                {VENDOR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => handleFieldChange("status", e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: "#ffffff",
                }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                GST Number
              </label>
              <input
                type="text"
                placeholder="24AAAAA0000A1Z5"
                maxLength={15}
                value={form.gst_number}
                onChange={(e) => handleFieldChange("gst_number", e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: errors.gst_number ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: "#ffffff",
                  ...(errors.gst_number ? { boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.15)" } : {}),
                }}
              />
              {errors.gst_number && (
                <span style={{ color: "#ef4444", fontSize: "11.5px", marginTop: "4px", display: "block", fontWeight: 500 }}>
                  {errors.gst_number}
                </span>
              )}
            </div>

            <div className="form-field">
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                PAN Number
              </label>
              <input
                type="text"
                placeholder="AAAAA0000A"
                maxLength={10}
                value={form.pan_number}
                onChange={(e) => handleFieldChange("pan_number", e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: errors.pan_number ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: "#ffffff",
                  ...(errors.pan_number ? { boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.15)" } : {}),
                }}
              />
              {errors.pan_number && (
                <span style={{ color: "#ef4444", fontSize: "11.5px", marginTop: "4px", display: "block", fontWeight: 500 }}>
                  {errors.pan_number}
                </span>
              )}
            </div>

            <div className="form-field">
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Contact Person *
              </label>
              <input
                type="text"
                placeholder="Mr. Rajesh Kumar"
                value={form.contact_person}
                onChange={(e) => handleFieldChange("contact_person", e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: errors.contact_person ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: "#ffffff",
                  ...(errors.contact_person ? { boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.15)" } : {}),
                }}
              />
              {errors.contact_person && (
                <span style={{ color: "#ef4444", fontSize: "11.5px", marginTop: "4px", display: "block", fontWeight: 500 }}>
                  {errors.contact_person}
                </span>
              )}
            </div>

            <div className="form-field">
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Mobile Number *
              </label>
              <input
                type="text"
                placeholder="9876543210"
                maxLength={10}
                value={form.mobile_number}
                onChange={(e) => handleFieldChange("mobile_number", e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: errors.mobile_number ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: "#ffffff",
                  ...(errors.mobile_number ? { boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.15)" } : {}),
                }}
              />
              {errors.mobile_number && (
                <span style={{ color: "#ef4444", fontSize: "11.5px", marginTop: "4px", display: "block", fontWeight: 500 }}>
                  {errors.mobile_number}
                </span>
              )}
            </div>

            <div className="form-field" style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Email Address *
              </label>
              <input
                type="email"
                placeholder="rajesh@paramount.com"
                value={form.email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: errors.email ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: "#ffffff",
                  ...(errors.email ? { boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.15)" } : {}),
                }}
              />
              {errors.email && (
                <span style={{ color: "#ef4444", fontSize: "11.5px", marginTop: "4px", display: "block", fontWeight: 500 }}>
                  {errors.email}
                </span>
              )}
            </div>

            {/* Banking & Payment Details Section */}
            <div style={{ gridColumn: "span 2", marginTop: "4px", paddingTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                🏦 Banking & Payment Details
              </span>
            </div>

            <div className="form-field">
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Bank Name
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank"
                value={form.bank_name}
                onChange={(e) => handleFieldChange("bank_name", e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: "#ffffff",
                }}
              />
            </div>

            <div className="form-field">
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Bank Branch Name
              </label>
              <input
                type="text"
                placeholder="e.g. Navrangpura Branch"
                value={form.bank_branch}
                onChange={(e) => handleFieldChange("bank_branch", e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: "#ffffff",
                }}
              />
            </div>

            <div className="form-field">
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                IFSC Code
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC0000123"
                maxLength={11}
                value={form.ifsc_code}
                onChange={(e) => handleFieldChange("ifsc_code", e.target.value.toUpperCase())}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: errors.ifsc_code ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: "#ffffff",
                  ...(errors.ifsc_code ? { boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.15)" } : {}),
                }}
              />
              {errors.ifsc_code && (
                <span style={{ color: "#ef4444", fontSize: "11.5px", marginTop: "4px", display: "block", fontWeight: 500 }}>
                  {errors.ifsc_code}
                </span>
              )}
            </div>

            <div className="form-field">
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Account No.
              </label>
              <input
                type="text"
                placeholder="e.g. 50200012345678"
                value={form.account_no}
                onChange={(e) => handleFieldChange("account_no", e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: "#ffffff",
                }}
              />
            </div>
          </div>
        </DialogContent>

        {/* Modal Footer */}
        <DialogActions
          sx={{
            px: 2.5,
            py: 2,
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            display: "flex",
            justifyContent: "flex-end",
            gap: 1.5,
          }}
        >
          <button
            type="button"
            onClick={handleClose}
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
            disabled={saving}
            style={{
              height: "38px",
              padding: "0 20px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontWeight: 600,
              fontSize: "13.5px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              border: "none",
              color: "#ffffff",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
              margin: 0,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving..." : "Create Vendor"}
          </button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
