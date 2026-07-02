import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Grid
} from "@mui/material";
import { Save, Cancel } from "@mui/icons-material";

import Stage1PolicyProposal from "./Stage1PolicyProposal";
import Stage2PRGeneration from "./Stage2PRGeneration";
import Stage3FinanceApproval from "./Stage3FinanceApproval";
import Stage4PaymentUtr from "./Stage4PaymentUtr";

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`fleet-insurance-tabpanel-${index}`}
      aria-labelledby={`fleet-insurance-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `fleet-insurance-tab-${index}`,
    'aria-controls': `fleet-insurance-tabpanel-${index}`,
  };
}

const emptyRecord = {
  srNo: "",
  registrationNo: "",
  registrationDate: "",
  makeModel: "",
  fromOwner: "",
  toOwner: "",
  modelType: "",
  size: "",
  owner: "",
  policyFromDate: "",
  policyToDate: "",
  insuranceCompany: "",
  policyNo: "",
  gvw: "",
  idv: "",
  premiumAmount: "",
  remarks: "",
  ncbPercentage: "",
  premium: "",
  thisYearIdv: "",
  newIdv: "",
  newNcbPercentage: "",
  rsdTaken: "",
  imt23: "",
  zeroDepTowingCover: "",
  premiumQuote: "",
  renewed: "",
  newExpiryDate: "",
  renewedDate: "",
  renewalDate: "",
  engineNumber: "",
  chassisNumber: "",
  cubicCapacityKw: "",
  mfgYear: "",
  electricalAccessoriesIdv: "",
  cngKitIdv: "",
  totalIdv: "",
  odPremium: "",
  imt24: "",
  imt25: "",
  totalOdPremium: "",
  imt17: "",
  imt252: "",
  imt28: "",
  imt29: "",
  liabilityPremium: "",
  totalGst: "",
  totalPolicyPremium: "",
  quotations: [],
  selectedInsurerL1: "",
  reasonForSelection: "",
  prNumber: "",
  prDate: "",
  financialApprovalStatus: "Draft",
  paymentUtr: "",
  paymentDate: "",
  renewalStatus: "Pending",
  tat: "",
};

function FleetInsuranceForm({ proposal, isView, isRenew, onSaved, onCancel }) {
  const [formData, setFormData] = useState(emptyRecord);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (proposal?._id) {
      setLoading(true);
      axios
        .get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${proposal._id}`)
        .then((res) => {
          let fetchedData = res.data.data || {};
          if (isRenew) {
            delete fetchedData._id;
            fetchedData.policyNo = "";
            fetchedData.policyFromDate = "";
            fetchedData.policyToDate = "";
            fetchedData.premiumQuote = "";
            fetchedData.renewed = "";
            // Also reset workflow statuses on renew
            fetchedData.prNumber = "";
            fetchedData.prDate = "";
            fetchedData.financialApprovalStatus = "Draft";
            fetchedData.paymentUtr = "";
            fetchedData.paymentDate = "";
            fetchedData.renewalStatus = "Pending";
            fetchedData.tat = "";
          }
          setFormData({ ...emptyRecord, ...fetchedData });
        })
        .catch((err) => {
          console.error("Error fetching Fleet Insurance SOP:", err);
          alert("Failed to fetch Record details");
        })
        .finally(() => setLoading(false));
    } else {
      setFormData(emptyRecord);
    }
  }, [proposal, isRenew]);

  const handleChange = useCallback((field, val) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: val };
      
      if (field === "prDate" || field === "paymentDate") {
        if (next.prDate && next.paymentDate) {
          const pr = new Date(next.prDate);
          const pay = new Date(next.paymentDate);
          if (!isNaN(pr) && !isNaN(pay)) {
            const diffTime = Math.abs(pay - pr);
            next.tat = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
        } else {
          next.tat = "";
        }
      }

      if (field === "paymentUtr") {
        if (val && val.trim().length > 0) {
          next.renewalStatus = "Renewed";
        } else {
          next.renewalStatus = "Pending";
        }
      }
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (!formData.registrationNo?.trim()) {
      alert("Registration Number is required");
      return;
    }
    setSaving(true);
    try {
      if (proposal?._id && !isRenew) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${proposal._id}`, formData);
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop`, formData);
      }
      onSaved();
    } catch (err) {
      console.error("Error saving Fleet Insurance SOP:", err);
      alert(err.response?.data?.message || "Failed to save Record");
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuotation = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      quotations: [
        ...(prev.quotations || []),
        { insuranceCompany: "", idv: "", odPremium: "", liabilityPremium: "", totalPremium: "" },
      ],
    }));
  }, []);

  const handleQuotationChange = useCallback((index, field, val) => {
    setFormData((prev) => {
      const newQuotations = [...(prev.quotations || [])];
      newQuotations[index][field] = val;
      
      if (field === "odPremium" || field === "liabilityPremium") {
        const od = Number(newQuotations[index].odPremium) || 0;
        const liab = Number(newQuotations[index].liabilityPremium) || 0;
        newQuotations[index].totalPremium = od + liab;
        
        if (prev.selectedInsurerL1 && prev.selectedInsurerL1 === newQuotations[index].insuranceCompany) {
          return { ...prev, quotations: newQuotations, premiumQuote: od + liab };
        }
      }
      return { ...prev, quotations: newQuotations };
    });
  }, []);

  const handleRemoveQuotation = useCallback((index) => {
    setFormData((prev) => {
      const newQuotations = [...(prev.quotations || [])];
      newQuotations.splice(index, 1);
      return { ...prev, quotations: newQuotations };
    });
  }, []);

  const handleSelectL1 = useCallback((index) => {
    setFormData((prev) => {
      const selected = prev.quotations[index];
      return {
        ...prev,
        selectedInsurerL1: selected.insuranceCompany,
        premiumQuote: selected.totalPremium,
        newIdv: selected.idv,
      };
    });
  }, []);

  const formatDateValue = useCallback((dateStr) => {
    return dateStr ? String(dateStr).split("T")[0] : "";
  }, []);

  const handleRegistrationBlur = useCallback(async (e) => {
    const regNo = e.target.value?.trim();
    if (!regNo || proposal?._id) return;

    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/history/${encodeURIComponent(regNo)}`);
      const history = res.data;
      if (history && history.length > 0) {
        const latest = history[0];
        setFormData((prev) => ({
          ...prev,
          owner: prev.owner || latest.owner || "",
          makeModel: prev.makeModel || latest.makeModel || "",
          modelType: prev.modelType || latest.modelType || "",
          size: prev.size || latest.size || "",
          gvw: prev.gvw || latest.gvw || "",
          engineNumber: prev.engineNumber || latest.engineNumber || "",
          chassisNumber: prev.chassisNumber || latest.chassisNumber || "",
          cubicCapacityKw: prev.cubicCapacityKw || latest.cubicCapacityKw || "",
          mfgYear: prev.mfgYear || latest.mfgYear || "",
          premiumAmount: latest.totalPolicyPremium || latest.premiumAmount || prev.premiumAmount || "",
        }));
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error("Error fetching vehicle history:", err);
      }
    }
  }, [proposal]);

  useEffect(() => {
    const od = Number(formData.totalOdPremium) || 0;
    const liab = Number(formData.liabilityPremium) || 0;
    const gst = Number(formData.totalGst) || 0;
    const calculatedTotal = od + liab + gst;
    
    if (formData.totalPolicyPremium !== calculatedTotal && (od > 0 || liab > 0 || gst > 0)) {
        setFormData(prev => ({ ...prev, totalPolicyPremium: calculatedTotal }));
    }
  }, [formData.totalOdPremium, formData.liabilityPremium, formData.totalGst, formData.totalPolicyPremium]);

  const handleChangeTab = (event, newValue) => {
    setTabValue(newValue);
  };

  const stageTabs = [
    { label: "1. Policy Proposal", component: Stage1PolicyProposal },
    { label: "2. PR Generation", component: Stage2PRGeneration },
    { label: "3. Finance Approval", component: Stage3FinanceApproval },
    { label: "4. Payment & UTR", component: Stage4PaymentUtr },
  ];

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "#1a237e" }}>
          {isView ? "View Vehicle Record" : (proposal?._id ? (isRenew ? "Renew Vehicle Policy" : "Edit Vehicle Record") : "Add Vehicle Record")}
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          {!isView && (
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
              onClick={handleSave}
              disabled={saving}
            >
              Save Record
            </Button>
          )}
          <Button variant="outlined" startIcon={<Cancel />} onClick={onCancel} disabled={saving}>
            {isView ? "Back" : "Cancel"}
          </Button>
        </Box>
      </Box>

      {/* Vehicle Summary Context (Visible across all tabs EXCEPT the first one) */}
      {tabValue !== 0 && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: "#f8f9fa" }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="textSecondary">Registration No.</Typography>
              <Typography variant="subtitle1" fontWeight="bold">{formData.registrationNo || "-"}</Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="textSecondary">Make/Model & Size</Typography>
              <Typography variant="subtitle1" fontWeight="bold">
                {formData.makeModel || "-"} / {formData.size || "-"}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="textSecondary">Old Expiry Date</Typography>
              <Typography variant="subtitle1" fontWeight="bold">
                {formData.policyToDate ? new Date(formData.policyToDate).toLocaleDateString("en-IN") : "-"}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="textSecondary">Premium Quote L1</Typography>
              <Typography variant="subtitle1" fontWeight="bold" color="primary">
                ₹ {formData.premiumQuote || formData.totalPolicyPremium || 0}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={handleChangeTab}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="fleet insurance stage tabs"
          >
            {stageTabs.map((tab, idx) => (
              <Tab key={idx} label={tab.label} {...a11yProps(idx)} />
            ))}
          </Tabs>
        </Box>
      </Paper>

      {stageTabs.map((tab, idx) => {
        const Component = tab.component;
        return (
          <CustomTabPanel key={idx} value={tabValue} index={idx}>
            <fieldset disabled={isView} style={{ border: "none", padding: 0, margin: 0 }}>
              <Component
                formData={formData}
                handleChange={handleChange}
                handleQuotationChange={handleQuotationChange}
                handleSelectL1={handleSelectL1}
                handleRemoveQuotation={handleRemoveQuotation}
                handleAddQuotation={handleAddQuotation}
                handleRegistrationBlur={handleRegistrationBlur}
                formatDateValue={formatDateValue}
                isView={isView}
              />
            </fieldset>
          </CustomTabPanel>
        );
      })}
    </Box>
  );
}

export default React.memo(FleetInsuranceForm);
