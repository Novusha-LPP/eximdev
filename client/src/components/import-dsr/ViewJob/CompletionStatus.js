import React from "react";
import { Row, Col } from "react-bootstrap";
import { TextField, MenuItem } from "@mui/material";
import JobDetailsRowHeading from "../JobDetailsRowHeading";

const CompletionStatus = ({ formik, user, data, isSubmissionDate }) => {
  const deliveryCompletedDate = formik.values.container_nos?.length > 0 && 
    formik.values.container_nos.every(container => container.delivery_date) 
    ? formik.values.container_nos[formik.values.container_nos.length - 1]?.delivery_date 
    : null;

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return !isNaN(date.getTime()) ? date.toISOString().slice(0, 16) : "";
  };

  const formatDisplayDate = (dateString) => dateString 
    ? new Date(dateString).toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour12: true })
    : "Pending";

  const completionFields = [
    { label: "Documentation", field: "documentation_completed_date_time" },
    { label: "E-Sanchit", field: "esanchit_completed_date_time" },
    { label: "Submission", field: "submission_completed_date_time" },
    { label: "DO", field: "do_completed" },
    { label: "Operation", field: "completed_operation_date" }
  ];

  const StatusField = ({ label, value, adminField }) => (
    <>
      <Col xs={6} lg={2} className="mb-2">
        <div><strong>{label}:</strong></div>
        <span className={`small ${value ? 'text-success' : 'text-muted'}`}>
          {formatDisplayDate(value)}
        </span>
      </Col>
      {user?.role === "Admin" && (
        <Col xs={6} lg={2} className="mb-2">
          <TextField
            type="datetime-local"
            fullWidth
            size="small"
            name={adminField}
            value={formatDateForInput(formik.values[adminField])}
            onChange={(e) => formik.setFieldValue(adminField, e.target.value)}
            InputLabelProps={{ shrink: true }}
            disabled={adminField === "bill_document_sent_to_accounts" && !deliveryCompletedDate}
          />
        </Col>
      )}
    </>
  );

  const getBillValue = (index) => (formik.values.bill_no?.split(",")[index] || "").trim();
  const setBillValue = (index, value) => {
    const billParts = (formik.values.bill_no || "").split(",");
    billParts[index] = value.trim();
    formik.setFieldValue("bill_no", billParts.join(","));
  };

  return (
    <div className="job-details-container">
      <JobDetailsRowHeading heading="Completion Status" />
      
      {/* Completion Fields */}
      <Row className="mb-3">
        {completionFields.map((field) => (
          <StatusField 
            key={field.field}
            label={field.label}
            value={formik.values[field.field]}
            adminField={field.field}
          />
        ))}
        <StatusField 
          label="Delivery"
          value={deliveryCompletedDate}
          adminField="bill_document_sent_to_accounts"
        />
      </Row>

      {/* Bill Document Status */}
      <Row className="mb-2">
        <Col xs={12}>
          <strong>Bill sent to accounts: </strong>
          <span>{data?.bill_document_sent_to_accounts
            ? new Date(data.bill_document_sent_to_accounts).toLocaleString("en-US", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit", hour12: true
              })
            : "Not sent"}</span>
        </Col>
      </Row>

      {/* Bill Details & Status */}
      <Row>
        <Col xs={6} lg={2}>
          <strong>Bill Agency:</strong>
          <TextField
            fullWidth size="small"
            value={getBillValue(0)}
            onChange={(e) => setBillValue(0, e.target.value)}
            disabled={user?.role !== "Admin" || isSubmissionDate}
          />
        </Col>
        <Col xs={6} lg={2}>
          <strong>Bill Reimbursement:</strong>
          <TextField
            fullWidth size="small"
            value={getBillValue(1)}
            onChange={(e) => setBillValue(1, e.target.value)}
            disabled={user?.role !== "Admin" || isSubmissionDate}
          />
        </Col>
        <Col xs={6} lg={2}>
          <strong>Bill Date:</strong>
          <TextField
            fullWidth size="small" type="datetime-local"
            value={formatDateForInput((formik.values.bill_date || "").split(",")[0]?.trim())}
            onChange={(e) => {
              const dateParts = (formik.values.bill_date || "").split(",");
              dateParts[0] = e.target.value;
              formik.setFieldValue("bill_date", dateParts.join(","));
            }}
            disabled={user?.role !== "Admin" || isSubmissionDate}
          />
        </Col>
        <Col xs={6} lg={2}>
          <strong>Status:</strong>
          <TextField
            fullWidth select size="small"
            name="status"
            value={formik.values.status || ""}
            onChange={formik.handleChange}
          >
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </TextField>
        </Col>
        <Col xs={12} lg={4}>
          <strong>Detailed Status:</strong>
          <TextField
            select fullWidth size="small"
            name="detailed_status"
            value={formik.values.detailed_status || ""}
            onChange={formik.handleChange}
          >
            <MenuItem value="ETA Date Pending">ETA Date Pending</MenuItem>
            <MenuItem value="Estimated Time of Arrival">Estimated Time of Arrival</MenuItem>
            <MenuItem value="Gateway IGM Filed">Gateway IGM Filed</MenuItem>
            <MenuItem value="Discharged">Discharged</MenuItem>
            <MenuItem value="Rail Out">Rail Out</MenuItem>
            <MenuItem value="BE Noted, Arrival Pending">BE Noted, Arrival Pending</MenuItem>
            <MenuItem value="Arrived, BE Note Pending">Arrived, BE Note Pending</MenuItem>
            <MenuItem value="BE Noted, Clearance Pending">BE Noted, Clearance Pending</MenuItem>
            <MenuItem value="PCV Done, Duty Payment Pending">PCV Done, Duty Payment Pending</MenuItem>
            <MenuItem value="Custom Clearance Completed">Cus.Clearance Completed, delivery pending</MenuItem>
            <MenuItem value="Billing Pending">Billing Pending</MenuItem>
            <MenuItem value="Status Completed">Status Completed</MenuItem>
          </TextField>
        </Col>
      </Row>
    </div>
  );
};

export default CompletionStatus;
