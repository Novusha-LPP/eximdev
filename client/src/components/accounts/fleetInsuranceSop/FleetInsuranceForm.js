import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
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
  renewalDate: "",
  engineNumber: "",
  chassisNumber: "",
  cubicCapacityKw: "",
  mfgYear: "",
  electricalAccessoriesIdv: "",
  cngKitIdv: "",
  hydraulicJackCover: "",
  hydrolicJackCover: "",
  moderationAmount: "",
  moderationAmountTipper: "",
  totalIdv: "",
  odPremium: "",
  imt23: "",
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
  // Renewed Policy Details
  newInsuranceCompany: "",
  newPolicyNo: "",
  newPolicyFromDate: "",
  newPolicyToDate: "",
  newIdv: "",
  newElectricalAccessoriesIdv: "",
  newCngKitIdv: "",
  newHydraulicJackCover: "",
  newHydrolicJackCover: "",
  newModerationAmount: "",
  newModerationAmountTipper: "",
  newTotalIdv: "",
  newPremiumAmount: "",
  newNcb: "",
  newPremium: "",
  newRemarks: "",
  // Renewed Insurance Premium Breakdown
  newOdPremium: "",
  newImt23: "",
  newImt24: "",
  newImt25: "",
  newTotalOdPremium: "",
  newImt17: "",
  newImt252: "",
  newImt28: "",
  newImt29: "",
  newLiabilityPremium: "",
  newTotalGst: "",
  newTotalPolicyPremium: "",
  // PR Readiness
  readyForPr: "",
  // Dynamic Custom Fields
  section2CustomFields: [],
  section2BCustomFields: [],
  section3CustomFields: [],
  section3BCustomFields: [],
  // Workflow
  prNumber: "",
  prDate: "",
  financialApprovalStatus: "Pending",
  paymentUtr: "",
  paymentDate: new Date().toISOString().split("T")[0],
  renewalStatus: "Pending",
  tat: "",
};

function FleetInsuranceForm({ proposal, isView, isRenew, initialTab = 0, onSaved, onCancel }) {
  const { id: urlId } = useParams();
  const navigate = useNavigate();
  const targetId = proposal?._id || urlId;

  const [formData, setFormData] = useState(emptyRecord);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState(initialTab);

  const handleCancelClick = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      navigate("/procurement-insurance-sops");
    }
  }, [onCancel, navigate]);

  const handleSavedClick = useCallback(() => {
    if (onSaved) {
      onSaved();
    } else {
      navigate("/procurement-insurance-sops");
    }
  }, [onSaved, navigate]);

  useEffect(() => {
    if (initialTab !== undefined && initialTab !== null) {
      setTabValue(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];

    const loadPrNumber = async (baseData) => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/next-pr-number?date=${baseData.prDate || todayStr}`);
        if (res.data?.prNumber) {
          setFormData((prev) => ({
            ...prev,
            prNumber: prev.prNumber || res.data.prNumber,
            prDate: prev.prDate || todayStr,
          }));
        }
      } catch (err) {
        console.error("Error auto-generating PR Number:", err);
      }
    };

    if (targetId) {
      setLoading(true);
      axios
        .get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${targetId}`)
        .then((res) => {
          let fetchedData = res.data.data || {};
          if (isRenew) {
            delete fetchedData._id;
            // Copy renewed details into previous details
            if (fetchedData.newInsuranceCompany) fetchedData.insuranceCompany = fetchedData.newInsuranceCompany;
            if (fetchedData.newPolicyNo) fetchedData.policyNo = fetchedData.newPolicyNo;
            if (fetchedData.newPolicyFromDate) fetchedData.policyFromDate = fetchedData.newPolicyFromDate;
            if (fetchedData.newPolicyToDate) fetchedData.policyToDate = fetchedData.newPolicyToDate;
            if (fetchedData.newIdv) fetchedData.idv = fetchedData.newIdv;
            if (fetchedData.newElectricalAccessoriesIdv) fetchedData.electricalAccessoriesIdv = fetchedData.newElectricalAccessoriesIdv;
            if (fetchedData.newCngKitIdv) fetchedData.cngKitIdv = fetchedData.newCngKitIdv;
            if (fetchedData.newHydraulicJackCover || fetchedData.newHydrolicJackCover) {
              fetchedData.hydraulicJackCover = fetchedData.newHydraulicJackCover || fetchedData.newHydrolicJackCover;
              fetchedData.hydrolicJackCover = fetchedData.hydraulicJackCover;
            }
            if (fetchedData.newModerationAmount || fetchedData.newModerationAmountTipper) {
              fetchedData.moderationAmount = fetchedData.newModerationAmount || fetchedData.newModerationAmountTipper;
              fetchedData.moderationAmountTipper = fetchedData.moderationAmount;
            }
            if (fetchedData.newTotalIdv) fetchedData.totalIdv = fetchedData.newTotalIdv;
            if (fetchedData.newPremiumAmount) fetchedData.premiumAmount = fetchedData.newPremiumAmount;
            if (fetchedData.newNcb) fetchedData.ncbPercentage = fetchedData.newNcb;
            if (fetchedData.newPremium) fetchedData.premium = fetchedData.newPremium;
            if (fetchedData.newRemarks) fetchedData.remarks = fetchedData.newRemarks;
            // Copy renewed premium breakdown into previous premium breakdown
            if (fetchedData.newOdPremium) fetchedData.odPremium = fetchedData.newOdPremium;
            if (fetchedData.newImt23) fetchedData.imt23 = fetchedData.newImt23;
            if (fetchedData.newImt24) fetchedData.imt24 = fetchedData.newImt24;
            if (fetchedData.newImt25) fetchedData.imt25 = fetchedData.newImt25;
            if (fetchedData.newTotalOdPremium) fetchedData.totalOdPremium = fetchedData.newTotalOdPremium;
            if (fetchedData.newImt17) fetchedData.imt17 = fetchedData.newImt17;
            if (fetchedData.newImt252) fetchedData.imt252 = fetchedData.newImt252;
            if (fetchedData.newImt28) fetchedData.imt28 = fetchedData.newImt28;
            if (fetchedData.newImt29) fetchedData.imt29 = fetchedData.newImt29;
            if (fetchedData.newLiabilityPremium) fetchedData.liabilityPremium = fetchedData.newLiabilityPremium;
            if (fetchedData.newTotalGst) fetchedData.totalGst = fetchedData.newTotalGst;
            if (fetchedData.newTotalPolicyPremium) fetchedData.totalPolicyPremium = fetchedData.newTotalPolicyPremium;
            // Clear renewed fields for fresh input
            fetchedData.newInsuranceCompany = "";
            fetchedData.newPolicyNo = "";
            fetchedData.newPolicyFromDate = "";
            fetchedData.newPolicyToDate = "";
            fetchedData.newIdv = "";
            fetchedData.newElectricalAccessoriesIdv = "";
            fetchedData.newCngKitIdv = "";
            fetchedData.newHydraulicJackCover = "";
            fetchedData.newHydrolicJackCover = "";
            fetchedData.newModerationAmount = "";
            fetchedData.newModerationAmountTipper = "";
            fetchedData.newTotalIdv = "";
            fetchedData.newPremiumAmount = "";
            fetchedData.newNcb = "";
            fetchedData.newPremium = "";
            fetchedData.newRemarks = "";
            fetchedData.newOdPremium = "";
            fetchedData.newImt23 = "";
            fetchedData.newImt24 = "";
            fetchedData.newImt25 = "";
            fetchedData.newTotalOdPremium = "";
            fetchedData.newImt17 = "";
            fetchedData.newImt252 = "";
            fetchedData.newImt28 = "";
            fetchedData.newImt29 = "";
            fetchedData.newLiabilityPremium = "";
            fetchedData.newTotalGst = "";
            fetchedData.newTotalPolicyPremium = "";
            // Reset PR readiness and workflow statuses for fresh renewal
            fetchedData.readyForPr = "";
            fetchedData.prNumber = "";
            fetchedData.prDate = todayStr;
            fetchedData.financialApprovalStatus = "Pending";
            fetchedData.paymentUtr = "";
            fetchedData.paymentDate = todayStr;
            fetchedData.renewalStatus = "Pending";
            fetchedData.tat = "";
          }
          const merged = { ...emptyRecord };
          Object.keys(emptyRecord).forEach((key) => {
            merged[key] = (fetchedData[key] !== null && fetchedData[key] !== undefined) ? fetchedData[key] : emptyRecord[key];
          });
          Object.keys(fetchedData).forEach((key) => {
            if (fetchedData[key] !== null && fetchedData[key] !== undefined && !(key in merged)) {
              merged[key] = fetchedData[key];
            }
          });
          if (!merged.prDate) merged.prDate = todayStr;
          if (merged.readyForPr === "Yes" && !merged.prNumber) {
            loadPrNumber(merged);
          } else if (merged.readyForPr !== "Yes") {
            merged.prNumber = "";
          }
          if (!merged.financialApprovalStatus || merged.financialApprovalStatus === "Draft") {
            merged.financialApprovalStatus = "Pending";
          }
          setFormData(merged);
        })
        .catch((err) => {
          console.error("Error fetching Fleet Insurance SOP:", err);
          alert("Failed to fetch Record details");
        })
        .finally(() => setLoading(false));
    } else {
      const initial = { ...emptyRecord, prDate: todayStr, paymentDate: "", renewalDate: "", financialApprovalStatus: "Pending" };
      if (initial.readyForPr === "Yes" && !initial.prNumber) {
        loadPrNumber(initial);
      } else {
        initial.prNumber = "";
      }
      setFormData(initial);
    }
  }, [proposal, isRenew]);

  // Auto-calc: TAT days counting from PR generation date to Payment Date
  useEffect(() => {
    if (formData.prDate && formData.paymentDate) {
      const pr = new Date(formData.prDate);
      const pay = new Date(formData.paymentDate);
      if (!isNaN(pr.getTime()) && !isNaN(pay.getTime())) {
        const diffTime = Math.max(0, pay - pr);
        const calcTat = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (formData.tat !== calcTat) {
          setFormData((prev) => ({
            ...prev,
            tat: calcTat
          }));
        }
      }
    }
  }, [formData.prDate, formData.paymentDate, formData.tat]);

  const handleChange = useCallback((field, val) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: val };

      if (field === "readyForPr") {
        if (val === "Yes") {
          const missing = [];
          if (!prev.registrationNo?.trim()) missing.push("Registration No.");
          const hasPolicyNo = (prev.newPolicyNo && prev.newPolicyNo.trim()) || (prev.policyNo && prev.policyNo.trim());
          if (!hasPolicyNo) missing.push("Policy No.");
          const hasValidTo = prev.newPolicyToDate || prev.policyToDate;
          if (!hasValidTo) missing.push("Valid To Date (Expiry)");
          const hasPremium = (Number(prev.newOdPremium) > 0) ||
            (Number(prev.newTotalPolicyPremium) > 0) ||
            (Number(prev.odPremium) > 0) ||
            (Number(prev.totalPolicyPremium) > 0) ||
            (Number(prev.newPremiumAmount) > 0) ||
            (Number(prev.premiumAmount) > 0);
          if (!hasPremium) missing.push("Premium Amount");

          if (missing.length > 0) {
            alert(`Please fill mandatory details before selecting Ready for PR Generation:\n\n• ${missing.join("\n• ")}`);
            next.readyForPr = "No";
            next.prNumber = "";
            return next;
          }

          if (!prev.prNumber) {
            const todayStr = new Date().toISOString().split("T")[0];
            axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/next-pr-number?date=${prev.prDate || todayStr}`)
              .then((res) => {
                if (res.data?.prNumber) {
                  setFormData((p) => ({
                    ...p,
                    readyForPr: "Yes",
                    prNumber: p.prNumber || res.data.prNumber,
                    prDate: p.prDate || todayStr
                  }));
                }
              })
              .catch((err) => console.error("Error auto-generating PR number:", err));
          }
        } else if (val !== "Yes") {
          next.prNumber = "";
        }
      }

      if (field === "prDate" || field === "paymentDate") {
        const targetPr = next.prDate;
        const targetPay = next.paymentDate || new Date().toISOString().split("T")[0];
        if (targetPr && targetPay) {
          const pr = new Date(targetPr);
          const pay = new Date(targetPay);
          if (!isNaN(pr) && !isNaN(pay)) {
            const diffTime = Math.max(0, pay - pr);
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

    if (isRenew) {
      if (!formData.newPolicyNo?.trim() && !formData.policyNo?.trim()) {
        alert("Policy Number is required for renewal");
        return;
      }
      if (!formData.newPolicyToDate && !formData.policyToDate) {
        alert("Valid To date (Expiry Date) is required for renewal");
        return;
      }
      const hasPremium = (Number(formData.newOdPremium) > 0) ||
        (Number(formData.newTotalPolicyPremium) > 0) ||
        (Number(formData.odPremium) > 0) ||
        (Number(formData.totalPolicyPremium) > 0) ||
        (Number(formData.newPremiumAmount) > 0) ||
        (Number(formData.premiumAmount) > 0);
      if (!hasPremium) {
        alert("Premium amount (OD Premium or Total Policy Premium) is required for renewal");
        return;
      }
    }

    // Default financialApprovalStatus to Pending if empty or Draft
    const dataToSave = { ...formData };
    if (!dataToSave.financialApprovalStatus || dataToSave.financialApprovalStatus === "Draft") {
      dataToSave.financialApprovalStatus = "Pending";
    }

    // Ensure totalIdv and newTotalIdv are calculated before saving
    const calcPrevTotalIdv = (Number(dataToSave.idv) || 0) + (Number(dataToSave.electricalAccessoriesIdv) || 0) + (Number(dataToSave.cngKitIdv) || 0);
    if (calcPrevTotalIdv > 0) dataToSave.totalIdv = calcPrevTotalIdv;

    const calcNewTotalIdv = (Number(dataToSave.newIdv) || 0) + (Number(dataToSave.newElectricalAccessoriesIdv) || 0) + (Number(dataToSave.newCngKitIdv) || 0);
    if (calcNewTotalIdv > 0) dataToSave.newTotalIdv = calcNewTotalIdv;

    const hasRenewedFields = Boolean(
      dataToSave.newPolicyNo?.trim() ||
      dataToSave.newInsuranceCompany?.trim() ||
      dataToSave.newPolicyToDate ||
      dataToSave.newPolicyFromDate
    );

    const hasCompletedUtr = Boolean(
      dataToSave.paymentUtr && String(dataToSave.paymentUtr).trim().length > 0
    );

    // Only set renewed = YES and sync paymentDate to renewalDate when actively renewing or when payment UTR is completed
    if (hasRenewedFields || hasCompletedUtr || isRenew) {
      dataToSave.renewed = "YES";
      dataToSave.renewalStatus = "Renewed";
      if (dataToSave.paymentDate) {
        dataToSave.renewalDate = dataToSave.paymentDate;
        dataToSave.renewedDate = dataToSave.paymentDate;
      }
    } else {
      dataToSave.renewed = "NO";
      dataToSave.renewalStatus = "Pending";
      dataToSave.renewalDate = formData.renewalDate || "";
      dataToSave.renewedDate = formData.renewalDate || "";
    }

    // ONCE THE PAYMENT UTR STAGE IS COMPLETED (paymentUtr entered), RENEW THE OLD POLICY WITH THE NEW POLICY
    if (dataToSave.paymentUtr && dataToSave.paymentUtr.trim().length > 0) {
      // Overwrite previous policy fields with newly renewed policy details if present
      if (dataToSave.newInsuranceCompany) dataToSave.insuranceCompany = dataToSave.newInsuranceCompany;
      if (dataToSave.newPolicyNo) dataToSave.policyNo = dataToSave.newPolicyNo;
      if (dataToSave.newPolicyFromDate) dataToSave.policyFromDate = dataToSave.newPolicyFromDate;
      if (dataToSave.newPolicyToDate) dataToSave.policyToDate = dataToSave.newPolicyToDate;
      if (dataToSave.newIdv) dataToSave.idv = dataToSave.newIdv;
      if (dataToSave.newElectricalAccessoriesIdv) dataToSave.electricalAccessoriesIdv = dataToSave.newElectricalAccessoriesIdv;
      if (dataToSave.newCngKitIdv) dataToSave.cngKitIdv = dataToSave.newCngKitIdv;
      if (dataToSave.newHydraulicJackCover || dataToSave.newHydrolicJackCover) {
        dataToSave.hydraulicJackCover = dataToSave.newHydraulicJackCover || dataToSave.newHydrolicJackCover;
        dataToSave.hydrolicJackCover = dataToSave.hydraulicJackCover;
      }
      if (dataToSave.newModerationAmount || dataToSave.newModerationAmountTipper) {
        dataToSave.moderationAmount = dataToSave.newModerationAmount || dataToSave.newModerationAmountTipper;
        dataToSave.moderationAmountTipper = dataToSave.moderationAmount;
      }
      if (dataToSave.newTotalIdv) dataToSave.totalIdv = dataToSave.newTotalIdv;
      if (dataToSave.newPremiumAmount) dataToSave.premiumAmount = dataToSave.newPremiumAmount;
      if (dataToSave.newNcb) dataToSave.ncbPercentage = dataToSave.newNcb;
      if (dataToSave.newPremium) dataToSave.premium = dataToSave.newPremium;
      if (dataToSave.newRemarks) dataToSave.remarks = dataToSave.newRemarks;
      if (dataToSave.newOdPremium) dataToSave.odPremium = dataToSave.newOdPremium;
      if (dataToSave.newImt23) dataToSave.imt23 = dataToSave.newImt23;
      if (dataToSave.newImt24) dataToSave.imt24 = dataToSave.newImt24;
      if (dataToSave.newImt25) dataToSave.imt25 = dataToSave.newImt25;
      if (dataToSave.newTotalOdPremium) dataToSave.totalOdPremium = dataToSave.newTotalOdPremium;
      if (dataToSave.newImt17) dataToSave.imt17 = dataToSave.newImt17;
      if (dataToSave.newImt252) dataToSave.imt252 = dataToSave.newImt252;
      if (dataToSave.newImt28) dataToSave.imt28 = dataToSave.newImt28;
      if (dataToSave.newImt29) dataToSave.imt29 = dataToSave.newImt29;
      if (dataToSave.newLiabilityPremium) dataToSave.liabilityPremium = dataToSave.newLiabilityPremium;
      if (dataToSave.newTotalGst) dataToSave.totalGst = dataToSave.newTotalGst;
      if (dataToSave.newTotalPolicyPremium) dataToSave.totalPolicyPremium = dataToSave.newTotalPolicyPremium;

      if (Array.isArray(dataToSave.section3CustomFields) && dataToSave.section3CustomFields.length > 0) {
        dataToSave.section2CustomFields = dataToSave.section3CustomFields;
      }
      if (Array.isArray(dataToSave.section3BCustomFields) && dataToSave.section3BCustomFields.length > 0) {
        dataToSave.section2BCustomFields = dataToSave.section3BCustomFields;
      }

      // Clear renewed fields after promotion so they are ready for future renewal
      dataToSave.newInsuranceCompany = "";
      dataToSave.newPolicyNo = "";
      dataToSave.newPolicyFromDate = "";
      dataToSave.newPolicyToDate = "";
      dataToSave.newIdv = "";
      dataToSave.newElectricalAccessoriesIdv = "";
      dataToSave.newCngKitIdv = "";
      dataToSave.newHydraulicJackCover = "";
      dataToSave.newHydrolicJackCover = "";
      dataToSave.newModerationAmount = "";
      dataToSave.newModerationAmountTipper = "";
      dataToSave.newTotalIdv = "";
      dataToSave.newPremiumAmount = "";
      dataToSave.newNcb = "";
      dataToSave.newPremium = "";
      dataToSave.newRemarks = "";
      dataToSave.newOdPremium = "";
      dataToSave.newImt23 = "";
      dataToSave.newImt24 = "";
      dataToSave.newImt25 = "";
      dataToSave.newTotalOdPremium = "";
      dataToSave.newImt17 = "";
      dataToSave.newImt252 = "";
      dataToSave.newImt28 = "";
      dataToSave.newImt29 = "";
      dataToSave.newLiabilityPremium = "";
      dataToSave.newTotalGst = "";
      dataToSave.newTotalPolicyPremium = "";
      dataToSave.section3CustomFields = [];
      dataToSave.section3BCustomFields = [];
    }

    setSaving(true);
    try {
      let res;
      if (targetId && !isRenew) {
        res = await axios.put(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${targetId}`, dataToSave);
      } else {
        res = await axios.post(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop`, dataToSave);
      }
      const savedData = res.data?.data;
      alert(res.data?.message || "Record saved successfully!");

      if (savedData && savedData._id) {
        setFormData((prev) => ({ ...prev, ...savedData }));
        if (!targetId || isRenew) {
          navigate(`/fleet-insurance/edit/${savedData._id}`, { replace: true });
        }
      }
    } catch (err) {
      console.error("Error saving Fleet Insurance SOP:", err);
      alert(err.response?.data?.message || "Failed to save Record");
    } finally {
      setSaving(false);
    }
  };



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
          // Use renewed details from history as previous details (if available)
          insuranceCompany: prev.insuranceCompany || latest.newInsuranceCompany || latest.insuranceCompany || "",
          policyNo: prev.policyNo || latest.newPolicyNo || latest.policyNo || "",
          policyFromDate: prev.policyFromDate || latest.newPolicyFromDate || latest.policyFromDate || "",
          policyToDate: prev.policyToDate || latest.newPolicyToDate || latest.policyToDate || "",
          idv: prev.idv || latest.newIdv || latest.idv || "",
          electricalAccessoriesIdv: prev.electricalAccessoriesIdv || latest.newElectricalAccessoriesIdv || latest.electricalAccessoriesIdv || "",
          cngKitIdv: prev.cngKitIdv || latest.newCngKitIdv || latest.cngKitIdv || "",
          hydraulicJackCover: prev.hydraulicJackCover || latest.newHydraulicJackCover || latest.hydraulicJackCover || latest.hydrolicJackCover || "",
          hydrolicJackCover: prev.hydrolicJackCover || latest.newHydrolicJackCover || latest.hydrolicJackCover || latest.hydraulicJackCover || "",
          moderationAmount: prev.moderationAmount || latest.newModerationAmount || latest.moderationAmount || latest.moderationAmountTipper || "",
          moderationAmountTipper: prev.moderationAmountTipper || latest.newModerationAmountTipper || latest.moderationAmountTipper || latest.moderationAmount || "",
          totalIdv: prev.totalIdv || latest.newTotalIdv || latest.totalIdv || "",
          premiumAmount: prev.premiumAmount || latest.newPremiumAmount || latest.totalPolicyPremium || latest.premiumAmount || "",
          ncbPercentage: prev.ncbPercentage || latest.newNcb || latest.ncbPercentage || "",
          premium: prev.premium || latest.newPremium || latest.premium || "",
          remarks: prev.remarks || latest.newRemarks || latest.remarks || "",
          odPremium: prev.odPremium || latest.newOdPremium || latest.odPremium || "",
          imt23: prev.imt23 || latest.newImt23 || latest.imt23 || "",
          imt24: prev.imt24 || latest.newImt24 || latest.imt24 || "",
          imt25: prev.imt25 || latest.newImt25 || latest.imt25 || "",
          totalOdPremium: prev.totalOdPremium || latest.newTotalOdPremium || latest.totalOdPremium || "",
          imt17: prev.imt17 || latest.newImt17 || latest.imt17 || "",
          imt252: prev.imt252 || latest.newImt252 || latest.imt252 || "",
          imt28: prev.imt28 || latest.newImt28 || latest.imt28 || "",
          imt29: prev.imt29 || latest.newImt29 || latest.imt29 || "",
          liabilityPremium: prev.liabilityPremium || latest.newLiabilityPremium || latest.liabilityPremium || "",
          totalGst: prev.totalGst || latest.newTotalGst || latest.totalGst || "",
          totalPolicyPremium: prev.totalPolicyPremium || latest.newTotalPolicyPremium || latest.totalPolicyPremium || "",
        }));
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error("Error fetching vehicle history:", err);
      }
    }
  }, [proposal]);

  // Auto-calc: Previous OD Total (OD + Hydraulic Jack + Moderation + IMT23 + IMT24 + IMT25 - NCB)
  useEffect(() => {
    const od = Number(formData.odPremium) || 0;
    const jack = Number(formData.hydraulicJackCoverPremium ?? formData.hydraulicJackCover ?? formData.hydrolicJackCover) || 0;
    const mod = Number(formData.moderationAmountTipper ?? formData.moderationAmount) || 0;
    const imt23 = Number(formData.imt23) || 0;
    const imt24 = Number(formData.imt24) || 0;
    const imt25 = Number(formData.imt25) || 0;
    const ncb = Number(formData.ncbAmount ?? formData.ncb) || 0;

    const calcTotalOd = od + jack + mod + imt23 + imt24 + imt25 - ncb;

    if (calcTotalOd !== undefined && formData.totalOdPremium !== calcTotalOd) {
      setFormData((prev) => ({ ...prev, totalOdPremium: calcTotalOd }));
    }
  }, [
    formData.odPremium,
    formData.hydraulicJackCoverPremium,
    formData.hydraulicJackCover,
    formData.hydrolicJackCover,
    formData.moderationAmountTipper,
    formData.moderationAmount,
    formData.imt23,
    formData.imt24,
    formData.imt25,
    formData.ncbAmount,
    formData.ncb,
    formData.totalOdPremium,
  ]);

  // Auto-calc: Renewed OD Total (OD + Hydraulic Jack + Moderation + IMT23 + IMT24 + IMT25 - NCB)
  useEffect(() => {
    const od = Number(formData.newOdPremium) || 0;
    const jack = Number(formData.newHydraulicJackCoverPremium ?? formData.newHydraulicJackCover ?? formData.newHydrolicJackCover) || 0;
    const mod = Number(formData.newModerationAmountTipper ?? formData.newModerationAmount) || 0;
    const imt23 = Number(formData.newImt23) || 0;
    const imt24 = Number(formData.newImt24) || 0;
    const imt25 = Number(formData.newImt25) || 0;
    const ncb = Number(formData.newNcbAmount ?? formData.newNcb) || 0;

    const calcTotalOd = od + jack + mod + imt23 + imt24 + imt25 - ncb;

    if (calcTotalOd !== undefined && formData.newTotalOdPremium !== calcTotalOd) {
      setFormData((prev) => ({ ...prev, newTotalOdPremium: calcTotalOd }));
    }
  }, [
    formData.newOdPremium,
    formData.newHydraulicJackCoverPremium,
    formData.newHydraulicJackCover,
    formData.newHydrolicJackCover,
    formData.newModerationAmountTipper,
    formData.newModerationAmount,
    formData.newImt23,
    formData.newImt24,
    formData.newImt25,
    formData.newNcbAmount,
    formData.newNcb,
    formData.newTotalOdPremium,
  ]);



  // Auto-calc: Previous / Current Total IDV (Vehicle IDV + Electrical Accessories IDV + CNG Kit IDV)
  useEffect(() => {
    const vIdv = Number(formData.idv) || 0;
    const elecIdv = Number(formData.electricalAccessoriesIdv) || 0;
    const cngIdv = Number(formData.cngKitIdv) || 0;
    const calcTotalIdv = vIdv + elecIdv + cngIdv;

    if (calcTotalIdv > 0 && formData.totalIdv !== calcTotalIdv) {
      setFormData((prev) => ({ ...prev, totalIdv: calcTotalIdv }));
    }
  }, [formData.idv, formData.electricalAccessoriesIdv, formData.cngKitIdv, formData.totalIdv]);

  // Auto-calc: Renewed Total IDV (New Vehicle IDV + New Electrical Accessories IDV + New CNG Kit IDV)
  useEffect(() => {
    const vIdv = Number(formData.newIdv) || 0;
    const elecIdv = Number(formData.newElectricalAccessoriesIdv) || 0;
    const cngIdv = Number(formData.newCngKitIdv) || 0;
    const calcTotalIdv = vIdv + elecIdv + cngIdv;

    if (calcTotalIdv > 0 && formData.newTotalIdv !== calcTotalIdv) {
      setFormData((prev) => ({ ...prev, newTotalIdv: calcTotalIdv }));
    }
  }, [formData.newIdv, formData.newElectricalAccessoriesIdv, formData.newCngKitIdv, formData.newTotalIdv]);

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
    <Box sx={{ pb: 10 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "#1a237e" }}>
          {isView ? "View Vehicle Record" : (proposal?._id ? (isRenew ? "Renew Vehicle Policy" : "Edit Vehicle Record") : "Add Vehicle Record")}
        </Typography>
      </Box>

      {/* Floating Save/Cancel Buttons */}
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
            Save Record
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<Cancel />}
          onClick={handleCancelClick}
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
          {isView ? "Back to Tracker" : "Cancel"}
        </Button>
      </Paper>

      {/* Vehicle Summary Context Header Card */}
      {tabValue !== 0 && (
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
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Registration No.
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#2563eb" }}>
                {formData.registrationNo || "-"}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Insurance Company
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#0f172a" }}>
                {formData.newInsuranceCompany || formData.insuranceCompany || "-"}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Renewal Total IDV
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#0f172a" }}>
                ₹ {Number(formData.newTotalIdv || formData.totalIdv || 0).toLocaleString("en-IN")}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Expiry Date
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#dc2626" }}>
                {formData.policyToDate ? new Date(formData.policyToDate).toLocaleDateString("en-IN") : "-"}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Renewed Premium
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#16a34a" }}>
                ₹ {Number(formData.newTotalPolicyPremium || formData.totalPolicyPremium || 0).toLocaleString("en-IN")}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Stage Stepper Tabs */}
      <Paper elevation={0} sx={{ borderRadius: "12px", border: "1px solid", borderColor: "divider", mb: 3, overflow: "hidden" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "#f8fafc", px: 1 }}>
          <Tabs
            value={tabValue}
            onChange={handleChangeTab}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="fleet insurance stage tabs"
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
                sx={{
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  textTransform: "none",
                  color: tabValue === idx ? "#2563eb" : "#64748b",
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
              <CustomTabPanel key={idx} value={tabValue} index={idx}>
                <fieldset disabled={isView} style={{ border: "none", padding: 0, margin: 0 }}>
                  <Component
                    formData={formData}
                    handleChange={handleChange}
                    handleRegistrationBlur={handleRegistrationBlur}
                    formatDateValue={formatDateValue}
                    isView={isView}
                    isRenew={isRenew}
                  />
                </fieldset>
              </CustomTabPanel>
            );
          })}
        </Box>
      </Paper>
    </Box>
  );
}

export default React.memo(FleetInsuranceForm);

