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
} from "@mui/material";
import FormControlLabel from "@mui/material/FormControlLabel";
import { IconButton } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import FileUpload from "../../components/gallery/FileUpload";
import ImagePreview from "../../components/gallery/ImagePreview";
import ConfirmDialog from "../../components/gallery/ConfirmDialog"; // Import ConfirmDialog
import {
  customHouseOptions,
  importerOptions,
  shippingLineOptions,
  cth_Dropdown,
  countryOptions,
  hssOptions,
  portReportingOptions,
} from "../MasterLists/MasterLists";
import { useFormik } from "formik";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import useImportJobForm from "../../customHooks/useImportJobForm.js";
import axios from "axios";

const ImportCreateJob = () => {
  // const [HSS, setHSS] = useState("");
  // const [sallerName, setSallerName] = useState("");

  const {
    formik,
    // job_no,
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
    setVesselberthing,
    type_of_b_e,
    setTypeOfBE,
    loading_port,
    setLoadingPort,
    gross_weight,
    setGrossWeight,
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
    bankName
  } = useImportJobForm();

  const schemeOptions = ["Full Duty", "DEEC", "EPCG", "RODTEP", "ROSTL"];
  const beTypeOptions = ["Home", "In-Bond", "Ex-Bond"];
  const [selectedYear, setSelectedYear] = useState("");
  const years = ["24-25", "25-26", "26-27"]; // Add more ranges as needed
  const [selectedImporter, setSelectedImporter] = useState("");
  const [importers, setImporters] = useState("");

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
  // Function to build the search query (not needed on client-side, handled by server)
  // Keeping it in case you want to extend client-side filtering

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
    // Determine the current date
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // Months are zero-based
    const currentTwoDigits = String(currentYear).slice(-2); // Last two digits of current year
    const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0"); // Last two digits of next year
    const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0"); // Last two digits of previous year

    let defaultYearPair;

    // Determine the financial year
    if (currentMonth >= 4) {
      // From April of the current year to March of the next year
      defaultYearPair = `${currentTwoDigits}-${nextTwoDigits}`;
    } else {
      // From January to March, use the previous financial year
      defaultYearPair = `${prevTwoDigits}-${currentTwoDigits}`;
    }

    // Set default year pair if not already selected
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
    ],
    "In-Bond": [{ value: "In-Bond", label: "In-bond" }],
    "Ex-Bond": [{ value: "Ex-Bond", label: "Ex-Bond" }],
  };
  const filteredClearanceOptions = clearanceOptionsMapping[type_of_b_e] || [];
  return (
    <div style={{ padding: "20px" }}>
      <Typography variant="h4" gutterBottom style={{ marginBottom: "20px" }}>
        Create Import Job
      </Typography>

      <TextField
        select
        size="small"
        value={selectedYear}
        onChange={(e) => setSelectedYear(e.target.value)}
        sx={{ width: "200px", marginRight: "20px" }}
      >
        {years.map((year, index) => (
          <MenuItem key={`year-${year}-${index}`} value={year}>
            {year}
          </MenuItem>
        ))}
      </TextField>

      <Grid
        container
        spacing={3}
        style={{ maxWidth: "1100px", margin: "0 auto" }}
      >
        {/* Custom House */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Select Custom House:
          </Typography>
          <Autocomplete
            freeSolo
            options={customHouseOptions}
            value={custom_house}
            onInputChange={(event, newValue) => setCustomHouse(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                size="small"
                helperText="Start typing to see suggestions"
                fullWidth
              />
            )}
          />
        </Grid>

        {/* Importer */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Importer:
          </Typography>
          <Autocomplete
            freeSolo
            options={importerNames.map((option) => option.label)}
            value={importer || ""} // Controlled value
            onInputChange={(event, newValue) => setImporter(newValue)} // Handles input change
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                size="small"
                fullWidth
                helperText="Start typing to see suggestions"
              />
            )}
          />
        </Grid>

        {/* Branch SR No */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Branch SR No:
          </Typography>
          <TextField
            value={branchSrNo}
            onChange={(e) => setBranchSrNo(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
          />
        </Grid>

        {/* AD Code */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            AD Code:
          </Typography>
          <TextField
            value={adCode}
            onChange={(e) => setAdCode(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={6}></Grid>

        <Grid item xs={12} md={6}>
    <Typography variant="body1" style={{ fontWeight: 600 }}>
      Bank Name:
    </Typography>
    <TextField
      value={bankName}
      onChange={(e) => setBankName(e.target.value)}
      variant="outlined"
      size="small"
      fullWidth
    />
  </Grid>
        {/* <Grid item xs={12} md={4}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
           bank:
          </Typography>
          <TextField
            value={adCode}
            onChange={(e) => setAdCode(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
          />
        </Grid> */}
        {/* Exporter/Supplier */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Supplier/Exporter
          </Typography>
          <TextField
            value={supplier_exporter}
            onChange={(e) => setSupplierExporter(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter Supplier/Exporter"
            fullWidth
          />
        </Grid>

        {/* Shipping Line/Airline */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Shipping Line/Airline:
          </Typography>
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
                helperText="Start typing to see suggestions"
                fullWidth
              />
            )}
          />
        </Grid>
        {/* test01-02 */}
        {/* BL Date */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            ETA Date:
          </Typography>
          <TextField
            type="date"
            value={vessel_berthing}
            onChange={(e) => setVesselberthing(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        {/* BL Number */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            AWB/BL Number:
          </Typography>
          <TextField
            value={awb_bl_no}
            onChange={(e) => setAwbBlNo(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter BL Number"
            fullWidth
          />
        </Grid>

        {/* BL Date */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            AWB/BL Date:
          </Typography>
          <TextField
            type="date"
            value={awb_bl_date}
            onChange={(e) => setAwbBlDate(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Type Of B/E:
          </Typography>
          <Autocomplete
            options={beTypeOptions}
            value={type_of_b_e}
            onChange={(event, newValue) => setTypeOfBE(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                size="small"
                placeholder="Enter Type Of B/E"
                fullWidth
              />
            )}
          />
        </Grid>
        {/* BL Number */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Gross Weight:
          </Typography>
          <TextField
            value={gross_weight}
            onChange={(e) => setGrossWeight(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter Gross Weight"
            fullWidth
          />
        </Grid>
        {/* BL Number */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Loading Port:
          </Typography>
          <TextField
            value={loading_port}
            onChange={(e) => setLoadingPort(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter Loading Port"
            fullWidth
          />
        </Grid>
        {/* BL Number */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Origin Country:
          </Typography>
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
                helperText="Start typing to see suggestions"
                fullWidth
              />
            )}
          />
        </Grid>
        {/* BL Number */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Port of Reporting:
          </Typography>
          <TextField
            value={port_of_reporting}
            onChange={(e) => setPortOfReporting(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter Port of Reporting"
            fullWidth
          />
        </Grid>
        {/* BL Number */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Total Inv Value:
          </Typography>
          <TextField
            value={total_inv_value}
            onChange={(e) => setTotalInvValue(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter Total Inv Value"
            fullWidth
          />
        </Grid>
        {/* BL Number */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Inv Currency:
          </Typography>
          <TextField
            value={inv_currency}
            onChange={(e) => setInvCurrency(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter Inv Currency"
            fullWidth
          />
        </Grid>

        {/* Invoice Number */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Invoice Number:
          </Typography>
          <TextField
            value={invoice_number}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter Invoice Number"
            fullWidth
          />
        </Grid>

        {/* Invoice Date */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Invoice Date:
          </Typography>
          <TextField
            type="date"
            value={invoice_date}
            onChange={(e) => setInvoiceDate(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        {/* Description */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Description:
          </Typography>
          <TextField
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter Description"
            fullWidth
          />
        </Grid>
        {/* FCL/LCL Selector */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Consignment Type:
          </Typography>
          <TextField
            select
            value={consignment_type}
            onChange={(e) => setConsignmentType(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
          >
            <MenuItem value="FCL">FCL</MenuItem>
            <MenuItem value="LCL">LCL</MenuItem>
          </TextField>
        </Grid>

        {/* BL Number */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            CTH No:
          </Typography>
          <TextField
            value={cth_no}
            onChange={(e) => setCthNo(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter CTH No"
            fullWidth
          />
        </Grid>

        {/* FCL/LCL Selector */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Draft Document:
          </Typography>
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
          <Typography variant="body2" style={{ marginTop: "8px" }}>
            {isDraftDoc
              ? "This document is a draft."
              : "This document is finalized."}
          </Typography>
        </Grid>

        {/* HSS */}
        <Grid item xs={12} md={6}>
  <Typography variant="body2" sx={{ fontWeight: 600 }}>
    HSS:
  </Typography>
  <TextField
    select // This is the key missing part!
    variant="outlined"
    size="small"
    value={HSS}
    id="hss"
    name="hss"
    onChange={(e) => setHSS(e.target.value)}
    helperText="Start typing to see suggestions"
    fullWidth
  >
    {hssOptions.map((option) => (
      <MenuItem key={option} value={option}>
        {option}
      </MenuItem>
    ))}
  </TextField>
</Grid>


        {/* conditionallyy render this saller name */}

        {HSS && HSS == "Yes" && (
          <Grid item xs={12} md={6}>
            <Typography variant="body1" style={{ fontWeight: 600 }}>
              Saller Name:
            </Typography>
            <TextField
              value={sallerName}
              onChange={(e) => setSallerName(e.target.value)}
              variant="outlined"
              size="small"
              placeholder="Enter Saller Name"
              fullWidth
            />
          </Grid>
        )}

        {/*  */}
        {!isDraftDoc && (
          <>
            {/* CTH Documents Section */}
            <Grid
              container
              // spacing={3}
              style={{ marginTop: "20px", padding: "0 20px" }}
            >
              {cthDocuments.map((doc, index) => (
                <Grid
                  item
                  xs={12}
                  md={6}
                  gap={1}
                  key={`cth-${index}`}
                  style={{
                    position: "relative",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "16px",
                    backgroundColor: "#f9f9f9",
                  }}
                >
                  {/* Document Name and Code */}
                  <Typography
                    variant="body1"
                    style={{
                      fontWeight: 600,
                      marginBottom: "8px",
                      color: "#333",
                    }}
                  >
                    {doc.document_name}{" "}
                    <span style={{ color: "#666", fontWeight: 400 }}>
                      ({doc.document_code})
                    </span>
                  </Typography>

                  {/* File Upload Component */}
                  <FileUpload
                    label="Upload Files"
                    bucketPath={`cth-documents/${doc.document_name}`}
                    onFilesUploaded={(urls) => {
                      const updatedDocuments = [...cthDocuments];
                      updatedDocuments[index].url = [
                        ...(updatedDocuments[index].url || []),
                        ...urls,
                      ];
                      setCthDocuments(updatedDocuments);
                    }}
                    multiple
                  />

                  {/* Uploaded Images Preview */}
                  <ImagePreview
                    images={doc.url || []}
                    onDeleteImage={(deleteIndex) => {
                      const updatedDocuments = [...cthDocuments];
                      updatedDocuments[index].url = updatedDocuments[
                        index
                      ].url.filter((_, i) => i !== deleteIndex);
                      setCthDocuments(updatedDocuments);
                    }}
                  />

                  {/* Message for No Uploaded Files */}
                  {(!doc.url || doc.url.length === 0) && (
                    <Typography
                      variant="body2"
                      style={{ color: "#999", marginTop: "8px" }}
                    >
                      No files uploaded yet.
                    </Typography>
                  )}

                  {/* Action Buttons */}
                  {!doc.isDefault && (
                    <div
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        display: "flex",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          cursor: "pointer",
                          color: "#007bff",
                          fontSize: "18px",
                        }}
                        onClick={() => handleOpenEditDialog(index)}
                        title="Edit"
                      >
                        <i className="fas fa-edit"></i>
                      </span>
                      <span
                        style={{
                          cursor: "pointer",
                          color: "#dc3545",
                          fontSize: "18px",
                        }}
                        onClick={() => confirmDeleteDocument(index)}
                        title="Delete"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </span>
                    </div>
                  )}
                </Grid>
              ))}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body1" style={{ fontWeight: 600 }}>
                Add CTH Document:
              </Typography>
              <FormControl fullWidth size="small" variant="outlined">
                <Select
                  value={selectedDocument}
                  onChange={(e) => setSelectedDocument(e.target.value)}
                >
                  {cth_Dropdown.map((doc) => (
                    <MenuItem key={doc.document_code} value={doc.document_code}>
                      {doc.document_name}
                    </MenuItem>
                  ))}
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {selectedDocument === "other" && (
              <>
                <Grid
                  item
                  xs={12}
                  md={6}
                  style={{
                    position: "relative",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "16px",
                    backgroundColor: "#f9f9f9",
                  }}
                >
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    label="New Document Name"
                    value={newDocumentName}
                    onChange={(e) => setNewDocumentName(e.target.value)}
                    style={{ marginBottom: "16px" }} // Add margin to create a gap
                  />
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    label="New Document Code"
                    value={newDocumentCode}
                    onChange={(e) => setNewDocumentCode(e.target.value)}
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12} md={6}>
              <Button
                variant="contained"
                color="primary"
                style={{ marginTop: "25px" }}
                onClick={handleAddDocument}
              >
                Add Document
              </Button>
            </Grid>{" "}
          </>
        )}

        {/*  */}

        <Grid
          container
          style={{ marginTop: "20px", padding: "0 20px" }}
          spacing={2}
        >
          <Grid
            item
            xs={12}
            md={6}
            style={{
              position: "relative",
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "16px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <Typography variant="body1" style={{ fontWeight: 600 }}>
              All Documents
            </Typography>
            <FileUpload
              label="All Documents"
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
          </Grid>
          <Grid
            container
            item
            xs={12}
            md={6}
            // spacing={2} // Apply spacing only when the container prop is present
            style={{
              position: "relative",
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "16px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <Typography variant="body1" style={{ fontWeight: 600 }}>
              FTA Benefit
            </Typography>
            <Switch
              checked={!!fta_Benefit_date_time}
              onChange={() => {
                if (fta_Benefit_date_time) {
                  setFtaBenefitDateTime(null); // Disable the benefit
                } else {
                  const currentDateTime = new Date(
                    Date.now() - new Date().getTimezoneOffset() * 60000
                  )
                    .toISOString()
                    .slice(0, 16); // Adjusted to conform to the yyyy-MM-ddTHH:mm format
                  setFtaBenefitDateTime(currentDateTime); // Enable the benefit with the formatted date-time
                }
              }}
              color="primary"
            />
            <Typography variant="body2" style={{ marginTop: "8px" }}>
              {fta_Benefit_date_time
                ? `Benefit enabled on ${new Date(
                    fta_Benefit_date_time
                  ).toLocaleString("en-US", {
                    timeZone: "Asia/Kolkata",
                    hour12: true,
                  })}`
                : "Benefit not enabled"}
            </Typography>
          </Grid>
        </Grid>

        <Grid item xs={12} md={12} style={{ marginTop: "10px" }}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Container Details:
          </Typography>

          {/* Parent container with spacing */}
          <Grid container spacing={2} style={{ marginTop: "10px" }}>
            {container_nos.map((container, index) => (
              <Grid
                container
                item
                xs={12}
                alignItems="center"
                key={`container-${index}`}
                spacing={2} // Add spacing for child containers
                style={{ marginTop: "10px" }}
              >
                {/* Container Number */}
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    label="Container Number"
                    value={container.container_number}
                    onChange={(e) =>
                      handleContainerChange(
                        index,
                        "container_number",
                        e.target.value
                      )
                    }
                  />
                </Grid>

                {/* Container Size */}
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    label="Container Size"
                    value={container.size}
                    onChange={(e) =>
                      handleContainerChange(index, "size", e.target.value)
                    }
                  />
                </Grid>

                {/* Remove Container Button */}
                <Grid item xs={2}>
                  <IconButton
                    color="primary"
                    onClick={() => handleRemoveContainer(index)}
                    title="Remove Container"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
          </Grid>

          {/* Add Container Button */}
          <Grid container item xs={12} style={{ marginTop: "10px" }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddContainer}
            >
              Add Container
            </Button>
          </Grid>
        </Grid>

        {/* test01 */}
        <Grid item xs={12} md={6} style={{ marginTop: "10px" }}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Clearance Under:
          </Typography>
          <FormControl
            fullWidth
            size="small"
            variant="outlined"
            style={{ marginTop: "8px" }}
          >
            <Select
              value={clearanceValue}
              onChange={(e) => {
                if (canChangeClearance()) {
                  setClearanceValue(e.target.value);
                } else {
                  alert(
                    "Please clear Ex-Bond details before changing Clearance Under."
                  );
                }
              }}
              displayEmpty
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
            {/* Scheme Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth size="small" variant="outlined">
                <Select
                  value={scheme}
                  onChange={(e) => setScheme(e.target.value)}
                  displayEmpty
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
            </Grid>
          </FormControl>

          {clearanceValue === "Ex-Bond" && (
            <Grid container spacing={2} style={{ marginTop: "10px" }}>
              <FormControl fullWidth size="small" variant="outlined">
                <Select
                  value={exBondValue}
                  onChange={(e) => setExBondValue(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    Select In-Bond Type
                  </MenuItem>
                  {/* Static "Other" option at the top */}
                  <MenuItem value="other">Other</MenuItem>
                  {/* Dynamically generate MenuItem components */}
                  {jobDetails.map((job) => (
                    <MenuItem key={job.job_no} value={job.job_no}>
                      {`${job.job_no} - ${job.importer}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {exBondValue === "other" && (
            <Grid container spacing={2} style={{ marginTop: "10px" }}>
              {/* BE Number */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  label="InBond BE Number"
                  value={in_bond_be_no}
                  onChange={(e) => setBeNo(e.target.value)}
                />
              </Grid>

              {/* BE Date */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  label="InBond BE Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={in_bond_be_date}
                  onChange={(e) => setBeDate(e.target.value)}
                />
              </Grid>

              {/* File Upload for OOC Copies */}
              <Grid item xs={12}>
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
            </Grid>
          )}

          {/* Reset Button */}
          {clearanceValue === "Ex-Bond" && (
            <Grid item xs={12} style={{ marginTop: "10px" }}>
              <Button
                variant="contained"
                color="secondary"
                onClick={resetOtherDetails}
              >
                Reset Ex-Bond Details
              </Button>
            </Grid>
          )}
        </Grid>

        {/* test 02 */}
        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            style={{ marginTop: "20px" }}
            onClick={formik.handleSubmit}
          >
            Submit
          </Button>
        </Grid>
      </Grid>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDialogOpen}
        handleClose={() => setConfirmDialogOpen(false)}
        handleConfirm={handleDeleteDocument}
        message="Are you sure you want to delete this document?"
      />

      {/* Edit Document Dialog */}
      <ConfirmDialog
        open={editDialogOpen}
        handleClose={() => setEditDialogOpen(false)}
        handleConfirm={handleSaveEdit}
        isEdit
        editValues={editValues}
        onEditChange={setEditValues}
      />
    </div>
  );
};

export default ImportCreateJob;
