import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useFormik } from "formik";
import { validationSchema } from "../../schemas/customerKyc/customerKycSchema.js";
import "./customerKyc.css";
import CustomDialog from "./CustomDialog";
import useSupportingDocuments from "../../customHooks/useSupportingDocuments";
import FileUpload from "../gallery/FileUpload";
import ImagePreview from "../gallery/ImagePreview";
import { handleFileUpload } from "../../utils/awsFileUpload";
import Preview from "./Preview";
import { getCityAndStateByPinCode } from "../../utils/getCityAndStateByPinCode";
import BackButton from "./BackButton";
import { useSnackbar } from "../../contexts/SnackbarContext";
import { ViewButton, MultipleViewButtons, isValidFileUrl, openFileInNewTab } from "../../utils/documentHelpers";

function EditCompletedKyc() {
  const { _id } = useParams();
  const [data, setData] = useState();
  const [open, setOpen] = useState(false);
  // const [fileSnackbar, setFileSnackbar] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const { showSuccess, showError } = useSnackbar();

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
          gst_reg: "",
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

      authorised_signatories: "",
      authorisation_letter: "",
      iec_no: "",
      iec_copy: "",
      pan_no: "",
      pan_copy: "",
      banks: [
        {
          bankers_name: "",
          branch_address: "",
          account_no: "",
          ifsc: "",
          adCode: "",
          adCode_file: "",
        },
      ],
      other_documents: [],
      spcb_reg: "",
      kyc_verification_images: [],

      // individual
      individual_passport_img: "",
      individual_voter_card_img: "",
      individual_driving_license_img: "",
      individual_bank_statement_img: "",
      individual_ration_card_img: "",

      // partnership
      partnership_registration_certificate_img: "",
      partnership_deed_img: "",
      partnership_power_of_attorney_img: "",
      partnership_valid_document: "",
      partnership_aadhar_card_front_photo: "",
      partnership_aadhar_card_back_photo: "",
      partnership_telephone_bill: "",

      // company
      company_certificate_of_incorporation_img: "",
      company_memorandum_of_association_img: "",
      company_articles_of_association_img: "",
      company_power_of_attorney_img: "",
      company_telephone_bill_img: "",
      company_pan_allotment_letter_img: "",

      // trust
      trust_certificate_of_registration_img: "",
      trust_power_of_attorney_img: "",
      trust_officially_valid_document_img: "",
      trust_resolution_of_managing_body_img: "",
      trust_telephone_bill_img: "",
      trust_name_of_trustees: "",
      trust_name_of_founder: "",
      trust_address_of_founder: "",
      trust_telephone_of_founder: "",
      trust_email_of_founder: "",
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-customer-kyc`,
        { ...values, approval: "Approved" }
      );
      showSuccess(res.data.message);
      resetForm();
    },
  });

  useEffect(() => {
    if (data) {
      formik.setValues(data);
    }
    // eslint-disable-next-line
  }, [data]);

  const { getSupportingDocs, fileSnackbar, setFileSnackbar } =
    useSupportingDocuments(formik);

  const handleAddField = () => {
    formik.setValues({
      ...formik.values,
      factory_addresses: [
        ...formik.values.factory_addresses,
        {
          factory_address_line_1: "",
          factory_address_line_2: "",
          factory_address_city: "",
          factory_address_state: "",
          factory_address_pin_code: "",
          gst: "",
          gst_reg: "",
        },
      ],
    });
  };

  const handleAddBanks = () => {
    formik.setValues({
      ...formik.values,
      banks: [
        ...formik.values.banks,
        {
          bankers_name: "",
          branch_address: "",
          account_no: "",
          ifsc: "",
          adCode: "",
          adCode_file: "",
        },
      ],
    });
  };
  const handleGstRegUpload = (e, index) => {
    const file = e.target.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;

        formik.setFieldValue(
          `factory_addresses[${index}].gst_reg`,
          base64String
        );
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdCodeFileUpload = (e, index) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        formik.setFieldValue(`banks[${index}].adCode_file`, base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSameAsPermanentAddress = (event) => {
    if (event.target.checked) {
      formik.setValues({
        ...formik.values,
        principle_business_address_line_1:
          formik.values.permanent_address_line_1,
        principle_business_address_line_2:
          formik.values.permanent_address_line_2,
        principle_business_address_city: formik.values.permanent_address_city,
        principle_business_address_state: formik.values.permanent_address_state,
        principle_business_address_pin_code:
          formik.values.permanent_address_state,
        principle_business_telephone: formik.values.permanent_address_telephone,
        principle_address_email: formik.values.permanent_address_email,
      });
    } else {
      // If unchecked, you can clear the communication address fields or handle as needed
      formik.setValues({
        ...formik.values,
        principle_business_address_line_1: "",
        principle_business_address_line_2: "",
        principle_business_address_city: "",
        principle_business_address_state: "",
        principle_business_address_pin_code: "",
        principle_business_telephone: "",
        principle_address_email: "",
      });
    }
  };

  // Remove duplicate helper functions since we're importing from utils
  // isValidFileUrl and openFileInNewTab are now imported from documentHelpers

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

  return (
    <div className="premium-card" style={{ maxWidth: '1200px' }}>
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <BackButton />
          <h2 className="page-title">Edit Completed KYC</h2>
        </div>
        <p className="page-subtitle">Update verified customer application details</p>
      </div>

      <div className="card-body">
        <form onSubmit={formik.handleSubmit}>
          {/* Category Section */}
          <div className="form-section">
            <h4 className="section-title">Category Selection</h4>
            <div className="radio-group">
              {["Individual/ Proprietary Firm", "Partnership Firm", "Company", "Trust Foundations"].map((cat) => (
                <label key={cat} className="radio-label">
                  <input
                    type="radio"
                    name="category"
                    value={cat}
                    checked={formik.values.category === cat}
                    onChange={formik.handleChange}
                    className="radio-input"
                  />
                  {cat === "Individual/ Proprietary Firm" ? "Individual/Proprietary Firm" : cat === "Trust Foundations" ? "Trust/ Foundation" : cat}
                </label>
              ))}
            </div>
            {formik.touched.category && formik.errors.category && (
              <div className="error-text">⚠️ {formik.errors.category}</div>
            )}

            <div className="form-group" style={{ marginTop: "1.5rem" }}>
              <label className="form-label required">Name of Individual/Firm/Company</label>
              <input
                type="text"
                name="name_of_individual"
                className={`form-control ${formik.touched.name_of_individual && formik.errors.name_of_individual ? "error" : ""}`}
                value={formik.values.name_of_individual}
                onChange={formik.handleChange}
                placeholder="Enter full legal name"
              />
              {formik.touched.name_of_individual && formik.errors.name_of_individual && (
                <div className="error-text">⚠️ {formik.errors.name_of_individual}</div>
              )}
            </div>
          </div>

          {/* Status Section */}
          <div className="form-section">
            <h4 className="section-title">Status of Exporter/ Importer</h4>
            <div className="radio-group">
              {["Manufacturer", "Trader"].map((stat) => (
                <label key={stat} className="radio-label">
                  <input
                    type="radio"
                    name="status"
                    value={stat}
                    checked={formik.values.status === stat}
                    onChange={formik.handleChange}
                    className="radio-input"
                  />
                  {stat}
                </label>
              ))}
            </div>
            {formik.touched.status && formik.errors.status && (
              <div className="error-text">⚠️ {formik.errors.status}</div>
            )}
          </div>

          {/* Permanent Address */}
          <div className="form-section">
            <h4 className="section-title">Permanent or Registered Office Address</h4>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">Address Line 1</label>
                <input
                  type="text"
                  name="permanent_address_line_1"
                  className={`form-control ${formik.touched.permanent_address_line_1 && formik.errors.permanent_address_line_1 ? "error" : ""}`}
                  value={formik.values.permanent_address_line_1}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Address Line 2</label>
                <input
                  type="text"
                  name="permanent_address_line_2"
                  className="form-control"
                  value={formik.values.permanent_address_line_2}
                  onChange={formik.handleChange}
                />
              </div>
            </div>

            <div className="grid-3" style={{ marginTop: "1rem" }}>
              <div className="form-group">
                <label className="form-label required">City</label>
                <input
                  type="text"
                  name="permanent_address_city"
                  className="form-control"
                  value={formik.values.permanent_address_city}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label required">State</label>
                <input
                  type="text"
                  name="permanent_address_state"
                  className="form-control"
                  value={formik.values.permanent_address_state}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label required">PIN Code</label>
                <input
                  type="text"
                  name="permanent_address_pin_code"
                  className="form-control"
                  value={formik.values.permanent_address_pin_code}
                  onChange={formik.handleChange}
                />
              </div>
            </div>

            <div className="grid-2" style={{ marginTop: "1rem" }}>
              <div className="form-group">
                <label className="form-label required">Mobile</label>
                <input
                  type="text"
                  name="permanent_address_telephone"
                  className="form-control"
                  value={formik.values.permanent_address_telephone}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label required">Email</label>
                <input
                  type="email"
                  name="permanent_address_email"
                  className="form-control"
                  value={formik.values.permanent_address_email}
                  onChange={formik.handleChange}
                />
              </div>
            </div>
          </div>

          {/* Principal Address */}
          <div className="form-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h4 className="section-title" style={{ marginBottom: 0 }}>Principal Business Address</h4>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
                <input
                  type="checkbox"
                  name="sameAsPermanentAddress"
                  onChange={handleSameAsPermanentAddress}
                />
                Same as Permanent Address
              </label>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">Address Line 1</label>
                <input
                  type="text"
                  name="principle_business_address_line_1"
                  className="form-control"
                  value={formik.values.principle_business_address_line_1}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Address Line 2</label>
                <input
                  type="text"
                  name="principle_business_address_line_2"
                  className="form-control"
                  value={formik.values.principle_business_address_line_2}
                  onChange={formik.handleChange}
                />
              </div>
            </div>

            <div className="grid-3" style={{ marginTop: "1rem" }}>
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  name="principle_business_address_city"
                  className="form-control"
                  value={formik.values.principle_business_address_city}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  type="text"
                  name="principle_business_address_state"
                  className="form-control"
                  value={formik.values.principle_business_address_state}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">PIN Code</label>
                <input
                  type="text"
                  name="principle_business_address_pin_code"
                  className="form-control"
                  value={formik.values.principle_business_address_pin_code}
                  onChange={formik.handleChange}
                />
              </div>
            </div>

            <div className="grid-3" style={{ marginTop: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Mobile</label>
                <input
                  type="text"
                  name="principle_business_telephone"
                  className="form-control"
                  value={formik.values.principle_business_telephone}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="principle_address_email"
                  className="form-control"
                  value={formik.values.principle_address_email}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Website</label>
                <input
                  type="text"
                  name="principle_business_website"
                  className="form-control"
                  value={formik.values.principle_business_website}
                  onChange={formik.handleChange}
                />
              </div>
            </div>
          </div>

        <br />
        <br />
          {/* Factory Address */}
          <div className="form-section">
            <h4 className="section-title">Factory/Branch Address</h4>
            {formik.values.factory_addresses?.map((address, index) => (
              <div key={index} className="nested-card">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Address Line 1</label>
                    <input
                      type="text"
                      name={`factory_addresses[${index}].factory_address_line_1`}
                      className="form-control"
                      value={address.factory_address_line_1}
                      onChange={formik.handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address Line 2</label>
                    <input
                      type="text"
                      name={`factory_addresses[${index}].factory_address_line_2`}
                      className="form-control"
                      value={address.factory_address_line_2}
                      onChange={formik.handleChange}
                    />
                  </div>
                </div>
                <div className="grid-3" style={{ marginTop: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      name={`factory_addresses[${index}].factory_address_city`}
                      className="form-control"
                      value={address.factory_address_city}
                      onChange={formik.handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      name={`factory_addresses[${index}].factory_address_state`}
                      className="form-control"
                      value={address.factory_address_state}
                      onChange={formik.handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PIN Code</label>
                    <input
                      type="text"
                      name={`factory_addresses[${index}].factory_address_pin_code`}
                      className="form-control"
                      value={address.factory_address_pin_code}
                      onChange={formik.handleChange}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: "1rem" }}>
                  <label className="form-label">GST Number</label>
                  <input
                    type="text"
                    name={`factory_addresses[${index}].gst`}
                    className="form-control"
                    value={address.gst}
                    onChange={formik.handleChange}
                  />
                </div>
                <div style={{ marginTop: "1rem" }}>
                  <label className="form-label">GST Registration Copy</label>
                  <FileUpload
                    label="Upload GST Copy"
                    onFilesUploaded={(uploadedFiles) => {
                      formik.setFieldValue(`factory_addresses[${index}].gst_reg`, uploadedFiles);
                    }}
                    bucketPath="gst-registration"
                    multiple={false}
                    customerName={formik.values.name_of_individual}
                  />
                  {address.gst_reg && (
                    <ImagePreview 
                      images={address.gst_reg} 
                      onDeleteImage={() => formik.setFieldValue(`factory_addresses[${index}].gst_reg`, "")}
                      showDeleteForAdmin={true}
                    />
                  )}
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={handleAddField}>
              + Add Factory/Branch Address
            </button>
          </div>

          {/* Authorised Signatories */}
          <div className="form-section">
            <h4 className="section-title">Authorised Signatory Information</h4>
            <div className="grid-2">
              <div>
                <label className="form-label">Signatory Photos (self-attested)</label>
                <FileUpload
                  label="Upload Photos"
                  onFilesUploaded={(files) => formik.setFieldValue("authorised_signatories", files)}
                  bucketPath="authorised-signatories"
                  multiple={true}
                  customerName={formik.values.name_of_individual}
                />
                {formik.values.authorised_signatories && (
                  <ImagePreview 
                    images={formik.values.authorised_signatories} 
                    onDeleteImage={(idx) => {
                      const current = Array.isArray(formik.values.authorised_signatories) ? formik.values.authorised_signatories : [];
                      const updated = current.filter((_, i) => i !== idx);
                      formik.setFieldValue("authorised_signatories", updated);
                    }}
                    showDeleteForAdmin={true}
                  />
                )}
              </div>
              <div>
                <label className="form-label">Authorisation Letter</label>
                <FileUpload
                  label="Upload Letter"
                  onFilesUploaded={(files) => formik.setFieldValue("authorisation_letter", files)}
                  bucketPath="authorisation-letter"
                  multiple={true}
                  customerName={formik.values.name_of_individual}
                />
                {formik.values.authorisation_letter && (
                  <ImagePreview 
                    images={formik.values.authorisation_letter} 
                    onDeleteImage={(idx) => {
                      const current = Array.isArray(formik.values.authorisation_letter) ? formik.values.authorisation_letter : [];
                      const updated = current.filter((_, i) => i !== idx);
                      formik.setFieldValue("authorisation_letter", updated);
                    }}
                    showDeleteForAdmin={true}
                  />
                )}
              </div>
            </div>
          </div>

          {/* IEC & PAN */}
          <div className="form-section">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">IEC No</label>
                <input
                  type="text"
                  name="iec_no"
                  className="form-control"
                  value={formik.values.iec_no}
                  onChange={formik.handleChange}
                />
                <div style={{ marginTop: '0.5rem' }}>
                    <FileUpload
                    label="Upload IEC Copy"
                    onFilesUploaded={(files) => formik.setFieldValue("iec_copy", files)}
                    bucketPath="iec-copy"
                    multiple={false}
                    customerName={formik.values.name_of_individual}
                    />
                    {formik.values.iec_copy && (
                    <ImagePreview 
                        images={formik.values.iec_copy} 
                        onDeleteImage={() => formik.setFieldValue("iec_copy", "")}
                        showDeleteForAdmin={true}
                    />
                    )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label required">PAN No</label>
                <input
                  type="text"
                  name="pan_no"
                  className="form-control"
                  value={formik.values.pan_no}
                  onChange={formik.handleChange}
                />
                <div style={{ marginTop: '0.5rem' }}>
                    <FileUpload
                    label="Upload PAN Copy"
                    onFilesUploaded={(files) => formik.setFieldValue("pan_copy", files)}
                    bucketPath="pan-copy"
                    multiple={false}
                    customerName={formik.values.name_of_individual}
                    />
                    {formik.values.pan_copy && (
                    <ImagePreview 
                        images={formik.values.pan_copy} 
                        onDeleteImage={() => formik.setFieldValue("pan_copy", "")}
                        showDeleteForAdmin={true}
                    />
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* Banking Information */}
          <div className="form-section">
            <h4 className="section-title">Banking Information</h4>
            {formik.values.banks?.map((bank, index) => (
              <div key={index} className="nested-card">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Banker's Name</label>
                    <input
                      type="text"
                      name={`banks[${index}].bankers_name`}
                      className="form-control"
                      value={bank.bankers_name}
                      onChange={formik.handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Branch Address</label>
                    <input
                      type="text"
                      name={`banks[${index}].branch_address`}
                      className="form-control"
                      value={bank.branch_address}
                      onChange={formik.handleChange}
                    />
                  </div>
                </div>
                <div className="grid-3" style={{ marginTop: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Account No</label>
                    <input
                      type="text"
                      name={`banks[${index}].account_no`}
                      className="form-control"
                      value={bank.account_no}
                      onChange={formik.handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">IFSC Code</label>
                    <input
                      type="text"
                      name={`banks[${index}].ifsc`}
                      className="form-control"
                      value={bank.ifsc}
                      onChange={formik.handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">AD Code</label>
                    <input
                      type="text"
                      name={`banks[${index}].adCode`}
                      className="form-control"
                      value={bank.adCode}
                      onChange={formik.handleChange}
                    />
                  </div>
                </div>
                <div style={{ marginTop: "1rem" }}>
                  <label className="form-label">AD Code File</label>
                  <FileUpload
                    label="Upload AD Code File"
                    onFilesUploaded={(files) => formik.setFieldValue(`banks[${index}].adCode_file`, files)}
                    bucketPath="ad-code-files"
                    multiple={false}
                    customerName={formik.values.name_of_individual}
                  />
                  {bank.adCode_file && (
                    <ImagePreview 
                      images={bank.adCode_file} 
                      onDeleteImage={() => formik.setFieldValue(`banks[${index}].adCode_file`, "")}
                      showDeleteForAdmin={true}
                    />
                  )}
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={handleAddBanks}>
              + Add Banker Details
            </button>
          </div>

          <div className="form-section">
            {getSupportingDocs()}
          </div>

          {/* Other Documents */}
          <div className="form-section">
            <h4 className="section-title">Additional Documents</h4>
            <div className="grid-2">
              <div>
                <label className="form-label">Other Documents</label>
                <FileUpload
                  label="Upload Documents"
                  onFilesUploaded={(files) => formik.setFieldValue("other_documents", files)}
                  bucketPath="other-documents"
                  multiple={true}
                  customerName={formik.values.name_of_individual}
                />
                {formik.values.other_documents && (
                  <ImagePreview 
                    images={formik.values.other_documents} 
                    onDeleteImage={(idx) => {
                      const current = Array.isArray(formik.values.other_documents) ? formik.values.other_documents : [];
                      const updated = current.filter((_, i) => i !== idx);
                      formik.setFieldValue("other_documents", updated);
                    }}
                    showDeleteForAdmin={true}
                  />
                )}
              </div>
              <div>
                <label className="form-label">SPCB Registration</label>
                <FileUpload
                  label="Upload SPCB Copy"
                  onFilesUploaded={(files) => formik.setFieldValue("spcb_reg", files)}
                  bucketPath="spcb-registration"
                  multiple={false}
                  customerName={formik.values.name_of_individual}
                />
                {formik.values.spcb_reg && (
                  <ImagePreview 
                    images={formik.values.spcb_reg} 
                    onDeleteImage={() => formik.setFieldValue("spcb_reg", "")}
                    showDeleteForAdmin={true}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={handleOpen}>
              Preview Changes
            </button>
            <button type="submit" className="btn btn-primary" disabled={formik.isSubmitting}>
              {formik.isSubmitting ? "Updating..." : "Update KYC Data"}
            </button>
          </div>

          <CustomDialog
            isOpen={fileSnackbar}
            onClose={() => setFileSnackbar(false)}
            title="Update Notification"
            severity="info"
          >
            KYC details have been updated successfully.
          </CustomDialog>

          <Preview open={open} handleClose={handleClose} data={formik.values} />
        </form>
      </div>
    </div>
  );
}

export default EditCompletedKyc;
