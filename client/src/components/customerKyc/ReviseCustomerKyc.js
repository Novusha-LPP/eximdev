import React, { useEffect, useState, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useFormik, getIn } from "formik";
import { validationSchema } from "../../schemas/customerKyc/customerKycSchema.js";
import useSupportingDocuments from "../../customHooks/useSupportingDocuments";
import FileUpload from "../gallery/FileUpload";
import ImagePreview from "../gallery/ImagePreview";
import Preview from "./Preview";
import "./customerKyc.css";
import "./KycForm.scss";
import { useSnackbar } from "../../contexts/SnackbarContext";
import { UserContext } from "../../contexts/UserContext";
import CustomDialog from "./CustomDialog";
import { getCityAndStateByPinCode } from "../../utils/getCityAndStateByPinCode";
import { FormControlLabel, Checkbox } from "@mui/material";

function ReviseCustomerKyc() {
  const { _id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { showSuccess, showError } = useSnackbar();
  const [data, setData] = useState(null);
  const keepStatusRef = useRef(false);

  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "",
    content: null,
    severity: "info",
    actions: null
  });

  const [previewOpen, setPreviewOpen] = useState(false);

  // Helpers for field validation (supports nested paths like banks[0].ifsc)
  const hasError = (path) => !!getIn(formik.touched, path) && !!getIn(formik.errors, path);
  const fieldError = (path) => hasError(path) ? getIn(formik.errors, path) : null;

  // Deep-touch all fields so red borders appear on validation
  const setAllTouched = (obj, prefix = "") => {
    const touched = {};
    const setLeaf = (path) => {
      const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
      let cur = touched;
      parts.forEach((p, i) => {
        if (i === parts.length - 1) { cur[p] = true; }
        else {
          if (cur[p] === undefined) cur[p] = isNaN(parts[i + 1]) ? {} : [];
          cur = cur[p];
        }
      });
    };
    const flatten = (o, path) => {
      if (Array.isArray(o)) {
        if (o.length === 0) {
          // Empty array: mark the field itself touched so min(1) validation shows
          if (path) setLeaf(path);
        } else {
          // Non-empty: recurse into items only (do NOT mark array itself, prevents boolean conflict)
          o.forEach((item, i) => flatten(item, `${path}[${i}]`));
        }
      } else if (o && typeof o === "object") {
        Object.keys(o).forEach(k => flatten(o[k], path ? `${path}.${k}` : k));
      } else {
        if (path) setLeaf(path);
      }
    };
    flatten(obj, prefix);
    return touched;
  };

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
      factory_name_board_img: [],
      factory_selfie_img: [],
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
      sameAsPermanentAddress: false, // UI state helper

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
      financial_details_approved: false,
      financial_details_approved_by: "",

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
      hsn_codes: [],
      date_of_incorporation: "",
      contacts: [],
    },
    validationSchema: validationSchema,
    enableReinitialize: true, // Important for loading data
    onSubmit: async (values, { resetForm }) => {
      try {
        const payload = { ...values };
        if (keepStatusRef.current) {
          payload.keepStatus = true;
        }
        if (payload.date_of_incorporation === "") {
          payload.date_of_incorporation = null;
        }

        // We use PATCH for updates
        const res = await axios.patch(
          `${process.env.REACT_APP_API_STRING}/update-customer-kyc/${_id}`,
          payload
        );

        const revisionTabIndex = user?.role === "Admin" ? 4 : 3;
        showSuccess(res.data.message || "Application updated successfully.");
        // resetForm(); // Do not reset form on revision success, user might want to see it or we nav away
        navigate(`/customer-kyc?tab=${revisionTabIndex}`);
      } catch (error) {
        console.error("Error updating customer KYC:", error);
        if (error.response?.data?.message) {
          showError(`Error: ${error.response.data.message}`);
        } else {
          showError("An error occurred while updating. Please try again.");
        }
      }
    },
  });

  // Fetch Data
  useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/view-customer-kyc-details/${_id}`
        );
        if (res.data) {
          // Ensure arrays are initialized if null
          const sanitizedData = {
            ...res.data,
            factory_addresses: res.data.factory_addresses || [],
            banks: res.data.banks || [],
            branches: res.data.branches || [],
            hsn_codes: res.data.hsn_codes || [],
            date_of_incorporation: res.data.date_of_incorporation || "",
            contacts: res.data.contacts || [],
            factory_name_board_img: res.data.factory_name_board_img || [],
            factory_selfie_img: res.data.factory_selfie_img || [],
            // Finance defaults
            credit_period: res.data.credit_period || "",
            credit_limit_validity_date: res.data.credit_limit_validity_date || "",
            quotation: res.data.quotation || "No",
            outstanding_limit: res.data.outstanding_limit || "",
            advance_payment: res.data.advance_payment || false,
            financial_details_approved: res.data.financial_details_approved || false,
            financial_details_approved_by: res.data.financial_details_approved_by || "",
          };
          setData(sanitizedData);
          formik.setValues(sanitizedData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        showError("Failed to load application details.");
      }
    }
    if (_id) getData();
    // eslint-disable-next-line
  }, [_id]);

  const canApproveFinance =
    user?.role === "Admin" ||
    user?.role === "HOD" ||
    (Array.isArray(user?.modules) && user.modules.includes("Accounts"));

  const handleFinancialApprovalChange = async (event) => {
    const isChecked = event.target.checked;
    const approved_by = isChecked ? `${user.first_name} ${user.last_name}` : "";

    try {
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/customer-kyc-financial-approval/${_id}`,
        {
          financial_details_approved: isChecked,
          financial_details_approved_by: approved_by,
        }
      );
      
      formik.setFieldValue("financial_details_approved", isChecked);
      formik.setFieldValue("financial_details_approved_by", approved_by);
      showSuccess(isChecked ? "Financial details approved" : "Financial approval removed");
    } catch (error) {
      console.error("Error updating financial approval", error);
      showError("Failed to update financial approval");
    }
  };

  const { getSupportingDocs, fileSnackbar } = useSupportingDocuments(formik);

  // Address Logic
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

  const handleAddHsn = (e) => {
    if (e.key === 'Enter') {
      const val = e.target.value.trim();
      e.preventDefault();
      if (val !== "") {
        const currentHsn = formik.values.hsn_codes || [];
        if (!currentHsn.includes(val)) {
          formik.setFieldValue("hsn_codes", [...currentHsn, val]);
        }
        e.target.value = "";
      }
    }
  };

  const handleRemoveHsn = (idx) => {
    const currentHsn = formik.values.hsn_codes || [];
    const updated = currentHsn.filter((_, i) => i !== idx);
    formik.setFieldValue("hsn_codes", updated);
  };

  const handleAddContact = () => {
    const currentContacts = formik.values.contacts || [];
    formik.setFieldValue("contacts", [
      ...currentContacts,
      { name: "", designation: "", phone: "", email: "" }
    ]);
  };

  const handleRemoveContact = (idx) => {
    const currentContacts = formik.values.contacts || [];
    const updated = currentContacts.filter((_, i) => i !== idx);
    formik.setFieldValue("contacts", updated);
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

  const renderUpload = (field, bucket, multiple = false) => {
    const files = formik.values[field];
    const fileArray = Array.isArray(files) ? files : (files ? [files] : []);

    return (
      <div className="kyc-doc-section">
        <div className="kyc-lbl">{field.replace(/_/g, ' ').toUpperCase()}</div>

        {fileArray.length > 0 ? (
          <table className="kyc-doc-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fileArray.map((file, idx) => (
                <tr key={idx}>
                  <td>
                    {typeof file === 'string'
                      ? file.split('/').pop()
                      : (file.name || "New File")}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span
                        className="kyc-view-link"
                        onClick={() => window.open(typeof file === 'string' ? file : URL.createObjectURL(file), "_blank")}
                      >
                        View
                      </span>
                      <button
                        type="button"
                        className="btn-remove"
                        style={{ padding: '2px 6px', fontSize: '14px', background: 'transparent', color: 'var(--red)', border: 'none', cursor: 'pointer' }}
                        onClick={() => {
                          if (multiple) {
                            const updated = fileArray.filter((_, i) => i !== idx);
                            formik.setFieldValue(field, updated);
                          } else {
                            formik.setFieldValue(field, multiple ? [] : "");
                          }
                        }}
                      >
                        ✖
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="kyc-no-docs">No documents uploaded.</div>
        )}

        <div style={{ marginTop: '0.5rem' }}>
          <FileUpload
            label={
              <div className="upload-zone" style={{ margin: 0, padding: '6px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                Upload {multiple ? "Files" : "File"}
              </div>
            }
            onFilesUploaded={(newFiles) => {
              if (multiple) {
                const current = Array.isArray(formik.values[field]) ? formik.values[field] : [];
                formik.setFieldValue(field, [...current, ...newFiles]);
              } else {
                formik.setFieldValue(field, newFiles);
              }
            }}
            bucketPath={bucket}
            multiple={multiple}
            customerName={formik.values.name_of_individual}
            variant="unstyled"
            containerStyles={{ marginTop: 0 }}
          />
        </div>
      </div>
    );
  };

  if (!data) return <div>Loading...</div>;

  return (
    <div className="app customer-kyc-wrapper">
      <div className="page">
        <div className="page-header">
          <div className="page-title">Revise Application</div>
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

                  {/* Date of Incorporation */}
                  <div className="row">
                    <div className="field w-half">
                      <label>Date of Incorporation</label>
                      <input
                        type="date"
                        name="date_of_incorporation"
                        value={formik.values.date_of_incorporation ? new Date(formik.values.date_of_incorporation).toISOString().split('T')[0] : ""}
                        onChange={formik.handleChange}
                      />
                    </div>
                  </div>

                  {/* HSN Codes */}
                  <div className="row">
                    <div className="field">
                      <label>HSN Codes (List)</label>
                      <input
                        type="text"
                        placeholder="Type HSN Code and press Enter"
                        onKeyDown={handleAddHsn}
                        className="hsn-input"
                      />
                      <div className="chip-container" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {formik.values.hsn_codes?.map((code, idx) => (
                          <div key={idx} className="chip" style={{ background: '#334155', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {code}
                            <span className="close-btn" style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => handleRemoveHsn(idx)}>×</span>
                          </div>
                        ))}
                      </div>
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
                        className={hasError("permanent_address_city") ? "error" : ""}
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
                        className={hasError("permanent_address_state") ? "error" : ""}
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
                        className={hasError("principle_business_address_city") ? "error" : ""}
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
                        className={hasError("principle_business_address_state") ? "error" : ""}
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
                              className={hasError(`factory_addresses[${index}].factory_address_line_1`) ? "error" : ""}
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
                              className={hasError(`factory_addresses[${index}].factory_address_pin_code`) ? "error" : ""}
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
                              className={hasError(`factory_addresses[${index}].factory_address_city`) ? "error" : ""}
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
                              className={hasError(`factory_addresses[${index}].factory_address_state`) ? "error" : ""}
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
                          </div>
                          <div className="field w-half">
                            <label>GST Registration Doc</label>
                            <FileUpload
                              label={<div className="upload-zone" style={{ margin: 0 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                Upload
                              </div>}
                              onFilesUploaded={(files) => formik.setFieldValue(`factory_addresses[${index}].gst_reg`, files)}
                              bucketPath="gst_reg"
                              customerName={formik.values.name_of_individual}
                              variant="unstyled"
                              containerStyles={{ marginTop: 0 }}
                            />
                            {address.gst_reg && address.gst_reg.length > 0 && (
                              <ImagePreview
                                images={Array.isArray(address.gst_reg) ? address.gst_reg : [address.gst_reg]}
                                onDeleteImage={(idx) => {
                                  const updated = address.gst_reg.filter((_, i) => i !== idx);
                                  formik.setFieldValue(`factory_addresses[${index}].gst_reg`, updated);
                                }}
                                allowUserDelete={true}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Factory Photos (Mandatory) */}
              <div className="section">
                <div className="section-header">
                  <span className="section-title section-title-accent">Factory Photos (Mandatory)</span>
                </div>
                <div className="fields">
                  <div className="row">
                    <div className="field w-half">
                      <label style={{ color: hasError("factory_name_board_img") ? "var(--red)" : "" }}>FACTORY NAME BOARD PHOTO <span className="req">*</span></label>
                      {fieldError("factory_name_board_img") && <div className="err-msg">{fieldError("factory_name_board_img")}</div>}
                      <div className="upload-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '5px', border: hasError("factory_name_board_img") ? '1px solid var(--red)' : '1px solid transparent', borderRadius: '4px', padding: hasError("factory_name_board_img") ? '4px' : '0' }}>
                        <FileUpload
                          label={<div className="upload-zone" style={{ margin: 0 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            Upload
                          </div>}
                          onFilesUploaded={(files) => formik.setFieldValue("factory_name_board_img", files)}
                          bucketPath="factory_name_board_img"
                          customerName={formik.values.name_of_individual}
                          variant="unstyled"
                          containerStyles={{ marginTop: 0 }}
                        />
                        {formik.values.factory_name_board_img && formik.values.factory_name_board_img.length > 0 && (
                          <ImagePreview
                            images={Array.isArray(formik.values.factory_name_board_img) ? formik.values.factory_name_board_img : [formik.values.factory_name_board_img]}
                            onDeleteImage={(idx) => {
                              const updated = formik.values.factory_name_board_img.filter((_, i) => i !== idx);
                              formik.setFieldValue("factory_name_board_img", updated);
                            }}
                            allowUserDelete={true}
                          />
                        )}
                      </div>
                    </div>
                    <div className="field w-half">
                      <label style={{ color: hasError("factory_selfie_img") ? "var(--red)" : "" }}>FACTORY SELFIE PHOTO <span className="req">*</span></label>
                      {fieldError("factory_selfie_img") && <div className="err-msg">{fieldError("factory_selfie_img")}</div>}
                      <div className="upload-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '5px', border: hasError("factory_selfie_img") ? '1px solid var(--red)' : '1px solid transparent', borderRadius: '4px', padding: hasError("factory_selfie_img") ? '4px' : '0' }}>
                        <FileUpload
                          label={<div className="upload-zone" style={{ margin: 0 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            Upload
                          </div>}
                          onFilesUploaded={(files) => formik.setFieldValue("factory_selfie_img", files)}
                          bucketPath="factory_selfie_img"
                          customerName={formik.values.name_of_individual}
                          variant="unstyled"
                          containerStyles={{ marginTop: 0 }}
                        />
                        {formik.values.factory_selfie_img && formik.values.factory_selfie_img.length > 0 && (
                          <ImagePreview
                            images={Array.isArray(formik.values.factory_selfie_img) ? formik.values.factory_selfie_img : [formik.values.factory_selfie_img]}
                            onDeleteImage={(idx) => {
                              const updated = formik.values.factory_selfie_img.filter((_, i) => i !== idx);
                              formik.setFieldValue("factory_selfie_img", updated);
                            }}
                            allowUserDelete={true}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="section">
                <div className="section-header">
                  <span className="section-title section-title-accent">Contact Information</span>
                  <button type="button" className="btn-add" onClick={handleAddContact}>+ Add Contact</button>
                </div>
                <div id="contact-list">
                  {/* Map over contacts */}
                  {formik.values.contacts?.map((contact, idx) => (
                    <div key={idx} className="repeat-entry">
                      <div className="repeat-entry-header">
                        <span className="repeat-entry-title">Contact #{idx + 1}</span>
                        <button type="button" className="btn-remove" onClick={() => handleRemoveContact(idx)}>×</button>
                      </div>
                      <div className="fields">
                        <div className="row">
                          <div className="field w-half">
                            <label>Name <span className="req">*</span></label>
                            <input name={`contacts[${idx}].name`} value={contact.name} onChange={formik.handleChange} className={hasError(`contacts[${idx}].name`) ? "error" : ""} />
                          </div>
                          <div className="field w-half">
                            <label>Designation <span className="req">*</span></label>
                            <input name={`contacts[${idx}].designation`} value={contact.designation} onChange={formik.handleChange} className={hasError(`contacts[${idx}].designation`) ? "error" : ""} />
                          </div>
                        </div>
                        <div className="row">
                          <div className="field w-half">
                            <label>Phone <span className="req">*</span></label>
                            <input name={`contacts[${idx}].phone`} value={contact.phone} onChange={formik.handleChange} className={hasError(`contacts[${idx}].phone`) ? "error" : ""} />
                          </div>
                          <div className="field w-half">
                            <label>Email <span className="req">*</span></label>
                            <input name={`contacts[${idx}].email`} value={contact.email} onChange={formik.handleChange} className={hasError(`contacts[${idx}].email`) ? "error" : ""} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!formik.values.contacts || formik.values.contacts.length === 0) && <div className="empty-state">No contacts added.</div>}
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
                            </div>
                            <div className="field w-third">
                              <label>State <span className="req">*</span></label>
                              <input
                                name={`branches[${index}].state`}
                                value={branch.state}
                                onChange={formik.handleChange}
                                className={hasError(`branches[${index}].state`) ? "error" : ""}
                              />
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
                          </div>
                        </div>
                        <div className="row">
                          <div className="field">
                            <label>AD Code File</label>
                            <FileUpload
                              label={<div className="upload-zone" style={{ margin: 0 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                Upload
                              </div>}
                              onFilesUploaded={(files) => formik.setFieldValue(`banks[${index}].adCode_file`, files)}
                              bucketPath={`ad-code-${index}`}
                              customerName={formik.values.name_of_individual}
                              variant="unstyled"
                              containerStyles={{ marginTop: 0 }}
                            />
                            {bank.adCode_file && bank.adCode_file.length > 0 && (
                              <ImagePreview
                                images={Array.isArray(bank.adCode_file) ? bank.adCode_file : [bank.adCode_file]}
                                onDeleteImage={(idx) => {
                                  const updated = bank.adCode_file.filter((_, i) => i !== idx);
                                  formik.setFieldValue(`banks[${index}].adCode_file`, updated);
                                }}
                                allowUserDelete={true}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Finance Details */}
                  <div className="fields" style={{ paddingTop: "4px" }}>
                    <div className="finance-divider">
                      Finance Details (verify by account team)
                    </div>
                    <div className="row">
                      <div className="field w-quarter">
                        <label>Credit Period</label>
                        <input
                          type="text"
                          name="credit_period"
                          placeholder="e.g. 30 Days"
                          value={formik.values.credit_period}
                          onChange={formik.handleChange}
                        />
                      </div>
                      <div className="field w-quarter">
                        <label>Credit Limit Validity</label>
                        <input
                          type="date"
                          name="credit_limit_validity_date"
                          value={formik.values.credit_limit_validity_date}
                          onChange={formik.handleChange}
                        />
                      </div>
                      <div className="field w-quarter">
                        <label>O/S Limit</label>
                        <input
                          type="text"
                          name="outstanding_limit"
                          placeholder="Outstanding limit"
                          value={formik.values.outstanding_limit}
                          onChange={formik.handleChange}
                        />
                      </div>
                      <div className="field w-quarter">
                        <label>Quotation Given?</label>
                        <div className="inline-radios">
                          <label>
                            <input
                              type="radio"
                              name="quotation"
                              value="Yes"
                              checked={formik.values.quotation === "Yes"}
                              onChange={formik.handleChange}
                            />{" "}
                            Yes
                          </label>
                          <label>
                            <input
                              type="radio"
                              name="quotation"
                              value="No"
                              checked={formik.values.quotation === "No"}
                              onChange={formik.handleChange}
                            />{" "}
                            No
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="row">
                      <div className="field">
                        <label className="field-checkbox">
                          <input
                            type="checkbox"
                            checked={formik.values.financial_details_approved}
                            onChange={handleFinancialApprovalChange}
                            disabled={!canApproveFinance}
                          />
                          <span style={{ color: '#334155', fontWeight: 600 }}>
                            FINANCIAL DETAILS APPROVED (VERIFIED BY ACCOUNT TEAM)
                            {formik.values.financial_details_approved && (
                              <span style={{ marginLeft: '8px', color: '#0369a1', fontWeight: 500 }}>
                                ({formik.values.financial_details_approved_by})
                              </span>
                            )}
                          </span>
                          
                          {!canApproveFinance && !formik.values.financial_details_approved && (
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', marginLeft: '10px' }}>
                              (Only Accounts team or HOD/Admin can approve)
                            </span>
                          )}
                        </label>
                      </div>
                    </div>
                    <div className="row">
                      <div className="field">
                        <label className="field-checkbox">
                          <input
                            type="checkbox"
                            name="advance_payment"
                            checked={formik.values.advance_payment}
                            onChange={formik.handleChange}
                          />{" "}
                          <span>Advance Payment Required</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>


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
              <div className="kyc-doc-grid">
                {/* Render fields based on Category */}
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
                    {/* Trust Extra Fields - Keep as is using formik fields directly or wrap? 
                                  Note: Trust specific text inputs are kept as raw HTML in previous code.
                                        I should ensure they are not broken.
                                        Previously they were inside a div which was inside cat-docs-grid.
                                        If I change cat-docs-grid to kyc-doc-grid (CSS grid), the div might take one cell.
                                        Let's check the previous code for Trust.
                              */}
                    <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
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
            <div className="kyc-doc-grid">
              {renderUpload("other_documents", "other-documents", true)}
              {renderUpload("spcb_reg", "spcb-registration", true)}
              {renderUpload("kyc_verification_images", "kyc-verification-images", true)}
              {renderUpload("gst_returns", "gst-returns", true)}
            </div>
          </div>

          <div className="form-footer">
            <div className="footer-info">
              💡 <strong>Note:</strong> You are submitting a revision. Ensure all details are correct.
            </div>
            <div className="footer-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPreviewOpen(true)}
              >
                👁 Preview
              </button>
              {data?.approval === "Approved" ? (
                <>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ marginRight: '10px' }}
                    onClick={async () => {
                      const errors = await formik.validateForm();
                      if (Object.keys(errors).length > 0) {
                        formik.setTouched(setAllTouched(formik.values), true);
                        showError("Please fill in all required fields");
                      } else {
                        keepStatusRef.current = true;
                        formik.handleSubmit();
                      }
                    }}
                  >
                    💾 Update Details (Keep Approved)
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={async () => {
                      const errors = await formik.validateForm();
                      if (Object.keys(errors).length > 0) {
                        formik.setTouched(setAllTouched(formik.values), true);
                        showError("Please fill in all required fields");
                      } else {
                        keepStatusRef.current = false;
                        formik.handleSubmit();
                      }
                    }}
                  >
                    📤 Re-Submit for Verification
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-success"
                    onClick={async () => {
                      const errors = await formik.validateForm();
                      if (Object.keys(errors).length > 0) {
                        formik.setTouched(setAllTouched(formik.values), true);
                        showError("Please fill in all required fields");
                      } else {
                        keepStatusRef.current = false;
                        formik.handleSubmit();
                      }
                    }}
                  >
                    📤 Submit Revision
                  </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Preview open={previewOpen} handleClose={() => setPreviewOpen(false)} data={formik.values} />

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

export default React.memo(ReviseCustomerKyc);
