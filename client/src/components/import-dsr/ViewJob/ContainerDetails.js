import React from "react";
import { Row, Col } from "react-bootstrap";
import { 
  TextField, 
  MenuItem, 
  IconButton, 
  Checkbox, 
  FormGroup, 
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Divider
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import JobDetailsRowHeading from "../JobDetailsRowHeading";
import ImagePreview from "../../gallery/ImagePreview.js";
import DeliveryChallanPdf from "../DeliveryChallanPDF.js";
import IgstCalculationPDF from "../IgstCalculationPDF.js";
import { handleCopyContainerNumber } from "../../../utils/handleCopyContainerNumber";
import { handleGrossWeightChange } from "../../../utils/handleNetWeightChange";

const ContainerDetails = ({ 
  formik,
  data,
  params,
  user,
  bl_no_ref,
  weighmentSlipRef,
  container_number_ref,
  openDialog,
  setOpenDialog,
  containerToDelete,
  setContainerToDelete,
  deleteConfirmText,
  setDeleteConfirmText,
  snackbar,
  setSnackbar,
  detentionFrom,
  ExBondflag,
  LCLFlag,
  subtractOneDay,
  formatDateTime
}) => {

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 16);
    }
    return "";
  };

  const handleAddContainer = () => {
    const newContainer = {
      container_number: "",
      size: "",
      arrival_date: "",
      container_rail_out_date: "",
      do_revalidation: [],
      seal_number: "",
      physical_weight: "",
      tare_weight: "",
      actual_weight: "",
      container_gross_weight: "",
      net_weight_as_per_PL_document: "",
      weight_shortage: "",
      transporter: "",
      delivery_date: "",
      emptyContainerOffLoadDate: "",
      by_road_movement_date: "",
      required_do_validity_upto: "",
      weighment_slip_images: [],
      container_pre_damage_images: [],
      container_images: [],
      loose_material: [],
      examination_videos: []
    };

    const updatedContainers = [...formik.values.container_nos, newContainer];
    formik.setFieldValue("container_nos", updatedContainers);
  };

  const handleDeleteContainer = () => {
    if (deleteConfirmText === "Delete" && containerToDelete !== null) {
      const updatedContainers = formik.values.container_nos.filter(
        (_, index) => index !== containerToDelete
      );
      formik.setFieldValue("container_nos", updatedContainers);
      setOpenDialog(false);
      setDeleteConfirmText("");
      setContainerToDelete(null);
    }
  };

  const handleDeleteRevalidation = (containerIndex, revalidationIndex) => {
    const updatedContainers = [...formik.values.container_nos];
    updatedContainers[containerIndex].do_revalidation.splice(revalidationIndex, 1);
    formik.setFieldValue("container_nos", updatedContainers);
  };

  const handleTransporterChange = (e, index) => {
    const isChecked = e.target.checked;
    const transporterValue = isChecked ? "SRCC" : "";
    formik.setFieldValue(`container_nos[${index}].transporter`, transporterValue);
  };

  const handleWeighmentSlip = (e, containerNumber, fieldName) => {
    console.log("Upload weighment slip for container:", containerNumber);
  };

  const handleDateChange = (newDate) => {
    const updatedContainers = formik.values.container_nos.map(container => ({
      ...container,
      required_do_validity_upto: newDate
    }));
    formik.setFieldValue("container_nos", updatedContainers);
  };

  if (!formik || !formik.values) {
    return <div>Loading container details...</div>;
  }

  const containers = formik.values.status !== "" && formik.values.container_nos?.length > 0
    ? formik.values.container_nos
    : [{
        container_number: "",
        size: "",
        arrival_date: "",
        container_rail_out_date: "",
        do_revalidation: [],
        seal_number: "",
        physical_weight: "",
        tare_weight: "",
        actual_weight: "",
        container_gross_weight: "",
        net_weight_as_per_PL_document: "",
        weight_shortage: "",
        transporter: "",
        delivery_date: "",
        emptyContainerOffLoadDate: "",
        by_road_movement_date: "",
        required_do_validity_upto: "",
        weighment_slip_images: [],
        container_pre_damage_images: [],
        container_images: [],
        loose_material: [],
        examination_videos: []
      }];

  const safeContainers = containers || [];

  return (
    <div className="job-details-container">
      <JobDetailsRowHeading heading="Container Details" />
      
      {safeContainers.map((container, index) => (
        <div key={index} style={{ marginBottom: "1rem", backgroundColor: "#fafbfc", borderRadius: "6px", padding: "1rem" }}>
          
          {/* Container Header - Single Row */}
          <Row className="align-items-center mb-2">
            <Col xs={12} md={5}>
              <div className="d-flex align-items-center">
                <strong style={{ marginRight: "8px", fontSize: "15px", color: "#2c3e50", minWidth: "fit-content" }}>
                  {index + 1}. Container:
                </strong>
                <TextField
                  size="small"
                  value={container.container_number}
                  variant="outlined"
                  id={`container_number_${index}`}
                  name={`container_nos[${index}].container_number`}
                  onChange={formik.handleChange}
                  ref={container_number_ref && container_number_ref[index] ? container_number_ref[index] : null}
                  sx={{ minWidth: "160px", maxWidth: "180px" }}
                />
                <IconButton
                  onClick={() => handleCopyContainerNumber(container.container_number, setSnackbar)}
                  size="small"
                  sx={{ ml: 0.5, p: 0.5 }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </div>
            </Col>
            
            <Col xs={4} md={2}>
              <div className="d-flex align-items-center">
                <strong style={{ fontSize: "13px", marginRight: "6px" }}>Size:</strong>
                <TextField
                  select
                  size="small"
                  variant="outlined"
                  id={`size_${index}`}
                  name={`container_nos[${index}].size`}
                  value={container.size}
                  onChange={formik.handleChange}
                  sx={{ minWidth: "60px" }}
                >
                  <MenuItem value="20">20</MenuItem>
                  <MenuItem value="40">40</MenuItem>
                </TextField>
              </div>
            </Col>
            
            <Col xs={8} md={3}>
              <div className="d-flex align-items-center">
                <strong style={{ fontSize: "13px", marginRight: "6px", minWidth: "fit-content" }}>Seal:</strong>
                <TextField
                  size="small"
                  variant="outlined"
                  fullWidth
                  id={`seal_number${index}`}
                  name={`container_nos[${index}].seal_number`}
                  value={container.seal_number}
                  onChange={formik.handleChange}
                />
              </div>
            </Col>
            
            <Col xs={6} md={1}>
              <div style={{ padding: "6px", backgroundColor: "#e8f4fd", borderRadius: "3px", textAlign: "center" }}>
                <strong style={{ fontSize: "10px", color: "#495057", display: "block" }}>Detention</strong>
                <div style={{ fontSize: "12px", fontWeight: "600" }}>
                  {detentionFrom && detentionFrom[index] ? detentionFrom[index] : '-'}
                </div>
              </div>
            </Col>
            
            <Col xs={6} md={1}>
              <div style={{ padding: "6px", backgroundColor: "#fff3cd", borderRadius: "3px", textAlign: "center" }}>
                <strong style={{ fontSize: "10px", color: "#495057", display: "block" }}>DO Validity</strong>
                <div style={{ fontSize: "12px", fontWeight: "600" }}>
                  {detentionFrom && detentionFrom[index] ? subtractOneDay(detentionFrom[index]) : '-'}
                </div>
              </div>
            </Col>
          </Row>

          {/* Dates Section - Compact */}
          <Row className="mb-2">
            <Col xs={6} md={3}>
              <div className="d-flex align-items-center">
                <strong style={{ fontSize: "12px", marginRight: "4px", minWidth: "60px" }}>Railout:</strong>
                <TextField
                  size="small"
                  variant="outlined"
                  type="datetime-local"
                  fullWidth
                  id={`container_rail_out_date${index}`}
                  name={`container_nos[${index}].container_rail_out_date`}
                  disabled={LCLFlag || ExBondflag}
                  value={container.container_rail_out_date}
                  onChange={formik.handleChange}
                  sx={{ fontSize: "12px" }}
                />
              </div>
            </Col>
            
            {LCLFlag && (
              <Col xs={6} md={3}>
                <div className="d-flex align-items-center">
                  <strong style={{ fontSize: "12px", marginRight: "4px", minWidth: "50px" }}>Road:</strong>
                  <TextField
                    size="small"
                    variant="outlined"
                    type="datetime-local"
                    fullWidth
                    id={`by_road_movement_date${index}`}
                    name={`container_nos[${index}].by_road_movement_date`}
                    value={container.by_road_movement_date}
                    disabled={ExBondflag}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
            )}
            
            <Col xs={6} md={3}>
              <div className="d-flex align-items-center">
                <strong style={{ fontSize: "12px", marginRight: "4px", minWidth: "50px" }}>Arrival:</strong>
                {formik.values.checked ? (
                  <span style={{ padding: "6px", display: "block", backgroundColor: "#e9ecef", borderRadius: "3px", fontSize: "12px", flex: 1 }}>
                    {container.arrival_date || "N/A"}
                  </span>
                ) : (
                  <TextField
                    size="small"
                    variant="outlined"
                    type="datetime-local"
                    fullWidth
                    id={`arrival_date_${index}`}
                    name={`container_nos[${index}].arrival_date`}
                    value={container.arrival_date}
                    disabled={
                      ExBondflag ||
                      (LCLFlag
                        ? !container.by_road_movement_date
                        : !container.container_rail_out_date)
                    }
                    onChange={formik.handleChange}
                  />
                )}
              </div>
            </Col>
            
            <Col xs={6} md={3}>
              <div className="d-flex align-items-center">
                <strong style={{ fontSize: "12px", marginRight: "4px", minWidth: "50px" }}>DO Req:</strong>
                <TextField
                  size="small"
                  variant="outlined"
                  type="date"
                  fullWidth
                  id={`required_do_validity_upto_${index}`}
                  name={`container_nos[${index}].required_do_validity_upto`}
                  value={container.required_do_validity_upto}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>
            </Col>
          </Row>

          {/* DO Revalidation Section - Compact */}
          {container.do_revalidation?.map((item, id) => (
            <Row key={id} className="mb-1" style={{ backgroundColor: "#f8f9fa", padding: "6px", borderRadius: "3px" }}>
              <Col xs={12} md={4}>
                <div className="d-flex align-items-center">
                  <strong style={{ fontSize: "11px", marginRight: "4px", minWidth: "80px" }}>DO Revalid:</strong>
                  <TextField
                    size="small"
                    variant="outlined"
                    type="date"
                    fullWidth
                    id={`do_revalidation_date_${index}_${id}`}
                    name={`container_nos[${index}].do_revalidation[${id}].do_revalidation_upto`}
                    value={item.do_revalidation_upto}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
              <Col xs={10} md={7}>
                <div className="d-flex align-items-center">
                  <strong style={{ fontSize: "11px", marginRight: "4px", minWidth: "60px" }}>Remarks:</strong>
                  <TextField
                    size="small"
                    variant="outlined"
                    fullWidth
                    id={`remarks_${index}_${id}`}
                    name={`container_nos[${index}].do_revalidation[${id}].remarks`}
                    value={item.remarks}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
              <Col xs={2} md={1} className="d-flex align-items-center justify-content-center">
                <IconButton
                  onClick={() => handleDeleteRevalidation(index, id)}
                  color="error"
                  size="small"
                  sx={{ p: 0.5 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Col>
            </Row>
          ))}

          {container.do_revalidation?.length > 0 || true ? (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm mb-2"
              style={{ fontSize: "11px", padding: "4px 8px" }}
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
              + Add DO Revalidation
            </button>
          ) : null}

          {/* Weight Details Grid - Ultra Compact */}
          <Row className="mb-2">
            <Col xs={4} sm={2}>
              <div style={{ textAlign: "center", padding: "4px", backgroundColor: "#e9ecef", borderRadius: "3px" }}>
                <strong style={{ fontSize: "10px", display: "block" }}>Physical</strong>
                <span style={{ fontSize: "12px", fontWeight: "600" }}>{container.physical_weight || "-"}</span>
              </div>
            </Col>
            <Col xs={4} sm={2}>
              <div style={{ textAlign: "center", padding: "4px", backgroundColor: "#e9ecef", borderRadius: "3px" }}>
                <strong style={{ fontSize: "10px", display: "block" }}>Tare</strong>
                <span style={{ fontSize: "12px", fontWeight: "600" }}>{container.tare_weight || "-"}</span>
              </div>
            </Col>
            <Col xs={4} sm={2}>
              <div style={{ textAlign: "center", padding: "4px", backgroundColor: "#e9ecef", borderRadius: "3px" }}>
                <strong style={{ fontSize: "10px", display: "block" }}>Actual</strong>
                <span style={{ fontSize: "12px", fontWeight: "600" }}>{container.actual_weight || "-"}</span>
              </div>
            </Col>
            <Col xs={6} sm={3}>
              <div className="d-flex align-items-center">
                <strong style={{ fontSize: "11px", marginRight: "4px", minWidth: "40px" }}>Gross:</strong>
                <TextField
                  size="small"
                  variant="outlined"
                  fullWidth
                  id={`container_gross_weight_${index}`}
                  name={`container_nos[${index}].container_gross_weight`}
                  value={container.container_gross_weight}
                  onChange={(e) => handleGrossWeightChange(e, index, formik)}
                />
              </div>
            </Col>
            <Col xs={6} sm={3}>
              <div className="d-flex align-items-center">
                <strong style={{ fontSize: "11px", marginRight: "4px", minWidth: "30px" }}>PL:</strong>
                <TextField
                  size="small"
                  variant="outlined"
                  fullWidth
                  id={`net_weight_as_per_PL_document${index}`}
                  name={`container_nos[${index}].net_weight_as_per_PL_document`}
                  value={container.net_weight_as_per_PL_document}
                  onChange={formik.handleChange}
                />
              </div>
            </Col>
          </Row>

          {/* Weight Shortage & Transporter - Single Row */}
          <Row className="mb-2 align-items-center">
            <Col xs={6} md={3}>
              <div
                style={{
                  padding: "6px",
                  borderRadius: "3px",
                  textAlign: "center",
                  backgroundColor: container.weight_shortage < 0 ? "#dc3545" : "#28a745",
                  color: "white",
                  fontWeight: "600"
                }}
              >
                <strong style={{ fontSize: "10px", display: "block" }}>Excess/Shortage</strong>
                <span style={{ fontSize: "13px" }}>
                  {container.container_gross_weight && container.container_gross_weight !== "0" 
                    ? (container.weight_shortage || "0") 
                    : "-"
                  }
                </span>
              </div>
            </Col>
            
            <Col xs={6} md={4}>
              <FormGroup style={{ margin: 0 }}>
                <FormControlLabel
                  style={{ margin: 0 }}
                  control={
                    <Checkbox
                      size="small"
                      checked={container.transporter === "SRCC"}
                      disabled={!formik.values.out_of_charge}
                      onChange={(e) => handleTransporterChange(e, index)}
                    />
                  }
                  label={<strong style={{ fontSize: "12px" }}>SRCC Transport</strong>}
                />
              </FormGroup>
            </Col>
            
            {container.transporter !== "SRCC" && (
              <Col xs={12} md={5}>
                <div className="d-flex align-items-center">
                  <strong style={{ fontSize: "11px", marginRight: "4px", minWidth: "70px" }}>Transporter:</strong>
                  <TextField
                    size="small"
                    variant="outlined"
                    fullWidth
                    id={`transporter_${index}`}
                    name={`container_nos[${index}].transporter`}
                    value={container.transporter}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
            )}
          </Row>

          {/* Delivery Dates - Single Row */}
          <Row className="mb-2">
            <Col xs={12} md={6}>
              <div className="d-flex align-items-center">
                <strong style={{ fontSize: "11px", marginRight: "4px", minWidth: "60px" }}>Delivery:</strong>
                <TextField
                  size="small"
                  variant="outlined"
                  type="datetime-local"
                  fullWidth
                  id={`delivery_date${index}`}
                  name={`container_nos[${index}].delivery_date`}
                  value={formatDateForInput(container.delivery_date)}
                  onChange={formik.handleChange}
                />
              </div>
            </Col>
            <Col xs={12} md={6}>
              <div className="d-flex align-items-center">
                <strong style={{ fontSize: "11px", marginRight: "4px", minWidth: "70px" }}>Empty Off:</strong>
                <TextField
                  size="small"
                  variant="outlined"
                  type="datetime-local"
                  fullWidth
                  id={`emptyContainerOffLoadDate${index}`}
                  name={`container_nos[${index}].emptyContainerOffLoadDate`}
                  value={formatDateForInput(container.emptyContainerOffLoadDate)}
                  disabled={LCLFlag}
                  onChange={formik.handleChange}
                />
              </div>
            </Col>
          </Row>

          {/* Action Buttons */}
          <Row className="mb-3">
            <Col>
              <div className="d-flex flex-wrap gap-2">
                <DeliveryChallanPdf
                  year={params.selected_year}
                  jobNo={params.job_no}
                  containerIndex={index}
                />
                <IgstCalculationPDF
                  year={params.selected_year}
                  jobNo={params.job_no}
                  containerIndex={index}
                />
                
                <label 
                  htmlFor={`weighmentSlip${index}`} 
                  className="btn btn-secondary btn-sm"
                  style={{ cursor: "pointer", margin: 0 }}
                >
                  Upload Weighment Slip
                </label>
                <input
                  type="file"
                  multiple
                  id={`weighmentSlip${index}`}
                  onChange={(e) => handleWeighmentSlip(e, container.container_number, "weighment_slip_images")}
                  ref={weighmentSlipRef}
                  style={{ display: "none" }}
                />
              </div>
            </Col>
          </Row>

          {/* Image Previews - Compact Layout */}
          <Row>
            <Col xs={12} md={6}>
              <div className="mb-2">
                <strong style={{ fontSize: "13px", display: "block", marginBottom: "5px" }}>Weighment Slip Images:</strong>
                <ImagePreview images={container?.weighment_slip_images || []} readOnly />
              </div>
              <div className="mb-2">
                <strong style={{ fontSize: "13px", display: "block", marginBottom: "5px" }}>Container Pre-Damage:</strong>
                <ImagePreview images={container?.container_pre_damage_images || []} readOnly />
              </div>
            </Col>
            
            <Col xs={12} md={6}>
              <div className="mb-2">
                <strong style={{ fontSize: "13px", display: "block", marginBottom: "5px" }}>Container Images:</strong>
                <ImagePreview images={container?.container_images || []} readOnly />
              </div>
              <div className="mb-2">
                <strong style={{ fontSize: "13px", display: "block", marginBottom: "5px" }}>Loose Material:</strong>
                <ImagePreview images={container?.loose_material || []} readOnly />
              </div>
            </Col>
            
            <Col xs={12}>
              <div className="mb-2">
                <strong style={{ fontSize: "13px", display: "block", marginBottom: "5px" }}>Examination Videos:</strong>
                <ImagePreview images={container?.examination_videos || []} readOnly />
              </div>
            </Col>
          </Row>
          
          {/* Container Management Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", paddingTop: "1rem", borderTop: "2px solid #dee2e6" }}>
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleAddContainer}
            >
              + Add Container
            </button>
            <button
              className="btn btn-danger"
              type="button"
              onClick={() => {
                setOpenDialog(true);
                setContainerToDelete(index);
              }}
            >
              Delete Container
            </button>
          </div>
        </div>
      ))}

      {/* Confirm Deletion Dialog */}
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
            id="delete-confirm"
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
    </div>
  );
};

export default ContainerDetails;