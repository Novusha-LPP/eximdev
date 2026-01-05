import React, { useState, useEffect, useRef, useContext } from "react";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Snackbar from "@mui/material/Snackbar";
import { Row, Col } from "react-bootstrap";
import { IconButton, TextField, Box, Typography, Button, Tabs, Tab } from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import useFetchOperationTeamJob from "../../customHooks/useFetchOperationTeamJob";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FileUpload from "../../components/gallery/FileUpload.js"; // Reusable FileUpload component
import ImagePreview from "../../components/gallery/ImagePreview.js"; // Reusable ImagePreview component
import ConfirmDialog from "../../components/gallery/ConfirmDialog"; // Reusable ConfirmDialog component
// import { handleFileUpload } from "../../utils/awsFileUpload";
import { handleCopyContainerNumber } from "../../utils/handleCopyContainerNumber";
import AWS from "aws-sdk";
// import { handleActualWeightChange } from "../../utils/handleActualWeightChange";
import { handleNetWeightChange } from "../../utils/handleNetWeightChange";
import {
  handlePhysicalWeightChange,
  handleTareWeightChange,
  handleWeightAsPerDocumentChange,
  handleGrossWeightAsPerDocumentChange,
  handleActualWeightChange,
} from "../../utils/handleTareWeightChange";
import Checkbox from "@mui/material/Checkbox";
import { UserContext } from "../../contexts/UserContext";
import { TabContext } from "./ImportOperations.js";
// import { handlePhysicalWeightChange } from "../../utils/handlePhysicalWeightChange";
import JobDetailsRowHeading from "../import-dsr/JobDetailsRowHeading";
import QueriesComponent from "../../utils/QueriesComponent.js";
import { compressFile } from "../../utils/fileCompression";

function ViewOperationsJob() {
  const bl_no_ref = useRef();
  const { user } = useContext(UserContext);
  const containerImagesRef = useRef();
  const weighmentSlipRef = useRef();
  const container_number_ref = useRef([]);
  const loose_material_ref = useRef([]);
  const container_pre_damage_images_ref = useRef([]);
  const examinationVideosRef = useRef();
  const gatePassCopyRef = useRef();
  const [snackbar, setSnackbar] = useState(false);
  const [fileSnackbar, setFileSnackbar] = useState(false);

  const [viewJobTab, setViewJobTab] = useState(0);
  const [selectedContainerIndex, setSelectedContainerIndex] = useState(0);
  const handleViewJobTabChange = (event, newValue) => {
    setViewJobTab(newValue);
  };
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedJobId, searchQuery, page } = location.state || {};

  // Add stored search parameters state
  const [storedSearchParams, setStoredSearchParams] = useState(null); // Store search parameters from location state
  useEffect(() => {
    if (location.state) {
      const {
        searchQuery,
        selectedImporter,
        selectedJobId,
        currentTab,
        selectedICD,
        selectedYearState,
        detailedStatusExPlan,
        currentPage,
      } = location.state;
      setStoredSearchParams({
        searchQuery,
        selectedImporter,
        selectedJobId,
        currentTab,
        selectedICD,
        selectedYearState,
        detailedStatusExPlan,
        currentPage,
      });
    }
  }, [location.state]); // Handle back click function - following e-sanchit pattern exactly
  const handleBackClick = () => {
    const tabIndex = storedSearchParams?.currentTab ?? 2; // Default to Completed Operations tab

    navigate("/import-operations", {
      state: {
        fromJobDetails: true,
        tabIndex: tabIndex,
        selectedJobId: params.job_no,
        ...(storedSearchParams && {
          searchQuery: storedSearchParams.searchQuery,
          selectedImporter: storedSearchParams.selectedImporter,
          selectedICD: storedSearchParams.selectedICD,
          selectedYearState: storedSearchParams.selectedYearState,
          detailedStatusExPlan: storedSearchParams.detailedStatusExPlan,
          currentPage: storedSearchParams.currentPage,
        }),
      },
    });
  };

  const { data, formik, setData } = useFetchOperationTeamJob(params);

  const extractFileName = (url) => {
    try {
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
    } catch (error) {
      console.error("Failed to extract file name:", error);
      return url; // Fallback to original URL
    }
  };

  const handleQueriesChange = (updatedQueries) => {
    setData((prev) => ({
      ...prev,
      dsr_queries: updatedQueries,
    }));
    formik.setFieldValue("dsr_queries", updatedQueries); // keep formik in sync
  };

  const handleResolveQuery = (resolvedQuery, index) => {
    // Custom logic when a query is resolved
    console.log("Query resolved:", resolvedQuery);
    // You can add API calls, notifications, etc.
  };
  const handleContainerFileUpload = async (e, container_number, fileType) => {
    if (e.target.files.length === 0) {
      alert("No file selected");
      return;
    }

    try {
      const s3 = new AWS.S3({
        accessKeyId: process.env.REACT_APP_ACCESS_KEY,
        secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
        region: "ap-south-1",
      });

      const updatedWeighmentSlips = await Promise.all(
        formik.values.container_nos?.map(async (container) => {
          if (container.container_number === container_number) {
            const fileUrls = [];

            for (let i = 0; i < e.target.files.length; i++) {
              const file = e.target.files[i];
              const params = {
                Bucket: process.env.REACT_APP_S3_BUCKET,
                Key: `${fileType}/${container_number}/${file.name}`,
                Body: file,
              };

              // Upload the file to S3 and wait for the promise to resolve
              const data = await s3.upload(params).promise();

              // Store the S3 URL in the fileUrls array
              fileUrls.push({ url: data.Location, container_number });
            }

            // Update the container with the new images, replacing the old ones
            return {
              ...container,
              [fileType]: fileUrls,
            };
          }

          return container;
        })
      );

      // Update the formik values with the updated container images
      formik.setValues((values) => ({
        ...values,
        container_nos: updatedWeighmentSlips,
      }));

      setFileSnackbar(true);

      setTimeout(() => {
        setFileSnackbar(false);
      }, 3000);
    } catch (err) {
      console.error("Error uploading files:", err);
    }
  };
  const handleGatePassUpload = (uploadedFiles) => {
    formik.setFieldValue("custodian_gate_pass", uploadedFiles);
    setFileSnackbar(true);

    setTimeout(() => {
      setFileSnackbar(false);
    }, 3000);
  };
  const handleFileUpload = (uploadedFiles, container_number, fileType) => {
    const updatedContainers = formik.values.container_nos.map((container) => {
      if (container.container_number === container_number) {
        return {
          ...container,
          [fileType]: [...(container[fileType] || []), ...uploadedFiles],
        };
      }
      return container;
    });

    formik.setFieldValue("container_nos", updatedContainers);
    setFileSnackbar(true);

    setTimeout(() => {
      setFileSnackbar(false);
    }, 3000);
  };

  const handleDeleteImage = (index, container_number, fileType) => {
    const updatedContainers = formik.values.container_nos.map((container) => {
      if (container.container_number === container_number) {
        const updatedImages = [...(container[fileType] || [])];
        updatedImages.splice(index, 1);
        return {
          ...container,
          [fileType]: updatedImages,
        };
      }
      return container;
    });

    formik.setFieldValue("container_nos", updatedContainers);
  };

  const calculateWeightExcessShortage = (index, formik, actualWeight) => {
    const weightAsPerDocument =
      parseFloat(formik.values.container_nos[index].net_weight) || 0;
    const difference = actualWeight - weightAsPerDocument;
    const formattedDifference =
      difference > 0 ? `+${difference.toFixed(2)}` : difference.toFixed(2);

    formik.setFieldValue(
      `container_nos[${index}].weight_shortage`,
      formattedDifference
    );
  };

  const renderDocuments = (documents, type) => {
    if (!documents || documents.length === 0) {
      return <p>No {type} uploaded yet.</p>;
    }

    return (
      <div className="table-responsive">
        <table
          className="table table-bordered table-hover"
          style={{ backgroundColor: "#fff", fontSize: "0.9rem" }}
        >
          <thead style={{ backgroundColor: "#f8f9fa" }}>
            <tr>
              <th
                style={{
                  width: "40%",
                  fontWeight: "600",
                  color: "#495057",
                  padding: "4px 8px",
                }}
              >
                Document Name
              </th>
              <th
                style={{
                  width: "60%",
                  fontWeight: "600",
                  color: "#495057",
                  padding: "4px 8px",
                }}
              >
                Files
              </th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, index) => (
              <tr key={`cth-${index}`}>
                <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "600", color: "#212529" }}>
                        {doc.document_name}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>
                        {doc.document_code}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flexShrink: 0 }}>
                      <FileUpload
                        label="Upload"
                        bucketPath={`cth-documents/${doc.document_name}`}
                        multiple={true}
                        containerStyles={{ marginTop: 0 }}
                        buttonSx={{
                          fontSize: "0.75rem",
                          padding: "2px 10px",
                          minWidth: "auto",
                          textTransform: "none",
                        }}
                        onFilesUploaded={(urls) => {
                          const updatedDocuments = [...data.cth_documents];
                          updatedDocuments[index].url = [
                            ...(updatedDocuments[index].url || []),
                            ...urls,
                          ];
                          setData((prev) => ({
                            ...prev,
                            cth_documents: updatedDocuments,
                          }));
                        }}
                      />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <ImagePreview
                        images={doc.url || []}
                        isDsr={true}
                        readOnly={false}
                        onDeleteImage={(deleteIndex) => {
                          const updatedDocuments = [...data.cth_documents];
                          updatedDocuments[index].url = updatedDocuments[
                            index
                          ].url.filter((_, i) => i !== deleteIndex);
                          setData((prev) => ({
                            ...prev,
                            cth_documents: updatedDocuments,
                          }));
                        }}
                      />
                    </Box>
                  </Box>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAllDocuments = (documents) => {
    if (!documents || documents.length === 0) {
      return <p>No documents uploaded yet.</p>;
    }

    return (
      <Box display="flex" flexWrap="wrap" gap={2} mt={2}>
        {documents.map((url, index) => (
          <Box
            key={index}
            sx={{
              border: "1px solid #ccc",
              padding: "10px",
              borderRadius: "5px",
              flex: "1 1 30%",
              maxWidth: "30%",
              minWidth: "250px",
            }}
          >
            <Box mt={1} textAlign="center">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", color: "blue" }}
              >
                {extractFileName(url)}
              </a>
            </Box>
          </Box>
        ))}
      </Box>
    );
  };
  return (
    <>
      {/* Back to Job List Button */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          onClick={handleBackClick}
          sx={{
            backgroundColor: "#1976d2",
            color: "white",
            "&:hover": {
              backgroundColor: "#333",
            },
          }}
        >
          Back to Job List
        </Button>
      </Box>

      {data !== null && (
        <form onSubmit={formik.handleSubmit}>
          <JobDetailsStaticData
            data={data}
            params={params}
            bl_no_ref={bl_no_ref}
            setSnackbar={setSnackbar}
          />

          {data && data.dsr_queries && (
            <div>
              <QueriesComponent
                queries={data.dsr_queries}
                currentModule="Operations"
                onQueriesChange={handleQueriesChange}
                title="Operations Queries"
                showResolveButton={true}
                readOnlyReply={false}
                onResolveQuery={handleResolveQuery}
                userName={user?.username}
              />
            </div>
          )}

          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2, bgcolor: "white", borderRadius: 1 }}>
            <Tabs value={viewJobTab} onChange={handleViewJobTabChange} aria-label="job details tabs"
              variant="scrollable" scrollButtons="auto"
              sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 600, fontSize: "1rem" } }}
            >
              <Tab label="Dates" />
              <Tab label="Documents" />
              <Tab label="Container" />
            </Tabs>
          </Box>

          {/* ********************** Tab 0: Dates ********************** */}
          {viewJobTab === 0 && (
            <>
              <div className="job-details-container">
                <JobDetailsRowHeading heading="Dates" />
                <Row>
                  <Col md={9}>
                    <Row>
                      <Col xs={12} md={4}>
                        <div
                          className="job-detail-input-container"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            width: "70%",
                          }}
                        >
                          <strong style={{ marginBottom: "5px" }}>
                            Examination Date:
                          </strong>
                          <TextField
                            fullWidth
                            size="small"
                            margin="normal"
                            variant="outlined"
                            type="date"
                            id="examination_date"
                            name="examination_date"
                            value={formik.values.examination_date}
                            onChange={formik.handleChange}
                            inputProps={{
                              min: data.examination_planning_date,
                            }}
                            sx={{ marginTop: 0 }}
                          />
                        </div>
                      </Col>
                      <Col xs={12} md={4}>
                        <div
                          className="job-detail-input-container"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            width: "70%",
                          }}
                        >
                          <strong style={{ marginBottom: "5px" }}>
                            PCV Date:
                          </strong>
                          <TextField
                            fullWidth
                            size="small"
                            margin="normal"
                            variant="outlined"
                            type="date"
                            id="pcv_date"
                            name="pcv_date"
                            value={formik.values.pcv_date}
                            onChange={formik.handleChange}
                            error={
                              formik.touched.pcv_date &&
                              Boolean(formik.errors.pcv_date)
                            }
                            helperText={
                              formik.touched.pcv_date && formik.errors.pcv_date
                            }
                            sx={{ marginTop: 0 }}
                          />
                        </div>
                      </Col>
                      <Col xs={12} md={4}>
                        <div
                          className="job-detail-input-container"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            width: "70%",
                          }}
                        >
                          <strong style={{ marginBottom: "5px" }}>
                            Out of Charge Date:
                          </strong>
                          <TextField
                            fullWidth
                            size="small"
                            margin="normal"
                            variant="outlined"
                            type="date"
                            id="out_of_charge"
                            name="out_of_charge"
                            value={formik.values.out_of_charge}
                            onChange={formik.handleChange}
                            error={
                              formik.touched.out_of_charge &&
                              Boolean(formik.errors.out_of_charge)
                            }
                            helperText={
                              formik.touched.out_of_charge &&
                              formik.errors.out_of_charge
                            }
                            sx={{ marginTop: 0 }}
                          />
                        </div>
                      </Col>

                      {/* Add Concor Gate Pass Date and Validate Up To Date only for ICD KHODIYAR */}
                      {data.custom_house === "ICD KHODIYAR" && (
                        <>
                          <Col xs={12} md={4} style={{ marginTop: "20px" }}>
                            <div
                              className="job-detail-input-container"
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                width: "70%",
                              }}
                            >
                              <strong style={{ marginBottom: "5px" }}>
                                Concor Gate Pass Date:
                              </strong>
                              <TextField
                                fullWidth
                                size="small"
                                margin="normal"
                                variant="outlined"
                                type="date"
                                id="concor_gate_pass_date"
                                name="concor_gate_pass_date"
                                value={formik.values.concor_gate_pass_date}
                                onChange={formik.handleChange}
                                error={
                                  formik.touched.concor_gate_pass_date &&
                                  Boolean(formik.errors.concor_gate_pass_date)
                                }
                                helperText={
                                  formik.touched.concor_gate_pass_date &&
                                  formik.errors.concor_gate_pass_date
                                }
                                sx={{ marginTop: 0 }}
                              />
                            </div>
                          </Col>

                          <Col xs={12} md={4} style={{ marginTop: "20px" }}>
                            <div
                              className="job-detail-input-container"
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                width: "70%",
                              }}
                            >
                              <strong style={{ marginBottom: "5px" }}>
                                Concor Gate Pass Validate Up To Date:
                              </strong>
                              <TextField
                                fullWidth
                                size="small"
                                margin="normal"
                                variant="outlined"
                                type="date"
                                id="concor_gate_pass_validate_up_to"
                                name="concor_gate_pass_validate_up_to"
                                value={
                                  formik.values.concor_gate_pass_validate_up_to
                                }
                                onChange={formik.handleChange}
                                error={
                                  formik.touched.concor_gate_pass_validate_up_to &&
                                  Boolean(
                                    formik.errors
                                      .concor_gate_pass_validate_up_to
                                  )
                                }
                                helperText={
                                  formik.touched
                                    .concor_gate_pass_validate_up_to &&
                                  formik.errors.concor_gate_pass_validate_up_to
                                }
                                sx={{ marginTop: 0 }}
                              />
                            </div>
                          </Col>
                        </>
                      )}
                    </Row>
                  </Col>

                  {/* Right Column: Uploads (Stacked Vertically) */}
                  <Col md={3}>
                    {data.custom_house === "ICD KHODIYAR" && (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          marginTop: 2,
                        }}
                      >
                        <Box>
                          <FileUpload
                            label="Upload Custodian Gate Pass Copy"
                            bucketPath="custodian_gate_pass"
                            onFilesUploaded={(newFiles) => {
                              const existingFiles =
                                formik.values.custodian_gate_pass || [];
                              const updatedFiles = [
                                ...existingFiles,
                                ...newFiles,
                              ]; // Append new files
                              formik.setFieldValue(
                                "custodian_gate_pass",
                                updatedFiles
                              );
                            }}
                            multiple={true}
                          />
                          <ImagePreview
                            images={formik.values.custodian_gate_pass || []} // Display all uploaded files
                            onDeleteImage={(index) => {
                              const updatedFiles = [
                                ...formik.values.custodian_gate_pass,
                              ];
                              updatedFiles.splice(index, 1); // Remove the selected file
                              formik.setFieldValue(
                                "custodian_gate_pass",
                                updatedFiles
                              );
                            }}
                          />
                        </Box>

                        <Box>
                          <FileUpload
                            label="Upload Concor Invoice and Receipt Copy "
                            bucketPath="concor_invoice_and_receipt_copy"
                            onFilesUploaded={(newFiles) => {
                              const existingFiles =
                                formik.values.concor_invoice_and_receipt_copy ||
                                [];
                              const updatedFiles = [
                                ...existingFiles,
                                ...newFiles,
                              ]; // Append new files
                              formik.setFieldValue(
                                "concor_invoice_and_receipt_copy",
                                updatedFiles
                              );
                            }}
                            multiple={true}
                          />
                          <ImagePreview
                            images={
                              formik.values.concor_invoice_and_receipt_copy ||
                              []
                            } // Display all uploaded files
                            onDeleteImage={(index) => {
                              const updatedFiles = [
                                ...formik.values
                                  .concor_invoice_and_receipt_copy,
                              ];
                              updatedFiles.splice(index, 1); // Remove the selected file
                              formik.setFieldValue(
                                "concor_invoice_and_receipt_copy",
                                updatedFiles
                              );
                            }}
                          />
                        </Box>
                      </Box>
                    )}
                  </Col>
                </Row>
              </div>

              <div className="job-details-container">
                <JobDetailsRowHeading heading="Confirmation of completion" />
                <Row>
                  <Col xs={12} lg={4}>
                    <div
                      className="job-detail-input-container"
                      style={{ justifyContent: "flex-start" }}
                    >
                      <strong>Completed Operation:&nbsp;</strong>
                      <Checkbox
                        value={formik.values.completedOperation}
                        checked={formik.values.completedOperation}
                        onChange={(e) => {
                          const isChecked = e.target.checked;

                          // If checked, set the current date and time adjusted to the local timezone
                          if (isChecked) {
                            const currentDateTime = new Date(
                              Date.now() - new Date().getTimezoneOffset() * 60000
                            )
                              .toISOString()
                              .slice(0, 16); // Format for 'YYYY-MM-DDTHH:mm'
                            formik.setFieldValue("completedOperation", true);
                            formik.setFieldValue(
                              "completed_operation_date",
                              currentDateTime
                            );
                          } else {
                            formik.setFieldValue("completedOperation", false);
                            formik.setFieldValue("completed_operation_date", ""); // Clear date if unchecked
                          }
                        }}
                        disabled={!formik.values.out_of_charge} // Disable if outOfCharge is not set
                      />
                      {formik.values.completed_operation_date && (
                        <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                          {new Date(
                            formik.values.completed_operation_date
                          ).toLocaleString("en-US", {
                            timeZone: "Asia/Kolkata",
                            hour12: true,
                          })}
                        </span>
                      )}
                    </div>
                  </Col>

                  {(user.username === "atul_dev" || user.role === "Admin") && (
                    <Col xs={12} lg={4}>
                      <div
                        className="job-detail-input-container"
                        style={{ justifyContent: "flex-start" }}
                      >
                        <strong>Completed Operation Date:&nbsp;</strong>
                        <TextField
                          fullWidth
                          size="small"
                          margin="normal"
                          variant="outlined"
                          type="datetime-local"
                          id="completed_operation_date"
                          name="completed_operation_date"
                          value={
                            formik.values.completed_operation_date
                              ? formik.values.completed_operation_date
                              : ""
                          }
                          onChange={(e) => {
                            const newValue = e.target.value;
                            if (newValue) {
                              formik.setFieldValue("completedOperation", true);
                              formik.setFieldValue(
                                "completed_operation_date",
                                newValue
                              );
                            } else {
                              formik.setFieldValue("completedOperation", false);
                              formik.setFieldValue("completed_operation_date", "");
                            }
                          }}
                          disabled={!formik.values.out_of_charge} // Disable if outOfCharge is not set
                          InputLabelProps={{
                            shrink: true,
                          }}
                        />
                      </div>
                    </Col>
                  )}
                </Row>
              </div>
            </>
          )}

          {/* ********************** Tab 1: Documents ********************** */}
          {viewJobTab === 1 && (
            <>
              {/* Submission / Verification Docs */}
              <div className="job-details-container">
                <JobDetailsRowHeading heading="Documents Verification" />
                <Row>
                  <Col xs={12} md={4}>
                    <div className="mb-3">
                      <strong>Verified Checklist:&nbsp;</strong>
                      <ImagePreview images={data.checklist || []} readOnly />
                    </div>
                  </Col>
                  <Col xs={12} md={4}>
                    <div className="mb-3">
                      <strong>Job Sticker:&nbsp;</strong>
                      <ImagePreview
                        images={data.job_sticker_upload || []}
                        readOnly
                      />
                    </div>
                  </Col>
                  <Col xs={12} md={4}>
                    <div className="mb-3">
                      <strong>DO Copies:&nbsp;</strong>
                      <ImagePreview images={data.do_copies || []} readOnly />
                    </div>
                  </Col>
                </Row>
              </div>

              {/* CTH Documents */}
              <div className="job-details-container">
                <JobDetailsRowHeading heading="CTH Documents" />
                {renderDocuments(data.cth_documents, "CTH Documents")}
              </div>

              {/* All Documents */}
              <div className="job-details-container">
                <JobDetailsRowHeading heading="All Documents" />
                {renderAllDocuments(data.all_documents)}
              </div>
            </>
          )}

          {/* ********************** Tab 2: Container ********************** */}
          {viewJobTab === 2 && (
            <div className="job-details-container">
              <JobDetailsRowHeading heading="Container Details" />

              <Row>
                {/* Left Column: List of Containers */}
                <Col md={2} style={{ borderRight: "1px solid #e0e0e0" }}>
                  <div style={{ maxHeight: "80vh", overflowY: "auto", paddingRight: "5px" }}>
                    {(formik.values.status !== "" && formik.values.container_nos?.length > 0
                      ? formik.values.container_nos
                      : []
                    ).map((container, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedContainerIndex(i)}
                        style={{
                          padding: "10px",
                          marginBottom: "5px",
                          cursor: "pointer",
                          borderRadius: "4px",
                          backgroundColor: selectedContainerIndex === i ? "#e9ecef" : "#fff",
                          border: selectedContainerIndex === i ? "1px solid #007bff" : "1px solid #dee2e6",
                        }}
                      >
                        <div style={{ fontWeight: "600", color: "#495057", fontSize: "0.9rem" }}>
                          {container.container_number || `Container ${i + 1}`}
                        </div>
                        {container.size && (
                          <div style={{ fontSize: "0.75rem", color: "#6c757d" }}>
                            Size: {container.size}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Col>

                {/* Right Column: Selected Container Details */}
                <Col md={10}>
                  {(() => {
                    const containerList =
                      formik.values.status !== "" && formik.values.container_nos?.length > 0
                        ? formik.values.container_nos
                        : [];

                    if (containerList.length === 0) {
                      return <p>No containers available.</p>;
                    }

                    const index = selectedContainerIndex < containerList.length ? selectedContainerIndex : 0;
                    const container = containerList[index];

                    return (
                      <div key={index}>
                        <div style={{ padding: "30px" }}>
                          <h6>
                            <strong>
                              {index + 1}. Container Number:&nbsp;
                              <span ref={container_number_ref[index]}>
                                <a
                                  href={`https://www.ldb.co.in/ldb/containersearch/39/${container.container_number}/1726651147706`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {container.container_number}
                                </a>
                              </span>
                              <IconButton
                                onClick={() =>
                                  handleCopyContainerNumber(
                                    container.container_number
                                  )
                                }
                                aria-label="copy-btn"
                              >
                                <ContentCopyIcon />
                              </IconButton>
                              Size: {container.size}
                            </strong>
                          </h6>
                          <Row className="job-detail-row">
                            <Col xs={12} md={2}>
                              <div className="job-detail-input-container">
                                <strong>Physical Weight:&nbsp;</strong>
                                <TextField
                                  fullWidth
                                  size="small"
                                  margin="normal"
                                  variant="outlined"
                                  id={`physical_weight_${index}`}
                                  name={`container_nos[${index}].physical_weight`}
                                  value={container.physical_weight}
                                  onChange={(e) =>
                                    handlePhysicalWeightChange(e, index, formik)
                                  }
                                />
                              </div>
                            </Col>
                            <Col xs={12} md={2}>
                              <div className="job-detail-input-container">
                                <strong>Tare Weight:&nbsp;</strong>
                                <TextField
                                  fullWidth
                                  size="small"
                                  margin="normal"
                                  variant="outlined"
                                  id={`tare_weight_${index}`}
                                  name={`container_nos[${index}].tare_weight`}
                                  value={container.tare_weight}
                                  onChange={(e) =>
                                    handleTareWeightChange(e, index, formik)
                                  }
                                />
                              </div>
                            </Col>
                            <Col xs={12} md={2}>
                              <div className="job-detail-input-container">
                                <strong>Actual Weight:&nbsp;</strong>
                                <TextField
                                  fullWidth
                                  size="small"
                                  margin="normal"
                                  variant="outlined"
                                  id={`actual_weight_${index}`}
                                  name={`container_nos[${index}].actual_weight`}
                                  value={container.actual_weight}
                                  onChange={(e) =>
                                    handleActualWeightChange(e, index, formik)
                                  }
                                  InputProps={{
                                    readOnly: true,
                                  }}
                                />
                              </div>
                            </Col>
                            <Col xs={12} md={3}>
                              <div className="job-detail-input-container">
                                <strong>Gross Weight as per Document:&nbsp;</strong>
                                <TextField
                                  fullWidth
                                  size="small"
                                  margin="normal"
                                  variant="outlined"
                                  id={`container_gross_weight_${index}`}
                                  name={`container_nos[${index}].container_gross_weight`}
                                  value={container.container_gross_weight}
                                  onChange={(e) =>
                                    handleGrossWeightAsPerDocumentChange(
                                      e,
                                      index,
                                      formik
                                    )
                                  }
                                  InputProps={{
                                    readOnly: true,
                                  }}
                                />
                              </div>
                            </Col>
                            <Col xs={12} md={3}>
                              <div className="job-detail-input-container">
                                <strong>Weight as per Document:&nbsp;</strong>
                                <TextField
                                  fullWidth
                                  size="small"
                                  margin="normal"
                                  variant="outlined"
                                  id={`net_weight_${index}`}
                                  name={`container_nos[${index}].net_weight`}
                                  value={container.net_weight}
                                  onChange={(e) =>
                                    handleWeightAsPerDocumentChange(
                                      e,
                                      index,
                                      formik
                                    )
                                  }
                                  InputProps={{
                                    readOnly: true,
                                  }}
                                />
                              </div>
                            </Col>

                            <Col
                              xs={12}
                              md={3}
                              style={{ display: "flex", alignItems: "center" }}
                            >
                              <div
                                className="job-detail-input-container"
                                style={{
                                  backgroundColor:
                                    container.weight_shortage < 0
                                      ? "red"
                                      : "transparent",
                                  padding: "5px",
                                  borderRadius: "4px",
                                  color:
                                    container.weight_shortage < 0
                                      ? "white"
                                      : "inherit",
                                }}
                              >
                                <strong>Weight Excess/Shortage:&nbsp;</strong>
                                {container.physical_weight &&
                                  container.tare_weight ? (
                                  <>{container.weight_shortage || ""}</>
                                ) : (
                                  ""
                                )}
                              </div>
                            </Col>
                          </Row>

                          <Row className="job-detail-row">
                            {data.custom_house !== "ICD SACHANA" &&
                              data.custom_house !== "ICD SANAND" && (
                                <Col xs={12} md={4}>
                                  <div className="job-detail-input-container">
                                    <strong>Pre Weighment:&nbsp;</strong>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      margin="normal"
                                      variant="outlined"
                                      id={`pre_weighment_${index}`}
                                      name={`container_nos[${index}].pre_weighment`}
                                      label=""
                                      value={container.pre_weighment}
                                      onChange={formik.handleChange}
                                    />
                                  </div>
                                </Col>
                              )}
                            <Col xs={12} md={4}>
                              <div className="job-detail-input-container">
                                <strong>Post Weighment:&nbsp;</strong>
                                <TextField
                                  fullWidth
                                  size="small"
                                  margin="normal"
                                  variant="outlined"
                                  id={`post_weighment_${index}`}
                                  name={`container_nos[${index}].post_weighment`}
                                  label=""
                                  value={container.post_weighment}
                                  onChange={formik.handleChange}
                                />
                              </div>
                            </Col>
                          </Row>

                          <Row>
                            <Col xs={6}>
                              <FileUpload
                                label="Upload Weighment Slip"
                                bucketPath="weighment_slip_images"
                                onFilesUploaded={(uploadedFiles) =>
                                  handleFileUpload(
                                    uploadedFiles,
                                    container.container_number,
                                    "weighment_slip_images"
                                  )
                                }
                              />
                              <ImagePreview
                                images={container.weighment_slip_images || []}
                                onDeleteImage={(index) =>
                                  handleDeleteImage(
                                    index,
                                    container.container_number,
                                    "weighment_slip_images"
                                  )
                                }
                              />
                            </Col>

                            <Col xs={6}>
                              <FileUpload
                                label="Upload Container Pre-Damage Images"
                                bucketPath="container_pre_damage_images"
                                onFilesUploaded={(uploadedFiles) =>
                                  handleFileUpload(
                                    uploadedFiles,
                                    container.container_number,
                                    "container_pre_damage_images"
                                  )
                                }
                              />
                              <ImagePreview
                                images={container.container_pre_damage_images || []}
                                onDeleteImage={(index) =>
                                  handleDeleteImage(
                                    index,
                                    container.container_number,
                                    "container_pre_damage_images"
                                  )
                                }
                              />
                            </Col>
                          </Row>

                          <Row>
                            {/* Container Images */}
                            <Col xs={6}>
                              <FileUpload
                                label="Upload Container Images"
                                bucketPath="container_images"
                                onFilesUploaded={(uploadedFiles) =>
                                  handleFileUpload(
                                    uploadedFiles,
                                    container.container_number,
                                    "container_images"
                                  )
                                }
                              />
                              <ImagePreview
                                images={container.container_images || []}
                                onDeleteImage={(index) =>
                                  handleDeleteImage(
                                    index,
                                    container.container_number,
                                    "container_images"
                                  )
                                }
                              />
                            </Col>

                            {/* Loose Material Images */}
                            <Col xs={6}>
                              <FileUpload
                                label="Upload Loose Material Images"
                                bucketPath="loose_material"
                                onFilesUploaded={(uploadedFiles) =>
                                  handleFileUpload(
                                    uploadedFiles,
                                    container.container_number,
                                    "loose_material"
                                  )
                                }
                              />
                              <ImagePreview
                                images={container.loose_material || []}
                                onDeleteImage={(index) =>
                                  handleDeleteImage(
                                    index,
                                    container.container_number,
                                    "loose_material"
                                  )
                                }
                              />
                            </Col>
                          </Row>

                          <Row>
                            {/* Examination Videos */}
                            <Col xs={6}>
                              <FileUpload
                                label="Upload Examination Videos"
                                bucketPath="examination_videos"
                                onFilesUploaded={(uploadedFiles) =>
                                  handleFileUpload(
                                    uploadedFiles,
                                    container.container_number,
                                    "examination_videos"
                                  )
                                }
                              />
                              <ImagePreview
                                images={container.examination_videos || []}
                                onDeleteImage={(index) =>
                                  handleDeleteImage(
                                    index,
                                    container.container_number,
                                    "examination_videos"
                                  )
                                }
                              />
                            </Col>
                          </Row>
                        </div>
                      </div>
                    );
                  })()}
                </Col>
              </Row>
            </div>
          )}

          <Row style={{ margin: "20px 0" }}>
            <Col>
              <button
                type="submit"
                className="btn sticky-btn"
                style={{ float: "right", margin: "0px 20px" }}
                aria-label="submit-btn"
              >
                Submit
              </button>
            </Col>
          </Row>
        </form>
      )}

      <Snackbar
        open={snackbar || fileSnackbar}
        message={
          snackbar ? "Copied to clipboard" : "File uploaded successfully!"
        }
        sx={{ left: "auto !important", right: "24px !important" }}
      />
    </>
  );
}

export default ViewOperationsJob;
