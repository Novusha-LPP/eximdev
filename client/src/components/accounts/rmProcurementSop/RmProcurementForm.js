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
import Stage1SalesOrder from "./Stage1SalesOrder";
import Stage2PurchaseRequest from "./Stage2PurchaseRequest";
import Stage3SupplierQuotation from "./Stage3SupplierQuotation";
import Stage4PricingValidation from "./Stage4PricingValidation";
import Stage5FinanceApproval from "./Stage5FinanceApproval";
import Stage6PaymentUtr from "./Stage6PaymentUtr";
import Stage7OrderDispatch from "./Stage7OrderDispatch";
import Stage8Grn from "./Stage8Grn";

const statusOptions = [
  "Draft",
  "Sales Order",
  "PR Raised",
  "Quotation Received",
  "Pricing Validated",
  "Finance Approved",
  "Payment Done",
  "Order Placed",
  "GRN Done",
  "Closed",
];

const emptyPr = {
  prNumber: "",
  salesOrderRefNo: "",
  status: "Draft",
  stage1: {
    productLines: [],
    rmEstimates: [],
    partitionDetails: {},
    productionTimeline: {},
    signOff: {},
  },
  stage2: {
    rawMaterials: [],
    binProductReference: {},
    productionHeadApproval: {},
    actionLog: [],
  },
  stage3: {
    suppliers: [],
    documentsVerified: {},
    actionLog: [],
  },
  stage4: {
    rateValidations: [],
    overallChecklist: {},
    decision: {},
    actionLog: [],
  },
  stage5: {
    reviewChecklist: {},
    decision: {},
    signOff: {},
    actionLog: [],
  },
  stage6: {
    supplierBankDetails: {},
    paymentDetails: {},
    accountingSignOff: {},
    utrIntimation: {},
    actionLog: [],
  },
  stage7: {
    followUpLog: [],
    dispatchDetails: {},
    rmDispatchBreakdown: [],
  },
  stage8: {
    rmReceiptInspection: [],
    documentChecklist: {},
    returnRejectionNote: {},
    approvals: [],
  },
};

function RmProcurementForm({ pr, isView, onSaved, onCancel }) {
  const [value, setValue] = useState(0);
  const [formData, setFormData] = useState(emptyPr);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { a11yProps, CustomTabPanel } = useTabs();

  useEffect(() => {
    if (pr?._id) {
      setLoading(true);
      axios
        .get(`${process.env.REACT_APP_API_STRING}/rm-procurement/${pr._id}`)
        .then((res) => {
          setFormData(mergeWithEmpty(res.data.data || emptyPr));
        })
        .catch((err) => {
          console.error("Error fetching PR:", err);
          alert("Failed to fetch PR details");
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
    stage7: { ...emptyPr.stage7, ...(data.stage7 || {}) },
    stage8: { ...emptyPr.stage8, ...(data.stage8 || {}) },
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
        await axios.put(`${process.env.REACT_APP_API_STRING}/rm-procurement/${pr._id}`, formData);
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/rm-procurement`, formData);
      }
      onSaved();
    } catch (err) {
      console.error("Error saving PR:", err);
      alert(err.response?.data?.message || "Failed to save PR");
    } finally {
      setSaving(false);
    }
  };

  const handleChangeTab = (event, newValue) => {
    setValue(newValue);
  };

  const stageTabs = [
    { label: "1. Sales Order", component: Stage1SalesOrder },
    { label: "2. Purchase Request", component: Stage2PurchaseRequest },
    { label: "3. Supplier Quotation", component: Stage3SupplierQuotation },
    { label: "4. Pricing Validation", component: Stage4PricingValidation },
    { label: "5. Finance Approval", component: Stage5FinanceApproval },
    { label: "6. Payment & UTR", component: Stage6PaymentUtr },
    { label: "7. Order & Dispatch", component: Stage7OrderDispatch },
    { label: "8. RM GRN", component: Stage8Grn },
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
      <fieldset disabled={isView} style={{ border: "none", padding: 0, margin: 0 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {isView ? "View Purchase Request" : (pr?._id ? "Edit Purchase Request" : "Create Purchase Request")}
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
            label="Sales Order Reference No."
            value={formData.salesOrderRefNo}
            onChange={(e) => handleChange("salesOrderRefNo", e.target.value)}
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
      </fieldset>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={value}
          onChange={handleChangeTab}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="rm procurement stage tabs"
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
                data={formData[`stage${idx + 1}`]}
                globalData={formData}
                onGlobalChange={handleChange}
                onChange={(stageData) => handleStageChange(`stage${idx + 1}`, stageData)}
              />
            </fieldset>
          </CustomTabPanel>
        );
      })}

      <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
        {!isView && (
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
            onClick={handleSave}
            disabled={saving}
          >
            Save PR
          </Button>
        )}
        <Button variant="outlined" startIcon={<Cancel />} onClick={onCancel} disabled={saving}>
          {isView ? "Back" : "Cancel"}
        </Button>
      </Box>
    </Box>
  );
}

export default React.memo(RmProcurementForm);
