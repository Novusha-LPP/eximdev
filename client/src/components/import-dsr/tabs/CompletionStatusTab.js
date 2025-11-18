// src/pages/job-details/tabs/CompletionStatusTab.jsx
import React from "react";
import JobDetailsRowHeading from "../JobDetailsRowHeading";

export default function CompletionStatusTab({
  user,
  formik,
  data,
  isSubmissionDate,
  formatDateForInput,
}) {
  const containerStyle = {
    padding: "10px 12px",
    backgroundColor: "#f9f9f9",
    fontFamily: "Arial, sans-serif",
    fontSize: "13px",
  };

  const headingStyle = {
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "8px",
  };

  const gridRowStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0,1fr))",
    gap: "10px",
    marginBottom: "8px",
  };

  const fieldBlockStyle = {
    paddingBottom: "6px",
  };

  const labelInlineStyle = {
    fontSize: "12px",
    fontWeight: "600",
    color: "#495057",
    marginRight: "6px",
  };

  const statusValueStyle = (isDone, neutral = false) => ({
    fontSize: "12px",
    fontWeight: "500",
    color: neutral ? "#212529" : isDone ? "#28a745" : "#dc3545",
  });

  const smallLabelStyle = {
    fontSize: "11px",
    color: "#6c757d",
    marginBottom: "2px",
  };

  const inputStyle = {
    width: "100%",
    padding: "4px 6px",
    fontSize: "12px",
    border: "1px solid #ccc",
    borderRadius: "3px",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  };

  const selectStyle = { ...inputStyle };

  const formatDisplay = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Bill fields: bill_no "agency,reimbursement", bill_date "date1,date2"
  const billNo = formik.values.bill_no || "";
  const [billAgencyRaw = "", billReimbRaw = ""] = billNo.split(",");
  const billAgency = billAgencyRaw.trim();
  const billReimb = billReimbRaw.trim();

  const billDateStr = (formik.values.bill_date || "").split(",")[0]?.trim();
  let billDateInput = "";
  if (billDateStr) {
    const d = new Date(billDateStr);
    if (!isNaN(d.getTime())) {
      billDateInput = d.toISOString().slice(0, 16);
    }
  }

  const disabledBySubmission = user?.role !== "Admin" && isSubmissionDate;

  return (
    <div className="job-details-container" style={containerStyle}>
      <JobDetailsRowHeading heading="Completion Status" />

      {/* Row 1: Documentation / E-sanchit / Submission / DO */}
      <div style={gridRowStyle}>
        {/* Documentation */}
        <div style={fieldBlockStyle}>
          <div
            style={{
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <span style={labelInlineStyle}>Documentation:</span>
            <span
              style={statusValueStyle(
                Boolean(formik.values.documentation_completed_date_time)
              )}
            >
              {formatDisplay(formik.values.documentation_completed_date_time) ||
                "Pending"}
            </span>
          </div>
          {user?.role === "Admin" && (
            <input
              type="datetime-local"
              style={inputStyle}
              value={formik.values.documentation_completed_date_time || ""}
              onChange={(e) =>
                formik.setFieldValue(
                  "documentation_completed_date_time",
                  e.target.value
                )
              }
            />
          )}
        </div>

        {/* E-Sanchit */}
        <div style={fieldBlockStyle}>
          <div
            style={{
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <span style={labelInlineStyle}>E-Sanchit:</span>
            <span
              style={statusValueStyle(
                Boolean(formik.values.esanchit_completed_date_time)
              )}
            >
              {formatDisplay(formik.values.esanchit_completed_date_time) ||
                "Pending"}
            </span>
          </div>
          {user?.role === "Admin" && (
            <input
              type="datetime-local"
              style={inputStyle}
              value={formik.values.esanchit_completed_date_time || ""}
              onChange={(e) =>
                formik.setFieldValue(
                  "esanchit_completed_date_time",
                  e.target.value
                )
              }
            />
          )}
        </div>

        {/* Submission */}
        <div style={fieldBlockStyle}>
          <div
            style={{
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <span style={labelInlineStyle}>Submission:</span>
            <span
              style={statusValueStyle(
                Boolean(formik.values.submission_completed_date_time)
              )}
            >
              {formatDisplay(formik.values.submission_completed_date_time) ||
                "Pending"}
            </span>
          </div>
          {user?.role === "Admin" && (
            <input
              type="datetime-local"
              style={inputStyle}
              value={formik.values.submission_completed_date_time || ""}
              onChange={(e) =>
                formik.setFieldValue(
                  "submission_completed_date_time",
                  e.target.value
                )
              }
            />
          )}
        </div>

        {/* DO */}
        <div style={fieldBlockStyle}>
          <div
            style={{
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <span style={labelInlineStyle}>DO:</span>
            <span
              style={statusValueStyle(Boolean(formik.values.do_completed))}
            >
              {formatDisplay(formik.values.do_completed) || "Pending"}
            </span>
          </div>
          {user?.role === "Admin" && (
            <input
              type="datetime-local"
              style={inputStyle}
              value={
                formik.values.do_completed
                  ? new Date(formik.values.do_completed)
                      .toISOString()
                      .slice(0, 16)
                  : ""
              }
              onChange={(e) =>
                formik.setFieldValue("do_completed", e.target.value)
              }
            />
          )}
        </div>
      </div>

      {/* Row 2: Operation Completed / Delivery Completed / Status / Detailed Status */}
      <div style={gridRowStyle}>
        {/* Operation Completed */}
        <div style={fieldBlockStyle}>
          <div
            style={{
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <span style={labelInlineStyle}>Operation Completed:</span>
            <span
              style={statusValueStyle(
                Boolean(formik.values.completed_operation_date),
                true
              )}
            >
              {formatDisplay(formik.values.completed_operation_date) || "-"}
            </span>
          </div>
          {user?.role === "Admin" && (
            <input
              type="datetime-local"
              style={inputStyle}
              value={formik.values.completed_operation_date || ""}
              onChange={(e) =>
                formik.setFieldValue(
                  "completed_operation_date",
                  e.target.value
                )
              }
            />
          )}
        </div>

        {/* Delivery Completed (bill_document_sent_to_accounts) */}
        <div style={fieldBlockStyle}>
          <div
            style={{
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <span style={labelInlineStyle}>Delivery Completed:</span>
            <span
              style={statusValueStyle(
                Boolean(data?.bill_document_sent_to_accounts),
                true
              )}
            >
              {formatDisplay(data?.bill_document_sent_to_accounts) || "-"}
            </span>
          </div>
          {user?.role === "Admin" && (
            <input
              type="datetime-local"
              style={inputStyle}
              value={
                data?.bill_document_sent_to_accounts
                  ? formatDateForInput(data.bill_document_sent_to_accounts)
                  : ""
              }
              onChange={(e) =>
                formik.setFieldValue(
                  "bill_document_sent_to_accounts",
                  e.target.value
                )
              }
            />
          )}
        </div>

        {/* Status */}
        <div style={fieldBlockStyle}>
          <div style={{ fontSize: "14px", marginBottom: "4px" }}>
            <span style={labelInlineStyle}>Status:</span>
          </div>
          <select
            style={selectStyle}
            value={formik.values.status || ""}
            onChange={(e) => formik.setFieldValue("status", e.target.value)}
          >
            <option value="">Select Status</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Detailed Status */}
        <div style={fieldBlockStyle}>
          <div style={{ fontSize: "14px", marginBottom: "4px" }}>
            <span style={labelInlineStyle}>Detailed Status:</span>
          </div>
          <select
            style={selectStyle}
            value={formik.values.detailed_status || ""}
            onChange={(e) =>
              formik.setFieldValue("detailed_status", e.target.value)
            }
          >
            <option value="">Select Detailed Status</option>
            <option value="ETA Date Pending">ETA Date Pending</option>
            <option value="Estimated Time of Arrival">ETA</option>
            <option value="Gateway IGM Filed">Gateway IGM Filed</option>
            <option value="Discharged">Discharged</option>
            <option value="Rail Out">Rail Out</option>
            <option value="BE Noted, Arrival Pending">
              BE Noted, Arrival Pending
            </option>
            <option value="Arrived, BE Note Pending">
              Arrived, BE Note Pending
            </option>
            <option value="BE Noted, Clearance Pending">
              BE Noted, Clearance Pending
            </option>
            <option value="PCV Done, Duty Payment Pending">
              PCV Done, Duty Payment Pending
            </option>
            <option value="Custom Clearance Completed">
              Cus.Clearance Completed
            </option>
            <option value="Billing Pending">Billing Pending</option>
            <option value="Status Completed">Status Completed</option>
          </select>
        </div>
      </div>

      {/* Row 3: Bill Agency / Bill Reimbursement / Bill Date */}
      <div style={gridRowStyle}>
        {/* Bill Agency */}
        <div style={fieldBlockStyle}>
          <div style={smallLabelStyle}>Bill Agency</div>
          <input
            type="text"
            placeholder="Enter Bill Agency"
            style={inputStyle}
            value={billAgency}
            disabled={disabledBySubmission}
            onChange={(e) => {
              const newAgency = e.target.value.trim();
              const newBillNo = `${newAgency},${billReimb}`;
              formik.setFieldValue("bill_no", newBillNo);
            }}
          />
        </div>

        {/* Bill Reimbursement */}
        <div style={fieldBlockStyle}>
          <div style={smallLabelStyle}>Bill Reimbursement</div>
          <input
            type="text"
            placeholder="Enter Bill Reimbursement"
            style={inputStyle}
            value={billReimb}
            disabled={disabledBySubmission}
            onChange={(e) => {
              const newReimb = e.target.value.trim();
              const newBillNo = `${billAgency},${newReimb}`;
              formik.setFieldValue("bill_no", newBillNo);
            }}
          />
        </div>

        {/* Bill Date */}
        <div style={fieldBlockStyle}>
          <div style={smallLabelStyle}>Bill Date</div>
          <input
            type="datetime-local"
            style={inputStyle}
            value={billDateInput}
            disabled={disabledBySubmission}
            onChange={(e) => {
              const newDate1 = e.target.value;
              const currentBillDate = formik.values.bill_date || "";
              const parts = currentBillDate.split(",");
              const newBillDate = `${newDate1},${(parts[1] || "").trim()}`;
              formik.setFieldValue("bill_date", newBillDate);
            }}
          />
        </div>
      </div>
    </div>
  );
}
