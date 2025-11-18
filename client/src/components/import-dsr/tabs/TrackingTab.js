// src/pages/job-details/tabs/TrackingTab.jsx
import React from "react";
import FileUpload from "../../gallery/FileUpload";
import ImagePreview from "../../gallery/ImagePreview";
import JobStickerPDF from "../JobStickerPDF";

export default function TrackingTab({
  user,
  formik,
  data,
  options,
  importTerms,
  handleImportTermsChange,
  ExBondflag,
  InBondflag,
  LCLFlag,
  beTypeOptions,
  filteredClearanceOptions,
  canChangeClearance,
  resetOtherDetails,
  jobDetails,
  formatDateTime,
  formatDateForInput,
  handleCopy,
  handleBlStatusChange,
  isSubmissionDate,
  pdfRef,
  handleGenerateSticker,
  setSnackbar,
  deliveryCompletedDate,
  subtractOneDay,
  handleOpenDutyModal,
  isDutyPaidDateDisabled,
  handleDateChange, // for required DO validity (job level)
}) {
  const containerStyle = {
    padding: "10px 12px",
    backgroundColor: "#f9f9f9",
    fontFamily: "Arial, sans-serif",
    fontSize: "13px",
  };

  const sectionTitleStyle = {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#333",
    margin: "10px 0 6px 0",
    borderBottom: "1px solid #ddd",
    paddingBottom: "4px",
  };

  const rowStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "10px",
    marginBottom: "8px",
  };

  const fieldStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  };

  const labelStyle = {
    fontSize: "11px",
    fontWeight: "bold",
    color: "#555",
  };

  const inputStyle = {
    padding: "4px 7px",
    fontSize: "12px",
    border: "1px solid #ccc",
    borderRadius: "3px",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
  };

  const selectStyle = { ...inputStyle };

  const radioLabelStyle = {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    margin: "0 8px 0 0",
    fontSize: "12px",
    cursor: "pointer",
  };

  const radioInputStyle = {
    width: "14px",
    height: "14px",
    cursor: "pointer",
    margin: 0,
  };


  const checkboxInputStyle = {
    width: "14px",
    height: "14px",
    cursor: "pointer",
    margin: 0,
  };

  const buttonStyle = {
    padding: "5px 10px",
    fontSize: "12px",
    border: "1px solid #007bff",
    borderRadius: "3px",
    cursor: "pointer",
    fontWeight: "bold",
    backgroundColor: "#007bff",
    color: "white",
  };


  const fileBoxStyle = {
    border: "1px solid #ddd",
    padding: "8px",
    borderRadius: "3px",
    backgroundColor: "#fafafa",
  };

  const helperTextStyle = {
    fontSize: "11px",
    color: "#999",
    fontStyle: "italic",
  };


  const fullRow = {
    display: "grid",
    gridTemplateColumns: "repeat(1, minmax(0,1fr))",
    gap: "10px",
    marginBottom: "10px",
  };
 const isAdmin = user?.role === "Admin";


  const row4Style = {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0,1fr))",
    gap: "10px",
    marginBottom: "8px",
  };





  // Helpers to reuse original disabled conditions
  const disabledETA = !isAdmin && (ExBondflag || isSubmissionDate);
  const disabledGatewayBlock = !isAdmin && isSubmissionDate;
  const disabledDischarge =
    !isAdmin &&
    (!formik.values.vessel_berthing || ExBondflag || isSubmissionDate);
  const disabledIgmDate = !isAdmin && (ExBondflag || isSubmissionDate);
  const disabledGenericSubmission = !isAdmin && isSubmissionDate;

  const importTerm = formik.values.import_terms || importTerms;

  const billNo = formik.values.bill_no || "";
  const [billAgencyRaw = "", billReimbRaw = ""] = billNo.split(",");
  const billAgency = billAgencyRaw.trim();
  const billReimb = billReimbRaw.trim();

  return (
    <div className="job-details-container" style={containerStyle}>
      {/* ------- BL / Arrivals / IGM ------- */}
      <h3 style={sectionTitleStyle}>BL / Arrival & IGM</h3>

      <div style={row4Style}>
        <div style={fieldStyle}>
          <label style={labelStyle}>BL No:</label>
          <input
            type="text"
            style={inputStyle}
            value={formik.values.awb_bl_no || ""}
            onChange={(e) => formik.setFieldValue("awb_bl_no", e.target.value)}
            placeholder="Enter BL No"
            // original had // disabled={isSubmissionDate}
            disabled={disabledGenericSubmission}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>BL Date:</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={formatDateForInput(formik.values.awb_bl_date || "")}
            // original comment: disabled={ExBondflag || isSubmissionDate}
            disabled={!isAdmin && (ExBondflag || isSubmissionDate)}
            onChange={(e) => formik.setFieldValue("awb_bl_date", e.target.value)}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>HAWBL No:</label>
          <input
            type="text"
            style={inputStyle}
            value={formik.values.hawb_hbl_no || ""}
            onChange={(e) =>
              formik.setFieldValue("hawb_hbl_no", e.target.value)
            }
            placeholder="Enter HAWBL No"
            disabled={disabledGenericSubmission}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>HAWBL Date:</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={formatDateForInput(formik.values.hawb_hbl_date || "")}
            disabled={!isAdmin && (ExBondflag || isSubmissionDate)}
            onChange={(e) =>
              formik.setFieldValue("hawb_hbl_date", e.target.value)
            }
          />
        </div>
      </div>

      <div style={row4Style}>
        <div style={fieldStyle}>
          <label style={labelStyle}>ETA Date:</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={formatDateForInput(formik.values.vessel_berthing || "")}
            disabled={disabledETA}
            onChange={(e) =>
              formik.setFieldValue("vessel_berthing", e.target.value)
            }
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>G-IGM No:</label>
          <input
            type="text"
            style={inputStyle}
            value={formik.values.gateway_igm || ""}
            disabled={disabledGatewayBlock}
            onChange={(e) =>
              formik.setFieldValue("gateway_igm", e.target.value)
            }
            placeholder="Enter G-IGM No"
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>G-IGM Date:</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={formatDateForInput(formik.values.gateway_igm_date || "")}
            disabled={disabledGatewayBlock}
            onChange={(e) =>
              formik.setFieldValue("gateway_igm_date", e.target.value)
            }
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>IGM No:</label>
          <input
            type="text"
            style={inputStyle}
            value={formik.values.igm_no || ""}
            disabled={disabledGatewayBlock}
            onChange={(e) => formik.setFieldValue("igm_no", e.target.value)}
            placeholder="Enter IGM No"
          />
        </div>
      </div>

      <div style={row4Style}>
        <div style={fieldStyle}>
          <label style={labelStyle}>IGM Date:</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={formatDateForInput(formik.values.igm_date || "")}
            disabled={disabledIgmDate}
            onChange={(e) => formik.setFieldValue("igm_date", e.target.value)}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Discharge / L-IGM Date:</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={formatDateForInput(formik.values.discharge_date || "")}
            disabled={disabledDischarge}
            onChange={(e) =>
              formik.setFieldValue("discharge_date", e.target.value)
            }
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Line No:</label>
          <input
            type="text"
            style={inputStyle}
            value={formik.values.line_no || ""}
            disabled={disabledGatewayBlock}
            onChange={(e) => formik.setFieldValue("line_no", e.target.value)}
            placeholder="Enter Line No"
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>No Of Packages:</label>
          <input
            type="number"
            style={inputStyle}
            value={formik.values.no_of_pkgs || ""}
            disabled={disabledGatewayBlock}
            onChange={(e) =>
              formik.setFieldValue("no_of_pkgs", e.target.value)
            }
            placeholder="Enter No Of packages"
          />
        </div>
      </div>

      {/* ------- HSS & Bank ------- */}
      <h3 style={sectionTitleStyle}>HSS & Bank</h3>

      <div style={row4Style}>
        <div style={fieldStyle}>
          <label style={labelStyle}>HSS:</label>
          <select
            style={selectStyle}
            value={formik.values.hss || "No"}
            onChange={(e) => formik.setFieldValue("hss", e.target.value)}
            disabled={disabledGatewayBlock}
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>

        {formik.values.hss === "Yes" && (
          <div style={fieldStyle}>
            <label style={labelStyle}>Seller Name:</label>
            <input
              type="text"
              style={inputStyle}
              value={formik.values.saller_name || ""}
              disabled={disabledGatewayBlock}
              onChange={(e) =>
                formik.setFieldValue("saller_name", e.target.value)
              }
              placeholder="Enter Seller Name"
            />
          </div>
        )}

        <div style={fieldStyle}>
          <label style={labelStyle}>AD Code:</label>
          <input
            type="text"
            style={inputStyle}
            value={formik.values.adCode || ""}
            disabled={disabledGatewayBlock}
            onChange={(e) => formik.setFieldValue("adCode", e.target.value)}
            placeholder="Enter AD Code"
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Bank Name:</label>
          <input
            type="text"
            style={inputStyle}
            value={formik.values.bank_name || ""}
            disabled={disabledGatewayBlock}
            onChange={(e) =>
              formik.setFieldValue("bank_name", e.target.value)
            }
            placeholder="Enter Bank Name"
          />
        </div>

        {!LCLFlag && (
          <div style={fieldStyle}>
            <label style={labelStyle}>Free Time (days):</label>
            <select
              style={selectStyle}
              value={formik.values.free_time || ""}
              disabled={disabledGatewayBlock}
              onChange={(e) =>
                formik.setFieldValue("free_time", e.target.value)
              }
            >
              <option value="">Select Free Time</option>
              {options?.map((opt, id) => (
                <option key={id} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ------- Terms of Invoice ------- */}
      <h3 style={sectionTitleStyle}>Terms of Invoice</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "80px 1fr",
          gap: "10px",
          marginBottom: "6px",
          alignItems: "flex-start",
        }}
      >
        <label style={{ ...labelStyle, marginTop: "2px" }}>Terms:</label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr 1fr 1fr",
            gap: "10px",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {["CIF", "FOB", "CF", "CI"].map((term) => (
              <label key={term} style={radioLabelStyle}>
                <input
                  type="radio"
                  name="import_terms"
                  value={term}
                  checked={importTerm === term}
                  onChange={() =>
                    handleImportTermsChange({ target: { value: term } })
                  }
                  style={radioInputStyle}
                  disabled={disabledGatewayBlock}
                />
                {term === "CF" ? "C&F" : term === "CI" ? "C&I" : term}
              </label>
            ))}
          </div>

          <div style={fieldStyle}>
            <label style={{ ...labelStyle, fontSize: "11px" }}>
              {importTerm} Value (₹):
            </label>
            <input
              type="number"
              style={inputStyle}
              value={formik.values.cifValue || ""}
              onChange={(e) => formik.setFieldValue("cifValue", e.target.value)}
            />
          </div>

          {(importTerm === "FOB" || importTerm === "CI") && (
            <div style={fieldStyle}>
              <label style={{ ...labelStyle, fontSize: "11px" }}>
                Freight (₹):
              </label>
              <input
                type="number"
                style={inputStyle}
                value={formik.values.freight || ""}
                onChange={(e) =>
                  formik.setFieldValue("freight", e.target.value)
                }
              />
            </div>
          )}

          {(importTerm === "FOB" || importTerm === "CF") && (
            <div style={fieldStyle}>
              <label style={{ ...labelStyle, fontSize: "11px" }}>
                Insurance (₹):
              </label>
              <input
                type="number"
                style={inputStyle}
                value={formik.values.insurance || ""}
                onChange={(e) =>
                  formik.setFieldValue("insurance", e.target.value)
                }
              />
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: "10px", marginLeft: "80px" }}>
        <span style={helperTextStyle}>
          {importTerm === "CIF" && "Cost, Insurance & Freight included"}
          {importTerm === "FOB" &&
            "Free on Board - Add freight & insurance"}
          {importTerm === "CF" &&
            "Cost & Freight - Add insurance"}
          {importTerm === "CI" &&
            "Cost & Insurance - Add freight"}
        </span>
      </div>

      {/* ------- Priority / Payment / FTA / Description / CTH / BOE Type / Clearance ------- */}
      <h3 style={sectionTitleStyle}>Priority, Payment & BOE</h3>

      <div style={row4Style}>
        {/* Priority */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Priority:</label>
          <div style={{ display: "flex", gap: "6px" }}>
            {["normal", "Priority", "High Priority"].map((p) => (
              <label key={p} style={radioLabelStyle}>
                <input
                  type="radio"
                  name="priorityJob"
                  value={p}
                  checked={formik.values.priorityJob === p}
                  onChange={(e) =>
                    formik.setFieldValue("priorityJob", e.target.value)
                  }
                  style={radioInputStyle}
                  disabled={disabledGenericSubmission}
                />
                {p}
              </label>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Payment Method:</label>
          <div style={{ display: "flex", gap: "8px" }}>
            {["Transaction", "Deferred"].map((m) => (
              <label key={m} style={radioLabelStyle}>
                <input
                  type="radio"
                  name="payment_method"
                  value={m}
                  checked={formik.values.payment_method === m}
                  onChange={(e) =>
                    formik.setFieldValue("payment_method", e.target.value)
                  }
                  style={radioInputStyle}
                  disabled={disabledGenericSubmission}
                />
                {m}
              </label>
            ))}
          </div>
        </div>

        {/* FTA Benefit */}
        <div style={fieldStyle}>
          <label style={labelStyle}>FTA Benefit:</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={
              formik.values.fta_Benefit_date_time ||
              ""
            }
            onChange={(e) => {
              const val = e.target.value;
              formik.setFieldValue(
                "fta_Benefit_date_time",
                val || ""
              );
            }}
            disabled={disabledGenericSubmission}
          />
        </div>

        {/* Description */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Description:</label>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <input
              type="text"
              style={{ ...inputStyle, flex: 1 }}
              value={formik.values.description || ""}
              onChange={(e) =>
                formik.setFieldValue("description", e.target.value)
              }
              disabled={disabledGenericSubmission}
            />
            <button
              type="button"
              style={{
                border: "none",
                background: "transparent",
                fontSize: "11px",
                cursor: "pointer",
                textDecoration: "underline",
                color: "#007bff",
              }}
              onClick={(event) => handleCopy(event, formik.values.description)}
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      <div style={row4Style}>
        {/* CTH */}
        <div style={fieldStyle}>
          <label style={labelStyle}>CTH No:</label>
          <input
            type="text"
            style={inputStyle}
            value={formik.values.cth_no || ""}
            onChange={(e) => formik.setFieldValue("cth_no", e.target.value)}
            disabled={disabledGenericSubmission}
          />
        </div>

        {/* BOE Type */}
        <div style={fieldStyle}>
          <label style={labelStyle}>BOE Type:</label>
          <select
            style={selectStyle}
            value={formik.values.type_of_b_e || ""}
            onChange={(e) =>
              formik.setFieldValue("type_of_b_e", e.target.value)
            }
            disabled={disabledGenericSubmission}
          >
            <option value="">Select BE Type</option>
            {beTypeOptions?.map((opt, index) => (
              <option key={index} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Clearance Under */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Clearance Under:</label>
          <select
            style={selectStyle}
            value={formik.values.clearanceValue || ""}
            onChange={(e) => {
              if (canChangeClearance()) {
                formik.setFieldValue("clearanceValue", e.target.value);
              } else {
                alert(
                  "Please clear Ex-Bond details before changing Clearance Under."
                );
              }
            }}
          >
            <option value="">Select Clearance Type</option>
            {filteredClearanceOptions?.map((opt, index) => (
              <option key={index} value={opt.value || ""}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* In Bond (Ex-Bondflag) */}
        {ExBondflag && (
          <div style={fieldStyle}>
            <label style={labelStyle}>In Bond:</label>
            <select
              style={selectStyle}
              name="exBondValue"
              value={formik.values.exBondValue || ""}
              onChange={(e) =>
                formik.setFieldValue("exBondValue", e.target.value)
              }
            >
              <option value="">Select In-Bond Type</option>
              <option value="other">Other</option>
              {jobDetails?.map((job) => (
                <option key={job.job_no} value={job.job_no}>
                  {job.job_no} - {job.importer}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Ex-Bond extra details (other / linked job) – keep same as previous inline version */}
      {/* ... (use the version you already pasted, unchanged) ... */}

      {/* ------- Weights & BOE ------- */}
      <div style={row4Style}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Gross Weight (KGS):</label>
          <input
            type="number"
            style={inputStyle}
            id="gross_weight"
            value={formik.values.gross_weight || ""}
            onChange={(e) =>
              formik.setFieldValue("gross_weight", e.target.value)
            }
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Net Weight (KGS):</label>
          <input
            type="number"
            style={inputStyle}
            id="job_net_weight"
            value={formik.values.job_net_weight || ""}
            onChange={(e) =>
              formik.setFieldValue("job_net_weight", e.target.value)
            }
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>BOE NO:</label>
          <input
            type="text"
            style={inputStyle}
            id="be_no"
            value={formik.values.be_no || ""}
            onChange={(e) => formik.setFieldValue("be_no", e.target.value)}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>BOE Date:</label>
          <input
            type="date"
            style={inputStyle}
            id="be_date"
            value={formik.values.be_date || ""}
            onChange={(e) => formik.setFieldValue("be_date", e.target.value)}
          />
        </div>
      </div>

      {/* ------- Assessment / PCV / Duty / OOC ------- */}
      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Assessment Date:</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={formatDateForInput(formik.values.assessment_date || "")}
            onChange={(e) =>
              formik.setFieldValue("assessment_date", e.target.value)
            }
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>PCV Date:</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={formatDateForInput(formik.values.pcv_date || "")}
            onChange={(e) => formik.setFieldValue("pcv_date", e.target.value)}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Duty Paid Date:</label>
          <div style={{ display: "flex", gap: "4px" }}>
            <input
              type="datetime-local"
              style={{ ...inputStyle, flex: 1 }}
              value={formatDateForInput(formik.values.duty_paid_date || "")}
              onChange={(e) =>
                formik.setFieldValue("duty_paid_date", e.target.value)
              }
              disabled={isDutyPaidDateDisabled && user?.role !== "Admin"}
            />
            <button
              type="button"
              style={{ ...buttonStyle, padding: "4px 6px" }}
              onClick={handleOpenDutyModal}
            >
              +
            </button>
          </div>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Out of Charge Date:</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={formatDateForInput(formik.values.out_of_charge || "")}
            onChange={(e) =>
              formik.setFieldValue("out_of_charge", e.target.value)
            }
          />
        </div>
      </div>

      {/* ------- BOE Filing Type ------- */}
      <div
        style={{
          marginBottom: "8px",
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <label style={labelStyle}>BOE Filing:</label>
        <div style={{ display: "flex", gap: "10px" }}>
          {["Discharge", "Railout", "Advanced", "Prior"].map((f) => (
            <label key={f} style={radioLabelStyle}>
              <input
                type="radio"
                name="be_filing_type"
                value={f}
                checked={formik.values.be_filing_type === f}
                onChange={(e) =>
                  formik.setFieldValue("be_filing_type", e.target.value)
                }
                style={radioInputStyle}
              />
              {f}
            </label>
          ))}
        </div>
      </div>

      {/* ------- Checklist / Sticker / BE / OOC / GatePass / DO uploads ------- */}
      <h3 style={sectionTitleStyle}>File Uploads</h3>

      {/* Keep your compact grid uploads as you already had */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
          marginBottom: "8px",
        }}
      >
        <div style={fileBoxStyle}>
          <label style={labelStyle}>Checklist:</label>
          <FileUpload
            label="Upload Checklist"
            bucketPath="checklist"
            onFilesUploaded={(newFiles, replaceMode) => {
              if (replaceMode) {
                formik.setFieldValue("checklist", newFiles);
              } else {
                const existing = formik.values.checklist || [];
                formik.setFieldValue("checklist", [...existing, ...newFiles]);
              }
            }}
            singleFileOnly={true}
            replaceMode={true}
          />
          <ImagePreview
            images={formik.values.checklist || []}
            onDeleteImage={(index) => {
              const updated = [...(formik.values.checklist || [])];
              updated.splice(index, 1);
              formik.setFieldValue("checklist", updated);
            }}
            onImageClick={() =>
              formik.setFieldValue("is_checklist_clicked", true)
            }
          />
        </div>

        {/* JobSticker PDF & Button */}
        <JobStickerPDF
          ref={pdfRef}
          jobData={{
            job_no: formik.values.job_no,
            year: formik.values.year,
            importer: formik.values.importer,
            be_no: formik.values.be_no,
            be_date: formik.values.be_date,
            invoice_number: formik.values.invoice_number,
            invoice_date: formik.values.invoice_date,
            loading_port: formik.values.loading_port,
            no_of_pkgs: formik.values.no_of_pkgs,
            description: formik.values.description,
            gross_weight: formik.values.gross_weight,
            job_net_weight: formik.values.job_net_weight,
            gateway_igm: formik.values.gateway_igm,
            gateway_igm_date: formik.values.gateway_igm_date,
            igm_no: formik.values.igm_no,
            igm_date: formik.values.igm_date,
            awb_bl_no: formik.values.awb_bl_no,
            awb_bl_date: formik.values.awb_bl_date,
            shipping_line_airline: formik.values.shipping_line_airline,
            custom_house: formik.values.custom_house,
            container_nos: formik.values.container_nos,
          }}
          data={data}
        />

        <div style={fileBoxStyle}>
          <label style={labelStyle}>Job Sticker:</label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "6px",
            }}
          >
            <button
              type="button"
              style={buttonStyle}
              onClick={handleGenerateSticker}
            >
              Generate Job Sticker
            </button>
            <FileUpload
              label="Job Sticker Upload"
              bucketPath="job-sticker"
              onFilesUploaded={(newFiles) => {
                const existing = formik.values.job_sticker_upload || [];
                const updatedFiles = [...existing, ...newFiles];
                formik.setFieldValue("job_sticker_upload", updatedFiles);
              }}
              singleFileOnly={false}
            />
          </div>
          <ImagePreview
            images={formik.values.job_sticker_upload || []}
            onDeleteImage={(index) => {
              const updated =
                formik.values.job_sticker_upload?.filter(
                  (_, idx) => idx !== index
                ) || [];
              formik.setFieldValue("job_sticker_upload", updated);
            }}
          />
        </div>

        <div style={fileBoxStyle}>
          <label style={labelStyle}>Processed BE:</label>
          <FileUpload
            label="Upload Processed BE Copy"
            bucketPath="processed_be_attachment"
            onFilesUploaded={(newFiles) => {
              const existing =
                formik.values.processed_be_attachment || [];
              const updatedFiles = [...existing, ...newFiles];
              formik.setFieldValue(
                "processed_be_attachment",
                updatedFiles
              );
            }}
            singleFileOnly={false}
          />
          <ImagePreview
            images={formik.values.processed_be_attachment || []}
            onDeleteImage={(index) => {
              const updated =
                formik.values.processed_be_attachment?.filter(
                  (_, idx) => idx !== index
                ) || [];
              formik.setFieldValue("processed_be_attachment", updated);
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
          marginBottom: "8px",
        }}
      >
        <div style={fileBoxStyle}>
          <label style={labelStyle}>OOC Copy:</label>
          <FileUpload
            label="Upload OOC Copy"
            bucketPath="ooc_copies"
            onFilesUploaded={(newFiles) => {
              const existing = formik.values.ooc_copies || [];
              const updatedFiles = [...existing, ...newFiles];
              formik.setFieldValue("ooc_copies", updatedFiles);
            }}
            singleFileOnly={false}
          />
          <ImagePreview
            images={formik.values.ooc_copies || []}
            onDeleteImage={(index) => {
              const updated = [...(formik.values.ooc_copies || [])];
              updated.splice(index, 1);
              formik.setFieldValue("ooc_copies", updated);
            }}
          />
        </div>

        <div style={fileBoxStyle}>
          <label style={labelStyle}>Gate Pass:</label>
          <FileUpload
            label="Upload Customs Gate Pass Copy"
            bucketPath="gate_pass_copies"
            onFilesUploaded={(newFiles) => {
              const existing = formik.values.gate_pass_copies || [];
              const updatedFiles = [...existing, ...newFiles];
              formik.setFieldValue("gate_pass_copies", updatedFiles);
            }}
            singleFileOnly={false}
          />
          <ImagePreview
            images={formik.values.gate_pass_copies || []}
            onDeleteImage={(index) => {
              const updated =
                formik.values.gate_pass_copies?.filter(
                  (_, idx) => idx !== index
                ) || [];
              formik.setFieldValue("gate_pass_copies", updated);
            }}
          />
        </div>

        <div style={fileBoxStyle}>
          <label style={labelStyle}>DO Copies:</label>
          <FileUpload
            label="Upload DO Copies"
            bucketPath="do_copies"
            onFilesUploaded={(newFiles) => {
              const existing = formik.values.do_copies || [];
              const updatedFiles = [...existing, ...newFiles];
              formik.setFieldValue("do_copies", updatedFiles);
            }}
            singleFileOnly={false}
          />
          <ImagePreview
            images={formik.values.do_copies || []}
            onDeleteImage={(index) => {
              const updated =
                formik.values.do_copies?.filter(
                  (_, idx) => idx !== index
                ) || [];
              formik.setFieldValue("do_copies", updated);
            }}
          />
        </div>
      </div>

      {/* ------- Checklist Approved / Examination / First Check ------- */}
      <h3 style={sectionTitleStyle}>Checklist & Examination</h3>

      <div style={rowStyle}>
        {/* Checklist Approved */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Checklist Approved:</label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              style={checkboxInputStyle}
              checked={formik.values.is_checklist_aprroved}
              onChange={(e) => {
                const isChecked = e.target.checked;
                if (isChecked) {
                  const currentDateTime = new Date(
                    Date.now() - new Date().getTimezoneOffset() * 60000
                  )
                    .toISOString()
                    .slice(0, 16);
                  formik.setFieldValue("is_checklist_aprroved", true);
                  formik.setFieldValue(
                    "is_checklist_aprroved_date",
                    currentDateTime
                  );
                } else {
                  formik.setFieldValue("is_checklist_aprroved", false);
                  formik.setFieldValue("is_checklist_aprroved_date", "");
                }
              }}
              disabled={
                user?.role !== "Admin" &&
                !formik.values.is_checklist_clicked
              }
            />
            {!formik.values.is_checklist_clicked && (
              <span style={{ fontSize: "11px", fontStyle: "italic" }}>
                (Click on a checklist file first to enable)
              </span>
            )}
          </div>
          {formik.values.is_checklist_aprroved_date && (
            <div style={{ marginTop: "4px", fontSize: "11px" }}>
              {new Date(
                formik.values.is_checklist_aprroved_date
              ).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                hour12: true,
              })}
            </div>
          )}
        </div>

        {/* Examination Planning (checkbox + auto date) */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Examination Planning:</label>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              type="checkbox"
              style={checkboxInputStyle}
              checked={formik.values.examinationPlanning}
              onChange={(e) => {
                const isChecked = e.target.checked;
                if (isChecked) {
                  const currentDateTime = new Date(
                    Date.now() - new Date().getTimezoneOffset() * 60000
                  )
                    .toISOString()
                    .slice(0, 16);
                  formik.setFieldValue("examinationPlanning", true);
                  formik.setFieldValue(
                    "examination_planning_date",
                    currentDateTime
                  );
                } else {
                  formik.setFieldValue("examinationPlanning", false);
                  formik.setFieldValue("examination_planning_date", "");
                }
              }}
            />
            {formik.values.examination_planning_date && (
              <span style={{ fontSize: "11px", fontWeight: "bold" }}>
                {new Date(
                  formik.values.examination_planning_date
                ).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  hour12: true,
                })}
              </span>
            )}
          </div>
        </div>

        {/* Examination Planning date (Admin override) */}
        {user?.role === "Admin" && (
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Examination Planning Date (Admin):
            </label>
            <input
              type="datetime-local"
              style={inputStyle}
              value={formatDateForInput(
                formik.values.examination_planning_date || ""
              )}
              onChange={(e) => {
                const newValue = e.target.value;
                if (newValue) {
                  formik.setFieldValue("examinationPlanning", true);
                  formik.setFieldValue(
                    "examination_planning_date",
                    newValue
                  );
                } else {
                  formik.setFieldValue("examinationPlanning", false);
                  formik.setFieldValue("examination_planning_date", "");
                }
              }}
            />
          </div>
        )}

        {/* First Check switch (simple checkbox with date stamp) */}
        <div style={fieldStyle}>
          <label style={labelStyle}>First Check:</label>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              type="checkbox"
              style={checkboxInputStyle}
              checked={Boolean(formik.values.firstCheck)}
              onChange={(e) => {
                if (e.target.checked) {
                  const currentDateTime = new Date(
                    Date.now() - new Date().getTimezoneOffset() * 60000
                  )
                    .toISOString()
                    .slice(0, 16);
                  formik.setFieldValue("firstCheck", currentDateTime);
                } else {
                  formik.setFieldValue("firstCheck", "");
                }
              }}
              disabled={
                user?.role !== "Admin" &&
                Boolean(formik.values.out_of_charge?.trim())
              }
            />
            {formik.values.firstCheck && (
              <span style={{ fontSize: "11px", fontWeight: "bold" }}>
                {new Date(formik.values.firstCheck).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                  timeZone: "Asia/Kolkata",
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Examination Date display */}
      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Examination Date:</label>
          <div>{data.examination_date || ""}</div>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>PCV Date (Copy):</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={formatDateForInput(formik.values.pcv_date || "")}
            onChange={(e) => formik.setFieldValue("pcv_date", e.target.value)}
          />
        </div>
      </div>

      {/* ------- Document Type (OBL / Telex / etc) ------- */}
      <h3 style={sectionTitleStyle}>Document Type / OBL Status</h3>

      <div style={rowStyle}>
        <div style={{ ...fieldStyle, gridColumn: "1 / 3" }}>
          <label style={labelStyle}>Document Type:</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {["OBL", "Telex", "Surrender BL", "Waybill", "clear"].map((val) => (
              <label key={val} style={radioLabelStyle}>
                <input
                  type="radio"
                  name="obl_telex_bl"
                  value={val}
                  checked={formik.values.obl_telex_bl === val}
                  onChange={handleBlStatusChange}
                  style={radioInputStyle}
                />
                {val === "OBL"
                  ? "Original Documents"
                  : val === "clear"
                  ? "Clear"
                  : val}
              </label>
            ))}
          </div>
        </div>

        {user?.role === "Admin" && (
          <div style={fieldStyle}>
            <label style={labelStyle}>
              {formik.values.obl_telex_bl === "OBL"
                ? "Original Document Received Date:"
                : "Document Received Date:"}
            </label>
            <input
              type="datetime-local"
              style={inputStyle}
              value={formatDateForInput(
                formik.values.document_received_date || ""
              )}
              onChange={(e) =>
                formik.setFieldValue("document_received_date", e.target.value)
              }
            />
          </div>
        )}
      </div>

      {/* ------- DO Planning / Validity / Revalidation ------- */}
      <h3 style={sectionTitleStyle}>Delivery Order (DO)</h3>

      <div style={rowStyle}>
        {/* DO Planning */}
        <div style={fieldStyle}>
          <label style={labelStyle}>DO Planning:</label>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              type="checkbox"
              style={checkboxInputStyle}
              checked={formik.values.doPlanning}
              onChange={(e) => {
                const isChecked = e.target.checked;
                if (isChecked) {
                  const currentDateTime = new Date(
                    Date.now() - new Date().getTimezoneOffset() * 60000
                  )
                    .toISOString()
                    .slice(0, 16);
                  formik.setFieldValue("doPlanning", true);
                  formik.setFieldValue("do_planning_date", currentDateTime);
                } else {
                  formik.setFieldValue("doPlanning", false);
                  formik.setFieldValue("do_planning_date", "");
                }
              }}
            />
            {formik.values.do_planning_date && (
              <span style={{ fontSize: "11px", fontWeight: "bold" }}>
                {new Date(
                  formik.values.do_planning_date
                ).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  hour12: true,
                })}
              </span>
            )}
          </div>
        </div>

        {/* DO Planning Type */}
        <div style={fieldStyle}>
          <label style={labelStyle}>DO Planning Type:</label>
          <div style={{ display: "flex", gap: "8px" }}>
            {["ICD", "Factory", "Clear"].map((val) => (
              <label key={val} style={radioLabelStyle}>
                <input
                  type="radio"
                  name="type_of_Do"
                  value={val}
                  checked={formik.values.type_of_Do === val}
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    if (selectedValue === "Clear") {
                      formik.setFieldValue("type_of_Do", "");
                    } else {
                      formik.setFieldValue("type_of_Do", selectedValue);
                    }
                  }}
                  style={radioInputStyle}
                />
                {val}
              </label>
            ))}
          </div>
        </div>

        {/* DO Planning Date Admin Override */}
        {user?.role === "Admin" && (
          <div style={fieldStyle}>
            <label style={labelStyle}>DO Planning Date (Admin):</label>
            <input
              type="datetime-local"
              style={inputStyle}
              value={formatDateForInput(
                formik.values.do_planning_date || ""
              )}
              onChange={(e) =>
                formik.setFieldValue("do_planning_date", e.target.value)
              }
            />
          </div>
        )}
      </div>

      <div style={rowStyle}>
        {/* DO Validity Upto Job Level */}
        <div style={fieldStyle}>
          <label style={labelStyle}>DO Validity:</label>
          {formik.values.do_revalidation ? (
            <div style={{ fontSize: "12px" }}>
              {formik.values.do_validity_upto_job_level || ""}
            </div>
          ) : (
            <input
              type="date"
              style={inputStyle}
              value={formik.values.do_validity_upto_job_level || ""}
              onChange={(e) =>
                formik.setFieldValue(
                  "do_validity_upto_job_level",
                  e.target.value
                )
              }
            />
          )}
        </div>

        {/* Required DO validity up to (container 0) */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Required DO Validity Upto:</label>
          <input
            type="date"
            style={inputStyle}
            value={
              formik.values.container_nos?.[0]?.required_do_validity_upto ||
              ""
            }
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </div>

        {/* DO Revalidation checkbox */}
        <div style={fieldStyle}>
          <label style={labelStyle}>DO Revalidation:</label>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              type="checkbox"
              style={checkboxInputStyle}
              checked={formik.values.do_revalidation}
              onChange={(e) => {
                const isChecked = e.target.checked;
                if (isChecked) {
                  const currentDateTime = new Date(
                    Date.now() - new Date().getTimezoneOffset() * 60000
                  )
                    .toISOString()
                    .slice(0, 16);
                  formik.setFieldValue("do_revalidation", true);
                  formik.setFieldValue(
                    "do_revalidation_date",
                    currentDateTime
                  );
                } else {
                  formik.setFieldValue("do_revalidation", false);
                  formik.setFieldValue("do_revalidation_date", "");
                }
              }}
            />
            {formik.values.do_revalidation_date && (
              <span style={{ fontSize: "11px", fontWeight: "bold" }}>
                {new Date(
                  formik.values.do_revalidation_date
                ).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  hour12: true,
                })}
              </span>
            )}
          </div>
        </div>

        {/* DO Revalidation Date Admin */}
        {user?.role === "Admin" && (
          <div style={fieldStyle}>
            <label style={labelStyle}>DO Revalidation Date (Admin):</label>
            <input
              type="datetime-local"
              style={inputStyle}
              value={formatDateForInput(
                formik.values.do_revalidation_date || ""
              )}
              onChange={(e) =>
                formik.setFieldValue("do_revalidation_date", e.target.value)
              }
            />
          </div>
        )}
      </div>

      {/* DO Received & DO Copies read-only */}
      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>DO Received Date:</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={formatDateTime(
              formik.values.do_completed ? formik.values.do_completed : ""
            )}
            onChange={(e) =>
              formik.setFieldValue("do_completed", e.target.value)
            }
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>DO Valid Up to:</label>
          <div>{formik.values.do_validity_upto_job_level || ""}</div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>DO Copies (Read only):</label>
          <ImagePreview images={formik.values.do_copies || []} readOnly />
        </div>
      </div>

      {/* ------- Remarks ------- */}
      <h3 style={sectionTitleStyle}>Remarks</h3>

      <div style={fullRow}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Remarks:</label>
  <textarea
            style={{
              ...inputStyle,
              minHeight: "50px",
              resize: "vertical",
              fontFamily: "Arial, sans-serif",
            }}
            value={formik.values.remarks || ""}
            onChange={(e) => formik.setFieldValue("remarks", e.target.value)}
            placeholder="Enter remarks..."
          />
        </div>
      </div>
    </div>
  );
}