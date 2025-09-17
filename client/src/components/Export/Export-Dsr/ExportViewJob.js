import React, { useState, useContext } from "react";
import { Row, Col } from "react-bootstrap";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  IconButton,
  TextField,
  Typography,
  MenuItem,
  Button,
  Box,
  Checkbox,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Tabs,
  Tab,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { UserContext } from "../../../contexts/UserContext";
import QueriesComponent from "../../../utils/QueriesComponent.js";
import ImagePreview from "../../../components/gallery/ImagePreview.js";
import FileUpload from "../../../components/gallery/FileUpload.js";
import useExportJobDetails from "../../../customHooks/useExportJobDetails.js"; // Import the custom hook

// Tab Panel Component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`export-tabpanel-${index}`}
      aria-labelledby={`export-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

// Tab accessibility props
function a11yProps(index) {
  return {
    id: `export-tab-${index}`,
    'aria-controls': `export-tabpanel-${index}`,
  };
}

// Static Data Component for Export
const ExportJobStaticData = ({ data, params }) => {
  const handleCopyText = (text, setSnackbar) => {
    navigator.clipboard.writeText(text);
    setSnackbar(true);
    setTimeout(() => setSnackbar(false), 2000);
  };

  const [snackbar, setSnackbar] = useState(false);

  if (!data) return <div>Loading...</div>;

  return (
    <>
      <div className="job-details-container">
        <Row>
          <Col xs={12} lg={3}>
            <div className="job-detail-input-container">
              <strong>Job No: </strong>
              <span 
                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => handleCopyText(`${data.year}/${data.job_no}`, setSnackbar)}
              >
                {data.year}/{data.job_no}
              </span>
              <IconButton size="small">
                <ContentCopyIcon />
              </IconButton>
            </div>
          </Col>
          
          <Col xs={12} lg={3}>
            <div className="job-detail-input-container">
              <strong>Job Date: </strong>
              {data.job_date ? new Date(data.job_date).toLocaleDateString() : 'N/A'}
            </div>
          </Col>

          <Col xs={12} lg={3}>
            <div className="job-detail-input-container">
              <strong>Exporter: </strong>
              {data.exporter_name || 'N/A'}
            </div>
          </Col>

          <Col xs={12} lg={3}>
            <div className="job-detail-input-container">
              <strong>IE Code: </strong>
              {data.ie_code || 'N/A'}
            </div>
          </Col>
        </Row>

        <Row style={{ marginTop: "10px" }}>
          <Col xs={12} lg={3}>
            <div className="job-detail-input-container">
              <strong>Consignee: </strong>
              {data.consignee_name || 'N/A'}
            </div>
          </Col>

          <Col xs={12} lg={3}>
            <div className="job-detail-input-container">
              <strong>Country: </strong>
              {data.consignee_country || data.country_of_final_destination || 'N/A'}
            </div>
          </Col>

          <Col xs={12} lg={3}>
            <div className="job-detail-input-container">
              <strong>Port of Loading: </strong>
              {data.port_of_loading || 'N/A'}
            </div>
          </Col>

          <Col xs={12} lg={3}>
            <div className="job-detail-input-container">
              <strong>Port of Discharge: </strong>
              {data.port_of_discharge || 'N/A'}
            </div>
          </Col>
        </Row>
      </div>
      
      <Snackbar
        open={snackbar}
        message="Copied to clipboard"
        sx={{ left: "auto !important", right: "24px !important" }}
      />
    </>
  );
};

// Queries Section Component
const QueriesSection = ({ data, handleQueriesChange, user }) => (
  <QueriesComponent
    queries={data?.export_queries || []}
    currentModule="Export DSR"
    onQueriesChange={handleQueriesChange}
    title="Export Queries"
    showResolveButton={true}
    readOnlyReply={false}
    userName={user?.username}
  />
);

// Status Section Component
const StatusSection = ({ formik, user }) => (
  <div>
    <Row style={{ marginTop: "10px" }}>
      <Col xs={12} lg={3}>
        <div className="job-detail-input-container">
          <strong>Documentation Completed: </strong>
          {formik.values.documentation_completion_date ? (
            <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
              {new Date(formik.values.documentation_completion_date).toLocaleString("en-US", {
                timeZone: "Asia/Kolkata",
                hour12: true,
              })}
            </span>
          ) : (
            <span style={{ marginLeft: "10px" }}>Pending</span>
          )}
        </div>
      </Col>

      {user?.role === "Admin" && (
        <Col xs={12} md={3}>
          <TextField
            type="datetime-local"
            fullWidth
            size="small"
            margin="normal"
            variant="outlined"
            label="Set Documentation Date (Admin Only)"
            value={formik.values.documentation_completion_date || ""}
            onChange={(e) => 
              formik.setFieldValue("documentation_completion_date", e.target.value)
            }
            InputLabelProps={{ shrink: true }}
          />
        </Col>
      )}

      <Col xs={12} lg={3}>
        <div className="job-detail-input-container">
          <strong>Customs Clearance Completed: </strong>
          {formik.values.customs_clearance_date ? (
            <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
              {new Date(formik.values.customs_clearance_date).toLocaleString("en-US", {
                timeZone: "Asia/Kolkata",
                hour12: true,
              })}
            </span>
          ) : (
            <span style={{ marginLeft: "10px" }}>Pending</span>
          )}
        </div>
      </Col>

      {user?.role === "Admin" && (
        <Col xs={12} md={3}>
          <TextField
            type="datetime-local"
            fullWidth
            size="small"
            margin="normal"
            variant="outlined"
            label="Set Customs Date (Admin Only)"
            value={formik.values.customs_clearance_date || ""}
            onChange={(e) => 
              formik.setFieldValue("customs_clearance_date", e.target.value)
            }
            InputLabelProps={{ shrink: true }}
          />
        </Col>
      )}
    </Row>

    <Row style={{ marginTop: "10px" }}>
      <Col xs={12} lg={3}>
        <div className="job-detail-input-container">
          <strong>Loading Completed: </strong>
          {formik.values.loading_completion_date ? (
            <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
              {new Date(formik.values.loading_completion_date).toLocaleString("en-US", {
                timeZone: "Asia/Kolkata",
                hour12: true,
              })}
            </span>
          ) : (
            <span style={{ marginLeft: "10px" }}>Pending</span>
          )}
        </div>
      </Col>

      {user?.role === "Admin" && (
        <Col xs={12} md={3}>
          <TextField
            type="datetime-local"
            fullWidth
            size="small"
            margin="normal"
            variant="outlined"
            label="Set Loading Date (Admin Only)"
            value={formik.values.loading_completion_date || ""}
            onChange={(e) => 
              formik.setFieldValue("loading_completion_date", e.target.value)
            }
            InputLabelProps={{ shrink: true }}
          />
        </Col>
      )}

      <Col xs={12} lg={3}>
        <div className="job-detail-input-container">
          <strong>Vessel Departure: </strong>
          {formik.values.vessel_departure_date ? (
            <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
              {new Date(formik.values.vessel_departure_date).toLocaleString("en-US", {
                timeZone: "Asia/Kolkata",
                hour12: true,
              })}
            </span>
          ) : (
            <span style={{ marginLeft: "10px" }}>Pending</span>
          )}
        </div>
      </Col>

      {user?.role === "Admin" && (
        <Col xs={12} md={3}>
          <TextField
            type="datetime-local"
            fullWidth
            size="small"
            margin="normal"
            variant="outlined"
            label="Set Departure Date (Admin Only)"
            value={formik.values.vessel_departure_date || ""}
            onChange={(e) => 
              formik.setFieldValue("vessel_departure_date", e.target.value)
            }
            InputLabelProps={{ shrink: true }}
          />
        </Col>
      )}
    </Row>

    <Row style={{ marginTop: "10px" }}>
      <Col xs={12} lg={2}>
        <div className="job-detail-input-container">
          <strong>Status: </strong>
          <TextField
            fullWidth
            select
            size="small"
            margin="normal"
            variant="outlined"
            value={formik.values.status || ""}
            onChange={(e) => formik.setFieldValue("status", e.target.value)}
          >
            <MenuItem value="Planning">Planning</MenuItem>
            <MenuItem value="Documentation">Documentation</MenuItem>
            <MenuItem value="Ready to Ship">Ready to Ship</MenuItem>
            <MenuItem value="Shipped">Shipped</MenuItem>
            <MenuItem value="Delivered">Delivered</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
          </TextField>
        </div>
      </Col>

      <Col xs={12} lg={4}>
        <div className="job-detail-input-container">
          <strong>Detailed Status: </strong>
          <TextField
            select
            fullWidth
            size="small"
            margin="normal"
            variant="outlined"
            value={formik.values.detailed_status || ""}
            onChange={(e) => formik.setFieldValue("detailed_status", e.target.value)}
          >
            <MenuItem value="Planning Stage">Planning Stage</MenuItem>
            <MenuItem value="Booking Confirmed">Booking Confirmed</MenuItem>
            <MenuItem value="Documentation in Progress">Documentation in Progress</MenuItem>
            <MenuItem value="Documentation Completed">Documentation Completed</MenuItem>
            <MenuItem value="Customs Processing">Customs Processing</MenuItem>
            <MenuItem value="Customs Cleared">Customs Cleared</MenuItem>
            <MenuItem value="Cargo at Port">Cargo at Port</MenuItem>
            <MenuItem value="Loading in Progress">Loading in Progress</MenuItem>
            <MenuItem value="Loading Completed">Loading Completed</MenuItem>
            <MenuItem value="Shipped">Shipped</MenuItem>
            <MenuItem value="In Transit">In Transit</MenuItem>
            <MenuItem value="Arrived at Destination">Arrived at Destination</MenuItem>
            <MenuItem value="Delivered">Delivered</MenuItem>
          </TextField>
        </div>
      </Col>
    </Row>
  </div>
);

// Tracking Section Component
const TrackingSection = ({ formik }) => (
  <div>
    <Row style={{ marginTop: "20px" }}>
      <Col xs={12} lg={4}>
        <div className="job-detail-input-container">
          <strong>Booking Confirmation Date: </strong>
          <TextField
            fullWidth
            size="small"
            margin="normal"
            variant="outlined"
            type="datetime-local"
            value={formik.values.booking_confirmation_date || ""}
            onChange={(e) => formik.setFieldValue("booking_confirmation_date", e.target.value)}
          />
        </div>
      </Col>

      <Col xs={12} lg={4}>
        <div className="job-detail-input-container">
          <strong>Booking Number: </strong>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            value={formik.values.booking_number || ""}
            onChange={(e) => formik.setFieldValue("booking_number", e.target.value)}
            style={{ marginTop: "10px" }}
          />
        </div>
      </Col>

      <Col xs={12} lg={4}>
        <div className="job-detail-input-container">
          <strong>Vessel/Flight Name: </strong>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            value={formik.values.vessel_flight_name || ""}
            onChange={(e) => formik.setFieldValue("vessel_flight_name", e.target.value)}
            style={{ marginTop: "10px" }}
          />
        </div>
      </Col>
    </Row>

    <Row style={{ marginTop: "20px" }}>
      <Col xs={12} lg={4}>
        <div className="job-detail-input-container">
          <strong>Shipping Bill Number: </strong>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            value={formik.values.shipping_bill_number || ""}
            onChange={(e) => formik.setFieldValue("shipping_bill_number", e.target.value)}
            style={{ marginTop: "10px" }}
          />
        </div>
      </Col>

      <Col xs={12} lg={4}>
        <div className="job-detail-input-container">
          <strong>Shipping Bill Date: </strong>
          <TextField
            fullWidth
            size="small"
            margin="normal"
            variant="outlined"
            type="date"
            value={formik.values.shipping_bill_date || ""}
            onChange={(e) => formik.setFieldValue("shipping_bill_date", e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </div>
      </Col>

      <Col xs={12} lg={4}>
        <div className="job-detail-input-container">
          <strong>LEO Number: </strong>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            value={formik.values.leo_number || ""}
            onChange={(e) => formik.setFieldValue("leo_number", e.target.value)}
            style={{ marginTop: "10px" }}
          />
        </div>
      </Col>
    </Row>

    <Row style={{ marginTop: "20px" }}>
      <Col xs={12} lg={4}>
        <div className="job-detail-input-container">
          <strong>Gate Pass Date: </strong>
          <TextField
            fullWidth
            size="small"
            margin="normal"
            variant="outlined"
            type="datetime-local"
            value={formik.values.gate_pass_date || ""}
            onChange={(e) => formik.setFieldValue("gate_pass_date", e.target.value)}
          />
        </div>
      </Col>

      <Col xs={12} lg={4}>
        <div className="job-detail-input-container">
          <strong>Stuffing Date: </strong>
          <TextField
            fullWidth
            size="small"
            margin="normal"
            variant="outlined"
            type="datetime-local"
            value={formik.values.stuffing_date || ""}
            onChange={(e) => formik.setFieldValue("stuffing_date", e.target.value)}
          />
        </div>
      </Col>

      <Col xs={12} lg={4}>
        <div className="job-detail-input-container">
          <strong>Port Gate In Date: </strong>
          <TextField
            fullWidth
            size="small"
            margin="normal"
            variant="outlined"
            type="datetime-local"
            value={formik.values.port_terminal_arrival_date || ""}
            onChange={(e) => formik.setFieldValue("port_terminal_arrival_date", e.target.value)}
          />
        </div>
      </Col>
    </Row>
  </div>
);

// Export Terms Section Component
const ExportTermsSection = ({ formik }) => (
  <div>
    <Row style={{ marginTop: "20px" }}>
      <Col xs={12} lg={4}>
        <div className="job-detail-input-container">
          <strong>Job Type: </strong>
          <TextField
            select
            fullWidth
            size="small"
            margin="normal"
            variant="outlined"
            value={formik.values.job_type || "sea_export"}
            onChange={(e) => formik.setFieldValue("job_type", e.target.value)}
          >
            <MenuItem value="sea_export">Sea Export</MenuItem>
            <MenuItem value="air_export">Air Export</MenuItem>
            <MenuItem value="land_export">Land Export</MenuItem>
            <MenuItem value="courier_export">Courier Export</MenuItem>
          </TextField>
        </div>
      </Col>

      <Col xs={12} lg={4}>
        <div className="job-detail-input-container">
          <strong>Priority: </strong>
          <RadioGroup
            row
            name="priority_level"
            value={formik.values.priority_level || "Normal"}
            onChange={formik.handleChange}
            sx={{ alignItems: "center" }}
          >
            <FormControlLabel
              value="Normal"
              control={<Radio size="small" />}
              label="Normal"
              sx={{ color: "green", "& .MuiSvgIcon-root": { color: "green" } }}
            />
            <FormControlLabel
              value="High"
              control={<Radio size="small" />}
              label="High"
              sx={{ color: "orange", "& .MuiSvgIcon-root": { color: "orange" } }}
            />
            <FormControlLabel
              value="Urgent"
              control={<Radio size="small" />}
              label="Urgent"
              sx={{ color: "red", "& .MuiSvgIcon-root": { color: "red" } }}
            />
          </RadioGroup>
        </div>
      </Col>

      <Col xs={12} lg={4}>
        <div className="job-detail-input-container">
          <strong>Incoterms: </strong>
          <TextField
            select
            fullWidth
            size="small"
            margin="normal"
            variant="outlined"
            value={formik.values.incoterms || ""}
            onChange={(e) => formik.setFieldValue("incoterms", e.target.value)}
          >
            <MenuItem value="FOB">FOB - Free on Board</MenuItem>
            <MenuItem value="CIF">CIF - Cost, Insurance and Freight</MenuItem>
            <MenuItem value="CFR">CFR - Cost and Freight</MenuItem>
            <MenuItem value="EXW">EXW - Ex Works</MenuItem>
            <MenuItem value="DDP">DDP - Delivered Duty Paid</MenuItem>
            <MenuItem value="DDU">DDU - Delivered Duty Unpaid</MenuItem>
            <MenuItem value="FCA">FCA - Free Carrier</MenuItem>
            <MenuItem value="CPT">CPT - Carriage Paid To</MenuItem>
            <MenuItem value="CIP">CIP - Carriage and Insurance Paid To</MenuItem>
          </TextField>
        </div>
      </Col>
    </Row>

    <Row style={{ marginTop: "20px" }}>
      <Col xs={12} lg={4}>
        <div className="job-detail-input-container">
          <strong>Invoice Number: </strong>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            value={formik.values.commercial_invoice_number || ""}
            onChange={(e) => formik.setFieldValue("commercial_invoice_number", e.target.value)}
            style={{ marginTop: "10px" }}
          />
        </div>
      </Col>

      <Col xs={12} lg={4}>
        <div className="job-detail-input-container">
          <strong>Invoice Date: </strong>
          <TextField
            fullWidth
            size="small"
            margin="normal"
            variant="outlined"
            type="date"
            value={formik.values.commercial_invoice_date || ""}
            onChange={(e) => formik.setFieldValue("commercial_invoice_date", e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </div>
      </Col>

      <Col xs={12} lg={4}>
        <div className="job-detail-input-container">
          <strong>Invoice Value: </strong>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            type="number"
            value={formik.values.commercial_invoice_value || ""}
            onChange={(e) => formik.setFieldValue("commercial_invoice_value", e.target.value)}
            style={{ marginTop: "10px" }}
          />
        </div>
      </Col>
    </Row>

    <Row style={{ marginTop: "20px" }}>
      <Col xs={12}>
        <div className="job-detail-input-container">
          <strong>Remarks: </strong>
          <TextField
            multiline
            fullWidth
            size="small"
            margin="normal"
            variant="outlined"
            value={formik.values.remarks || ""}
            onChange={(e) => formik.setFieldValue("remarks", e.target.value)}
          />
        </div>
      </Col>
    </Row>
  </div>
);

// Documents Section Component
const DocumentsSection = ({ 
  exportDocuments, 
  setExportDocuments, 
  exportDocDropdown,
  selectedDocument,
  setSelectedDocument,
  newDocumentName,
  setNewDocumentName,
  newDocumentCode,
  setNewDocumentCode
}) => (
  <div>
    {/* Export Documents Section */}
    <Row>
      {exportDocuments?.map((doc, index) => (
        <Col
          xs={12}
          md={6}
          lg={4}
          key={`export-doc-${index}`}
          style={{ marginBottom: "30px", position: "relative" }}
        >
          <div className="document-card" style={{ 
            border: "1px solid #e0e0e0", 
            borderRadius: "8px", 
            padding: "15px",
            backgroundColor: "#fafafa"
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginBottom: "15px",
              borderBottom: "1px solid #e0e0e0",
              paddingBottom: "10px"
            }}>
              <h6 style={{ 
                margin: 0, 
                fontWeight: "600",
                color: "#333"
              }}>
                {doc.document_name} ({doc.document_code})
              </h6>
              
              <DeleteIcon
                style={{ 
                  cursor: "pointer", 
                  color: "#dc3545",
                  fontSize: "18px"
                }}
                onClick={() => {
                  if (window.confirm(`Remove "${doc.document_name}" from the list?`)) {
                    const updatedDocuments = exportDocuments.filter((_, i) => i !== index);
                    setExportDocuments(updatedDocuments);
                  }
                }}
                title="Remove document from list"
              />
            </div>

            <Row style={{ marginBottom: "15px" }}>
              <Col xs={12} md={6} style={{ marginBottom: "10px" }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Document Number"
                  value={doc.document_number || ""}
                  onChange={(e) => {
                    const updatedDocs = [...exportDocuments];
                    updatedDocs[index].document_number = e.target.value;
                    setExportDocuments(updatedDocs);
                  }}
                />
              </Col>
              
              <Col xs={12} md={6} style={{ marginBottom: "10px" }}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Issue Date"
                  value={doc.issue_date || ""}
                  onChange={(e) => {
                    const updatedDocs = [...exportDocuments];
                    updatedDocs[index].issue_date = e.target.value;
                    setExportDocuments(updatedDocs);
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Col>
            </Row>

            <Row style={{ marginBottom: "15px" }}>
              <Col xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={doc.is_verified || false}
                      onChange={(e) => {
                        const updatedDocs = [...exportDocuments];
                        updatedDocs[index].is_verified = e.target.checked;
                        if (e.target.checked) {
                          updatedDocs[index].verification_date = new Date().toISOString().slice(0, 16);
                        }
                        setExportDocuments(updatedDocs);
                      }}
                      color="primary"
                      size="small"
                    />
                  }
                  label={<span style={{ fontSize: "14px", color: "#555" }}>Verified</span>}
                />
              </Col>
            </Row>

            <div style={{ marginBottom: "15px" }}>
              <FileUpload
                label="Upload Documents"
                bucketPath={`export-documents/${doc.document_name}`}
                onFilesUploaded={(urls) => {
                  const updatedDocs = [...exportDocuments];
                  updatedDocs[index].url = [
                    ...(updatedDocs[index].url || []),
                    ...urls,
                  ];
                  setExportDocuments(updatedDocs);
                }}
                multiple={true}
              />
            </div>

            <ImagePreview
              images={doc.url || []}
              onDeleteImage={(deleteIndex) => {
                const updatedDocs = [...exportDocuments];
                updatedDocs[index].url = updatedDocs[index].url.filter(
                  (_, i) => i !== deleteIndex
                );
                setExportDocuments(updatedDocs);
              }}
              readOnly={false}
            />
          </div>
        </Col>
      ))}
    </Row>

    {/* Add Document Section */}
    <div style={{ 
      backgroundColor: "#f8f9fa", 
      border: "2px dashed #dee2e6", 
      borderRadius: "8px", 
      padding: "20px", 
      marginTop: "20px" 
    }}>
      <h6 style={{ 
        marginBottom: "15px", 
        color: "#6c757d",
        fontWeight: "500"
      }}>
        Add New Export Document
      </h6>
      
      <Row>
        <Col xs={12} lg={4}>
          <FormControl fullWidth size="small" margin="normal" variant="outlined">
            <InputLabel>Select Document</InputLabel>
            <Select
              value={selectedDocument}
              onChange={(e) => {
                const selectedValue = e.target.value;
                if (selectedValue === "other") {
                  setNewDocumentName("");
                  setNewDocumentCode("");
                }
                setSelectedDocument(selectedValue);
              }}
              label="Select Document"
            >
              {exportDocDropdown
                .filter(doc => 
                  !exportDocuments.some(
                    existingDoc => existingDoc.document_code === doc.document_code
                  )
                )
                .map((doc) => (
                  <MenuItem key={doc.document_code} value={doc.document_code}>
                    {doc.document_name}
                  </MenuItem>
                ))
              }
              <MenuItem value="other">
                <em>Other (Custom Document)</em>
              </MenuItem>
            </Select>
          </FormControl>
        </Col>

        {selectedDocument === "other" && (
          <>
            <Col xs={12} lg={3}>
              <TextField
                fullWidth
                size="small"
                margin="normal"
                variant="outlined"
                label="Document Name"
                value={newDocumentName}
                onChange={(e) => setNewDocumentName(e.target.value)}
                required
              />
            </Col>
            <Col xs={12} lg={3}>
              <TextField
                fullWidth
                size="small"
                margin="normal"
                variant="outlined"
                label="Document Code"
                value={newDocumentCode}
                onChange={(e) => setNewDocumentCode(e.target.value)}
                required
              />
            </Col>
          </>
        )}

        <Col xs={12} lg={2} style={{ display: "flex", alignItems: "center" }}>
          <Button
            variant="outlined"
            onClick={() => {
              if (selectedDocument !== "other" && selectedDocument) {
                const selectedDoc = exportDocDropdown.find(
                  (doc) => doc.document_code === selectedDocument
                );
                setExportDocuments([
                  ...exportDocuments,
                  {
                    document_name: selectedDoc.document_name,
                    document_code: selectedDoc.document_code,
                    url: [],
                    document_number: "",
                    issue_date: "",
                    is_verified: false,
                  },
                ]);
              } else if (
                selectedDocument === "other" &&
                newDocumentName.trim() &&
                newDocumentCode.trim()
              ) {
                setExportDocuments([
                  ...exportDocuments,
                  {
                    document_name: newDocumentName.trim(),
                    document_code: newDocumentCode.trim(),
                    url: [],
                    document_number: "",
                    issue_date: "",
                    is_verified: false,
                  },
                ]);
                setNewDocumentName("");
                setNewDocumentCode("");
              }
              setSelectedDocument("");
            }}
            disabled={
              !selectedDocument || 
              (selectedDocument === "other" && 
                (!newDocumentName.trim() || !newDocumentCode.trim())
              )
            }
            sx={{ mt: 1 }}
          >
            Add Document
          </Button>
        </Col>
      </Row>
    </div>
  </div>
);

// Charges Section Component
const ChargesSection = ({ exportCharges, setExportCharges }) => {
  const [newChargesDocumentName, setNewChargesDocumentName] = useState("");

  return (
    <div>
      <Row>
        {exportCharges?.map((charge, index) => (
          <Col xs={12} lg={4} key={`charge-${index}`} style={{ marginBottom: "20px" }}>
            <div style={{ 
              border: "1px solid #e0e0e0", 
              borderRadius: "8px", 
              padding: "15px",
              backgroundColor: "#fafafa",
              position: "relative"
            }}>
              {/* Delete button for custom charges */}
              {![
                "Ocean Freight",
                "Documentation", 
                "Customs Clearance",
                "Origin Handling",
                "Terminal Handling"
              ].includes(charge.charge_type) && (
                <DeleteIcon
                  style={{ 
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    cursor: "pointer", 
                    color: "#dc3545",
                    fontSize: "18px"
                  }}
                  onClick={() => {
                    if (window.confirm(`Remove "${charge.charge_type}" charge?`)) {
                      const updatedCharges = exportCharges.filter((_, i) => i !== index);
                      setExportCharges(updatedCharges);
                    }
                  }}
                  title="Remove charge"
                />
              )}

              <h6 style={{ marginBottom: "15px", fontWeight: "600" }}>
                {charge.charge_type}
              </h6>
              
              <TextField
                fullWidth
                size="small"
                label="Amount"
                type="number"
                value={charge.amount || ""}
                onChange={(e) => {
                  const updatedCharges = [...exportCharges];
                  updatedCharges[index].amount = e.target.value;
                  setExportCharges(updatedCharges);
                }}
                style={{ marginBottom: "10px" }}
              />
              
              <TextField
                fullWidth
                size="small"
                label="Currency"
                value={charge.currency || "USD"}
                onChange={(e) => {
                  const updatedCharges = [...exportCharges];
                  updatedCharges[index].currency = e.target.value;
                  setExportCharges(updatedCharges);
                }}
                style={{ marginBottom: "10px" }}
              />
              
              <FileUpload
                label="Upload Invoice"
                bucketPath={`export-charges/${charge.charge_type}`}
                onFilesUploaded={(urls) => {
                  const updatedCharges = [...exportCharges];
                  updatedCharges[index].document_urls = [
                    ...(updatedCharges[index].document_urls || []),
                    ...urls,
                  ];
                  setExportCharges(updatedCharges);
                }}
                multiple={true}
              />
              
              <ImagePreview
                images={charge.document_urls || []}
                onDeleteImage={(deleteIndex) => {
                  const updatedCharges = [...exportCharges];
                  updatedCharges[index].document_urls = 
                    updatedCharges[index].document_urls.filter((_, i) => i !== deleteIndex);
                  setExportCharges(updatedCharges);
                }}
                readOnly={false}
              />
            </div>
          </Col>
        ))}
      </Row>

      {/* Add Custom Charge Section */}
      <Row style={{ marginTop: "20px", marginBottom: "20px" }}>
        <Col xs={12} lg={4}>
          <TextField
            fullWidth
            size="small"
            margin="normal"
            variant="outlined"
            label="Custom Charge Type Name"
            value={newChargesDocumentName}
            onChange={(e) => setNewChargesDocumentName(e.target.value)}
          />
        </Col>

        <Col xs={12} lg={2} style={{ display: "flex", alignItems: "center" }}>
          <Button
            variant="outlined"
            onClick={() => {
              if (
                newChargesDocumentName.trim() &&
                !exportCharges.some(
                  (charge) => charge.charge_type === newChargesDocumentName.trim()
                )
              ) {
                setExportCharges([
                  ...exportCharges,
                  {
                    charge_type: newChargesDocumentName.trim(),
                    amount: "",
                    currency: "USD",
                    document_urls: []
                  },
                ]);
                setNewChargesDocumentName("");
              }
            }}
            disabled={
              !newChargesDocumentName.trim() ||
              exportCharges.some(
                (charge) => charge.charge_type === newChargesDocumentName.trim()
              )
            }
            sx={{ mt: 1 }}
          >
            Add Custom Charge
          </Button>
        </Col>
      </Row>
    </div>
  );
};


// Containers Section Component
const ContainersSection = ({ formik, handleAddContainer, handleDeleteContainer, setOpenDialog, setContainerToDelete }) => {
  // Ensure there's always at least one container to display
  const containers = formik.values.containers && formik.values.containers.length > 0 
    ? formik.values.containers 
    : [{
        container_number: "",
        container_size: "20",
        seal_number: "",
        stuffing_date: "",
        gross_weight: "",
        net_weight: "",
        gate_in_date: "",
        loading_date: "",
        container_images: [],
        stuffing_images: []
      }];

  return (
    <div>
      {containers.map((container, index) => (
        <div key={`container-${index}`}>
          <div style={{ padding: "30px" }}>
            <Row>
              <Col xs={12} md={4} lg={3} className="mb-2">
                <h6 style={{ marginBottom: 0 }}>
                  <strong>
                    {index + 1}. Container Number: 
                    <TextField
                      fullWidth
                      size="small"
                      value={container.container_number || ""}
                      variant="outlined"
                      onChange={(e) => {
                        // Ensure containers array exists in formik
                        if (!formik.values.containers || formik.values.containers.length === 0) {
                          formik.setFieldValue("containers", [containers[0]]);
                        }
                        formik.setFieldValue(`containers[${index}].container_number`, e.target.value);
                      }}
                    />
                  </strong>
                </h6>
              </Col>

              <Col xs={12} md={4} lg={3} className="mb-2">
                <strong>Size: </strong>
                <TextField
                  select
                  fullWidth
                  size="small"
                  variant="outlined"
                  value={container.container_size || "20"}
                  onChange={(e) => {
                    if (!formik.values.containers || formik.values.containers.length === 0) {
                      formik.setFieldValue("containers", [containers[0]]);
                    }
                    formik.setFieldValue(`containers[${index}].container_size`, e.target.value);
                  }}
                >
                  <MenuItem value="20">20ft</MenuItem>
                  <MenuItem value="40">40ft</MenuItem>
                  <MenuItem value="40HC">40ft HC</MenuItem>
                </TextField>
              </Col>

              <Col xs={12} md={4} lg={3} className="mb-2">
                <div className="job-detail-input-container">
                  <strong>Seal Number: </strong>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={container.seal_number || ""}
                    onChange={(e) => {
                      if (!formik.values.containers || formik.values.containers.length === 0) {
                        formik.setFieldValue("containers", [containers[0]]);
                      }
                      formik.setFieldValue(`containers[${index}].seal_number`, e.target.value);
                    }}
                  />
                </div>
              </Col>

              <Col xs={12} md={4} lg={3} className="mb-2">
                <div className="job-detail-input-container">
                  <strong>Stuffing Date: </strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="datetime-local"
                    value={container.stuffing_date || ""}
                    onChange={(e) => {
                      if (!formik.values.containers || formik.values.containers.length === 0) {
                        formik.setFieldValue("containers", [containers[0]]);
                      }
                      formik.setFieldValue(`containers[${index}].stuffing_date`, e.target.value);
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </div>
              </Col>
            </Row>

            <Row>
              <Col xs={12} lg={3}>
                <div className="job-detail-input-container">
                  <strong>Gross Weight (KG): </strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="number"
                    value={container.gross_weight || ""}
                    onChange={(e) => {
                      if (!formik.values.containers || formik.values.containers.length === 0) {
                        formik.setFieldValue("containers", [containers[0]]);
                      }
                      formik.setFieldValue(`containers[${index}].gross_weight`, e.target.value);
                    }}
                  />
                </div>
              </Col>
              
              <Col xs={12} lg={3}>
                <div className="job-detail-input-container">
                  <strong>Net Weight (KG): </strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="number"
                    value={container.net_weight || ""}
                    onChange={(e) => {
                      if (!formik.values.containers || formik.values.containers.length === 0) {
                        formik.setFieldValue("containers", [containers[0]]);
                      }
                      formik.setFieldValue(`containers[${index}].net_weight`, e.target.value);
                    }}
                  />
                </div>
              </Col>

              <Col xs={12} lg={3}>
                <div className="job-detail-input-container">
                  <strong>Gate In Date: </strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="datetime-local"
                    value={container.gate_in_date || ""}
                    onChange={(e) => {
                      if (!formik.values.containers || formik.values.containers.length === 0) {
                        formik.setFieldValue("containers", [containers[0]]);
                      }
                      formik.setFieldValue(`containers[${index}].gate_in_date`, e.target.value);
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </div>
              </Col>

              <Col xs={12} lg={3}>
                <div className="job-detail-input-container">
                  <strong>Loading Date: </strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="datetime-local"
                    value={container.loading_date || ""}
                    onChange={(e) => {
                      if (!formik.values.containers || formik.values.containers.length === 0) {
                        formik.setFieldValue("containers", [containers[0]]);
                      }
                      formik.setFieldValue(`containers[${index}].loading_date`, e.target.value);
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </div>
              </Col>
            </Row>

            <Row>
              <Col xs={12} md={6}>
                <div className="mb-3">
                  <strong>Container Images: </strong>
                  <ImagePreview
                    images={container?.container_images || []}
                    readOnly
                  />
                </div>
              </Col>

              <Col xs={12} md={6}>
                <div className="mb-3">
                  <strong>Stuffing Images: </strong>
                  <ImagePreview
                    images={container?.stuffing_images || []}
                    readOnly
                />
                </div>
              </Col>
            </Row>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Button 
              variant="outlined" 
              onClick={() => {
                // Ensure containers array is initialized before adding
                if (!formik.values.containers || formik.values.containers.length === 0) {
                  formik.setFieldValue("containers", [containers[0]]);
                }
                handleAddContainer();
              }}
            >
              Add Container
            </Button>
            
            {containers.length > 1 && (
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  setOpenDialog(true);
                  setContainerToDelete(index);
                }}
              >
                Delete Container
              </Button>
            )}
          </div>
          <hr />
        </div>
      ))}
    </div>
  );
};


// Main Export View Job Component
function ExportViewJob() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [fileSnackbar, setFileSnackbar] = useState(false);
  
  // Use the custom hook
  const {
    data,
    loading,
    formik,
    exportDocuments,
    setExportDocuments,
    exportCharges,
    setExportCharges,
    exportDocDropdown,
    selectedDocument,
    setSelectedDocument,
    newDocumentName,
    setNewDocumentName,
    newDocumentCode,
    setNewDocumentCode,
    setData
  } = useExportJobDetails(params, setFileSnackbar);

  console.log(    data,
)
  // Tab management
  const [activeTab, setActiveTab] = useState(0);
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [containerToDelete, setContainerToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Navigation handlers
  const handleBackClick = () => {
    navigate("/export-dsr", {
      state: {
        fromJobDetails: true,
      },
    });
  };

  // Container management
// In your main ExportViewJob component or hook
const handleAddContainer = () => {
  const newContainer = {
    container_number: "",
    container_size: "20",
    seal_number: "",
    stuffing_date: "",
    gross_weight: "",
    net_weight: "",
    gate_in_date: "",
    loading_date: "",
    container_images: [],
    stuffing_images: []
  };

  // If containers array is empty or doesn't exist, initialize it
  const currentContainers = formik.values.containers || [];
  
  formik.setFieldValue("containers", [
    ...currentContainers,
    newContainer
  ]);
};


const handleDeleteContainer = () => {
  if (deleteConfirmText === "Delete") {
    const updatedContainers = (formik.values.containers || []).filter((_, i) => i !== containerToDelete);
    
    // Always keep at least one container (empty if needed)
    if (updatedContainers.length === 0) {
      formik.setFieldValue("containers", [{
        container_number: "",
        container_size: "20",
        seal_number: "",
        stuffing_date: "",
        gross_weight: "",
        net_weight: "",
        gate_in_date: "",
        loading_date: "",
        container_images: [],
        stuffing_images: []
      }]);
    } else {
      formik.setFieldValue("containers", updatedContainers);
    }
    
    setOpenDialog(false);
    setDeleteConfirmText("");
  } else {
    alert("Please type 'Delete' to confirm.");
  }
};


  // Query handlers
  const handleQueriesChange = (updatedQueries) => {
    setData((prev) => ({
      ...prev,
      export_queries: updatedQueries,
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Typography>Loading export job details...</Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
        <Typography variant="h6" color="error">
          Export job not found
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={handleBackClick}
          sx={{ mt: 2 }}
        >
          Back to Export List
        </Button>
      </Box>
    );
  }

  return (
    <>
      <form onSubmit={formik.handleSubmit}>
        {/* Back button */}
        <Box sx={{ position: "fixed", top: 80, left: 80, zIndex: 999 }}>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackClick}
            sx={{
              backgroundColor: "black",
              color: "white",
              "&:hover": {
                backgroundColor: "#333",
              },
            }}
          >
            Back to Export List
          </Button>
        </Box>

        {/* Static job information */}
        <div style={{ marginTop: "70px" }}>
          <ExportJobStaticData data={data} params={params} />
        </div>

        {/* Tabs Interface */}
        <Paper sx={{ margin: '20px' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  minWidth: 120,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#1976d2',
                },
              }}
            >
              <Tab label="Queries" {...a11yProps(0)} />
              <Tab label="Status" {...a11yProps(1)} />
              <Tab label="Tracking" {...a11yProps(2)} />
              <Tab label="Export Terms" {...a11yProps(3)} />
              <Tab label="Documents" {...a11yProps(4)} />
              <Tab label="Charges" {...a11yProps(5)} />
              <Tab label="Containers" {...a11yProps(6)} />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
              <h3>Queries</h3>
              <QueriesSection 
                data={data}
                handleQueriesChange={handleQueriesChange}
                user={user}
              />
            </div>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
              <h3>Status</h3>
              <StatusSection formik={formik} user={user} />
            </div>
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
              <h3>Tracking</h3>
              <TrackingSection formik={formik} />
            </div>
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
              <h3>Export Terms</h3>
              <ExportTermsSection formik={formik} />
            </div>
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
              <h3>Documents</h3>
              <DocumentsSection 
                exportDocuments={exportDocuments}
                setExportDocuments={setExportDocuments}
                exportDocDropdown={exportDocDropdown}
                selectedDocument={selectedDocument}
                setSelectedDocument={setSelectedDocument}
                newDocumentName={newDocumentName}
                setNewDocumentName={setNewDocumentName}
                newDocumentCode={newDocumentCode}
                setNewDocumentCode={setNewDocumentCode}
              />
            </div>
          </TabPanel>

          <TabPanel value={activeTab} index={5}>
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
              <h3>Charges</h3>
              <ChargesSection 
                exportCharges={exportCharges}
                setExportCharges={setExportCharges}
              />
            </div>
          </TabPanel>

          <TabPanel value={activeTab} index={6}>
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
              <h3>Containers</h3>
              <ContainersSection 
                formik={formik}
                handleAddContainer={handleAddContainer}
                handleDeleteContainer={handleDeleteContainer}
                setOpenDialog={setOpenDialog}
                setContainerToDelete={setContainerToDelete}
              />
            </div>
          </TabPanel>
        </Paper>

        {/* Submit Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            sx={{
              backgroundColor: '#1976d2',
              '&:hover': {
                backgroundColor: '#1565c0',
              },
            }}
          >
            Update Export Job
          </Button>
        </Box>
      </form>

      {/* Snackbar */}
      <Snackbar
        open={fileSnackbar}
        message="Export job updated successfully!"
        sx={{ left: "auto !important", right: "24px !important" }}
        autoHideDuration={3000}
        onClose={() => setFileSnackbar(false)}
      />

      {/* Delete Container Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please type <strong>Delete</strong> in the box below to confirm you
            want to delete this container.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Type 'Delete' to confirm"
            fullWidth
            variant="outlined"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteContainer} color="error">
            Confirm Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default React.memo(ExportViewJob);
