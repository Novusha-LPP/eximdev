import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col } from "react-bootstrap";
import {
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Divider,
  MenuItem,
  IconButton,
  Snackbar,
  Alert,
  Paper,
  Box
} from "@mui/material";
import { 
  ExpandMore, 
  Add, 
  RemoveCircleOutline, 
  Business, 
  AccountBalance, 
  LocationOn,
  ArrowBack
} from "@mui/icons-material";

const CATEGORIES = [
  'Individual/ Proprietary Firm', 
  'Partnership Firm', 
  'Company', 
  'Trust Foundations'
];

const OrganizationForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    category: "Company",
    iec_no: "",
    pan_no: "",
    gst_no: "",
    address: { line1: "", line2: "", city: "", state: "", pinCode: "" },
    banks: [],
    branches: [],
    factory_addresses: []
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    if (id) {
      fetchOrganizationDetails();
    }
  }, [id]);

  const fetchOrganizationDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/organization`);
      const org = res.data.organizations.find(o => o._id === id);
      if (org) {
        setFormData({
          name: org.name,
          contact: org.contact,
          email: org.email,
          category: org.category || "Company",
          iec_no: org.iec_no || "",
          pan_no: org.pan_no || "",
          gst_no: org.gst_no || "",
          address: org.addressDetails || { line1: "", line2: "", city: "", state: "", pinCode: "" },
          banks: org.banks || [],
          branches: org.branches || [],
          factory_addresses: org.factory_addresses || []
        });
      }
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, address: { ...formData.address, [name]: value } });
  };

  const addEntry = (listName, emptyObj) => {
    setFormData({ ...formData, [listName]: [...formData[listName], emptyObj] });
  };

  const removeEntry = (listName, index) => {
    const updated = [...formData[listName]];
    updated.splice(index, 1);
    setFormData({ ...formData, [listName]: updated });
  };

  const handleEntryChange = (listName, index, field, value) => {
    const updated = [...formData[listName]];
    updated[index][field] = value;
    setFormData({ ...formData, [listName]: updated });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (id) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/organization/${id}`, formData);
        setSnackbar({ open: true, message: "Updated successfully!", severity: "success" });
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/organization`, formData);
        setSnackbar({ open: true, message: "Created successfully!", severity: "success" });
      }
      setTimeout(() => navigate("/organization-directory"), 1500);
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.message || "Operation failed.", 
        severity: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate("/organization-directory")} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {id ? "Edit Organization" : "Create New Organization"}
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 4, borderRadius: '16px', border: '1px solid #e2e8f0', background: '#fff' }}>
        <Row>
          <Col md={12}><Typography variant="h6" gutterBottom color="primary"><Business sx={{ mr: 1, verticalAlign: 'middle' }} />Principal Details</Typography></Col>
          <Col md={4}><TextField name="name" label="Organization Name" value={formData.name} onChange={handleChange} fullWidth margin="normal" /></Col>
          <Col md={4}><TextField select name="category" label="Category" value={formData.category} onChange={handleChange} fullWidth margin="normal">
            {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField></Col>
          <Col md={4}><TextField name="iec_no" label="IE Code" value={formData.iec_no} onChange={handleChange} fullWidth margin="normal" /></Col>
          
          <Col md={4}><TextField name="pan_no" label="PAN No" value={formData.pan_no} onChange={handleChange} fullWidth margin="normal" /></Col>
          <Col md={4}><TextField name="gst_no" label="GST No" value={formData.gst_no} onChange={handleChange} fullWidth margin="normal" /></Col>
          <Col md={4}><TextField name="contact" label="Contact Number" value={formData.contact} onChange={handleChange} fullWidth margin="normal" /></Col>
          <Col md={4}><TextField name="email" label="Email Address" value={formData.email} onChange={handleChange} fullWidth margin="normal" /></Col>
        </Row>

        <Divider sx={{ my: 4 }} />

        <Row>
          <Col md={6}>
            <Typography variant="h6" gutterBottom color="primary"><LocationOn sx={{ mr: 1, verticalAlign: 'middle' }} />Permanent Address</Typography>
            <TextField name="line1" label="Address Line 1" value={formData.address.line1} onChange={handleAddressChange} fullWidth margin="normal" />
            <TextField name="line2" label="Address Line 2" value={formData.address.line2} onChange={handleAddressChange} fullWidth margin="normal" />
            <Row>
              <Col md={4}><TextField name="city" label="City" value={formData.address.city} onChange={handleAddressChange} fullWidth margin="normal" /></Col>
              <Col md={4}><TextField name="state" label="State" value={formData.address.state} onChange={handleAddressChange} fullWidth margin="normal" /></Col>
              <Col md={4}><TextField name="pinCode" label="Pin Code" value={formData.address.pinCode} onChange={handleAddressChange} fullWidth margin="normal" /></Col>
            </Row>
          </Col>

          <Col md={6}>
            <Accordion elevation={0} sx={{ border: '1px solid #e2e8f0', mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}><Typography><AccountBalance sx={{ mr: 1, verticalAlign: 'middle' }} />Bank Details ({formData.banks.length})</Typography></AccordionSummary>
              <AccordionDetails>
                {formData.banks.map((b, i) => (
                  <Box key={i} sx={{ mb: 2, p: 2, border: '1px dashed #cbd5e0', borderRadius: '8px', position: 'relative' }}>
                    <IconButton size="small" color="error" onClick={() => removeEntry('banks', i)} sx={{ position: 'absolute', right: 0, top: 0 }}><RemoveCircleOutline fontSize="inherit" /></IconButton>
                    <Row>
                      <Col md={6}><TextField label="Bank" value={b.bankers_name} onChange={e => handleEntryChange('banks', i, 'bankers_name', e.target.value)} fullWidth size="small" margin="dense" /></Col>
                      <Col md={4}><TextField label="A/C No" value={b.account_no} onChange={e => handleEntryChange('banks', i, 'account_no', e.target.value)} fullWidth size="small" margin="dense" /></Col>
                      <Col md={4}><TextField label="IFSC" value={b.ifsc} onChange={e => handleEntryChange('banks', i, 'ifsc', e.target.value)} fullWidth size="small" margin="dense" /></Col>
                      <Col md={4}><TextField label="AD Code" value={b.adCode} onChange={e => handleEntryChange('banks', i, 'adCode', e.target.value)} fullWidth size="small" margin="dense" /></Col>
                    </Row>
                  </Box>
                ))}
                <Button startIcon={<Add />} variant="outlined" sx={{ mt: 1 }} onClick={() => addEntry('banks', { bankers_name: '', account_no: '', ifsc: '', adCode: '' })}>Add Bank Account</Button>
              </AccordionDetails>
            </Accordion>

            <Accordion elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
              <AccordionSummary expandIcon={<ExpandMore />}><Typography><Business sx={{ mr: 1, verticalAlign: 'middle' }} />Factory Details & GST ({formData.factory_addresses.length})</Typography></AccordionSummary>
              <AccordionDetails>
                {formData.factory_addresses.map((f, i) => (
                  <Box key={i} sx={{ mb: 2, p: 2, border: '1px dashed #cbd5e0', borderRadius: '8px', position: 'relative' }}>
                    <IconButton size="small" color="error" onClick={() => removeEntry('factory_addresses', i)} sx={{ position: 'absolute', right: 0, top: 0 }}><RemoveCircleOutline fontSize="inherit" /></IconButton>
                    <Row>
                      <Col md={8}><TextField label="Factory Line 1" value={f.factory_address_line_1} onChange={e => handleEntryChange('factory_addresses', i, 'factory_address_line_1', e.target.value)} fullWidth size="small" margin="dense" /></Col>
                      <Col md={4}><TextField label="GST No" value={f.gst} onChange={e => handleEntryChange('factory_addresses', i, 'gst', e.target.value)} fullWidth size="small" margin="dense" /></Col>
                      <Col md={6}><TextField label="City" value={f.factory_address_city} onChange={e => handleEntryChange('factory_addresses', i, 'factory_address_city', e.target.value)} fullWidth size="small" margin="dense" /></Col>
                    </Row>
                  </Box>
                ))}
                <Button startIcon={<Add />} variant="outlined" sx={{ mt: 1 }} onClick={() => addEntry('factory_addresses', { factory_address_line_1: '', gst: '', factory_address_city: '', factory_address_state: '', factory_address_pin_code: '' })}>Add Factory Location</Button>
              </AccordionDetails>
            </Accordion>
          </Col>
        </Row>

        <Box display="flex" justifyContent="flex-end" mt={6} gap={2}>
          <Button variant="outlined" color="secondary" onClick={() => navigate("/organization-directory")} sx={{ px: 4 }}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit} sx={{ px: 6, py: 1.5, fontWeight: 'bold' }} disabled={loading}>
            {loading ? "Saving..." : (id ? "Update Organization" : "Create Organization")}
          </Button>
        </Box>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </div>
  );
};

export default OrganizationForm;
