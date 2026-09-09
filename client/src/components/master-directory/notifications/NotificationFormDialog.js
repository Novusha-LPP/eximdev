import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  Typography,
  Alert,
  CircularProgress
} from "@mui/material";
import axios from "axios";

const DUTY_HEADS_MAP = {
  b: [
    { code: "BCD", label: "BCD - Basic Customs Duty" },
    { code: "CVD_05", label: "CVD_05 - Countervailing 05%" },
    { code: "SWS", label: "SWS - Social Welfare Surcharge" },
    { code: "SAD", label: "SAD - Special Additional Duty" },
    { code: "IGST", label: "IGST - Integrated Goods & Services Tax" },
    { code: "G. CESS", label: "G. CESS - GST Compensation Cess" },
    { code: "ADD", label: "ADD - Anti-Dumping Duty" },
    { code: "CVD", label: "CVD - Excise CVD" },
    { code: "SG", label: "SG - Safeguard Duty" },
    { code: "T. VALUE", label: "T. VALUE - Tariff Value Assessment" }
  ],
  c: [
    { code: "CAIDC", label: "CAIDC - Customs AIDC (Agriculture)" },
    { code: "EAIDC", label: "EAIDC - Excise AIDC" },
    { code: "CUS EDC", label: "CUS EDC - Customs Education Cess" },
    { code: "CUS HEC", label: "CUS HEC - Higher Education Cess" },
    { code: "NCD", label: "NCD - National Calamity Contingent Duty" },
    { code: "CHCESS", label: "CHCESS - Clean Energy / Coal Cess" },
    { code: "TTA", label: "TTA - Textile Additional Duty" },
    { code: "SP EXD", label: "SP EXD - Special Excise Duty" },
    { code: "CESS", label: "CESS - General Customs Cess" },
    { code: "AGGR", label: "AGGR - Aggregate Duty" }
  ],
  d: [
    { code: "OTHCUS", label: "OTHCUS - Other Customs Duty" },
    { code: "OTHCVD", label: "OTHCVD - Other Countervailing Duty" },
    { code: "PETR CUS", label: "PETR CUS - Petroleum Customs Duty" },
    { code: "INFRA CES", label: "INFRA CES - Road & Infrastructure Cess (RIC)" },
    { code: "CUS CVD", label: "CUS CVD - Customs CVD" }
  ]
};

export default function NotificationFormDialog({
  open,
  onClose,
  section = "b",
  editingNotification = null,
  onSuccess
}) {
  const isEdit = Boolean(editingNotification);
  const API_BASE = process.env.REACT_APP_API_STRING || "";

  const [formData, setFormData] = useState({
    notn_no: "",
    notn_sno: "",
    duty_head: "",
    cth_code: "",
    current_rate: "",
    rate_type: "PERCENTAGE",
    unit: "%",
    current_duty_flag: "",
    description: "",
    coo: "ALL"
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (editingNotification) {
      setFormData({
        notn_no: editingNotification.notn_no || "",
        notn_sno: editingNotification.notn_sno || "",
        duty_head: editingNotification.duty_head || "",
        cth_code: editingNotification.cth_code || "ALL",
        current_rate: editingNotification.current_rate ?? "",
        rate_type: editingNotification.rate_type || "PERCENTAGE",
        unit: editingNotification.unit || "%",
        current_duty_flag: editingNotification.current_duty_flag || "",
        description: editingNotification.description || "",
        coo: editingNotification.coo || "ALL"
      });
    } else {
      const defaultHeads = DUTY_HEADS_MAP[section] || [];
      setFormData({
        notn_no: "",
        notn_sno: "",
        duty_head: defaultHeads[0]?.code || "",
        cth_code: "ALL",
        current_rate: "",
        rate_type: "PERCENTAGE",
        unit: "%",
        current_duty_flag: "",
        description: "",
        coo: "ALL"
      });
    }
    setErrorMsg("");
  }, [editingNotification, section, open]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.notn_no.trim() || !formData.duty_head) {
      setErrorMsg("Notification No and Duty Head are required fields.");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      if (isEdit) {
        const res = await axios.put(
          `${API_BASE}/notifications/${section}/${editingNotification._id}`,
          formData
        );
        if (res.data.success) {
          if (onSuccess) onSuccess(res.data.data);
          onClose();
        }
      } else {
        const res = await axios.post(`${API_BASE}/notifications/${section}`, formData);
        if (res.data.success) {
          if (onSuccess) onSuccess(res.data.data);
          onClose();
        }
      }
    } catch (err) {
      console.error("Error saving notification:", err);
      setErrorMsg(err.response?.data?.message || err.message || "Failed to save notification.");
    } finally {
      setSaving(false);
    }
  };

  const dutyHeadOptions = DUTY_HEADS_MAP[section] || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {isEdit ? "Edit Notification Rule" : `Add New Section ${section.toUpperCase()} Notification`}
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ background: "#f8fafc" }}>
          {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}

          <Grid container spacing={2}>
            {/* Notification Number */}
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                size="small"
                label="Notification No"
                placeholder="e.g. 050/2017 or 001/2017-IGST"
                value={formData.notn_no}
                onChange={(e) => handleChange("notn_no", e.target.value)}
                disabled={isEdit}
                sx={{ background: "#ffffff" }}
              />
            </Grid>

            {/* Notification Serial Number */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Notification Serial No"
                placeholder="e.g. 530, 1, or N/A"
                value={formData.notn_sno}
                onChange={(e) => handleChange("notn_sno", e.target.value)}
                disabled={isEdit}
                sx={{ background: "#ffffff" }}
              />
            </Grid>

            {/* Duty Head */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" sx={{ background: "#ffffff" }}>
                <InputLabel id="duty-head-select-label">Duty Head</InputLabel>
                <Select
                  labelId="duty-head-select-label"
                  label="Duty Head"
                  value={formData.duty_head}
                  onChange={(e) => handleChange("duty_head", e.target.value)}
                  disabled={isEdit}
                >
                  {dutyHeadOptions.map((head) => (
                    <MenuItem key={head.code} value={head.code}>
                      {head.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* CTH Code */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="CTH / Tariff Code"
                placeholder="e.g. 84713010, 2701, or ALL"
                value={formData.cth_code}
                onChange={(e) => handleChange("cth_code", e.target.value)}
                disabled={isEdit}
                sx={{ background: "#ffffff" }}
              />
            </Grid>

            {/* Current Rate */}
            <Grid item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                size="small"
                label="Effective Duty Rate"
                placeholder="e.g. 7.5 or 400"
                type="number"
                step="any"
                value={formData.current_rate}
                onChange={(e) => handleChange("current_rate", e.target.value)}
                sx={{ background: "#ffffff" }}
              />
            </Grid>

            {/* Rate Type */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small" sx={{ background: "#ffffff" }}>
                <InputLabel id="rate-type-select-label">Rate Type</InputLabel>
                <Select
                  labelId="rate-type-select-label"
                  label="Rate Type"
                  value={formData.rate_type}
                  onChange={(e) => {
                    const type = e.target.value;
                    handleChange("rate_type", type);
                    if (type === "PERCENTAGE") handleChange("unit", "%");
                  }}
                >
                  <MenuItem value="PERCENTAGE">Percentage (%)</MenuItem>
                  <MenuItem value="SPECIFIC">Specific Duty (e.g. ₹/MT)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Unit */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Unit / Suffix"
                placeholder="e.g. %, INR/MT, INR/LTR"
                value={formData.unit}
                onChange={(e) => handleChange("unit", e.target.value)}
                sx={{ background: "#ffffff" }}
              />
            </Grid>

            {/* Duty Flag */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Duty Flag / Exemption Type"
                placeholder="e.g. E (Exemption), S (Standard), P (Preferential)"
                value={formData.current_duty_flag}
                onChange={(e) => handleChange("current_duty_flag", e.target.value)}
                sx={{ background: "#ffffff" }}
              />
            </Grid>

            {/* Country of Origin (COO) */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Country of Origin (COO / FTA)"
                placeholder="e.g. ALL, AE (UAE), JP (Japan), ASEAN"
                value={formData.coo}
                onChange={(e) => handleChange("coo", e.target.value)}
                sx={{ background: "#ffffff" }}
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label="Goods / Exemption Description"
                placeholder="Description of applicable items, end-use conditions, or gazette notes"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                sx={{ background: "#ffffff" }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving && <CircularProgress size={16} color="inherit" />}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {isEdit ? "Save Changes" : "Create Notification"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
