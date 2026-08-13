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

      <Paper sx={{ p: 2, mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" color="primary" sx={{ fontWeight: "bold" }}>
          {isView ? "View Tyre Purchase Request" : (prId ? "Edit Tyre Purchase Request" : "Create Tyre Purchase Request")}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500 }}>
            Current Status:
          </Typography>
          <Chip
            label={formData.status || "Draft"}
            color={
              formData.status === "Closed" || formData.status === "GRN Done"
                ? "success"
                : formData.status === "PR Raised" || formData.status === "Preparing for Quotation"
                ? "primary"
                : "info"
            }
            variant="outlined"
            sx={{ fontWeight: "bold", fontSize: "0.85rem", px: 1 }}
          />
        </Stack>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={value}
          onChange={handleChangeTab}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="tyre procurement stage tabs"
        >
          {stageTabs.map((tab, idx) => (
            <Tab key={idx} label={tab.label} {...a11yProps(idx)} value={idx} />
          ))}
        </Tabs>
      </Box>

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
  );
}

export default React.memo(TyreProcurementForm);
