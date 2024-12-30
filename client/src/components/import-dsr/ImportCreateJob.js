import React, { useState } from "react";
import {
  Grid,
  Typography,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
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

const ImportCreateJob = () => {
  const [importer, setImporter] = useState("");
  const [customHouse, setCustomHouse] = useState("");
  const [shippingLine, setShippingLine] = useState("");
  const [branchSrNo, setBranchSrNo] = useState("");
  const [adCode, setAdCode] = useState("");
  const [exporterSupplier, setExporterSupplier] = useState("");
  const [blNumber, setBlNumber] = useState("");
  const [blDate, setBlDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [description, setDescription] = useState("");
  const [fclOrLcl, setFclOrLcl] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
const [addValues, setAddValues] = useState({ document_name: "", document_code: "" });


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
  const handleOpenAddDialog = () => {
    setAddValues({ document_name: "", document_code: "" }); // Reset inputs
    setAddDialogOpen(true);
  };
  const handleAddSave = () => {
    if (addValues.document_name && addValues.document_code) {
      setCthDocuments((prevDocs) => [
        ...prevDocs,
        { ...addValues, url: [], isDefault: false },
      ]);
    }
    setAddDialogOpen(false);
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
            Exporter/Supplier:
          </Typography>
          <TextField
            value={exporterSupplier}
            onChange={(e) => setExporterSupplier(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter Exporter/Supplier"
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
            BL Number:
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
            BL Date:
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
        {/* Add Document Section */}
        <Grid container spacing={2} style={{ marginTop: "20px" }}>
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
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  label="New Document Name"
                  value={newDocumentName}
                  onChange={(e) => setNewDocumentName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
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
          </Grid>
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
