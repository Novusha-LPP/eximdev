import React, { useEffect } from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import axios from "axios";
import { Row, Col } from "react-bootstrap";
import Checkbox from "@mui/material/Checkbox";
import { getCityAndStateByPinCode } from "../../../utils/getCityAndStateByPinCode";
import * as Yup from "yup";

function OrganisationMaster() {
  const validationSchema = Yup.object({
    category: Yup.string().required("Category is required"),
    name_of_individual: Yup.string().required("Name is required"),
    status: Yup.string().required("Status is required"),
    pan_no: Yup.string()
      .required("PAN number is required")
      .matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN number format"),
    factory_addresses: Yup.array().of(
      Yup.object({
        factory_address_line_1: Yup.string().required(
          "Address line 1 is required"
        ),
        factory_address_line_2: Yup.string(),
        factory_address_city: Yup.string().required("City is required"),
        factory_address_state: Yup.string().required("State is required"),
        factory_address_pin_code: Yup.string()
          .required("PIN code is required")
          .matches(/^[0-9]{6}$/, "Invalid PIN code"),
        gst: Yup.string().required("GST number is required"),
      })
    ),
    permanent_address_line_1: Yup.string().required(
      "Address line 1 is required"
    ),
    permanent_address_line_2: Yup.string(),
    permanent_address_city: Yup.string().required("City is required"),
    permanent_address_state: Yup.string().required("State is required"),
    permanent_address_pin_code: Yup.string()
      .required("PIN code is required")
      .matches(/^[0-9]{6}$/, "Invalid PIN code"),
    permanent_address_telephone: Yup.string()
      .required("Telephone number is required")
      .matches(/^\d{10}$/, "Invalid telephone number"),
    permanent_address_email: Yup.string()
      .email("Invalid email address")
      .required("Email is required"),
    principle_business_address_line_1: Yup.string().required(
      "Address line 1 is required"
    ),
    principle_business_address_line_2: Yup.string(),
    principle_business_address_city: Yup.string().required("City is required"),
    principle_business_address_state:
      Yup.string().required("State is required"),
    principle_business_address_pin_code: Yup.string().required(
      "PIN code is required"
    ),
    principle_business_telephone: Yup.string()
      .matches(/^\d{10}$/, "Invalid telephone number")
      .required("Telephone number is required"),
    principle_address_email: Yup.string()
      .email("Invalid email address")
      .required("Email is required"),
    principle_business_website: Yup.string().url("Invalid URL").nullable(),
  });

  const formik = useFormik({
    initialValues: {
      category: "",
      name_of_individual: "",
      status: "",
      pan_no: "",
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
    },

    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-srcc-organisation`,
        values
      );
      alert(res.data.message);
      resetForm();
    },
  });

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

  const handleFieldChange = (event) => {
    formik.handleChange(event);
    // Only unset sameAsPermanentAddress if it was previously checked and user starts editing a principle business address field
    if (
      formik.values.sameAsPermanentAddress &&
      event.target.name.startsWith("principle_business_address")
    ) {
      formik.setValues({
        ...formik.values,
        sameAsPermanentAddress: false,
        [event.target.name]: event.target.value,
      });
    }
  };

  return (
    <form onSubmit={formik.handleSubmit} className="feedback-form">
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
        onChange={handleFieldChange}
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
        onChange={handleFieldChange}
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
            onChange={handleFieldChange}
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
            onChange={handleFieldChange}
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
            onChange={handleFieldChange}
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
        onChange={handleFieldChange}
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
        onChange={handleFieldChange}
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
        onChange={handleFieldChange}
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
        onChange={handleFieldChange}
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
            onChange={handleFieldChange}
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
            onChange={handleFieldChange}
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
            onChange={handleFieldChange}
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
        onChange={handleFieldChange}
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
        onChange={handleFieldChange}
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
                error={
                  formik.touched.factory_addresses &&
                  formik.touched.factory_addresses[index] &&
                  Boolean(formik.errors.factory_addresses) &&
                  Boolean(
                    formik.errors.factory_addresses[index]
                      ?.factory_address_line_1
                  )
                }
                helperText={
                  formik.touched.factory_addresses &&
                  formik.touched.factory_addresses[index] &&
                  formik.errors.factory_addresses &&
                  formik.errors.factory_addresses[index]?.factory_address_line_1
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
                id={`factory_addresses[${index}].factory_address_line_2`}
                name={`factory_addresses[${index}].factory_address_line_2`}
                label={`Factory Address Line 2`}
                value={address.factory_address_line_2}
                onChange={formik.handleChange}
                error={
                  formik.touched.factory_addresses &&
                  formik.touched.factory_addresses[index] &&
                  Boolean(formik.errors.factory_addresses) &&
                  Boolean(
                    formik.errors.factory_addresses[index]
                      ?.factory_address_line_2
                  )
                }
                helperText={
                  formik.touched.factory_addresses &&
                  formik.touched.factory_addresses[index] &&
                  formik.errors.factory_addresses &&
                  formik.errors.factory_addresses[index]?.factory_address_line_2
                }
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
                error={
                  formik.touched.factory_addresses &&
                  formik.touched.factory_addresses[index] &&
                  Boolean(formik.errors.factory_addresses) &&
                  Boolean(
                    formik.errors.factory_addresses[index]?.factory_address_city
                  )
                }
                helperText={
                  formik.touched.factory_addresses &&
                  formik.touched.factory_addresses[index] &&
                  formik.errors.factory_addresses &&
                  formik.errors.factory_addresses[index]?.factory_address_city
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
                id={`factory_addresses[${index}].factory_address_state`}
                name={`factory_addresses[${index}].factory_address_state`}
                label={`State`}
                value={address.factory_address_state}
                onChange={formik.handleChange}
                error={
                  formik.touched.factory_addresses &&
                  formik.touched.factory_addresses[index] &&
                  Boolean(formik.errors.factory_addresses) &&
                  Boolean(
                    formik.errors.factory_addresses[index]
                      ?.factory_address_state
                  )
                }
                helperText={
                  formik.touched.factory_addresses &&
                  formik.touched.factory_addresses[index] &&
                  formik.errors.factory_addresses &&
                  formik.errors.factory_addresses[index]?.factory_address_state
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
                id={`factory_addresses[${index}].factory_address_pin_code`}
                name={`factory_addresses[${index}].factory_address_pin_code`}
                label="PIN Code"
                value={address.factory_address_pin_code}
                onChange={formik.handleChange}
                error={
                  formik.touched.factory_addresses &&
                  formik.touched.factory_addresses[index] &&
                  Boolean(formik.errors.factory_addresses) &&
                  Boolean(
                    formik.errors.factory_addresses[index]
                      ?.factory_address_pin_code
                  )
                }
                helperText={
                  formik.touched.factory_addresses &&
                  formik.touched.factory_addresses[index] &&
                  formik.errors.factory_addresses &&
                  formik.errors.factory_addresses[index]
                    ?.factory_address_pin_code
                }
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
                error={
                  formik.touched.factory_addresses &&
                  formik.touched.factory_addresses[index] &&
                  Boolean(formik.errors.factory_addresses) &&
                  Boolean(formik.errors.factory_addresses[index]?.gst)
                }
                helperText={
                  formik.touched.factory_addresses &&
                  formik.touched.factory_addresses[index] &&
                  formik.errors.factory_addresses &&
                  formik.errors.factory_addresses[index]?.gst
                }
                className="login-input"
              />
            </Col>
          </Row>
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

      <button
        type="submit"
        className="btn"
        aria-label="submit-btn"
        style={{ marginBottom: "20px" }}
      >
        Submit
      </button>
    </form>
  );
}

export default React.memo(OrganisationMaster);
