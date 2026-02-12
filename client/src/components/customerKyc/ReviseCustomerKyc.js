import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useFormik } from "formik";
import { validationSchema } from "../../schemas/customerKyc/customerKycSchema.js";
import useSupportingDocuments from "../../customHooks/useSupportingDocuments";
import FileUpload from "../gallery/FileUpload";
import ImagePreview from "../gallery/ImagePreview";
import Preview from "./Preview";
import BackButton from "./BackButton";
import "./customerKyc.css";
import { useSnackbar } from "../../contexts/SnackbarContext";
import { UserContext } from "../../contexts/UserContext";
import CustomDialog from "./CustomDialog";
import { getCityAndStateByPinCode } from "../../utils/getCityAndStateByPinCode";

function ReviseCustomerKyc() {
  const { _id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { showSuccess, showError } = useSnackbar();
  const [data, setData] = useState(null);

  // Dialog State
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "",
    content: null,
    severity: "info",
    actions: null
  });

  const handleCloseDialog = () => setDialogState(prev => ({ ...prev, isOpen: false }));

  // Formik Setup
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
      branches: [],
    },
    validationSchema: validationSchema,
    enableReinitialize: true, // Important for loading data
    onSubmit: async (values, { resetForm }) => {
      try {
        // We use PATCH for updates
        const res = await axios.patch(
          `${process.env.REACT_APP_API_STRING}/update-customer-kyc/${_id}`,
          { ...values, approval: "Pending" } // Reset approval status on revision? Usually yes.
        );

        showSuccess(res.data.message || "Application updated successfully.");
        resetForm();
        navigate("/customer-kyc");
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


  return (
    <div className="premium-card">
      <div className="card-header">
        <BackButton />
        <div>
          <h2 className="page-title" style={{ fontSize: '1.5rem', margin: 0 }}>Revise Application</h2>
          <p className="page-subtitle" style={{ margin: 0 }}>Update details and resubmit for approval</p>
        </div>
      </div>

      <div className="card-body">
        <form onSubmit={formik.handleSubmit}>

          {/* Category Section */}
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label required" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
              Category
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              {["Individual/ Proprietary Firm", "Partnership Firm", "Company", "Trust Foundations"].map((option) => (
                <label key={option} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1rem',
                  background: formik.values.category === option ? 'var(--primary-50)' : 'var(--surface-white)',
                  border: `1px solid ${formik.values.category === option ? 'var(--primary-500)' : 'var(--slate-300)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="radio"
                    name="category"
                    value={option}
                    checked={formik.values.category === option}
                    onChange={formik.handleChange}
                    style={{ marginRight: '0.75rem', accentColor: 'var(--primary-500)', width: '1.2em', height: '1.2em' }}
                  />
                  <span style={{ fontWeight: 500, color: 'var(--slate-700)' }}>{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Individual Info */}
          <div className="form-section">
            <h4 className="section-title" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary-700)' }}>
              Basic Information
            </h4>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required" htmlFor="name_of_individual">Name of Individual/Firm/Company</label>
                <input
                  id="name_of_individual"
                  name="name_of_individual"
                  className={`form-control ${formik.touched.name_of_individual && formik.errors.name_of_individual ? 'error' : ''}`}
                  value={formik.values.name_of_individual}
                  onChange={formik.handleChange}
                />
                {formik.touched.name_of_individual && formik.errors.name_of_individual && (
                  <div className="error-text">⚠️ {formik.errors.name_of_individual}</div>
                )}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label required">Status of Exporter/Importer</label>
              <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
                {['Manufacturer', 'Trader'].map((type) => (
                  <label key={type} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
                    <input
                      type="radio"
                      name="status"
                      value={type}
                      checked={formik.values.status === type}
                      onChange={formik.handleChange}
                      style={{ accentColor: 'var(--primary-500)', width: '1.2em', height: '1.2em' }}
                    />
                    <span style={{ color: 'var(--slate-700)' }}>{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Permanent Address */}
          <div className="form-section">
            <h4 className="section-title" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary-700)' }}>
              Permanent Address
            </h4>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required" htmlFor="permanent_address_line_1">Address Line 1</label>
                <input
                  id="permanent_address_line_1"
                  name="permanent_address_line_1"
                  className={`form-control ${formik.touched.permanent_address_line_1 && formik.errors.permanent_address_line_1 ? 'error' : ''}`}
                  value={formik.values.permanent_address_line_1}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="permanent_address_line_2">Address Line 2</label>
                <input
                  id="permanent_address_line_2"
                  name="permanent_address_line_2"
                  className="form-control"
                  value={formik.values.permanent_address_line_2}
                  onChange={formik.handleChange}
                />
              </div>
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label required" htmlFor="permanent_address_pin_code">PIN Code</label>
                <input
                  id="permanent_address_pin_code"
                  name="permanent_address_pin_code"
                  className="form-control"
                  value={formik.values.permanent_address_pin_code}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label required" htmlFor="permanent_address_city">City</label>
                <input
                  id="permanent_address_city"
                  name="permanent_address_city"
                  className="form-control"
                  value={formik.values.permanent_address_city}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label required" htmlFor="permanent_address_state">State</label>
                <input
                  id="permanent_address_state"
                  name="permanent_address_state"
                  className="form-control"
                  value={formik.values.permanent_address_state}
                  onChange={formik.handleChange}
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required" htmlFor="permanent_address_telephone">Mobile</label>
                <input
                  id="permanent_address_telephone"
                  name="permanent_address_telephone"
                  className="form-control"
                  value={formik.values.permanent_address_telephone}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label required" htmlFor="permanent_address_email">Email</label>
                <input
                  id="permanent_address_email"
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
            <h4 className="section-title" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary-700)' }}>
              Principal Business Address
            </h4>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formik.values.sameAsPermanentAddress}
                  onChange={handleSameAsPermanentAddress}
                  style={{ width: '1.1em', height: '1.1em', accentColor: 'var(--primary-500)' }}
                />
                <span style={{ color: 'var(--slate-700)', fontWeight: 500 }}>Same as Permanent Address</span>
              </label>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required" htmlFor="principle_business_address_line_1">Address Line 1</label>
                <input
                  id="principle_business_address_line_1"
                  name="principle_business_address_line_1"
                  className="form-control"
                  value={formik.values.principle_business_address_line_1}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="principle_business_address_line_2">Address Line 2</label>
                <input
                  id="principle_business_address_line_2"
                  name="principle_business_address_line_2"
                  className="form-control"
                  value={formik.values.principle_business_address_line_2}
                  onChange={formik.handleChange}
                />
              </div>
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label required" htmlFor="principle_business_address_pin_code">PIN Code</label>
                <input
                  id="principle_business_address_pin_code"
                  name="principle_business_address_pin_code"
                  className="form-control"
                  value={formik.values.principle_business_address_pin_code}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label required" htmlFor="principle_business_address_city">City</label>
                <input
                  id="principle_business_address_city"
                  name="principle_business_address_city"
                  className="form-control"
                  value={formik.values.principle_business_address_city}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label required" htmlFor="principle_business_address_state">State</label>
                <input
                  id="principle_business_address_state"
                  name="principle_business_address_state"
                  className="form-control"
                  value={formik.values.principle_business_address_state}
                  onChange={formik.handleChange}
                />
              </div>
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label required" htmlFor="principle_business_telephone">Mobile</label>
                <input
                  id="principle_business_telephone"
                  name="principle_business_telephone"
                  className="form-control"
                  value={formik.values.principle_business_telephone}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label required" htmlFor="principle_address_email">Email</label>
                <input
                  id="principle_address_email"
                  name="principle_address_email"
                  className="form-control"
                  value={formik.values.principle_address_email}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="principle_business_website">Website</label>
                <input
                  id="principle_business_website"
                  name="principle_business_website"
                  className="form-control"
                  value={formik.values.principle_business_website}
                  onChange={formik.handleChange}
                />
              </div>
            </div>
          </div>

          {/* Branch Information */}
          <div className="form-section">
            <h4 className="section-title" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary-700)' }}>
              Branch Information
            </h4>
            <div className="kyc-branch-list">
              {formik.values.branches?.map((branch, index) => (
                <div key={index} style={{ marginBottom: '1.5rem', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', position: 'relative', background: 'var(--white)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h5 style={{ margin: 0, color: 'var(--slate-700)', fontSize: '1rem' }}>Branch {index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => handleRemoveBranch(index)}
                      className="btn-text-error"
                      style={{ padding: '4px 8px' }}
                    >
                      ✕ Remove Branch
                    </button>
                  </div>

                  <div className="grid-3">
                    <div className="form-group">
                      <label className="form-label">Branch Name</label>
                      <input
                        name={`branches[${index}].branch_name`}
                        className="form-control"
                        value={branch.branch_name}
                        onChange={formik.handleChange}
                        placeholder="e.g. Mumbai Regional Office"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Branch Code</label>
                      <input
                        name={`branches[${index}].branch_code`}
                        className="form-control"
                        value={branch.branch_code}
                        onChange={formik.handleChange}
                        placeholder="e.g. MUM-01"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">GST Number</label>
                      <input
                        name={`branches[${index}].gst_no`}
                        className="form-control"
                        value={branch.gst_no}
                        onChange={formik.handleChange}
                        placeholder="15-digit GSTIN"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label className="form-label">Address</label>
                    <input
                      name={`branches[${index}].address`}
                      className="form-control"
                      value={branch.address}
                      onChange={formik.handleChange}
                      placeholder="Street address, building, floor etc."
                    />
                  </div>

                  <div className="grid-3" style={{ marginTop: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input
                        name={`branches[${index}].city`}
                        className="form-control"
                        value={branch.city}
                        onChange={formik.handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">State</label>
                      <input
                        name={`branches[${index}].state`}
                        className="form-control"
                        value={branch.state}
                        onChange={formik.handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">PIN Code</label>
                      <input
                        name={`branches[${index}].postal_code`}
                        className="form-control"
                        value={branch.postal_code}
                        onChange={formik.handleChange}
                      />
                    </div>
                  </div>

                  <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Mobile</label>
                      <input
                        name={`branches[${index}].mobile`}
                        className="form-control"
                        value={branch.mobile}
                        onChange={formik.handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input
                        name={`branches[${index}].email`}
                        className="form-control"
                        value={branch.email}
                        onChange={formik.handleChange}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAddBranch}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              + Add Branch Detail
            </button>
          </div>

          {/* Factory Addresses */}
          <div className="form-section">
            <h4 className="section-title" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary-700)' }}>
              Factory/Branch Address
            </h4>
            {formik.values.factory_addresses?.map((address, index) => (
              <div key={index} style={{ marginBottom: '1.5rem', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', position: 'relative', background: 'var(--slate-50)' }}>
                {formik.values.factory_addresses.length > 1 && (
                  <button type="button" onClick={() => handleRemoveField(index)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--error)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer' }}>
                    ✕ Remove
                  </button>
                )}
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label required">Factory Address Line 1</label>
                    <input
                      name={`factory_addresses[${index}].factory_address_line_1`}
                      className="form-control"
                      value={address.factory_address_line_1}
                      onChange={formik.handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Factory Address Line 2</label>
                    <input
                      name={`factory_addresses[${index}].factory_address_line_2`}
                      className="form-control"
                      value={address.factory_address_line_2}
                      onChange={formik.handleChange}
                    />
                  </div>
                </div>
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label required">PIN Code</label>
                    <input
                      name={`factory_addresses[${index}].factory_address_pin_code`}
                      className="form-control"
                      value={address.factory_address_pin_code}
                      onChange={formik.handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">City</label>
                    <input
                      name={`factory_addresses[${index}].factory_address_city`}
                      className="form-control"
                      value={address.factory_address_city}
                      onChange={formik.handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">State</label>
                    <input
                      name={`factory_addresses[${index}].factory_address_state`}
                      className="form-control"
                      value={address.factory_address_state}
                      onChange={formik.handleChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label required">GST</label>
                  <input
                    name={`factory_addresses[${index}].gst`}
                    className="form-control"
                    value={address.gst}
                    onChange={formik.handleChange}
                  />
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <label className="form-label">GST Registration</label>
                  <FileUpload
                    label="Upload GST Registration"
                    onFilesUploaded={(files) => {
                      const current = address.gst_reg || [];
                      formik.setFieldValue(`factory_addresses[${index}].gst_reg`, [...current, ...files]);
                    }}
                    bucketPath={`gst-registration-${index}`}
                    multiple={true}
                    acceptedFileTypes={['.pdf', '.jpg', '.jpeg', '.png']}
                    customerName={formik.values.name_of_individual}
                  />
                  {address.gst_reg && <ImagePreview images={address.gst_reg} onDeleteImage={(i) => {
                    const updated = address.gst_reg.filter((_, idx) => idx !== i);
                    formik.setFieldValue(`factory_addresses[${index}].gst_reg`, updated);
                  }} />}
                </div>
              </div>
            ))}
            <button type="button" onClick={handleAddField} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>+ Add Factory/Branch Address</button>
          </div>

          {/* Authorised Signatories */}
          <div className="form-section">
            <h4 className="section-title" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary-700)' }}>
              Authorised Signatory
            </h4>
            <div className="grid-2">
              <div>
                <label className="form-label">Signatory Photos</label>
                <FileUpload
                  label="Upload Photos"
                  onFilesUploaded={(files) => formik.setFieldValue("authorised_signatories", [...(formik.values.authorised_signatories || []), ...files])}
                  bucketPath="authorised-signatories"
                  multiple={true}
                  customerName={formik.values.name_of_individual}
                  acceptedFileTypes={['.jpg', '.jpeg', '.png', '.pdf']}
                />
                <ImagePreview images={formik.values.authorised_signatories} onDeleteImage={(i) => {
                  const updated = formik.values.authorised_signatories.filter((_, idx) => idx !== i);
                  formik.setFieldValue("authorised_signatories", updated);
                }} />
              </div>
              <div>
                <label className="form-label">Authorisation Letter</label>
                <FileUpload
                  label="Upload Letter"
                  onFilesUploaded={(files) => formik.setFieldValue("authorisation_letter", [...(formik.values.authorisation_letter || []), ...files])}
                  bucketPath="authorisation_letter"
                  multiple={true}
                  customerName={formik.values.name_of_individual}
                  acceptedFileTypes={['.jpg', '.jpeg', '.png', '.pdf']}
                />
                <ImagePreview images={formik.values.authorisation_letter} onDeleteImage={(i) => {
                  const updated = formik.values.authorisation_letter.filter((_, idx) => idx !== i);
                  formik.setFieldValue("authorisation_letter", updated);
                }} />
              </div>
            </div>
          </div>

          {/* IEC & PAN */}
          <div className="form-section">
            <h4 className="section-title" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary-700)' }}>
              Registration Details
            </h4>
            <div className="grid-2">
              <div>
                <div className="form-group">
                  <label className="form-label required">IEC No</label>
                  <input name="iec_no" className="form-control" value={formik.values.iec_no} onChange={formik.handleChange} />
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <label className="form-label">IEC Copy</label>
                  <FileUpload
                    label="Upload IEC"
                    onFilesUploaded={(files) => formik.setFieldValue("iec_copy", [...(formik.values.iec_copy || []), ...files])}
                    bucketPath="iec_copy"
                    multiple={true}
                    customerName={formik.values.name_of_individual}
                    acceptedFileTypes={['.pdf', '.jpg', '.jpeg', '.png']}
                  />
                  <ImagePreview images={formik.values.iec_copy} onDeleteImage={(i) => {
                    const updated = formik.values.iec_copy.filter((_, idx) => idx !== i);
                    formik.setFieldValue("iec_copy", updated);
                  }} />
                </div>
              </div>
              <div>
                <div className="form-group">
                  <label className="form-label required">PAN No</label>
                  <input name="pan_no" className="form-control" value={formik.values.pan_no} onChange={formik.handleChange} />
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <label className="form-label">PAN Copy</label>
                  <FileUpload
                    label="Upload PAN"
                    onFilesUploaded={(files) => formik.setFieldValue("pan_copy", [...(formik.values.pan_copy || []), ...files])}
                    bucketPath="pan_copy"
                    multiple={true}
                    customerName={formik.values.name_of_individual}
                    acceptedFileTypes={['.pdf', '.jpg', '.jpeg', '.png']}
                  />
                  <ImagePreview images={formik.values.pan_copy} onDeleteImage={(i) => {
                    const updated = formik.values.pan_copy.filter((_, idx) => idx !== i);
                    formik.setFieldValue("pan_copy", updated);
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* Banks */}
          <div className="form-section">
            <h4 className="section-title" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary-700)' }}>
              Banking Information
            </h4>
            {formik.values.banks?.map((bank, index) => (
              <div key={index} style={{ marginBottom: '1.5rem', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', position: 'relative', background: 'var(--slate-50)' }}>
                {formik.values.banks.length > 1 && (
                  <button type="button" onClick={() => handleRemoveBank(index)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--error)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer' }}>
                    ✕ Remove
                  </button>
                )}
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label required">Banker's Name</label>
                    <input name={`banks[${index}].bankers_name`} className="form-control" value={bank.bankers_name} onChange={formik.handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Branch Address</label>
                    <input name={`banks[${index}].branch_address`} className="form-control" value={bank.branch_address} onChange={formik.handleChange} />
                  </div>
                </div>
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label required">Account No</label>
                    <input name={`banks[${index}].account_no`} className="form-control" value={bank.account_no} onChange={formik.handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">IFSC</label>
                    <input name={`banks[${index}].ifsc`} className="form-control" value={bank.ifsc} onChange={formik.handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">AD Code</label>
                    <input name={`banks[${index}].adCode`} className="form-control" value={bank.adCode} onChange={formik.handleChange} />
                  </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <label className="form-label">AD Code File</label>
                  <FileUpload
                    label="Upload AD Code"
                    onFilesUploaded={(files) => {
                      const current = bank.adCode_file || [];
                      const updated = [...current, ...files];
                      formik.setFieldValue(`banks[${index}].adCode_file`, updated);
                    }}
                    bucketPath={`adCode_file_${index}`}
                    multiple={true}
                    acceptedFileTypes={['.pdf']}
                    customerName={formik.values.name_of_individual}
                  />
                  <ImagePreview images={bank.adCode_file} onDeleteImage={(i) => {
                    const updated = bank.adCode_file.filter((_, idx) => idx !== i);
                    formik.setFieldValue(`banks[${index}].adCode_file`, updated);
                  }} />
                </div>
              </div>
            ))}
            <button type="button" onClick={handleAddBanks} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>+ Add AD Code</button>
          </div>

          {/* Supporting Documents (Hook) */}
          {getSupportingDocs()}

          {/* Other Documents */}
          <div className="form-section">
            <h4 className="section-title" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary-700)' }}>
              Additional Documents
            </h4>
            <div className="grid-2">
              <div>
                <label className="form-label">Other Documents</label>
                <FileUpload
                  label="Upload Others"
                  onFilesUploaded={(files) => formik.setFieldValue("other_documents", [...(formik.values.other_documents || []), ...files])}
                  bucketPath="other_documents"
                  multiple={true}
                  customerName={formik.values.name_of_individual}
                  acceptedFileTypes={['.pdf', 'jpg', 'png', 'doc', 'docx', 'zip', 'xls', 'xlsx']}
                />
                <ImagePreview images={formik.values.other_documents} onDeleteImage={(i) => {
                  const updated = formik.values.other_documents.filter((_, idx) => idx !== i);
                  formik.setFieldValue("other_documents", updated);
                }} />
              </div>
              <div>
                <label className="form-label">SPCB Registration</label>
                <FileUpload
                  label="Upload SPCB"
                  onFilesUploaded={(files) => formik.setFieldValue("spcb_reg", [...(formik.values.spcb_reg || []), ...files])}
                  bucketPath="spcb_reg"
                  multiple={true}
                  customerName={formik.values.name_of_individual}
                  acceptedFileTypes={['.pdf', 'jpg', 'png']}
                />
                <ImagePreview images={formik.values.spcb_reg} onDeleteImage={(i) => {
                  const updated = formik.values.spcb_reg.filter((_, idx) => idx !== i);
                  formik.setFieldValue("spcb_reg", updated);
                }} />
              </div>
              <div>
                <label className="form-label">KYC Verification Images</label>
                <FileUpload
                  label="Upload Images"
                  onFilesUploaded={(files) => formik.setFieldValue("kyc_verification_images", [...(formik.values.kyc_verification_images || []), ...files])}
                  bucketPath="kyc_verification_images"
                  multiple={true}
                  customerName={formik.values.name_of_individual}
                  acceptedFileTypes={['.jpg', 'png', 'pdf']}
                />
                <ImagePreview images={formik.values.kyc_verification_images} onDeleteImage={(i) => {
                  const updated = formik.values.kyc_verification_images.filter((_, idx) => idx !== i);
                  formik.setFieldValue("kyc_verification_images", updated);
                }} />
              </div>
              <div>
                <label className="form-label">GST Returns</label>
                <FileUpload
                  label="Upload GST Returns"
                  onFilesUploaded={(files) => formik.setFieldValue("gst_returns", [...(formik.values.gst_returns || []), ...files])}
                  bucketPath="gst_returns"
                  multiple={true}
                  customerName={formik.values.name_of_individual}
                  acceptedFileTypes={['.pdf', 'jpg', 'png', 'xls', 'xlsx', 'doc', 'docx', 'zip']}
                />
                <ImagePreview images={formik.values.gst_returns} onDeleteImage={(i) => {
                  const updated = formik.values.gst_returns.filter((_, idx) => idx !== i);
                  formik.setFieldValue("gst_returns", updated);
                }} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--slate-200)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDialogState({
                isOpen: true,
                title: "Preview Application",
                content: <Preview data={formik.values} />,
                severity: "info"
              })}
            >
              Preview
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              title="Update Application"
            >
              Update & Submit
            </button>
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

        </form>
      </div>
    </div>
  );
}

export default React.memo(ReviseCustomerKyc);
