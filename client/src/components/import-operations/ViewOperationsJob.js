import React, { useState, useRef, useContext } from "react";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import { useParams } from "react-router-dom";
import Snackbar from "@mui/material/Snackbar";
import { Row, Col } from "react-bootstrap";
import { IconButton, TextField } from "@mui/material";
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
  handleActualWeightChange,
} from "../../utils/handleTareWeightChange";
import Checkbox from "@mui/material/Checkbox";
import { UserContext } from "../../contexts/UserContext";
// import { handlePhysicalWeightChange } from "../../utils/handlePhysicalWeightChange";
import JobDetailsRowHeading from "../import-dsr/JobDetailsRowHeading";

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
  const params = useParams();

  const { data, formik } = useFetchOperationTeamJob(params);

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

  return (
    <>
      {data !== null && (
        <form onSubmit={formik.handleSubmit}>
          <JobDetailsStaticData
            data={data}
            params={params}
            bl_no_ref={bl_no_ref}
            setSnackbar={setSnackbar}
          />
          {/*************************** Row 11 ****************************/}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Dates" />

            {/*************************** Row 12 ****************************/}
            <Row>
              <Col xs={12} md={4}>
                <div className="job-detail-input-container">
                  <strong>Examination Date:&nbsp;</strong>
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
                  />
                </div>
              </Col>
              <Col xs={12} md={4}>
                <div className="job-detail-input-container">
                  <strong>PCV Date:&nbsp;</strong>
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
                      formik.touched.pcv_date && Boolean(formik.errors.pcv_date)
                    }
                    helperText={
                      formik.touched.pcv_date && formik.errors.pcv_date
                    }
                  />
                </div>
              </Col>
              <Col xs={12} md={4}>
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
                    error={
                      formik.touched.out_of_charge &&
                      Boolean(formik.errors.out_of_charge)
                    }
                    helperText={
                      formik.touched.out_of_charge &&
                      formik.errors.out_of_charge
                    }
                  />
                </div>
              </Col>
            </Row>
            <br />
            <Row>
              <Col xs={12} lg={3}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>Completed Operation:&nbsp;</strong>

                  <Checkbox
                    value={formik.values.completedOperation}
                    checked={formik.values.completedOperation}
                    onChange={(e) => {
                      const newValue = e.target.checked;

                      // If checked, set the date to current date, otherwise clear the date
                      if (newValue) {
                        const currentDate = new Date()
                          .toISOString()
                          .split("T")[0]; // Get current date in 'YYYY-MM-DD' format
                        formik.setFieldValue(
                          "completed_operation_date",
                          currentDate
                        );
                      } else {
                        formik.setFieldValue("completed_operation_date", ""); // Clear date if unchecked
                      }

                      formik.setFieldValue("completedOperation", newValue); // Update checkbox value
                    }}
                  />
                  {formik.values.completed_operation_date}
                </div>
              </Col>

              {(user.username === "atul_dev" ||
                user.username === "manu_pillai") && (
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
                      type="date"
                      id="completed_operation_date"
                      name="completed_operation_date"
                      value={formik.values.completed_operation_date}
                      onChange={formik.handleChange}
                    />
                  </div>
                </Col>
              )}
            </Row>

            <br />
            <Row>
              {/************ Add Concor Gate Pass Date and Validate Up To Date only for ICD KHODIYAR ************/}
              {data.custom_house === "ICD KHODIYAR" && (
                <>
                  <Col xs={12} md={4}>
                    <div className="job-detail-input-container">
                      <strong>Concor Gate Pass Date:&nbsp;</strong>
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
                      />
                    </div>
                  </Col>

                  <Col xs={12} md={4}>
                    <div className="job-detail-input-container">
                      <strong>
                        Concor Gate Pass Validate Up To Date:&nbsp;
                      </strong>
                      <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        variant="outlined"
                        type="date"
                        id="concor_gate_pass_validate_up_to"
                        name="concor_gate_pass_validate_up_to"
                        value={formik.values.concor_gate_pass_validate_up_to}
                        onChange={formik.handleChange}
                        error={
                          formik.touched.concor_gate_pass_validate_up_to &&
                          Boolean(formik.errors.concor_gate_pass_validate_up_to)
                        }
                        helperText={
                          formik.touched.concor_gate_pass_validate_up_to &&
                          formik.errors.concor_gate_pass_validate_up_to
                        }
                      />
                    </div>
                  </Col>
                </>
              )}
            </Row>

            {/*************************** Row 13 ****************************/}
            <br />
            <Row>
              {/* <Col xs={6}>
                {data.custom_house === "ICD KHODIYAR" && (
                  <>
                    <FileUpload
                      label="Upload Custodian Gate Pass Copy"
                      bucketPath="custodian_gate_pass"
                      onFilesUploaded={(newFiles) => {
                        const existingFiles =
                          formik.values.custodian_gate_pass || [];
                        const updatedFiles = [...existingFiles, ...newFiles]; // Append new files
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
                  </>
                )}
              </Col> */}
              <Col xs={6}>
                {data.custom_house === "ICD KHODIYAR" && (
                  <>
                    <FileUpload
                      label="Upload Concor Invoice and Receipt Copy "
                      bucketPath="concor_invoice_and_receipt_copy"
                      onFilesUploaded={(newFiles) => {
                        const existingFiles =
                          formik.values.concor_invoice_and_receipt_copy || [];
                        const updatedFiles = [...existingFiles, ...newFiles]; // Append new files
                        formik.setFieldValue(
                          "concor_invoice_and_receipt_copy",
                          updatedFiles
                        );
                      }}
                      multiple={true}
                    />

                    <ImagePreview
                      images={
                        formik.values.concor_invoice_and_receipt_copy || []
                      } // Display all uploaded files
                      onDeleteImage={(index) => {
                        const updatedFiles = [
                          ...formik.values.concor_invoice_and_receipt_copy,
                        ];
                        updatedFiles.splice(index, 1); // Remove the selected file
                        formik.setFieldValue(
                          "concor_invoice_and_receipt_copy",
                          updatedFiles
                        );
                      }}
                    />
                  </>
                )}
              </Col>
            </Row>
          </div>
          {/*************************** Row 14 ****************************/}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Container Details" />

            {formik.values.status !== "" &&
              formik.values.container_nos?.map((container, index) => {
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
                        <Col xs={12} md={3}>
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
                        <Col xs={12} md={3}>
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
                        <Col xs={12} md={3}>
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
                            {container.weight_shortage}
                          </div>
                        </Col>
                      </Row>
                      {/* <Row className="job-detail-row">
                        <Col xs={12} md={3}>
                          <div className="job-detail-input-container">
                            <strong>Physical Weight:&nbsp;</strong>
                            <TextField
                              fullWidth
                              key={index}
                              size="small"
                              margin="normal"
                              variant="outlined"
                              id={`physical_weight_${index}`}
                              name={`container_nos[${index}].physical_weight`}
                              label=""
                              value={container.physical_weight}
                              onChange={(e) =>
                                handlePhysicalWeightChange(e, index, formik)
                              }
                            />
                          </div>
                        </Col>
                        <Col xs={12} md={3}>
                          <div className="job-detail-input-container">
                            <strong>Tare Weight:&nbsp;</strong>
                            <TextField
                              fullWidth
                              key={index}
                              size="small"
                              margin="normal"
                              variant="outlined"
                              id={`tare_weight_${index}`}
                              name={`container_nos[${index}].tare_weight`}
                              label=""
                              value={container.tare_weight}
                              onChange={(e) =>
                                handleTareWeightChange(e, index, formik)
                              }
                            />
                          </div>
                        </Col>
                        <Col
                          xs={12}
                          md={3}
                          style={{ display: "flex", alignItems: "center" }}
                        >
                          <div className="job-detail-input-container">
                            <strong>Actual Weight:&nbsp;</strong>
                            {container.actual_weight}
                          </div>
                        </Col>
                        <Col xs={12} md={3}>
                          <div className="job-detail-input-container">
                            <strong>Weight as per Document:&nbsp;</strong>
                            {container.net_weight}
                          </div>
                        </Col>

                        <Col
                          xs={12}
                          md={3}
                          style={{ display: "flex", alignItems: "center" }}
                        >
                          <div className="job-detail-input-container">
                            <strong>Weight Excess/Shortage:&nbsp;</strong>
                            {container.weight_shortage}
                          </div>
                        </Col>
                      </Row> */}

                      <Row className="job-detail-row">
                        {data.custom_house !== "ICD SACHANA" &&
                          data.custom_house !== "ICD SANAND" && (
                            <Col xs={12} md={4}>
                              <div className="job-detail-input-container">
                                <strong>Pre Weighment:&nbsp;</strong>
                                <TextField
                                  fullWidth
                                  key={index}
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
                              key={index}
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
                        {data.custom_house === "ICD KHODIYAR" && (
                          <>
                            <Col xs={6}>
                              <FileUpload
                                label="Upload Custodian Gate Pass Copy"
                                bucketPath="container_custodian_gate_pass"
                                onFilesUploaded={(uploadedFiles) =>
                                  handleFileUpload(
                                    uploadedFiles,
                                    container.container_number,
                                    "container_custodian_gate_pass"
                                  )
                                }
                              />
                              <ImagePreview
                                images={
                                  container.container_custodian_gate_pass || []
                                }
                                onDeleteImage={(index) =>
                                  handleDeleteImage(
                                    index,
                                    container.container_number,
                                    "container_custodian_gate_pass"
                                  )
                                }
                              />
                            </Col>
                          </>
                        )}
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
                    <hr />
                  </div>
                );
              })}
          </div>
          <Row style={{ margin: "20px 0" }}>
            <Col>
              <button
                type="submit"
                className="btn"
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
