import axios from "axios";
import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import Snackbar from "@mui/material/Snackbar";
import { TextField, Checkbox, Box } from "@mui/material";
import { Row, Col } from "react-bootstrap";
import FileUpload from "../../components/gallery/FileUpload.js";
import ImagePreview from "../../components/gallery/ImagePreview.js";
import { useFormik } from "formik";
import { UserContext } from "../../contexts/UserContext";

function ViewESanchitJob() {
  const [snackbar, setSnackbar] = useState(false);
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const [data, setData] = useState({ cth_documents: [] });
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  // Fetch data
  useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-esanchit-job/${params.job_no}/${params.year}`
        );
        setData(res.data || { cth_documents: [] });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
    getData();
  }, [params.job_no, params.year]);

  // Formik setup
  const formik = useFormik({
    initialValues: {
      cth_documents: data.cth_documents || [],
      queries: data.eSachitQueries || [{ query: "", reply: "" }], // Initialize from `eSachitQueries` in data
      esanchit_completed_date_time: data.esanchit_completed_date_time || "", // Default to an empty string if not present
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        const formattedData = {
          cth_documents: values.cth_documents,
          eSachitQueries: values.queries, // Send queries as `eSachitQueries`
          esanchit_completed_date_time:
            values.esanchit_completed_date_time || "", // Send `null` if cleared
        };

        await axios.patch(
          `${process.env.REACT_APP_API_STRING}/update-esanchit-job/${params.job_no}/${params.year}`,
          formattedData
        );
        setSnackbar(true);
        navigate("/e-sanchit");
      } catch (error) {
        console.error("Error updating job:", error);
      }
    },
  });

  const renderAllDocuments = (documents) => {
    if (!documents || documents.length === 0) {
      return <p>No documents uploaded yet.</p>;
    }

    return (
      <Box
        display="flex"
        flexWrap="wrap"
        gap={2}
        mt={2}
        sx={{
          justifyContent: "flex-start", // Center items on smaller devices
        }}
      >
        {documents.map((url, index) => (
          <Box
            key={index}
            sx={{
              border: "1px solid #ccc",
              padding: "10px",
              borderRadius: "5px",
              flex: "1 1 30%", // Flex-basis for 3 columns
              maxWidth: "30%", // Ensure proper width
              minWidth: "250px", // Minimum width for smaller devices
            }}
          >
            {/* <Typography
              variant="subtitle1"
              sx={{
                fontWeight: "bold",
                textAlign: "center",
                backgroundColor: "#333",
                color: "#fff",
                padding: "5px",
                borderRadius: "5px 5px 0 0",
              }}
            >
              Document {index + 1}
            </Typography> */}
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
  const extractFileName = (url) => {
    try {
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
    } catch (error) {
      console.error("Failed to extract file name:", error);
      return url; // Fallback to original URL
    }
  };
  // Check if all Approved checkboxes are true
  // Check if all Approved checkboxes are true and all IRN numbers are non-empty strings
  // const areAllApproved = () => {
  //   return formik.values.cth_documents.every(
  //     (doc) =>
  //       !!doc.document_check_date && // Approved checkbox is checked (non-empty date)
  //       !!doc.irn && // IRN is a non-empty string
  //       doc.irn.trim() !== "" // IRN is not just whitespace
  //   );
  // };

  // Auto-update `esanchit_completed_date_time` based on Approved status and IRN validation
  // useEffect(() => {
  //   if (areAllApproved()) {
  //     const currentDateTime = new Date(
  //       Date.now() - new Date().getTimezoneOffset() * 60000
  //     )
  //       .toISOString()
  //       .slice(0, 16);
  //     formik.setFieldValue("esanchit_completed_date_time", currentDateTime);
  //   } else {
  //     formik.setFieldValue("esanchit_completed_date_time", "");
  //   }
  // }, [formik.values.cth_documents]);

  return (
    <form onSubmit={formik.handleSubmit}>
      <div style={{ margin: "20px 0" }}>
        {data && (
          <>
            <JobDetailsStaticData
              data={data}
              params={params}
              setSnackbar={setSnackbar}
            />
            <div className="job-details-container">
              <h4>Documents</h4>
              {formik.values.cth_documents?.map((document, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "20px",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                  }}
                >
                  <Row className="align-items-center">
                    {/* File Upload & Image Preview */}
                    <Col xs={12} lg={4}>
                      <FileUpload
                        label={`Upload Files for ${document.document_name} (${document.document_code})`}
                        bucketPath={`cth-documents/${document.document_name}`}
                        onFilesUploaded={(newFiles) => {
                          const updatedDocuments = [
                            ...formik.values.cth_documents,
                          ];
                          const documentUrls =
                            updatedDocuments[index]?.url || [];
                          updatedDocuments[index].url = [
                            ...documentUrls,
                            ...newFiles,
                          ];
                          formik.setFieldValue(
                            "cth_documents",
                            updatedDocuments
                          );
                          setFileSnackbar(true);
                        }}
                        multiple={true}
                      />
                      <ImagePreview
                        images={document.url || []}
                        onDeleteImage={(fileIndex) => {
                          const updatedDocuments = [
                            ...formik.values.cth_documents,
                          ];
                          const documentUrls = [...updatedDocuments[index].url];
                          documentUrls.splice(fileIndex, 1);
                          updatedDocuments[index].url = documentUrls;
                          formik.setFieldValue(
                            "cth_documents",
                            updatedDocuments
                          );
                        }}
                        readOnly={false}
                      />
                    </Col>

                    {/* IRN Input */}
                    <Col xs={12} lg={4}>
                      <TextField
                        size="small"
                        label="IRN"
                        name={`cth_documents[${index}].irn`}
                        value={formik.values.cth_documents[index]?.irn || ""}
                        onChange={formik.handleChange}
                        fullWidth
                      />
                    </Col>

                    <Col xs={12} lg={4}>
                      <div>
                        <Checkbox
                          checked={
                            !!formik.values.cth_documents[index]
                              ?.document_check_date
                          }
                          onChange={() => {
                            const updatedDocuments = [
                              ...formik.values.cth_documents,
                            ];
                            if (updatedDocuments[index].document_check_date) {
                              // Clear the date-time when checkbox is unchecked
                              updatedDocuments[index].document_check_date = "";
                            } else {
                              // Set current date-time when checkbox is checked
                              updatedDocuments[index].document_check_date =
                                new Date(
                                  Date.now() -
                                    new Date().getTimezoneOffset() * 60000
                                )
                                  .toISOString()
                                  .slice(0, 16);
                            }
                            formik.setFieldValue(
                              "cth_documents",
                              updatedDocuments
                            );
                          }}
                        />
                        <strong>Approved Date</strong>
                        {formik.values.cth_documents[index]
                          ?.document_check_date && (
                          <span
                            style={{ marginLeft: "10px", fontWeight: "bold" }}
                          >
                            {new Date(
                              formik.values.cth_documents[
                                index
                              ]?.document_check_date
                            ).toLocaleString("en-US", {
                              timeZone: "Asia/Kolkata",
                              hour12: true,
                            })}
                          </span>
                        )}
                      </div>
                      {user.role === "Admin" && (
                        <TextField
                          fullWidth
                          size="small"
                          type="datetime-local"
                          name={`cth_documents[${index}].document_check_date`}
                          value={
                            formik.values.cth_documents[index]
                              ?.document_check_date || ""
                          }
                          onChange={(e) => {
                            const updatedDocuments = [
                              ...formik.values.cth_documents,
                            ];
                            updatedDocuments[index].document_check_date =
                              e.target.value;
                            formik.setFieldValue(
                              "cth_documents",
                              updatedDocuments
                            );
                          }}
                          InputLabelProps={{
                            shrink: true,
                          }}
                        />
                      )}
                    </Col>
                  </Row>
                </div>
              ))}
            </div>

            <div className="job-details-container">
              <h4>All Documents</h4>
              {renderAllDocuments(data.all_documents)}
            </div>

            <div className="job-details-container">
              <h4>Queries</h4>
              {formik.values.queries.map((item, id) => (
                <Row key={id}>
                  <Col xs={12} lg={5}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      size="small"
                      label="Query"
                      name={`queries[${id}].query`}
                      value={item.query}
                      onChange={formik.handleChange}
                    />
                  </Col>
                  <Col xs={12} lg={5}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      size="small"
                      label="Reply"
                      name={`queries[${id}].reply`}
                      value={item.reply}
                      onChange={formik.handleChange}
                      InputProps={{
                        readOnly: true, // Make the field read-only
                      }}
                    />
                  </Col>
                </Row>
              ))}
              <button
                type="button"
                onClick={() =>
                  formik.setFieldValue("queries", [
                    ...formik.values.queries,
                    { query: "", reply: "" },
                  ])
                }
                className="btn"
              >
                Add Query
              </button>
            </div>

            {/* <div className="job-details-container">
              <h4>All Cleared E-Sanchit</h4>
              <Row>
                <Col xs={12} lg={6}>
                  <div
                    className="job-detail-input-container"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <strong>E-Sanchit Completed:&nbsp;</strong>
                    <Checkbox
                      checked={!!formik.values.esanchit_completed_date_time}
                      disabled // Automatically handled; no manual interaction
                    />
                    {formik.values.esanchit_completed_date_time && (
                      <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                        {new Date(
                          formik.values.esanchit_completed_date_time
                        ).toLocaleString("en-US", {
                          timeZone: "Asia/Kolkata",
                          hour12: true,
                        })}
                      </span>
                    )}
                  </div>
                </Col>
                {user.role === "Admin" && (
                  <Col xs={12} lg={6}>
                    <div
                      className="job-detail-input-container"
                      style={{ justifyContent: "flex-start" }}
                    >
                      <strong>E-Sanchit Completed Date/Time:&nbsp;</strong>
                      <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        variant="outlined"
                        type="datetime-local"
                        id="esanchit_completed_date_time"
                        name="esanchit_completed_date_time"
                        value={formik.values.esanchit_completed_date_time || ""}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          if (!newValue) {
                            formik.setFieldValue(
                              "esanchit_completed_date_time",
                              ""
                            );
                          } else {
                            formik.setFieldValue(
                              "esanchit_completed_date_time",
                              newValue
                            );
                          }
                        }}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        disabled={!areAllApproved()} // Allow manual override only if all approved
                      />
                    </div>
                  </Col>
                )}
              </Row>
            </div> */}

            <div className="job-details-container">
              <h4>All Cleared E-Sanchit</h4>
              <Row>
                <Col xs={12} lg={6}>
                  <div
                    className="job-detail-input-container"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <strong>E-Sanchit Completed:&nbsp;</strong>
                    <Checkbox
                      checked={!!formik.values.esanchit_completed_date_time} // True if value exists
                      onChange={() => {
                        if (formik.values.esanchit_completed_date_time) {
                          // If already set, clear the value
                          formik.setFieldValue(
                            "esanchit_completed_date_time",
                            ""
                          );
                        } else {
                          // Set the current date and time in ISO format
                          const currentDateTime = new Date(
                            Date.now() - new Date().getTimezoneOffset() * 60000
                          )
                            .toISOString()
                            .slice(0, 16);
                          formik.setFieldValue(
                            "esanchit_completed_date_time",
                            currentDateTime
                          );
                        }
                      }}
                    />
                    {formik.values.esanchit_completed_date_time && (
                      <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                        {new Date(
                          formik.values.esanchit_completed_date_time
                        ).toLocaleString("en-US", {
                          timeZone: "Asia/Kolkata",
                          hour12: true,
                        })}
                      </span>
                    )}
                  </div>
                </Col>

                {user.role === "Admin" && (
                  <Col xs={12} lg={6}>
                    <div
                      className="job-detail-input-container"
                      style={{ justifyContent: "flex-start" }}
                    >
                      <strong>E-Sanchit Completed Date/Time:&nbsp;</strong>
                      <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        variant="outlined"
                        type="datetime-local"
                        id="esanchit_completed_date_time"
                        name="esanchit_completed_date_time"
                        value={formik.values.esanchit_completed_date_time || ""}
                        onChange={(e) => {
                          formik.setFieldValue(
                            "esanchit_completed_date_time",
                            e.target.value
                          );
                        }}
                        InputLabelProps={{
                          shrink: true,
                        }}
                      />
                    </div>
                  </Col>
                )}
              </Row>
            </div>

            <button
              className="btn sticky-btn"
              style={{ float: "right", margin: "20px" }}
              type="submit"
            >
              Submit
            </button>
            {/* <Snackbar
              open={snackbar || fileSnackbar}
              message={
                snackbar
                  ? "Submitted successfully!"
                  : "File uploaded successfully!"
              }
              sx={{ left: "auto !important", right: "24px !important" }}
              onClose={() => {
                setSnackbar(false);
                setFileSnackbar(false);
              }}
            /> */}
          </>
        )}
      </div>
    </form>
  );
}

export default ViewESanchitJob;
