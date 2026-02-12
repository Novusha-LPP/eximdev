import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import BackButton from "./BackButton";
import "./customerKyc.css";
import { ViewButton, MultipleViewButtons } from "../../utils/documentHelpers";
import ImagePreview from "../gallery/ImagePreview";
import { useSnackbar } from "../../contexts/SnackbarContext";
import { UserContext } from "../../contexts/UserContext";

function ViewCompletedKycDetails() {
  const { _id } = useParams();
  const [data, setData] = useState();
  const { showSuccess, showError } = useSnackbar();
  const { user } = useContext(UserContext);

  useEffect(() => {
    async function getData() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/view-customer-kyc-details/${_id}`
      );
      setData(res.data);
    }
    getData();
  }, [_id]);

  // Handle file deletion by admin
  const handleFileDelete = async (fileIndex, fieldName, arrayIndex = null) => {
    try {
      const updatedData = { ...data };

      if (arrayIndex !== null && fieldName.includes(".")) {
        const [arrayField, subField] = fieldName.split(".");
        if (updatedData[arrayField] && updatedData[arrayField][arrayIndex]) {
          if (Array.isArray(updatedData[arrayField][arrayIndex][subField])) {
            const newArray = [...updatedData[arrayField][arrayIndex][subField]];
            newArray.splice(fileIndex, 1);
            updatedData[arrayField] = [...updatedData[arrayField]];
            updatedData[arrayField][arrayIndex] = {
              ...updatedData[arrayField][arrayIndex],
              [subField]: newArray,
            };
          } else {
            updatedData[arrayField] = [...updatedData[arrayField]];
            updatedData[arrayField][arrayIndex] = {
              ...updatedData[arrayField][arrayIndex],
              [subField]: "",
            };
          }
        }
      } else {
        if (Array.isArray(updatedData[fieldName])) {
          const newArray = [...updatedData[fieldName]];
          newArray.splice(fileIndex, 1);
          updatedData[fieldName] = newArray;
        } else {
          updatedData[fieldName] = "";
        }
      }

      await axios.put(
        `${process.env.REACT_APP_API_STRING}/update-customer-kyc/${_id}`,
        updatedData
      );

      setData(updatedData);
      showSuccess("File deleted successfully by admin");
    } catch (error) {
      console.error("Error updating database after file deletion:", error);
      showError("Failed to update database. Please refresh and try again.");
    }
  };

  // ── Render file name from URL ──
  function renderFileName(fileUrl) {
    if (!fileUrl) return "";
    if (typeof fileUrl !== "string") return "File";
    const parts = fileUrl.split("/");
    return parts[parts.length - 1];
  }

  // ── Render document table (View + Delete) ──
  function renderDocTable(files, fieldName, arrayIndex = null) {
    if (!files || (Array.isArray(files) && files.length === 0) || files === "") {
      return <div className="kyc-no-docs">No documents uploaded yet.</div>;
    }

    const fileArray = Array.isArray(files) ? files : [files];
    const validFiles = fileArray.filter(Boolean);

    if (validFiles.length === 0) {
      return <div className="kyc-no-docs">No documents uploaded yet.</div>;
    }

    return (
      <table className="kyc-doc-table">
        <thead>
          <tr>
            <th>Document Name</th>
            <th>View</th>
            <th>Admin Actions</th>
          </tr>
        </thead>
        <tbody>
          {validFiles.map((file, idx) => (
            <tr key={idx}>
              <td>{renderFileName(file)}</td>
              <td>
                <span
                  className="kyc-view-link"
                  onClick={() => window.open(file, "_blank")}
                >
                  View
                </span>
              </td>
              <td>
                <button
                  className="kyc-del-btn"
                  onClick={() => handleFileDelete(idx, fieldName, arrayIndex)}
                  title="Delete file"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // ── Render a labeled doc section (label + table) ──
  function renderDocSection(title, files, fieldName, arrayIndex = null) {
    return (
      <div className="kyc-doc-section">
        <div className="kyc-lbl">{title}</div>
        {renderDocTable(files, fieldName, arrayIndex)}
      </div>
    );
  }

  // ── Category-specific documents ──
  function supportingDocumentsClean(data) {
    const type = data.category;
    switch (type) {
      case "Individual/ Proprietary Firm":
        return (
          <>
            {renderDocSection("Passport", data.individual_passport_img, "individual_passport_img")}
            {renderDocSection("Voter Card", data.individual_voter_card_img, "individual_voter_card_img")}
            {renderDocSection("Driving License", data.individual_driving_license_img, "individual_driving_license_img")}
            {renderDocSection("Bank Statement", data.individual_bank_statement_img, "individual_bank_statement_img")}
            {renderDocSection("Ration Card", data.individual_ration_card_img, "individual_ration_card_img")}
            {renderDocSection("Aadhar Card", data.individual_aadhar_card, "individual_aadhar_card")}
          </>
        );
      case "Partnership Firm":
        return (
          <>
            {renderDocSection("Registration Certificate", data.partnership_registration_certificate_img, "partnership_registration_certificate_img")}
            {renderDocSection("Partnership Deed", data.partnership_deed_img, "partnership_deed_img")}
            {renderDocSection("Power of Attorney", data.partnership_power_of_attorney_img, "partnership_power_of_attorney_img")}
            {renderDocSection("Valid Document", data.partnership_valid_document, "partnership_valid_document")}
            {renderDocSection("Aadhar Card Front", data.partnership_aadhar_card_front_photo, "partnership_aadhar_card_front_photo")}
            {renderDocSection("Aadhar Card Back", data.partnership_aadhar_card_back_photo, "partnership_aadhar_card_back_photo")}
            {renderDocSection("Telephone Bill", data.partnership_telephone_bill, "partnership_telephone_bill")}
          </>
        );
      case "Company":
        return (
          <>
            {renderDocSection("Certificate of Incorporation", data.company_certificate_of_incorporation_img, "company_certificate_of_incorporation_img")}
            {renderDocSection("Memorandum of Association", data.company_memorandum_of_association_img, "company_memorandum_of_association_img")}
            {renderDocSection("Articles of Association", data.company_articles_of_association_img, "company_articles_of_association_img")}
            {renderDocSection("Power of Attorney", data.company_power_of_attorney_img, "company_power_of_attorney_img")}
            {renderDocSection("Telephone Bill", data.company_telephone_bill_img, "company_telephone_bill_img")}
            {renderDocSection("PAN Allotment Letter", data.company_pan_allotment_letter_img, "company_pan_allotment_letter_img")}
          </>
        );
      case "Trust Foundations":
        return (
          <>
            {renderDocSection("Certificate of Registration", data.trust_certificate_of_registration_img, "trust_certificate_of_registration_img")}
            {renderDocSection("Power of Attorney", data.trust_power_of_attorney_img, "trust_power_of_attorney_img")}
            {renderDocSection("Officially Valid Document", data.trust_officially_valid_document_img, "trust_officially_valid_document_img")}
            {renderDocSection("Resolution of Managing Body", data.trust_resolution_of_managing_body_img, "trust_resolution_of_managing_body_img")}
            {data.trust_name_of_trustees && (
              <div className="kyc-doc-section">
                <div className="kyc-lbl">Name of Trustees</div>
                <div className="kyc-val">{data.trust_name_of_trustees}</div>
              </div>
            )}
            {data.trust_name_of_founder && (
              <div className="kyc-doc-section">
                <div className="kyc-lbl">Name of Founder</div>
                <div className="kyc-val">{data.trust_name_of_founder}</div>
              </div>
            )}
          </>
        );
      default:
        return null;
    }
  }

  if (!user || user.role !== "Admin") {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#d32f2f", fontWeight: 600 }}>
        You do not have permission to view this page.
      </div>
    );
  }

  return (
    <div className="kyc-page-wrapper">

      {/* ── Page Header ── */}
      <div className="kyc-page-header">
        <div className="kyc-header-left">
       
          <span className="kyc-page-title"> View Completed KYC Details</span>
        </div>
        <span className="kyc-verified-tag">Verified customer application</span>
      </div>

      {/* ── Single Card ── */}
      {data && (
        <div className="kyc-card">

          {/* ① Basic Info — no title, just fields */}
          <div className="kyc-section">
            <div className="kyc-row">
              <div className="kyc-cell kyc-cell-lg">
                <div className="kyc-lbl">Category</div>
                <div className="kyc-val">{data.category}</div>
              </div>
              <div className="kyc-cell kyc-cell-lg">
                <div className="kyc-lbl">Name of Individual</div>
                <div className="kyc-val">{data.name_of_individual}</div>
              </div>
              <div className="kyc-cell">
                <div className="kyc-lbl">Status of Exporter/Importer</div>
                <div className="kyc-val">{data.status}</div>
              </div>
            </div>
          </div>

          {/* ② Permanent Address */}
          <div className="kyc-section">
            <span className="kyc-section-title">Permanent Address</span>
            <div className="kyc-row">
              <div className="kyc-cell kyc-cell-lg">
                <div className="kyc-lbl">Line 1</div>
                <div className="kyc-val">{data.permanent_address_line_1}</div>
              </div>
              <div className="kyc-cell kyc-cell-xl">
                <div className="kyc-lbl">Line 2</div>
                <div className="kyc-val">{data.permanent_address_line_2 || "—"}</div>
              </div>
              <div className="kyc-cell kyc-cell-md">
                <div className="kyc-lbl">City</div>
                <div className="kyc-val">{data.permanent_address_city}</div>
              </div>
              <div className="kyc-cell kyc-cell-md">
                <div className="kyc-lbl">State</div>
                <div className="kyc-val">{data.permanent_address_state}</div>
              </div>
              <div className="kyc-cell kyc-cell-sm">
                <div className="kyc-lbl">PIN Code</div>
                <div className="kyc-val kyc-mono">{data.permanent_address_pin_code}</div>
              </div>
            </div>
          </div>

          {/* ③ Principal Business Address */}
          <div className="kyc-section">
            <span className="kyc-section-title">Principal Business Address</span>
            <div className="kyc-row">
              <div className="kyc-cell kyc-cell-lg">
                <div className="kyc-lbl">Line 1</div>
                <div className="kyc-val">{data.principle_business_address_line_1}</div>
              </div>
              <div className="kyc-cell kyc-cell-xl">
                <div className="kyc-lbl">Line 2</div>
                <div className="kyc-val">{data.principle_business_address_line_2 || "—"}</div>
              </div>
              <div className="kyc-cell kyc-cell-md">
                <div className="kyc-lbl">City</div>
                <div className="kyc-val">{data.principle_business_address_city}</div>
              </div>
              <div className="kyc-cell kyc-cell-md">
                <div className="kyc-lbl">State</div>
                <div className="kyc-val">{data.principle_business_address_state}</div>
              </div>
              <div className="kyc-cell kyc-cell-sm">
                <div className="kyc-lbl">PIN Code</div>
                <div className="kyc-val kyc-mono">{data.principle_business_address_pin_code}</div>
              </div>
            </div>
          </div>

          {/* 3.1 Branch Information */}
          {data.branches && data.branches.length > 0 && (
            <div className="kyc-section">
              <span className="kyc-section-title">Branch Information</span>
              {data.branches.map((branch, id) => (
                <div key={id} className={id > 0 ? "kyc-factory-repeat" : ""}>
                  <div className="kyc-row">
                    <div className="kyc-cell kyc-cell-lg">
                      <div className="kyc-lbl">Branch Name</div>
                      <div className="kyc-val">{branch.branch_name}</div>
                    </div>
                    <div className="kyc-cell kyc-cell-md">
                      <div className="kyc-lbl">Code</div>
                      <div className="kyc-val kyc-mono">{branch.branch_code}</div>
                    </div>
                    <div className="kyc-cell kyc-cell-lg">
                      <div className="kyc-lbl">GST Number</div>
                      <div className="kyc-val kyc-mono">{branch.gst_no || "—"}</div>
                    </div>
                    <div className="kyc-cell kyc-cell-xl" style={{ flexGrow: 2 }}>
                      <div className="kyc-lbl">Address</div>
                      <div className="kyc-val">{branch.address}</div>
                    </div>
                  </div>
                  <div className="kyc-row">
                    <div className="kyc-cell kyc-cell-md">
                      <div className="kyc-lbl">City</div>
                      <div className="kyc-val">{branch.city}</div>
                    </div>
                    <div className="kyc-cell kyc-cell-md">
                      <div className="kyc-lbl">State</div>
                      <div className="kyc-val">{branch.state}</div>
                    </div>
                    <div className="kyc-cell kyc-cell-sm">
                      <div className="kyc-lbl">PIN</div>
                      <div className="kyc-val kyc-mono">{branch.postal_code}</div>
                    </div>
                    <div className="kyc-cell kyc-cell-md">
                      <div className="kyc-lbl">Mobile</div>
                      <div className="kyc-val">{branch.mobile || "—"}</div>
                    </div>
                    <div className="kyc-cell kyc-cell-lg">
                      <div className="kyc-lbl">Email</div>
                      <div className="kyc-val">{branch.email || "—"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ④ Factory Addresses */}
          <div className="kyc-section">
            <span className="kyc-section-title">Factory Addresses</span>
            {data.factory_addresses?.map((address, id) => (
              <div key={id} className={id > 0 ? "kyc-factory-repeat" : ""}>
                <div className="kyc-row">
                  <div className="kyc-cell kyc-cell-lg">
                    <div className="kyc-lbl">Line 1</div>
                    <div className="kyc-val">{address.factory_address_line_1}</div>
                  </div>
                  <div className="kyc-cell kyc-cell-md">
                    <div className="kyc-lbl">Line 2</div>
                    <div className="kyc-val">{address.factory_address_line_2 || "—"}</div>
                  </div>
                  <div className="kyc-cell kyc-cell-md">
                    <div className="kyc-lbl">City</div>
                    <div className="kyc-val">{address.factory_address_city}</div>
                  </div>
                  <div className="kyc-cell kyc-cell-md">
                    <div className="kyc-lbl">State</div>
                    <div className="kyc-val">{address.factory_address_state}</div>
                  </div>
                  <div className="kyc-cell kyc-cell-sm">
                    <div className="kyc-lbl">PIN Code</div>
                    <div className="kyc-val kyc-mono">{address.factory_address_pin_code}</div>
                  </div>
                  <div className="kyc-cell kyc-cell-lg">
                    <div className="kyc-lbl">GST</div>
                    <div className="kyc-val kyc-mono">{address.gst}</div>
                  </div>
                </div>
                <div className="kyc-row">
                  <div className="kyc-cell">
                    <div className="kyc-lbl">GST Registration Certificate</div>
                    {renderDocTable(address.gst_reg, "factory_addresses.gst_reg", id)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ⑤ Authorised Signatories */}
          <div className="kyc-section">
            <span className="kyc-section-title">Authorised Signatories</span>
            <div className="kyc-note">
              Name of Authorised Signatory/ies for signing import/export documents on behalf of the Firm/ Company. Please provide recent passport size self attested photographs of each signatory
            </div>
            <div className="kyc-row">
              <div className="kyc-cell">
                <div className="kyc-lbl">Signatory Photos</div>
                {renderDocTable(data.authorised_signatories, "authorised_signatories")}
              </div>
              <div className="kyc-cell">
                <div className="kyc-lbl">Authorisation Letter</div>
                {renderDocTable(data.authorisation_letter, "authorisation_letter")}
              </div>
              <div className="kyc-cell kyc-cell-2x" />
            </div>
          </div>

          {/* ⑥ IEC */}
          <div className="kyc-section">
            <span className="kyc-section-title">IEC</span>
            <div className="kyc-row">
              <div className="kyc-cell kyc-cell-xl">
                <div className="kyc-lbl">IEC Number</div>
                <div className="kyc-val kyc-mono">{data.iec_no}</div>
              </div>
              <div className="kyc-cell">
                <div className="kyc-lbl">IEC Copy</div>
                {renderDocTable(data.iec_copy, "iec_copy")}
              </div>
            </div>
          </div>

          {/* ⑦ PAN */}
          <div className="kyc-section">
            <span className="kyc-section-title">PAN</span>
            <div className="kyc-row">
              <div className="kyc-cell kyc-cell-xl">
                <div className="kyc-lbl">PAN</div>
                <div className="kyc-val kyc-mono">{data.pan_no}</div>
              </div>
              <div className="kyc-cell">
                <div className="kyc-lbl">PAN Copy</div>
                {renderDocTable(data.pan_copy, "pan_copy")}
              </div>
            </div>
          </div>

          {/* ⑧ Bank */}
          <div className="kyc-section">
            <span className="kyc-section-title">Bank</span>
            {data.banks?.map((bank, id) => (
              <div key={id} className={id > 0 ? "kyc-factory-repeat" : ""}>
                <div className="kyc-row">
                  <div className="kyc-cell kyc-cell-md">
                    <div className="kyc-lbl">Banker's Name</div>
                    <div className="kyc-val">{bank.bankers_name}</div>
                  </div>
                  <div className="kyc-cell kyc-cell-md">
                    <div className="kyc-lbl">Branch Address</div>
                    <div className="kyc-val">{bank.branch_address}</div>
                  </div>
                  <div className="kyc-cell kyc-cell-lg">
                    <div className="kyc-lbl">Account Number</div>
                    <div className="kyc-val kyc-mono">{bank.account_no}</div>
                  </div>
                  <div className="kyc-cell kyc-cell-md">
                    <div className="kyc-lbl">IFSC</div>
                    <div className="kyc-val kyc-mono">{bank.ifsc}</div>
                  </div>
                  <div className="kyc-cell kyc-cell-md">
                    <div className="kyc-lbl">AD Code</div>
                    <div className="kyc-val kyc-mono">{bank.adCode}</div>
                  </div>
                  <div className="kyc-cell">
                    <div className="kyc-lbl">AD Code File</div>
                    {renderDocTable(bank.adCode_file, "banks.adCode_file", id)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ⑨ Other Documents */}
          <div className="kyc-section">
            <span className="kyc-section-title">Other Documents</span>
            <div className="kyc-row kyc-row-top">
              <div className="kyc-cell kyc-cell-2x">
                <div className="kyc-lbl">Uploaded Documents</div>
                {renderDocTable(data.other_documents, "other_documents")}
              </div>
              <div className="kyc-cell">
                <div className="kyc-lbl">SPCB Registration Certificate</div>
                {data.spcb_reg && data.spcb_reg.length > 0
                  ? renderDocTable(data.spcb_reg, "spcb_reg")
                  : <div className="kyc-no-docs">No documents uploaded yet.</div>}
              </div>
              <div className="kyc-cell">
                <div className="kyc-lbl">KYC Verification Images</div>
                {data.kyc_verification_images && data.kyc_verification_images.length > 0
                  ? renderDocTable(data.kyc_verification_images, "kyc_verification_images")
                  : <div className="kyc-no-docs">No documents uploaded yet.</div>}
              </div>
              <div className="kyc-cell">
                <div className="kyc-lbl">GST Returns</div>
                {data.gst_returns && data.gst_returns.length > 0
                  ? renderDocTable(data.gst_returns, "gst_returns")
                  : <div className="kyc-no-docs">No documents uploaded yet.</div>}
              </div>
            </div>
          </div>

          {/* ⑩ Category Specific Documents */}
          <div className="kyc-section">
            <span className="kyc-section-title">
              Category Specific Documents
              <span className="kyc-section-title-sub"> ({data.category})</span>
            </span>
            <div className="kyc-doc-grid">
              {supportingDocumentsClean(data)}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default ViewCompletedKycDetails;