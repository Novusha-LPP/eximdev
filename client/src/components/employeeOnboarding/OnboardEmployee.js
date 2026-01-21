import React from "react";
import { useFormik } from "formik";
import { MenuItem, TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../schemas/employeeOnboarding/onboardEmployee";

function OnboardEmployee() {
  const formik = useFormik({
    initialValues: {
      first_name: "",
      middle_name: "",
      last_name: "",
      email: "",
      company: "",
      employment_type: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/onboard-employee`,
        values
      );
      alert(res.data.message);
      resetForm();
    },
  });

  // Compact Field Component
  const Field = ({ label, children }) => (
    <div className="hr-compact-field">
      <label className="hr-field-label">{label}</label>
      {children}
    </div>
  );

  return (
    <form onSubmit={formik.handleSubmit}>
      {/* Two Column Layout */}
      <div className="hr-compact-layout">
        {/* LEFT COLUMN - Personal Details */}
        <div>
          <div className="hr-compact-section">
            <div className="hr-section-header">Personal Details</div>
            <div className="hr-section-body">
              <div className="hr-compact-grid cols-3">
                <Field label="First Name">
                  <TextField
                    size="small"
                    variant="filled"
                    fullWidth
                    name="first_name"
                    value={formik.values.first_name}
                    onChange={formik.handleChange}
                    error={formik.touched.first_name && Boolean(formik.errors.first_name)}
                    className="hr-quick-input"
                    placeholder="Enter first name"
                  />
                </Field>
                <Field label="Middle Name">
                  <TextField
                    size="small"
                    variant="filled"
                    fullWidth
                    name="middle_name"
                    value={formik.values.middle_name}
                    onChange={formik.handleChange}
                    error={formik.touched.middle_name && Boolean(formik.errors.middle_name)}
                    className="hr-quick-input"
                    placeholder="Enter middle name"
                  />
                </Field>
                <Field label="Last Name">
                  <TextField
                    size="small"
                    variant="filled"
                    fullWidth
                    name="last_name"
                    value={formik.values.last_name}
                    onChange={formik.handleChange}
                    error={formik.touched.last_name && Boolean(formik.errors.last_name)}
                    className="hr-quick-input"
                    placeholder="Enter last name"
                  />
                </Field>
              </div>
              <div className="hr-compact-grid cols-1" style={{ marginTop: '10px' }}>
                <Field label="Email Address">
                  <TextField
                    size="small"
                    variant="filled"
                    fullWidth
                    name="email"
                    type="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    error={formik.touched.email && Boolean(formik.errors.email)}
                    className="hr-quick-input"
                    placeholder="Enter email address"
                  />
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Employment Details */}
        <div>
          <div className="hr-compact-section">
            <div className="hr-section-header">Employment Details</div>
            <div className="hr-section-body">
              <div className="hr-compact-grid cols-1">
                <Field label="Company">
                  <TextField
                    select
                    size="small"
                    variant="filled"
                    fullWidth
                    name="company"
                    value={formik.values.company}
                    onChange={formik.handleChange}
                    error={formik.touched.company && Boolean(formik.errors.company)}
                    className="hr-quick-input"
                  >
                    <MenuItem value="">Select Company</MenuItem>
                    <MenuItem value="Suraj Forwarders Private Limited">Suraj Forwarders Private Limited</MenuItem>
                    <MenuItem value="Suraj Forwarders & Shipping Agencies">Suraj Forwarders & Shipping Agencies</MenuItem>
                    <MenuItem value="Suraj Forwarders">Suraj Forwarders</MenuItem>
                    <MenuItem value="EXIMBIZ Enterprise">EXIMBIZ Enterprise</MenuItem>
                    <MenuItem value="Sansar Tradelink">Sansar Tradelink</MenuItem>
                    <MenuItem value="Paramount Propack Private Limited">Paramount Propack Private Limited</MenuItem>
                    <MenuItem value="SR Container Carriers">SR Container Carriers</MenuItem>
                    <MenuItem value="RABS Industries India Private Limited">RABS Industries India Private Limited</MenuItem>
                    <MenuItem value="Novusha Consulting Services India LLP">Novusha Consulting Services India LLP</MenuItem>
                    <MenuItem value="Alluvium IoT Solutions Private Limited">Alluvium IoT Solutions Private Limited</MenuItem>
                  </TextField>
                </Field>
                <Field label="Employment Type">
                  <TextField
                    select
                    size="small"
                    variant="filled"
                    fullWidth
                    name="employment_type"
                    value={formik.values.employment_type}
                    onChange={formik.handleChange}
                    error={formik.touched.employment_type && Boolean(formik.errors.employment_type)}
                    className="hr-quick-input"
                  >
                    <MenuItem value="">Select Type</MenuItem>
                    <MenuItem value="Internship">Internship</MenuItem>
                    <MenuItem value="Probation">Probation</MenuItem>
                    <MenuItem value="Permanent">Permanent</MenuItem>
                  </TextField>
                </Field>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="hr-btn-row">
        <button className="hr-compact-btn hr-compact-btn-primary" type="submit">
          Onboard Employee
        </button>
      </div>
    </form>
  );
}

export default React.memo(OnboardEmployee);
