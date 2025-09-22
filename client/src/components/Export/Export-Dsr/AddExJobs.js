import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControlLabel,
  Menu,
  MenuList,
  MenuItem as MuiMenuItem,
  Popper,
  ClickAwayListener
} from '@mui/material';
import {
  Add as AddIcon,
  Business as BusinessIcon,
  LocalShipping as ShippingIcon,
  Description as DescriptionIcon,
  AccountBalance as BankIcon,
  Assignment as AssignmentIcon,
  Clear as ClearIcon,
  Security as SecurityIcon,
  Payment as PaymentIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Inventory as InventoryIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Update as UpdateIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';

const ExportShipmentForm = () => {
  // Tab state
  const [currentTab, setCurrentTab] = useState(0);
  const [subTab, setSubTab] = useState(0);
  const [documentsMenuOpen, setDocumentsMenuOpen] = useState(false);
  const [documentsAnchorEl, setDocumentsAnchorEl] = useState(null);

  // Form state matching all the fields from images
  const [formData, setFormData] = useState({
    // General Tab Fields (from top header)
    filing_mode: 'ICEGATE',
    job_no: '',
    loading_port: 'ICD SACHANA',
    transport_mode: 'Sea',
    job_received_on: '',
    sb_no: '5296776',
    job_owner: 'jyotisha K R',
    custom_house: 'ICD SACHANA',
    sb_type: 'Green - Drawback',
    job_date: new Date(),
    consignment_type: 'FCL',

    // Entity Tab - Exporter Information
    exporter_name: 'LAXCON STEELS LTD - EXPORT',
    branch_code: '0',
    exporter_address: 'SURVEY NO. 346/1, BAVLA ROAD, NH-8A, VILLAGE SART, TAL SANAND\nAhmedabad - 382220,\nGujarat,',
    exporter_state: 'Gujarat',
    ie_code_no: '0800002881',
    regn_no: '24AAAACL5064A1Z3',
    gstin_of_norm: '24AAAACL5064A1Z3',
    
    // Bank Information
    bank_details: 'INDIAN OVERSEAS BANK\nASHRAM ROAD BRANCH\nAHMEDABAD',
    bank_ac_number: '293302000100129',
    ad_code: '0270355',
    
    // Consignee Information
    consignee_name: 'TO ORDER',
    consignee_address: 'KOREA',
    consignee_country: 'Korea, Republic of',
    notify_party: '',
    notify_address: '',
    sales_person: '',
    business_dimensions: '',
    quotation: '',

    // Invoice Tab Fields
    buyers_order_no: '',
    buyers_order_date: '',
    other_references: '',
    terms_of_delivery: 'TO:CIF\nNature of Payment: Letter Of Credit\nPayment Days: 0 days',
    origin_country: 'INDIA',
    invoice_header: '',

    // Shipment Tab Fields
    discharge_port: 'Busan(Korea) (KRBUS)',
    discharge_country: 'Korea, Republic of',
    destination_port: 'Busan(Korea) (KRBUS)',
    destination_country: 'Korea, Republic of',
    shipping_line: '',
    vessel_sailing_date: '',
    voyage_no: '',
    egm_no_date: '',
    mbl_no_date: '',
    hbl_no_date: '',
    pre_carriage_by: '',
    place_of_receipt: '',
    transhipper_code: '',
    gateway_port: 'ICD SACHANA',
    state_of_origin: 'GUJARAT',
    annexure_c_details_filed: false,

    // Cargo Details
    nature_of_cargo: 'C - Containerised',
    total_no_of_pkgs: '31',
    unit: 'BDL',
    loose_pkgs: '0',
    no_of_containers: '',
    gross_weight: '22827.000',
    net_weight: '22669.000',
    volume: '0.000',
    chargeable_weight: '0.000',
    marks_and_nos: 'WE INTEND TO CLAIM RODTEP\nSCHEME Invoice No: 90004319\nInvoice Date: 14 September 2025',

    // Ex-Bond Details Tab
    q_cert_no_date: '',
    type_of_shipment: 'Outright Sale',
    specify_other: '',
    permission_no_date: '',
    export_under: 'Other',
    sb_heading: 'STAINLESS STEEL BARD',
    export_trade_control: '',
    sb_bottom_text: '',

    // Stuffing Details Tab
    goods_stuffed_at: 'Factory',
    sample_accompanied: false,
    factory_address: '',
    warehouse_code: '',
    seal_type: '',
    seal_no: '',
    agency_name: '',

    // Annex C1 Details Tab
    ie_code_of_eou: '',
    branch_sl_no: '0',
    examination_date: '',
    examining_officer: '',
    supervising_officer: '',
    commissionerate: '',
    verified_by_examining_officer: false,
    seal_number: '',
    designation_fields: {
      designation1: '',
      designation2: '',
      division: '',
      range: ''
    },
    sample_forwarded: false,

    // Documents section
    documents: []
  });

  // Document types for the Standard Documents dropdown
  const standardDocuments = [
    'Shipping Bill',
    'Shipping Bill (GST)',
    'Annexure',
    'Invoice',
    'Packing List',
    'Certificate Of Origin',
    'GSP / ISFTA',
    'CheckList',
    'Goods Regn. Checklist',
    'N-Form',
    'GR-Form',
    'SEZ Submission',
    'ICEGATE Submission',
    'GR Submission',
    'BL Instruction'
  ];

  // Organization and loading states
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Main tabs
  const mainTabs = [
    { label: 'General', icon: <AssignmentIcon /> },
    { label: 'Entity', icon: <BusinessIcon /> },
    { label: 'SEZ Info', icon: <SecurityIcon /> },
    { label: 'Shipment', icon: <ShippingIcon /> },
    { label: 'Container', icon: <InventoryIcon /> },
    { label: 'Invoice', icon: <PaymentIcon /> },
    { label: 'Product', icon: <DescriptionIcon /> },
    { label: 'Exch. Rate', icon: <BankIcon /> },
    { label: 'eSanchar', icon: <LocationIcon /> },
    { label: 'Charges', icon: <PaymentIcon /> },
    { label: 'Financial', icon: <BankIcon /> }
  ];

  // Sub-tabs for shipment section
  const shipmentSubTabs = [
    'Main',
    'Stuffing Details',
    'Invoice Printing',
    'Shipping Bill Printing',
    'Ex-Bond Details',
    'Annex C1 Details'
  ];

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    setError('');
  };

  const handleStandardDocuments = (event) => {
    setDocumentsAnchorEl(event.currentTarget);
    setDocumentsMenuOpen(true);
  };

  const handleDocumentSelect = (document) => {
    console.log('Selected document:', document);
    setDocumentsMenuOpen(false);
    setDocumentsAnchorEl(null);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AssignmentIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
              Task - Update
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small">Copy Previous Job</Button>
            <Button variant="outlined" size="small">Import From File</Button>
            <Button variant="outlined" size="small">Declarations</Button>
            <Button 
              variant="contained" 
              size="small"
              onClick={handleStandardDocuments}
              sx={{ bgcolor: 'grey.600', '&:hover': { bgcolor: 'grey.700' } }}
            >
              Standard Documents
            </Button>
            <Button variant="contained" color="error" size="small" onClick={() => window.close()}>
              Close
            </Button>
          </Box>
        </Box>

        {/* Standard Documents Menu */}
        <Menu
          anchorEl={documentsAnchorEl}
          open={documentsMenuOpen}
          onClose={() => setDocumentsMenuOpen(false)}
          PaperProps={{
            style: {
              maxHeight: 300,
              width: '200px',
            },
          }}
        >
          {standardDocuments.map((document) => (
            <MuiMenuItem 
              key={document} 
              onClick={() => handleDocumentSelect(document)}
              sx={{ fontSize: '0.875rem' }}
            >
              {document}
            </MuiMenuItem>
          ))}
        </Menu>

        {/* Top Information Bar */}
        <Card elevation={1} sx={{ mb: 2, bgcolor: '#e3f2fd' }}>
          <CardContent sx={{ py: 1 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={2}>
                <Typography variant="body2" color="text.secondary">Job Number</Typography>
                <Typography variant="body2" fontWeight="medium">AMD/EXP/SEA/01451/25-26</Typography>
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="body2" color="text.secondary">Job Date</Typography>
                <Typography variant="body2" fontWeight="medium">15-Sep-2025</Typography>
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="body2" color="text.secondary">Job Received On</Typography>
                <Typography variant="body2" fontWeight="medium">15-Sep-2025 10:45</Typography>
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="body2" color="text.secondary">SB No</Typography>
                <Typography variant="body2" fontWeight="medium" color="primary">5296776</Typography>
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="body2" color="text.secondary">Job Owner</Typography>
                <Typography variant="body2" fontWeight="medium">jyotisha K R</Typography>
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Typography variant="body2" fontWeight="medium" color="success.main">59 mins left 🔔 Active</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Main Form Fields Row */}
        <Card elevation={1} sx={{ mb: 2 }}>
          <CardContent sx={{ py: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={1.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filing Mode</InputLabel>
                  <Select value={formData.filing_mode} label="Filing Mode">
                    <MenuItem value="ICEGATE">ICEGATE</MenuItem>
                    <MenuItem value="RAJANSFL">RAJANSFL</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Loading Port"
                  value={formData.loading_port}
                  onChange={(e) => handleInputChange('loading_port', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Transport Mode"
                  value={formData.transport_mode}
                  onChange={(e) => handleInputChange('transport_mode', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Job Received On"
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={formData.job_received_on}
                  onChange={(e) => handleInputChange('job_received_on', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  label="SB No"
                  value={formData.sb_no}
                  onChange={(e) => handleInputChange('sb_no', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={1.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Job Owner</InputLabel>
                  <Select value={formData.job_owner} label="Job Owner">
                    <MenuItem value="jyotisha K R">jyotisha K R</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={1}>
                <Button variant="outlined" fullWidth size="small" onClick={handleStandardDocuments}>
                  Standard Documents
                </Button>
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mt: 1 }} alignItems="center">
              <Grid item xs={12} md={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Job Number"
                  value="AMD/EXP/SEA/01451/25-26"
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={12} md={1.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Custom House</InputLabel>
                  <Select value={formData.custom_house} label="Custom House">
                    <MenuItem value="ICD SACHANA">ICD SACHANA</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={1.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>S/B Type</InputLabel>
                  <Select value={formData.sb_type} label="S/B Type">
                    <MenuItem value="Green - Drawback">Green - Drawback</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={1.5}>
                <DatePicker
                  label="Job Date"
                  value={formData.job_date}
                  onChange={(newValue) => handleInputChange('job_date', newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                />
              </Grid>

              <Grid item xs={12} md={1.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Consignment Type</InputLabel>
                  <Select value={formData.consignment_type} label="Consignment Type">
                    <MenuItem value="FCL">FCL</MenuItem>
                    <MenuItem value="LCL">LCL</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs 
            value={currentTab} 
            onChange={(e, newValue) => setCurrentTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {mainTabs.map((tab, index) => (
              <Tab 
                key={index} 
                label={tab.label} 
                icon={tab.icon} 
                iconPosition="top"
                sx={{ minHeight: 72, fontSize: '0.875rem' }}
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab Content */}
        {currentTab === 3 && ( // Shipment Tab
          <>
            {/* Shipment Sub-tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs 
                value={subTab} 
                onChange={(e, newValue) => setSubTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                textColor="secondary"
                indicatorColor="secondary"
              >
                {shipmentSubTabs.map((tab, index) => (
                  <Tab key={index} label={tab} sx={{ fontSize: '0.8rem' }} />
                ))}
              </Tabs>
            </Box>

            {/* Sub-tab Content */}
            {subTab === 0 && ( // Main Sub-tab
              <Card elevation={2}>
                <CardContent>
                  {/* Shipment Details Table */}
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.200' }}>
                          <TableCell>BE No</TableCell>
                          <TableCell>BE Date</TableCell>
                          <TableCell>Vessel</TableCell>
                          <TableCell>Voyage</TableCell>
                          <TableCell>IGM No</TableCell>
                          <TableCell>IGM Date</TableCell>
                          <TableCell>No Of Pkg</TableCell>
                          <TableCell>Bond No</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={8} sx={{ height: 200, textAlign: 'center', color: 'text.secondary' }}>
                            No data available
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Action Buttons */}
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button variant="contained" startIcon={<AddIcon />} size="small">New</Button>
                    <Button variant="outlined" startIcon={<EditIcon />} size="small">Edit</Button>
                    <Button variant="outlined" startIcon={<UpdateIcon />} size="small">Update</Button>
                    <Button variant="outlined" startIcon={<DeleteIcon />} size="small" color="error">Delete</Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {subTab === 2 && ( // Invoice Printing Sub-tab
              <Card elevation={2}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Buyer's Order No"
                        value={formData.buyers_order_no}
                        onChange={(e) => handleInputChange('buyers_order_no', e.target.value)}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="Date"
                        InputLabelProps={{ shrink: true }}
                        value={formData.buyers_order_date}
                        onChange={(e) => handleInputChange('buyers_order_date', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Other References"
                        value={formData.other_references}
                        onChange={(e) => handleInputChange('other_references', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        rows={3}
                        label="Terms of Delivery and Payment"
                        value={formData.terms_of_delivery}
                        onChange={(e) => handleInputChange('terms_of_delivery', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Origin Country"
                        value={formData.origin_country}
                        onChange={(e) => handleInputChange('origin_country', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Invoice Header"
                        value={formData.invoice_header}
                        onChange={(e) => handleInputChange('invoice_header', e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {subTab === 3 && ( // Shipping Bill Printing Sub-tab
              <Card elevation={2}>
                <CardContent>
                  <Grid container spacing={2}>
                    {/* Left Column */}
                    <Grid item xs={12} md={6}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Discharge Port"
                            value={formData.discharge_port}
                            onChange={(e) => handleInputChange('discharge_port', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Discharge Country"
                            value={formData.discharge_country}
                            onChange={(e) => handleInputChange('discharge_country', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Destination Port"
                            value={formData.destination_port}
                            onChange={(e) => handleInputChange('destination_port', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Destination Country"
                            value={formData.destination_country}
                            onChange={(e) => handleInputChange('destination_country', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Shipping Line"
                            value={formData.shipping_line}
                            onChange={(e) => handleInputChange('shipping_line', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Vessel/Sailing Date"
                            InputLabelProps={{ shrink: true }}
                            value={formData.vessel_sailing_date}
                            onChange={(e) => handleInputChange('vessel_sailing_date', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Voyage No"
                            value={formData.voyage_no}
                            onChange={(e) => handleInputChange('voyage_no', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="EGM No/Date"
                            InputLabelProps={{ shrink: true }}
                            value={formData.egm_no_date}
                            onChange={(e) => handleInputChange('egm_no_date', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="MBL No/Date"
                            InputLabelProps={{ shrink: true }}
                            value={formData.mbl_no_date}
                            onChange={(e) => handleInputChange('mbl_no_date', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="HBL No/Date"
                            InputLabelProps={{ shrink: true }}
                            value={formData.hbl_no_date}
                            onChange={(e) => handleInputChange('hbl_no_date', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Pre-Carriage by"
                            value={formData.pre_carriage_by}
                            onChange={(e) => handleInputChange('pre_carriage_by', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Place of Receipt"
                            value={formData.place_of_receipt}
                            onChange={(e) => handleInputChange('place_of_receipt', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Transhipper Code"
                            value={formData.transhipper_code}
                            onChange={(e) => handleInputChange('transhipper_code', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Gateway Port"
                            value={formData.gateway_port}
                            onChange={(e) => handleInputChange('gateway_port', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <FormControl fullWidth size="small">
                            <InputLabel>State Of Origin</InputLabel>
                            <Select value={formData.state_of_origin} label="State Of Origin">
                              <MenuItem value="GUJARAT">GUJARAT</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Checkbox 
                                checked={formData.annexure_c_details_filed}
                                onChange={(e) => handleInputChange('annexure_c_details_filed', e.target.checked)}
                              />
                            }
                            label="Annexure-C Details being filed with Annexure-A"
                          />
                        </Grid>
                      </Grid>
                    </Grid>

                    {/* Right Column - Cargo Details */}
                    <Grid item xs={12} md={6}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Nature of Cargo</InputLabel>
                            <Select value={formData.nature_of_cargo} label="Nature of Cargo">
                              <MenuItem value="C - Containerised">C - Containerised</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        <Grid item xs={8}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Total No. of Pkgs"
                            value={formData.total_no_of_pkgs}
                            onChange={(e) => handleInputChange('total_no_of_pkgs', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={4}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Unit"
                            value={formData.unit}
                            onChange={(e) => handleInputChange('unit', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <Button variant="outlined" size="small">Packing Details</Button>
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Loose Pkgs"
                            value={formData.loose_pkgs}
                            onChange={(e) => handleInputChange('loose_pkgs', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="No of Containers"
                            value={formData.no_of_containers}
                            onChange={(e) => handleInputChange('no_of_containers', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={8}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Gross Weight"
                            value={formData.gross_weight}
                            onChange={(e) => handleInputChange('gross_weight', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={4}>
                          <TextField
                            fullWidth
                            size="small"
                            value="KGS"
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>

                        <Grid item xs={8}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Net Weight"
                            value={formData.net_weight}
                            onChange={(e) => handleInputChange('net_weight', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={4}>
                          <TextField
                            fullWidth
                            size="small"
                            value="KGS"
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>

                        <Grid item xs={8}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Volume"
                            value={formData.volume}
                            onChange={(e) => handleInputChange('volume', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={8}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Chargeable Weight"
                            value={formData.chargeable_weight}
                            onChange={(e) => handleInputChange('chargeable_weight', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            multiline
                            rows={4}
                            label="Marks & Nos"
                            value={formData.marks_and_nos}
                            onChange={(e) => handleInputChange('marks_and_nos', e.target.value)}
                            helperText="[85 chars]"
                          />
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {subTab === 4 && ( // Ex-Bond Details Sub-tab
              <Card elevation={2}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        rows={4}
                        label="Q/Cert. No./Date"
                        value={formData.q_cert_no_date}
                        onChange={(e) => handleInputChange('q_cert_no_date', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        rows={4}
                        label="Export Trade Control"
                        value={formData.export_trade_control}
                        onChange={(e) => handleInputChange('export_trade_control', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Type of Shipment</InputLabel>
                        <Select value={formData.type_of_shipment} label="Type of Shipment">
                          <MenuItem value="Outright Sale">Outright Sale</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Specify, if Other"
                        value={formData.specify_other}
                        onChange={(e) => handleInputChange('specify_other', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} md={8}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Permission No. & Date"
                        value={formData.permission_no_date}
                        onChange={(e) => handleInputChange('permission_no_date', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={formData.permission_date}
                        onChange={(e) => handleInputChange('permission_date', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Export Under</InputLabel>
                        <Select value={formData.export_under} label="Export Under">
                          <MenuItem value="Other">Other</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="S/B Heading"
                        value={formData.sb_heading}
                        onChange={(e) => handleInputChange('sb_heading', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>
                        Text to be printed on S/B bottom area
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        rows={8}
                        value={formData.sb_bottom_text}
                        onChange={(e) => handleInputChange('sb_bottom_text', e.target.value)}
                        placeholder="Enter text to be printed on shipping bill bottom area"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {subTab === 1 && ( // Stuffing Details Sub-tab
              <Card elevation={2}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Goods Stuffed At</InputLabel>
                        <Select value={formData.goods_stuffed_at} label="Goods Stuffed At">
                          <MenuItem value="Factory">Factory</MenuItem>
                          <MenuItem value="Warehouse">Warehouse</MenuItem>
                          <MenuItem value="CFS">CFS</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={formData.sample_accompanied}
                            onChange={(e) => handleInputChange('sample_accompanied', e.target.checked)}
                          />
                        }
                        label="Sample Accompanied"
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        rows={3}
                        label="Factory Address"
                        value={formData.factory_address}
                        onChange={(e) => handleInputChange('factory_address', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Warehouse Code (of CFS/ICD/Terminal)"
                        value={formData.warehouse_code}
                        onChange={(e) => handleInputChange('warehouse_code', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Seal Type</InputLabel>
                        <Select value={formData.seal_type} label="Seal Type">
                          <MenuItem value="">Select Seal Type</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Seal No"
                        value={formData.seal_no}
                        onChange={(e) => handleInputChange('seal_no', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Agency Name"
                        value={formData.agency_name}
                        onChange={(e) => handleInputChange('agency_name', e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {subTab === 5 && ( // Annex C1 Details Sub-tab
              <Card elevation={2}>
                <CardContent>
                  <Grid container spacing={2}>
                    {/* Left Column */}
                    <Grid item xs={12} md={6}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="IE Code Of EOU"
                            value={formData.ie_code_of_eou}
                            onChange={(e) => handleInputChange('ie_code_of_eou', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Branch Sl. No."
                            value={formData.branch_sl_no}
                            onChange={(e) => handleInputChange('branch_sl_no', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Examination Date"
                            InputLabelProps={{ shrink: true }}
                            value={formData.examination_date}
                            onChange={(e) => handleInputChange('examination_date', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Examining Officer"
                            value={formData.examining_officer}
                            onChange={(e) => handleInputChange('examining_officer', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Supervising Officer"
                            value={formData.supervising_officer}
                            onChange={(e) => handleInputChange('supervising_officer', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Commissionerate"
                            value={formData.commissionerate}
                            onChange={(e) => handleInputChange('commissionerate', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Checkbox 
                                checked={formData.verified_by_examining_officer}
                                onChange={(e) => handleInputChange('verified_by_examining_officer', e.target.checked)}
                              />
                            }
                            label="Verified by Examining Officer"
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Seal Number"
                            value={formData.seal_number}
                            onChange={(e) => handleInputChange('seal_number', e.target.value)}
                          />
                        </Grid>
                      </Grid>
                    </Grid>

                    {/* Right Column */}
                    <Grid item xs={12} md={6}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Designation"
                            value={formData.designation_fields.designation1}
                            onChange={(e) => handleInputChange('designation_fields.designation1', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Designation"
                            value={formData.designation_fields.designation2}
                            onChange={(e) => handleInputChange('designation_fields.designation2', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Division"
                            value={formData.designation_fields.division}
                            onChange={(e) => handleInputChange('designation_fields.division', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Range"
                            value={formData.designation_fields.range}
                            onChange={(e) => handleInputChange('designation_fields.range', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Checkbox 
                                checked={formData.sample_forwarded}
                                onChange={(e) => handleInputChange('sample_forwarded', e.target.checked)}
                              />
                            }
                            label="Sample Forwarded"
                          />
                        </Grid>
                      </Grid>
                    </Grid>

                    {/* Documents Section */}
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom color="primary">
                        Documents
                      </Typography>
                      
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.200' }}>
                              <TableCell>Sr No</TableCell>
                              <TableCell>Document Name</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <TableRow>
                              <TableCell colSpan={2} sx={{ height: 100, textAlign: 'center', color: 'text.secondary' }}>
                                No documents added
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        <Button variant="contained" size="small" startIcon={<AddIcon />}>New</Button>
                        <Button variant="outlined" size="small" startIcon={<EditIcon />}>Edit</Button>
                        <Button variant="outlined" size="small" startIcon={<UpdateIcon />}>Update</Button>
                        <Button variant="outlined" size="small">Update & New</Button>
                        <Button variant="outlined" size="small" startIcon={<DeleteIcon />} color="error">Delete</Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Footer Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small">Copy Previous Job</Button>
            <Button variant="outlined" size="small">Import From File</Button>
            <Button variant="outlined" size="small">Declarations</Button>
          </Box>
          
          <Button variant="contained" color="error" onClick={() => window.close()}>
            Close
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default ExportShipmentForm;
