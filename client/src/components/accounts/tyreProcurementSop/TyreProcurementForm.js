import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Box,
  Tabs,
  Tab,
  Button,
  TextField,
  MenuItem,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  Chip,
} from "@mui/material";
import { Save, Cancel } from "@mui/icons-material";
import useTabs from "../../../customHooks/useTabs";
import Stage1PurchaseRequest from "./Stage1PurchaseRequest";
import Stage2SupplierQuotation from "./Stage2SupplierQuotation";
import Stage3FinanceApproval from "./Stage3FinanceApproval";
import Stage4PaymentUtr from "./Stage4PaymentUtr";
import Stage5OrderDispatch from "./Stage5OrderDispatch";
import Stage6Grn from "./Stage6Grn";

const statusOptions = [
  "Draft",
  "PR Raised",
  "Quotation Received",
  "Finance Approved",
  "Payment Done",
  "Order Placed",
  "GRN Done",
  "Closed",
];

const emptyPr = {
  prNumber: "",
  poNumber: "",
  status: "Draft",
  stage1: {
    itemsRequired: [],
    routingChecklist: [],
    hodValidation: {},
  },
  stage2: {
    suppliers: [{}, {}, {}],
    routingChecklist: [],
  },
  stage3: {
    reviewChecklist: {},
    decision: {},
    signOff: {},
  },
  stage4: {
    supplierBankDetails: {},
    paymentDetails: {},
    accountingSignOff: {},
    utrSharing: {},
  },
  stage5: {
    dispatchDetails: {},
  },
  stage6: {
    itemsReceived: [],
    qualityConformanceCheck: {},
    approvals: [],
  },
};

function TyreProcurementForm({ pr, isView, onSaved, onCancel }) {
  const [value, setValue] = useState(0);
  const [formData, setFormData] = useState(emptyPr);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { a11yProps, CustomTabPanel } = useTabs();

  const prId = pr?._id;

  const getActiveTabForStatus = (status) => {
    switch (status) {
      case "Draft":
        return 0; // Stage 1: Purchase Request
      case "PR Raised":
      case "Preparing for Quotation":
        return 1; // Stage 2: Supplier Quotation
      case "Quotation Received":
        return 2; // Stage 3: Finance Approval
      case "Finance Approved":
        return 3; // Stage 4: Payment & UTR
      case "Payment Done":
      case "Order Placed":
        return 4; // Stage 5: Order & Dispatch
      case "GRN Done":
      case "Closed":
        return 5; // Stage 6: Site GRN
      default:
        return 0;
    }
  };

  useEffect(() => {
    if (prId) {
      setLoading(true);
      axios
        .get(`${process.env.REACT_APP_API_STRING}/tyre-procurement/${prId}`)
        .then((res) => {
          const loaded = mergeWithEmpty(res.data.data || emptyPr);
          setFormData(loaded);
          setValue(getActiveTabForStatus(loaded.status));
        })
        .catch((err) => {
          console.error("Error fetching Tyre PR:", err);
          alert("Failed to fetch Tyre PR details");
        })
        .finally(() => setLoading(false));
    } else {
      setFormData(emptyPr);
      setValue(0);
    }
  }, [prId]);

  const mergeWithEmpty = (data) => ({
    ...emptyPr,
    ...data,
    stage1: { ...emptyPr.stage1, ...(data.stage1 || {}) },
    stage2: { ...emptyPr.stage2, ...(data.stage2 || {}) },
    stage3: { ...emptyPr.stage3, ...(data.stage3 || {}) },
    stage4: { ...emptyPr.stage4, ...(data.stage4 || {}) },
    stage5: { ...emptyPr.stage5, ...(data.stage5 || {}) },
    stage6: { ...emptyPr.stage6, ...(data.stage6 || {}) },
  });

  const handleChange = useCallback((field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  }, []);

  const handleStageChange = useCallback((stageKey, stageData) => {
    setFormData((prev) => ({ ...prev, [stageKey]: { ...prev[stageKey], ...stageData } }));
  }, []);

  const handleSave = async () => {
    if (!formData.prNumber || !formData.prNumber.trim()) {
      alert("PR Number is required");
      return;
    }
    setSaving(true);
    try {
      let res;
      if (prId) {
        res = await axios.put(`${process.env.REACT_APP_API_STRING}/tyre-procurement/${prId}`, formData);
      } else {
        res = await axios.post(`${process.env.REACT_APP_API_STRING}/tyre-procurement`, formData);
      }
      const savedData = res.data?.data || res.data;
      alert(res.data?.message || "Tyre Purchase Request saved successfully!");

      if (savedData && savedData._id) {
        setFormData(mergeWithEmpty(savedData));
        if (onSaved) {
          onSaved(savedData);
        }
      }
    } catch (err) {
      console.error("Error saving Tyre PR:", err);
      alert(err.response?.data?.message || "Failed to save Tyre PR");
    } finally {
      setSaving(false);
    }
  };

  const handleChangeTab = (event, newValue) => {
    setValue(newValue);
  };

  const stageTabs = [
    { label: "1. Purchase Request", component: Stage1PurchaseRequest },
    { label: "2. Supplier Quotation", component: Stage2SupplierQuotation },
    { label: "3. Finance Approval", component: Stage3FinanceApproval },
    { label: "4. Payment & UTR", component: Stage4PaymentUtr },
    { label: "5. Order & Dispatch", component: Stage5OrderDispatch },
    { label: "6. Site GRN", component: Stage6Grn },
  ];

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 10 }}>
      {/* Floating Save/Cancel Buttons */}
      <Box
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          display: "flex",
          gap: 1.5,
          zIndex: 1200,
        }}
      >
        {!isView && (
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
            onClick={handleSave}
            disabled={saving}
            sx={{ boxShadow: 4, borderRadius: 2, px: 3 }}
          >
            Save PR
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<Cancel />}
          onClick={onCancel}
          disabled={saving}
          sx={{ boxShadow: 4, borderRadius: 2, px: 3, backgroundColor: "white" }}
        >
          {isView ? "Back" : "Cancel"}
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: "12px",
          border: "1px solid",
          borderColor: "divider",
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" }}>
              {isView ? "View Tyre Purchase Request" : prId ? "Edit Tyre Purchase Request" : "Create Tyre Purchase Request"}
            </Typography>
            {formData.prNumber && (
              <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
                PR Reference: <strong>{formData.prNumber}</strong> {formData.poNumber ? `| PO: ${formData.poNumber}` : ""}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              Stage Status:
            </Typography>
            <Chip
              label={formData.status || "Draft"}
              sx={{
                fontWeight: 700,
                fontSize: "0.8rem",
                borderRadius: "8px",
                px: 1,
                bgcolor:
                  formData.status === "Closed" || formData.status === "GRN Done"
                    ? "#dcfce7"
                    : formData.status === "PR Raised" || formData.status === "Preparing for Quotation"
                    ? "#fef3c7"
                    : "#e0f2fe",
                color:
                  formData.status === "Closed" || formData.status === "GRN Done"
                    ? "#15803d"
                    : formData.status === "PR Raised" || formData.status === "Preparing for Quotation"
                    ? "#b45309"
                    : "#0369a1",
              }}
            />
          </Stack>
        </Stack>
      </Paper>

      {/* Styled Stage Stepper Tabs */}
      <Paper elevation={0} sx={{ borderRadius: "12px", border: "1px solid", borderColor: "divider", mb: 3, overflow: "hidden" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "#f8fafc", px: 1 }}>
          <Tabs
            value={value}
            onChange={handleChangeTab}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="tyre procurement stage tabs"
            sx={{
              minHeight: 48,
              "& .MuiTabs-indicator": {
                backgroundColor: "#2563eb",
                height: 3,
                borderRadius: "3px 3px 0 0",
              },
            }}
          >
            {stageTabs.map((tab, idx) => (
              <Tab
                key={idx}
                label={tab.label}
                {...a11yProps(idx)}
                value={idx}
                sx={{
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  textTransform: "none",
                  color: value === idx ? "#2563eb" : "#64748b",
                  py: 1.5,
                  px: 2.5,
                  "&.Mui-selected": {
                    fontWeight: 700,
                  },
                }}
              />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {stageTabs.map((tab, idx) => {
            const Component = tab.component;
            return (
              <CustomTabPanel key={idx} value={value} index={idx}>
                <fieldset disabled={isView} style={{ border: "none", padding: 0, margin: 0 }}>
                  <Component
                    data={formData[`stage${idx + 1}`] || {}}
                    globalData={formData}
                    onGlobalChange={handleChange}
                    onChange={(stageData) => handleStageChange(`stage${idx + 1}`, stageData)}
                  />
                </fieldset>
              </CustomTabPanel>
            );
          })}
        </Box>
      </Paper>

      {/* Floating Save/Cancel Action Toolbar */}
      <Paper
        elevation={6}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          p: 1.5,
          borderRadius: "16px",
          display: "flex",
          gap: 1.5,
          zIndex: 1200,
          bgcolor: "#ffffff",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
        }}
      >
        {!isView && (
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
            onClick={handleSave}
            disabled={saving}
            sx={{
              borderRadius: "10px",
              px: 3,
              py: 1,
              fontWeight: 600,
              textTransform: "none",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
              "&:hover": {
                background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
              },
            }}
          >
            Save PR
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<Cancel />}
          onClick={onCancel}
          disabled={saving}
          sx={{
            borderRadius: "10px",
            px: 3,
            py: 1,
            fontWeight: 600,
            textTransform: "none",
            borderColor: "#cbd5e1",
            color: "#475569",
            "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
          }}
        >
          {isView ? "Back to List" : "Cancel"}
        </Button>
      </Paper>
    </Box>
  );
}

export default React.memo(TyreProcurementForm);

