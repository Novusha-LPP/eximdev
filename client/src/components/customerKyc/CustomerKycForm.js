import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import axios from "axios";
import { Row, Col } from "react-bootstrap";
import useSupportingDocuments from "../../customHooks/useSupportingDocuments";
import Snackbar from "@mui/material/Snackbar";
import { handleSingleFileUpload } from "../../utils/awsSingleFileUpload";
import { handleFileUpload } from "../../utils/awsFileUpload";
import Checkbox from "@mui/material/Checkbox";
import Preview from "./Preview";
import { getCityAndStateByPinCode } from "../../utils/getCityAndStateByPinCode";

function CutomerKycForm() {
  const [submitType, setSubmitType] = useState("");
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

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
      sameAsPermanentAddress: false,

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
      gst_returns: [],

      // individual
      individual_passport_img: "",
      individual_voter_card_img: "",
      individual_driving_license_img: "",
      individual_bank_statement_img: "",
      individual_ration_card_img: "",
      individual_aadhar_card: "",

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
    onSubmit: async (values, { resetForm }) => {
      try {
        validateBanks(values.banks);

        let res;
        if (submitType === "save_draft") {
          if (values.iec_no === "") {
            alert("IEC number is required");
            return;
          } else {
            res = await axios.post(
              `${process.env.REACT_APP_API_STRING}/customer-kyc-draft`,
              { ...values, draft: "true" }
            );
            alert(res.data.message);
            resetForm();
          }
        } else if (submitType === "save") {
          const res = await axios.post(
            `${process.env.REACT_APP_API_STRING}/add-customer-kyc`,
            { ...values, approval: "Pending" }
          );

          alert(res.data.message);
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

    banks.forEach((bank, index) => {
      if (bank.adCode?.length !== 7) {
        errors.push("Invalid AD code");
      }

      // Check if bankers_name contains special characters
      if (/[^a-zA-Z0-9\s]/.test(bank.bankers_name)) {
        errors.push("Banker's Name should not contain special characters");
      }

      // Check if account_no contains non-digit characters
      if (!/^\d+$/.test(bank.account_no)) {
        errors.push("Account No should contain digits only");
      }
    });

    if (errors?.length > 0) {
      alert(errors.join("\n"));
    }

    return errors;
  };

  // Start a new form
  const handleNewForm = () => {
    formik.resetForm();
  };

  return (
    <form onSubmit={formik.handleSubmit} className="feedback-form">
      <button
        type="button"
        className="btn"
        style={{ marginTop: 0 }}
        onClick={handleNewForm}
      >
        Start with a new form
      </button>
      <br />
      <br />
      <FormControl>
        <FormLabel id="demo-radio-buttons-group-label">
          <b>Category</b>
        </FormLabel>
        <RadioGroup
          row
          aria-labelledby="demo-radio-buttons-group-label"
          name="category"
          value={formik.values.category}
          onChange={formik.handleChange}
        >
          <FormControlLabel
            value="Individual/ Proprietary Firm"
            control={<Radio />}
            label="Individual/Proprietary Firm"
          />
          <FormControlLabel
            value="Partnership Firm"
            control={<Radio />}
            label="Parternship Firm"
          />
          <FormControlLabel
            value="Company"
            control={<Radio />}
            label="Company"
          />
          <FormControlLabel
            value="Trust Foundations"
            control={<Radio />}
            label="Trust/ Foundation"
          />
        </RadioGroup>
      </FormControl>
      {formik.touched.category && formik.errors.category ? (
        <div style={{ color: "red" }}>{formik.errors.category}</div>
      ) : null}
      <br />
      <TextField
        fullWidth
        size="small"
        margin="dense"
        variant="filled"
        id="name_of_individual"
        name="name_of_individual"
        label="Name of Individual including alias/ Proprietary Firm/ Partnership Firm/ Company/ Trusts/ Foundations/ (name of all partners)"
        value={formik.values.name_of_individual}
        onChange={formik.handleChange}
        error={
          formik.touched.name_of_individual &&
          Boolean(formik.errors.name_of_individual)
        }
        helperText={
          formik.touched.name_of_individual && formik.errors.name_of_individual
        }
        className="login-input"
      />
      <br />
      <br />
      <FormControl>
        <FormLabel id="demo-radio-buttons-group-label">
          <b>Status of Exporter/ Importer</b>
        </FormLabel>
        <RadioGroup
          row
          aria-labelledby="demo-radio-buttons-group-label"
          name="status"
          value={formik.values.status}
          onChange={formik.handleChange}
        >
          <FormControlLabel
            value="Manufacturer"
            control={<Radio />}
            label="Manufacturer"
          />
          <FormControlLabel value="Trader" control={<Radio />} label="Trader" />
        </RadioGroup>
      </FormControl>
      {formik.touched.status && formik.errors.status ? (
        <div style={{ color: "red" }}>{formik.errors.status}</div>
      ) : null}
      <br />
      <br />
      <h4>Permanent Address</h4>
      <TextField
        fullWidth
        size="small"
        margin="dense"
        variant="filled"
        id="permanent_address_line_1"
        name="permanent_address_line_1"
        label="Permanent or Registered Office Address Line 1"
        value={formik.values.permanent_address_line_1}
        onChange={formik.handleChange}
        error={
          formik.touched.permanent_address_line_1 &&
          Boolean(formik.errors.permanent_address_line_1)
        }
        helperText={
          formik.touched.permanent_address_line_1 &&
          formik.errors.permanent_address_line_1
        }
        className="login-input"
      />
      <TextField
        fullWidth
        size="small"
        margin="dense"
        variant="filled"
        id="permanent_address_line_2"
        name="permanent_address_line_2"
        label="Permanent or Registered Office Address Line 2"
        value={formik.values.permanent_address_line_2}
        onChange={formik.handleChange}
        error={
          formik.touched.permanent_address_line_2 &&
          Boolean(formik.errors.permanent_address_line_2)
        }
        helperText={
          formik.touched.permanent_address_line_2 &&
          formik.errors.permanent_address_line_2
        }
        className="login-input"
      />
      <Row>
        <Col>
          <TextField
            fullWidth
            size="small"
            margin="dense"
            variant="filled"
            id="permanent_address_pin_code"
            name="permanent_address_pin_code"
            label="PIN Code"
            value={formik.values.permanent_address_pin_code}
            onChange={formik.handleChange}
            error={
              formik.touched.permanent_address_pin_code &&
              Boolean(formik.errors.permanent_address_pin_code)
            }
            helperText={
              formik.touched.permanent_address_pin_code &&
              formik.errors.permanent_address_pin_code
            }
            className="login-input"
          />
        </Col>
        <Col>
          <TextField
            fullWidth
            size="small"
            margin="dense"
            variant="filled"
            id="permanent_address_city"
            name="permanent_address_city"
            label="City"
            value={formik.values.permanent_address_city}
            onChange={formik.handleChange}
            error={
              formik.touched.permanent_address_city &&
              Boolean(formik.errors.permanent_address_city)
            }
            helperText={
              formik.touched.permanent_address_city &&
              formik.errors.permanent_address_city
            }
            className="login-input"
          />
        </Col>
        <Col>
          <TextField
            fullWidth
            size="small"
            margin="dense"
            variant="filled"
            id="permanent_address_state"
            name="permanent_address_state"
            label="State"
            value={formik.values.permanent_address_state}
            onChange={formik.handleChange}
            error={
              formik.touched.permanent_address_state &&
              Boolean(formik.errors.permanent_address_state)
            }
            helperText={
              formik.touched.permanent_address_state &&
              formik.errors.permanent_address_state
            }
            className="login-input"
          />
        </Col>
      </Row>
      <TextField
        fullWidth
        size="small"
        margin="dense"
        variant="filled"
        id="permanent_address_telephone"
        name="permanent_address_telephone"
        label="Mobile"
        value={formik.values.permanent_address_telephone}
        onChange={formik.handleChange}
        error={
          formik.touched.permanent_address_telephone &&
          Boolean(formik.errors.permanent_address_telephone)
        }
        helperText={
          formik.touched.permanent_address_telephone &&
          formik.errors.permanent_address_telephone
        }
        className="login-input"
      />
      <TextField
        fullWidth
        size="small"
        margin="dense"
        variant="filled"
        id="permanent_address_email"
        name="permanent_address_email"
        label="Email"
        value={formik.values.permanent_address_email}
        onChange={formik.handleChange}
        error={
          formik.touched.permanent_address_email &&
          Boolean(formik.errors.permanent_address_email)
        }
        helperText={
          formik.touched.permanent_address_email &&
          formik.errors.permanent_address_email
        }
        className="login-input"
      />
      <br />
      <br />
      <h4>Principal Business Address</h4>
      <FormControlLabel
        control={
          <Checkbox
            checked={formik.values.sameAsPermanentAddress}
            onChange={handleSameAsPermanentAddress}
          />
        }
        label="Same as Permanent Address"
      />
      <TextField
        fullWidth
        size="small"
        margin="dense"
        variant="filled"
        id="principle_business_address_line_1"
        name="principle_business_address_line_1"
        label="Principal Business Address/es from which business is transacted Line 1"
        value={formik.values.principle_business_address_line_1}
        onChange={formik.handleChange}
        error={
          formik.touched.principle_business_address_line_1 &&
          Boolean(formik.errors.principle_business_address_line_1)
        }
        helperText={
          formik.touched.principle_business_address_line_1 &&
          formik.errors.principle_business_address_line_1
        }
        className="login-input"
      />
      <TextField
        fullWidth
        size="small"
        margin="dense"
        variant="filled"
        id="principle_business_address_line_2"
        name="principle_business_address_line_2"
        label="Principal Business Address/es from which business is transacted Line 2"
        value={formik.values.principle_business_address_line_2}
        onChange={formik.handleChange}
        error={
          formik.touched.principle_business_address_line_2 &&
          Boolean(formik.errors.principle_business_address_line_2)
        }
        helperText={
          formik.touched.principle_business_address_line_2 &&
          formik.errors.principle_business_address_line_2
        }
        className="login-input"
      />
      <Row>
        <Col>
          <TextField
            fullWidth
            size="small"
            margin="dense"
            variant="filled"
            id="principle_business_address_pin_code"
            name="principle_business_address_pin_code"
            label="PIN Code"
            value={formik.values.principle_business_address_pin_code}
            onChange={formik.handleChange}
            error={
              formik.touched.principle_business_address_pin_code &&
              Boolean(formik.errors.principle_business_address_pin_code)
            }
            helperText={
              formik.touched.principle_business_address_pin_code &&
              formik.errors.principle_business_address_pin_code
            }
            className="login-input"
          />
        </Col>
        <Col>
          <TextField
            fullWidth
            size="small"
            margin="dense"
            variant="filled"
            id="principle_business_address_city"
            name="principle_business_address_city"
            label="City"
            value={formik.values.principle_business_address_city}
            onChange={formik.handleChange}
            error={
              formik.touched.principle_business_address_city &&
              Boolean(formik.errors.principle_business_address_city)
            }
            helperText={
              formik.touched.principle_business_address_city &&
              formik.errors.principle_business_address_city
            }
            className="login-input"
          />
        </Col>
        <Col>
          <TextField
            fullWidth
            size="small"
            margin="dense"
            variant="filled"
            id="principle_business_address_state"
            name="principle_business_address_state"
            label="State"
            value={formik.values.principle_business_address_state}
            onChange={formik.handleChange}
            error={
              formik.touched.principle_business_address_state &&
              Boolean(formik.errors.principle_business_address_state)
            }
            helperText={
              formik.touched.principle_business_address_state &&
              formik.errors.principle_business_address_state
            }
            className="login-input"
          />
        </Col>
      </Row>
      <TextField
        fullWidth
        size="small"
        margin="dense"
        variant="filled"
        id="principle_business_telephone"
        name="principle_business_telephone"
        label="Mobile"
        value={formik.values.principle_business_telephone}
        onChange={formik.handleChange}
        error={
          formik.touched.principle_business_telephone &&
          Boolean(formik.errors.principle_business_telephone)
        }
        helperText={
          formik.touched.principle_business_telephone &&
          formik.errors.principle_business_telephone
        }
        className="login-input"
      />
      <TextField
        fullWidth
        size="small"
        margin="dense"
        variant="filled"
        id="principle_address_email"
        name="principle_address_email"
        label="Email"
        value={formik.values.principle_address_email}
        onChange={formik.handleChange}
        error={
          formik.touched.principle_address_email &&
          Boolean(formik.errors.principle_address_email)
        }
        helperText={
          formik.touched.principle_address_email &&
          formik.errors.principle_address_email
        }
        className="login-input"
      />
      <TextField
        fullWidth
        size="small"
        margin="dense"
        variant="filled"
        id="principle_business_website"
        name="principle_business_website"
        label="Website"
        value={formik.values.principle_business_website}
        onChange={formik.handleChange}
        error={
          formik.touched.principle_business_website &&
          Boolean(formik.errors.principle_business_website)
        }
        helperText={
          formik.touched.principle_business_website &&
          formik.errors.principle_business_website
        }
        className="login-input"
      />
      <br />
      <br />
      <h4>Factory Address</h4>
      {formik.values.factory_addresses?.map((address, index) => (
        <div key={index}>
          <Row>
            <Col>
              <TextField
                fullWidth
                size="small"
                margin="dense"
                variant="filled"
                id={`factory_addresses[${index}].factory_address_line_1`}
                name={`factory_addresses[${index}].factory_address_line_1`}
                label={`Factory Address Line 1`}
                value={address.factory_address_line_1}
                onChange={formik.handleChange}
                className="login-input"
              />
            </Col>
            <Col>
              <TextField
                fullWidth
                size="small"
                margin="dense"
                variant="filled"
                id={`factory_addresses[${index}].factory_address_line_2`}
                name={`factory_addresses[${index}].factory_address_line_2`}
                label={`Factory Address Line 2`}
                value={address.factory_address_line_2}
                onChange={formik.handleChange}
                className="login-input"
              />
            </Col>
          </Row>

          <Row>
            <Col>
              <TextField
                fullWidth
                size="small"
                margin="dense"
                variant="filled"
                id={`factory_addresses[${index}].factory_address_city`}
                name={`factory_addresses[${index}].factory_address_city`}
                label={`City`}
                value={address.factory_address_city}
                onChange={formik.handleChange}
                className="login-input"
              />
            </Col>
            <Col>
              <TextField
                fullWidth
                size="small"
                margin="dense"
                variant="filled"
                id={`factory_addresses[${index}].factory_address_state`}
                name={`factory_addresses[${index}].factory_address_state`}
                label={`State`}
                value={address.factory_address_state}
                onChange={formik.handleChange}
                className="login-input"
              />
            </Col>
            <Col>
              <TextField
                fullWidth
                size="small"
                margin="dense"
                variant="filled"
                id={`factory_addresses[${index}].factory_address_pin_code`}
                name={`factory_addresses[${index}].factory_address_pin_code`}
                label="PIN Code"
                value={address.factory_address_pin_code}
                onChange={formik.handleChange}
                className="login-input"
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <TextField
                fullWidth
                size="small"
                margin="dense"
                variant="filled"
                id={`factory_addresses[${index}].gst`}
                name={`factory_addresses[${index}].gst`}
                label={`GST`}
                value={address.gst}
                onChange={formik.handleChange}
                className="login-input"
              />
            </Col>
          </Row>
          <br />
          <label htmlFor="gst_reg">GST Registration</label>
          <br />
          <input
            type="file"
            name="gst_reg"
            id=""
            onChange={(e) => handleGstRegUpload(e, index)}
          />
          <br />
          {address.gst_reg && <a href={address.gst_reg}>View</a>}
        </div>
      ))}
      <br />
      <button
        type="button"
        className="btn"
        aria-label="submit-btn"
        style={{ marginBottom: "20px", padding: "5px" }}
        onClick={handleAddField}
      >
        Add Factory/ Branch Address
      </button>
      <br />
      <br />
      <p>
        Name of Authorised Signatory/ies for signing import/export documents on
        behalf of the Firm/ Company. Please provide recent passport size self
        attested photographs of each signatory
      </p>
      <input
        type="file"
        onChange={(e) =>
          handleSingleFileUpload(
            e,
            "authorised_signatories",
            "authorised_signatories",
            formik,
            setFileSnackbar
          )
        }
      />
      <br />
      {formik.touched.authorised_signatories &&
      formik.errors.authorised_signatories ? (
        <div style={{ color: "red" }}>
          {formik.errors.authorised_signatories}
        </div>
      ) : null}
      <br />
      {formik.values.authorised_signatories && (
        <a href={formik.values.authorised_signatories}>View</a>
      )}

      <p>Upload Authorisation Letter</p>
      <input
        type="file"
        onChange={(e) =>
          handleSingleFileUpload(
            e,
            "authorisation_letter",
            "authorisation_letter",
            formik,
            setFileSnackbar
          )
        }
      />
      <br />
      {formik.touched.authorisation_letter &&
      formik.errors.authorisation_letter ? (
        <div style={{ color: "red" }}>{formik.errors.authorisation_letter}</div>
      ) : null}
      {formik.values.authorisation_letter && (
        <a href={formik.values.authorisation_letter}>View</a>
      )}
      <br />
      <TextField
        fullWidth
        size="small"
        margin="dense"
        variant="filled"
        id="iec_no"
        name="iec_no"
        label="IEC No"
        value={formik.values.iec_no}
        onChange={formik.handleChange}
        error={formik.touched.iec_no && Boolean(formik.errors.iec_no)}
        helperText={formik.touched.iec_no && formik.errors.iec_no}
        className="login-input"
      />
      <br />
      <br />
      <label style={{ marginRight: "10px" }}>IEC Copy:</label>
      <input
        type="file"
        onChange={(e) =>
          handleSingleFileUpload(
            e,
            "iec_copy",
            "iec_copy",
            formik,
            setFileSnackbar
          )
        }
      />
      <br />
      {formik.touched.iec_copy && formik.errors.iec_copy ? (
        <div style={{ color: "red" }}>{formik.errors.iec_copy}</div>
      ) : null}
      {formik.values.iec_copy && <a href={formik.values.iec_copy}>View</a>}
      <br />

      <TextField
        fullWidth
        size="small"
        margin="dense"
        variant="filled"
        id="pan_no"
        name="pan_no"
        label="PAN No"
        value={formik.values.pan_no}
        onChange={formik.handleChange}
        error={formik.touched.pan_no && Boolean(formik.errors.pan_no)}
        helperText={formik.touched.pan_no && formik.errors.pan_no}
        className="login-input"
      />
      <br />
      <br />
      <label style={{ marginRight: "10px" }}>PAN Copy:</label>
      <input
        type="file"
        onChange={(e) =>
          handleSingleFileUpload(
            e,
            "pan_copy",
            "pan_copy",
            formik,
            setFileSnackbar
          )
        }
      />
      <br />
      {formik.touched.pan_copy && formik.errors.pan_copy ? (
        <div style={{ color: "red" }}>{formik.errors.pan_copy}</div>
      ) : null}
      {formik.values.pan_copy && <a href={formik.values.pan_copy}>View</a>}
      <br />
      {formik.values.banks?.map((bank, index) => (
        <div key={index}>
          <TextField
            fullWidth
            size="small"
            margin="dense"
            variant="filled"
            id={`banks[${index}].bankers_name`}
            name={`banks[${index}].bankers_name`}
            label={`Bankers Name`}
            value={bank.bankers_name}
            onChange={formik.handleChange}
            error={
              formik.touched[`banks[${index}].bankers_name`] &&
              Boolean(formik.errors[`banks[${index}].bankers_name`])
            }
            helperText={
              formik.touched[`banks[${index}].bankers_name`] &&
              formik.errors[`banks[${index}].bankers_name`]
            }
            className="login-input"
          />
          <TextField
            fullWidth
            size="small"
            margin="dense"
            variant="filled"
            id={`banks[${index}].branch_address`}
            name={`banks[${index}].branch_address`}
            label={`Branch Address`}
            value={bank.branch_address}
            onChange={formik.handleChange}
            error={
              formik.touched[`banks[${index}].branch_address`] &&
              Boolean(formik.errors[`banks[${index}].branch_address`])
            }
            helperText={
              formik.touched[`banks[${index}].branch_address`] &&
              formik.errors[`banks[${index}].branch_address`]
            }
            className="login-input"
          />
          <br />
          <Row>
            <Col>
              <TextField
                fullWidth
                size="small"
                margin="dense"
                variant="filled"
                id={`banks[${index}].account_no`}
                name={`banks[${index}].account_no`}
                label={`Account No`}
                value={bank.account_no}
                onChange={formik.handleChange}
                error={
                  formik.touched[`banks[${index}].account_no`] &&
                  Boolean(formik.errors[`banks[${index}].account_no`])
                }
                helperText={
                  formik.touched[`banks[${index}].account_no`] &&
                  formik.errors[`banks[${index}].account_no`]
                }
                className="login-input"
              />
            </Col>
            <Col>
              <TextField
                fullWidth
                size="small"
                margin="dense"
                variant="filled"
                id={`banks[${index}].ifsc`}
                name={`banks[${index}].ifsc`}
                label={`IFSC`}
                value={bank.ifsc}
                onChange={formik.handleChange}
                error={
                  formik.touched[`banks[${index}].ifsc`] &&
                  Boolean(formik.errors[`banks[${index}].ifsc`])
                }
                helperText={
                  formik.touched[`banks[${index}].ifsc`] &&
                  formik.errors[`banks[${index}].ifsc`]
                }
                className="login-input"
              />
            </Col>
            <Col>
              <TextField
                fullWidth
                size="small"
                margin="dense"
                variant="filled"
                id={`banks[${index}].adCode`}
                name={`banks[${index}].adCode`}
                label={`AD Code`}
                value={bank.adCode}
                onChange={formik.handleChange}
                error={
                  formik.touched[`banks[${index}].adCode`] &&
                  Boolean(formik.errors[`banks[${index}].adCode`])
                }
                helperText={
                  formik.touched[`banks[${index}].adCode`] &&
                  formik.errors[`banks[${index}].adCode`]
                }
                className="login-input"
              />
            </Col>
          </Row>
          <br />
          <label htmlFor={`adCode_file_${index}`}>
            Upload AD Code File:&nbsp;
          </label>
          <input
            type="file"
            accept="application/pdf"
            id={`banks[${index}].adCode_file`}
            name={`banks[${index}].adCode_file`}
            onChange={(e) => handleAdCodeFileUpload(e, index)}
          />
          <br />
          {bank.adCode_file && <a href={bank.adCode_file}>View</a>}
        </div>
      ))}
      <button
        type="button"
        className="btn"
        aria-label="submit-btn"
        style={{ marginBottom: "20px", padding: "5px" }}
        onClick={handleAddBanks}
      >
        Add AD Code
      </button>
      {getSupportingDocs()}
      <br />
      <label style={{ marginRight: "10px" }}>Other documents:</label>
      <input
        type="file"
        multiple
        onChange={(e) =>
          handleFileUpload(
            e,
            "other_documents",
            "other_documents",
            formik,
            setFileSnackbar
          )
        }
      />
      <br />
      {formik.touched.other_documents && formik.errors.other_documents ? (
        <div style={{ color: "red" }}>{formik.errors.other_documents}</div>
      ) : null}
      {formik.values.other_documents?.length > 0 &&
        formik.values.other_documents.map((doc, index) => (
          <>
            <a key={index} href={doc}>
              View
            </a>
            <br />
          </>
        ))}
      <br />
      <label style={{ marginRight: "10px" }}>
        SPCB registration certificate
      </label>
      <input
        type="file"
        onChange={(e) =>
          handleSingleFileUpload(
            e,
            "spcb_reg",
            "spcb_reg",
            formik,
            setFileSnackbar
          )
        }
      />
      <br />
      {formik.touched.spcb_reg && formik.errors.spcb_reg ? (
        <div style={{ color: "red" }}>{formik.errors.spcb_reg}</div>
      ) : null}
      {formik.values.spcb_reg && (
        <>
          <a href={formik.values.spcb_reg}>View</a>
          <br />
        </>
      )}
      <br />
      <label style={{ marginRight: "10px" }}>KYC verification images:</label>
      <input
        type="file"
        multiple
        onChange={(e) =>
          handleFileUpload(
            e,
            "kyc_verification_images",
            "kyc_verification_images",
            formik,
            setFileSnackbar
          )
        }
      />
      <br />
      {formik.touched.kyc_verification_images &&
      formik.errors.kyc_verification_images ? (
        <div style={{ color: "red" }}>
          {formik.errors.kyc_verification_images}
        </div>
      ) : null}
      {formik.values.kyc_verification_images?.length > 0 &&
        formik.values.kyc_verification_images.map((doc, index) => (
          <>
            <a key={index} href={doc}>
              View
            </a>
            <br />
          </>
        ))}
      <br />
      <label style={{ marginRight: "10px" }}>GST Returns:</label>
      <input
        type="file"
        multiple
        onChange={(e) =>
          handleFileUpload(
            e,
            "gst_returns",
            "gst_returns",
            formik,
            setFileSnackbar
          )
        }
      />
      {formik.touched.gst_returns && formik.errors.gst_returns ? (
        <div style={{ color: "red" }}>{formik.errors.gst_returns}</div>
      ) : null}
      <br />
      {formik.values.gst_returns?.length > 0 &&
        formik.values.gst_returns.map((doc, index) => (
          <>
            <a key={index} href={doc}>
              View
            </a>

            <br />
          </>
        ))}
      <br />
      <br />
      <button
        type="button"
        className="btn"
        aria-label="submit-btn"
        style={{ marginBottom: "20px" }}
        onClick={handleOpen}
      >
        Preview
      </button>
      <button
        type="submit"
        className="btn"
        aria-label="submit-btn"
        style={{ marginBottom: "20px", marginLeft: "20px" }}
        onClick={() => setSubmitType("save_draft")}
      >
        Save draft
      </button>
      <button
        type="submit"
        className="btn"
        aria-label="submit-btn"
        style={{ marginBottom: "20px", marginLeft: "20px" }}
        onClick={() => setSubmitType("save")}
      >
        Submit
      </button>
      <Snackbar
        open={fileSnackbar}
        message="File uploaded successfully!"
        sx={{ left: "auto !important", right: "24px !important" }}
      />
      <Preview open={open} handleClose={handleClose} data={formik.values} />
    </form>
  );
}

export default React.memo(CutomerKycForm);
