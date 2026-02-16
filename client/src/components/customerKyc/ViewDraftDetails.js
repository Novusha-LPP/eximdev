import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useFormik, getIn } from "formik";
import useSupportingDocuments from "../../customHooks/useSupportingDocuments";
import FileUpload from "../gallery/FileUpload";
import ImagePreview from "../gallery/ImagePreview";
import Preview from "./Preview";
import { getCityAndStateByPinCode } from "../../utils/getCityAndStateByPinCode";
import "./customerKyc.css";
import "./KycForm.css";
import { useSnackbar } from "../../contexts/SnackbarContext";
import { validationSchema } from "../../schemas/customerKyc/customerKycSchema";
import { draftValidationSchema } from "../../schemas/customerKyc/draftValidationSchema";
import { UserContext } from "../../contexts/UserContext";
import CustomDialog from "./CustomDialog";

function ViewDraftDetails() {
  const { _id } = useParams();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  
  const [submitType, setSubmitType] = useState("");
  const { showSuccess, showError } = useSnackbar();

  // Dialog state
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "",
    content: null,
    severity: "info",
    actions: null
  });

  const handleCloseDialog = () => setDialogState(prev => ({ ...prev, isOpen: false }));

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
      sameAsPermanentAddress: false, 

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
      // Finance Details
      credit_period: "",
      credit_limit_validity_date: "",
      quotation: "No",
      outstanding_limit: "",
      advance_payment: false,

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
      individual_aadhar_card: [],

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
      branches: [],
    },
    validationSchema: submitType === "update_draft" ? draftValidationSchema : validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { validateForm }) => {
        try {
            // Manual validation check before submit
            const errors = await validateForm();
            if (Object.keys(errors).length > 0) {
              if (submitType === "update_draft") {
                if (errors.iec_no || errors.name_of_individual) {
                    showError("Please provide both IEC number and name to save as draft.");
                    return;
                }
              } else {
                showError(`Please correct ${Object.keys(errors).length} error(s) before submitting.`);
                return;
              }
            }
  
            const payload = { ...values };
            if (submitType === "update_draft") {
                payload.draft = "true";
            } else {
                payload.draft = "false";
                payload.approval = "Pending";
            }
  
            await axios.patch(`${process.env.REACT_APP_API_STRING}/update-customer-kyc/${_id}`, payload);
            
            const draftTabIndex = user?.role === "Admin" ? 3 : 2;
            
            if (submitType === "update_draft") {
                showSuccess("Draft updated successfully!");
                navigate(`/customer-kyc?tab=${draftTabIndex}`); 
            } else {
                showSuccess("Application submitted for approval!");
                navigate(`/customer-kyc?tab=${draftTabIndex}`); 
            }
        } catch (error) {
            console.error("Submission error:", error);
            showError(error.response?.data?.message || "An error occurred during submission");
        }
    },
  });

  useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(
            `${process.env.REACT_APP_API_STRING}/view-customer-kyc-details/${_id}`
        );
        if (res.data) {
            const sanitizedData = {
                ...res.data,
                factory_addresses: res.data.factory_addresses || [],
                banks: res.data.banks || [],
                branches: res.data.branches || [],
                // Finance defaults
                credit_period: res.data.credit_period || "",
                credit_limit_validity_date: res.data.credit_limit_validity_date || "",
                quotation: res.data.quotation || "No",
                outstanding_limit: res.data.outstanding_limit || "",
                advance_payment: res.data.advance_payment || false,
            };
            setData(sanitizedData);
            formik.setValues(sanitizedData);
        }
      } catch (error) {
          console.error("Fetch error", error);
      }
    }
    getData();
  }, [_id]);

  const { getSupportingDocs } = useSupportingDocuments(formik);

  // Address Logic
  useEffect(() => {
    // Show errors if validation fails after submission attempt
    if (formik.submitCount > 0 && !formik.isValid) {
        // Debounce slightly to avoid duplicate toasts or race conditions
        const timer = setTimeout(() => {
           // Count errors
           const errorCount = Object.keys(formik.errors).length;
           if (errorCount > 0) {
             showError(`Please correct ${errorCount} error(s) before submitting.`);
           }
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [formik.submitCount, formik.isValid, formik.errors]);

  // Helper for error display
  const getFieldError = (name) => {
    const error = getIn(formik.errors, name);
    const touch = getIn(formik.touched, name);
    return touch && error ? error : null;
  };

  const hasError = (name) => {
    const error = getIn(formik.errors, name);
    const touch = getIn(formik.touched, name);
    return touch && error;
  };

  useEffect(() => {
    const fetchCityAndState = async () => {
      if (formik.values.permanent_address_pin_code?.length === 6) {
        const data = await getCityAndStateByPinCode(formik.values.permanent_address_pin_code);
        if (data) {
          formik.setFieldValue("permanent_address_city", data.city);
          formik.setFieldValue("permanent_address_state", data.state);
        }
      }
      if (formik.values.principle_business_address_pin_code?.length === 6) {
        const data = await getCityAndStateByPinCode(formik.values.principle_business_address_pin_code);
        if (data) {
          formik.setFieldValue("principle_business_address_city", data.city);
          formik.setFieldValue("principle_business_address_state", data.state);
        }
      }
    };
    fetchCityAndState();
  }, [formik.values.permanent_address_pin_code, formik.values.principle_business_address_pin_code]);

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
        sameAsPermanentAddress: true,
      });
    } else {
        formik.setFieldValue("sameAsPermanentAddress", false);
    }
  };

  // Helper functions for dynamic fields
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

  const handleRemoveField = (index) => {
    if (formik.values.factory_addresses.length > 1) {
      const updated = formik.values.factory_addresses.filter((_, i) => i !== index);
      formik.setFieldValue("factory_addresses", updated);
    }
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

  const handleRemoveBank = (index) => {
    if (formik.values.banks.length > 1) {
      const updated = formik.values.banks.filter((_, i) => i !== index);
      formik.setFieldValue("banks", updated);
    }
  };

  const handleAddBranch = () => {
    formik.setFieldValue("branches", [
      ...(formik.values.branches || []),
      {
        branch_name: "",
        branch_code: "",
        gst_no: "",
        address: "",
        city: "",
        state: "",
        postal_code: "",
        country: "India",
        mobile: "",
        email: "",
      },
    ]);
  };

  const handleRemoveBranch = (index) => {
    const updatedBranches = formik.values.branches.filter((_, i) => i !== index);
    formik.setFieldValue("branches", updatedBranches);
  };

  const renderUpload = (field, bucket, multiple = false) => (
    <div className="field w-half">
      <label>{field.replace(/_/g, ' ').toUpperCase()}</label>
      <div className="upload-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <FileUpload
            label={
              <div className="upload-zone" style={{ margin: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Upload
              </div>
            }
            onFilesUploaded={(files) => {
                const currentFn = formik.values[field] || [];
                formik.setFieldValue(field, multiple ? [...currentFn, ...files] : files);
            }}
            bucketPath={bucket}
            multiple={multiple}
            customerName={formik.values.name_of_individual}
            variant="unstyled"
            containerStyles={{ marginTop: 0 }}
          />
          {formik.values[field] && (formik.values[field].length > 0) && (
             <ImagePreview
               images={Array.isArray(formik.values[field]) ? formik.values[field] : [formik.values[field]]}
               onDeleteImage={(idx) => {
                   if(multiple) {
                       const updated = formik.values[field].filter((_, i) => i !== idx);
                       formik.setFieldValue(field, updated);
                   } else {
                       formik.setFieldValue(field, []);
                   }
               }}
               allowUserDelete={true} 
             />
          )}
      </div>
    </div>
  );

  if (!data) return <div>Loading...</div>;

  return (
    <div className="app">
      <div className="page">
        <div className="page-header">
          <div className="page-title">Edit Draft Application</div>
        </div>

        <div className="kyc-card">
           {/* Category Row */}
           <div className="category-bar">
            <span className="bar-label">
              Category <span style={{ color: "var(--red)" }}>*</span>
            </span>
            <label className={`radio-chip ${formik.values.category === "Individual/ Proprietary Firm" ? "selected" : ""}`}>
              <input
                type="radio"
                name="category"
                value="Individual/ Proprietary Firm"
                checked={formik.values.category === "Individual/ Proprietary Firm"}
                onChange={formik.handleChange}
              />
              <span className="dot"></span> Individual / Proprietary
            </label>
            <label className={`radio-chip ${formik.values.category === "Partnership Firm" ? "selected" : ""}`}>
              <input
                type="radio"
                name="category"
                value="Partnership Firm"
                checked={formik.values.category === "Partnership Firm"}
                onChange={formik.handleChange}
              />
              <span className="dot"></span> Partnership Firm
            </label>
            <label className={`radio-chip ${formik.values.category === "Company" ? "selected" : ""}`}>
              <input
                type="radio"
                name="category"
                value="Company"
                checked={formik.values.category === "Company"}
                onChange={formik.handleChange}
              />
              <span className="dot"></span> Company
            </label>
            <label className={`radio-chip ${formik.values.category === "Trust Foundations" ? "selected" : ""}`}>
              <input
                type="radio"
                name="category"
                value="Trust Foundations"
                checked={formik.values.category === "Trust Foundations"}
                onChange={formik.handleChange}
              />
              <span className="dot"></span> Trust / Foundation
            </label>
          </div>

          <div className="panels">
            {/* LEFT PANEL */}
            <div className="panel">
              {/* Individual Info */}
              <div className="section">
                <div className="section-header">
                  <span className="section-title section-title-accent">
                    Individual Information
                  </span>
                </div>
                <div className="fields">
                  <div className="row">
                    <div className="field">
                      <label>
                        Name of Individual / Firm / Company <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        name="name_of_individual"
                        placeholder="Enter full name"
                        value={formik.values.name_of_individual}
                        onChange={formik.handleChange}
                        className={formik.touched.name_of_individual && formik.errors.name_of_individual ? "error" : ""}
                      />
                       {formik.touched.name_of_individual && formik.errors.name_of_individual && <div className="err-msg">{formik.errors.name_of_individual}</div>}
                    </div>
                  </div>
                  <div className="row">
                    <div className="field">
                      <label>
                        Status of Exporter / Importer <span className="req">*</span>
                      </label>
                      <div className="inline-radios">
                        <label>
                          <input
                            type="radio"
                            name="status"
                            value="Manufacturer"
                            checked={formik.values.status === "Manufacturer"}
                            onChange={formik.handleChange}
                          />{" "}
                          Manufacturer
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="status"
                            value="Trader"
                            checked={formik.values.status === "Trader"}
                            onChange={formik.handleChange}
                          />{" "}
                          Trader
                        </label>
                      </div>
                      {formik.touched.status && formik.errors.status && <div className="err-msg">{formik.errors.status}</div>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Permanent Address */}
              <div className="section">
                <div className="section-header">
                  <span className="section-title">Permanent Address</span>
                </div>
                <div className="fields">
                  <div className="row">
                    <div className="field">
                      <label>
                        Address Line 1 <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        name="permanent_address_line_1"
                        placeholder="Street, Building, Flat No."
                        value={formik.values.permanent_address_line_1}
                        onChange={formik.handleChange}
                         className={formik.touched.permanent_address_line_1 && formik.errors.permanent_address_line_1 ? "error" : ""}
                      />
                       {formik.touched.permanent_address_line_1 && formik.errors.permanent_address_line_1 && <div className="err-msg">{formik.errors.permanent_address_line_1}</div>}
                    </div>
                  </div>
                  <div className="row">
                    <div className="field">
                      <label>Address Line 2</label>
                      <input
                        type="text"
                        name="permanent_address_line_2"
                        placeholder="Area, Landmark"
                        value={formik.values.permanent_address_line_2}
                        onChange={formik.handleChange}
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="field w-third">
                      <label>
                        Pin Code <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        name="permanent_address_pin_code"
                        placeholder="6-digit"
                        maxLength="6"
                        value={formik.values.permanent_address_pin_code}
                        onChange={formik.handleChange}
                         className={formik.touched.permanent_address_pin_code && formik.errors.permanent_address_pin_code ? "error" : ""}
                      />
                    </div>
                    <div className="field w-third">
                      <label>
                        City <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        name="permanent_address_city"
                        placeholder="Auto-filled"
                        value={formik.values.permanent_address_city}
                        onChange={formik.handleChange}
                      />
                    </div>
                    <div className="field w-third">
                      <label>
                        State <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        name="permanent_address_state"
                        placeholder="Auto-filled"
                        value={formik.values.permanent_address_state}
                        onChange={formik.handleChange}
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="field w-half">
                      <label>
                        Mobile <span className="req">*</span>
                      </label>
                      <input
                        type="tel"
                        name="permanent_address_telephone"
                        placeholder="+91 XXXXX XXXXX"
                        value={formik.values.permanent_address_telephone}
                        onChange={formik.handleChange}
                         className={formik.touched.permanent_address_telephone && formik.errors.permanent_address_telephone ? "error" : ""}
                      />
                    </div>
                    <div className="field w-half">
                      <label>
                        Email <span className="req">*</span>
                      </label>
                      <input
                        type="email"
                        name="permanent_address_email"
                        placeholder="email@domain.com"
                        value={formik.values.permanent_address_email}
                        onChange={formik.handleChange}
                         className={formik.touched.permanent_address_email && formik.errors.permanent_address_email ? "error" : ""}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Principal Business Address */}
              <div className="section">
                <div className="section-header">
                  <span className="section-title">Principal Business Address</span>
                  <label className="field-checkbox" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={formik.values.sameAsPermanentAddress}
                      onChange={handleSameAsPermanentAddress}
                    />
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#fff",
                        fontWeight: 600,
                      }}
                    >
                      Same as Permanent
                    </span>
                  </label>
                </div>
                <div className="fields">
                  <div className="row">
                    <div className="field">
                      <label>
                        Address Line 1 <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        name="principle_business_address_line_1"
                        placeholder="Street, Building, Flat No."
                        value={formik.values.principle_business_address_line_1}
                         onChange={formik.handleChange}
                         className={formik.touched.principle_business_address_line_1 && formik.errors.principle_business_address_line_1 ? "error" : ""}
                      />
                      {formik.touched.principle_business_address_line_1 && formik.errors.principle_business_address_line_1 && <div className="err-msg">{formik.errors.principle_business_address_line_1}</div>}
                    </div>
                  </div>
                  <div className="row">
                    <div className="field">
                      <label>Address Line 2</label>
                      <input
                        type="text"
                        name="principle_business_address_line_2"
                        placeholder="Area, Landmark"
                        value={formik.values.principle_business_address_line_2}
                         onChange={formik.handleChange}
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="field w-third">
                      <label>
                        Pin Code <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        name="principle_business_address_pin_code"
                        placeholder="6-digit"
                        maxLength="6"
                         value={formik.values.principle_business_address_pin_code}
                         onChange={formik.handleChange}
                          className={formik.touched.principle_business_address_pin_code && formik.errors.principle_business_address_pin_code ? "error" : ""}
                      />
                    </div>
                    <div className="field w-third">
                      <label>
                        City <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        name="principle_business_address_city"
                        placeholder="Auto-filled"
                         value={formik.values.principle_business_address_city}
                         onChange={formik.handleChange}
                      />
                    </div>
                    <div className="field w-third">
                      <label>
                        State <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        name="principle_business_address_state"
                        placeholder="Auto-filled"
                         value={formik.values.principle_business_address_state}
                         onChange={formik.handleChange}
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="field w-third">
                      <label>
                        Mobile <span className="req">*</span>
                      </label>
                      <input
                        type="tel"
                        name="principle_business_telephone"
                        placeholder="+91 XXXXX"
                         value={formik.values.principle_business_telephone}
                         onChange={formik.handleChange}
                          className={formik.touched.principle_business_telephone && formik.errors.principle_business_telephone ? "error" : ""}
                      />
                    </div>
                    <div className="field w-third">
                      <label>
                        Email <span className="req">*</span>
                      </label>
                      <input
                        type="email"
                        name="principle_address_email"
                        placeholder="email@domain.com"
                         value={formik.values.principle_address_email}
                          onChange={formik.handleChange}
                           className={formik.touched.principle_address_email && formik.errors.principle_address_email ? "error" : ""}
                      />
                    </div>
                    <div className="field w-third">
                      <label>Website</label>
                      <input
                        type="text"
                        name="principle_business_website"
                        placeholder="www.example.com"
                         value={formik.values.principle_business_website}
                         onChange={formik.handleChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* IEC & PAN */}
              <div className="section">
                <div className="section-header">
                  <span className="section-title section-title-accent">
                    IEC & PAN Details
                  </span>
                </div>
                <div className="fields">
                  <div className="row">
                    <div className="field w-half">
                      <label>
                        IEC No <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        name="iec_no"
                        placeholder="AAAA0000000"
                        value={formik.values.iec_no}
                        onChange={formik.handleChange}
                        className={formik.touched.iec_no && formik.errors.iec_no ? "error" : ""}
                      />
                      {formik.touched.iec_no && formik.errors.iec_no && <div className="err-msg">{formik.errors.iec_no}</div>}
                    </div>
                    {renderUpload("iec_copy", "iec_copy")}
                  </div>
                  <div className="row">
                    <div className="field w-half">
                      <label>
                        PAN No <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        name="pan_no"
                        placeholder="AAAAA0000A"
                        maxLength="10"
                        value={formik.values.pan_no}
                        onChange={formik.handleChange}
                         className={formik.touched.pan_no && formik.errors.pan_no ? "error" : ""}
                      />
                      {formik.touched.pan_no && formik.errors.pan_no && <div className="err-msg">{formik.errors.pan_no}</div>}
                    </div>
                    {renderUpload("pan_copy", "pan-copy")}
                  </div>
                </div>
              </div>

              {/* Authorised Signatory */}
              <div className="section">
                <div className="section-header">
                  <span className="section-title">Authorised Signatory</span>
                </div>
                <div className="fields">
                  <div className="row">
                     {renderUpload("authorised_signatories", "authorised-signatories", true)}
                     {renderUpload("authorisation_letter", "authorisation_letter", true)}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL */}
            
            <div className="panel">
              {/* Factory Addresses */}
              <div className="section">
                <div className="section-header">
                  <span className="section-title section-title-accent">
                    Factory Addresses
                  </span>
                  <button
                    type="button"
                    className="btn-add"
                    onClick={handleAddField}
                  >
                    + Add Factory
                  </button>
                </div>
                <div id="factory-list">
                  {formik.values.factory_addresses?.map((address, index) => (
                    <div key={index} className="repeat-entry">
                      <div className="repeat-entry-header">
                        <span className="repeat-entry-title">
                          Factory #{index + 1}
                        </span>
                        {formik.values.factory_addresses.length > 1 && (
                            <button className="btn-remove" onClick={() => handleRemoveField(index)}>×</button>
                        )}
                      </div>
                      <div className="fields">
                        <div className="row">
                          <div className="field w-half">
                            <label>
                              Address Line 1 <span className="req">*</span>
                            </label>
                            <input
                              type="text"
                              name={`factory_addresses[${index}].factory_address_line_1`}
                              placeholder="Street, Building"
                              value={address.factory_address_line_1}
                              onChange={formik.handleChange}
                            />
                          </div>
                          <div className="field w-half">
                            <label>Address Line 2</label>
                            <input
                               type="text"
                               name={`factory_addresses[${index}].factory_address_line_2`}
                               placeholder="Area, Landmark"
                               value={address.factory_address_line_2}
                               onChange={formik.handleChange}
                            />
                          </div>
                        </div>
                        <div className="row">
                          <div className="field w-third">
                            <label>
                              Pin Code <span className="req">*</span>
                            </label>
                            <input
                              type="text"
                               name={`factory_addresses[${index}].factory_address_pin_code`}
                              placeholder="6-digit"
                              maxLength="6"
                              value={address.factory_address_pin_code}
                              onChange={formik.handleChange}
                            />
                          </div>
                          <div className="field w-third">
                            <label>
                              City <span className="req">*</span>
                            </label>
                            <input 
                                type="text" 
                                name={`factory_addresses[${index}].factory_address_city`}
                                value={address.factory_address_city}
                                onChange={formik.handleChange}
                            />
                          </div>
                          <div className="field w-third">
                            <label>
                              State <span className="req">*</span>
                            </label>
                            <input 
                                type="text" 
                                name={`factory_addresses[${index}].factory_address_state`}
                                value={address.factory_address_state}
                                onChange={formik.handleChange}
                            />
                          </div>
                        </div>
                        <div className="row">
                          <div className="field w-half">
                            <label>
                              GST Number <span className="req">*</span>
                            </label>
                            <input
                              type="text"
                              name={`factory_addresses[${index}].gst`}
                              placeholder="22AAAAA0000A1Z5"
                              value={address.gst}
                              onChange={formik.handleChange}
                              className={hasError(`factory_addresses[${index}].gst`) ? "error" : ""}
                            />
                            {getFieldError(`factory_addresses[${index}].gst`) && (
                                <div className="err-msg">{getFieldError(`factory_addresses[${index}].gst`)}</div>
                            )}
                          </div>
                          <div className="field w-half">
                             <label>GST Registration Doc</label>
                             <FileUpload
                                label={<div className="upload-zone" style={{margin:0}}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    Upload
                                </div>}
                                onFilesUploaded={(files) => formik.setFieldValue(`factory_addresses[${index}].gst_reg`, files)}
                                bucketPath="gst_reg"
                                customerName={formik.values.name_of_individual}
                                variant="unstyled"
                                containerStyles={{ marginTop: 0 }}
                                />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Branch Information */}
              <div className="section">
                <div className="section-header">
                  <span className="section-title section-title-accent">
                    Branch Information
                  </span>
                  <button 
                    type="button" 
                    className="btn-add"
                    onClick={handleAddBranch}
                  >
                    + Add Branch
                  </button>
                </div>
                <div id="branch-list">
                  {(!formik.values.branches || formik.values.branches.length === 0) ? (
                     <div className="empty-state">No branches added. Click "+ Add Branch" to add one.</div>
                  ) : (
                    formik.values.branches.map((branch, index) => (
                        <div key={index} className="repeat-entry">
                            <div className="repeat-entry-header">
                                <span className="repeat-entry-title">Branch #{index + 1}</span>
                                <button className="btn-remove" onClick={() => handleRemoveBranch(index)}>×</button>
                            </div>
                            <div className="fields">
                                <div className="row">
                                    <div className="field w-third">
                                        <label>Branch Name <span className="req">*</span></label>
                                        <input 
                                            name={`branches[${index}].branch_name`}
                                            value={branch.branch_name}
                                            onChange={formik.handleChange}
                                            placeholder="Branch name"
                                            className={hasError(`branches[${index}].branch_name`) ? "error" : ""} 
                                        />
                                        {getFieldError(`branches[${index}].branch_name`) && <div className="err-msg">{getFieldError(`branches[${index}].branch_name`)}</div>}
                                    </div>
                                    <div className="field w-third">
                                        <label>Branch Code <span className="req">*</span></label>
                                        <input 
                                             name={`branches[${index}].branch_code`}
                                             value={branch.branch_code}
                                            onChange={formik.handleChange}
                                            placeholder="Branch code" 
                                            className={hasError(`branches[${index}].branch_code`) ? "error" : ""}
                                        />
                                        {getFieldError(`branches[${index}].branch_code`) && <div className="err-msg">{getFieldError(`branches[${index}].branch_code`)}</div>}
                                    </div>
                                    <div className="field w-third">
                                        <label>GST Number</label>
                                        <input 
                                             name={`branches[${index}].gst_no`}
                                             value={branch.gst_no}
                                            onChange={formik.handleChange}
                                        />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="field">
                                        <label>Address <span className="req">*</span></label>
                                        <input 
                                             name={`branches[${index}].address`}
                                             value={branch.address}
                                            onChange={formik.handleChange}
                                            placeholder="Full address" 
                                            className={hasError(`branches[${index}].address`) ? "error" : ""}
                                        />
                                        {getFieldError(`branches[${index}].address`) && <div className="err-msg">{getFieldError(`branches[${index}].address`)}</div>}
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="field w-third">
                                        <label>City <span className="req">*</span></label>
                                        <input 
                                             name={`branches[${index}].city`}
                                             value={branch.city}
                                            onChange={formik.handleChange}
                                            className={hasError(`branches[${index}].city`) ? "error" : ""}
                                        />
                                        {getFieldError(`branches[${index}].city`) && <div className="err-msg">{getFieldError(`branches[${index}].city`)}</div>}
                                    </div>
                                    <div className="field w-third">
                                        <label>State <span className="req">*</span></label>
                                        <input 
                                             name={`branches[${index}].state`}
                                             value={branch.state}
                                            onChange={formik.handleChange}
                                            className={hasError(`branches[${index}].state`) ? "error" : ""}
                                        />
                                        {getFieldError(`branches[${index}].state`) && <div className="err-msg">{getFieldError(`branches[${index}].state`)}</div>}
                                    </div>
                                    <div className="field w-third">
                                        <label>Postal Code <span className="req">*</span></label>
                                        <input 
                                             name={`branches[${index}].postal_code`}
                                             value={branch.postal_code}
                                            onChange={formik.handleChange}
                                            maxLength="6" 
                                            className={hasError(`branches[${index}].postal_code`) ? "error" : ""}
                                        />
                                        {getFieldError(`branches[${index}].postal_code`) && <div className="err-msg">{getFieldError(`branches[${index}].postal_code`)}</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                  )}
                </div>
              </div>

              {/* Banking Information */}
              <div className="section">
                <div className="section-header">
                  <span className="section-title section-title-accent">
                    Banking Information
                  </span>
                  <button 
                    type="button" 
                    className="btn-add"
                    onClick={handleAddBanks}
                  >
                    + Add Bank
                  </button>
                </div>
                <div id="bank-list">
                  {formik.values.banks?.map((bank, index) => (
                    <div key={index} className="repeat-entry">
                      <div className="repeat-entry-header">
                        <span className="repeat-entry-title">
                          Bank #{index + 1}
                        </span>
                        {formik.values.banks.length > 1 && (
                            <button className="btn-remove" onClick={() => handleRemoveBank(index)}>×</button>
                        )}
                      </div>
                      <div className="fields">
                        <div className="row">
                          <div className="field w-half">
                            <label>
                              Bank / Dealer Name <span className="req">*</span>
                            </label>
                            <input
                              type="text"
                              name={`banks[${index}].bankers_name`}
                              placeholder="Bank name"
                              value={bank.bankers_name}
                              onChange={formik.handleChange}
                              className={hasError(`banks[${index}].bankers_name`) ? "error" : ""}
                            />
                            {getFieldError(`banks[${index}].bankers_name`) && (
                                <div className="err-msg">{getFieldError(`banks[${index}].bankers_name`)}</div>
                            )}
                          </div>
                          <div className="field w-half">
                            <label>
                              Branch Address <span className="req">*</span>
                            </label>
                            <input
                              type="text"
                              name={`banks[${index}].branch_address`}
                              placeholder="Branch location"
                              value={bank.branch_address}
                              onChange={formik.handleChange}
                              className={hasError(`banks[${index}].branch_address`) ? "error" : ""}
                            />
                             {getFieldError(`banks[${index}].branch_address`) && (
                                <div className="err-msg">{getFieldError(`banks[${index}].branch_address`)}</div>
                            )}
                          </div>
                        </div>
                        <div className="row">
                          <div className="field w-third">
                            <label>
                              A/C Number <span className="req">*</span>
                            </label>
                            <input
                               type="text"
                                name={`banks[${index}].account_no`}
                               value={bank.account_no}
                               onChange={formik.handleChange}
                               className={hasError(`banks[${index}].account_no`) ? "error" : ""}
                            />
                            {getFieldError(`banks[${index}].account_no`) && (
                                <div className="err-msg">{getFieldError(`banks[${index}].account_no`)}</div>
                            )}
                          </div>
                          <div className="field w-third">
                            <label>
                              IFSC <span className="req">*</span>
                            </label>
                            <input
                               type="text"
                                name={`banks[${index}].ifsc`}
                               value={bank.ifsc}
                               onChange={formik.handleChange}
                               className={hasError(`banks[${index}].ifsc`) ? "error" : ""}
                            />
                             {getFieldError(`banks[${index}].ifsc`) && (
                                <div className="err-msg">{getFieldError(`banks[${index}].ifsc`)}</div>
                            )}
                          </div>
                          <div className="field w-third">
                            <label>
                              AD Code <span className="req">*</span>
                            </label>
                            <input
                               type="text"
                                name={`banks[${index}].adCode`}
                               value={bank.adCode}
                               onChange={formik.handleChange}
                               className={hasError(`banks[${index}].adCode`) ? "error" : ""}
                            />
                             {getFieldError(`banks[${index}].adCode`) && (
                                <div className="err-msg">{getFieldError(`banks[${index}].adCode`)}</div>
                            )}
                          </div>
                        </div>
                        <div className="row">
                          <div className="field">
                            <label>AD Code File</label>
                             <FileUpload
                                label={<div className="upload-zone" style={{margin:0}}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    Upload
                                </div>}
                                onFilesUploaded={(files) => formik.setFieldValue(`banks[${index}].adCode_file`, files)}
                                bucketPath={`ad-code-${index}`}
                                customerName={formik.values.name_of_individual}
                                variant="unstyled"
                                containerStyles={{ marginTop: 0 }}
                             />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Finance Details (Visual/Static) */}
                  <div className="fields" style={{ paddingTop: "4px" }}>
                    <div className="finance-divider">
                      Finance Details (verify by account team)
                    </div>
                    <div className="row">
                      <div className="field w-quarter">
                        <label>Credit Period</label>
                        <input type="text" placeholder="e.g. 30 Days" />
                      </div>
                      <div className="field w-quarter">
                        <label>Credit Limit Validity</label>
                        <input type="date" />
                      </div>
                      <div className="field w-quarter">
                        <label>O/S Limit</label>
                        <input type="text" placeholder="Outstanding limit" />
                      </div>
                      <div className="field w-quarter">
                        <label>Quotation Given?</label>
                        <div className="inline-radios">
                          <label>
                            <input type="radio" name="quotation" value="yes" />{" "}
                            Yes
                          </label>
                          <label>
                            <input
                              type="radio"
                              name="quotation"
                              value="no"
                              defaultChecked
                            />{" "}
                            No
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="field">
                        <label className="field-checkbox">
                          <input type="checkbox" />{" "}
                          <span>Advance Payment Required</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Supporting Documents (Category Aware) */}
          <div className="full-section">
            <div className="section-header">
              <span className="section-title section-title-accent">
                Supporting Documents
              </span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)" }}>
                Shown based on selected category {formik.values.category ? `(${formik.values.category})` : ""}
              </span>
            </div>
             
             <div className="cat-docs-section active">
                 <div className="cat-docs-grid">
                    {(formik.values.category === "Individual/ Proprietary Firm" || !formik.values.category) && (
                        <>
                           {renderUpload("individual_passport_img", "individual_passport_img")}
                           {renderUpload("individual_voter_card_img", "individual_voter_card_img")}
                           {renderUpload("individual_driving_license_img", "individual_driving_license_img")}
                           {renderUpload("individual_bank_statement_img", "individual_bank_statement_img")}
                           {renderUpload("individual_ration_card_img", "individual_ration_card_img")}
                           {renderUpload("individual_aadhar_card", "individual_aadhar_card")}
                        </>
                    )}
                    {(formik.values.category === "Partnership Firm") && (
                        <>
                           {renderUpload("partnership_registration_certificate_img", "partnership_registration_certificate_img")}
                           {renderUpload("partnership_deed_img", "partnership_deed_img")}
                           {renderUpload("partnership_power_of_attorney_img", "partnership_power_of_attorney_img")}
                           {renderUpload("partnership_valid_document", "partnership_valid_document")}
                           {renderUpload("partnership_aadhar_card_front_photo", "partnership_aadhar_card_front_photo")}
                           {renderUpload("partnership_aadhar_card_back_photo", "partnership_aadhar_card_back_photo")}
                           {renderUpload("partnership_telephone_bill", "partnership_telephone_bill")}
                        </>
                    )}
                     {(formik.values.category === "Company") && (
                        <>
                           {renderUpload("company_certificate_of_incorporation_img", "company_certificate_of_incorporation_img")}
                           {renderUpload("company_memorandum_of_association_img", "company_memorandum_of_association_img")}
                           {renderUpload("company_articles_of_association_img", "company_articles_of_association_img")}
                           {renderUpload("company_power_of_attorney_img", "company_power_of_attorney_img")}
                           {renderUpload("company_telephone_bill_img", "company_telephone_bill_img")}
                           {renderUpload("company_pan_allotment_letter_img", "company_pan_allotment_letter_img")}
                        </>
                    )}
                     {(formik.values.category === "Trust Foundations") && (
                        <>
                           {renderUpload("trust_certificate_of_registration_img", "trust_certificate_of_registration_img")}
                           {renderUpload("trust_power_of_attorney_img", "trust_power_of_attorney_img")}
                           {renderUpload("trust_officially_valid_document_img", "trust_officially_valid_document_img")}
                           {renderUpload("trust_resolution_of_managing_body_img", "trust_resolution_of_managing_body_img")}
                           {renderUpload("trust_telephone_bill_img", "trust_telephone_bill_img")}
                             {/* Trust Extra Fields */}
                            <div style={{gridColumn: '1 / -1', marginTop: '10px'}}>
                                <div className="fields" style={{ padding: '8px 16px 10px', borderTop: '1px solid var(--border-light)', marginTop: '8px' }}>
                                    <div className="row">
                                    <div className="field w-half">
                                        <label>Name of Trustees</label>
                                        <input type="text" name="trust_name_of_trustees" value={formik.values.trust_name_of_trustees} onChange={formik.handleChange} />
                                    </div>
                                    <div className="field w-half">
                                        <label>Name of Founder</label>
                                        <input type="text" name="trust_name_of_founder" value={formik.values.trust_name_of_founder} onChange={formik.handleChange} />
                                    </div>
                                    </div>
                                     <div className="row">
                                        <div className="field w-third">
                                            <label>Address of Founder</label>
                                            <input type="text" name="trust_address_of_founder" value={formik.values.trust_address_of_founder} onChange={formik.handleChange} />
                                        </div>
                                         <div className="field w-third">
                                            <label>Telephone of Founder</label>
                                            <input type="text" name="trust_telephone_of_founder" value={formik.values.trust_telephone_of_founder} onChange={formik.handleChange} />
                                        </div>
                                         <div className="field w-third">
                                            <label>Email of Founder</label>
                                            <input type="text" name="trust_email_of_founder" value={formik.values.trust_email_of_founder} onChange={formik.handleChange} />
                                        </div>
                                     </div>
                                </div>
                            </div>
                        </>
                    )}
                 </div>
             </div>
          </div>

          {/* Additional Documents */}
          <div className="full-section">
            <div className="section-header">
              <span className="section-title">Additional Documents</span>
            </div>
            <div className="docs-grid">
               {renderUpload("other_documents", "other-documents", true)}
               {renderUpload("spcb_reg", "spcb-registration", true)}
               {renderUpload("kyc_verification_images", "kyc-verification-images", true)}
               {renderUpload("gst_returns", "gst-returns", true)}
            </div>
          </div>

          {/* Form Footer */}
          <div className="form-footer">
            <div className="footer-info">
              💡 <strong>Save Draft:</strong> Only IEC Number + Name required &nbsp;•&nbsp;{" "}
              <strong>Submit:</strong> All mandatory fields required
            </div>
            <div className="footer-actions">
              <button 
                type="button"
                className="btn btn-outline"
                 onClick={() => setDialogState({
                    isOpen: true,
                    title: "Preview Application",
                    content: <Preview data={formik.values} />,
                    severity: "info",
                })}
              >
                👁 Preview
              </button>
              <button 
                type="button"
                className="btn btn-draft"
                 onClick={() => {
                    setSubmitType("update_draft"); // Trigger draft logic
                    setTimeout(() => formik.handleSubmit(), 0);
                  }}
              >
                💾 Save Draft
              </button>
              <button 
                type="button"
                className="btn btn-success"
                onClick={() => {
                    setSubmitType("submit_for_approval"); // Trigger submit logic
                    setTimeout(() => formik.handleSubmit(), 0);
                  }}
              >
                📤 Submit Application
              </button>
            </div>
          </div>
        </div>
      </div>
      
       <CustomDialog
            open={dialogState.isOpen}
            onClose={handleCloseDialog}
            title={dialogState.title}
            severity={dialogState.severity}
            actions={dialogState.actions}
          >
            {dialogState.content}
        </CustomDialog>
    </div>
  );
}

export default React.memo(ViewDraftDetails);
