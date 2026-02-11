import React, { useContext, useState } from "react";
import { useFormik } from "formik";
import { MenuItem, TextField } from "@mui/material";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import Snackbar from "@mui/material/Snackbar";
import { IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import FileUpload from "../gallery/FileUpload";

import { validationSchema } from "../../schemas/employeeOnboarding/completeOnboarding";

// Compact Field Component
const Field = ({ label, children }) => (
  <div className="hr-compact-field">
    <label className="hr-field-label">{label}</label>
    {children}
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

  // Handle file upload callback from FileUpload component
  const handleFilesUploaded = (field) => (uploadedUrls, replaceMode) => {
    if (uploadedUrls && uploadedUrls.length > 0) {
      // For single file fields, take the first URL
      formik.setFieldValue(field, uploadedUrls[0]);
      setFileSnackbar(true);
    }
  };

  // Handle file deletion from S3
  const handleDeleteFile = async (field) => {
    const fileUrl = formik.values[field];
    if (!fileUrl) return;
    
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    
    try {
      const key = new URL(fileUrl).pathname.slice(1); // Extract key from URL
      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/delete-s3-file`,
        { key }
      );
      
      if (response.status === 200) {
        formik.setFieldValue(field, "");
        setFileSnackbar(true);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file");
    }
  };


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
                <div className="hr-upload-item" style={{ marginBottom: '16px' }}>
                  <span className="hr-upload-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '4px' }}>Employee Photo</span>
                  <div className="hr-upload-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileUpload
                      label="Upload"
                      onFilesUploaded={handleFilesUploaded("employee_photo")}
                      bucketPath="kyc"
                      singleFileOnly={true}
                      acceptedFileTypes={["image/*"]}
                      buttonSx={{ fontSize: '0.7rem', padding: '4px 12px', minWidth: 'auto' }}
                    />
                    {formik.values.employee_photo && (
                      <div className="hr-upload-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a href={formik.values.employee_photo} target="_blank" rel="noopener noreferrer" className="hr-view-link" style={{ fontSize: '0.8rem', color: '#1976d2', textDecoration: 'none' }}>View</a>
                        <IconButton size="small" color="error" onClick={() => handleDeleteFile("employee_photo")}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    )}
                  </div>
                  {formik.touched.employee_photo && formik.errors.employee_photo && (
                    <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px' }}>
                      {formik.errors.employee_photo}
                    </div>
                  )}
                </div>

                <div className="hr-upload-item" style={{ marginBottom: '16px' }}>
                  <span className="hr-upload-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '4px' }}>Resume / CV</span>
                  <div className="hr-upload-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileUpload
                      label="Upload"
                      onFilesUploaded={handleFilesUploaded("resume")}
                      bucketPath="kyc"
                      singleFileOnly={true}
                      acceptedFileTypes={[".pdf", ".doc", ".docx"]}
                      buttonSx={{ fontSize: '0.7rem', padding: '4px 12px', minWidth: 'auto' }}
                    />
                    {formik.values.resume && (
                      <div className="hr-upload-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a href={formik.values.resume} target="_blank" rel="noopener noreferrer" className="hr-view-link" style={{ fontSize: '0.8rem', color: '#1976d2', textDecoration: 'none' }}>View</a>
                        <IconButton size="small" color="error" onClick={() => handleDeleteFile("resume")}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    )}
                  </div>
                  {formik.touched.resume && formik.errors.resume && (
                    <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px' }}>
                      {formik.errors.resume}
                    </div>
                  )}
                </div>

                <div className="hr-upload-item" style={{ marginBottom: '16px' }}>
                  <span className="hr-upload-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '4px' }}>Address Proof</span>
                  <div className="hr-upload-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileUpload
                      label="Upload"
                      onFilesUploaded={handleFilesUploaded("address_proof")}
                      bucketPath="kyc"
                      singleFileOnly={true}
                      acceptedFileTypes={["image/*", ".pdf"]}
                      buttonSx={{ fontSize: '0.7rem', padding: '4px 12px', minWidth: 'auto' }}
                    />
                    {formik.values.address_proof && (
                      <div className="hr-upload-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a href={formik.values.address_proof} target="_blank" rel="noopener noreferrer" className="hr-view-link" style={{ fontSize: '0.8rem', color: '#1976d2', textDecoration: 'none' }}>View</a>
                        <IconButton size="small" color="error" onClick={() => handleDeleteFile("address_proof")}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    )}
                  </div>
                  {formik.touched.address_proof && formik.errors.address_proof && (
                    <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px' }}>
                      {formik.errors.address_proof}
                    </div>
                  )}
                </div>

                {user.company === "Alluvium IoT Solutions Private Limited" && (
                  <div className="hr-upload-item" style={{ marginBottom: '16px' }}>
                    <span className="hr-upload-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '4px' }}>Signed NDA</span>
                    <div className="hr-upload-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileUpload
                        label="Upload"
                        onFilesUploaded={handleFilesUploaded("nda")}
                        bucketPath="kyc"
                        singleFileOnly={true}
                        acceptedFileTypes={[".pdf"]}
                        buttonSx={{ fontSize: '0.7rem', padding: '4px 12px', minWidth: 'auto' }}
                      />
                      {formik.values.nda && (
                        <div className="hr-upload-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <a href={formik.values.nda} target="_blank" rel="noopener noreferrer" className="hr-view-link" style={{ fontSize: '0.8rem', color: '#1976d2', textDecoration: 'none' }}>View</a>
                          <IconButton size="small" color="error" onClick={() => handleDeleteFile("nda")}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </div>
                      )}
                    </div>
                  </div>
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
