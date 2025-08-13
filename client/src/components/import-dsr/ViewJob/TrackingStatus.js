import React from "react";
import { Row, Col } from "react-bootstrap";
import {
  TextField,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
} from "@mui/material";
import JobDetailsRowHeading from "../JobDetailsRowHeading";
import FileUpload from "../../gallery/FileUpload.js";
import ImagePreview from "../../gallery/ImagePreview.js";

// Reusable style object for TextFields to reduce repetition
const textFieldSx = {
  "& .MuiInputBase-root": {
    height: "36px",
    fontSize: "13px",
  },
};

// Merged InputField and DateField into a single, more versatile component
const FormInput = ({ label, name, type = "text", formik, disabled, children, ...props }) => {
  const isDate = type === "datetime-local" || type === "date";
  
  const formatValue = (value) => {
    if (!value) return "";
    if (type === "datetime-local" && value.length === 10) return `${value}T00:00`;
    return value;
  };

  return (
    <Col xs={6} lg={3} className="mb-2">
      <div className="d-flex align-items-center gap-2">
        <strong style={{ minWidth: "120px", fontSize: "14px" }}>{label}:</strong>
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          name={name}
          type={type}
          select={type === "select"}
          value={isDate ? formatValue(formik.values[name]) : formik.values[name] || ""}
          onChange={formik.handleChange}
          disabled={disabled}
          sx={textFieldSx}
          {...props}
        >
          {children}
        </TextField>
      </div>
    </Col>
  );
};

// Component for displaying read-only data consistently
const DisplayField = ({ label, value }) => (
  <Col xs={12} lg={4} className="mb-2">
    <div className="d-flex align-items-center gap-2">
      <strong style={{ fontSize: "14px" }}>{label}:</strong>
      <span style={{ fontSize: "13px" }}>{value || "N/A"}</span>
    </div>
  </Col>
);

const RadioField = ({ label, name, options, colors, formik, disabled }) => (
  <Col xs={12} lg={6} className="mb-2">
    <div className="d-flex align-items-center gap-3">
      <strong style={{ minWidth: "120px", fontSize: "14px" }}>{label}:</strong>
      <RadioGroup row name={name} value={formik.values[name] || ""} onChange={formik.handleChange}>
        {options.map((option, index) => (
          <FormControlLabel
            key={option}
            value={option}
            control={<Radio size="small" disabled={disabled} />}
            label={<span style={{ fontSize: "13px" }}>{option}</span>}
            disabled={disabled}
            sx={{
              margin: 0,
              ...(colors?.[index] && {
                color: colors[index],
                "& .MuiSvgIcon-root": { color: colors[index] },
              }),
            }}
          />
        ))}
      </RadioGroup>
    </div>
  </Col>
);

const TrackingStatus = ({
  formik,
  data,
  user,
  detentionFrom,
  emptyContainerOffLoadDate,
  setEmptyContainerOffLoadDate,
  deleveryDate,
  setDeliveryDate,
  importTerms,
  handleImportTermsChange,
  ExBondflag,
  LCLFlag,
  isSubmissionDate,
  beTypeOptions,
  filteredClearanceOptions,
  canChangeClearance,
  resetOtherDetails,
  jobDetails,
}) => {
  const options = Array.from({ length: 25 }, (_, index) => index);

  const matchedJob = formik.values.exBondValue !== "other" && formik.values.exBondValue !== ""
    ? jobDetails?.find((job) => job.job_no === formik.values.exBondValue)
    : null;

  return (
    <div className="job-details-container">
      <JobDetailsRowHeading heading="Tracking Status" />

      <Row className="g-2">
        <FormInput label="BL No" name="awb_bl_no" formik={formik} disabled={isSubmissionDate} />
        <FormInput label="BL Date" name="awb_bl_date" type="datetime-local" formik={formik} disabled={isSubmissionDate} />
        <FormInput label="HAWBL No" name="hawb_hbl_no" formik={formik} disabled={isSubmissionDate} />
        <FormInput label="HAWBL Date" name="hawb_hbl_date" type="datetime-local" formik={formik} disabled={isSubmissionDate} />
      </Row>

      <Row className="g-2">
        <FormInput label="ETA Date" name="vessel_berthing" type="datetime-local" formik={formik} disabled={isSubmissionDate || ExBondflag} />
        <FormInput label="G-IGM No" name="gateway_igm" formik={formik} disabled={isSubmissionDate} />
        <FormInput label="G-IGM Date" name="gateway_igm_date" type="datetime-local" formik={formik} disabled={isSubmissionDate} />
        <FormInput label="IGM No" name="igm_no" formik={formik} disabled={isSubmissionDate} />
      </Row>

      <Row className="g-2">
        <FormInput label="IGM Date" name="igm_date" type="datetime-local" formik={formik} disabled={isSubmissionDate || ExBondflag} />
        <FormInput label="Discharge Date" name="discharge_date" type="datetime-local" formik={formik} disabled={!formik.values.vessel_berthing || isSubmissionDate || ExBondflag} />
        <FormInput label="Line No" name="line_no" formik={formik} disabled={isSubmissionDate} />
        <FormInput label="No Of Packages" name="no_of_pkgs" formik={formik} disabled={isSubmissionDate} />
      </Row>

      <Row className="g-2">
        <FormInput label="HSS" name="hss" type="select" formik={formik} disabled={isSubmissionDate}>
          <MenuItem value="Yes">Yes</MenuItem>
          <MenuItem value="No">No</MenuItem>
        </FormInput>
        {formik.values.hss === "Yes" && <FormInput label="Seller Name" name="saller_name" formik={formik} disabled={isSubmissionDate} />}
        <FormInput label="Free Time" name="free_time" type="select" formik={formik} disabled={isSubmissionDate}>
          {options.map((opt) => (<MenuItem key={opt} value={opt}>{opt}</MenuItem>))}
        </FormInput>
        <FormInput label="AD Code" name="adCode" formik={formik} disabled={isSubmissionDate} />
      </Row>
      
      <Row className="g-2">
        <FormInput label="Bank Name" name="bank_name" formik={formik} disabled={isSubmissionDate} />

        <FormInput label="CTH No" name="cth_no" formik={formik} disabled={isSubmissionDate} />
        <FormInput label="FTA Benefit" name="fta_Benefit_date_time" type="datetime-local" formik={formik} disabled={isSubmissionDate} />
      </Row>

      <Row className="g-2">
        <RadioField label="Priority" name="priorityJob" options={["normal", "Priority", "High Priority"]} colors={["green", "orange", "red"]} formik={formik} disabled={isSubmissionDate} />
        <RadioField label="Payment Method" name="payment_method" options={["Transaction", "Deferred"]} formik={formik} disabled={isSubmissionDate} />
      </Row>

      <Row className="g-3">
        <FormInput label="BOE Type" name="type_of_b_e" type="select" formik={formik} disabled={isSubmissionDate}>
          <MenuItem value="" disabled>Select BE Type</MenuItem>
          {beTypeOptions?.map((opt, i) => (<MenuItem key={i} value={opt}>{opt}</MenuItem>))}
        </FormInput>
        <FormInput
          label="Clearance Under"
          name="clearanceValue"
          type="select"
          formik={formik}
          disabled={isSubmissionDate}
          onChange={(e) => {
            if (canChangeClearance()) {
              formik.setFieldValue("clearanceValue", e.target.value);
            } else {
              alert("Please clear Ex-Bond details before changing Clearance Under.");
            }
          }}
        >
          <MenuItem value="" disabled>Select Clearance Type</MenuItem>
          {filteredClearanceOptions?.map((opt, i) => (<MenuItem key={i} value={opt.value || ""}>{opt.label}</MenuItem>))}
        </FormInput>
                <FormInput label="Description" name="description" formik={formik} disabled={isSubmissionDate}  
                 />
      </Row>

      {ExBondflag && (
        <>
          <Row className="g-2 mt-1">
            <FormInput label="In Bond" name="exBondValue" type="select" formik={formik} disabled={isSubmissionDate}>
              <MenuItem value="" disabled>Select In-Bond Type</MenuItem>
              <MenuItem value="other">Other</MenuItem>
              {jobDetails?.map((job) => (
                <MenuItem key={job.job_no} value={job.job_no}>{`${job.job_no} - ${job.importer}`}</MenuItem>
              ))}
            </FormInput>
          </Row>

          {formik.values.exBondValue === "other" && (
            <Row className="g-2">
              <FormInput label="InBond BE Number" name="in_bond_be_no" formik={formik} disabled={isSubmissionDate} />
              <FormInput label="InBond BE Date" name="in_bond_be_date" type="date" formik={formik} disabled={isSubmissionDate} />
              <Col xs={12} lg={6} className="mb-2">
                <div className="d-flex align-items-start gap-2">
                  <strong style={{ minWidth: "120px", fontSize: "14px", paddingTop: "8px" }}>Upload Copy:</strong>
                  <div className="flex-grow-1">
                    <FileUpload
                      label="Upload InBond BE Copy"
                      bucketPath="ex_be_copy_documents"
                      onFilesUploaded={(newFiles) => formik.setFieldValue("in_bond_ooc_copies", [...formik.values.in_bond_ooc_copies, ...newFiles])}
                      multiple
                    />
                    <ImagePreview
                      images={formik.values.in_bond_ooc_copies || []}
                      onDeleteImage={(index) => {
                        const updatedFiles = [...formik.values.in_bond_ooc_copies];
                        updatedFiles.splice(index, 1);
                        formik.setFieldValue("in_bond_ooc_copies", updatedFiles);
                      }}
                    />
                  </div>
                </div>
              </Col>
            </Row>
          )}

          {matchedJob && (
            <Row className="g-2">
              <DisplayField label="BE No" value={matchedJob.be_no} />
              <DisplayField label="BE Date" value={matchedJob.be_date} />
              <Col xs={12} lg={4} className="mb-2">
                <div className="d-flex align-items-start gap-2">
                  <strong style={{ fontSize: "14px" }}>OOC Copy:</strong>
                  <ImagePreview images={matchedJob.ooc_copies || []} readOnly />
                </div>
              </Col>
            </Row>
          )}

          <Row className="g-2">
            <Col xs={12} lg={4}>
              <Button variant="contained" color="secondary" onClick={resetOtherDetails} size="small" sx={{ fontSize: '13px' }}>
                Reset Ex-Bond Details
              </Button>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default TrackingStatus;