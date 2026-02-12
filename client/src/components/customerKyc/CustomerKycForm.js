import React, { useState, useEffect, useContext } from "react";
import { useFormik } from "formik";
// Removed MUI imports to stick to the "no material UI" rule strictly where possible
// We will use standard HTML elements with our premium CSS classes
import axios from "axios";
// import { Row, Col } from "react-bootstrap"; // We will use CSS Grid
import useSupportingDocuments from "../../customHooks/useSupportingDocuments";
// import Snackbar from "@mui/material/Snackbar"; // Replaced by CustomDialog
// import Alert from "@mui/material/Alert";
import FileUpload from "../gallery/FileUpload";
import ImagePreview from "../gallery/ImagePreview";
import { handleFileUpload } from "../../utils/awsFileUpload";
// import Checkbox from "@mui/material/Checkbox";
import Preview from "./Preview";
import { getCityAndStateByPinCode } from "../../utils/getCityAndStateByPinCode";
import BackButton from "./BackButton";
import "./customerKyc.css";
import { useSnackbar } from "../../contexts/SnackbarContext";
import { UserContext } from "../../contexts/UserContext";
import { validationSchema } from "../../schemas/customerKyc/customerKycSchema";
import {
  draftValidationSchema,
  hasMinimumDraftData,
} from "../../schemas/customerKyc/draftValidationSchema";
import CustomDialog from "./CustomDialog"; // New Dialog Component

function CustomerKycForm() {
  // Get current user context for permission checks
  const { user } = useContext(UserContext);

  const [submitType, setSubmitType] = useState("");

  // Custom Dialog State
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "",
    content: null,
    severity: "info", // info, success, warning, error
    actions: null,
  });

  const [submissionAttempted, setSubmissionAttempted] = useState(false);
  // Replaced validationSnackbar with dialogState
  // const [validationSnackbar, setValidationSnackbar] = useState({...});

  const [showClearConfirmation, setShowClearConfirmation] = useState(false);

  const { showError, showSuccess, showWarning } = useSnackbar();

  const handleCloseDialog = () =>
    setDialogState((prev) => ({ ...prev, isOpen: false }));

  // Dialog auto-dismiss or manual? Let's keep manual for better UX on errors.
  // Removed old Snackbar auto-dismiss effect.

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
    // Use a dynamic validation function that checks submit type
    validate: (values) => {
      // Choose schema based on submit type
      const schema =
        submitType === "save_draft" ? draftValidationSchema : validationSchema;

      try {
        // Synchronously validate using Yup
        schema.validateSync(values, { abortEarly: false });
        return {}; // No errors
      } catch (err) {
        // Convert Yup ValidationError to formik errors format
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
    onSubmit: async (
      values,
      { resetForm, setErrors, setTouched, validateForm }
    ) => {
      try {
        // Validate form based on submit type
        const errors = await validateForm();

        // Check if form has validation errors
        if (Object.keys(errors).length > 0) {
          console.log("Validation errors:", errors);
          console.log("Submit type:", submitType);

          if (submitType === "save_draft") {
            // For draft, only show errors if basic requirements aren't met
            if (errors.iec_no || errors.name_of_individual) {
              setDialogState({
                isOpen: true,
                title: "Draft Requirement Missing",
                severity: "warning",
                content: (
                  <div>
                    <p>
                      Please fill <strong>IEC number</strong> and{" "}
                      <strong>Name</strong> to save as draft.
                    </p>
                    <p>
                      These are the only fields required to come back later.
                    </p>
                  </div>
                ),
              });

              // Touch only the required draft fields
              setTouched({
                iec_no: true,
                name_of_individual: true,
              });

              return;
            }
            // If only IEC and name are filled, proceed with draft save
          } else {
            // For final submission, enforce full validation
            setTouched({
              category: true,
              name_of_individual: true,
              status: true,
              permanent_address_line_1: true,
              permanent_address_city: true,
              permanent_address_state: true,
              permanent_address_pin_code: true,
              permanent_address_telephone: true,
              permanent_address_email: true,
              principle_business_address_line_1: true,
              principle_business_address_city: true,
              principle_business_address_state: true,
              principle_business_address_pin_code: true,
              principle_business_telephone: true,
              principle_address_email: true,
              iec_no: true,
              pan_no: true,
              factory_addresses: values.factory_addresses?.map(() => ({
                factory_address_line_1: true,
                factory_address_city: true,
                factory_address_state: true,
                factory_address_pin_code: true,
                gst: true,
              })),
                banks: values.banks?.map(() => ({
                bankers_name: true,
                branch_address: true,
                account_no: true,
                ifsc: true,
                adCode: true,
              })),
              branches: values.branches?.map(() => ({
                branch_name: true,
                branch_code: true,
                address: true,
                city: true,
                state: true,
                postal_code: true,
              })),
            });

            // Find the first error field and scroll to it
            scrollToFirstError(errors);

            // Show custom validation dialog with field-specific message
            const errorCount = countErrors(errors);
            const firstErrorField = getFirstErrorFieldName(errors);

            setDialogState({
              isOpen: true,
              title: "Validation Errors",
              severity: "error",
              content: (
                <div>
                  <p>
                    There are <strong>{errorCount}</strong> missing or invalid
                    fields preventing submission.
                  </p>
                  <p>
                    First issue found: <strong>{firstErrorField}</strong>
                  </p>
                  <p>Please review the highlighted fields in the form.</p>
                </div>
              ),
            });

            return;
          }
        }

        validateBanks(values.banks);

        let res;
        if (submitType === "save_draft") {
          console.log("Saving draft with values:", {
            iec_no: values.iec_no,
            name_of_individual: values.name_of_individual,
          });
          res = await axios.post(
            `${process.env.REACT_APP_API_STRING}/customer-kyc-draft`,
            { ...values, draft: "true" }
          );
          showSuccess(res.data.message);
          resetForm();
        } else if (submitType === "save") {
          const res = await axios.post(
            `${process.env.REACT_APP_API_STRING}/add-customer-kyc`,
            { ...values, approval: "Pending" }
          );

          showSuccess(res.data.message);
          resetForm();
        }
        localStorage.removeItem("kycFormValues");
      } catch (error) {
        console.error("Error during submission", error);
      }
    },
  });

  const { getSupportingDocs, fileSnackbar, setFileSnackbar } =
    useSupportingDocuments(formik);


  // Clear All Form Function
  const handleClearAll = () => {
    // Reset formik to initial values
    formik.resetForm();

    // Clear localStorage
    localStorage.removeItem("kycFormValues");

    // Reset all state
    setSubmitType("");
    setSubmissionAttempted(false);

    setShowClearConfirmation(false);

    // Show success message
    showSuccess("Form cleared successfully! All data has been reset.");
  };

  const handleClearConfirmation = () => {
    setShowClearConfirmation(true);
  };

  // Save form data to localStorage every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem("kycFormValues", JSON.stringify(formik.values));
    }, 5000);

    // Cleanup the interval on component unmount
    return () => clearInterval(interval);
  }, [formik.values]);

  useEffect(() => {
    // Load form values from localStorage
    const storedValues = JSON.parse(localStorage.getItem("kycFormValues"));
    if (storedValues) {
      formik.setValues(storedValues);
    }
  }, []);

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
          gst_reg: [],
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
          adCode_file: [],
        },
      ],
    });
  };

  const handleRemoveField = (index) => {
    if (formik.values.factory_addresses.length > 1) {
      const updatedAddresses = formik.values.factory_addresses.filter(
        (_, i) => i !== index
      );
      formik.setValues({
        ...formik.values,
        factory_addresses: updatedAddresses,
      });
    }
  };

  const handleRemoveBank = (index) => {
    if (formik.values.banks.length > 1) {
      const updatedBanks = formik.values.banks.filter((_, i) => i !== index);
      formik.setValues({
        ...formik.values,
        banks: updatedBanks,
      });
    }
  };

  const handleAddBranch = () => {
    formik.setValues({
      ...formik.values,
      branches: [
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
      ],
    });
  };

  const handleRemoveBranch = (index) => {
    const updatedBranches = formik.values.branches.filter((_, i) => i !== index);
    formik.setValues({
      ...formik.values,
      branches: updatedBranches,
    });
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
          formik.values.permanent_address_pin_code,
        principle_business_telephone: formik.values.permanent_address_telephone,
        principle_address_email: formik.values.permanent_address_email,
        sameAsPermanentAddress: true,
      });
    } else {
      formik.setValues({
        ...formik.values,
        sameAsPermanentAddress: false,
      });
    }
  };

  useEffect(() => {
    const fetchCityAndState = async () => {
      if (formik.values.permanent_address_pin_code?.length === 6) {
        const data = await getCityAndStateByPinCode(
          formik.values.permanent_address_pin_code
        );
        if (data) {
          formik.setFieldValue("permanent_address_city", data.city);
          formik.setFieldValue("permanent_address_state", data.state);
        }
      }

      if (formik.values.principle_business_address_pin_code?.length === 6) {
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

  const validateBanks = (banks) => {
    const errors = [];

    // banks.forEach((bank, index) => {
    //   if (bank.adCode?.length !== 7) {
    //     errors.push("Invalid AD code");
    //   }

    //   // Check if bankers_name contains special characters
    //   if (/[^a-zA-Z0-9\s]/.test(bank.bankers_name)) {
    //     errors.push("Banker's Name should not contain special characters");
    //   }

    //   // Check if account_no contains non-digit characters
    //   if (!/^\d+$/.test(bank.account_no)) {
    //     errors.push("Account No should contain digits only");
    //   }
    // });

    if (errors?.length > 0) {
      showError(errors.join("\n"));
    }

    return errors;
  };

  // Start a new form
  const handleNewForm = () => {
    formik.resetForm();
  };

  // Helper function to count total errors
  const countErrors = (errors) => {
    let count = 0;
    const countNestedErrors = (obj) => {
      Object.keys(obj).forEach((key) => {
        if (
          typeof obj[key] === "object" &&
          obj[key] !== null &&
          !Array.isArray(obj[key])
        ) {
          countNestedErrors(obj[key]);
        } else if (Array.isArray(obj[key])) {
          obj[key].forEach((item) => {
            if (typeof item === "object" && item !== null) {
              countNestedErrors(item);
            } else if (item) {
              count++;
            }
          });
        } else if (obj[key]) {
          count++;
        }
      });
    };
    countNestedErrors(errors);
    return count;
  };

  // Helper function to get the first error field name in a user-friendly format
  const getFirstErrorFieldName = (errors) => {
    const fieldNames = {
      category: "Category",
      name_of_individual: "Name of Individual/Firm/Company",
      status: "Status of Exporter/Importer",
      permanent_address_line_1: "Permanent Address Line 1",
      permanent_address_city: "Permanent Address City",
      permanent_address_state: "Permanent Address State",
      permanent_address_pin_code: "Permanent Address PIN Code",
      permanent_address_telephone: "Permanent Address Mobile",
      permanent_address_email: "Permanent Address Email",
      principle_business_address_line_1: "Principal Business Address Line 1",
      principle_business_address_city: "Principal Business Address City",
      principle_business_address_state: "Principal Business Address State",
      principle_business_address_pin_code:
        "Principal Business Address PIN Code",
      principle_business_telephone: "Principal Business Mobile",
      principle_address_email: "Principal Business Email",
      iec_no: "IEC Number",
      pan_no: "PAN Number",
      factory_addresses: "Factory Address",
      banks: "Banking Information",
      branches: "Branch Information",
    };

    const findFirstError = (obj, prefix = "") => {
      for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (
          typeof obj[key] === "object" &&
          obj[key] !== null &&
          !Array.isArray(obj[key])
        ) {
          const result = findFirstError(obj[key], fullKey);
          if (result) return result;
        } else if (Array.isArray(obj[key])) {
          for (let i = 0; i < obj[key].length; i++) {
            if (typeof obj[key][i] === "object" && obj[key][i] !== null) {
              const result = findFirstError(obj[key][i], `${fullKey}[${i}]`);
              if (result) return result;
            } else if (obj[key][i]) {
              return fieldNames[key] || key;
            }
          }
        } else if (obj[key]) {
          return fieldNames[key] || key;
        }
      }
      return null;
    };

    return findFirstError(errors) || "Unknown field";
  };

  // Helper function to scroll to the first error field
  const scrollToFirstError = (errors) => {
    const findFirstErrorElement = (obj, prefix = "") => {
      for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (
          typeof obj[key] === "object" &&
          obj[key] !== null &&
          !Array.isArray(obj[key])
        ) {
          const result = findFirstErrorElement(obj[key], fullKey);
          if (result) return result;
        } else if (Array.isArray(obj[key])) {
          for (let i = 0; i < obj[key].length; i++) {
            if (typeof obj[key][i] === "object" && obj[key][i] !== null) {
              const result = findFirstErrorElement(
                obj[key][i],
                `${fullKey}[${i}]`
              );
              if (result) return result;
            } else if (obj[key][i]) {
              return `${fullKey}[${i}]`;
            }
          }
        } else if (obj[key]) {
          return fullKey;
        }
      }
      return null;
    };

    const firstErrorField = findFirstErrorElement(errors);
    if (firstErrorField) {
      // Convert field name to element ID
      const elementId = firstErrorField.replace(/\[(\d+)\]/g, "[$1]");
      const element = document.getElementById(elementId);

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        // Add visual highlight to the field
        element.style.transition = "box-shadow 0.3s ease";
        element.style.boxShadow = "0 0 10px rgba(239, 68, 68, 0.5)";

        // Remove highlight after 3 seconds
        setTimeout(() => {
          element.style.boxShadow = "";
        }, 3000);

        // Focus the element
        element.focus();
      }
    }
  };



  return (
    <div className="premium-card compact-mode">
      <div className="card-header">
        <h2 className="page-title">
          New Application
        </h2>
        <p className="page-subtitle">
          Complete the form below to submit your KYC details.
        </p>
      </div>
      <div className="card-body">
        <form onSubmit={formik.handleSubmit}>
          
          {/* Top Row: Category (Full Width) */}
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label className="form-label required">CATEGORY</label>
            <div className="compact-radio-group">
              {[
                "Individual/ Proprietary Firm",
                "Partnership Firm",
                "Company",
                "Trust Foundations",
              ].map((option) => (
                <label key={option} className="compact-radio-label">
                  <input
                    type="radio"
                    name="category"
                    value={option}
                    checked={formik.values.category === option}
                    onChange={formik.handleChange}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {formik.touched.category && formik.errors.category && (
              <div className="error-text">⚠️ {formik.errors.category}</div>
            )}
          </div>

          <div className="compact-layout">
            
            {/* Left Column */}
            <div className="column">
              {/* Individual Information */}
              <div className="form-section">
                <h4 className="section-title">INDIVIDUAL INFORMATION</h4>
                
                <div className="form-group">
                    <label className="form-label required" htmlFor="name_of_individual">
                        NAME OF INDIVIDUAL/FIRM/COMPANY
                    </label>
                    <input
                        id="name_of_individual"
                        name="name_of_individual"
                        className={`form-control ${
                            formik.touched.name_of_individual && formik.errors.name_of_individual ? "error" : ""
                        }`}
                        value={formik.values.name_of_individual}
                        onChange={formik.handleChange}
                        placeholder="ENTER NAME"
                    />
                    {formik.touched.name_of_individual && formik.errors.name_of_individual && (
                        <div className="error-text">⚠️ {formik.errors.name_of_individual}</div>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label required">STATUS OF EXPORTER/IMPORTER</label>
                    <div className="compact-radio-group">
                        {["Manufacturer", "Trader"].map((type) => (
                            <label key={type} className="compact-radio-label">
                                <input
                                    type="radio"
                                    name="status"
                                    value={type}
                                    checked={formik.values.status === type}
                                    onChange={formik.handleChange}
                                />
                                <span>{type}</span>
                            </label>
                        ))}
                    </div>
                     {formik.touched.status && formik.errors.status && (
                        <div className="error-text">⚠️ {formik.errors.status}</div>
                    )}
                </div>
              </div>

              {/* Permanent Address */}
              <div className="form-section">
                <h4 className="section-title">PERMANENT ADDRESS</h4>
                
                <div className="dense-grid-2">
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label required" htmlFor="permanent_address_line_1">ADDRESS LINE 1</label>
                        <input
                            id="permanent_address_line_1"
                            name="permanent_address_line_1"
                            className={`form-control ${
                                formik.touched.permanent_address_line_1 && formik.errors.permanent_address_line_1 ? "error" : ""
                            }`}
                            value={formik.values.permanent_address_line_1}
                            onChange={formik.handleChange}
                        />
                         {formik.touched.permanent_address_line_1 && formik.errors.permanent_address_line_1 && (
                            <div className="error-text">⚠️ {formik.errors.permanent_address_line_1}</div>
                         )}
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label" htmlFor="permanent_address_line_2">ADDRESS LINE 2</label>
                        <input
                            id="permanent_address_line_2"
                            name="permanent_address_line_2"
                            className="form-control"
                            value={formik.values.permanent_address_line_2}
                            onChange={formik.handleChange}
                        />
                    </div>
                </div>

                <div className="dense-grid-3">
                    <div className="form-group">
                        <label className="form-label required" htmlFor="permanent_address_pin_code">PIN CODE</label>
                        <input
                            id="permanent_address_pin_code"
                            name="permanent_address_pin_code"
                            className={`form-control ${
                                formik.touched.permanent_address_pin_code && formik.errors.permanent_address_pin_code ? "error" : ""
                            }`}
                            value={formik.values.permanent_address_pin_code}
                            onChange={formik.handleChange}
                        />
                        {formik.touched.permanent_address_pin_code && formik.errors.permanent_address_pin_code && (
                             <div className="error-text">⚠️ {formik.errors.permanent_address_pin_code}</div>
                        )}
                    </div>
                     <div className="form-group">
                        <label className="form-label required" htmlFor="permanent_address_city">CITY</label>
                        <input
                            id="permanent_address_city"
                            name="permanent_address_city"
                            className={`form-control ${
                                formik.touched.permanent_address_city && formik.errors.permanent_address_city ? "error" : ""
                            }`}
                            value={formik.values.permanent_address_city}
                            onChange={formik.handleChange}
                        />
                         {formik.touched.permanent_address_city && formik.errors.permanent_address_city && (
                             <div className="error-text">⚠️ {formik.errors.permanent_address_city}</div>
                        )}
                    </div>
                    <div className="form-group">
                        <label className="form-label required" htmlFor="permanent_address_state">STATE</label>
                        <input
                            id="permanent_address_state"
                            name="permanent_address_state"
                            className={`form-control ${
                                formik.touched.permanent_address_state && formik.errors.permanent_address_state ? "error" : ""
                            }`}
                            value={formik.values.permanent_address_state}
                            onChange={formik.handleChange}
                        />
                         {formik.touched.permanent_address_state && formik.errors.permanent_address_state && (
                             <div className="error-text">⚠️ {formik.errors.permanent_address_state}</div>
                        )}
                    </div>
                </div>

                <div className="dense-grid-2">
                     <div className="form-group">
                        <label className="form-label required" htmlFor="permanent_address_telephone">MOBILE</label>
                        <input
                            id="permanent_address_telephone"
                            name="permanent_address_telephone"
                            className={`form-control ${
                                formik.touched.permanent_address_telephone && formik.errors.permanent_address_telephone ? "error" : ""
                            }`}
                            value={formik.values.permanent_address_telephone}
                            onChange={formik.handleChange}
                        />
                        {formik.touched.permanent_address_telephone && formik.errors.permanent_address_telephone && (
                             <div className="error-text">⚠️ {formik.errors.permanent_address_telephone}</div>
                        )}
                    </div>
                    <div className="form-group">
                        <label className="form-label required" htmlFor="permanent_address_email">EMAIL</label>
                        <input
                            id="permanent_address_email"
                            name="permanent_address_email"
                             className={`form-control ${
                                formik.touched.permanent_address_email && formik.errors.permanent_address_email ? "error" : ""
                            }`}
                            value={formik.values.permanent_address_email}
                            onChange={formik.handleChange}
                        />
                        {formik.touched.permanent_address_email && formik.errors.permanent_address_email && (
                             <div className="error-text">⚠️ {formik.errors.permanent_address_email}</div>
                        )}
                    </div>
                </div>
              </div>

              {/* Principal Business Address - MOVED FROM RIGHT */}
              <div className="form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 className="section-title" style={{ marginBottom: 0 }}>PRINCIPAL BUSINESS ADDRESS</h4>
                    <label className="compact-checkbox-wrapper">
                        <input
                            type="checkbox"
                            checked={formik.values.sameAsPermanentAddress}
                            onChange={handleSameAsPermanentAddress}
                        />
                        <span>SAME AS PERMANENT</span>
                    </label>
                </div>

                 <div className="dense-grid-2">
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label required" htmlFor="principle_business_address_line_1">ADDRESS LINE 1</label>
                        <input
                            id="principle_business_address_line_1"
                            name="principle_business_address_line_1"
                            className={`form-control ${
                                formik.touched.principle_business_address_line_1 && formik.errors.principle_business_address_line_1 ? "error" : ""
                            }`}
                            value={formik.values.principle_business_address_line_1}
                            onChange={formik.handleChange}
                        />
                        {formik.touched.principle_business_address_line_1 && formik.errors.principle_business_address_line_1 && (
                            <div className="error-text">⚠️ {formik.errors.principle_business_address_line_1}</div>
                        )}
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label" htmlFor="principle_business_address_line_2">ADDRESS LINE 2</label>
                        <input
                            id="principle_business_address_line_2"
                            name="principle_business_address_line_2"
                            className="form-control"
                            value={formik.values.principle_business_address_line_2}
                            onChange={formik.handleChange}
                        />
                    </div>
                </div>

                <div className="dense-grid-3">
                    <div className="form-group">
                        <label className="form-label required" htmlFor="principle_business_address_pin_code">PIN CODE</label>
                        <input
                            id="principle_business_address_pin_code"
                            name="principle_business_address_pin_code"
                             className={`form-control ${
                                formik.touched.principle_business_address_pin_code && formik.errors.principle_business_address_pin_code ? "error" : ""
                            }`}
                            value={formik.values.principle_business_address_pin_code}
                            onChange={formik.handleChange}
                        />
                        {formik.touched.principle_business_address_pin_code && formik.errors.principle_business_address_pin_code && (
                             <div className="error-text">⚠️ {formik.errors.principle_business_address_pin_code}</div>
                        )}
                    </div>
                    <div className="form-group">
                        <label className="form-label required" htmlFor="principle_business_address_city">CITY</label>
                        <input
                            id="principle_business_address_city"
                            name="principle_business_address_city"
                             className={`form-control ${
                                formik.touched.principle_business_address_city && formik.errors.principle_business_address_city ? "error" : ""
                            }`}
                            value={formik.values.principle_business_address_city}
                            onChange={formik.handleChange}
                        />
                         {formik.touched.principle_business_address_city && formik.errors.principle_business_address_city && (
                             <div className="error-text">⚠️ {formik.errors.principle_business_address_city}</div>
                        )}
                    </div>
                    <div className="form-group">
                        <label className="form-label required" htmlFor="principle_business_address_state">STATE</label>
                        <input
                            id="principle_business_address_state"
                            name="principle_business_address_state"
                            className={`form-control ${
                                formik.touched.principle_business_address_state && formik.errors.principle_business_address_state ? "error" : ""
                            }`}
                            value={formik.values.principle_business_address_state}
                            onChange={formik.handleChange}
                        />
                         {formik.touched.principle_business_address_state && formik.errors.principle_business_address_state && (
                             <div className="error-text">⚠️ {formik.errors.principle_business_address_state}</div>
                        )}
                    </div>
                </div>

                 <div className="dense-grid-3">
                    <div className="form-group">
                        <label className="form-label required" htmlFor="principle_business_telephone">MOBILE</label>
                        <input
                            id="principle_business_telephone"
                            name="principle_business_telephone"
                             className={`form-control ${
                                formik.touched.principle_business_telephone && formik.errors.principle_business_telephone ? "error" : ""
                            }`}
                            value={formik.values.principle_business_telephone}
                            onChange={formik.handleChange}
                        />
                        {formik.touched.principle_business_telephone && formik.errors.principle_business_telephone && (
                             <div className="error-text">⚠️ {formik.errors.principle_business_telephone}</div>
                        )}
                    </div>
                    <div className="form-group">
                        <label className="form-label required" htmlFor="principle_address_email">EMAIL</label>
                        <input
                            id="principle_address_email"
                            name="principle_address_email"
                             className={`form-control ${
                                formik.touched.principle_address_email && formik.errors.principle_address_email ? "error" : ""
                            }`}
                            value={formik.values.principle_address_email}
                            onChange={formik.handleChange}
                        />
                        {formik.touched.principle_address_email && formik.errors.principle_address_email && (
                             <div className="error-text">⚠️ {formik.errors.principle_address_email}</div>
                        )}
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="principle_business_website">WEBSITE</label>
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
            </div>

            {/* Right Column */}
            <div className="column">
                
              {/* Branch Information Section - NEW */}
              <div className="form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h4 className="section-title" style={{ marginBottom: 0, color: 'var(--primary-700)' }}>BRANCH INFORMATION</h4>
                    </div>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleAddBranch}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                        + ADD BRANCH
                    </button>
                </div>

                {formik.values.branches?.map((branch, index) => (
                    <div key={index} className="nested-card" style={{ position: 'relative', padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: 'var(--slate-50)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', margin: '-0.5rem -0.5rem 1rem -0.5rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--slate-700)' }}>Branch {index}</span>
                            <button
                                type="button"
                                onClick={() => handleRemoveBranch(index)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--slate-400)',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem',
                                    padding: 0,
                                    lineHeight: 1,
                                    transition: 'color 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.color = 'var(--error)'}
                                onMouseOut={(e) => e.target.style.color = 'var(--slate-400)'}
                                title="Remove Branch"
                            >
                                ×
                            </button>
                        </div>

                        <div className="dense-grid-3">
                            <div className="form-group">
                                <label className="form-label required">Branch Name</label>
                                <input
                                    name={`branches[${index}].branch_name`}
                                    className={`form-control ${formik.touched.branches?.[index]?.branch_name && formik.errors.branches?.[index]?.branch_name ? "error" : ""}`}
                                    value={branch.branch_name}
                                    onChange={formik.handleChange}
                                    placeholder="Branch Name *"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label required">Branch Code</label>
                                <input
                                    name={`branches[${index}].branch_code`}
                                    className={`form-control ${formik.touched.branches?.[index]?.branch_code && formik.errors.branches?.[index]?.branch_code ? "error" : ""}`}
                                    value={branch.branch_code}
                                    onChange={formik.handleChange}
                                    placeholder="Branch Code *"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">GST Number</label>
                                <input
                                    name={`branches[${index}].gst_no`}
                                    className="form-control"
                                    value={branch.gst_no}
                                    onChange={formik.handleChange}
                                    placeholder="GST Number"
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '0.75rem' }}>
                            <label className="form-label required">Address</label>
                            <input
                                name={`branches[${index}].address`}
                                className={`form-control ${formik.touched.branches?.[index]?.address && formik.errors.branches?.[index]?.address ? "error" : ""}`}
                                value={branch.address}
                                onChange={formik.handleChange}
                                placeholder="Address *"
                            />
                        </div>

                        <div className="dense-grid-3" style={{ marginTop: '0.75rem' }}>
                            <div className="form-group">
                                <label className="form-label required">City</label>
                                <input
                                    name={`branches[${index}].city`}
                                    className={`form-control ${formik.touched.branches?.[index]?.city && formik.errors.branches?.[index]?.city ? "error" : ""}`}
                                    value={branch.city}
                                    onChange={formik.handleChange}
                                    placeholder="City *"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label required">State</label>
                                <input
                                    name={`branches[${index}].state`}
                                    className={`form-control ${formik.touched.branches?.[index]?.state && formik.errors.branches?.[index]?.state ? "error" : ""}`}
                                    value={branch.state}
                                    onChange={formik.handleChange}
                                    placeholder="State *"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label required">Postal Code</label>
                                <input
                                    name={`branches[${index}].postal_code`}
                                    className={`form-control ${formik.touched.branches?.[index]?.postal_code && formik.errors.branches?.[index]?.postal_code ? "error" : ""}`}
                                    value={branch.postal_code}
                                    onChange={formik.handleChange}
                                    placeholder="Postal Code *"
                                />
                            </div>
                        </div>

                        <div className="dense-grid-2" style={{ marginTop: '0.75rem' }}>
                            <div className="form-group">
                                <label className="form-label">Country</label>
                                <input
                                    name={`branches[${index}].country`}
                                    className="form-control"
                                    value={branch.country}
                                    onChange={formik.handleChange}
                                    placeholder="Country"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mobile</label>
                                <input
                                    name={`branches[${index}].mobile`}
                                    className="form-control"
                                    value={branch.mobile}
                                    onChange={formik.handleChange}
                                    placeholder="Mobile"
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '0.75rem' }}>
                            <label className="form-label">Email</label>
                            <input
                                name={`branches[${index}].email`}
                                className="form-control"
                                value={branch.email}
                                onChange={formik.handleChange}
                                placeholder="Email"
                            />
                        </div>
                    </div>
                ))}
                
                {(!formik.values.branches || formik.values.branches.length === 0) && (
                    <div style={{ textAlign: 'center', padding: '1.5rem', border: '1px dashed var(--slate-300)', borderRadius: 'var(--radius-md)', color: 'var(--slate-400)', fontSize: '0.85rem', background: 'var(--slate-50)' }}>
                        No branches added. Click "+ ADD BRANCH" to add one.
                    </div>
                )}
              </div>

              {/* Factory Address Section */}
               <div className="form-section">
                <h4 className="section-title">FACTORY ADDRESS</h4>
                 {formik.values.factory_addresses?.map((address, index) => (
                    <div key={index} className="nested-card" style={{ position: 'relative' }}>
                        {formik.values.factory_addresses.length > 1 && (
                            <button
                                type="button"
                                onClick={() => handleRemoveField(index)}
                                style={{
                                    position: 'absolute',
                                    top: '5px',
                                    right: '5px',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--error)',
                                    cursor: 'pointer',
                                    fontSize: '1rem'
                                }}
                                title="Remove"
                            >
                                ×
                            </button>
                        )}
                        <div className="dense-grid-2">
                             <div className="form-group">
                                <label className="form-label required">ADDRESS LINE 1</label>
                                <input
                                    name={`factory_addresses[${index}].factory_address_line_1`}
                                    className={`form-control ${formik.touched.factory_addresses?.[index]?.factory_address_line_1 && formik.errors.factory_addresses?.[index]?.factory_address_line_1 ? "error" : ""}`}
                                    value={address.factory_address_line_1}
                                    onChange={formik.handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">ADDRESS LINE 2</label>
                                <input
                                    name={`factory_addresses[${index}].factory_address_line_2`}
                                    className="form-control"
                                    value={address.factory_address_line_2}
                                    onChange={formik.handleChange}
                                />
                            </div>
                        </div>
                        <div className="dense-grid-3">
                             <div className="form-group">
                                <label className="form-label required">PIN CODE</label>
                                <input
                                    name={`factory_addresses[${index}].factory_address_pin_code`}
                                    className={`form-control ${formik.touched.factory_addresses?.[index]?.factory_address_pin_code && formik.errors.factory_addresses?.[index]?.factory_address_pin_code ? "error" : ""}`}
                                    value={address.factory_address_pin_code}
                                    onChange={formik.handleChange}
                                />
                            </div>
                             <div className="form-group">
                                <label className="form-label required">CITY</label>
                                <input
                                    name={`factory_addresses[${index}].factory_address_city`}
                                    className={`form-control ${formik.touched.factory_addresses?.[index]?.factory_address_city && formik.errors.factory_addresses?.[index]?.factory_address_city ? "error" : ""}`}
                                    value={address.factory_address_city}
                                    onChange={formik.handleChange}
                                />
                            </div>
                             <div className="form-group">
                                <label className="form-label required">STATE</label>
                                <input
                                    name={`factory_addresses[${index}].factory_address_state`}
                                    className={`form-control ${formik.touched.factory_addresses?.[index]?.factory_address_state && formik.errors.factory_addresses?.[index]?.factory_address_state ? "error" : ""}`}
                                    value={address.factory_address_state}
                                    onChange={formik.handleChange}
                                />
                            </div>
                        </div>
                         <div className="form-group" style={{ marginTop: '0.5rem' }}>
                            <label className="form-label required">GST NUMBER</label>
                            <input
                                name={`factory_addresses[${index}].gst`}
                                className={`form-control ${formik.touched.factory_addresses?.[index]?.gst && formik.errors.factory_addresses?.[index]?.gst ? "error" : ""}`}
                                value={address.gst}
                                onChange={formik.handleChange}
                            />
                        </div>
                         <div className="form-group">
                            <label className="form-label">UPLOAD GST REGISTRATION</label>
                             <FileUpload
                                label="Upload" // Simplified label
                                onFilesUploaded={(files) => formik.setFieldValue(`factory_addresses[${index}].gst_reg`, files)}
                                bucketPath="gst_reg"
                                multiple={false}
                                customerName={formik.values.name_of_individual || "customer"}
                            />
                             {address.gst_reg && (
                                <ImagePreview
                                    images={address.gst_reg}
                                    onDeleteImage={() => formik.setFieldValue(`factory_addresses[${index}].gst_reg`, [])}
                                    showDeleteForAdmin={true}
                                />
                            )}
                        </div>
                    </div>
                 ))}
                 <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddField}
                    style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.4rem 1rem' }}
                >
                    + ADD FACTORY ADDRESS
                </button>
                </div>
              </div>
            </div>


          <div className="compact-layout">
            <div className="column">
              {/* Authorised Signatory Section */}
              <div className="form-section">
                <h4 className="section-title">AUTHORISED SIGNATORY INFORMATION</h4>
                
                <div className="dense-grid-2">
                  {/* Signatory Photos */}
                  <div>
                    <label className="form-label">
                      SIGNATORY PHOTOS <span style={{ fontWeight: "normal", fontSize: "0.8em", textTransform: 'none' }}>(passport size, self-attested)</span>
                    </label>
                    <FileUpload
                      label="Upload Photos"
                      onFilesUploaded={(uploadedFiles) => {
                        formik.setFieldValue("authorised_signatories", [
                          ...(formik.values.authorised_signatories || []),
                          ...uploadedFiles,
                        ]);
                      }}
                      bucketPath="authorised-signatories"
                      multiple={true}
                      acceptedFileTypes={[".jpg", ".jpeg", ".png", ".pdf"]}
                      customerName={formik.values.name_of_individual}
                    />
                     {formik.touched.authorised_signatories && formik.errors.authorised_signatories && (
                         <div className="error-text">⚠️ {formik.errors.authorised_signatories}</div>
                    )}
                    {formik.values.authorised_signatories && (
                      <ImagePreview
                        images={formik.values.authorised_signatories}
                        onDeleteImage={(index) => {
                          const updatedImages = formik.values.authorised_signatories.filter((_, i) => i !== index);
                          formik.setFieldValue("authorised_signatories", updatedImages);
                        }}
                        allowUserDelete={true}
                         applicationStatus="draft"
                        currentUserId={user?.id}
                        applicationCreatorId={user?.id}
                      />
                    )}
                  </div>

                  {/* Authorisation Letter */}
                  <div>
                    <label className="form-label">AUTHORISATION LETTER</label>
                    <FileUpload
                      label="Upload Letter"
                      onFilesUploaded={(uploadedFiles) => {
                        formik.setFieldValue("authorisation_letter", [
                          ...(formik.values.authorisation_letter || []),
                          ...uploadedFiles,
                        ]);
                      }}
                      bucketPath="authorisation_letter"
                      multiple={true}
                      acceptedFileTypes={[".jpg", ".jpeg", ".png", ".pdf"]}
                      customerName={formik.values.name_of_individual}
                    />
                    {formik.touched.authorisation_letter && formik.errors.authorisation_letter && (
                        <div className="error-text">⚠️ {formik.errors.authorisation_letter}</div>
                    )}
                    {formik.values.authorisation_letter && (
                      <ImagePreview
                        images={formik.values.authorisation_letter}
                        onDeleteImage={(index) => {
                          const updatedImages = formik.values.authorisation_letter.filter((_, i) => i !== index);
                          formik.setFieldValue("authorisation_letter", updatedImages);
                        }}
                        allowUserDelete={true}
                         applicationStatus="draft"
                        currentUserId={user?.id}
                        applicationCreatorId={user?.id}
                      />
                    )}
                  </div>
                </div>
              </div>

               {/* IEC and PAN Section */}
              <div className="form-section">
                <h4 className="section-title">IEC & PAN DETAILS</h4>
                <div className="dense-grid-2">
                    {/* IEC Section */}
                    <div>
                        <div className="form-group">
                            <label className="form-label required" htmlFor="iec_no">IEC NO</label>
                            <input
                                id="iec_no"
                                name="iec_no"
                                className={`form-control ${formik.touched.iec_no && formik.errors.iec_no ? "error" : ""}`}
                                value={formik.values.iec_no}
                                onChange={formik.handleChange}
                                placeholder="ENTER IEC NUMBER"
                            />
                             {formik.touched.iec_no && formik.errors.iec_no && (
                                <div className="error-text">⚠️ {formik.errors.iec_no}</div>
                            )}
                        </div>
                         <div style={{ marginBottom: "0.5rem" }}>
                            <label className="form-label">IEC COPY</label>
                             <FileUpload
                                label="Upload" 
                                onFilesUploaded={(uploadedFiles) => {
                                    formik.setFieldValue("iec_copy", [
                                    ...(formik.values.iec_copy || []),
                                    ...uploadedFiles,
                                    ]);
                                }}
                                bucketPath="iec_copy"
                                multiple={true}
                                acceptedFileTypes={[".pdf", ".jpg", ".jpeg", ".png"]}
                                customerName={formik.values.name_of_individual}
                            />
                             {formik.touched.iec_copy && formik.errors.iec_copy && (
                                <div className="error-text">⚠️ {formik.errors.iec_copy}</div>
                            )}
                             {formik.values.iec_copy && (
                                <ImagePreview
                                    images={formik.values.iec_copy}
                                    onDeleteImage={(index) => {
                                    const updatedImages = formik.values.iec_copy.filter((_, i) => i !== index);
                                    formik.setFieldValue("iec_copy", updatedImages);
                                    }}
                                    allowUserDelete={true}
                                     applicationStatus="draft"
                                    currentUserId={user?.id}
                                    applicationCreatorId={user?.id}
                                />
                            )}
                        </div>
                    </div>

                    {/* PAN Section */}
                    <div>
                         <div className="form-group">
                            <label className="form-label required" htmlFor="pan_no">PAN NO</label>
                            <input
                                id="pan_no"
                                name="pan_no"
                                className={`form-control ${formik.touched.pan_no && formik.errors.pan_no ? "error" : ""}`}
                                value={formik.values.pan_no}
                                onChange={formik.handleChange}
                                placeholder="ENTER PAN NUMBER"
                            />
                             {formik.touched.pan_no && formik.errors.pan_no && (
                                <div className="error-text">⚠️ {formik.errors.pan_no}</div>
                            )}
                        </div>
                        <div style={{ marginBottom: "0.5rem" }}>
                            <label className="form-label">PAN COPY</label>
                             <FileUpload
                                label="Upload"
                                onFilesUploaded={(uploadedFiles) => {
                                    formik.setFieldValue("pan_copy", [
                                    ...(formik.values.pan_copy || []),
                                    ...uploadedFiles,
                                    ]);
                                }}
                                bucketPath="pan-copy"
                                multiple={true}
                                acceptedFileTypes={[".pdf", ".jpg", ".jpeg", ".png"]}
                                customerName={formik.values.name_of_individual}
                            />
                             {formik.touched.pan_copy && formik.errors.pan_copy && (
                                <div className="error-text">⚠️ {formik.errors.pan_copy}</div>
                            )}
                            {formik.values.pan_copy && (
                                <ImagePreview
                                    images={Array.isArray(formik.values.pan_copy) ? formik.values.pan_copy : [formik.values.pan_copy]}
                                    onDeleteImage={(index) => {
                                        if (Array.isArray(formik.values.pan_copy)) {
                                            const updatedImages = formik.values.pan_copy.filter((_, i) => i !== index);
                                            formik.setFieldValue("pan_copy", updatedImages);
                                        } else {
                                            formik.setFieldValue("pan_copy", []);
                                        }
                                    }}
                                    allowUserDelete={true}
                                     applicationStatus="draft"
                                    currentUserId={user?.id}
                                    applicationCreatorId={user?.id}
                                />
                            )}
                        </div>
                    </div>
                </div>
              </div>
            </div>

            <div className="column">
               {/* Banking Information Section */}
              <div className="form-section">
                <h4 className="section-title">BANKING INFORMATION</h4>
                 {formik.values.banks?.map((bank, index) => (
                  <div key={index} className="nested-card" style={{ position: 'relative' }}>
                     {formik.values.banks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBank(index)}
                        style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--error)',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    )}
                    
                    <div className="dense-grid-2">
                         <div className="form-group">
                            <label className="form-label required">BANKERS NAME</label>
                            <input
                                name={`banks[${index}].bankers_name`}
                                className={`form-control ${formik.touched.banks?.[index]?.bankers_name && formik.errors.banks?.[index]?.bankers_name ? "error" : ""}`}
                                value={bank.bankers_name}
                                onChange={formik.handleChange}
                            />
                             {formik.touched.banks?.[index]?.bankers_name && formik.errors.banks?.[index]?.bankers_name && (
                                <div className="error-text">⚠️ {formik.errors.banks?.[index]?.bankers_name}</div>
                            )}
                        </div>
                         <div className="form-group">
                            <label className="form-label required">BRANCH ADDRESS</label>
                            <input
                                name={`banks[${index}].branch_address`}
                                className={`form-control ${formik.touched.banks?.[index]?.branch_address && formik.errors.banks?.[index]?.branch_address ? "error" : ""}`}
                                value={bank.branch_address}
                                onChange={formik.handleChange}
                            />
                        </div>
                    </div>

                    <div className="dense-grid-3">
                         <div className="form-group">
                            <label className="form-label required">ACCOUNT NO</label>
                            <input
                                name={`banks[${index}].account_no`}
                                className={`form-control ${formik.touched.banks?.[index]?.account_no && formik.errors.banks?.[index]?.account_no ? "error" : ""}`}
                                value={bank.account_no}
                                onChange={formik.handleChange}
                            />
                             {formik.touched.banks?.[index]?.account_no && formik.errors.banks?.[index]?.account_no && (
                                <div className="error-text">⚠️ {formik.errors.banks?.[index]?.account_no}</div>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label required">IFSC</label>
                            <input
                                name={`banks[${index}].ifsc`}
                                className={`form-control ${formik.touched.banks?.[index]?.ifsc && formik.errors.banks?.[index]?.ifsc ? "error" : ""}`}
                                value={bank.ifsc}
                                onChange={formik.handleChange}
                            />
                             {formik.touched.banks?.[index]?.ifsc && formik.errors.banks?.[index]?.ifsc && (
                                <div className="error-text">⚠️ {formik.errors.banks?.[index]?.ifsc}</div>
                            )}
                        </div>
                         <div className="form-group">
                            <label className="form-label required">AD CODE</label>
                            <input
                                name={`banks[${index}].adCode`}
                                className={`form-control ${formik.touched.banks?.[index]?.adCode && formik.errors.banks?.[index]?.adCode ? "error" : ""}`}
                                value={bank.adCode}
                                onChange={formik.handleChange}
                            />
                        </div>
                    </div>
                     <div style={{ marginTop: "0.5rem" }}>
                      <label className="form-label">AD CODE FILE</label>
                       <FileUpload
                        label="Upload"
                        onFilesUploaded={(uploadedFiles) => {
                          const current = bank.adCode_file || [];
                          formik.setFieldValue(`banks[${index}].adCode_file`, [...current, ...uploadedFiles]);
                        }}
                        bucketPath={`ad-code-${index}`}
                        multiple={true}
                        acceptedFileTypes={[".pdf", ".jpg", ".jpeg", ".png"]}
                        customerName={formik.values.name_of_individual}
                      />
                       {bank.adCode_file?.length > 0 && (
                        <ImagePreview
                          images={bank.adCode_file}
                          onDeleteImage={(deleteIndex) => {
                            const updatedImages = bank.adCode_file.filter((_, i) => i !== deleteIndex);
                            formik.setFieldValue(`banks[${index}].adCode_file`, updatedImages);
                          }}
                          allowUserDelete={true}
                           applicationStatus="draft"
                        currentUserId={user?.id}
                        applicationCreatorId={user?.id}
                        />
                      )}
                    </div>
                  </div>
                ))}
                 <button
                    type="button"
                    onClick={handleAddBanks}
                    className="btn btn-secondary"
                    style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.4rem 1rem' }}
                  >
                    + ADD BANK
                  </button>
              </div>
            </div>
          </div>



          {getSupportingDocs()}

          {/* Additional Documents Section */}
          <div className="form-section">
            <h4
              className="section-title"
              style={{
                borderBottom: "1px solid var(--slate-200)",
                paddingBottom: "0.5rem",
                marginBottom: "1.5rem",
                color: "var(--primary-700)",
              }}
            >
              Additional Documents
            </h4>

            <div className="grid-2">
              {/* Other Documents */}
              <div
                className="premium-card"
                style={{
                  padding: "1.5rem",
                  border: "1px solid var(--slate-200)",
                }}
              >
                <label className="form-label" style={{ fontSize: "1rem" }}>
                  Other Documents
                </label>
                <FileUpload
                  label="Upload Documents"
                  onFilesUploaded={(uploadedFiles) => {
                    formik.setFieldValue("other_documents", [
                      ...(formik.values.other_documents || []),
                      ...uploadedFiles,
                    ]);
                  }}
                  bucketPath="other-documents"
                  multiple={true}
                  acceptedFileTypes={[
                    ".pdf",
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".doc",
                    ".docx",
                    ".zip",
                    ".xls",
                    ".xlsx",
                  ]}
                  customerName={formik.values.name_of_individual}
                />
                {formik.touched.other_documents &&
                  formik.errors.other_documents && (
                    <div className="error-text">
                      ⚠️ {formik.errors.other_documents}
                    </div>
                  )}
                {formik.values.other_documents?.length > 0 && (
                  <ImagePreview
                    images={formik.values.other_documents}
                    onDeleteImage={(index) => {
                      const updatedImages =
                        formik.values.other_documents.filter(
                          (_, i) => i !== index
                        );
                      formik.setFieldValue("other_documents", updatedImages);
                    }}
                    allowUserDelete={true}
                    applicationStatus="draft"
                    currentUserId={user?.id}
                    applicationCreatorId={user?.id}
                  />
                )}
              </div>

              {/* SPCB Registration */}
              <div
                className="premium-card"
                style={{
                  padding: "1.5rem",
                  border: "1px solid var(--slate-200)",
                }}
              >
                <label className="form-label" style={{ fontSize: "1rem" }}>
                  SPCB Registration Certificate
                </label>
                <FileUpload
                  label="Upload Certificate"
                  onFilesUploaded={(uploadedFiles) => {
                    formik.setFieldValue("spcb_reg", [
                      ...(formik.values.spcb_reg || []),
                      ...uploadedFiles,
                    ]);
                  }}
                  bucketPath="spcb-registration"
                  multiple={true}
                  acceptedFileTypes={[".pdf", ".jpg", ".jpeg", ".png"]}
                  customerName={formik.values.name_of_individual}
                />
                {formik.touched.spcb_reg && formik.errors.spcb_reg && (
                  <div className="error-text">⚠️ {formik.errors.spcb_reg}</div>
                )}
                {formik.values.spcb_reg && (
                  <ImagePreview
                    images={
                      Array.isArray(formik.values.spcb_reg)
                        ? formik.values.spcb_reg
                        : [formik.values.spcb_reg]
                    }
                    onDeleteImage={(index) => {
                      if (Array.isArray(formik.values.spcb_reg)) {
                        const updatedImages = formik.values.spcb_reg.filter(
                          (_, i) => i !== index
                        );
                        formik.setFieldValue("spcb_reg", updatedImages);
                      } else {
                        formik.setFieldValue("spcb_reg", []);
                      }
                    }}
                    allowUserDelete={true}
                    applicationStatus="draft"
                    currentUserId={user?.id}
                    applicationCreatorId={user?.id}
                  />
                )}
              </div>

              {/* KYC Verification Images */}
              <div
                className="premium-card"
                style={{
                  padding: "1.5rem",
                  border: "1px solid var(--slate-200)",
                }}
              >
                <label className="form-label" style={{ fontSize: "1rem" }}>
                  KYC Verification Images
                </label>
                <FileUpload
                  label="Upload Images"
                  onFilesUploaded={(uploadedFiles) => {
                    formik.setFieldValue("kyc_verification_images", [
                      ...(formik.values.kyc_verification_images || []),
                      ...uploadedFiles,
                    ]);
                  }}
                  bucketPath="kyc-verification-images"
                  multiple={true}
                  acceptedFileTypes={[".jpg", ".jpeg", ".png", ".pdf"]}
                  customerName={formik.values.name_of_individual}
                />
                {formik.touched.kyc_verification_images &&
                  formik.errors.kyc_verification_images && (
                    <div className="error-text">
                      ⚠️ {formik.errors.kyc_verification_images}
                    </div>
                  )}
                {formik.values.kyc_verification_images?.length > 0 && (
                  <ImagePreview
                    images={formik.values.kyc_verification_images}
                    onDeleteImage={(index) => {
                      const updatedImages =
                        formik.values.kyc_verification_images.filter(
                          (_, i) => i !== index
                        );
                      formik.setFieldValue(
                        "kyc_verification_images",
                        updatedImages
                      );
                    }}
                    allowUserDelete={true}
                    applicationStatus="draft"
                    currentUserId={user?.id}
                    applicationCreatorId={user?.id}
                  />
                )}
              </div>

              {/* GST Returns */}
              <div
                className="premium-card"
                style={{
                  padding: "1.5rem",
                  border: "1px solid var(--slate-200)",
                }}
              >
                <label className="form-label" style={{ fontSize: "1rem" }}>
                  GST Returns
                </label>
                <FileUpload
                  label="Upload Returns"
                  onFilesUploaded={(uploadedFiles) => {
                    formik.setFieldValue("gst_returns", [
                      ...(formik.values.gst_returns || []),
                      ...uploadedFiles,
                    ]);
                  }}
                  bucketPath="gst-returns"
                  multiple={true}
                  acceptedFileTypes={[
                    ".pdf",
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".xls",
                    ".xlsx",
                    ".zip",
                    ".doc",
                    ".docx",
                  ]}
                  customerName={formik.values.name_of_individual}
                />
                {formik.touched.gst_returns && formik.errors.gst_returns && (
                  <div className="error-text">
                    ⚠️ {formik.errors.gst_returns}
                  </div>
                )}
                {formik.values.gst_returns?.length > 0 && (
                  <ImagePreview
                    images={formik.values.gst_returns}
                    onDeleteImage={(index) => {
                      const updatedImages = formik.values.gst_returns.filter(
                        (_, i) => i !== index
                      );
                      formik.setFieldValue("gst_returns", updatedImages);
                    }}
                    allowUserDelete={true}
                    applicationStatus="draft"
                    currentUserId={user?.id}
                    applicationCreatorId={user?.id}
                  />
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              flexWrap: "wrap",
              padding: "2rem 0",
              borderTop: "1px solid var(--slate-200)",
              marginTop: "2rem",
            }}
          >
            {/* Draft Requirements Info */}
            <div
              style={{
                width: "100%",
                textAlign: "center",
                marginBottom: "1rem",
                padding: "0.75rem",
                backgroundColor: "var(--primary-50)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--primary-100)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  color: "var(--primary-800)",
                  lineHeight: "1.4",
                }}
              >
                💡 <strong>Save Draft:</strong> Only requires IEC Number and
                Name •<strong>Submit:</strong> All mandatory fields must be
                completed
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                setDialogState({
                  isOpen: true,
                  title: "Preview Application",
                  content: <Preview data={formik.values} />,
                  severity: "info",
                })
              }
            >
              Preview
            </button>
            <button
              type="button"
              className="btn btn-warning"
              onClick={() =>
                setDialogState({
                  isOpen: true,
                  title: "Clear All Data",
                  content:
                    "Are you sure you want to clear all form data? This will remove all filled fields and uploaded files. This action cannot be undone.",
                  severity: "warning",
                  actions: (
                    <>
                      <button
                        className="custom-confirm-button"
                        style={{
                          background: "var(--error)",
                          color: "white",
                          border: "none",
                          padding: "0.5rem 1rem",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          handleClearAll();
                          handleCloseDialog();
                        }}
                      >
                        Yes, Clear All
                      </button>
                    </>
                  ),
                })
              }
            >
              🗑️ Clear All
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              onClick={() => {
                setSubmitType("save_draft");
                setSubmissionAttempted(true);
              }}
              title="Save with minimal information (IEC Number + Name required)"
            >
              💾 Save Draft
            </button>
            <button
              type="submit"
              className="btn btn-success"
              onClick={() => {
                setSubmitType("save");
                setSubmissionAttempted(true);
              }}
              title="Submit complete application (all mandatory fields required)"
            >
              📤 Submit
            </button>
          </div>

          {/* Render Custom Dialog */}
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

export default React.memo(CustomerKycForm);
