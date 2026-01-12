// src/pages/job-details/tabs/TrackingTab.jsx
import React from "react";
import ImagePreview from "../../gallery/ImagePreview";
import { BranchContext } from "../../../contexts/BranchContext";
import { useContext } from "react";

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
}) {
  const { selectedBranch } = useContext(BranchContext);
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

  const checkboxLabelStyle = {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12px",
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

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#6c757d",
    borderColor: "#6c757d",
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

  // small helper
  const onlyAdmin = user?.role === "Admin";

  return (
    <div style={containerStyle}>
      {/* ------- TOP BASIC FIELDS (already rendered in header, keep minimal here if needed) ------- */}

      {/* ------- TRACKING & BL / ARRIVAL DETAILS ------- */}
      <h3 style={sectionTitleStyle}>BL / Arrival & IGM</h3>

      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>BL No:</label>
          <input
            type="text"
            style={inputStyle}
            value={formik.values.awb_bl_no || ""}
            onChange={(e) => formik.setFieldValue("awb_bl_no", e.target.value)}
            placeholder="Enter BL No"
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>BL Date:</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={formatDateForInput(formik.values.awb_bl_date || "")}
            onChange={(e) => formik.setFieldValue("awb_bl_date", e.target.value)}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>HAWBL No:</label>
          <input
            type="text"
            style={inputStyle}
            value={formik.values.hawb_hbl_no || ""}
            onChange={(e) => formik.setFieldValue("hawb_hbl_no", e.target.value)}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>HAWBL Date:</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={formatDateForInput(formik.values.hawb_hbl_date || "")}
            onChange={(e) =>
              formik.setFieldValue("hawb_hbl_date", e.target.value)
            }
          />
        </div>
      </div>

      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>ETA Date:</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={formatDateForInput(formik.values.vessel_berthing || "")}
            onChange={(e) =>
              formik.setFieldValue("vessel_berthing", e.target.value)
            }
          />
        </div>
        {selectedBranch !== "GANDHIDHAM" && (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>G-IGM No:</label>
              <input
                type="text"
                style={inputStyle}
                value={formik.values.gateway_igm || ""}
                onChange={(e) =>
                  formik.setFieldValue("gateway_igm", e.target.value)
                }
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>G-IGM Date:</label>
              <input
                type="datetime-local"
                style={inputStyle}
                value={formatDateForInput(formik.values.gateway_igm_date || "")}
                onChange={(e) =>
                  formik.setFieldValue("gateway_igm_date", e.target.value)
                }
              />
            </div>
          </>
        )}
        <div style={fieldStyle}>
          <label style={labelStyle}>IGM No:</label>
          <input
            type="text"
            style={inputStyle}
            value={formik.values.igm_no || ""}
            onChange={(e) => formik.setFieldValue("igm_no", e.target.value)}
          />
        </div>
      </div>

      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>IGM Date:</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={formatDateForInput(formik.values.igm_date || "")}
            onChange={(e) => formik.setFieldValue("igm_date", e.target.value)}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Discharge Date:</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={formatDateForInput(formik.values.discharge_date || "")}
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
            onChange={(e) => formik.setFieldValue("line_no", e.target.value)}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>No Of Packages:</label>
          <input
            type="number"
            style={inputStyle}
            value={formik.values.no_of_pkgs || ""}
            onChange={(e) =>
              formik.setFieldValue("no_of_pkgs", e.target.value)
            }
          />
        </div>
      </div>

      {/* ------- HSS / Bank / AD / Free Time ------- */}
      <h3 style={sectionTitleStyle}>HSS & Bank</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
          marginBottom: "8px",
        }}
      >
        <div style={fieldStyle}>
          <label style={labelStyle}>HSS:</label>
          <select
            style={selectStyle}
            value={formik.values.hss || "No"}
            onChange={(e) => formik.setFieldValue("hss", e.target.value)}
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        {formik.values.hss === "Yes" && (
          <div style={fieldStyle}>
            <label style={labelStyle}>Seller Name:</label>
            <input
              type="text"
              style={inputStyle}
              value={formik.values.saller_name || ""}
              onChange={(e) =>
                formik.setFieldValue("saller_name", e.target.value)
              }
            />
          </div>
        )}

        <div style={fieldStyle}>
          <label style={labelStyle}>AD Code:</label>
          <input
            type="text"
            style={inputStyle}
            value={formik.values.adCode || ""}
            onChange={(e) => formik.setFieldValue("adCode", e.target.value)}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Bank Name:</label>
          <input
            type="text"
            style={inputStyle}
            value={formik.values.bank_name || ""}
            onChange={(e) =>
              formik.setFieldValue("bank_name", e.target.value)
            }
          />
        </div>

        {!LCLFlag && (
          <div style={fieldStyle}>
            <label style={labelStyle}>Free Time:</label>
            <select
              style={selectStyle}
              value={formik.values.free_time || ""}
              onChange={(e) =>
                formik.setFieldValue("free_time", e.target.value)
              }
            >
              <option value="">Select Free Time</option>
              {options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} Days
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ------- TERMS OF INVOICE (COMPACT, HORIZONTAL RADIO) ------- */}
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
            {["CIF", "FOB", "C&F", "C&I"].map((term) => (
              <label key={term} style={radioLabelStyle}>
                <input
                  type="radio"
                  name="import_terms"
                  value={term}
                  checked={(formik.values.import_terms || importTerms) === term}
                  onChange={() =>
                    handleImportTermsChange({ target: { value: term } })
                  }
                  style={radioInputStyle}
                />
                {term}
              </label>
            ))}
          </div>

          <div style={fieldStyle}>
            <label style={{ ...labelStyle, fontSize: "11px" }}>
              {(formik.values.import_terms || importTerms)} Value:
            </label>
            <input
              type="number"
              style={inputStyle}
              value={formik.values.cifValue || ""}
              onChange={(e) => formik.setFieldValue("cifValue", e.target.value)}
              placeholder="₹"
            />
          </div>

          {["FOB", "C&I"].includes(
            formik.values.import_terms || importTerms
          ) && (
              <div style={fieldStyle}>
                <label style={{ ...labelStyle, fontSize: "11px" }}>Freight:</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={formik.values.freight || ""}
                  onChange={(e) =>
                    formik.setFieldValue("freight", e.target.value)
                  }
                  placeholder="₹"
                />
              </div>
            )}

          {["FOB", "C&F"].includes(
            formik.values.import_terms || importTerms
          ) && (
              <div style={fieldStyle}>
                <label style={{ ...labelStyle, fontSize: "11px" }}>
                  Insurance:
                </label>
                <input
                  type="number"
                  style={inputStyle}
                  value={formik.values.insurance || ""}
                  onChange={(e) =>
                    formik.setFieldValue("insurance", e.target.value)
                  }
                  placeholder="₹"
                />
              </div>
            )}
        </div>
      </div>

      <div style={{ marginBottom: "10px", marginLeft: "80px" }}>
        <span style={helperTextStyle}>
          {(formik.values.import_terms || importTerms) === "CIF" &&
            "Cost, Insurance & Freight included"}
          {(formik.values.import_terms || importTerms) === "FOB" &&
            "Add freight & insurance"}
          {(formik.values.import_terms || importTerms) === "C&F" &&
            "Add insurance"}
          {(formik.values.import_terms || importTerms) === "C&I" &&
            "Add freight"}
        </span>
      </div>

      {/* ------- PRIORITY / PAYMENT / DESCRIPTION / FTA ------- */}
      <h3 style={sectionTitleStyle}>BOE & Priority</h3>

      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Priority:</label>
          <div style={{ display: "flex", gap: "6px" }}>
            {["Normal", "Priority", "High"].map((p) => (
              <label key={p} style={radioLabelStyle}>
                <input
                  type="radio"
                  name="priorityJob"
                  value={p === "High" ? "High Priority" : p}
                  checked={
                    formik.values.priorityJob ===
                    (p === "High" ? "High Priority" : p)
                  }
                  onChange={() =>
                    formik.setFieldValue(
                      "priorityJob",
                      p === "High" ? "High Priority" : p
                    )
                  }
                  style={radioInputStyle}
                />
                {p}
              </label>
            ))}
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Payment Method:</label>
          <div style={{ display: "flex", gap: "10px" }}>
            {["Transaction", "Deferred"].map((m) => (
              <label key={m} style={radioLabelStyle}>
                <input
                  type="radio"
                  name="payment_method"
                  value={m}
                  checked={formik.values.payment_method === m}
                  onChange={() => formik.setFieldValue("payment_method", m)}
                  style={radioInputStyle}
                />
                {m}
              </label>
            ))}
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>FTA Benefit:</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={formatDateForInput(
              formik.values.fta_Benefit_date_time || ""
            )}
            onChange={(e) =>
              formik.setFieldValue("fta_Benefit_date_time", e.target.value)
            }
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Description:</label>
          <input
            type="text"
            style={inputStyle}
            value={formik.values.description || ""}
            onChange={(e) =>
              formik.setFieldValue("description", e.target.value)
            }
          />
        </div>
      </div>

      {/* ------- CTH / BOE Type / Clearance / In-Bond ------- */}
      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>CTH No:</label>
          <input
            type="text"
            style={inputStyle}
            value={formik.values.cth_no || ""}
            onChange={(e) => formik.setFieldValue("cth_no", e.target.value)}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>BOE Type:</label>
          <select
            style={selectStyle}
            value={formik.values.type_of_b_e || ""}
            onChange={(e) =>
              formik.setFieldValue("type_of_b_e", e.target.value)
            }
          >
            <option value="">Select Type</option>
            {beTypeOptions?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Clearance Under:</label>
          <select
            style={selectStyle}
            value={formik.values.clearanceValue || ""}
            onChange={(e) => {
              if (canChangeClearance()) {
                formik.setFieldValue("clearanceValue", e.target.value);
              } else {
                alert("Clear ex-bond details before changing clearance type");
              }
            }}
          >
            <option value="">Select Clearance Type</option>
            {filteredClearanceOptions?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {ExBondflag && (
          <div style={fieldStyle}>
            <label style={labelStyle}>In Bond:</label>
            <select
              style={selectStyle}
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

      {/* ------- GROSS / NET / BOE NO / BOE DATE ------- */}
      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Gross Weight (KGS):</label>
          <input
            type="number"
            style={inputStyle}
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
            value={formik.values.be_no || ""}
            onChange={(e) => formik.setFieldValue("be_no", e.target.value)}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>BOE Date:</label>
          <input
            type="date"
            style={inputStyle}
            value={formik.values.be_date || ""}
            onChange={(e) => formik.setFieldValue("be_date", e.target.value)}
          />
        </div>
      </div>

      {/* ------- ASSESSMENT / PCV / DUTY PAID / OOC ------- */}
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
              disabled={isDutyPaidDateDisabled}
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
          <label style={labelStyle}>Out of Charge:</label>
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

      {/* ------- BOE FILING TYPE ------- */}
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
          {["Discharge", "Railout", "Advanced", "Prior"]
            .filter((f) => selectedBranch !== "GANDHIDHAM" || f !== "Railout")
            .map((f) => (
              <label key={f} style={radioLabelStyle}>
                <input
                  type="radio"
                  name="be_filing_type"
                  value={f}
                  checked={formik.values.be_filing_type === f}
                  onChange={() => formik.setFieldValue("be_filing_type", f)}
                  style={radioInputStyle}
                />
                {f}
              </label>
            ))}
        </div>
      </div>

      {/* ------- FILE UPLOADS (Checklist, Sticker, BE, OOC, GatePass, DO) ------- */}
      <h3 style={sectionTitleStyle}>File Uploads</h3>

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
            onFilesUploaded={(f) => formik.setFieldValue("checklist", f)}
            singleFileOnly={true}
          />
          <ImagePreview
            images={formik.values.checklist || []}
            onDeleteImage={() => formik.setFieldValue("checklist", [])}
          />
        </div>

        <div style={fileBoxStyle}>
          <label style={labelStyle}>Job Sticker:</label>
          <button
            type="button"
            style={{ ...buttonStyle, width: "100%", marginBottom: "5px" }}
            onClick={handleGenerateSticker}
          >
            Generate Job Sticker
          </button>
          <FileUpload
            label="Upload"
            bucketPath="job-sticker"
            onFilesUploaded={(f) =>
              formik.setFieldValue("job_sticker_upload", f)
            }
            singleFileOnly={false}
          />
          <ImagePreview
            images={formik.values.job_sticker_upload || []}
            onDeleteImage={(i) => {
              const updated =
                formik.values.job_sticker_upload?.filter(
                  (_, idx) => idx !== i
                ) || [];
              formik.setFieldValue("job_sticker_upload", updated);
            }}
          />
        </div>

        <div style={fileBoxStyle}>
          <label style={labelStyle}>Processed BE:</label>
          <FileUpload
            label="Upload BE Copy"
            bucketPath="processed_be_attachment"
            onFilesUploaded={(f) =>
              formik.setFieldValue("processed_be_attachment", f)
            }
            singleFileOnly={false}
          />
          <ImagePreview
            images={formik.values.processed_be_attachment || []}
            onDeleteImage={(i) => {
              const updated =
                formik.values.processed_be_attachment?.filter(
                  (_, idx) => idx !== i
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
            onFilesUploaded={(f) => formik.setFieldValue("ooc_copies", f)}
            singleFileOnly={false}
          />
          <ImagePreview
            images={formik.values.ooc_copies || []}
            onDeleteImage={(i) => {
              const updated =
                formik.values.ooc_copies?.filter((_, idx) => idx !== i) ||
                [];
              formik.setFieldValue("ooc_copies", updated);
            }}
          />
        </div>

        <div style={fileBoxStyle}>
          <label style={labelStyle}>Gate Pass:</label>
          <FileUpload
            label="Upload Gate Pass"
            bucketPath="gate_pass_copies"
            onFilesUploaded={(f) =>
              formik.setFieldValue("gate_pass_copies", f)
            }
            singleFileOnly={false}
          />
          <ImagePreview
            images={formik.values.gate_pass_copies || []}
            onDeleteImage={(i) => {
              const updated =
                formik.values.gate_pass_copies?.filter(
                  (_, idx) => idx !== i
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
            onFilesUploaded={(f) => formik.setFieldValue("do_copies", f)}
            singleFileOnly={false}
          />
          <ImagePreview
            images={formik.values.do_copies || []}
            onDeleteImage={(i) => {
              const updated =
                formik.values.do_copies?.filter((_, idx) => idx !== i) || [];
              formik.setFieldValue("do_copies", updated);
            }}
          />
        </div>
      </div>

      {/* you can add any additional tracking-specific info here if needed */}
    </div>
  );
}
