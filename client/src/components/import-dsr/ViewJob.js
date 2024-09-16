import React, { useState, useRef, useContext } from "react";
import { Row, Col } from "react-bootstrap";
import { useParams } from "react-router-dom";
import { IconButton, TextField, Autocomplete } from "@mui/material";
import MenuItem from "@mui/material/MenuItem";
import "../../styles/job-details.scss";
import useFetchJobDetails from "../../customHooks/useFetchJobDetails";
import Checkbox from "@mui/material/Checkbox";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Snackbar from "@mui/material/Snackbar";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import AWS from "aws-sdk";
import { handleFileUpload } from "../../utils/awsFileUpload";
import { handleCopyContainerNumber } from "../../utils/handleCopyContainerNumber";
import JobDetailsStaticData from "./JobDetailsStaticData";
import JobDetailsRowHeading from "./JobDetailsRowHeading";
import FormGroup from "@mui/material/FormGroup";
import { TabValueContext } from "../../contexts/TabValueContext";
import { handleNetWeightChange } from "../../utils/handleNetWeightChange";
import { UserContext } from "../../contexts/UserContext";
import DeleteIcon from "@mui/icons-material/Delete";

function JobDetails() {
  const params = useParams();
  const { user } = useContext(UserContext);
  const { setTabValue } = React.useContext(TabValueContext);
  const options = Array.from({ length: 25 }, (_, index) => index);
  const [checked, setChecked] = useState(false);
  const [selectedRegNo, setSelectedRegNo] = useState();
  const [snackbar, setSnackbar] = useState(false);
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const bl_no_ref = useRef();
  const checklistRef = useRef();
  const processedBeAttachmentRef = useRef();
  const oocCopyRef = useRef();
  const gatePassCopyRef = useRef();
  const weighmentSlipRef = useRef();
  const container_number_ref = useRef([]);

  const {
    data,
    detentionFrom,
    formik,
    cthDocuments,
    handleFileChange,
    selectedDocuments,
    handleDocumentChange,
    handleAddDocument,
    handleRemoveDocument,
    filterDocuments,
  } = useFetchJobDetails(
    params,
    checked,
    setSelectedRegNo,
    setTabValue,
    setFileSnackbar
  );

  const handleRadioChange = (event) => {
    const selectedValue = event.target.value;

    if (selectedValue === "clear") {
      setSelectedRegNo("");
      formik.setFieldValue("sims_reg_no", "");
      formik.setFieldValue("pims_reg_no", "");
      formik.setFieldValue("nfmims_reg_no", "");
      formik.setFieldValue("sims_date", "");
      formik.setFieldValue("pims_date", "");
      formik.setFieldValue("nfmims_date", "");
    } else {
      setSelectedRegNo(selectedValue);
      formik.setFieldValue("sims_reg_no", "");
      formik.setFieldValue("pims_reg_no", "");
      formik.setFieldValue("nfmims_reg_no", "");
      formik.setFieldValue("sims_date", "");
      formik.setFieldValue("pims_date", "");
      formik.setFieldValue("nfmims_date", "");
    }
  };

  const handleBlStatusChange = (event) => {
    const selectedValue = event.target.value;

    if (selectedValue === "clear") {
      formik.setFieldValue("obl_telex_bl", "");
    } else {
      formik.setFieldValue("obl_telex_bl", selectedValue);
    }
  };

  const handleWeighmentSlip = async (e, container_number, fileType) => {
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
                Bucket: "alvision-exim-images",
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

  const handleTransporterChange = (e, index) => {
    if (e.target.checked === true) {
      formik.setFieldValue(`container_nos[${index}].transporter`, "SRCC");
    } else {
      formik.setFieldValue(`container_nos[${index}].transporter`, "");
    }
  };

  const handleAddContainer = () => {
    formik.setFieldValue("container_nos", [
      ...formik.values.container_nos,
      {
        container_number: "",
        size: "",
        arrival_date: "",
        do_validity_upto_container_level: "",
        do_revalidation_date: "",
        do_revalidation: [],
        physical_weight: "",
        tare_weight: "",
        actual_weight: "",
        net_weight: "",
        weight_shortage: "",
        transporter: "",
      },
    ]);
  };

  return (
    <>
      {data !== null && (
        <form onSubmit={formik.handleSubmit}>
          <JobDetailsStaticData
            data={data}
            params={params}
            bl_no_ref={bl_no_ref}
            setSnackbar={setSnackbar}
            container_nos={formik.values.container_nos}
          />

          <div className="job-details-container">
            <JobDetailsRowHeading heading="Documents" />
            <br />
            {cthDocuments?.map((doc, index) => (
              <Row key={index} className="document-upload">
                <Col xs={5}>
                  <strong>
                    {doc.document_name} ({doc.document_code})&nbsp;
                  </strong>
                </Col>
                <Col xs={3}>
                  <br />
                  <input
                    type="file"
                    multiple
                    onChange={(e) =>
                      handleFileChange(e, doc.document_name, index, true)
                    }
                  />

                  {doc.url && <a href={doc.url}>View</a>}
                </Col>
              </Row>
            ))}

            {selectedDocuments.map((selectedDocument, index) => (
              <Row key={index} style={{ marginTop: "20px" }}>
                <Col xs={5}>
                  <Autocomplete
                    options={filterDocuments(selectedDocuments, index)}
                    getOptionLabel={(doc) =>
                      `${doc.document_name} (${doc.document_code})`
                    }
                    value={selectedDocument || null} // Pass the whole selectedDocument object
                    onChange={(event, newValue) => {
                      handleDocumentChange(index, newValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Document"
                        size="small"
                        sx={{ width: 500 }}
                      />
                    )}
                  />
                </Col>
                <Col xs={3}>
                  <input
                    type="file"
                    multiple
                    onChange={(e) =>
                      handleFileChange(
                        e,
                        selectedDocument.document_name,
                        index,
                        false
                      )
                    }
                    disabled={!selectedDocument.document_code}
                  />
                  <br />
                  <br />
                  {selectedDocument.url && (
                    <a href={selectedDocument.url}>View</a>
                  )}
                </Col>

                <Col>
                  <IconButton
                    onClick={() => handleRemoveDocument(index)}
                    sx={{ color: "#BE3838" }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Col>
              </Row>
            ))}

            <button type="button" className="btn" onClick={handleAddDocument}>
              Add Document
            </button>
          </div>

          <div className="job-details-container">
            <JobDetailsRowHeading heading="Queries" />
            <br />
            {formik.values.do_queries.length > 0 &&
              formik.values.do_queries.map((item, id) => (
                <Row key={id}>
                  {id === 0 && <h5>DO Queries</h5>}

                  <Col xs={6}>{item.query}</Col>
                  <Col xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      id={`do_queries[${id}].reply`}
                      name={`do_queries[${id}].reply`}
                      label="Reply"
                      value={item.reply}
                      onChange={formik.handleChange}
                    />
                  </Col>
                </Row>
              ))}
            {formik.values.documentationQueries.length > 0 &&
              formik.values.documentationQueries.map((item, id) => (
                <Row key={id}>
                  <br />
                  {id === 0 && <h5>Documentation Queries</h5>}
                  <Col>{item.query}</Col>
                  <Col>
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      id={`documentationQueries[${id}].reply`}
                      name={`documentationQueries[${id}].reply`}
                      label="Reply"
                      value={item.reply}
                      onChange={formik.handleChange}
                    />
                  </Col>
                </Row>
              ))}
            {formik.values.eSachitQueries.length > 0 &&
              formik.values.eSachitQueries.map((item, id) => (
                <Row key={id}>
                  <br />
                  {id === 0 && <h5>E-Sanchit Queries</h5>}
                  <Col>{item.query}</Col>
                  <Col>
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      id={`eSachitQueries[${id}].reply`}
                      name={`eSachitQueries[${id}].reply`}
                      label="Reply"
                      value={item.reply}
                      onChange={formik.handleChange}
                    />
                  </Col>
                </Row>
              ))}
            {formik.values.submissionQueries.length > 0 &&
              formik.values.submissionQueries.map((item, id) => (
                <Row key={id}>
                  <br />
                  {id === 0 && <h5>Submission Queries</h5>}
                  <Col>{item.query}</Col>
                  <Col>
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      id={`submissionQueries[${id}].reply`}
                      name={`submissionQueries[${id}].reply`}
                      label="Reply"
                      value={item.reply}
                      onChange={formik.handleChange}
                    />
                  </Col>
                </Row>
              ))}
          </div>

          {/*************************** Row 8 ****************************/}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Description and Checklist" />
            <Row className="job-detail-row">
              <div className="job-detail-input-container">
                <strong>Description:&nbsp;</strong>
                <TextField
                  size="small"
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  id="description"
                  name="description"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                />
              </div>
              <div>
                <label htmlFor="checlist" className="btn">
                  Upload Checklist
                </label>
                <input
                  type="file"
                  multiple
                  name="checlist"
                  id="checlist"
                  onChange={(e) =>
                    handleFileUpload(
                      e,
                      "checklist",
                      "checklist",
                      formik,
                      setFileSnackbar
                    )
                  }
                  ref={checklistRef}
                  className="input-hidden"
                />

                {formik.values.checklist?.map((file, index) => {
                  return (
                    <div key={index}>
                      <br />
                      <a href={file}>{file}</a>
                    </div>
                  );
                })}
              </div>
            </Row>
          </div>
          {/*************************** Row 9 ****************************/}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Status" />
            <Row>
              <Col xs={12} lg={3}>
                <div className="job-detail-input-container">
                  <strong>Status:&nbsp;</strong>
                  <TextField
                    fullWidth
                    select
                    size="small"
                    margin="normal"
                    variant="outlined"
                    id="status"
                    name="status"
                    value={formik.values.status}
                    onChange={formik.handleChange}
                  >
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                    <MenuItem value="Cancelled">Cancelled</MenuItem>
                  </TextField>
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Detailed Status:&nbsp;</strong>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    id="detailed_status"
                    name="detailed_status"
                    value={formik.values.detailed_status}
                    onChange={formik.handleChange}
                  >
                    <MenuItem value="Estimated Time of Arrival">
                      Estimated Time of Arrival
                    </MenuItem>
                    <MenuItem value="Gateway IGM Filed">
                      Gateway IGM Filed
                    </MenuItem>
                    <MenuItem value="Discharged">Discharged</MenuItem>
                    <MenuItem value="BE Noted, Arrival Pending">
                      BE Noted, Arrival Pending
                    </MenuItem>
                    <MenuItem value="BE Noted, Clearance Pending">
                      BE Noted, Clearance Pending
                    </MenuItem>
                    <MenuItem value="Custom Clearance Completed">
                      Custom Clearance Completed
                    </MenuItem>
                  </TextField>
                </div>
              </Col>
            </Row>
            <Row>
              <Col>
                <FormControl>
                  <RadioGroup
                    row
                    aria-labelledby="demo-radio-buttons-group-label"
                    name="radio-buttons-group"
                    value={formik.values.obl_telex_bl}
                    onChange={handleBlStatusChange}
                  >
                    <FormControlLabel
                      value="OBL"
                      control={
                        <Radio checked={formik.values.obl_telex_bl === "OBL"} />
                      }
                      label="OBL"
                    />
                    <FormControlLabel
                      value="Telex"
                      control={
                        <Radio
                          checked={formik.values.obl_telex_bl === "Telex"}
                        />
                      }
                      label="Telex"
                    />
                    <FormControlLabel
                      value="Surrender BL"
                      control={
                        <Radio
                          checked={
                            formik.values.obl_telex_bl === "Surrender BL"
                          }
                        />
                      }
                      label="Surrender BL"
                    />
                    <FormControlLabel
                      value="clear"
                      control={<Radio />}
                      label="Clear"
                    />
                  </RadioGroup>
                </FormControl>
              </Col>
            </Row>
            <Row>
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>
                    {formik.values.obl_telex_bl === "OBL"
                      ? "Original Document Received Date:"
                      : "Document Received Date:"}
                  </strong>
                  &nbsp;
                  {formik.values.document_received_date}
                </div>
              </Col>

              {user.username === "manu_pillai" && (
                <Col xs={12} lg={4}>
                  <div
                    className="job-detail-input-container"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <strong>
                      {formik.values.obl_telex_bl === "OBL"
                        ? "Original Document Received Date:"
                        : "Document Received Date:"}
                    </strong>
                    &nbsp;
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      type="date"
                      id="document_received_date"
                      name="document_received_date"
                      value={formik.values.document_received_date}
                      onChange={formik.handleChange}
                    />
                  </div>
                </Col>
              )}
            </Row>
            <Row>
              <Col xs={12} lg={3}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>DO Planning:&nbsp;</strong>

                  <Checkbox
                    value={formik.values.doPlanning}
                    checked={formik.values.doPlanning}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      formik.setFieldValue("doPlanning", newValue);
                    }}
                  />
                  {formik.values.do_planning_date}
                </div>
              </Col>
              {user.username === "manu_pillai" && (
                <Col xs={12} lg={4}>
                  <div
                    className="job-detail-input-container"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <strong>DO Planning Date:&nbsp;</strong>

                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      type="date"
                      id="do_planning_date"
                      name="do_planning_date"
                      value={formik.values.do_planning_date}
                      onChange={formik.handleChange}
                    />
                  </div>
                </Col>
              )}
              <Col xs={12} lg={5}>
                <div className="job-detail-input-container">
                  <strong style={{ width: "50%" }}>
                    DO Validity Upto:&nbsp;
                  </strong>
                  {formik.values.do_revalidation ? (
                    formik.values.do_validity_upto_job_level
                  ) : (
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      type="date"
                      id="do_validity_upto_job_level"
                      name="do_validity_upto_job_level"
                      value={formik.values.do_validity_upto_job_level}
                      onChange={formik.handleChange}
                    />
                  )}
                </div>
              </Col>
            </Row>
            <Row>
              <Col xs={12} lg={3}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>DO Revalidation:&nbsp;</strong>
                  <Checkbox
                    value={formik.values.do_revalidation}
                    checked={formik.values.do_revalidation}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      formik.setFieldValue("do_revalidation", newValue);
                    }}
                  />
                  {formik.values.do_revalidation_date}
                </div>
              </Col>

              {user.username === "manu_pillai" && (
                <Col xs={12} lg={4}>
                  <div
                    className="job-detail-input-container"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <strong>DO Revalidation Date:&nbsp;</strong>

                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      type="date"
                      id="do_revalidation_date"
                      name="do_revalidation_date"
                      value={formik.values.do_revalidation_date}
                      onChange={formik.handleChange}
                    />
                  </div>
                </Col>
              )}
            </Row>
            <Row>
              <Col xs={12} lg={3}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>Examination Planning:&nbsp;</strong>

                  <Checkbox
                    value={formik.values.examinationPlanning}
                    checked={formik.values.examinationPlanning}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      formik.setFieldValue("examinationPlanning", newValue);
                    }}
                  />
                  {formik.values.examination_planning_date}
                </div>
              </Col>
              {user.username === "manu_pillai" && (
                <Col xs={12} lg={4}>
                  <div
                    className="job-detail-input-container"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <strong>Examination Planning Date:&nbsp;</strong>

                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      type="date"
                      id="examination_planning_date"
                      name="examination_planning_date"
                      value={formik.values.examination_planning_date}
                      onChange={formik.handleChange}
                    />
                  </div>
                </Col>
              )}
            </Row>
          </div>
          {/*************************** Row 10 ****************************/}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="SIMS/PIMS/NFMIMS" />
            <br />
            <Row>
              <Col sx={12} lg={2}>
                <strong>SIMS Reg No and Date</strong>
              </Col>
              <Col>
                <TextField
                  id="outlined-start-adornment"
                  size="small"
                  fullWidth
                  // sx={{ m: 1 }}
                  name="sims_reg_no"
                  value={formik.values.sims_reg_no}
                  onChange={formik.handleChange}
                />
              </Col>
              <Col>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  sx={{ margin: 0 }}
                  variant="outlined"
                  id="sims_date"
                  name="sims_date"
                  value={formik.values.sims_date}
                  onChange={formik.handleChange}
                />
              </Col>
            </Row>
            <br />
            <Row>
              <Col sx={12} lg={2}>
                <strong>PIMS Reg No and Date</strong>
              </Col>
              <Col>
                <TextField
                  id="outlined-start-adornment"
                  size="small"
                  fullWidth
                  name="pims_reg_no"
                  value={formik.values.pims_reg_no}
                  onChange={formik.handleChange}
                />
              </Col>
              <Col>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  variant="outlined"
                  id="pims_date"
                  name="pims_date"
                  sx={{ margin: 0 }}
                  value={formik.values.pims_date}
                  onChange={formik.handleChange}
                />
              </Col>
            </Row>
            <br />
            <Row>
              <Col sx={12} lg={2}>
                <strong>NFMIMS Reg No and Date</strong>
              </Col>
              <Col>
                <TextField
                  id="outlined-start-adornment"
                  size="small"
                  fullWidth
                  name="nfmims_reg_no"
                  value={formik.values.nfmims_reg_no}
                  onChange={formik.handleChange}
                />
              </Col>
              <Col>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  variant="outlined"
                  id="nfmims_date"
                  name="nfmims_date"
                  sx={{ margin: 0 }}
                  value={formik.values.nfmims_date}
                  onChange={formik.handleChange}
                />
              </Col>
            </Row>
          </div>
          {/*************************** Row 11 ****************************/}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Dates" />
            <Row>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>ETA:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="date"
                    id="vessel_berthing"
                    name="vessel_berthing"
                    value={formik.values.vessel_berthing}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Gateway IGM Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="date"
                    id="gateway_igm_date"
                    name="gateway_igm_date"
                    value={formik.values.gateway_igm_date}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Discharge Date/ IGM Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="date"
                    id="discharge_date"
                    name="discharge_date"
                    value={formik.values.discharge_date}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
            </Row>
            {/*************************** Row 12 ****************************/}
            <Row>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Assessment Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="date"
                    id="assessment_date"
                    name="assessment_date"
                    value={formik.values.assessment_date}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <strong>Examination Date:&nbsp;</strong>
                  {data.examination_date ? data.examination_date : ""}
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <strong>PCV Date:&nbsp;</strong>
                  {data.pcv_date ? data.pcv_date : ""}
                </div>
              </Col>
            </Row>

            {/*************************** Row 13 ****************************/}
            <Row>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Duty Paid Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="date"
                    id="duty_paid_date"
                    name="duty_paid_date"
                    value={formik.values.duty_paid_date}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>DO Validity:&nbsp;</strong>
                  {formik.values.do_validity}
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Out of Charge Date:&nbsp;</strong>
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
                  />
                </div>
              </Col>
            </Row>

            <Row>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Delivery Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    margin="normal"
                    variant="outlined"
                    id="delivery_date"
                    name="delivery_date"
                    value={formik.values.delivery_date}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <Checkbox
                    checked={formik.values.checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setChecked(true);
                        formik.setFieldValue("checked", true);
                      } else {
                        setChecked(false);
                        formik.setFieldValue("checked", false);
                      }
                    }}
                  />

                  {!formik.values.checked && (
                    <strong>All containers arrived at same date</strong>
                  )}

                  {formik.values.checked && (
                    <>
                      <strong>Arrival Date:&nbsp;</strong>
                      <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        variant="outlined"
                        type="date"
                        id="arrival_date"
                        name="arrival_date"
                        value={formik.values.arrival_date}
                        onChange={formik.handleChange}
                      />
                    </>
                  )}
                </div>
              </Col>
            </Row>

            <br />
            <Row>
              <Col xs={6}>
                <strong>DO Copies:&nbsp;</strong>

                <br />
                {formik.values.do_copies?.map((file, index) => {
                  return (
                    <div key={index}>
                      <br />
                      <a href={file}>View</a>
                    </div>
                  );
                })}
              </Col>
              <Col xs={6}>
                <label htmlFor="processed_be_attachment" className="btn">
                  Upload Processed BE Attachment
                </label>
                <input
                  type="file"
                  multiple
                  id="processed_be_attachment"
                  onChange={(e) =>
                    handleFileUpload(
                      e,
                      "processed_be_attachment",
                      "processed_be_attachment",
                      formik,
                      setFileSnackbar
                    )
                  }
                  className="input-hidden"
                  ref={processedBeAttachmentRef}
                />

                {formik.values.processed_be_attachment?.map((file, index) => {
                  return (
                    <div key={index}>
                      <br />
                      <a href={file}>View</a>
                    </div>
                  );
                })}
              </Col>
            </Row>

            <Row>
              <Col xs={6}>
                <label htmlFor="ooc_copies" className="btn">
                  Upload OOC Copy
                </label>
                <input
                  type="file"
                  multiple
                  name="ooc_copies"
                  id="ooc_copies"
                  onChange={(e) =>
                    handleFileUpload(
                      e,
                      "ooc_copies",
                      "ooc_copies",
                      formik,
                      setFileSnackbar
                    )
                  }
                  ref={oocCopyRef}
                  className="input-hidden"
                />
                <br />
                {formik.values.ooc_copies?.map((file, index) => {
                  return (
                    <div key={index}>
                      <br />
                      <a href={file}>View</a>
                    </div>
                  );
                })}
              </Col>
              <Col xs={6}>
                <label htmlFor="gate_pass_copies" className="btn">
                  Upload e-Gate Pass Copy
                </label>
                <input
                  type="file"
                  multiple
                  id="gate_pass_copies"
                  onChange={(e) =>
                    handleFileUpload(
                      e,
                      "gate_pass_copies",
                      "gate_pass_copies",
                      formik,
                      setFileSnackbar
                    )
                  }
                  className="input-hidden"
                  ref={gatePassCopyRef}
                />

                {formik.values.gate_pass_copies?.map((file, index) => {
                  return (
                    <div key={index}>
                      <br />
                      <a href={file}>View</a>
                    </div>
                  );
                })}
              </Col>
            </Row>
          </div>

          {/*************************** Row 14 ****************************/}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Remarks" />
            <Row>
              <Col>
                <div className="job-detail-input-container">
                  <strong>Remarks:&nbsp;</strong>
                  <TextField
                    multiline
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    id="remarks"
                    name="remarks"
                    value={formik.values.remarks}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
            </Row>
          </div>

          <div className="job-details-container">
            <JobDetailsRowHeading heading="Container Details" />
            {formik.values.status !== "" &&
              formik.values.container_nos?.map((container, index) => {
                return (
                  <div key={index}>
                    <div
                      style={{
                        padding: "30px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <h6 style={{ marginBottom: 0 }}>
                          <strong>
                            {index + 1}. Container Number:&nbsp;
                            <span ref={container_number_ref[index]}>
                              <TextField
                                size="small"
                                value={container.container_number}
                                key={index}
                                variant="outlined"
                                id={`container_number_${index}`}
                                name={`container_nos[${index}].container_number`}
                                onChange={formik.handleChange}
                              />
                            </span>
                            <IconButton
                              onClick={() =>
                                handleCopyContainerNumber(
                                  container.container_number,
                                  setSnackbar
                                )
                              }
                              aria-label="copy-btn"
                            >
                              <ContentCopyIcon />
                            </IconButton>
                          </strong>
                        </h6>

                        <strong style={{ marginLeft: "20px" }}>
                          Size:&nbsp;
                        </strong>
                        <TextField
                          select
                          size="small"
                          margin="normal"
                          variant="outlined"
                          id={`size_${index}`}
                          name={`container_nos[${index}].size`}
                          value={container.size}
                          onChange={formik.handleChange}
                        >
                          <MenuItem value="20">20</MenuItem>
                          <MenuItem value="40">40</MenuItem>
                        </TextField>
                      </div>
                      <br />
                      <Row>
                        {!checked && (
                          <Col xs={12} lg={3}>
                            <div className="job-detail-input-container">
                              <strong>Arrival Date:&nbsp;</strong>
                              <TextField
                                fullWidth
                                key={index}
                                size="small"
                                margin="normal"
                                variant="outlined"
                                type="date"
                                id={`arrival_date_${index}`}
                                name={`container_nos[${index}].arrival_date`}
                                value={container.arrival_date}
                                onChange={formik.handleChange}
                              />
                            </div>
                          </Col>
                        )}
                        <Col xs={12} lg={3}>
                          <div className="job-detail-input-container">
                            <strong>Free Time:&nbsp;</strong>
                            <TextField
                              fullWidth
                              select
                              size="small"
                              margin="normal"
                              variant="outlined"
                              id="free_time"
                              name="free_time"
                              value={formik.values.free_time}
                              onChange={formik.handleChange}
                            >
                              {options?.map((option, id) => (
                                <MenuItem key={id} value={option}>
                                  {option}
                                </MenuItem>
                              ))}
                            </TextField>
                          </div>
                        </Col>

                        <Col xs={12} lg={3} className="flex-div">
                          <strong>Detention From:&nbsp;</strong>
                          {detentionFrom[index]}
                        </Col>

                        <Col xs={12} lg={3}>
                          <div className="job-detail-input-container">
                            <strong>DO Validity Upto:&nbsp;</strong>
                            <TextField
                              fullWidth
                              key={index}
                              size="small"
                              margin="normal"
                              variant="outlined"
                              type="date"
                              id={`do_validity_upto_container_level_${index}`}
                              name={`container_nos[${index}].do_validity_upto_container_level`}
                              value={container.do_validity_upto_container_level}
                              onChange={formik.handleChange}
                            />
                          </div>
                        </Col>
                      </Row>

                      {container.do_revalidation?.map((item, id) => {
                        return (
                          <Row key={id}>
                            <Col xs={12} lg={3}>
                              <div className="job-detail-input-container">
                                <strong>DO Revalidation Upto:&nbsp;</strong>
                                <TextField
                                  fullWidth
                                  size="small"
                                  margin="normal"
                                  variant="outlined"
                                  type="date"
                                  id={`do_revalidation_date_${index}_${id}`}
                                  name={`container_nos[${index}].do_revalidation[${id}].do_revalidation_upto`}
                                  value={item.do_revalidation_upto}
                                  onChange={formik.handleChange}
                                />
                              </div>
                            </Col>
                            <Col xs={12} lg={9}>
                              <div className="job-detail-input-container">
                                <strong>Remarks:&nbsp;</strong>
                                <TextField
                                  fullWidth
                                  size="small"
                                  margin="normal"
                                  variant="outlined"
                                  id={`remarks_${index}_${id}`}
                                  name={`container_nos[${index}].do_revalidation[${id}].remarks`}
                                  value={item.remarks}
                                  onChange={formik.handleChange}
                                />
                              </div>
                            </Col>
                          </Row>
                        );
                      })}

                      {/* Add DO Revalidation Button */}
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          const newRevalidation = {
                            do_revalidation_upto: "",
                            remarks: "",
                          };
                          formik.setFieldValue(
                            `container_nos[${index}].do_revalidation`,
                            [...container.do_revalidation, newRevalidation]
                          );
                        }}
                      >
                        Add DO Revalidation
                      </button>

                      <Row className="job-detail-row">
                        <Col xs={12} lg={3}>
                          <div className="job-detail-input-container">
                            <strong>Physical Weight:&nbsp;</strong>
                            {container.physical_weight}
                          </div>
                        </Col>
                        <Col xs={12} lg={3}>
                          <div className="job-detail-input-container">
                            <strong>Tare Weight:&nbsp;</strong>
                            {container.tare_weight}
                          </div>
                        </Col>

                        <Col xs={12} lg={3}>
                          <div className="job-detail-input-container">
                            <strong>Weight as per Document:&nbsp;</strong>
                            <TextField
                              fullWidth
                              key={index}
                              size="small"
                              margin="normal"
                              variant="outlined"
                              id={`net_weight_${index}`}
                              name={`container_nos[${index}].net_weight`}
                              value={container.net_weight}
                              onChange={(e) =>
                                handleNetWeightChange(e, index, formik)
                              }
                            />
                          </div>
                        </Col>

                        <Col xs={12} lg={3}>
                          <div className="job-detail-input-container">
                            <strong>Actual Weight:&nbsp;</strong>
                            {container.actual_weight}
                          </div>
                        </Col>
                      </Row>

                      <Row>
                        <Col xs={12} lg={3}>
                          <div className="job-detail-input-container">
                            <strong>Weight Excess/Shortage:&nbsp;</strong>
                            {container.weight_shortage}
                          </div>
                        </Col>
                        <Col xs={12} lg={3}>
                          <div className="job-detail-input-container">
                            <FormGroup>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={container.transporter === "SRCC"}
                                    disabled={!formik.values.out_of_charge}
                                  />
                                }
                                label="Transporter: SRCC"
                                onChange={(e) =>
                                  handleTransporterChange(e, index)
                                }
                              />
                            </FormGroup>
                          </div>
                        </Col>
                        <Col>
                          {container.transporter !== "SRCC" && (
                            <div className="job-detail-input-container">
                              <strong>Transporter:&nbsp;</strong>
                              <TextField
                                fullWidth
                                key={index}
                                size="small"
                                margin="normal"
                                variant="outlined"
                                id={`transporter_${index}`}
                                name={`container_nos[${index}].transporter`}
                                value={container.transporter}
                                onChange={formik.handleChange}
                              />
                            </div>
                          )}
                        </Col>
                      </Row>

                      <Row>
                        <Col>
                          <br />
                          <label
                            htmlFor={`weighmentSlip${index}`}
                            className="btn"
                          >
                            Upload Weighment Slip
                          </label>
                          <input
                            type="file"
                            multiple
                            id={`weighmentSlip${index}`}
                            onChange={(e) => {
                              handleWeighmentSlip(
                                e,
                                container.container_number,
                                "weighment_slip_images"
                              );
                            }}
                            className="input-hidden"
                            ref={weighmentSlipRef}
                          />
                          <br />
                          <br />
                          {container.weighment_slip_images?.map((image, id) => {
                            // eslint-disable-next-line
                            return <a href={image.url} key={id} />;
                          })}
                        </Col>
                      </Row>
                      <Row>
                        <div>
                          <strong>Weighment Slip Images:&nbsp;</strong>
                          {container.weighment_slip_images?.map((image, id) => {
                            return (
                              <a href={image.url} key={id}>
                                {image.url}
                              </a>
                            );
                          })}
                        </div>

                        <div>
                          <strong>Container Pre Damage Images:&nbsp;</strong>
                          {container.container_pre_damage_images?.map(
                            (image, id) => {
                              return (
                                <a href={image.url} key={id}>
                                  {image.url}
                                </a>
                              );
                            }
                          )}
                        </div>

                        <div>
                          <strong>Container Images:&nbsp;</strong>
                          {container.container_images?.map((image, id) => {
                            return (
                              <a href={image.url} key={id}>
                                {image.url}
                              </a>
                            );
                          })}
                        </div>

                        <div>
                          <strong>Loose Material Images:&nbsp;</strong>
                          {container.loose_material_photo?.map((image, id) => {
                            return (
                              <a href={image.url} key={id}>
                                {image.url}
                              </a>
                            );
                          })}
                        </div>
                      </Row>
                    </div>
                    <hr />
                    <button
                      className="btn"
                      type="button"
                      onClick={handleAddContainer}
                    >
                      Add Container
                    </button>
                  </div>
                );
              })}
          </div>
          <Row>
            <Col>
              <button
                className="btn"
                type="submit"
                style={{ float: "right", margin: "10px" }}
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

export default React.memo(JobDetails);
