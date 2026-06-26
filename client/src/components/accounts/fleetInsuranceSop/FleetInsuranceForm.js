import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from "@mui/material";
import { Save, Cancel } from "@mui/icons-material";

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
  quotations: [],
  selectedInsurerL1: "",
  reasonForSelection: "",
};

function FleetInsuranceForm({ proposal, onSaved, onCancel }) {
  const [formData, setFormData] = useState(emptyRecord);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (proposal?._id) {
      setLoading(true);
      axios
        .get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${proposal._id}`)
        .then((res) => {
          setFormData({ ...emptyRecord, ...(res.data.data || {}) });
        })
        .catch((err) => {
          console.error("Error fetching Fleet Insurance SOP:", err);
          alert("Failed to fetch Record details");
        })
        .finally(() => setLoading(false));
    } else {
      setFormData(emptyRecord);
    }
  }, [proposal]);

  const handleChange = useCallback((field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  }, []);

  const handleSave = async () => {
    if (!formData.registrationNo?.trim()) {
      alert("Registration Number is required");
      return;
    }
    setSaving(true);
    try {
      if (proposal?._id) {
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

  const handleAddQuotation = () => {
    setFormData((prev) => ({
      ...prev,
      quotations: [
        ...(prev.quotations || []),
        { insuranceCompany: "", idv: "", odPremium: "", liabilityPremium: "", totalPremium: "" },
      ],
    }));
  };

  const handleQuotationChange = (index, field, val) => {
    const newQuotations = [...(formData.quotations || [])];
    newQuotations[index][field] = val;
    setFormData((prev) => ({ ...prev, quotations: newQuotations }));
  };

  const handleRemoveQuotation = (index) => {
    const newQuotations = [...(formData.quotations || [])];
    newQuotations.splice(index, 1);
    setFormData((prev) => ({ ...prev, quotations: newQuotations }));
  };

  const handleSelectL1 = (index) => {
    const selected = formData.quotations[index];
    setFormData((prev) => ({
      ...prev,
      selectedInsurerL1: selected.insuranceCompany,
      premiumQuote: selected.totalPremium,
      newIdv: selected.idv,
    }));
  };

  const formatDateValue = (dateStr) => {
    return dateStr ? String(dateStr).split("T")[0] : "";
  };

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
          {proposal?._id ? "Edit Vehicle Record" : "Add Vehicle Record"}
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
            onClick={handleSave}
            disabled={saving}
          >
            Save Record
          </Button>
          <Button variant="outlined" startIcon={<Cancel />} onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </Box>
      </Box>

      {/* Vehicle Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="primary">
          1. Vehicle Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Sr. No." type="number" value={formData.srNo} onChange={(e) => handleChange("srNo", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Registration No. *" value={formData.registrationNo} onChange={(e) => handleChange("registrationNo", e.target.value)} fullWidth size="small" required />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Registration Date" type="date" InputLabelProps={{ shrink: true }} value={formatDateValue(formData.registrationDate)} onChange={(e) => handleChange("registrationDate", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Owner" value={formData.owner} onChange={(e) => handleChange("owner", e.target.value)} fullWidth size="small" />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Make/Model" value={formData.makeModel} onChange={(e) => handleChange("makeModel", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Model" value={formData.modelType} onChange={(e) => handleChange("modelType", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Size" value={formData.size} onChange={(e) => handleChange("size", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="GVW" type="number" value={formData.gvw} onChange={(e) => handleChange("gvw", e.target.value)} fullWidth size="small" />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Owner From" type="date" InputLabelProps={{ shrink: true }} value={formatDateValue(formData.fromOwner)} onChange={(e) => handleChange("fromOwner", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Owner To" type="date" InputLabelProps={{ shrink: true }} value={formatDateValue(formData.toOwner)} onChange={(e) => handleChange("toOwner", e.target.value)} fullWidth size="small" />
          </Grid>
        </Grid>
      </Paper>

      {/* Previous Policy Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="primary">
          2. Previous Policy Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField label="Insurance Company" value={formData.insuranceCompany} onChange={(e) => handleChange("insuranceCompany", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField label="Policy No." value={formData.policyNo} onChange={(e) => handleChange("policyNo", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField label="Valid From" type="date" InputLabelProps={{ shrink: true }} value={formatDateValue(formData.policyFromDate)} onChange={(e) => handleChange("policyFromDate", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField label="Valid To" type="date" InputLabelProps={{ shrink: true }} value={formatDateValue(formData.policyToDate)} onChange={(e) => handleChange("policyToDate", e.target.value)} fullWidth size="small" />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField label="IDV (₹)" type="number" value={formData.idv} onChange={(e) => handleChange("idv", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Premium Amount (₹)" type="number" value={formData.premiumAmount} onChange={(e) => handleChange("premiumAmount", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="NCB" type="number" value={formData.ncbPercentage} onChange={(e) => handleChange("ncbPercentage", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Premium (₹)" type="number" value={formData.premium} onChange={(e) => handleChange("premium", e.target.value)} fullWidth size="small" />
          </Grid>

          <Grid item xs={12}>
            <TextField label="Remarks" multiline rows={2} value={formData.remarks} onChange={(e) => handleChange("remarks", e.target.value)} fullWidth size="small" />
          </Grid>
        </Grid>
      </Paper>

      {/* Renewal Processing */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="primary">
          3. Quotation Comparison & Selection
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Compare quotes here. Selecting an L1 will automatically update the Premium Quote and New IDV below.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell>Insurer</TableCell>
                <TableCell>IDV (₹)</TableCell>
                <TableCell>OD Premium (₹)</TableCell>
                <TableCell>Liability (₹)</TableCell>
                <TableCell>Total (₹)</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(formData.quotations || []).map((q, idx) => (
                <TableRow key={idx} sx={{ backgroundColor: formData.selectedInsurerL1 === q.insuranceCompany && q.insuranceCompany ? "#e8f5e9" : "inherit" }}>
                  <TableCell>
                    <TextField value={q.insuranceCompany} onChange={(e) => handleQuotationChange(idx, "insuranceCompany", e.target.value)} size="small" placeholder="Name" />
                  </TableCell>
                  <TableCell>
                    <TextField type="number" value={q.idv} onChange={(e) => handleQuotationChange(idx, "idv", e.target.value)} size="small" />
                  </TableCell>
                  <TableCell>
                    <TextField type="number" value={q.odPremium} onChange={(e) => handleQuotationChange(idx, "odPremium", e.target.value)} size="small" />
                  </TableCell>
                  <TableCell>
                    <TextField type="number" value={q.liabilityPremium} onChange={(e) => handleQuotationChange(idx, "liabilityPremium", e.target.value)} size="small" />
                  </TableCell>
                  <TableCell>
                    <TextField type="number" value={q.totalPremium} onChange={(e) => handleQuotationChange(idx, "totalPremium", e.target.value)} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Button size="small" variant="contained" color="success" onClick={() => handleSelectL1(idx)} sx={{ mr: 1 }}>Select L1</Button>
                    <Button size="small" color="error" onClick={() => handleRemoveQuotation(idx)}>X</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="outlined" size="small" onClick={handleAddQuotation} sx={{ mt: 1 }}>+ Add Quotation</Button>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Selected Insurer (L1)" value={formData.selectedInsurerL1} onChange={(e) => handleChange("selectedInsurerL1", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Reason for Selection" value={formData.reasonForSelection} onChange={(e) => handleChange("reasonForSelection", e.target.value)} fullWidth size="small" />
          </Grid>
        </Grid>
      </Paper>

      {/* Renewal Final Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="primary">
          4. Renewal Final Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="This Year IDV (₹)" type="number" value={formData.thisYearIdv} onChange={(e) => handleChange("thisYearIdv", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="NEW IDV (₹)" type="number" value={formData.newIdv} onChange={(e) => handleChange("newIdv", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="NEW NCB (%)" type="number" value={formData.newNcbPercentage} onChange={(e) => handleChange("newNcbPercentage", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="RSD TAKEN (₹)" type="number" value={formData.rsdTaken} onChange={(e) => handleChange("rsdTaken", e.target.value)} fullWidth size="small" />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField label="IMT 23" type="number" value={formData.imt23} onChange={(e) => handleChange("imt23", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField select label="Zero Dep + Towing Cover" value={formData.zeroDepTowingCover} onChange={(e) => handleChange("zeroDepTowingCover", e.target.value)} fullWidth size="small">
              <MenuItem value="YES">YES</MenuItem>
              <MenuItem value="NO">NO</MenuItem>
              <MenuItem value="">Select</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField label="PREMIUM QUOTE (₹)" type="number" value={formData.premiumQuote} onChange={(e) => handleChange("premiumQuote", e.target.value)} fullWidth size="small" />
          </Grid>
        </Grid>
      </Paper>

      {/* Final Status */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom color="primary">
          5. Final Renewal Status
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField select label="Renewed?" value={formData.renewed} onChange={(e) => handleChange("renewed", e.target.value)} fullWidth size="small">
              <MenuItem value="YES">YES</MenuItem>
              <MenuItem value="NO">NO</MenuItem>
              <MenuItem value="">Select</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField label="Renewed Date" type="date" InputLabelProps={{ shrink: true }} value={formatDateValue(formData.renewedDate)} onChange={(e) => handleChange("renewedDate", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField label="New Expiry Date" type="date" InputLabelProps={{ shrink: true }} value={formatDateValue(formData.newExpiryDate)} onChange={(e) => handleChange("newExpiryDate", e.target.value)} fullWidth size="small" />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default React.memo(FleetInsuranceForm);
