// SubmissionJob.js
import React, { useState, useEffect, useRef, useContext } from "react";
import {
  TextField,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { Formik, Form, Field, ErrorMessage, useFormikContext } from "formik";
import * as Yup from "yup"; // For form validation
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import JobDetailsRowHeading from "../import-dsr/JobDetailsRowHeading";
import { Row, Col } from "react-bootstrap";
import { UserContext } from "../../contexts/UserContext";
import FileUpload from "../../components/gallery/FileUpload.js";
import ImagePreview from "../../components/gallery/ImagePreview.js";

// Utility function to get current local datetime in ISO format (YYYY-MM-DDTHH:MM)
const getCurrentLocalDateTime = () => {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000; // in milliseconds
  const localISOTime = new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);
  return localISOTime;
};

// Validation Schema (Optional but recommended)
const SubmissionJobSchema = Yup.object().shape({
  // Define validation rules as needed
  // Example:
  // be_no: Yup.string().trim().required("Bill of Entry No. is required"),
  // Additional validation rules can be added here
});

// Custom component to watch and update 'submission_completed_date_time'
const SubmissionCompletedWatcher = () => {
  const { values, setFieldValue } = useFormikContext();

  useEffect(() => {
    const {
      verified_checklist_upload_date_and_time,
      job_sticker_upload_date_and_time,
      submission_completed_date_time,
    } = values;

    if (
      verified_checklist_upload_date_and_time &&
      job_sticker_upload_date_and_time
    ) {
      if (!submission_completed_date_time) {
        const currentDateTime = getCurrentLocalDateTime();
        setFieldValue("submission_completed_date_time", currentDateTime);
      }
    } else {
      if (submission_completed_date_time) {
        setFieldValue("submission_completed_date_time", "");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    values.verified_checklist_upload_date_and_time,
    values.job_sticker_upload_date_and_time,
    values.submission_completed_date_time,
    setFieldValue,
  ]);

  return null; // This component doesn't render anything
};

const SubmissionJob = () => {
  const { job_no, year } = useParams();
  const bl_no_ref = useRef();
  const [data, setData] = useState(null);
  const [verifiedChecklistUploads, setVerifiedChecklistUploads] = useState([]);
  const [jobStickerUploads, setJobStickerUploads] = useState([]);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const extractFileName = (url) => {
    try {
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
    } catch (error) {
      console.error("Failed to extract file name:", error);
      return url; // Fallback to original URL
    }
  };

  useEffect(() => {
    fetchJobDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job_no, year]);

  const fetchJobDetails = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-job/${year}/${job_no}`
      );
      setData(response.data);
      // Initialize uploads if data exists
      if (response.data.checklist) {
        setVerifiedChecklistUploads(response.data.checklist);
      }
      if (response.data.job_sticker_upload) {
        setJobStickerUploads(response.data.job_sticker_upload);
      }
    } catch (error) {
      console.error("Error fetching job details:", error);
      alert("Failed to fetch job details. Please try again later.");
    }
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      // Prepare the payload
      const payload = {
        be_no: values.be_no,
        checklist: verifiedChecklistUploads,
        verified_checklist_upload_date_and_time:
          values.verified_checklist_upload_date_and_time,
        submission_completed_date_time: values.submission_completed_date_time,
        job_sticker_upload: jobStickerUploads,
        job_sticker_upload_date_and_time:
          values.job_sticker_upload_date_and_time,
        be_date: values.be_date,
      };

      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/update-submission-job/${data._id}`,
        payload
      );

      // Optionally, show a success message
      // alert("Job details updated successfully!");
      navigate("/submission");
      await fetchJobDetails();
    } catch (error) {
      console.error("Error updating job details:", error);
      // Optionally, show an error message
      // alert("Failed to update job details. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifiedChecklistFilesUploaded = (files) => {
    // Assuming FileUpload returns an array of URLs
    setVerifiedChecklistUploads([...verifiedChecklistUploads, ...files]);
  };

  const handleJobStickerFilesUploaded = (files) => {
    // Assuming FileUpload returns an array of URLs
    setJobStickerUploads([...jobStickerUploads, ...files]);
  };

  const handleDeleteVerifiedChecklist = (index) => {
    setVerifiedChecklistUploads(
      verifiedChecklistUploads.filter((_, i) => i !== index)
    );
  };

  const handleDeleteJobSticker = (index) => {
    setJobStickerUploads(jobStickerUploads.filter((_, i) => i !== index));
  };

  const renderDocuments = (documents, type) => {
    if (!documents || documents.length === 0) {
      return <p>No {type} uploaded yet.</p>;
    }

    return (
      <Box display="flex" flexWrap="wrap" gap={2} mt={2}>
        {documents.map((doc, index) => (
          <Box
            key={index}
            sx={{
              border: "1px solid #ccc",
              padding: "10px",
              borderRadius: "5px",
              flex: "1 1 30%",
              maxWidth: "30%",
              minWidth: "250px",
              maxHeight: "150px",
              overflowY: "auto",
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: "bold",
                textAlign: "center",
                backgroundColor: "#333",
                color: "#fff",
                padding: "5px",
                borderRadius: "5px 5px 0 0",
                position: "sticky",
                top: 0,
                zIndex: 1,
              }}
            >
              {doc.document_name || `Document ${index + 1}`} (
              {doc.document_code})
            </Typography>
            <Box mt={2}>
              {doc.url.map((url, imgIndex) => (
                <div
                  key={imgIndex}
                  style={{
                    marginBottom: "10px",
                    paddingBottom: "5px",
                    borderBottom: "1px solid #ccc",
                  }}
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", color: "blue" }}
                  >
                    {extractFileName(url)}
                  </a>
                </div>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
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
    <div>
      {data !== null ? (
        <>
          <JobDetailsStaticData
            data={data}
            bl_no_ref={bl_no_ref}
            params={{ job_no, year }}
          />

          <div className="job-details-container">
            <JobDetailsRowHeading heading="CTH Documents" />
            {renderDocuments(data.cth_documents, "CTH Documents")}
          </div>
          <div className="job-details-container">
            <JobDetailsRowHeading heading="All Documents" />
            {renderAllDocuments(data.all_documents)}
          </div>
          <Formik
            initialValues={{
              be_no: data.be_no || "",
              verified_checklist_upload_date_and_time:
                data.verified_checklist_upload_date_and_time || "",
              submission_completed_date_time:
                data.submission_completed_date_time || "",
              job_sticker_upload_date_and_time:
                data.job_sticker_upload_date_and_time || "",
              be_date: data.be_date || "",
            }}
            validationSchema={SubmissionJobSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue, isSubmitting }) => (
              <Form>
                {/* Include the SubmissionCompletedWatcher here */}
                <SubmissionCompletedWatcher />

                <div className="job-details-container">
                  <JobDetailsRowHeading heading="Approved and Verification" />

                  <Row>
                    {/* Verified Checklist Upload Section */}
                    <Col xs={12} lg={4}>
                      <div>
                        <FileUpload
                          label="Verified Checklist Upload"
                          bucketPath="verified-checklists" // Removed backticks
                          onFilesUploaded={handleVerifiedChecklistFilesUploaded}
                          multiple={true}
                        />
                        <ImagePreview
                          images={verifiedChecklistUploads}
                          onDeleteImage={(image) => {
                            handleDeleteVerifiedChecklist(image);

                            // Clear the date and time field if no uploads remain
                            if (verifiedChecklistUploads.length === 1) {
                              // 1 because the image will be deleted next
                              setFieldValue(
                                "verified_checklist_upload_date_and_time",
                                ""
                              );
                            }
                          }}
                          readOnly={false}
                        />
                      </div>
                    </Col>

                    {/* Verified Checklist Date and Time Section */}
                    <Col xs={12} lg={4}>
                      <div>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={
                                !!values.verified_checklist_upload_date_and_time
                              }
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                if (isChecked) {
                                  const currentDateTime =
                                    getCurrentLocalDateTime();
                                  setFieldValue(
                                    "verified_checklist_upload_date_and_time",
                                    currentDateTime
                                  );
                                } else {
                                  setFieldValue(
                                    "verified_checklist_upload_date_and_time",
                                    ""
                                  );
                                }
                              }}
                              disabled={verifiedChecklistUploads.length === 0} // Disable checkbox if no uploads
                            />
                          }
                          label="Verified Checklist Upload Approved Date"
                        />
                        {values.verified_checklist_upload_date_and_time && (
                          <strong>
                            {new Date(
                              values.verified_checklist_upload_date_and_time
                            ).toLocaleString("en-US", {
                              timeZone: "Asia/Kolkata",
                              hour12: true,
                            })}
                          </strong>
                        )}
                      </div>
                      {user.role === "Admin" && (
                        <div>
                          <strong>
                            Verified Checklist Upload Date and Time:
                          </strong>
                          <Field
                            as={TextField}
                            fullWidth
                            size="small"
                            margin="normal"
                            variant="outlined"
                            type="datetime-local"
                            id="verified_checklist_upload_date_and_time"
                            name="verified_checklist_upload_date_and_time"
                            value={
                              values.verified_checklist_upload_date_and_time ||
                              ""
                            }
                            onChange={(e) => {
                              setFieldValue(
                                "verified_checklist_upload_date_and_time",
                                e.target.value
                              );
                            }}
                            InputLabelProps={{
                              shrink: true,
                            }}
                          />
                          <ErrorMessage
                            name="verified_checklist_upload_date_and_time"
                            component="div"
                            style={{ color: "red" }}
                          />
                        </div>
                      )}
                    </Col>

                    {/* Bill of Entry No. Section */}
                    <Col xs={12} lg={2}>
                      <div>
                        <Field
                          as={TextField}
                          fullWidth
                          size="small"
                          margin="normal"
                          variant="outlined"
                          id="be_no"
                          name="be_no"
                          label="Bill of Entry No."
                          InputLabelProps={{ shrink: true }}
                        />
                        <ErrorMessage
                          name="be_no"
                          component="div"
                          style={{ color: "red" }}
                        />
                      </div>
                    </Col>
                    <Col xs={12} lg={2}>
                      <div>
                        <Field
                          as={TextField}
                          fullWidth
                          size="small"
                          margin="normal"
                          variant="outlined"
                          type="date" // Changed from "datetime-local" to "date"
                          id="be_date"
                          name="be_date"
                          value={values.be_date || ""}
                          onChange={(e) => {
                            setFieldValue("be_date", e.target.value);
                          }}
                          label="Bill of Entry Date"
                          InputLabelProps={{ shrink: true }}
                        />
                      </div>
                    </Col>
                  </Row>

                  <br />

                  {/* <Row> */}
                  {/* Job Sticker Upload Section */}
                  {/* <Col xs={12} lg={4}>
                      <div>
                        <FileUpload
                          label="Job Sticker Upload"
                          bucketPath="job-sticker" // Removed backticks
                          onFilesUploaded={handleJobStickerFilesUploaded}
                          multiple={true}
                        />
                        <ImagePreview
                          images={jobStickerUploads}
                          onDeleteImage={(image) => {
                            handleDeleteJobSticker(image);

                            // Clear the date and time field if no uploads remain
                            if (jobStickerUploads.length === 1) {
                              // 1 because the image will be deleted next
                              setFieldValue(
                                "job_sticker_upload_date_and_time",
                                ""
                              );
                            }
                          }}
                          readOnly={false}
                        />
                      </div>
                    </Col> */}

                  {/* Job Sticker Date and Time Section */}
                  {/* <Col xs={12} lg={4}>
                      <div>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={
                                !!values.job_sticker_upload_date_and_time
                              }
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                if (isChecked) {
                                  const currentDateTime =
                                    getCurrentLocalDateTime();
                                  setFieldValue(
                                    "job_sticker_upload_date_and_time",
                                    currentDateTime
                                  );
                                } else {
                                  setFieldValue(
                                    "job_sticker_upload_date_and_time",
                                    ""
                                  );
                                }
                              }}
                              disabled={jobStickerUploads.length === 0} // Disable checkbox if no uploads
                            />
                          }
                          label="Job Sticker Upload Approved Date"
                        />
                        {values.job_sticker_upload_date_and_time && (
                          <strong>
                            {new Date(
                              values.job_sticker_upload_date_and_time
                            ).toLocaleString("en-US", {
                              timeZone: "Asia/Kolkata",
                              hour12: true,
                            })}
                          </strong>
                        )}
                      </div>
                      {user.role === "Admin" && (
                        <div>
                          <strong>Job Sticker Upload Date and Time:</strong>
                          <Field
                            as={TextField}
                            fullWidth
                            size="small"
                            margin="normal"
                            variant="outlined"
                            type="datetime-local"
                            id="job_sticker_upload_date_and_time"
                            name="job_sticker_upload_date_and_time"
                            value={
                              values.job_sticker_upload_date_and_time || ""
                            }
                            onChange={(e) => {
                              setFieldValue(
                                "job_sticker_upload_date_and_time",
                                e.target.value
                              );
                            }}
                            InputLabelProps={{
                              shrink: true,
                            }}
                          />
                          <ErrorMessage
                            name="job_sticker_upload_date_and_time"
                            component="div"
                            style={{ color: "red" }}
                          />
                        </div>
                      )}
                    </Col> */}
                  {/* </Row> */}
                </div>

                <div className="job-details-container">
                  <JobDetailsRowHeading heading="Submission Completed" />
                  <Row>
                    {/* Submission Completed Date/Time Section */}
                    <Col xs={12} lg={4}>
                      <div>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={!!values.submission_completed_date_time}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                if (isChecked) {
                                  const currentDateTime =
                                    getCurrentLocalDateTime();
                                  setFieldValue(
                                    "submission_completed_date_time",
                                    currentDateTime
                                  );
                                } else {
                                  setFieldValue(
                                    "submission_completed_date_time",
                                    ""
                                  );
                                }
                              }}
                              disabled={
                                !values.verified_checklist_upload_date_and_time
                              } // Disable if conditions are not met
                            />
                          }
                          label="Submission Completed Date/Time"
                        />

                        {values.submission_completed_date_time && (
                          <strong>
                            {new Date(
                              values.submission_completed_date_time
                            ).toLocaleString("en-US", {
                              timeZone: "Asia/Kolkata",
                              hour12: true,
                            })}
                          </strong>
                        )}
                      </div>
                    </Col>
                    <Col xs={12} lg={4}>
                      {user.role === "Admin" && (
                        <div>
                          <strong>Submission Completed Date and Time:</strong>
                          <Field
                            as={TextField}
                            fullWidth
                            size="small"
                            margin="normal"
                            variant="outlined"
                            type="datetime-local"
                            id="submission_completed_date_time"
                            name="submission_completed_date_time"
                            value={values.submission_completed_date_time || ""}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              if (newValue) {
                                setFieldValue(
                                  "submission_completed_date_time",
                                  newValue
                                );
                              } else {
                                setFieldValue(
                                  "submission_completed_date_time",
                                  ""
                                );
                              }
                            }}
                            InputLabelProps={{
                              shrink: true,
                            }}
                            disabled={
                              !values.verified_checklist_upload_date_and_time
                            } // Ensure input is disabled when necessary
                          />
                          <ErrorMessage
                            name="submission_completed_date_time"
                            component="div"
                            style={{ color: "red" }}
                          />
                        </div>
                      )}
                    </Col>
                  </Row>
                </div>
                <button
                  className="btn sticky-btn"
                  type="submit"
                  style={{ float: "right", margin: "10px" }}
                  aria-label="submit-btn"
                  disabled={isSubmitting}
                >
                  Submit
                </button>
              </Form>
            )}
          </Formik>
        </>
      ) : (
        <p>Loading job details...</p>
      )}
    </div>
  );
};

export default SubmissionJob;
