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

function TyreProcurementForm({ pr, onSaved, onCancel }) {
  const [value, setValue] = useState(0);
  const [formData, setFormData] = useState(emptyPr);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { a11yProps, CustomTabPanel } = useTabs();

  useEffect(() => {
    if (pr?._id) {
      setLoading(true);
      axios
        .get(`${process.env.REACT_APP_API_STRING}/tyre-procurement/${pr._id}`)
        .then((res) => {
          setFormData(mergeWithEmpty(res.data.data || emptyPr));
        })
        .catch((err) => {
          console.error("Error fetching Tyre PR:", err);
          alert("Failed to fetch Tyre PR details");
        })
        .finally(() => setLoading(false));
    } else {
      setFormData(emptyPr);
    }
  }, [pr]);

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
    if (!formData.prNumber.trim()) {
      alert("PR Number is required");
      return;
    }
    setSaving(true);
    try {
      if (pr?._id) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/tyre-procurement/${pr._id}`, formData);
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/tyre-procurement`, formData);
      }
      onSaved();
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
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {pr?._id ? "Edit Tyre Purchase Request" : "Create Tyre Purchase Request"}
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="PR Number *"
            value={formData.prNumber}
            onChange={(e) => handleChange("prNumber", e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="PO Number"
            value={formData.poNumber}
            onChange={(e) => handleChange("poNumber", e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            select
            label="Status"
            value={formData.status}
            onChange={(e) => handleChange("status", e.target.value)}
            fullWidth
            size="small"
          >
            {statusOptions.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
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
            <Component
              data={formData[`stage${idx + 1}`]}
              onChange={(stageData) => handleStageChange(`stage${idx + 1}`, stageData)}
            />
          </CustomTabPanel>
        );
      })}

      <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
          onClick={handleSave}
          disabled={saving}
        >
          Save PR
        </Button>
        <Button variant="outlined" startIcon={<Cancel />} onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
}

export default React.memo(TyreProcurementForm);
