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
import useImportJobForm from "../../customHooks/useImportJobForm.js";

const ImportCreateJob = () => {
  const {
    formik,
    job_no,
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
    setAwbBlDate,
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
    be_no,
    setBeNo,
    be_date,
    setBeDate,
    ooc_copies,
    setOocCopies,
    scheme,
    setScheme,
  } = useImportJobForm();

  const schemeOptions = ["Full Duty", "DEEC", "EPCG", "RODTEP", "ROSTL"];

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
        {/* Job Number */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Job Number:
          </Typography>
          <TextField
            value={job_no}
            onChange={(e) => setJobNo(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter Job Number"
            fullWidth
          />
        </Grid>

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

        {/* BL Number */}
        <Grid item xs={12} md={6}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Type Of B/E:
          </Typography>
          <TextField
            value={type_of_b_e}
            onChange={(e) => setTypeOfBE(e.target.value)}
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
          <TextField
            value={origin_country}
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
              FTA Benefit
            </Typography>
            <Switch
              checked={!!fta_Benefit_date_time}
              onChange={() => {
                if (fta_Benefit_date_time) {
                  setFtaBenefitDateTime(null); // Disable the benefit
                } else {
                  setFtaBenefitDateTime(new Date().toISOString()); // Enable the benefit
                }
              }}
              color="primary"
            />
            <Typography variant="body2" style={{ marginTop: "8px" }}>
              {fta_Benefit_date_time
                ? `Benefit enabled on ${new Date(
                    fta_Benefit_date_time
                  ).toLocaleString()}`
                : "Benefit not enabled"}
            </Typography>
          </Grid>
        </Grid>

        <Grid item xs={12} md={12} style={{ marginTop: "10px" }}>
          <Typography variant="body1" style={{ fontWeight: 600 }}>
            Container Details:
          </Typography>

          {container_nos.map((container, index) => (
            <Grid
              container
              item
              xs={12}
              spacing={2}
              key={`container-${index}`}
              alignItems="center"
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

          {/* Add Container Button */}
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
                    Select In-Bond Type
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
              {/* BE Number */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  label="BE Number"
                  value={be_no}
                  onChange={(e) => setBeNo(e.target.value)}
                />
              </Grid>

              {/* BE Date */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  label="BE Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={be_date}
                  onChange={(e) => setBeDate(e.target.value)}
                />
              </Grid>

              {/* File Upload for OOC Copies */}
              <Grid item xs={12}>
                <FileUpload
                  label="Upload BE Copy"
                  bucketPath="be_copy_documents"
                  onFilesUploaded={(newFiles) =>
                    setOocCopies([...ooc_copies, ...newFiles])
                  }
                  multiple={true}
                />
                <ImagePreview
                  images={ooc_copies || []}
                  onDeleteImage={(index) => {
                    const updatedFiles = [...ooc_copies];
                    updatedFiles.splice(index, 1);
                    setOocCopies(updatedFiles);
                  }}
                />
              </Grid>

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
