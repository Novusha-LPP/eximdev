import React, { useState, useEffect } from "react";
import {
  Grid,
  Typography,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Button,
  Switch,
  Checkbox,
  Snackbar,
  Alert,
  Paper,
  Divider,
  Box,
  Card,
  CardContent,
  CardHeader,
  Stepper,
  Step,
  StepLabel,
  Fade
} from "@mui/material";
import FormControlLabel from "@mui/material/FormControlLabel";
import { IconButton } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import FileUpload from "../../components/gallery/FileUpload";
import ImagePreview from "../../components/gallery/ImagePreview";
import ConfirmDialog from "../../components/gallery/ConfirmDialog";
import {
  customHouseOptions,
  importerOptions,
  shippingLineOptions,
  cth_Dropdown,
  countryOptions,
  hssOptions,
  portReportingOptions,
  portOptions,
  portOfLoadingOptions,
} from "../MasterLists/MasterLists";
import { useFormik } from "formik";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import BusinessIcon from "@mui/icons-material/Business";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DescriptionIcon from "@mui/icons-material/Description";
import InventoryIcon from "@mui/icons-material/Inventory";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import useImportJobForm from "../../customHooks/useImportJobForm.js";
import axios from "axios";
import { 
  getContainerOrPackageLabel, 
  getAwbOrBlLabel, 
  getAirlineOrShippingLineLabel,
  isAirMode,
  shouldHideField
} from "../../utils/modeLogic";

const steps = [
  { label: 'General Info', icon: <BusinessIcon /> },
  { label: 'Importer & Supplier', icon: <BusinessIcon /> },
  { label: 'Shipping Details', icon: <LocalShippingIcon /> },
  { label: 'Cargo Details', icon: <InventoryIcon /> },
  { label: 'Documents', icon: <DescriptionIcon /> },
  { label: 'Clearance', icon: <AssessmentIcon /> },
];

const SectionCard = ({ title, icon, children, stepIndex, activeStep }) => (
  <Fade in={true} timeout={300 + (stepIndex * 100)}>
    <Card
      elevation={0}
      sx={{
        mb: 2,
        borderRadius: '12px',
        border: '1px solid',
        borderColor: activeStep === stepIndex ? 'primary.light' : '#eaedf2',
        background: activeStep === stepIndex ? '#ffffff' : '#f9fbff',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          transform: 'translateY(-2px)'
        }
      }}
    >
      <Box sx={{
        px: 2,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        borderBottom: '1px solid #eaedf2',
        background: activeStep === stepIndex ? 'linear-gradient(45deg, #ffffff 30%, #f0f7ff 90%)' : 'transparent'
      }}>
        <Box sx={{
          color: activeStep === stepIndex ? 'primary.main' : 'text.secondary',
          display: 'flex',
          alignItems: 'center'
        }}>
          {React.cloneElement(icon, { sx: { fontSize: 20 } })}
        </Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{
          color: activeStep === stepIndex ? 'primary.main' : 'text.primary',
          letterSpacing: '0.02em',
          fontSize: '0.95rem'
        }}>
          {title}
        </Typography>
      </Box>
      <CardContent sx={{ p: '20px !important' }}>
        {children}
      </CardContent>
    </Card>
  </Fade>
);

const compactInput = {
  '& .MuiInputBase-root': { height: '32px', fontSize: '0.8rem' },
  '& .MuiOutlinedInput-input': { padding: '4px 8px !important' },
  '& .MuiAutocomplete-input': { padding: '0px 8px !important' },
  '& .MuiInputLabel-root': { fontSize: '0.8rem', top: '-4px' }
};

const FormField = ({ label, children, xs = 12, md = 3 }) => (
  <Grid item xs={xs} md={md}>
    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{
      mb: 0.3,
      display: 'block',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      fontSize: '0.65rem',
      opacity: 0.8
    }}>
      {label}
    </Typography>
    {children}
  </Grid>
);

const ImportCreateJob = () => {
  const {
    formik,
    setJobNo,
    custom_house,
    setCustomHouse,
    importer,
    setImporter,
    shipping_line_airline,
    setShippingLineAirline,
    branchSrNo,
    setBranchSrNo,
    adCode,
    setAdCode,
    supplier_exporter,
    setSupplierExporter,
    awb_bl_no,
    setAwbBlNo,
    awb_bl_date,
    vessel_berthing,
    setAwbBlDate,
    hawb_hbl_no,
    setHawb_hbl_no,
    hawb_hbl_date,
    setHawb_hbl_date,
    setVesselberthing,
    type_of_b_e,
    setTypeOfBE,
    loading_port,
    setLoadingPort,
    gross_weight,
    setGrossWeight,
    job_net_weight,
    setJob_net_weight,
    cth_no,
    setCthNo,
    origin_country,
    setOriginCountry,
    port_of_reporting,
    setPortOfReporting,
    total_inv_value,
    setTotalInvValue,
    inv_currency,
    setInvCurrency,
    invoice_number,
    setInvoiceNumber,
    invoice_date,
    setInvoiceDate,
    description,
    setDescription,
    consignment_type,
    setConsignmentType,
    isDraftDoc,
    setIsDraftDoc,
    container_nos,
    handleAddContainer,
    handleRemoveContainer,
    handleContainerChange,
    cthDocuments,
    setCthDocuments,
    handleAddDocument,
    handleDeleteDocument,
    confirmDeleteDocument,
    handleOpenEditDialog,
    handleSaveEdit,
    confirmDialogOpen,
    setConfirmDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    editValues,
    setEditValues,
    exBondValue,
    setExBondValue,
    otherDetails,
    setOtherDetails,
    clearanceValue,
    setClearanceValue,
    isBenefit,
    setIsBenefit,
    dateTime,
    setDateTime,
    selectedDocument,
    setSelectedDocument,
    newDocumentCode,
    setNewDocumentCode,
    newDocumentName,
    setNewDocumentName,
    fta_Benefit_date_time,
    setFtaBenefitDateTime,
    resetOtherDetails,
    canChangeClearance,
    in_bond_be_no,
    setBeNo,
    in_bond_be_date,
    setBeDate,
    in_bond_ooc_copies,
    setOocCopies,
    scheme,
    setScheme,
    jobDetails,
    setJobDetails,
    setYear,
    year,
    HSS,
    sallerName,
    setHSS,
    setSallerName,
    setBankName,
    bankName,
    ie_code_no,
    setIeCodeNo,
    branch_id,
    setBranchId,
    trade_type,
    setTradeType,
    mode,
    setMode,
    branches,
    description_details,
    addDescriptionRow,
    updateDescriptionRow,
    removeDescriptionRow,
    snackbar,
    setSnackbar
  } = useImportJobForm();

  const schemeOptions = ["Full Duty", "DEEC", "EPCG", "RODTEP", "ROSTL", "TQ", "SIL"];
  const beTypeOptions = ["Home", "In-Bond", "Ex-Bond"];
  const [selectedYear, setSelectedYear] = useState("");
  const years = ["24-25", "25-26", "26-27"];
  const [selectedImporter, setSelectedImporter] = useState("");
  const [importers, setImporters] = useState([]);
  const [isCheckedHouse, setIsCheckedHouse] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [activeStep, setActiveStep] = useState(0);

  const selectedBranchData = branches.find((b) => b._id === branch_id);
  const dynamicPortOptions = selectedBranchData?.ports?.map((p) => p.port_name) || [];

  React.useEffect(() => {
    async function getImporterList() {
      if (selectedYear) {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYear}`
        );
        setImporters(res.data);
        setSelectedImporter("Select Importer");
      }
    }
    getImporterList();
  }, [selectedYear]);

  React.useEffect(() => {
    async function getSupplierExporterList() {
      if (selectedYear) {
        try {
          const res = await axios.get(
            `${process.env.REACT_APP_API_STRING}/get-supplier-exporter-list/${selectedYear}`
          );
          setSuppliers(res.data);
        } catch (error) {
          console.error("Error fetching supplier/exporter list:", error);
          setSuppliers([]);
        }
      }
    }
    getSupplierExporterList();
  }, [selectedYear]);

  const getUniqueImporterNames = (importerData) => {
    if (!importerData || !Array.isArray(importerData)) return [];
    const uniqueImporters = new Set();
    return importerData
      .filter((importer) => {
        if (uniqueImporters.has(importer.importer)) return false;
        uniqueImporters.add(importer.importer);
        return true;
      })
      .map((importer, index) => ({
        label: importer.importer,
        key: `${importer.importer}-${index}`,
      }));
  };

  const importerNames = [
    { label: "Select Importer" },
    ...getUniqueImporterNames(importers),
  ];

  useEffect(() => {
    if (!selectedImporter) {
      setSelectedImporter("Select Importer");
    }
  }, [importerNames]);

  useEffect(() => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentTwoDigits = String(currentYear).slice(-2);
    const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0");
    const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0");

    let defaultYearPair;

    if (currentMonth >= 4) {
      defaultYearPair = `${currentTwoDigits}-${nextTwoDigits}`;
    } else {
      defaultYearPair = `${prevTwoDigits}-${currentTwoDigits}`;
    }

    if (!selectedYear) {
      if (years.includes(defaultYearPair)) {
        setSelectedYear(defaultYearPair);
      } else {
        setSelectedYear(years[0]);
      }
    }
  }, [selectedYear, setSelectedYear]);

  useEffect(() => {
    setYear(selectedYear);
  }, [selectedYear]);

  const clearanceOptionsMapping = {
    Home: [
      { value: "Full Duty", label: "Full Duty" },
      { value: "DEEC", label: "DEEC" },
      { value: "RODTEP", label: "RODTEP" },
      { value: "ROSTL", label: "ROSTL" },
      { value: "TQ", label: "TQ" },
      { value: "SIL", label: "SIL" },
    ],
    "In-Bond": [{ value: "In-Bond", label: "In-bond" }],
    "Ex-Bond": [{ value: "Ex-Bond", label: "Ex-Bond" }],
  };
  const filteredClearanceOptions = clearanceOptionsMapping[type_of_b_e] || [];

  const handleStepClick = (step) => {
    setActiveStep(step);
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#f0f2f5',
      p: { xs: 1, md: 3 },
      display: 'flex',
      justifyContent: 'center'
    }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: '20px',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '100%',
          bgcolor: 'transparent',
        }}
      >
        <Box sx={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
          color: 'white',
          p: { xs: 2.5, md: 3.5 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 10px 30px rgba(30, 58, 138, 0.25)'
        }}>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
              Create Import Job
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
              <Typography variant="body2" sx={{ opacity: 0.8, fontWeight: 500 }}>
                System Ready • New Job Entry
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
              <Typography variant="caption" sx={{ opacity: 0.7, textTransform: 'uppercase', fontWeight: 700 }}>
                Financial Year
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <TextField
                  select
                  size="small"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  sx={{
                    width: 120,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      borderRadius: '8px',
                      fontWeight: 600,
                      '& fieldset': { border: 'none' },
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                    },
                    '& .MuiSelect-icon': { color: 'white' }
                  }}
                >
                  {years.map((yr, index) => (
                    <MenuItem key={`year-${yr}-${index}`} value={yr}>
                      {yr}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{
          px: 3,
          py: 1.5,
          bgcolor: 'white',
          borderBottom: '1px solid #eaedf2',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <Stepper
            activeStep={activeStep}
            sx={{
              width: '100%',
              maxWidth: 1000,
              '& .MuiStepConnector-line': { borderColor: '#eaedf2' }
            }}
          >
            {steps.map((step, index) => (
              <Step
                key={step.label}
                onClick={() => handleStepClick(index)}
                sx={{ cursor: 'pointer' }}
              >
                <StepLabel
                  StepIconProps={{
                    sx: {
                      '&.Mui-active': { color: 'primary.main' },
                      '&.Mui-completed': { color: '#4ade80' }
                    }
                  }}
                >
                  <Typography variant="caption" fontWeight={activeStep === index ? 700 : 500} color={activeStep === index ? 'primary.main' : 'text.secondary'}>
                    {step.label}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Box sx={{ p: { xs: 1, md: 3 }, bgcolor: '#ffffff' }}>
          <Grid container spacing={3} alignItems="flex-start">
            <Grid container item xs={12} md={9} spacing={2}>
              {/* Section 1: General Info */}
              <Grid item xs={12}>
                <SectionCard
                  title="1. General Information"
                  icon={<BusinessIcon />}
                  stepIndex={0}
                  activeStep={activeStep}
                >
                  <Grid container spacing={2}>
                    <FormField label="Select Branch">
                      <TextField
                        select
                        fullWidth
                        size="small"
                        value={branch_id}
                        onChange={(e) => setBranchId(e.target.value)}
                        variant="outlined"
                        sx={compactInput}
                      >
                        {branches
                          .filter(b => b.category === mode)
                          .map((b) => (
                            <MenuItem key={b._id} value={b._id}>
                              {b.branch_name} ({b.branch_code})
                            </MenuItem>
                          ))}
                      </TextField>
                    </FormField>

                    <FormField label="Trade Type">
                      <TextField
                        select
                        fullWidth
                        size="small"
                        value={trade_type}
                        onChange={(e) => setTradeType(e.target.value)}
                        variant="outlined"
                        disabled
                        sx={compactInput}
                      >
                        <MenuItem value="IMP">Import</MenuItem>
                        <MenuItem value="EXP">Export</MenuItem>
                      </TextField>
                    </FormField>

                    <FormField label="Mode">
                      <TextField
                        select
                        fullWidth
                        size="small"
                        value={mode}
                        onChange={(e) => {
                          const newMode = e.target.value;
                          setMode(newMode);
                          const currentBranch = branches.find(b => b._id === branch_id);
                          const validBranches = branches.filter(b => b.category === newMode);
                          if (validBranches.length > 0) {
                            const matchingBranch = currentBranch
                              ? validBranches.find(b => b.branch_code === currentBranch.branch_code)
                              : null;
                            setBranchId(matchingBranch ? matchingBranch._id : validBranches[0]._id);
                          } else {
                            setBranchId("");
                          }
                        }}
                        variant="outlined"
                        sx={compactInput}
                      >
                        <MenuItem value="SEA">SEA</MenuItem>
                        <MenuItem value="AIR">AIR</MenuItem>
                      </TextField>
                    </FormField>

                    <FormField label="Custom House">
                      <Autocomplete
                        freeSolo
                        options={dynamicPortOptions}
                        value={custom_house}
                        onInputChange={(event, newValue) => setCustomHouse(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            size="small"
                            fullWidth
                            sx={compactInput}
                          />
                        )}
                      />
                    </FormField>
                  </Grid>
                </SectionCard>
              </Grid>

              {/* Section 2: Importer & Supplier */}
              <Grid item xs={12}>
                <SectionCard
                  title="2. Importer & Supplier Details"
                  icon={<BusinessIcon />}
                  stepIndex={1}
                  activeStep={activeStep}
                >
                  <Grid container spacing={2}>
                    <FormField label="Importer Name">
                      <Autocomplete
                        freeSolo
                        options={importerNames.map((option) => option.label)}
                        value={importer || ""}
                        onInputChange={(event, newValue, reason) => {
                          if (reason === "input") {
                            setImporter(newValue);
                            setIeCodeNo("");
                          } else if (reason === "clear") {
                            setImporter("");
                            setIeCodeNo("");
                          }
                        }}
                        onChange={(event, newValue) => {
                          const sel = newValue || "";
                          setImporter(sel);
                          const found = Array.isArray(importers)
                            ? importers.find((it) => it.importer === sel)
                            : null;
                          if (found) {
                            const code = found.ie_code_no || found.ieCode || found.iecode || found.ie_code || "";
                            setIeCodeNo(code || "");
                          } else {
                            setIeCodeNo("");
                          }
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            size="small"
                            fullWidth
                            sx={compactInput}
                          />
                        )}
                      />
                    </FormField>

                    <FormField label="IE Code">
                      <TextField
                        value={ie_code_no || ""}
                        variant="outlined"
                        size="small"
                        fullWidth
                        InputProps={{ readOnly: true }}
                        sx={{ ...compactInput, '& .MuiInputBase-root': { ...compactInput['& .MuiInputBase-root'], bgcolor: '#f5f5f5' } }}
                      />
                    </FormField>

                    <FormField label="Branch SR No">
                      <TextField
                        value={branchSrNo}
                        onChange={(e) => setBranchSrNo(e.target.value)}
                        variant="outlined"
                        size="small"
                        fullWidth
                        sx={compactInput}
                      />
                    </FormField>

                    <FormField label="AD Code">
                      <TextField
                        value={adCode}
                        onChange={(e) => setAdCode(e.target.value)}
                        variant="outlined"
                        size="small"
                        fullWidth
                        sx={compactInput}
                      />
                    </FormField>

                    <FormField label="Bank Name">
                      <TextField
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        variant="outlined"
                        size="small"
                        fullWidth
                        sx={compactInput}
                      />
                    </FormField>

                    <FormField label="Supplier/Exporter">
                      <Autocomplete
                        freeSolo
                        options={suppliers
                          .map((item) => item.supplier_exporter)
                          .filter((name) => name && name.trim() !== "")
                          .sort()}
                        value={supplier_exporter || ""}
                        onInputChange={(event, newValue) => {
                          setSupplierExporter(newValue);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            size="small"
                            placeholder="Select Supplier"
                            fullWidth
                            sx={compactInput}
                          />
                        )}
                      />
                    </FormField>
                  </Grid>
                </SectionCard>
              </Grid>

              {/* Section 3: Shipping Details */}
              <Grid item xs={12}>
                <SectionCard
                  title="3. Shipping & Transport Details"
                  icon={<LocalShippingIcon />}
                  stepIndex={2}
                  activeStep={activeStep}
                >
                  <Grid container spacing={2}>
                    <FormField label={getAirlineOrShippingLineLabel(mode)}>
                      <Autocomplete
                        freeSolo
                        options={shippingLineOptions}
                        value={shipping_line_airline}
                        onInputChange={(event, newValue) =>
                          setShippingLineAirline(newValue)
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            size="small"
                            fullWidth
                            sx={compactInput}
                          />
                        )}
                      />
                    </FormField>

                    <FormField label="ETA Date">
                      <TextField
                        type="date"
                        value={vessel_berthing}
                        onChange={(e) => setVesselberthing(e.target.value)}
                        variant="outlined"
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        sx={compactInput}
                      />
                    </FormField>

                    <FormField label={`${getAwbOrBlLabel(mode)} Number`}>
                      <TextField
                        value={awb_bl_no}
                        onChange={(e) => setAwbBlNo(e.target.value)}
                        variant="outlined"
                        size="small"
                        placeholder={`${getAwbOrBlLabel(mode)} No`}
                        fullWidth
                        sx={compactInput}
                      />
                    </FormField>

                    <FormField label={`${getAwbOrBlLabel(mode)} Date`}>
                      <TextField
                        type="date"
                        value={awb_bl_date}
                        onChange={(e) => setAwbBlDate(e.target.value)}
                        variant="outlined"
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        sx={compactInput}
                      />
                    </FormField>

                    <FormField label="Type Of B/E">
                      <Autocomplete
                        options={beTypeOptions}
                        value={type_of_b_e}
                        onChange={(event, newValue) => setTypeOfBE(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            size="small"
                            placeholder="Select Type"
                            fullWidth
                            sx={compactInput}
                          />
                        )}
                      />
                    </FormField>

                    <FormField label="House">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isCheckedHouse}
                            onChange={(e) => setIsCheckedHouse(e.target.checked)}
                            color="primary"
                          />
                        }
                        label={`Is House ${getAwbOrBlLabel(mode)}`}
                      />
                    </FormField>

                    {isCheckedHouse && (
                      <>
                        <FormField label={`${getAwbOrBlLabel(mode).charAt(0)}AWB/H${getAwbOrBlLabel(mode).charAt(0)}BL No`}>
                          <TextField
                            value={hawb_hbl_no}
                            onChange={(e) => setHawb_hbl_no(e.target.value)}
                            variant="outlined"
                            size="small"
                            fullWidth
                            placeholder={`${getAwbOrBlLabel(mode).charAt(0)}AWB/H${getAwbOrBlLabel(mode).charAt(0)}BL No`}
                            sx={compactInput}
                          />
                        </FormField>

                        <FormField label={`${getAwbOrBlLabel(mode).charAt(0)}AWB/H${getAwbOrBlLabel(mode).charAt(0)}BL Date`}>
                          <TextField
                            type="date"
                            value={hawb_hbl_date}
                            onChange={(e) => setHawb_hbl_date(e.target.value)}
                            variant="outlined"
                            size="small"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            sx={compactInput}
                          />
                        </FormField>
                      </>
                    )}
                  </Grid>
                </SectionCard>
              </Grid>

              {/* Section 4: Cargo Details */}
              <Grid item xs={12}>
                <SectionCard
                  title="4. Cargo & Invoice Details"
                  icon={<InventoryIcon />}
                  stepIndex={3}
                  activeStep={activeStep}
                >
                  <Grid container spacing={2}>
                    <FormField label="Gross Weight">
                      <TextField
                        value={gross_weight}
                        onChange={(e) => setGrossWeight(e.target.value)}
                        variant="outlined"
                        size="small"
                        placeholder="Weight"
                        fullWidth
                        sx={compactInput}
                      />
                    </FormField>

                    <FormField label="Net Weight">
                      <TextField
                        value={job_net_weight}
                        onChange={(e) => setJob_net_weight(e.target.value)}
                        variant="outlined"
                        size="small"
                        placeholder="Net Weight"
                        fullWidth
                        sx={compactInput}
                      />
                    </FormField>

                    <FormField label="Loading Port">
                      <Autocomplete
                        freeSolo
                        options={portOfLoadingOptions}
                        value={loading_port}
                        onInputChange={(event, newValue) => setLoadingPort(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            size="small"
                            fullWidth
                            sx={compactInput}
                          />
                        )}
                      />
                    </FormField>

                    <FormField label="Origin Country">
                      <Autocomplete
                        freeSolo
                        options={countryOptions}
                        value={origin_country}
                        onInputChange={(event, newValue) => setOriginCountry(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            size="small"
                            fullWidth
                            sx={compactInput}
                          />
                        )}
                      />
                    </FormField>

                    <FormField label="Port of Reporting">
                      <Autocomplete
                        freeSolo
                        options={dynamicPortOptions}
                        value={port_of_reporting}
                        onInputChange={(event, newValue) => setPortOfReporting(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            size="small"
                            fullWidth
                            sx={compactInput}
                          />
                        )}
                      />
                    </FormField>

                    <FormField label="Total Inv Value">
                      <TextField
                        value={total_inv_value}
                        onChange={(e) => setTotalInvValue(e.target.value)}
                        variant="outlined"
                        size="small"
                        placeholder="Value"
                        fullWidth
                        sx={compactInput}
                      />
                    </FormField>

                    <FormField label="Inv Currency">
                      <TextField
                        value={inv_currency}
                        onChange={(e) => setInvCurrency(e.target.value)}
                        variant="outlined"
                        size="small"
                        placeholder="Currency"
                        fullWidth
                        sx={compactInput}
                      />
                    </FormField>

                    <FormField label="Invoice Number">
                      <TextField
                        value={invoice_number}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        variant="outlined"
                        size="small"
                        placeholder="Inv No"
                        fullWidth
                        sx={compactInput}
                      />
                    </FormField>

                    <FormField label="Invoice Date">
                      <TextField
                        type="date"
                        value={invoice_date}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        variant="outlined"
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        sx={compactInput}
                      />
                    </FormField>

                    <FormField label="Description">
                      <TextField
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        variant="outlined"
                        size="small"
                        placeholder="Description"
                        fullWidth
                        multiline
                        rows={1}
                        sx={compactInput}
                      />
                    </FormField>

                    {!isAirMode(mode) && (
                      <FormField label="Consignment Type">
                        <TextField
                          select
                          value={consignment_type}
                          onChange={(e) => setConsignmentType(e.target.value)}
                          variant="outlined"
                          size="small"
                          fullWidth
                          sx={compactInput}
                        >
                          <MenuItem value="FCL">FCL</MenuItem>
                          <MenuItem value="LCL">LCL</MenuItem>
                        </TextField>
                      </FormField>
                    )}

                    <FormField label="CTH No">
                      <TextField
                        value={cth_no}
                        onChange={(e) => setCthNo(e.target.value)}
                        variant="outlined"
                        size="small"
                        placeholder="CTH No"
                        fullWidth
                        sx={compactInput}
                      />
                    </FormField>

                    <FormField label="Document Status">
                      <Box>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={isDraftDoc}
                              onChange={(e) => setIsDraftDoc(e.target.checked)}
                              color="primary"
                            />
                          }
                          label="Is Draft Document"
                        />
                        <Typography variant="body2" color="text.secondary">
                          {isDraftDoc ? "This document is a draft." : "This document is finalized."}
                        </Typography>
                      </Box>
                    </FormField>

                    <FormField label="HSS">
                      <TextField
                        select
                        variant="outlined"
                        size="small"
                        value={HSS}
                        id="hss"
                        name="hss"
                        onChange={(e) => setHSS(e.target.value)}
                        fullWidth
                        sx={compactInput}
                      >
                        {hssOptions.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </TextField>
                    </FormField>

                    {HSS && HSS == "Yes" && (
                      <FormField label="Seller Name">
                        <TextField
                          value={sallerName}
                          onChange={(e) => setSallerName(e.target.value)}
                          variant="outlined"
                          size="small"
                          placeholder="Seller Name"
                          fullWidth
                          sx={compactInput}
                        />
                      </FormField>
                    )}
                  </Grid>
                </SectionCard>
              </Grid>


              {/* Section 6: Description Details */}
              <Grid item xs={12}>
                <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" color="primary.main">
                      Description Details
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={addDescriptionRow}
                    >
                      Add Row
                    </Button>
                  </Box>

                  <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                          {["Description", "CTH", "Clearance", "Inv SR", "LIC SR", "Qty", "Unit", "Action"].map((h) => (
                            <th key={h} style={{ borderBottom: '1px solid #dee2e6', padding: '6px 8px', fontSize: '0.65rem', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {description_details?.map((row, rowIndex) => (
                          <tr key={`desc-row-${rowIndex}`}>
                            <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5' }}>
                              <TextField
                                size="small"
                                fullWidth
                                value={row.description || ""}
                                onChange={(e) => updateDescriptionRow(rowIndex, "description", e.target.value)}
                                sx={compactInput}
                              />
                            </td>
                            <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5' }}>
                              <TextField
                                size="small"
                                fullWidth
                                value={row.cth_no || ""}
                                onChange={(e) => updateDescriptionRow(rowIndex, "cth_no", e.target.value)}
                                sx={compactInput}
                              />
                            </td>
                            <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5' }}>
                              <TextField
                                select
                                size="small"
                                fullWidth
                                value={row.clearance_under || ""}
                                onChange={(e) => updateDescriptionRow(rowIndex, "clearance_under", e.target.value)}
                                sx={compactInput}
                              >
                                <MenuItem value="">Select</MenuItem>
                                {filteredClearanceOptions.map((option, index) => (
                                  <MenuItem key={index} value={option.value || ""}>
                                    {option.label}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </td>
                            <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5' }}>
                              <TextField
                                size="small"
                                fullWidth
                                value={row.sr_no_invoice || ""}
                                onChange={(e) => updateDescriptionRow(rowIndex, "sr_no_invoice", e.target.value)}
                                sx={compactInput}
                              />
                            </td>
                            <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5' }}>
                              <TextField
                                size="small"
                                fullWidth
                                value={row.sr_no_lic || ""}
                                onChange={(e) => updateDescriptionRow(rowIndex, "sr_no_lic", e.target.value)}
                                sx={compactInput}
                              />
                            </td>
                            <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5' }}>
                              <TextField
                                size="small"
                                fullWidth
                                value={row.quantity || ""}
                                onChange={(e) => updateDescriptionRow(rowIndex, "quantity", e.target.value)}
                                sx={compactInput}
                              />
                            </td>
                            <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5' }}>
                              <TextField
                                size="small"
                                fullWidth
                                value={row.unit || ""}
                                onChange={(e) => updateDescriptionRow(rowIndex, "unit", e.target.value)}
                                sx={compactInput}
                              />
                            </td>
                            <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', textAlign: 'center' }}>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={description_details.length <= 1}
                                onClick={() => removeDescriptionRow(rowIndex)}
                                sx={{ p: 0.5 }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Paper>
              </Grid>

              {/* Section 7: Container Details */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: '12px', border: '1px solid #eaedf2' }}>
                  <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {getContainerOrPackageLabel(mode)} Details
                  </Typography>

                  <Grid container spacing={2}>
                    {container_nos.map((container, index) => (
                      <Grid container item xs={12} key={`container-${index}`} spacing={1} sx={{ mb: 1, p: 1.5, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f3f5' }}>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            size="small"
                            variant="outlined"
                            label={`${getContainerOrPackageLabel(mode)} No`}
                            value={container.container_number}
                            onChange={(e) => handleContainerChange(index, "container_number", e.target.value)}
                            sx={compactInput}
                          />
                        </Grid>
                        {!shouldHideField('size', mode) && (
                          <Grid item xs={12} md={2}>
                            <TextField
                              fullWidth
                              size="small"
                              variant="outlined"
                              label="Size"
                              value={container.size}
                              onChange={(e) => handleContainerChange(index, "size", e.target.value)}
                              sx={compactInput}
                            />
                          </Grid>
                        )}
                        {!shouldHideField('seal_no', mode) && (
                          <Grid item xs={12} md={2}>
                            <TextField
                              fullWidth
                              size="small"
                              variant="outlined"
                              label="Seal No"
                              value={container.seal_no}
                              onChange={(e) => handleContainerChange(index, "seal_no", e.target.value)}
                              sx={compactInput}
                            />
                          </Grid>
                        )}
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            size="small"
                            variant="outlined"
                            label="Gross Wt"
                            value={container.container_gross_weight}
                            onChange={(e) => handleContainerChange(index, "container_gross_weight", e.target.value)}
                            sx={compactInput}
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            size="small"
                            variant="outlined"
                            label="Net Wt"
                            value={container.net_weight_as_per_PL_document}
                            onChange={(e) => handleContainerChange(index, "net_weight_as_per_PL_document", e.target.value)}
                            sx={compactInput}
                          />
                        </Grid>
                        <Grid item xs={12} md={shouldHideField('size', mode) && shouldHideField('seal_no', mode) ? 6 : 2} sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton
                            color="error"
                            onClick={() => handleRemoveContainer(index)}
                            title={`Remove ${getContainerOrPackageLabel(mode)}`}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    ))}
                  </Grid>

                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddContainer}
                    sx={{ mt: 1, borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                  >
                    Add {getContainerOrPackageLabel(mode)}
                  </Button>
                </Paper>
              </Grid>

              {/* Section 8: Clearance Details */}
              <Grid item xs={12}>
                <SectionCard
                  title="6. Clearance & Scheme Details"
                  icon={<AssessmentIcon />}
                  stepIndex={5}
                  activeStep={activeStep}
                >
                  <Grid container spacing={2}>
                    <FormField label="Clearance Under">
                      <FormControl fullWidth size="small" variant="outlined">
                        <Select
                          value={clearanceValue}
                          onChange={(e) => {
                            if (canChangeClearance()) {
                              setClearanceValue(e.target.value);
                            } else {
                              alert("Please clear Ex-Bond details before changing Clearance Under.");
                            }
                          }}
                          displayEmpty
                          sx={compactInput}
                        >
                          <MenuItem value="" disabled>
                            Select Clearance Type
                          </MenuItem>
                          {filteredClearanceOptions.map((option, index) => (
                            <MenuItem key={index} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </FormField>

                    <FormField label="Scheme">
                      <FormControl fullWidth size="small" variant="outlined">
                        <Select
                          value={scheme}
                          onChange={(e) => setScheme(e.target.value)}
                          displayEmpty
                          sx={compactInput}
                        >
                          <MenuItem value="" disabled>
                            Select Scheme
                          </MenuItem>
                          {schemeOptions.map((schemeOption, index) => (
                            <MenuItem key={index} value={schemeOption}>
                              {schemeOption}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </FormField>

                    {clearanceValue === "Ex-Bond" && (
                      <Grid item xs={12}>
                        <Paper elevation={1} sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: '#fffde7' }}>
                          <Typography variant="caption" fontWeight={700} sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                            Ex-Bond Details
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <FormControl fullWidth size="small" variant="outlined">
                                <Select
                                  value={exBondValue}
                                  onChange={(e) => setExBondValue(e.target.value)}
                                  displayEmpty
                                  sx={compactInput}
                                >
                                  <MenuItem value="" disabled>
                                    Select In-Bond Type
                                  </MenuItem>
                                  <MenuItem value="other">Other</MenuItem>
                                  {jobDetails.map((job) => (
                                    <MenuItem key={job.job_no} value={job.job_no}>
                                      {`${job.job_no} - ${job.importer}`}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>

                            {exBondValue === "other" && (
                              <>
                                <Grid item xs={12} md={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    variant="outlined"
                                    label="InBond BE Number"
                                    value={in_bond_be_no}
                                    onChange={(e) => setBeNo(e.target.value)}
                                    sx={compactInput}
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    variant="outlined"
                                    label="InBond BE Date"
                                    type="date"
                                    InputLabelProps={{ shrink: true }}
                                    value={in_bond_be_date}
                                    onChange={(e) => setBeDate(e.target.value)}
                                    sx={compactInput}
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Upload InBond BE Copy:
                                  </Typography>
                                  <FileUpload
                                    label="Upload InBond BE Copy"
                                    bucketPath="ex_be_copy_documents"
                                    onFilesUploaded={(newFiles) =>
                                      setOocCopies([...in_bond_ooc_copies, ...newFiles])
                                    }
                                    multiple={true}
                                  />
                                  <ImagePreview
                                    images={in_bond_ooc_copies || []}
                                    onDeleteImage={(index) => {
                                      const updatedFiles = [...in_bond_ooc_copies];
                                      updatedFiles.splice(index, 1);
                                      setOocCopies(updatedFiles);
                                    }}
                                  />
                                </Grid>
                              </>
                            )}
                          </Grid>
                          {clearanceValue === "Ex-Bond" && (
                            <Button
                              variant="outlined"
                              color="secondary"
                              size="small"
                              onClick={resetOtherDetails}
                              sx={{ mt: 1.5, borderRadius: '8px', textTransform: 'none' }}
                            >
                              Reset Ex-Bond Details
                            </Button>
                          )}
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </SectionCard>
              </Grid>
            </Grid>

            {/* Document Side Bar - Restored to right side with Modern Styling */}
            <Grid item xs={12} md={3} sx={{ position: { md: 'sticky' }, top: 20 }}>
              <SectionCard
                title="Documents & FTA"
                icon={<DescriptionIcon />}
                stepIndex={4}
                activeStep={activeStep}
              >
                {!isDraftDoc && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Required Documents
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {cthDocuments.map((doc, index) => (
                        <Paper
                          key={`cth-${index}`}
                          elevation={0}
                          sx={{
                            p: 2,
                            border: '1px solid #eaedf2',
                            borderRadius: '12px',
                            bgcolor: '#f8fafc',
                            '&:hover': { bgcolor: '#fff', borderColor: 'primary.light', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" fontWeight={700}>{doc.document_name}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                              {doc.document_code}
                            </Typography>
                          </Box>
                          <FileUpload
                            label="Upload"
                            size="small"
                            bucketPath={`cth-documents/${doc.document_name}`}
                            onFilesUploaded={(urls) => {
                              const updatedDocuments = [...cthDocuments];
                              updatedDocuments[index].url = [...(updatedDocuments[index].url || []), ...urls];
                              setCthDocuments(updatedDocuments);
                            }}
                            multiple
                          />
                          <ImagePreview
                            images={doc.url || []}
                            onDeleteImage={(deleteIndex) => {
                              const updatedDocuments = [...cthDocuments];
                              updatedDocuments[index].url = updatedDocuments[index].url.filter((_, i) => i !== deleteIndex);
                              setCthDocuments(updatedDocuments);
                            }}
                          />
                          {!doc.isDefault && (
                            <IconButton size="small" color="error" onClick={() => confirmDeleteDocument(index)} sx={{ mt: 1, alignSelf: 'flex-end' }}>
                              <DeleteIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          )}
                        </Paper>
                      ))}
                    </Box>

                    <Box sx={{ mt: 1, p: 1.5, border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
                      <FormControl fullWidth size="small" variant="outlined" sx={{ mb: 1 }}>
                        <Select
                          value={selectedDocument}
                          onChange={(e) => setSelectedDocument(e.target.value)}
                          displayEmpty
                          sx={{ borderRadius: '8px', fontSize: '0.75rem' }}
                        >
                          <MenuItem value="" disabled>Add Document</MenuItem>
                          {cth_Dropdown.map((doc) => (
                            <MenuItem key={doc.document_code} value={doc.document_code}>{doc.document_name}</MenuItem>
                          ))}
                          <MenuItem value="other">Other</MenuItem>
                        </Select>
                      </FormControl>
                      <Button fullWidth variant="outlined" size="small" onClick={handleAddDocument} startIcon={<AddIcon />} sx={{ borderRadius: '8px', fontSize: '0.7rem' }}>
                        Add Section
                      </Button>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                  </Box>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #eaedf2' }}>
                    <Typography variant="caption" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CloudUploadIcon color="primary" sx={{ fontSize: 16 }} /> All Documents
                    </Typography>
                    <FileUpload
                      label="Upload Files"
                      bucketPath="all_documents"
                      onFilesUploaded={(newFiles) => {
                        const existingFiles = formik.values.all_documents || [];
                        const updatedFiles = [...existingFiles, ...newFiles];
                        formik.setFieldValue("all_documents", updatedFiles);
                      }}
                      multiple={true}
                    />
                    <ImagePreview
                      images={formik.values.all_documents || []}
                      onDeleteImage={(index) => {
                        const updatedFiles = [...formik.values.all_documents];
                        updatedFiles.splice(index, 1);
                        formik.setFieldValue("all_documents", updatedFiles);
                      }}
                    />
                  </Paper>

                  <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', border: '1px solid #eaedf2', bgcolor: fta_Benefit_date_time ? 'rgba(74, 222, 128, 0.05)' : '#f8fafc' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" fontWeight={700}>FTA Benefit</Typography>
                      <Switch
                        size="small"
                        checked={!!fta_Benefit_date_time}
                        onChange={() => {
                          if (fta_Benefit_date_time) setFtaBenefitDateTime(null);
                          else setFtaBenefitDateTime(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                        }}
                        color="primary"
                      />
                    </Box>
                    {fta_Benefit_date_time && (
                      <Typography variant="caption" sx={{ mt: 1, display: 'block', fontSize: '0.65rem' }}>
                        Captured: {new Date(fta_Benefit_date_time).toLocaleTimeString()}
                      </Typography>
                    )}
                  </Paper>
                </Box>
              </SectionCard>
            </Grid>

            {/* Submit Button Section */}
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(30, 58, 138, 0.02)', border: '1px dashed #1e3a8a33', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button variant="text" color="inherit" onClick={() => window.location.reload()} sx={{ fontWeight: 600, textTransform: 'none' }}>Discard & Reset</Button>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="contained" size="large" onClick={formik.handleSubmit} sx={{ px: 8, py: 1.5, borderRadius: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 8px 25px rgba(29, 78, 216, 0.3)' }}>
                    Finalize & Create Job
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Paper >

      <ConfirmDialog
        open={confirmDialogOpen}
        handleClose={() => setConfirmDialogOpen(false)}
        handleConfirm={handleDeleteDocument}
        message="Are you sure you want to delete this document?"
      />

      <ConfirmDialog
        open={editDialogOpen}
        handleClose={() => setEditDialogOpen(false)}
        handleConfirm={handleSaveEdit}
        isEdit
        editValues={editValues}
        onEditChange={setEditValues}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity || "info"}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box >
  );
};

export default ImportCreateJob;
