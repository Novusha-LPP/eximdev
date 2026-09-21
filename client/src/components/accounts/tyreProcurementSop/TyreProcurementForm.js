import React, { useState, useEffect, useCallback, useContext, useMemo } from "react";
import axios from "axios";
import { UserContext } from "../../../contexts/UserContext";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  Chip,
} from "@mui/material";
import useTabs from "../../../customHooks/useTabs";
import Stage1PurchaseRequest from "./Stage1PurchaseRequest";
import Stage2SupplierQuotation from "./Stage2SupplierQuotation";
import Stage3FinanceApproval from "./Stage3FinanceApproval";
import Stage4PaymentUtr from "./Stage4PaymentUtr";
import Stage5OrderDispatch from "./Stage5OrderDispatch";
import Stage6Grn from "./Stage6Grn";
import "../../../styles/enterprise-sop.scss";

const emptyPr = {
  prNumber: "",
  poNumber: "",
  status: "Draft",
  stage1: {
    itemsRequired: [],
    routingChecklist: [],
    hodValidation: {
      validatedBy: "MOHIT SINGH",
    },
  },
  stage2: {
    suppliers: [{}, {}, {}],
    routingChecklist: [],
  },
  stage3: {
    reviewChecklist: {},
    decision: {},
    signOff: {
      financeManagerName: "CHIRAG SHAH",
    },
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

const STAGE_TABS = [
  { label: "1. Purchase Request", stage: 1, component: Stage1PurchaseRequest },
  { label: "2. Supplier Quotation", stage: 2, component: Stage2SupplierQuotation },
  { label: "3. Finance Approval", stage: 3, component: Stage3FinanceApproval },
  { label: "4. Payment & UTR", stage: 4, component: Stage4PaymentUtr },
  { label: "5. Order & Dispatch", stage: 5, component: Stage5OrderDispatch },
  { label: "6. Site GRN", stage: 6, component: Stage6Grn },
];

function TyreProcurementForm({ pr, isView, onSaved, onCancel }) {
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

  const prId = pr?._id;

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
        : STAGE_TABS.filter((tab) => allowedUserTabs.includes(tab.label)),
    [isAdmin, allowedUserTabs]
  );

  useEffect(() => {
    if (visibleStageTabs.length === 0) return;
    if (!visibleStageTabs.some((tab) => tab.stage === activeStage)) {
      setActiveStage(visibleStageTabs[0].stage);
    }
  }, [visibleStageTabs, activeStage]);

  const getActiveTabForStatus = (status) => {
    switch (status) {
      case "Draft":
        return 0; // Stage 1: Purchase Request
      case "PR Raised":
      case "Preparing for Quotation":
      case "HoD Validated":
        return 1; // Stage 2: Supplier Quotation
      case "Quotation Received":
      case "Quotation Updated":
        return 2; // Stage 3: Finance Approval
      case "Finance Approved":
        return 3; // Stage 4: Payment & UTR
      case "Payment Done":
        return 4; // Stage 5: Order & Dispatch
      case "Order Placed":
      case "Dispatched":
      case "Dispatched / Site GRN Ready":
      case "GRN Ready":
      case "GRN Received":
        return 5; // Stage 6: Site GRN
      case "GRN Done":
      case "GRN Completed":
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
          setActiveStage(getActiveTabForStatus(loaded.status) + 1);
        })
        .catch((err) => {
          console.error("Error fetching Tyre PR:", err);
          alert("Failed to fetch Tyre PR details");
        })
        .finally(() => setLoading(false));
    } else {
      setFormData(emptyPr);
      setActiveStage(1);
    }
  }, [prId]);

  const mergeWithEmpty = (data) => ({
    ...emptyPr,
    ...data,
    stage1: {
      ...emptyPr.stage1,
      ...(data.stage1 || {}),
      hodValidation: {
        ...emptyPr.stage1.hodValidation,
        ...(data.stage1?.hodValidation || {}),
        validatedBy: data.stage1?.hodValidation?.validatedBy || "MOHIT SINGH",
      },
    },
    stage2: { ...emptyPr.stage2, ...(data.stage2 || {}) },
    stage3: {
      ...emptyPr.stage3,
      ...(data.stage3 || {}),
      signOff: {
        ...emptyPr.stage3.signOff,
        ...(data.stage3?.signOff || {}),
        financeManagerName: data.stage3?.signOff?.financeManagerName || "CHIRAG SHAH",
      },
    },
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
      alert(res.data?.message || "Purchase Request saved successfully!");

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
    <Box sx={{ pb: 8 }}>
      {/* Compact Top Header Surface Card */}
      <Paper
        elevation={0}
        sx={{
          p: 1.2,
          mb: 1.5,
          borderRadius: "6px",
          border: "1px solid",
          borderColor: "#e3e7ee",
          background: "#ffffff",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>
              {isView ? "View Purchase Request" : prId ? "Edit Purchase Request" : "Create Purchase Request"}
            </Typography>
            {formData.prNumber && (
              <Typography variant="caption" sx={{ color: "#64748b" }}>
                PR: <strong>{formData.prNumber}</strong> {formData.poNumber ? `| PO: ${formData.poNumber}` : ""}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
              STATUS:
            </Typography>
            <Chip
              label={formData.status || "Draft"}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: "0.75rem",
                borderRadius: "6px",
                height: 22,
                px: 0.5,
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
      <Paper elevation={0} sx={{ borderRadius: "6px", border: "1px solid", borderColor: "#e3e7ee", mb: 2, overflow: "hidden", background: "#ffffff" }}>
        <Box sx={{ borderBottom: 1, borderColor: "#e2e8f0", bgcolor: "#f8fafc", px: 0.5 }}>
          <Tabs
            value={activeStage}
            onChange={handleChangeTab}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="tyre procurement stage tabs"
            sx={{
              minHeight: 34,
              "& .MuiTabs-indicator": {
                backgroundColor: "#2563eb",
                height: 2.5,
              },
            }}
          >
            {visibleStageTabs.map((tab) => (
              <Tab
                key={tab.stage}
                label={tab.label}
                {...a11yProps(tab.stage)}
                value={tab.stage}
                sx={{
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  textTransform: "none",
                  color: activeStage === tab.stage ? "#2563eb" : "#64748b",
                  py: 0.5,
                  px: 1.8,
                  minHeight: 34,
                  "&.Mui-selected": {
                    fontWeight: 700,
                  },
                }}
              />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ p: 2 }}>
          {visibleStageTabs.map((tab) => {
            const Component = tab.component;
            return (
              <CustomTabPanel key={tab.stage} value={activeStage} index={tab.stage}>
                <fieldset disabled={isView} style={{ border: "none", padding: 0, margin: 0 }}>
                  <Component
                    data={formData[`stage${tab.stage}`] || {}}
                    globalData={formData}
                    onGlobalChange={handleChange}
                    onChange={(stageData) => handleStageChange(`stage${tab.stage}`, stageData)}
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
          right: 32,
          p: 1.2,
          borderRadius: "30px",
          display: "flex",
          alignItems: "center",
          gap: 2,
          zIndex: 9999,
          bgcolor: "#ffffff",
          border: "1.5px solid #cbd5e1",
          boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
        }}
      >
        <button
          type="button"
          className="sop-btn pill-close"
          onClick={onCancel}
        >
          CLOSE
        </button>
        {!isView && (
          <button
            type="button"
            className="sop-btn pill-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "SAVING..." : prId ? "UPDATE PR" : "SAVE PR"}
          </button>
        )}
      </Paper>
    </Box>
  );
}

export default React.memo(TyreProcurementForm);
