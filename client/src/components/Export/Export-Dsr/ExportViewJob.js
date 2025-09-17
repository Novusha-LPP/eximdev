import React, { useState, useRef, useContext, useEffect } from "react";
import { Row, Col } from "react-bootstrap";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  IconButton,
  TextField,
  Tooltip,
  InputLabel,
  Select,
  Typography,
  MenuItem,
  Button,
  Box,
  Checkbox,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  FormGroup,
  Switch,
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
import AddIcon from "@mui/icons-material/Add";
import { format } from "date-fns";
import { useFormik } from "formik";
import axios from "axios";
import "../../../styles/job-details.scss";
import ImagePreview from "../../../components/gallery/ImagePreview.js";
import FileUpload from "../../../components/gallery/FileUpload.js";
import { UserContext } from "../../../contexts/UserContext";
import QueriesComponent from "../../../utils/QueriesComponent.js";

// Custom hook for export job data
const useExportJobDetails = (params) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportDocuments, setExportDocuments] = useState([]);
  const [exportCharges, setExportCharges] = useState([
    { charge_type: "Ocean Freight" },
    { charge_type: "Documentation" },
    { charge_type: "Customs Clearance" },
    { charge_type: "Origin Handling" },
    { charge_type: "Terminal Handling" }
  ]);

  useEffect(() => {
    fetchExportJobDetails();
  }, [params.job_no, params.year]);

  const fetchExportJobDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/export-jobs/${params.year}/${params.job_no}`
      );
      
      if (response.data.success) {
        const jobData = response.data.data;
        setData(jobData);
        setExportDocuments(jobData.export_documents || []);
        
        // Update export charges to include custom charges from database
        if (jobData.export_charges && jobData.export_charges.length > 0) {
          const predefinedCharges = [
            { charge_type: "Ocean Freight" },
            { charge_type: "Documentation" },
            { charge_type: "Customs Clearance" },
            { charge_type: "Origin Handling" },
            { charge_type: "Terminal Handling" }
          ];
          
          // Get unique custom charges from database
          const customChargesFromDB = jobData.export_charges
            .filter(charge => !predefinedCharges.some(predefined => 
              predefined.charge_type === charge.charge_type))
            .map(charge => ({ charge_type: charge.charge_type }));
          
          // Remove duplicates
          const uniqueCustomCharges = customChargesFromDB.filter((charge, index, self) => 
            index === self.findIndex(c => c.charge_type === charge.charge_type)
          );
          
          // Combine predefined and unique custom charges
          const allCharges = [...predefinedCharges, ...uniqueCustomCharges];
          setExportCharges(allCharges);
        }
      }
    } catch (error) {
      console.error("Error fetching export job details:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const updateExportJob = async (updateData) => {
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_API_STRING}/export-jobs/${params.year}/${params.job_no}`,
        updateData,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.data.success) {
        setData(response.data.data);
        return response.data.data;
      } else {
        throw new Error(response.data.message || "Failed to update export job");
      }
    } catch (error) {
      console.error("Error updating export job:", error);
      throw error;
    }
  };

  return {
    data,
    loading,
    exportDocuments,
    setExportDocuments,
    exportCharges,
    setExportCharges,
    updateExportJob,
    setData
  };
};

// Job Details Row Heading Component
const JobDetailsRowHeading = ({ heading }) => (
  <div className="job-details-row-heading">
    <h4>{heading}</h4>
  </div>
);

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

function ExportViewJob() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const {
    data,
    loading,
    exportDocuments,
    setExportDocuments,
    exportCharges,
    setExportCharges,
    updateExportJob,
    setData
  } = useExportJobDetails(params);

  // Utility function to handle undefined/null checks
  const safeValue = (value, defaultVal = "") =>
    value === undefined || value === null ? defaultVal : value;

  // Form management
  const formik = useFormik({
    initialValues: {
      // Basic job info
      job_type: "sea_export",
      status: "Planning",
      detailed_status: "Planning Stage",
      priority_level: "Normal",
      
      // Exporter info
      exporter_name: "",
      ie_code: "",
      
      // Consignee info
      consignee_name: "",
      consignee_country: "",
      country_of_final_destination: "",
      
      // Shipment details
      port_of_loading: "",
      port_of_discharge: "",
      vessel_flight_name: "",
      booking_number: "",
      
      // Commercial details
      commercial_invoice_number: "",
      commercial_invoice_date: "",
      commercial_invoice_value: "",
      incoterms: "",
      
      // Shipping bill details
      shipping_bill_number: "",
      shipping_bill_date: "",
      leo_number: "",
      
      // Milestone dates
      booking_confirmation_date: "",
      documentation_completion_date: "",
      customs_clearance_date: "",
      stuffing_date: "",
      gate_pass_date: "",
      port_terminal_arrival_date: "",
      loading_completion_date: "",
      vessel_departure_date: "",
      
      // Containers
      containers: [],
      
      // Queries
      export_queries: [],
      
      // Other fields
      remarks: "",
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        // Get user info for audit trail
        const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
        
        // Prepare the update payload
        const updatePayload = {
          ...values,
          export_documents: exportDocuments,
          export_charges: exportCharges.map(charge => {
            // Find matching charge data from state
            const existingCharge = exportCharges.find(ec => ec.charge_type === charge.charge_type);
            return {
              charge_type: charge.charge_type,
              amount: existingCharge?.amount || "",
              currency: existingCharge?.currency || "USD",
              document_urls: existingCharge?.document_urls || []
            };
          }),
          containers: values.containers || [],
          updatedAt: new Date(),
          updated_by: user.username || 'system'
        };

        await updateExportJob(updatePayload);
        setFileSnackbar(true);
        setTimeout(() => setFileSnackbar(false), 3000);

        // Close tab after successful submit
        setTimeout(() => {
          window.close();
        }, 500);

      } catch (error) {
        console.error("Error submitting form:", error);
        alert("Error updating export job. Please try again.");
      }
    }
  });

  // Update formik initial values when data is fetched
  useEffect(() => {
    if (data) {
      const containers = safeValue(data.containers, []).map((container) => ({
        container_number: safeValue(container.container_number),
        container_size: safeValue(container.container_size, "20"),
        seal_number: safeValue(container.seal_number),
        stuffing_date: safeValue(container.stuffing_date),
        gross_weight: safeValue(container.gross_weight),
        net_weight: safeValue(container.net_weight),
        gate_in_date: safeValue(container.gate_in_date),
        loading_date: safeValue(container.loading_date),
        departure_date: safeValue(container.departure_date),
        container_images: safeValue(container.container_images, []),
        stuffing_images: safeValue(container.stuffing_images, []),
        weighment_slip: safeValue(container.weighment_slip, []),
        vgm_certificate: safeValue(container.vgm_certificate, []),
      }));

      formik.setValues({
        // Basic job info
        job_type: safeValue(data.job_type, "sea_export"),
        status: safeValue(data.status, "Planning"),
        detailed_status: safeValue(data.detailed_status, "Planning Stage"),
        priority_level: safeValue(data.priority_level, "Normal"),
        
        // Exporter info
        exporter_name: safeValue(data.exporter_name),
        ie_code: safeValue(data.ie_code),
        
        // Consignee info
        consignee_name: safeValue(data.consignee_name),
        consignee_country: safeValue(data.consignee_country),
        country_of_final_destination: safeValue(data.country_of_final_destination),
        
        // Shipment details
        port_of_loading: safeValue(data.port_of_loading),
        port_of_discharge: safeValue(data.port_of_discharge),
        vessel_flight_name: safeValue(data.vessel_flight_name),
        booking_number: safeValue(data.booking_number),
        
        // Commercial details
        commercial_invoice_number: safeValue(data.commercial_invoice_number),
        commercial_invoice_date: safeValue(data.commercial_invoice_date),
        commercial_invoice_value: safeValue(data.commercial_invoice_value),
        incoterms: safeValue(data.incoterms),
        
        // Shipping bill details
        shipping_bill_number: safeValue(data.shipping_bill_number),
        shipping_bill_date: safeValue(data.shipping_bill_date),
        leo_number: safeValue(data.leo_number),
        
        // Milestone dates
        booking_confirmation_date: safeValue(data.booking_confirmation_date),
        documentation_completion_date: safeValue(data.documentation_completion_date),
        customs_clearance_date: safeValue(data.customs_clearance_date),
        stuffing_date: safeValue(data.stuffing_date),
        gate_pass_date: safeValue(data.gate_pass_date),
        port_terminal_arrival_date: safeValue(data.port_terminal_arrival_date),
        loading_completion_date: safeValue(data.loading_completion_date),
        vessel_departure_date: safeValue(data.vessel_departure_date),
        
        // Containers
        containers,
        
        // Queries
        export_queries: safeValue(data.export_queries, []),
        
        // Other fields
        remarks: safeValue(data.remarks),
      });
    }
  }, [data]);

  // State management
  const [snackbar, setSnackbar] = useState(false);
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [containerToDelete, setContainerToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [selectedDocument, setSelectedDocument] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentCode, setNewDocumentCode] = useState("");
  const [newChargesDocumentName, setNewChargesDocumentName] = useState("");

  // Document dropdown options for export
  const exportDocDropdown = [
    { document_name: "Commercial Invoice", document_code: "CINV" },
    { document_name: "Packing List", document_code: "PLIST" },
    { document_name: "Certificate of Origin", document_code: "COO" },
    { document_name: "Export License", document_code: "EXLIC" },
    { document_name: "Shipping Bill", document_code: "SB" },
    { document_name: "Bill of Lading", document_code: "BL" },
    { document_name: "Letter of Credit", document_code: "LC" },
    { document_name: "Quality Certificate", document_code: "QC" },
    { document_name: "Phytosanitary Certificate", document_code: "PHYTO" },
    { document_name: "Insurance Certificate", document_code: "INS" }
  ];

  // Navigation handlers
  const handleBackClick = () => {
    navigate("/export-dsr", {
      state: {
        fromJobDetails: true,
      },
    });
  };

  // Container management
  const handleAddContainer = () => {
    formik.setFieldValue("containers", [
      ...(formik.values.containers || []),
      {
        container_number: "",
        container_size: "20",
        stuffing_date: "",
        gross_weight: "",
        net_weight: "",
        seal_number: "",
        gate_in_date: "",
        loading_date: "",
        departure_date: "",
        container_images: [],
        stuffing_images: [],
        weighment_slip: [],
        vgm_certificate: []
      },
    ]);
  };

  const handleDeleteContainer = () => {
    if (deleteConfirmText === "Delete") {
      formik.setFieldValue(
        "containers",
        (formik.values.containers || []).filter((_, i) => i !== containerToDelete)
      );
      setOpenDialog(false);
      setDeleteConfirmText("");
    } else {
      alert("Please type 'Delete' to confirm.");
    }
  };

  // Update detailed status based on milestones
  const updateDetailedStatus = () => {
    const {
      booking_confirmation_date,
      documentation_completion_date,
      customs_clearance_date,
      loading_completion_date,
      vessel_departure_date,
    } = formik.values;

    if (vessel_departure_date) {
      formik.setFieldValue("detailed_status", "Shipped");
    } else if (loading_completion_date) {
      formik.setFieldValue("detailed_status", "Loading Completed");
    } else if (customs_clearance_date) {
      formik.setFieldValue("detailed_status", "Customs Cleared");
    } else if (documentation_completion_date) {
      formik.setFieldValue("detailed_status", "Documentation Completed");
    } else if (booking_confirmation_date) {
      formik.setFieldValue("detailed_status", "Booking Confirmed");
    } else {
      formik.setFieldValue("detailed_status", "Planning Stage");
    }
  };

  useEffect(() => {
    updateDetailedStatus();
  }, [
    formik.values.booking_confirmation_date,
    formik.values.documentation_completion_date,
    formik.values.customs_clearance_date,
    formik.values.loading_completion_date,
    formik.values.vessel_departure_date
  ]);

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
      {data && (
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

          {/* Queries Component */}
          <div>
            <QueriesComponent
              queries={data.export_queries || []}
              currentModule="Export DSR"
              onQueriesChange={handleQueriesChange}
              title="Export Queries"
              showResolveButton={true}
              readOnlyReply={false}
              userName={user?.username}
            />
          </div>

          {/* Completion Status */}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Completion Status" />
            
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

          {/* Export Tracking Status */}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Export Tracking Status" />
            
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

          {/* Documents Section */}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Export Documents" />
            <br />

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
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    style={{ 
                      marginTop: "8px", 
                      height: "fit-content",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px"
                    }}
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
                  >
                    <i className="fas fa-plus"></i>
                    Add Document
                  </button>
                </Col>
              </Row>
            </div>
          </div>

          {/* Charges Section */}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Export Charges" />
            <br />

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
                <button
                  type="button"
                  className="btn"
                  style={{ marginTop: "8px", height: "fit-content" }}
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
                >
                  Add Custom Charge
                </button>
              </Col>
            </Row>
          </div>

          {/* Container Details */}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Container/Package Details" />
            
            {(formik.values.containers || [{}]).map((container, index) => (
              <div key={index}>
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
                            name={`containers[${index}].container_number`}
                            onChange={formik.handleChange}
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
                        name={`containers[${index}].container_size`}
                        value={container.container_size || "20"}
                        onChange={formik.handleChange}
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
                          name={`containers[${index}].seal_number`}
                          value={container.seal_number || ""}
                          onChange={formik.handleChange}
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
                          name={`containers[${index}].stuffing_date`}
                          value={container.stuffing_date || ""}
                          onChange={formik.handleChange}
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
                          name={`containers[${index}].gross_weight`}
                          value={container.gross_weight || ""}
                          onChange={formik.handleChange}
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
                          name={`containers[${index}].net_weight`}
                          value={container.net_weight || ""}
                          onChange={formik.handleChange}
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
                          name={`containers[${index}].gate_in_date`}
                          value={container.gate_in_date || ""}
                          onChange={formik.handleChange}
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
                          name={`containers[${index}].loading_date`}
                          value={container.loading_date || ""}
                          onChange={formik.handleChange}
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
                  <button
                    className="btn"
                    type="button"
                    onClick={handleAddContainer}
                  >
                    Add Container
                  </button>
                  
                  {(formik.values.containers || []).length > 1 && (
                    <button
                      className="btn-danger"
                      type="button"
                      onClick={() => {
                        setOpenDialog(true);
                        setContainerToDelete(index);
                      }}
                    >
                      Delete Container
                    </button>
                  )}
                </div>
                <hr />
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <Row>
            <Col>
              <button
                className="btn sticky-btn"
                type="submit"
                style={{ float: "right", margin: "10px" }}
              >
                Update Export Job
              </button>
            </Col>
          </Row>
        </form>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar || fileSnackbar}
        message={
          snackbar ? "Copied to clipboard" : "Export job updated successfully!"
        }
        sx={{ left: "auto !important", right: "24px !important" }}
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
