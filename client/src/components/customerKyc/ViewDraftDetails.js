import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useFormik } from "formik";
import useSupportingDocuments from "../../customHooks/useSupportingDocuments";
import FileUpload from "../gallery/FileUpload";
import ImagePreview from "../gallery/ImagePreview";
import Preview from "./Preview";
import { getCityAndStateByPinCode } from "../../utils/getCityAndStateByPinCode";
import BackButton from "./BackButton";
import "./customerKyc.css";
import { useSnackbar } from "../../contexts/SnackbarContext";
import { validationSchema } from "../../schemas/customerKyc/customerKycSchema";
import { draftValidationSchema } from "../../schemas/customerKyc/draftValidationSchema";
import { UserContext } from "../../contexts/UserContext";
import CustomDialog from "./CustomDialog";

function ViewDraftDetails() {
  const { _id } = useParams();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [data, setData] = useState();
  const [open, setOpen] = useState(false);
  const [submitType, setSubmitType] = useState("");
  const [submissionAttempted, setSubmissionAttempted] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const { showSuccess, showError } = useSnackbar();

  // Dialog state
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "",
    content: null,
    severity: "info"
  });

  const closeDialog = () => setDialogState(prev => ({ ...prev, isOpen: false }));
  // Admin file delete handler
  const handleFileDelete = async (index, fieldPath, bankIndex = null) => {
    try {
      let updatedData = { ...data };
      
      if (fieldPath.includes('banks.') && bankIndex !== null) {
        if (updatedData.banks && updatedData.banks[bankIndex]) {
          updatedData.banks[bankIndex].adCode_file = "";
        }
      } else if (fieldPath.includes('factory_addresses.')) {
        const addressIndex = fieldPath.match(/\[(\d+)\]/)?.[1];
        if (addressIndex !== null && updatedData.factory_addresses && updatedData.factory_addresses[addressIndex]) {
          updatedData.factory_addresses[addressIndex].gst_reg = "";
        }
      } else if (fieldPath.includes('.')) {
        const pathArray = fieldPath.split('.');
        let current = updatedData;
        
        for (let i = 0; i < pathArray.length - 1; i++) {
          if (current[pathArray[i]]) {
            current = current[pathArray[i]];
          }
        }
        
        const finalField = pathArray[pathArray.length - 1];
        if (Array.isArray(current[finalField])) {
          current[finalField].splice(index, 1);
        } else {
          current[finalField] = "";
        }
      } else {
        if (Array.isArray(updatedData[fieldPath])) {
          updatedData[fieldPath].splice(index, 1);
        } else {
          updatedData[fieldPath] = "";
        }
      }

      await axios.put(
        `${process.env.REACT_APP_API_STRING}/update-customer-kyc/${_id}`,
        updatedData
      );

      setData(updatedData);
      if (formik.setValues) {
        formik.setValues(updatedData);
      }
      showSuccess("File removed successfully");
    } catch (error) {
      console.error("Error updating database after file deletion:", error);
      showError("Failed to remove file. Please try again.");
    }
  };
  useEffect(() => {
    async function getData() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/view-customer-kyc-details/${_id}`
      );

      setData(res.data);
    }

    getData();
  }, [_id]);

  const formik = useFormik({
    initialValues: {
      category: "",
      name_of_individual: "",
      status: "",
      // Branch addresses
      factory_addresses: [
        {
          factory_address_line_1: "",
          factory_address_line_2: "",
          factory_address_city: "",
          factory_address_state: "",
          factory_address_pin_code: "",
          gst: "",
          gst_reg: [],
        },
      ],
      permanent_address_line_1: "",
      permanent_address_line_2: "",
      permanent_address_city: "",
      permanent_address_state: "",
      permanent_address_pin_code: "",
      permanent_address_telephone: "",
      permanent_address_email: "",
      // Principal business addresses
      principle_business_address_line_1: "",
      principle_business_address_line_2: "",
      principle_business_address_city: "",
      principle_business_address_state: "",
      principle_business_address_pin_code: "",
      principle_business_telephone: "",
      principle_address_email: "",
      principle_business_website: "",

      authorised_signatories: [],
      authorisation_letter: [],
      iec_no: "",
      iec_copy: [],
      pan_no: "",
      pan_copy: [],
      banks: [
        {
          bankers_name: "",
          branch_address: "",
          account_no: "",
          ifsc: "",
          adCode: "",
          adCode_file: [],
        },
      ],
      other_documents: [],
      spcb_reg: [],
      kyc_verification_images: [],
      gst_returns: [],

      // individual
      individual_passport_img: [],
      individual_voter_card_img: [],
      individual_driving_license_img: [],
      individual_bank_statement_img: [],
      individual_ration_card_img: [],

      // partnership
      partnership_registration_certificate_img: [],
      partnership_deed_img: [],
      partnership_power_of_attorney_img: [],
      partnership_valid_document: [],
      partnership_aadhar_card_front_photo: [],
      partnership_aadhar_card_back_photo: [],
      partnership_telephone_bill: [],

      // company
      company_certificate_of_incorporation_img: [],
      company_memorandum_of_association_img: [],
      company_articles_of_association_img: [],
      company_power_of_attorney_img: [],
      company_telephone_bill_img: [],
      company_pan_allotment_letter_img: [],

      // trust
      trust_certificate_of_registration_img: [],
      trust_power_of_attorney_img: [],
      trust_officially_valid_document_img: [],
      trust_resolution_of_managing_body_img: [],
      trust_telephone_bill_img: [],
      trust_name_of_trustees: "",
      trust_name_of_founder: "",
      trust_address_of_founder: "",
      trust_telephone_of_founder: "",
      trust_email_of_founder: "",
    },
    // Use dynamic validation based on submit type
    validate: (values) => {
      const schema = submitType === "update_draft" ? draftValidationSchema : validationSchema;
      
      try {
        schema.validateSync(values, { abortEarly: false });
        return {};
      } catch (err) {
        const errors = {};
        if (err.inner) {
          err.inner.forEach((error) => {
            if (error.path) {
              errors[error.path] = error.message;
            }
          });
        }
        return errors;
      }
    },
    onSubmit: async (values, { validateForm }) => {
      try {
        const errors = await validateForm();
        if (Object.keys(errors).length > 0) {
          if (submitType === "update_draft") {
            if (errors.iec_no || errors.name_of_individual) {
              setDialogState({
                isOpen: true,
                title: "Incomplete Information",
                content: "Please provide both IEC number and name to save as draft.",
                severity: "warning"
              });
              return;
            }
          } else {
            setDialogState({
              isOpen: true,
              title: "Validation Errors",
              content: `Please correct the following ${Object.keys(errors).length} error(s) before submitting.`,
              severity: "error"
            });
            return;
          }
        }

        if (submitType === "update_draft") {
          await axios.put(`${process.env.REACT_APP_API_STRING}/update-customer-kyc/${_id}`, { ...values, draft: "true" });
          showSuccess("Draft updated successfully!");
        } else if (submitType === "submit_for_approval") {
          await axios.patch(`${process.env.REACT_APP_API_STRING}/update-customer-kyc/${_id}`, { ...values, approval: "Pending", draft: "false" });
          showSuccess("Application submitted for approval!");
          setTimeout(() => navigate("/view-drafts"), 2000);
        }
      } catch (error) {
        console.error("Submission error:", error);
        showError(error.response?.data?.message || "An error occurred during submission");
      }
    },
  });

  useEffect(() => {
    if (data) {
      formik.setValues(data);
    }
    // eslint-disable-next-line
  }, [data]);

  const { getSupportingDocs } = useSupportingDocuments(formik, handleFileDelete);

  const handleAddField = () => {
    formik.setFieldValue("factory_addresses", [
      ...formik.values.factory_addresses,
      {
        factory_address_line_1: "",
        factory_address_line_2: "",
        factory_address_city: "",
        factory_address_state: "",
        factory_address_pin_code: "",
        gst: "",
        gst_reg: [],
      },
    ]);
  };

  const handleAddBanks = () => {
    formik.setFieldValue("banks", [
      ...formik.values.banks,
      {
        bankers_name: "",
        branch_address: "",
        account_no: "",
        ifsc: "",
        adCode: "",
        adCode_file: [],
      },
    ]);
  };
  // File upload handlers will use handleFileUpload from awsFileUpload.js

  const handleSameAsPermanentAddress = (event) => {
    if (event.target.checked) {
      formik.setValues({
        ...formik.values,
        principle_business_address_line_1: formik.values.permanent_address_line_1,
        principle_business_address_line_2: formik.values.permanent_address_line_2,
        principle_business_address_city: formik.values.permanent_address_city,
        principle_business_address_state: formik.values.permanent_address_state,
        principle_business_address_pin_code: formik.values.permanent_address_pin_code,
        principle_business_telephone: formik.values.permanent_address_telephone,
        principle_address_email: formik.values.permanent_address_email,
      });
    }
  };

  useEffect(() => {
    const fetchCityAndState = async () => {
      if (formik.values.permanent_address_pin_code.length === 6) {
        const data = await getCityAndStateByPinCode(
          formik.values.permanent_address_pin_code
        );
        if (data) {
          formik.setFieldValue("permanent_address_city", data.city);
          formik.setFieldValue("permanent_address_state", data.state);
        }
      }
      if (formik.values.principle_business_address_pin_code.length === 6) {
        const data = await getCityAndStateByPinCode(
          formik.values.principle_business_address_pin_code
        );
        if (data) {
          formik.setFieldValue("principle_business_address_city", data.city);
          formik.setFieldValue("principle_business_address_state", data.state);
        }
      }
    };
    fetchCityAndState();
    // eslint-disable-next-line
  }, [
    formik.values.permanent_address_pin_code,
    formik.values.principle_business_address_pin_code,
  ]);

  const customerName = formik.values.name_of_individual || "customer";

  return (
    <div className="app-layout">
      <div className="main-content">
        <div className="kyc-container">
          <div style={{ display: "flex", alignItems: "center", marginBottom: "2rem" }}>
            <BackButton />
            <h2 style={{ margin: "0 auto", fontSize: "1.75rem", fontWeight: 700, color: "var(--slate-800)" }}>
              Edit Draft KYC Application
            </h2>
          </div>

          <form onSubmit={formik.handleSubmit}>
            <div className="premium-card">
              <div className="form-section">
                <h4 className="section-title">Category Selection</h4>
                <div className="category-grid">
                  {[
                    "Individual/ Proprietary Firm",
                    "Partnership Firm",
                    "Company",
                    "Trust Foundations"
                  ].map((cat) => (
                    <label key={cat} className={`category-card ${formik.values.category === cat ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="category"
                        value={cat}
                        checked={formik.values.category === cat}
                        onChange={formik.handleChange}
                        className="category-radio"
                      />
                      <span className="category-label">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h4 className="section-title">General Information</h4>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Name of Individual/Firm/Company *</label>
                    <input
                      type="text"
                      name="name_of_individual"
                      className="form-control"
                      value={formik.values.name_of_individual}
                      onChange={formik.handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status of Exporter/Importer *</label>
                    <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.5rem" }}>
                      {["Manufacturer", "Trader"].map(status => (
                        <label key={status} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input
                            type="radio"
                            name="status"
                            value={status}
                            checked={formik.values.status === status}
                            onChange={formik.handleChange}
                          />
                          <span style={{ fontSize: "0.9rem", color: "var(--slate-600)" }}>{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4 className="section-title">Permanent Address</h4>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Address Line 1 *</label>
                    <input type="text" name="permanent_address_line_1" className="form-control" value={formik.values.permanent_address_line_1} onChange={formik.handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address Line 2</label>
                    <input type="text" name="permanent_address_line_2" className="form-control" value={formik.values.permanent_address_line_2} onChange={formik.handleChange} />
                  </div>
                </div>
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">PIN Code *</label>
                    <input type="text" name="permanent_address_pin_code" className="form-control" value={formik.values.permanent_address_pin_code} onChange={formik.handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input type="text" name="permanent_address_city" className="form-control" value={formik.values.permanent_address_city} onChange={formik.handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <input type="text" name="permanent_address_state" className="form-control" value={formik.values.permanent_address_state} onChange={formik.handleChange} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Mobile *</label>
                    <input type="text" name="permanent_address_telephone" className="form-control" value={formik.values.permanent_address_telephone} onChange={formik.handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input type="email" name="permanent_address_email" className="form-control" value={formik.values.permanent_address_email} onChange={formik.handleChange} />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4 className="section-title">Principal Business Address</h4>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                    <input type="checkbox" onChange={handleSameAsPermanentAddress} />
                    <span style={{ fontSize: "0.85rem", color: "var(--slate-500)" }}>Same as permanent address</span>
                  </label>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Address Line 1 *</label>
                    <input type="text" name="principle_business_address_line_1" className="form-control" value={formik.values.principle_business_address_line_1} onChange={formik.handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address Line 2</label>
                    <input type="text" name="principle_business_address_line_2" className="form-control" value={formik.values.principle_business_address_line_2} onChange={formik.handleChange} />
                  </div>
                </div>
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">PIN Code *</label>
                    <input type="text" name="principle_business_address_pin_code" className="form-control" value={formik.values.principle_business_address_pin_code} onChange={formik.handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input type="text" name="principle_business_address_city" className="form-control" value={formik.values.principle_business_address_city} onChange={formik.handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <input type="text" name="principle_business_address_state" className="form-control" value={formik.values.principle_business_address_state} onChange={formik.handleChange} />
                  </div>
                </div>
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Mobile *</label>
                    <input type="text" name="principle_business_telephone" className="form-control" value={formik.values.principle_business_telephone} onChange={formik.handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input type="email" name="principle_address_email" className="form-control" value={formik.values.principle_address_email} onChange={formik.handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Website</label>
                    <input type="text" name="principle_business_website" className="form-control" value={formik.values.principle_business_website} onChange={formik.handleChange} />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4 className="section-title">Factory/Branch Addresses</h4>
                {formik.values.factory_addresses.map((address, index) => (
                  <div key={index} style={{ padding: "1.5rem", background: "var(--slate-50)", borderRadius: "12px", marginBottom: "1rem", border: "1px solid var(--slate-100)" }}>
                    <h5 style={{ fontSize: "0.9rem", color: "var(--slate-700)", marginBottom: "1rem" }}>Address #{index + 1}</h5>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Address Line 1</label>
                        <input type="text" name={`factory_addresses[${index}].factory_address_line_1`} className="form-control" value={address.factory_address_line_1} onChange={formik.handleChange} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Address Line 2</label>
                        <input type="text" name={`factory_addresses[${index}].factory_address_line_2`} className="form-control" value={address.factory_address_line_2} onChange={formik.handleChange} />
                      </div>
                    </div>
                    <div className="grid-3">
                      <div className="form-group">
                        <label className="form-label">PIN Code</label>
                        <input type="text" name={`factory_addresses[${index}].factory_address_pin_code`} className="form-control" value={address.factory_address_pin_code} onChange={formik.handleChange} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">City</label>
                        <input type="text" name={`factory_addresses[${index}].factory_address_city`} className="form-control" value={address.factory_address_city} onChange={formik.handleChange} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">State</label>
                        <input type="text" name={`factory_addresses[${index}].factory_address_state`} className="form-control" value={address.factory_address_state} onChange={formik.handleChange} />
                      </div>
                    </div>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">GST Number</label>
                        <input type="text" name={`factory_addresses[${index}].gst`} className="form-control" value={address.gst} onChange={formik.handleChange} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">GST Registration Copy</label>
                        <FileUpload
                          label="Upload GST"
                          onFilesUploaded={(files) => formik.setFieldValue(`factory_addresses[${index}].gst_reg`, files)}
                          bucketPath="gst-reg"
                          customerName={customerName}
                        />
                        {address.gst_reg && <ImagePreview images={address.gst_reg} onDeleteImage={(idx) => handleFileDelete(idx, `factory_addresses[${index}].gst_reg`)} />}
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-secondary" onClick={handleAddField}>+ Add Another Address</button>
              </div>

              <div className="form-section">
                <h4 className="section-title">Authorised Signatory Information</h4>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Signatory Photos</label>
                    <FileUpload
                      label="Upload Photos"
                      onFilesUploaded={(files) => formik.setFieldValue("authorised_signatories", files)}
                      bucketPath="signatories"
                      customerName={customerName}
                    />
                    {formik.values.authorised_signatories && <ImagePreview images={formik.values.authorised_signatories} onDeleteImage={(idx) => handleFileDelete(idx, "authorised_signatories")} />}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Authorisation Letter</label>
                    <FileUpload
                      label="Upload Letter"
                      onFilesUploaded={(files) => formik.setFieldValue("authorisation_letter", files)}
                      bucketPath="auth-letter"
                      customerName={customerName}
                    />
                    {formik.values.authorisation_letter && <ImagePreview images={formik.values.authorisation_letter} onDeleteImage={(idx) => handleFileDelete(idx, "authorisation_letter")} />}
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4 className="section-title">IEC & PAN Information</h4>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">IEC Number *</label>
                    <input type="text" name="iec_no" className="form-control" value={formik.values.iec_no} onChange={formik.handleChange} />
                    <FileUpload
                      label="Upload IEC Copy"
                      onFilesUploaded={(files) => formik.setFieldValue("iec_copy", files)}
                      bucketPath="iec"
                      customerName={customerName}
                    />
                    {formik.values.iec_copy && <ImagePreview images={formik.values.iec_copy} onDeleteImage={(idx) => handleFileDelete(idx, "iec_copy")} />}
                  </div>
                  <div className="form-group">
                    <label className="form-label">PAN Number *</label>
                    <input type="text" name="pan_no" className="form-control" value={formik.values.pan_no} onChange={formik.handleChange} />
                    <FileUpload
                      label="Upload PAN Copy"
                      onFilesUploaded={(files) => formik.setFieldValue("pan_copy", files)}
                      bucketPath="pan"
                      customerName={customerName}
                    />
                    {formik.values.pan_copy && <ImagePreview images={formik.values.pan_copy} onDeleteImage={(idx) => handleFileDelete(idx, "pan_copy")} />}
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4 className="section-title">Banking Information</h4>
                {formik.values.banks.map((bank, index) => (
                  <div key={index} style={{ padding: "1.5rem", background: "white", borderRadius: "12px", marginBottom: "1rem", border: "1px solid var(--slate-200)" }}>
                    <h5 style={{ fontSize: "0.9rem", color: "var(--slate-700)", marginBottom: "1rem" }}>Bank #{index + 1}</h5>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Banker's Name</label>
                        <input type="text" name={`banks[${index}].bankers_name`} className="form-control" value={bank.bankers_name} onChange={formik.handleChange} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Branch Address</label>
                        <input type="text" name={`banks[${index}].branch_address`} className="form-control" value={bank.branch_address} onChange={formik.handleChange} />
                      </div>
                    </div>
                    <div className="grid-3">
                      <div className="form-group">
                        <label className="form-label">Account Number</label>
                        <input type="text" name={`banks[${index}].account_no`} className="form-control" value={bank.account_no} onChange={formik.handleChange} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">IFSC Code</label>
                        <input type="text" name={`banks[${index}].ifsc`} className="form-control" value={bank.ifsc} onChange={formik.handleChange} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">AD Code</label>
                        <input type="text" name={`banks[${index}].adCode`} className="form-control" value={bank.adCode} onChange={formik.handleChange} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">AD Code File</label>
                      <FileUpload
                        label="Upload AD Code"
                        onFilesUploaded={(files) => formik.setFieldValue(`banks[${index}].adCode_file`, files)}
                        bucketPath="bank-ad-code"
                        customerName={customerName}
                      />
                      {bank.adCode_file && <ImagePreview images={bank.adCode_file} onDeleteImage={(idx) => handleFileDelete(idx, `banks[${index}].adCode_file`, index)} />}
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-secondary" onClick={handleAddBanks}>+ Add Another Bank</button>
              </div>

              {getSupportingDocs()}
              
              <div className="form-section">
                <h4 className="section-title">Additional Documents</h4>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Other Documents</label>
                    <FileUpload
                      label="Upload Others"
                      onFilesUploaded={(files) => formik.setFieldValue("other_documents", files)}
                      bucketPath="others"
                      customerName={customerName}
                    />
                    {formik.values.other_documents && <ImagePreview images={formik.values.other_documents} onDeleteImage={(idx) => handleFileDelete(idx, "other_documents")} />}
                  </div>
                  <div className="form-group">
                    <label className="form-label">SPCB Registration</label>
                    <FileUpload
                      label="Upload SPCB"
                      onFilesUploaded={(files) => formik.setFieldValue("spcb_reg", files)}
                      bucketPath="spcb"
                      customerName={customerName}
                    />
                    {formik.values.spcb_reg && <ImagePreview images={formik.values.spcb_reg} onDeleteImage={(idx) => handleFileDelete(idx, "spcb_reg")} />}
                  </div>
                </div>
              </div>

              <div className="form-actions" style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
                <button type="button" className="btn-info" onClick={() => { setOpen(true); }}>Preview Changes</button>
                <button type="submit" className="btn-secondary" onClick={() => setSubmitType("update_draft")}>Update Draft</button>
                <button type="submit" className="btn-primary" onClick={() => setSubmitType("submit_for_approval")}>Submit for Approval</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <Preview open={open} handleClose={() => setOpen(false)} data={formik.values} />
      <CustomDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        content={dialogState.content}
        severity={dialogState.severity}
        onClose={closeDialog}
      />
    </div>
  );
}

export default ViewDraftDetails;
