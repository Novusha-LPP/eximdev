import React, { useState, useEffect, useCallback, useContext, useMemo } from "react";
import axios from "axios";
import { UserContext } from "../../../contexts/UserContext";
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

const STAGE_TABS = [
  { label: "1. Sales Order", stage: 1, component: Stage1SalesOrder },
  { label: "2. Purchase Request", stage: 2, component: Stage2PurchaseRequest },
  { label: "3. Supplier Quotation", stage: 3, component: Stage3SupplierQuotation },
  { label: "4. Pricing Validation", stage: 4, component: Stage4PricingValidation },
  { label: "5. Finance Approval", stage: 5, component: Stage5FinanceApproval },
  { label: "6. Payment & UTR", stage: 6, component: Stage6PaymentUtr },
  { label: "7. Order & Dispatch", stage: 7, component: Stage7OrderDispatch },
  { label: "8. RM GRN", stage: 8, component: Stage8Grn },
];

// Maps each RM stage tab to the shared procurement tab-permission label
// (permissions are stored as the tyre-procurement tab labels on the user)
const RM_TAB_PERMISSION_KEY = {
  "1. Sales Order": "1. Purchase Request",
  "2. Purchase Request": "1. Purchase Request",
  "3. Supplier Quotation": "2. Supplier Quotation",
  "4. Pricing Validation": "3. Finance Approval",
  "5. Finance Approval": "3. Finance Approval",
  "6. Payment & UTR": "4. Payment & UTR",
  "7. Order & Dispatch": "5. Order & Dispatch",
  "8. RM GRN": "6. Site GRN",
};

function RmProcurementForm({ pr, isView, onSaved, onCancel }) {
  const { user } = useContext(UserContext);
  const userRole = (user?.role || "").toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  const [activeStage, setActiveStage] = useState(1);
  const [allowedUserTabs, setAllowedUserTabs] = useState([]);
  const [tabsLoading, setTabsLoading] = useState(true);
  const [formData, setFormData] = useState(emptyPr);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { a11yProps, CustomTabPanel } = useTabs();

  useEffect(() => {
    if (!user) return; // wait for user context before deciding tab visibility
    if (isAdmin) {
      setAllowedUserTabs([]);
      setTabsLoading(false);
      return;
    }
    async function fetchUserTabs() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/tyre-procurement/user-tabs/${user.username}`
        );
        if (res.data?.success && res.data.allowed_tabs?.length > 0) {
          setAllowedUserTabs(res.data.allowed_tabs);
        }
      } catch (err) {
        console.error("Error fetching allowed tabs:", err);
      } finally {
        setTabsLoading(false);
      }
    }
    if (user.username) {
      fetchUserTabs();
    } else {
      setTabsLoading(false);
    }
  }, [user, isAdmin]);

  const visibleStageTabs = useMemo(
    () =>
      isAdmin || allowedUserTabs.length === 0
        ? STAGE_TABS
        : STAGE_TABS.filter((tab) => allowedUserTabs.includes(RM_TAB_PERMISSION_KEY[tab.label])),
    [isAdmin, allowedUserTabs]
  );

  const isRestrictedUser = !isAdmin && allowedUserTabs.length > 0;

  useEffect(() => {
    if (visibleStageTabs.length === 0) return;
    if (!visibleStageTabs.some((tab) => tab.stage === activeStage)) {
      setActiveStage(visibleStageTabs[0].stage);
    }
  }, [visibleStageTabs, activeStage]);

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
      setActiveStage(1);
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
    setActiveStage(newValue);
  };

  if (loading || tabsLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <fieldset disabled={isView || isRestrictedUser} style={{ border: "none", padding: 0, margin: 0 }}>
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
          value={activeStage}
          onChange={handleChangeTab}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="rm procurement stage tabs"
        >
          {visibleStageTabs.map((tab) => (
            <Tab key={tab.stage} label={tab.label} {...a11yProps(tab.stage)} value={tab.stage} />
          ))}
        </Tabs>
      </Box>

      {visibleStageTabs.map((tab) => {
        const Component = tab.component;
        return (
          <CustomTabPanel key={tab.stage} value={activeStage} index={tab.stage}>
            <fieldset disabled={isView} style={{ border: "none", padding: 0, margin: 0 }}>
              <Component
                data={formData[`stage${tab.stage}`]}
                globalData={formData}
                onGlobalChange={handleChange}
                onChange={(stageData) => handleStageChange(`stage${tab.stage}`, stageData)}
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
