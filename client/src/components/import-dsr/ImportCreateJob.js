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
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Tabs,
  Tab
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
  { label: 'Invoice Details', icon: <InventoryIcon /> },
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
  const [invoiceSubTab, setInvoiceSubTab] = useState(0);
  const handleInvoiceSubTabChange = (event, newValue) => {
    setInvoiceSubTab(newValue);
  };
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
    other_charges_details,
    setOtherChargesDetails,
    invoice_details,
    addInvoiceRow,
    updateInvoiceRow,
    removeInvoiceRow,
    snackbar,
    setSnackbar,
    hss_address,
    setHssAddress,
    hss_address_details,
    setHssAddressDetails,
    hss_branch_id,
    setHssBranchId,
    hss_city,
    setHssCity,
    hss_ie_code_no,
    setHssIeCodeNo,
    hss_postal_code,
    setHssPostalCode,
    hss_country,
    setHssCountry,
    hss_ad_code,
    setHssAdCode,
    import_terms,
    setImportTerms,
    freight,
    setFreight,
    insurance,
    setInsurance,
    term_value,
    setTermValue,
    isEditMode,
    jobNumber,
    populateJobData,
    checkDuplicate
  } = useImportJobForm();

  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateJob, setDuplicateJob] = useState(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [nextJobNumber, setNextJobNumber] = useState("");

  const fetchNextJobNumber = async () => {
    if (isEditMode) {
      setNextJobNumber(jobNumber);
      return;
    }
    if (!branch_id) {
      const bc = branches.find(b => b._id === branch_id)?.branch_code || '???';
      setNextJobNumber(`${bc}/${trade_type}/${mode}/XXXXX/${selectedYear}`);
      return;
    }
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-next-job-number`, {
        params: { branch_id, trade_type, mode, financial_year: selectedYear }
      });
      console.log("Next Job Number fetched:", res.data.jobNumber);
      setNextJobNumber(res.data.jobNumber);
    } catch (error) {
      console.error("Error fetching next job number:", error);
      // Fallback to pattern
      const bc = branches.find(b => b._id === branch_id)?.branch_code || '???';
      setNextJobNumber(`${bc}/${trade_type}/${mode}/XXXXX/${selectedYear}`);
    }
  };

  const handleFinalizeClick = async () => {
    await fetchNextJobNumber();
    setReviewDialogOpen(true);
  };

  const handleBlBlur = async (e) => {
    const val = e.target.value;
    if (!val || val.length < 5 || isEditMode) return;

    setIsCheckingDuplicate(true);
    const result = await checkDuplicate(val, branch_id, year);
    setIsCheckingDuplicate(false);

    if (result.exists) {
      setDuplicateJob(result.job);
      setDuplicateDialogOpen(true);
    }
  };

  const handleFetchJob = () => {
    populateJobData(duplicateJob);
    setDuplicateDialogOpen(false);
    setSnackbar({
      open: true,
      message: "Job details fetched successfully. You can now edit and update.",
      severity: "info"
    });
  };

  const [currencies, setCurrencies] = useState([]);
  const currencyOptions = currencies.map(c => c.code);

  const schemeOptions = ["Full Duty", "DEEC", "EPCG", "RODTEP", "ROSTL", "TQ", "SIL"];
  const beTypeOptions = ["Home", "In-Bond", "Ex-Bond"];
  const portReportingOptionsSet = [
    "(INMUN1) Mundra Sea",
    "(INNSA1) Nhava Sheva Sea",
    "(INPAV1) Pipavav",
    "(INPAV6) Pipavav (Victor) Port",
    "(INHZA1) Hazira",
    "(INAMD4) Ahmedabad"
  ];
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
    const fetchCurrencies = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-currencies`);
        setCurrencies(res.data);
      } catch (error) {
        console.error("Error fetching currencies:", error);
      }
    };
    fetchCurrencies();
  }, []);

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
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isEditMode ? '#ffca28' : '#4ade80', boxShadow: isEditMode ? '0 0 10px #ffca28' : '0 0 10px #4ade80' }} />
              <Typography variant="body2" sx={{ opacity: 0.8, fontWeight: 500 }}>
                {isEditMode ? `Editing Job: ${jobNumber || "..."}` : "System Ready • New Job Entry"}
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
                    {isEditMode && (
                      <FormField label="Job Number">
                        <TextField
                          value={jobNumber}
                          variant="outlined"
                          size="small"
                          fullWidth
                          InputProps={{ readOnly: true }}
                          sx={{ ...compactInput, '& .MuiInputBase-root': { ...compactInput['& .MuiInputBase-root'], bgcolor: '#f5f5f5', fontWeight: 700 } }}
                        />
                      </FormField>
                    )}
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

                    {HSS && HSS === "Yes" && (
                      <Grid container item xs={12} spacing={2} sx={{ mt: 1, pt: 1, borderTop: '1px dashed #eaedf2' }}>
                        <FormField label="Seller Name" md={6}>
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

                        <FormField label="Address" md={6}>
                          <TextField
                            select
                            fullWidth
                            size="small"
                            value={hss_address}
                            onChange={(e) => setHssAddress(e.target.value)}
                            variant="outlined"
                            sx={compactInput}
                          >
                            <MenuItem value="Office">Office</MenuItem>
                            <MenuItem value="Warehouse">Warehouse</MenuItem>
                            <MenuItem value="Factory">Factory</MenuItem>
                          </TextField>
                        </FormField>

                        <FormField label="Address Details" md={12}>
                          <TextField
                            multiline
                            rows={3}
                            fullWidth
                            value={hss_address_details}
                            onChange={(e) => setHssAddressDetails(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{
                              '& .MuiInputBase-root': { fontSize: '0.8rem', bgcolor: '#fdfceb' },
                              '& .MuiOutlinedInput-input': { padding: '4px 8px !important' },
                            }}
                          />
                        </FormField>

                        <FormField label="Branch SNo" md={3}>
                          <TextField
                            value={hss_branch_id}
                            onChange={(e) => setHssBranchId(e.target.value)}
                            variant="outlined"
                            size="small"
                            fullWidth
                            sx={compactInput}
                          />
                        </FormField>

                        <FormField label="IE Code No" md={3}>
                          <TextField
                            value={hss_ie_code_no}
                            onChange={(e) => setHssIeCodeNo(e.target.value)}
                            variant="outlined"
                            size="small"
                            fullWidth
                            sx={compactInput}
                          />
                        </FormField>

                        <FormField label="City" md={3}>
                          <TextField
                            value={hss_city}
                            onChange={(e) => setHssCity(e.target.value)}
                            variant="outlined"
                            size="small"
                            fullWidth
                            sx={compactInput}
                          />
                        </FormField>

                        <FormField label="Postal Code" md={3}>
                          <TextField
                            value={hss_postal_code}
                            onChange={(e) => setHssPostalCode(e.target.value)}
                            variant="outlined"
                            size="small"
                            fullWidth
                            sx={compactInput}
                          />
                        </FormField>

                        <FormField label="Country" md={6}>
                          <Autocomplete
                            freeSolo
                            options={countryOptions}
                            value={hss_country || ""}
                            onInputChange={(event, newValue) => setHssCountry(newValue)}
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

                        <FormField label="AD Code" md={6}>
                          <TextField
                            value={hss_ad_code}
                            onChange={(e) => setHssAdCode(e.target.value)}
                            variant="outlined"
                            size="small"
                            fullWidth
                            sx={compactInput}
                          />
                        </FormField>
                      </Grid>
                    )}
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
                        onBlur={handleBlBlur}
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
                            onBlur={handleBlBlur}
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
                        options={portReportingOptionsSet}
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

                  </Grid>
                </SectionCard>
              </Grid>

              <Grid item xs={12}>
                <SectionCard
                  title="4. Invoice & Documentation Details"
                  icon={<InventoryIcon />}
                  stepIndex={3}
                  activeStep={activeStep}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 1.5 }}>
                        <Tabs value={invoiceSubTab} onChange={handleInvoiceSubTabChange} sx={{ minHeight: "40px" }}>
                          <Tab label="Main Details" sx={{ textTransform: "none", fontWeight: "600", fontSize: '0.85rem' }} />
                          <Tab label="Other Charges" sx={{ textTransform: "none", fontWeight: "600", fontSize: '0.85rem' }} />
                        </Tabs>
                      </Box>
                    </Grid>

                    {invoiceSubTab === 0 && (
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            Invoice Details
                          </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={addInvoiceRow}
                          sx={{ fontSize: '0.65rem', py: 0.5 }}
                        >
                          Add Invoice
                        </Button>
                      </Box>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            {['Sr', 'Invoice Number', 'Invoice Date', 'PO NO', 'Product Value', 'Currency', 'TOI', 'Freight', 'Insurance', 'Other Chrgs', 'Invoice Value', ''].map((h) => (
                              <th key={h} style={{ borderBottom: '1px solid #dee2e6', padding: '6px 8px', fontSize: '0.65rem', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {invoice_details?.map((row, rowIndex) => (
                            <tr key={`inv-row-${rowIndex}`}>
                               <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', fontSize: '0.75rem', width: '30px', textAlign: 'center' }}>
                                {rowIndex + 1}
                              </td>
                              <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', width: '130px' }}>
                                <TextField
                                  size="small"
                                  fullWidth
                                  placeholder="Inv No"
                                  value={row.invoice_number || ""}
                                  onChange={(e) => updateInvoiceRow(rowIndex, "invoice_number", e.target.value)}
                                  sx={compactInput}
                                />
                              </td>
                              <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', width: '110px' }}>
                                <TextField
                                  type="date"
                                  size="small"
                                  fullWidth
                                  value={row.invoice_date || ""}
                                  onChange={(e) => updateInvoiceRow(rowIndex, "invoice_date", e.target.value)}
                                  InputLabelProps={{ shrink: true }}
                                  sx={compactInput}
                                />
                              </td>
                              <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', width: '100px' }}>
                                <TextField
                                  size="small"
                                  fullWidth
                                  placeholder="PO No"
                                  value={row.po_no || ""}
                                  onChange={(e) => updateInvoiceRow(rowIndex, "po_no", e.target.value)}
                                  sx={compactInput}
                                />
                              </td>
                              <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', width: '100px' }}>
                                <TextField
                                  size="small"
                                  fullWidth
                                  placeholder="Product Value"
                                  value={row.product_value || ""}
                                  onChange={(e) => updateInvoiceRow(rowIndex, "product_value", e.target.value)}
                                  sx={compactInput}
                                />
                              </td>
                              <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', width: '100px' }}>
                                <Autocomplete
                                  freeSolo
                                  size="small"
                                  options={currencyOptions}
                                  value={row.inv_currency || ""}
                                  onInputChange={(event, newValue) => updateInvoiceRow(rowIndex, "inv_currency", newValue)}
                                  onChange={(event, newValue) => updateInvoiceRow(rowIndex, "inv_currency", newValue || "")}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      variant="outlined"
                                      size="small"
                                      placeholder="Currency"
                                      sx={compactInput}
                                    />
                                  )}
                                />
                              </td>
                              <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', width: '90px' }}>
                                <TextField
                                  select
                                  size="small"
                                  fullWidth
                                  value={row.toi || "CIF"}
                                  onChange={(e) => updateInvoiceRow(rowIndex, "toi", e.target.value)}
                                  sx={compactInput}
                                >
                                  <MenuItem value="CIF">CIF</MenuItem>
                                  <MenuItem value="FOB">FOB</MenuItem>
                                  <MenuItem value="CF">C&F</MenuItem>
                                  <MenuItem value="CI">C&I</MenuItem>
                                </TextField>
                              </td>
                              <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', width: '90px' }}>
                                <TextField
                                  size="small"
                                  fullWidth
                                  placeholder="Freight"
                                  value={row.freight || ""}
                                  onChange={(e) => updateInvoiceRow(rowIndex, "freight", e.target.value)}
                                  sx={compactInput}
                                  disabled={!(row.toi === "FOB" || row.toi === "CI")}
                                />
                              </td>
                              <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', width: '90px' }}>
                                <TextField
                                  size="small"
                                  fullWidth
                                  placeholder="Insurance"
                                  value={row.insurance || ""}
                                  onChange={(e) => updateInvoiceRow(rowIndex, "insurance", e.target.value)}
                                  sx={compactInput}
                                  disabled={!(row.toi === "FOB" || row.toi === "CF")}
                                />
                              </td>
                              <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', width: '90px' }}>
                                <TextField
                                  size="small"
                                  fullWidth
                                  placeholder="Other Chrgs"
                                  value={row.other_charges || ""}
                                  onChange={(e) => updateInvoiceRow(rowIndex, "other_charges", e.target.value)}
                                  sx={compactInput}
                                />
                              </td>
                              <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', width: '100px' }}>
                                <TextField
                                  size="small"
                                  fullWidth
                                  placeholder="Invoice Value"
                                  value={row.total_inv_value || ""}
                                  InputProps={{ readOnly: true }}
                                  sx={{ ...compactInput, '& .MuiInputBase-root': { ...compactInput['& .MuiInputBase-root'], bgcolor: '#f5f5f5' } }}
                                />
                              </td>
                              <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', width: '40px' }}>
                                <IconButton 
                                  size="small" 
                                  color="error" 
                                  onClick={() => removeInvoiceRow(rowIndex)}
                                  disabled={invoice_details.length <= 1}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Grid>
                  )}

                  {invoiceSubTab === 1 && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Checkbox
                          checked={other_charges_details?.is_single_for_all}
                          onChange={(e) => setOtherChargesDetails({ ...other_charges_details, is_single_for_all: e.target.checked })}
                          size="small"
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.8rem' }}>
                          Single Freight, Insurance & other charges for all Invoices
                        </Typography>
                      </Box>

                      <Box sx={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                              {['Charge Head', 'Currency', 'Exch. Rate', 'Rate %', 'Amount', 'Remark'].map((h) => (
                                <th key={h} style={{ borderBottom: '1px solid #dee2e6', padding: '6px 8px', fontSize: '0.65rem', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { id: "miscellaneous", label: "Miscellaneous Chrgs." },
                              { id: "agency", label: "Agency" },
                              { id: "discount", label: "Discount, if any" },
                              { id: "loading", label: "Loading" },
                              { id: "freight", label: "Freight" },
                              { id: "insurance", label: "Insurance" },
                              { id: "addl_charge", label: "Addl Chrg(High Sea)" },
                            ].map((row) => (
                              <tr key={row.id}>
                                <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                                  {row.label}
                                </td>
                                <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', width: '120px' }}>
                                  <Autocomplete
                                     freeSolo
                                     size="small"
                                     options={currencyOptions}
                                     value={other_charges_details?.[row.id]?.currency || ""}
                                     onInputChange={(event, newValue) => setOtherChargesDetails({
                                       ...other_charges_details,
                                       [row.id]: { ...other_charges_details[row.id], currency: newValue }
                                     })}
                                     onChange={(event, newValue) => setOtherChargesDetails({
                                       ...other_charges_details,
                                       [row.id]: { ...other_charges_details[row.id], currency: newValue || "" }
                                     })}
                                     renderInput={(params) => (
                                       <TextField
                                         {...params}
                                         variant="outlined"
                                         size="small"
                                         placeholder="Currency"
                                         sx={compactInput}
                                       />
                                     )}
                                   />
                                </td>
                                <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', width: '100px' }}>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    type="number"
                                    value={other_charges_details?.[row.id]?.exchange_rate || ""}
                                    onChange={(e) => setOtherChargesDetails({
                                      ...other_charges_details,
                                      [row.id]: { ...other_charges_details[row.id], exchange_rate: e.target.value }
                                    })}
                                    sx={compactInput}
                                  />
                                </td>
                                <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', width: '100px' }}>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    type="number"
                                    value={other_charges_details?.[row.id]?.rate || ""}
                                    onChange={(e) => setOtherChargesDetails({
                                      ...other_charges_details,
                                      [row.id]: { ...other_charges_details[row.id], rate: e.target.value }
                                    })}
                                    sx={compactInput}
                                  />
                                </td>
                                <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5', width: '120px' }}>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    type="number"
                                    value={other_charges_details?.[row.id]?.amount || ""}
                                    onChange={(e) => setOtherChargesDetails({
                                      ...other_charges_details,
                                      [row.id]: { ...other_charges_details[row.id], amount: e.target.value }
                                    })}
                                    sx={compactInput}
                                  />
                                </td>
                                <td style={{ padding: '4px', borderBottom: '1px solid #f1f3f5' }}>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    placeholder="Remark"
                                    value={other_charges_details?.[row.id]?.remark || ""}
                                    onChange={(e) => setOtherChargesDetails({
                                      ...other_charges_details,
                                      [row.id]: { ...other_charges_details[row.id], remark: e.target.value }
                                    })}
                                    sx={compactInput}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Box>

                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: '100px' }}>Revenue Deposit</Typography>
                            <TextField
                              size="small"
                              type="number"
                              sx={{ ...compactInput, width: '80px' }}
                              value={other_charges_details?.revenue_deposit?.rate || ""}
                              onChange={(e) => setOtherChargesDetails({
                                ...other_charges_details,
                                revenue_deposit: { ...other_charges_details.revenue_deposit, rate: e.target.value }
                              })}
                            />
                            <Typography variant="caption">% on</Typography>
                            <TextField
                              select
                              size="small"
                              sx={{ ...compactInput, width: '120px' }}
                              value={other_charges_details?.revenue_deposit?.on || "Assessable"}
                              onChange={(e) => setOtherChargesDetails({
                                ...other_charges_details,
                                revenue_deposit: { ...other_charges_details.revenue_deposit, on: e.target.value }
                              })}
                            >
                              <MenuItem value="Assessable">Assessable</MenuItem>
                              <MenuItem value="Duty">Duty</MenuItem>
                              <MenuItem value="Total">Total</MenuItem>
                            </TextField>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: '100px' }}>Landing Charge</Typography>
                            <TextField
                              size="small"
                              type="number"
                              sx={{ ...compactInput, width: '80px' }}
                              value={other_charges_details?.landing_charge?.rate || ""}
                              onChange={(e) => setOtherChargesDetails({
                                ...other_charges_details,
                                landing_charge: { ...other_charges_details.landing_charge, rate: e.target.value }
                              })}
                            />
                            <Typography variant="caption">%</Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Grid>
                  )}
                </Grid>
              </SectionCard>
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
                <Box sx={{ mb: 3, p: 2, bgcolor: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                  <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                    Document Status
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={isDraftDoc}
                        onChange={(e) => setIsDraftDoc(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={<Typography variant="body2" fontWeight={500}>Is Draft Document</Typography>}
                  />
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                    {isDraftDoc ? "This document is a draft." : "This document is finalized."}
                  </Typography>
                </Box>

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

            {/* Section 6: Description Details - Full Width */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <DescriptionIcon color="primary" />
                    <Typography variant="h6" fontWeight={700} color="primary.main">
                      Description Details
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={addDescriptionRow}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                  >
                    Add Description Row
                  </Button>
                </Box>

                <Box sx={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1600px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {[
                          { h: "Sr No", w: "50px" },
                          { h: "Inv SR", w: "100px" },
                          { h: "Description", w: "450px" },
                          { h: "Quantity", w: "100px" },
                          { h: "Unit", w: "100px" },
                          { h: "Unit Price", w: "120px" },
                          { h: "Amount", w: "120px" },
                          { h: "CTH", w: "150px" },
                          { h: "Clearance", w: "180px" },
                          { h: "LIC SR", w: "100px" },
                          { h: "FOC Item", w: "100px" },
                          { h: "Action", w: "60px" }
                        ].map((col) => (
                          <th 
                            key={col.h} 
                            style={{ 
                              borderBottom: '2px solid #e2e8f0', 
                              padding: '12px 8px', 
                              fontSize: '0.7rem', 
                              textAlign: 'left', 
                              whiteSpace: 'nowrap', 
                              fontWeight: 800, 
                              textTransform: 'uppercase', 
                              color: '#64748b',
                              width: col.w,
                              minWidth: col.w
                            }}
                          >
                            {col.h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {description_details?.map((row, rowIndex) => (
                        <tr key={`desc-row-${rowIndex}`}>
                          <td style={{ padding: '8px 4px', borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                            {rowIndex + 1}
                          </td>
                          <td style={{ padding: '8px 4px', borderBottom: '1px solid #f1f5f9' }}>
                            <TextField
                              select
                              size="small"
                              fullWidth
                              value={row.sr_no_invoice || ""}
                              onChange={(e) => updateDescriptionRow(rowIndex, "sr_no_invoice", e.target.value)}
                              sx={compactInput}
                            >
                              <MenuItem value="">Select</MenuItem>
                              {invoice_details.map((_, idx) => (
                                <MenuItem key={idx + 1} value={String(idx + 1)}>
                                  {idx + 1}
                                </MenuItem>
                              ))}
                            </TextField>
                          </td>
                          <td style={{ padding: '8px 4px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                            <TextField
                              size="small"
                              fullWidth
                              multiline
                              rows={2}
                              placeholder="Full Item Description"
                              value={row.description || ""}
                              onChange={(e) => updateDescriptionRow(rowIndex, "description", e.target.value)}
                              sx={{ 
                                ...compactInput, 
                                '& .MuiInputBase-root': { ...compactInput['& .MuiInputBase-root'], height: 'auto' } 
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 4px', borderBottom: '1px solid #f1f5f9' }}>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="Qty"
                              value={row.quantity || ""}
                              onChange={(e) => updateDescriptionRow(rowIndex, "quantity", e.target.value)}
                              sx={compactInput}
                            />
                          </td>
                          <td style={{ padding: '8px 4px', borderBottom: '1px solid #f1f5f9' }}>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="Unit"
                              value={row.unit || ""}
                              onChange={(e) => updateDescriptionRow(rowIndex, "unit", e.target.value)}
                              sx={compactInput}
                            />
                          </td>
                          <td style={{ padding: '8px 4px', borderBottom: '1px solid #f1f5f9' }}>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="Price"
                              value={row.unit_price || ""}
                              onChange={(e) => updateDescriptionRow(rowIndex, "unit_price", e.target.value)}
                              sx={compactInput}
                            />
                          </td>
                          <td style={{ padding: '8px 4px', borderBottom: '1px solid #f1f5f9' }}>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="Total"
                              value={row.amount || ""}
                              InputProps={{ readOnly: true }}
                              sx={{ ...compactInput, '& .MuiInputBase-root': { ...compactInput['& .MuiInputBase-root'], bgcolor: '#f8fafc', fontWeight: 600 } }}
                             />
                          </td>
                          <td style={{ padding: '8px 4px', borderBottom: '1px solid #f1f5f9' }}>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="CTH No"
                              value={row.cth_no || ""}
                              onChange={(e) => updateDescriptionRow(rowIndex, "cth_no", e.target.value)}
                              sx={compactInput}
                            />
                          </td>
                          <td style={{ padding: '8px 4px', borderBottom: '1px solid #f1f5f9' }}>
                            <TextField
                              select
                              size="small"
                              fullWidth
                              value={row.clearance_under || ""}
                              onChange={(e) => updateDescriptionRow(rowIndex, "clearance_under", e.target.value)}
                              sx={compactInput}
                            >
                              <MenuItem value="">Select</MenuItem>
                              {schemeOptions.map((option, index) => (
                                <MenuItem key={index} value={option}>
                                  {option}
                                </MenuItem>
                              ))}
                            </TextField>
                          </td>
                          <td style={{ padding: '8px 4px', borderBottom: '1px solid #f1f5f9' }}>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="Lic SR"
                              value={row.sr_no_lic || ""}
                              onChange={(e) => updateDescriptionRow(rowIndex, "sr_no_lic", e.target.value)}
                              sx={compactInput}
                            />
                          </td>
                          <td style={{ padding: '8px 4px', borderBottom: '1px solid #f1f5f9' }}>
                            <TextField
                              select
                              size="small"
                              fullWidth
                              value={row.foc_item || "No"}
                              onChange={(e) => updateDescriptionRow(rowIndex, "foc_item", e.target.value)}
                              sx={compactInput}
                            >
                              <MenuItem value="Yes">Yes</MenuItem>
                              <MenuItem value="No">No</MenuItem>
                            </TextField>
                          </td>
                          <td style={{ padding: '8px 4px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={description_details.length <= 1}
                              onClick={() => removeDescriptionRow(rowIndex)}
                              sx={{ p: 0.5, '&:hover': { bgcolor: 'error.lighter' } }}
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

            {/* Submit Button Section */}
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(30, 58, 138, 0.02)', border: '1px dashed #1e3a8a33', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button variant="text" color="inherit" onClick={() => window.location.reload()} sx={{ fontWeight: 600, textTransform: 'none' }}>Discard & Reset</Button>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button 
                    variant="contained" 
                    size="large" 
                    onClick={handleFinalizeClick} 
                    sx={{ 
                      px: 8, 
                      py: 1.5, 
                      borderRadius: '12px', 
                      fontWeight: 800, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em', 
                      boxShadow: isEditMode ? '0 8px 25px rgba(255, 202, 40, 0.3)' : '0 8px 25px rgba(29, 78, 216, 0.3)',
                      bgcolor: isEditMode ? 'warning.main' : 'primary.main',
                      '&:hover': {
                        bgcolor: isEditMode ? 'warning.dark' : 'primary.dark',
                      }
                    }}
                  >
                    {isEditMode ? 'Update Job Details' : 'Finalize & Create Job'}
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

      <Dialog
        open={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '16px', p: 1 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BusinessIcon /> Duplicate Job Found
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, fontWeight: 500, color: 'text.primary' }}>
            A job already exists in the system for this BL/AWB number.
          </DialogContentText>
          {duplicateJob && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', mb: 2 }}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Job Number</Typography>
                  <Typography variant="body2" fontWeight={700}>{duplicateJob.job_number || duplicateJob.job_no}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Importer</Typography>
                  <Typography variant="body2" fontWeight={700}>{duplicateJob.importer}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Mode</Typography>
                  <Typography variant="body2" fontWeight={700}>{duplicateJob.mode}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Branch</Typography>
                  <Typography 
                    variant="body2" 
                    fontWeight={700} 
                    color={duplicateJob.branch_id !== branch_id ? "error.main" : "inherit"}
                  >
                    {duplicateJob.branch_code}
                    {duplicateJob.branch_id !== branch_id && " (Different Branch)"}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Globally, BL numbers must be unique. 
            {duplicateJob && duplicateJob.branch_id !== branch_id ? (
              <Box component="span" sx={{ color: 'error.main', fontWeight: 600 }}>
                {" "}This BL is already registered in another branch. You cannot create or edit it from this context.
              </Box>
            ) : (
              " Would you like to fetch the existing job details to update them?"
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDuplicateDialogOpen(false)} variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button 
            onClick={handleFetchJob} 
            variant="contained" 
            color="primary" 
            disabled={duplicateJob && duplicateJob.branch_id !== branch_id}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, boxShadow: 'none' }}
          >
            Fetch & Edit Details
          </Button>
        </DialogActions>
      </Dialog>

      {/* JOB REVIEW DIALOG */}
      <Dialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '16px', p: 1 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'primary.main', borderBottom: '1px solid #eee', mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Confirm Job Details
          <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Job No: {nextJobNumber}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            {/* Row 1: General Info */}
            <Grid item xs={12} md={4}>
              <Typography variant="overline" color="text.secondary" fontWeight={700}>Branch & Mode</Typography>
              <Typography variant="body2"><b>Branch:</b> {branches.find(b => b._id === branch_id)?.branch_name || 'N/A'}</Typography>
              <Typography variant="body2"><b>Mode:</b> {mode}</Typography>
              <Typography variant="body2"><b>Trade Type:</b> {trade_type}</Typography>
              <Typography variant="body2"><b>Year:</b> {selectedYear}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="overline" color="text.secondary" fontWeight={700}>Parties</Typography>
              <Typography variant="body2"><b>Importer:</b> {importer}</Typography>
              <Typography variant="body2"><b>Supplier:</b> {supplier_exporter}</Typography>
              <Typography variant="body2"><b>Custom House:</b> {custom_house}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="overline" color="text.secondary" fontWeight={700}>Shipping</Typography>
              <Typography variant="body2"><b>B/L No:</b> {awb_bl_no}</Typography>
              <Typography variant="body2"><b>B/L Date:</b> {awb_bl_date}</Typography>
              <Typography variant="body2"><b>Vessel/Flight:</b> {vessel_berthing}</Typography>
            </Grid>

            {/* Row 2: Cargo & Value */}
            <Grid item xs={12} md={4}>
              <Typography variant="overline" color="text.secondary" fontWeight={700}>Cargo Details</Typography>
              <Typography variant="body2"><b>Gross Wt:</b> {gross_weight}</Typography>
              <Typography variant="body2"><b>Net Wt:</b> {job_net_weight}</Typography>
              <Typography variant="body2"><b>Consignment:</b> {consignment_type}</Typography>
              <Typography variant="body2"><b>Containers:</b> {container_nos.length}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="overline" color="text.secondary" fontWeight={700}>Value & Currency</Typography>
              <Typography variant="body2"><b>Invoice Val:</b> {total_inv_value}</Typography>
              <Typography variant="body2"><b>Currency:</b> {inv_currency}</Typography>
              <Typography variant="body2"><b>Incoterm:</b> {import_terms}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="overline" color="text.secondary" fontWeight={700}>Clearance</Typography>
              <Typography variant="body2"><b>B/E Type:</b> {type_of_b_e}</Typography>
              <Typography variant="body2"><b>Scheme:</b> {scheme}</Typography>
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, p: 2, bgcolor: '#fff9c4', borderRadius: '8px', border: '1px solid #fbc02d' }}>
            <Typography variant="body2" sx={{ color: '#5f4b00', fontWeight: 500 }}>
              Please carefully review the information above. Once created, some details may require administrative privileges to change.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setReviewDialogOpen(false)} variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
            Back to Edit
          </Button>
          <Button 
            onClick={() => {
              setReviewDialogOpen(false);
              formik.handleSubmit();
            }} 
            variant="contained" 
            color="primary" 
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, px: 4 }}
          >
            {isEditMode ? 'Confirm Update' : 'Confirm & Create Job'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
};

export default ImportCreateJob;
