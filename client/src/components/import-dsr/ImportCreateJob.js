import React, { useState } from "react";
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
} from "../MasterLists/MasterLists";
import { useFormik } from "formik";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

const ImportCreateJob = () => {
  const [importer, setImporter] = useState("");
  const [customHouse, setCustomHouse] = useState("");
  const [shippingLine, setShippingLine] = useState("");
  const [branchSrNo, setBranchSrNo] = useState("");
  const [adCode, setAdCode] = useState("");
  const [exporterSupplier, setExporterSupplier] = useState("");
  const [blNumber, setBlNumber] = useState("");
  const [typeOf_BE, setTypeOf_BE] = useState("");
  const [loadingPort, setLoadingPort] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [blDate, setBlDate] = useState("");
  const [cth_no, setcth_no] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [portOfReporting, setPortOfReporting] = useState("");
  const [totalInvValue, setTotalInvValue] = useState("");
  const [invCurrency, setInvCurrency] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [description, setDescription] = useState("");
  const [fclOrLcl, setFclOrLcl] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addValues, setAddValues] = useState({
    document_name: "",
    document_code: "",
  });
  const [isDraftDoc, setIsDraftDoc] = useState(false);
  const [containers, setContainers] = useState([{ number: "", size: "" }]);

  const [cthDocuments, setCthDocuments] = useState([
    {
      document_name: "Commercial Invoice",
      document_code: "380000",
      url: [],
      isDefault: true,
    },
    {
      document_name: "Packing List",
      document_code: "271000",
      url: [],
      isDefault: true,
    },
    {
      document_name: "Bill of Lading",
      document_code: "704000",
      url: [],
      isDefault: true,
    },
  ]);

  const [selectedDocument, setSelectedDocument] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentCode, setNewDocumentCode] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [isBenefit, setIsBenefit] = useState(false);
  const [dateTime, setDateTime] = useState(null);
  const [clearanceValue, setClearanceValue] = useState("");
  const [exBondValue, setExBondValue] = useState("");
  const [otherDetails, setOtherDetails] = useState({
    beNumber: "",
    beDate: "",
    scheme: "",
    beCopy: null,
  });

  const schemeOptions = ["Full Duty", "DEEC", "EPCG", "RODTEP", "ROSTL"];
  const resetOtherDetails = () => {
    setOtherDetails({
      beNumber: "",
      beDate: "",
      scheme: "",
      beCopy: null,
    });
    setExBondValue("");
  };

  const canChangeClearance = () => {
    return (
      !exBondValue &&
      !otherDetails.beNumber &&
      !otherDetails.beDate &&
      !otherDetails.scheme &&
      !(otherDetails.beCopy && otherDetails.beCopy.length > 0)
    );
  };
  const formik = useFormik({
    initialValues: {
      all_documents: [], // Initialize the all_documents array
    },
    onSubmit: (values) => {
      console.log("Form submitted", values);
    },
  });
  // Handle Add Document
  const handleAddDocument = () => {
    if (selectedDocument === "other") {
      if (newDocumentName && newDocumentCode) {
        setCthDocuments((prevDocs) => [
          ...prevDocs,
          {
            document_name: newDocumentName,
            document_code: newDocumentCode,
            url: [],
            isDefault: false,
          },
        ]);
        setNewDocumentName("");
        setNewDocumentCode("");
      }
    } else {
      const selectedDoc = cth_Dropdown.find(
        (doc) => doc.document_code === selectedDocument
      );
      if (selectedDoc) {
        setCthDocuments((prevDocs) => [
          ...prevDocs,
          { ...selectedDoc, url: [], isDefault: false },
        ]);
      }
    }
    setSelectedDocument("");
  };

  const handleToggle = () => {
    const newValue = !isBenefit;
    setIsBenefit(newValue);

    if (newValue) {
      // Record the date and time when set to true
      setDateTime(new Date().toISOString());
    } else {
      // Reset the date and time when set to false
      setDateTime(null);
    }
  };
  // Handle Delete Document
  const handleDeleteDocument = () => {
    if (deleteIndex !== null) {
      setCthDocuments((prevDocs) =>
        prevDocs.filter((_, i) => i !== deleteIndex)
      );
      setDeleteIndex(null);
      setConfirmDialogOpen(false);
    }
  };

  // Open Delete Confirmation Dialog
  const confirmDeleteDocument = (index) => {
    setDeleteIndex(index);
    setConfirmDialogOpen(true);
  };

  // Handle Open Edit Dialog
  const handleOpenEditDialog = (index) => {
    setEditValues(cthDocuments[index]);
    setEditDialogOpen(true);
  };

  // Handle Save Edit
  const handleSaveEdit = () => {
    const updatedDocuments = [...cthDocuments];
    updatedDocuments[
      cthDocuments.findIndex(
        (doc) => doc.document_code === editValues.document_code
      )
    ] = editValues;
    setCthDocuments(updatedDocuments);
    setEditDialogOpen(false);
  };
  const handleAddContainer = () => {
    setContainers([...containers, { number: "", size: "" }]);
  };

  const handleRemoveContainer = (index) => {
    const updatedContainers = containers.filter((_, i) => i !== index);
    setContainers(updatedContainers);
  };

  const handleContainerChange = (index, field, value) => {
    const updatedContainers = [...containers];
    updatedContainers[index][field] = value;
    setContainers(updatedContainers);
  };
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setOtherDetails((prev) => ({ ...prev, beCopy: file }));
  };
  return (
    <div style={{ padding: "20px" }}>
      <Typography variant="h4" gutterBottom style={{ marginBottom: "20px" }}>
        Create Import Job
      </Typography>
      <Grid
        container
        spacing={3}
        style={{ maxWidth: "1100px", margin: "0 auto" }}
      >
        {/* Custom House Field */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Select Custom House:
          </Typography>
          <Autocomplete
            freeSolo
            options={customHouseOptions}
            value={customHouse}
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
            ListboxProps={{ style: { maxHeight: 200, overflow: "auto" } }}
          />
        </Grid>

        {/* Importer Name */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Importer Name:
          </Typography>
          <Autocomplete
            freeSolo
            options={importerOptions}
            value={importer}
            onInputChange={(event, newValue) => setImporter(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                size="small"
                helperText="Start typing to see suggestions"
                fullWidth
              />
            )}
            ListboxProps={{ style: { maxHeight: 200, overflow: "auto" } }}
          />
        </Grid>

        {/* Branch SR. NO. */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Branch SR. NO.:
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
            placeholder="Enter AD Code"
            fullWidth
          />
        </Grid>

        {/* Exporter/Supplier */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Supplier/Exporter
          </Typography>
          <TextField
            value={exporterSupplier}
            onChange={(e) => setExporterSupplier(e.target.value)}
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
            value={shippingLine}
            onInputChange={(event, newValue) => setShippingLine(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                size="small"
                helperText="Start typing to see suggestions"
                fullWidth
              />
            )}
            ListboxProps={{ style: { maxHeight: 200, overflow: "auto" } }}
          />
        </Grid>

        {/* BL Number */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            AWB/BL Number:
          </Typography>
          <TextField
            value={blNumber}
            onChange={(e) => setBlNumber(e.target.value)}
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
            value={blDate}
            onChange={(e) => setBlDate(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        {/* BL Number */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Type Of B/E:
          </Typography>
          <TextField
            value={typeOf_BE}
            onChange={(e) => setTypeOf_BE(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter Type Of B/E"
            fullWidth
          />
        </Grid>
        {/* BL Number */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Gross Weight:
          </Typography>
          <TextField
            value={grossWeight}
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
            value={loadingPort}
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
          <TextField
            value={originCountry}
            onChange={(e) => setOriginCountry(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter Origin Country"
            fullWidth
          />
        </Grid>
        {/* BL Number */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Port of Reporting:
          </Typography>
          <TextField
            value={portOfReporting}
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
            value={totalInvValue}
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
            value={invCurrency}
            onChange={(e) => setInvCurrency(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter Inv Currency"
            fullWidth
          />
        </Grid>
        {/* BL Number */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            CTH No:
          </Typography>
          <TextField
            value={cth_no}
            onChange={(e) => setcth_no(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter CTH No"
            fullWidth
          />
        </Grid>

        {/* Invoice Number */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Invoice Number:
          </Typography>
          <TextField
            value={invoiceNumber}
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
            value={invoiceDate}
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
            value={fclOrLcl}
            onChange={(e) => setFclOrLcl(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
          >
            <MenuItem value="FCL">FCL</MenuItem>
            <MenuItem value="LCL">LCL</MenuItem>
          </TextField>
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
        <Grid container style={{ marginTop: "20px", padding: "0 20px" }}>
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
              FTA benefit
            </Typography>
            <Switch
              checked={isBenefit}
              onChange={handleToggle}
              color="primary"
            />
            <Typography variant="body2" style={{ marginTop: "8px" }}>
              {isBenefit
                ? `Benefit enabled on ${new Date(dateTime).toLocaleString()}`
                : "Benefit not enabled"}
            </Typography>
          </Grid>
        </Grid>

        <Grid item xs={12} md={12} spacing={3} style={{ marginTop: "10px" }}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Container Details :
          </Typography>

          {containers.map((container, index) => (
            <Grid
              container
              item
              xs={12}
              spacing={2}
              key={`container-${index}`}
              alignItems="center"
              style={{ marginTop: "10px" }}
            >
              <Grid item xs={5}>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  label="Container Number"
                  value={container.number}
                  onChange={(e) =>
                    handleContainerChange(index, "number", e.target.value)
                  }
                />
              </Grid>
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

          <Grid item xs={12} style={{ marginTop: "10px" }}>
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
        <Grid item xs={12} md={6} spacing={3} style={{ marginTop: "10px" }}>
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
              <MenuItem value="001">Full Duty</MenuItem>
              <MenuItem value="1002">In-bond</MenuItem>
              <MenuItem value="2002">DEEC</MenuItem>
              <MenuItem value="2003">EPCG</MenuItem>
              <MenuItem value="RODTEP">RODTEP</MenuItem>
              <MenuItem value="ROSTL">ROSTL</MenuItem>
              <MenuItem value="exbond">Ex-Bond</MenuItem>
            </Select>
          </FormControl>

          {clearanceValue === "exbond" && (
            <Grid container spacing={2} style={{ marginTop: "10px" }}>
              <FormControl fullWidth size="small" variant="outlined">
                <Select
                  value={exBondValue}
                  onChange={(e) => setExBondValue(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    Select Ex-Bond Type
                  </MenuItem>
                  <MenuItem value="101">101</MenuItem>
                  <MenuItem value="102">102</MenuItem>
                  <MenuItem value="103">103</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}

          {exBondValue === "other" && (
            <Grid container spacing={2} style={{ marginTop: "10px" }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  label="BE Number"
                  value={otherDetails.beNumber}
                  onChange={(e) =>
                    setOtherDetails((prev) => ({
                      ...prev,
                      beNumber: e.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  label="BE Date"
                  type="date"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  value={otherDetails.beDate}
                  onChange={(e) =>
                    setOtherDetails((prev) => ({
                      ...prev,
                      beDate: e.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <FileUpload
                  label="Upload BE Copy"
                  bucketPath="be_copy_documents"
                  onFilesUploaded={(newFiles) => {
                    setOtherDetails((prev) => ({
                      ...prev,
                      beCopy: [...(prev.beCopy || []), ...newFiles],
                    }));
                  }}
                  multiple={true}
                />
                <ImagePreview
                  images={otherDetails.beCopy || []}
                  onDeleteImage={(index) => {
                    const updatedFiles = [...(otherDetails.beCopy || [])];
                    updatedFiles.splice(index, 1);
                    setOtherDetails((prev) => ({
                      ...prev,
                      beCopy: updatedFiles,
                    }));
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth size="small" variant="outlined">
                  <Select
                    value={otherDetails.scheme}
                    onChange={(e) =>
                      setOtherDetails((prev) => ({
                        ...prev,
                        scheme: e.target.value,
                      }))
                    }
                    displayEmpty
                  >
                    <MenuItem value="" disabled>
                      Select Scheme
                    </MenuItem>
                    {schemeOptions.map((scheme, index) => (
                      <MenuItem key={index} value={scheme}>
                        {scheme}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}

          {/* Reset Button */}
          {clearanceValue === "exbond" && (
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
      <Button
        variant="contained"
        color="primary"
        style={{ marginTop: "20px" }}
        onClick={formik.handleSubmit}
      >
        Submit
      </Button>
    </div>
  );
};

export default ImportCreateJob;
