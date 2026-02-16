import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import { useSnackbar } from "../../contexts/SnackbarContext";
import { TextField } from "@mui/material";
import "./view-kyc.css"; // Import the new CSS

function ViewCustomerKyc() {
  const { _id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState();
  const [remarks, setRemarks] = useState("");
  const { user } = useContext(UserContext);
  const { showWarning, showSuccess } = useSnackbar();

  useEffect(() => {
    async function getData() {
        try {
            const res = await axios(
                `${process.env.REACT_APP_API_STRING}/view-customer-kyc-details/${_id}`
            );
            setData(res.data);
        } catch (error) {
            console.error("Error fetching data", error);
        }
    }
    getData();
  }, [_id]);

  const handleKycApproval = async (approval) => {
    const approved_by = `${user.first_name} ${user.last_name}`;
    if (approval === "Sent for revision" && remarks === "") {
      showWarning("Please enter remarks");
    } else {
      try {
          await axios.post(
            `${process.env.REACT_APP_API_STRING}/customer-kyc-approval/${_id}`,
            { approval, remarks, approved_by }
          );

          showSuccess("KYC status updated successfully");
          navigate("/customer-kyc");
      } catch (error) {
          console.error("Error updating status", error);
          showWarning("Failed to update status");
      }
    }
  };

  // ── Render file name from URL ──
  function renderFileName(fileUrl) {
    if (!fileUrl) return "";
    if (typeof fileUrl !== "string") return "File";
    const parts = fileUrl.split("/");
    return parts[parts.length - 1];
  }

  // ── Render document table (View Only) ──
  function renderDocTable(files) {
    if (!files || (Array.isArray(files) && files.length === 0) || files === "") {
      return <div className="no-doc">No documents uploaded yet.</div>;
    }

    const fileArray = Array.isArray(files) ? files : [files];
    const validFiles = fileArray.filter(Boolean);

    if (validFiles.length === 0) {
      return <div className="no-doc">No documents uploaded yet.</div>;
    }

    return (
      <table className="view-doc-table">
        <thead>
          <tr>
            <th>Document Name</th>
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          {validFiles.map((file, idx) => (
            <tr key={idx}>
              <td><div className="doc-name">{renderFileName(file)}</div></td>
              <td>
                <span
                  className="view-link"
                  onClick={() => window.open(file, "_blank")}
                >
                  View
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // ── Helper to render a field group ──
  const Field = ({ label, value, mono = false }) => (
    <div className="field-group">
      <div className="field-label">{label}</div>
      <div className={`field-value ${mono ? "code-chip" : ""}`} style={mono ? {display: 'inline-block', fontSize: '12px', padding: '3px 8px'} : {}}>
          {value || "—"}
      </div>
    </div>
  );

  // ── Category-specific documents rendered as grid items ──
  function renderCategoryDocs(data) {
    const type = data.category;
    
    // Helper to render a consistent item structure
    const renderItem = (title, files) => (
      <div>
        <div className="doc-col-title">{title}</div>
        {renderDocTable(files)}
      </div>
    );

    switch (type) {
      case "Individual/ Proprietary Firm":
        return (
          <>
            {renderItem("Passport", data.individual_passport_img)}
            {renderItem("Voter Card", data.individual_voter_card_img)}
            {renderItem("Driving License", data.individual_driving_license_img)}
            {renderItem("Bank Statement", data.individual_bank_statement_img)}
            {renderItem("Ration Card", data.individual_ration_card_img)}
            {renderItem("Aadhar Card", data.individual_aadhar_card)}
          </>
        );
      case "Partnership Firm":
        return (
          <>
            {renderItem("Registration Certificate", data.partnership_registration_certificate_img)}
            {renderItem("Partnership Deed", data.partnership_deed_img)}
            {renderItem("Power of Attorney", data.partnership_power_of_attorney_img)}
            {renderItem("Valid Document", data.partnership_valid_document)}
            {renderItem("Aadhar Card (Front)", data.partnership_aadhar_card_front_photo)}
            {renderItem("Aadhar Card (Back)", data.partnership_aadhar_card_back_photo)}
            {renderItem("Telephone Bill", data.partnership_telephone_bill)}
          </>
        );
      case "Company":
        return (
          <>
            {renderItem("Certificate of Incorporation", data.company_certificate_of_incorporation_img)}
            {renderItem("Memorandum of Association", data.company_memorandum_of_association_img)}
            {renderItem("Articles of Association", data.company_articles_of_association_img)}
            {renderItem("Power of Attorney", data.company_power_of_attorney_img)}
            {renderItem("Telephone Bill", data.company_telephone_bill_img)}
            {renderItem("PAN Allotment Letter", data.company_pan_allotment_letter_img)}
          </>
        );
      case "Trust Foundations":
        return (
          <>
            {renderItem("Certificate of Registration", data.trust_certificate_of_registration_img)}
            {renderItem("Power of Attorney", data.trust_power_of_attorney_img)}
            {renderItem("Officially Valid Document", data.trust_officially_valid_document_img)}
            {renderItem("Resolution of Managing Body", data.trust_resolution_of_managing_body_img)}
            {renderItem("Telephone Bill", data.trust_telephone_bill_img)}
            
            {/* Additional Trust Fields */}
            {data.trust_name_of_trustees && (
               <div className="field-group">
                 <div className="doc-col-title">Name of Trustees</div>
                 <div className="field-value">{data.trust_name_of_trustees}</div>
               </div>
            )}
             {data.trust_name_of_founder && (
               <div className="field-group">
                 <div className="doc-col-title">Name of Founder</div>
                 <div className="field-value">{data.trust_name_of_founder}</div>
               </div>
            )}
             {data.trust_address_of_founder && (
               <div className="field-group">
                 <div className="doc-col-title">Address of Founder</div>
                 <div className="field-value">{data.trust_address_of_founder}</div>
               </div>
            )}
             {data.trust_telephone_of_founder && (
               <div className="field-group">
                 <div className="doc-col-title">Telephone of Founder</div>
                 <div className="field-value">{data.trust_telephone_of_founder}</div>
               </div>
            )}
             {data.trust_email_of_founder && (
               <div className="field-group">
                 <div className="doc-col-title">Email of Founder</div>
                 <div className="field-value">{data.trust_email_of_founder}</div>
               </div>
            )}
          </>
        );
      default:
        return <div className="no-doc">No category specific documents.</div>;
    }
  }

  if (!data) return <div style={{padding: 20}}>Loading...</div>;

  return (
    <>
  

      <div className="page-wrap">
        <div className="page-type-title">Review Customer KYC</div>

        {/* IDENTITY STRIP */}
        <div className="identity-strip">
          <Field label="Category" value={data.category} />
          <div className="sep"></div>
          <Field label="Name of Individual / Entity" value={data.name_of_individual} />
          <div className="sep"></div>
          <Field label="Status of Exporter / Importer" value={data.status} />
          
          <div className="id-codes">
            <Field label="IEC Number" value={data.iec_no} mono />
            <Field label="PAN" value={data.pan_no} mono />
          </div>
        </div>

        {/* ROW 1: 3 Address Cards */}
        <div className="three-col">
          {/* Permanent Address */}
          <div className="view-card">
            <div className="view-card-header"><span className="dot"></span>Permanent Address</div>
            <div className="view-card-body">
              <Field label="Line 1" value={data.permanent_address_line_1} />
              <Field label="Line 2" value={data.permanent_address_line_2} />
              <div className="addr-3col">
                <Field label="City" value={data.permanent_address_city} />
                <Field label="State" value={data.permanent_address_state} />
                <Field label="Pin Code" value={data.permanent_address_pin_code} />
              </div>
            </div>
          </div>

          {/* Principal Business Address */}
          <div className="view-card">
            <div className="view-card-header"><span className="dot"></span>Principal Business Address</div>
            <div className="view-card-body">
              <Field label="Line 1" value={data.principle_business_address_line_1} />
              <Field label="Line 2" value={data.principle_business_address_line_2} />
              <div className="addr-3col">
                <Field label="City" value={data.principle_business_address_city} />
                <Field label="State" value={data.principle_business_address_state} />
                <Field label="Pin Code" value={data.principle_business_address_pin_code} />
              </div>
            </div>
          </div>

          {/* Factory Addresses - Showing the first one */}
          <div className="view-card">
            <div className="view-card-header"><span className="dot"></span>Factory Address {(data.factory_addresses?.length > 1) ? "#1" : ""}</div>
            <div className="view-card-body">
              {data.factory_addresses && data.factory_addresses.length > 0 ? (
                <>
                   <Field label="Line 1" value={data.factory_addresses[0].factory_address_line_1} />
                   <Field label="Line 2" value={data.factory_addresses[0].factory_address_line_2} />
                   <div className="addr-4col">
                     <Field label="City" value={data.factory_addresses[0].factory_address_city} />
                     <Field label="State" value={data.factory_addresses[0].factory_address_state} />
                     <Field label="Pin" value={data.factory_addresses[0].factory_address_pin_code} />
                     <Field label="GST" value={data.factory_addresses[0].gst} />
                   </div>
                   {/* If there's a GST reg file for this factory */}
                   <div style={{marginTop: '8px'}}> 
                      <div className="doc-sub-header">GST Registration</div>
                      {renderDocTable(data.factory_addresses[0].gst_reg)}
                   </div>
                </>
              ) : (
                <div className="no-doc">No factory details.</div>
              )}
            </div>
          </div>
        </div>

        {/* Handling additional factories if any */}
        {data.factory_addresses && data.factory_addresses.length > 1 && (
            <div className="three-col" style={{marginTop: '-14px'}}>
                {data.factory_addresses.slice(1).map((address, idx) => (
                    <div className="view-card" key={idx}>
                         <div className="view-card-header"><span className="dot"></span>Factory Address #{idx + 2}</div>
                         <div className="view-card-body">
                             <Field label="Line 1" value={address.factory_address_line_1} />
                             <Field label="Line 2" value={address.factory_address_line_2} />
                             <div className="addr-4col">
                                <Field label="City" value={address.factory_address_city} />
                                <Field label="State" value={address.factory_address_state} />
                                <Field label="Pin" value={address.factory_address_pin_code} />
                                <Field label="GST" value={address.gst} />
                              </div>
                               <div style={{marginTop: '8px'}}> 
                                  <div className="doc-sub-header">GST Registration</div>
                                  {renderDocTable(address.gst_reg)}
                               </div>
                         </div>
                    </div>
                ))}
            </div>
        )}

        {/* Handling Branch Information if any */}
         {data.branches && data.branches.length > 0 && (
             <div className="view-card full-row">
                 <div className="view-card-header"><span className="dot"></span>Branch Information</div>
                 <div className="view-card-body">
                      {/* Using a grid for branches */}
                      <div className="three-col" style={{marginBottom: 0}}>
                        {data.branches.map((branch, idx) => (
                             <div key={idx} style={{border: '1px solid #eee', padding: '10px', borderRadius: '4px'}}>
                                <div style={{fontWeight: 600, fontSize: '12px', marginBottom: '4px'}}>{branch.branch_name}</div>
                                <Field label="Address" value={branch.address} />
                                <div className="addr-3col">
                                    <Field label="City" value={branch.city} />
                                    <Field label="State" value={branch.state} />
                                    <Field label="Pin" value={branch.postal_code} />
                                </div>
                                <div style={{marginTop: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                                    <Field label="Contact" value={branch.mobile} />
                                    <Field label="Email" value={branch.email} />
                                </div>
                             </div>
                        ))}
                      </div>
                 </div>
             </div>
         )}


        {/* ROW 2: GST + Authorised Signatories */}
        <div className="two-col">
           {/* Authorised Signatories Card */}
           <div className="view-card">
             <div className="view-card-header"><span className="dot"></span>Authorised Signatories</div>
             <div className="view-card-body">
               <p style={{fontSize:'11.5px', color:'#777', marginBottom:'12px', lineHeight:1.5}}>
                 Name of Authorised Signatory/ies for signing import/export documents on behalf of the Firm / Company.
               </p>
               <div className="sig-body">
                 <div>
                   <div className="doc-sub-header">Signatory Photos</div>
                   {renderDocTable(data.authorised_signatories)}
                 </div>
                 <div>
                   <div className="doc-sub-header">Authorisation Letter</div>
                   {renderDocTable(data.authorisation_letter)}
                 </div>
               </div>
             </div>
           </div>

           {/* IEC + PAN Card */}
            <div className="view-card">
                 <div className="view-card-header"><span className="dot"></span>IEC & PAN</div>
                 <div className="view-card-body">
                      {/* IEC */}
                      <div className="field-group" style={{marginBottom:'12px'}}>
                         <div className="field-label">IEC Number</div>
                         <div className="code-chip">{data.iec_no || "—"}</div>
                      </div>
                      <div className="doc-sub-header">IEC Copy</div>
                      {renderDocTable(data.iec_copy)}
                      
                      <div className="view-divider"></div>

                      {/* PAN */}
                      <div className="field-group" style={{marginBottom:'12px'}}>
                          <div className="field-label">PAN</div>
                          <div className="code-chip">{data.pan_no || "—"}</div>
                      </div>
                      <div className="doc-sub-header">PAN Copy</div>
                      {renderDocTable(data.pan_copy)}
                 </div>
            </div>
        </div>

        {/* ROW 4: Bank */}
        {data.banks?.map((bank, id) => (
             <div className="view-card full-row" key={id}>
               <div className="view-card-header"><span className="dot"></span>Bank Details {data.banks.length > 1 ? `#${id+1}` : ""}</div>
               <div className="view-card-body">
                 <div className="bank-meta">
                   <Field label="Banker's Name" value={bank.bankers_name} />
                   <Field label="Branch Address" value={bank.branch_address} />
                   <Field label="Account Number" value={bank.account_no} mono />
                   <Field label="IFSC" value={bank.ifsc} mono />
                   <Field label="AD Code" value={bank.adCode} mono />
                 </div>
                 <div className="doc-sub-header">AD Code File</div>
                 {renderDocTable(bank.adCode_file)}
               </div>
             </div>
        ))}

        {/* ROW 5: Other Documents */}
        <div className="view-card full-row">
          <div className="view-card-header"><span className="dot"></span>Other Documents</div>
          <div className="view-card-body">
            <div className="other-body">
              <div>
                <div className="doc-sub-header">Uploaded Documents</div>
                {renderDocTable(data.other_documents)}
              </div>
              <div>
                <div className="doc-sub-header">SPCB Registration</div>
                {renderDocTable(data.spcb_reg)}
              </div>
              <div>
                <div className="doc-sub-header">KYC Verification</div>
                {renderDocTable(data.kyc_verification_images)}
              </div>
              <div>
                <div className="doc-sub-header">GST Returns</div>
                {renderDocTable(data.gst_returns)}
              </div>
            </div>
          </div>
        </div>

        {/* ROW 6: Category Specific Documents */}
        <div className="view-card full-row">
          <div className="view-card-header">
            <span className="dot"></span>Category Specific Documents
            <span className="subtitle">({data.category})</span>
          </div>
          <div className="view-card-body">
             <div className="five-col">
              {renderCategoryDocs(data)}
             </div>
          </div>
        </div>

        {/* ── Approval Actions ── */}
        <div className="view-card full-row" style={{border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}>
             <div className="view-card-header" style={{background: '#f1f5f9', borderBottomColor: '#cbd5e1'}}>
                <span className="dot" style={{background: '#3b82f6'}}></span>
                <span style={{color: '#0f172a'}}>Approver Actions</span>
             </div>
             <div className="view-card-body">
                <div style={{marginBottom: '1rem'}}>
                    <TextField
                        multiline
                        rows={3}
                        fullWidth
                        size="small"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        label="Remarks (Required for Revision)"
                        placeholder="Enter remarks here..."
                        variant="outlined"
                        InputProps={{
                            style: { fontSize: '13px', fontFamily: 'inherit' }
                        }}
                    />
                </div>
                <div style={{display: 'flex', gap: '12px'}}>
                    <button 
                        className="btn btn-primary"
                        style={{background: '#10b981', color: 'white'}}
                        onClick={() => handleKycApproval("Approved")}
                    >
                        Approve Application
                    </button>
                    <button 
                         className="btn btn-secondary"
                         onClick={() => handleKycApproval("Sent for revision")}
                    >
                        Send for Revision
                    </button>
                </div>
             </div>
        </div>

      </div>
    </>
  );
}

export default ViewCustomerKyc;
