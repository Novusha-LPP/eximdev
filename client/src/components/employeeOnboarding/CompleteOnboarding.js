import React, { useContext, useState } from "react";
import { useFormik } from "formik";
import { MenuItem, TextField } from "@mui/material";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import Snackbar from "@mui/material/Snackbar";
import { handleSingleFileUpload } from "../../utils/awsSingleFileUpload";
import { validationSchema } from "../../schemas/employeeOnboarding/completeOnboarding";

// Compact Field Component
const Field = ({ label, children }) => (
  <div className="hr-compact-field">
    <label className="hr-field-label">{label}</label>
    {children}
  </div>
);

// Compact File Upload
const FileUpload = ({ label, field, accept = "*/*", formik, setFileSnackbar }) => (
  <div className={`hr-compact-file-upload ${formik.values[field] ? 'uploaded' : ''}`}>
    <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--hr-text-label)' }}>{label}</span>
    <input
      type="file"
      accept={accept}
      onChange={(e) =>
        handleSingleFileUpload(e, field, "kyc", formik, setFileSnackbar)
      }
    />
    {formik.values[field] && (
      <span className="file-status">
        ✓ <a href={formik.values[field]} target="_blank" rel="noopener noreferrer">View</a>
      </span>
    )}
    {formik.touched[field] && formik.errors[field] && (
      <span style={{ color: 'var(--hr-error)', fontSize: '0.7rem' }}>{formik.errors[field]}</span>
    )}
  </div>
);

function CompleteOnboarding() {
  const { user, setUser } = useContext(UserContext);
  const [fileSnackbar, setFileSnackbar] = useState(false);

  const refreshUser = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/me`, { withCredentials: true });
      setUser(res.data);
    } catch (e) {
      console.error("Error refreshing user data", e);
    }
  };

  const formik = useFormik({
    initialValues: {
      skill: user?.skill || "",
      company_policy_visited: user?.company_policy_visited || "",
      introduction_with_md: user?.introduction_with_md || "",
      employee_photo: user?.employee_photo || "",
      resume: user?.resume || "",
      address_proof: user?.address_proof || "",
      nda: user?.nda || "",
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/complete-onboarding`,
        { ...values, username: user.username }
      );
      alert(res.data.message);
      resetForm();
      await refreshUser();
    },
  });

  const employee_name = [user.first_name, user.middle_name, user.last_name]
    .filter(Boolean)
    .join(" ");



  return (
    <form onSubmit={formik.handleSubmit}>
      {/* Employee Header */}
      <div className="hr-compact-employee-header">
        <div className="emp-avatar">{employee_name.charAt(0)}</div>
        <div className="emp-info">
          <span className="emp-name">{employee_name}</span>
          <span className="emp-detail">Email: {user.email}</span>
          <span className="emp-detail">Company: {user.company}</span>
          <span className="emp-detail">Type: {user.employment_type}</span>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="hr-compact-layout">
        {/* LEFT COLUMN */}
        <div>
          {/* Skills & Compliance */}
          <div className="hr-compact-section">
            <div className="hr-section-header">Skills & Compliance</div>
            <div className="hr-section-body">
              <div className="hr-compact-grid cols-1">
                <Field label="Skill / Hobby">
                  <TextField
                    size="small"
                    variant="filled"
                    fullWidth
                    name="skill"
                    value={formik.values.skill}
                    onChange={formik.handleChange}
                    error={formik.touched.skill && Boolean(formik.errors.skill)}
                    helperText={formik.touched.skill && formik.errors.skill}
                    className="hr-quick-input"
                    placeholder="Enter your skill or hobby"
                  />
                </Field>
              </div>
              <div className="hr-compact-grid cols-2" style={{ marginTop: '10px' }}>
                <Field label="Company Policy Reviewed?">
                  <TextField
                    select
                    size="small"
                    variant="filled"
                    fullWidth
                    name="company_policy_visited"
                    value={formik.values.company_policy_visited}
                    onChange={formik.handleChange}
                    error={formik.touched.company_policy_visited && Boolean(formik.errors.company_policy_visited)}
                    helperText={formik.touched.company_policy_visited && formik.errors.company_policy_visited}
                    className="hr-quick-input"
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </TextField>
                </Field>
                <Field label="Introduction with MD?">
                  <TextField
                    select
                    size="small"
                    variant="filled"
                    fullWidth
                    name="introduction_with_md"
                    value={formik.values.introduction_with_md}
                    onChange={formik.handleChange}
                    error={formik.touched.introduction_with_md && Boolean(formik.errors.introduction_with_md)}
                    helperText={formik.touched.introduction_with_md && formik.errors.introduction_with_md}
                    className="hr-quick-input"
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </TextField>
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Document Uploads */}
          <div className="hr-compact-section">
            <div className="hr-section-header">Document Uploads</div>
            <div className="hr-section-body">
              <div className="hr-compact-grid cols-2">
                <FileUpload label="Employee Photo" field="employee_photo" accept="image/*" formik={formik} setFileSnackbar={setFileSnackbar} />
                <FileUpload label="Resume / CV" field="resume" accept=".pdf,.doc,.docx" formik={formik} setFileSnackbar={setFileSnackbar} />
                <FileUpload label="Address Proof" field="address_proof" formik={formik} setFileSnackbar={setFileSnackbar} />
                {user.company === "Alluvium IoT Solutions Private Limited" && (
                  <FileUpload label="Signed NDA" field="nda" accept=".pdf" formik={formik} setFileSnackbar={setFileSnackbar} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="hr-btn-row">
        <button className="hr-compact-btn hr-compact-btn-primary" type="submit">
          Complete Onboarding
        </button>
      </div>

      <Snackbar
        open={fileSnackbar}
        message="File uploaded successfully!"
        sx={{ left: "auto !important", right: "24px !important" }}
      />
    </form>
  );
}

export default React.memo(CompleteOnboarding);
