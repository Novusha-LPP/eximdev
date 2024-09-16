import React, { useState, useRef } from "react";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import { useParams } from "react-router-dom";
import Snackbar from "@mui/material/Snackbar";
import { Row, Col } from "react-bootstrap";
import { IconButton, TextField } from "@mui/material";
import useFetchOperationTeamJob from "../../customHooks/useFetchOperationTeamJob";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { handleFileUpload } from "../../utils/awsFileUpload";
import { handleCopyContainerNumber } from "../../utils/handleCopyContainerNumber";
import AWS from "aws-sdk";
import { handleActualWeightChange } from "../../utils/handleActualWeightChange";
import { handleNetWeightChange } from "../../utils/handleNetWeightChange";
import { handleTareWeightChange } from "../../utils/handleTareWeightChange";
import { handlePhysicalWeightChange } from "../../utils/handlePhysicalWeightChange";
import JobDetailsRowHeading from "../import-dsr/JobDetailsRowHeading";

function ViewOperationsJob() {
  const bl_no_ref = useRef();
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

            {/*************************** Row 13 ****************************/}
            <br />
            <Row>
              <Col xs={6}>
                {data.custom_house === "ICD KHODIYAR" && (
                  <>
                    <label htmlFor="custodian_gate_pass" className="btn">
                      Upload Custodian Gate Pass Copy
                    </label>
                    <input
                      type="file"
                      multiple
                      id="custodian_gate_pass"
                      onChange={(e) =>
                        handleFileUpload(
                          e,
                          "custodian_gate_pass",
                          "custodian_gate_pass",
                          formik,
                          setFileSnackbar
                        )
                      }
                      className="input-hidden"
                      ref={gatePassCopyRef}
                    />

                    {formik.values.custodian_gate_pass?.map((file, index) => {
                      return (
                        <div key={index}>
                          <br />
                          <a href={file}>View</a>
                        </div>
                      );
                    })}
                  </>
                )}
              </Col>
              <Col xs={6}></Col>
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
                            {container.container_number}
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
                        </strong>
                      </h6>

                      <Row className="job-detail-row">
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
                            <strong>Actual Weight:&nbsp;</strong>
                            {container.actual_weight}
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
                      </Row>

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
                          <label
                            htmlFor={`weighmentSlipImages_${index}`}
                            className="btn"
                          >
                            Upload Weighment Slip
                          </label>
                          <input
                            type="file"
                            multiple
                            id={`weighmentSlipImages_${index}`}
                            onChange={(e) =>
                              handleContainerFileUpload(
                                e,
                                container.container_number,
                                "weighment_slip_images"
                              )
                            }
                            style={{ display: "none" }}
                            ref={weighmentSlipRef}
                          />
                          <br />
                          {container.weighment_slip_images?.map((image, id) => {
                            return (
                              <a href={image.url} key={id}>
                                View
                              </a>
                            );
                          })}
                        </Col>
                        <Col>
                          <label
                            htmlFor={`containerPreDamage_${index}`}
                            className="btn"
                          >
                            <>Container Pre Damage Images</>
                          </label>
                          <input
                            type="file"
                            multiple
                            id={`containerPreDamage_${index}`}
                            onChange={(e) =>
                              handleContainerFileUpload(
                                e,
                                container.container_number,
                                "container_pre_damage_images"
                              )
                            }
                            style={{ display: "none" }}
                            ref={container_pre_damage_images_ref}
                          />
                          <br />
                          {container.container_pre_damage_images?.map(
                            (image, id) => {
                              return (
                                <a href={image.url} key={id}>
                                  View
                                </a>
                              );
                            }
                          )}
                        </Col>
                      </Row>

                      <Row>
                        <Col xs={6}>
                          <label
                            htmlFor={`containerImages_${index}`}
                            className="btn"
                          >
                            Container Images
                          </label>
                          <input
                            type="file"
                            multiple
                            id={`containerImages_${index}`}
                            onChange={(e) =>
                              handleContainerFileUpload(
                                e,
                                container.container_number,
                                "container_images"
                              )
                            }
                            style={{ display: "none" }}
                            ref={containerImagesRef}
                          />
                          <br />
                          {container.container_images?.map((image, id) => {
                            return (
                              <a href={image.url} key={id}>
                                View
                              </a>
                            );
                          })}
                        </Col>

                        <Col>
                          <label
                            htmlFor={`looseMaterial${index}`}
                            className="btn"
                          >
                            <>Loose Material Images</>
                          </label>
                          <input
                            type="file"
                            multiple
                            id={`looseMaterial${index}`}
                            onChange={(e) =>
                              handleContainerFileUpload(
                                e,
                                container.container_number,
                                "loose_material"
                              )
                            }
                            style={{ display: "none" }}
                            ref={loose_material_ref}
                          />
                          <br />
                          {container.loose_material?.map((image, id) => {
                            return (
                              <a href={image.url} key={id}>
                                View
                              </a>
                            );
                          })}
                        </Col>
                      </Row>

                      <Row>
                        <Col xs={6}>
                          <label
                            htmlFor={`examinationVideos_${index}`}
                            className="btn"
                          >
                            Examination Videos
                          </label>
                          <input
                            type="file"
                            multiple
                            accept="video/*"
                            id={`examinationVideos_${index}`}
                            onChange={(e) =>
                              handleContainerFileUpload(
                                e,
                                container.container_number,
                                "examination_videos"
                              )
                            }
                            style={{ display: "none" }}
                            ref={examinationVideosRef}
                          />
                          <br />
                          {container.examination_videos?.map((image, id) => {
                            return (
                              <a href={image.url} key={id}>
                                View
                              </a>
                            );
                          })}
                        </Col>

                        <Col></Col>
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
