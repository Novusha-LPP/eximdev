import React, { useContext, useState, useEffect } from "react";
import { useFormik } from "formik";
import { MenuItem, TextField, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import { useParams, useNavigate } from "react-router-dom";
import { states } from "../../assets/data/statesData";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Snackbar from "@mui/material/Snackbar";
import { validationSchema } from "../../schemas/employeeKyc/completeKyc";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FileUpload from "../gallery/FileUpload";

// Compact Field Component
const Field = ({ label, children, fullWidth }) => (
  <div className={`hr-compact-field ${fullWidth ? 'full-width' : ''}`}>
    <label className="hr-field-label">{label}</label>
    {children}
  </div>
);

function CompleteKYC() {
  const { username } = useParams(); // Get username from URL (if admin editing)
  const navigate = useNavigate();
  const [numChildren, setNumChildren] = useState("");
  const { user: currentUser, setUser } = useContext(UserContext); // Rename context user to currentUser
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const [targetUser, setTargetUser] = useState(null); // The user being edited

  // Determine which user data to use - prioritize fetched targetUser
  const user = targetUser || currentUser;

  useEffect(() => {
    // Determine the username to fetch: either from URL param or current logged-in user
    const usernameToFetch = username || currentUser?.username;

    if (usernameToFetch) {
      const fetchUserData = async () => {
        try {
          const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-user-data/${usernameToFetch}`);
          setTargetUser(res.data);
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Only alert if we were trying to fetch a specific user from URL, 
          // otherwise silent fail or rely on context might be safer, but user asked to use this API.
          if (username) alert("Failed to fetch user data");
        }
      };
      
      // Delay slightly to avoid race conditions or just call it
      fetchUserData();
    }
  }, [username, currentUser?.username]);

  const refreshUser = async () => {
    // Modified to also refresh via the specific API if needed, 
    // but the main data source is now targetUser which updates on mount.
    // Kept /me for context consistency if needed elsewhere.
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/me`, { withCredentials: true });
      setUser(res.data);
      
      // Also update targetUser to ensure immediate reflection
      if (res.data.username) {
         const detailedRes = await axios.get(`${process.env.REACT_APP_API_STRING}/get-user-data/${res.data.username}`);
         setTargetUser(detailedRes.data);
      }
    } catch (e) {
      console.error("Error refreshing user data", e);
    }
  };

  const formik = useFormik({
    initialValues: {
      designation: user?.designation || "",
      company: user?.company || "",
      employment_type: user?.employment_type || "",
      department: user?.department || "",
      joining_date: user?.joining_date || "",
      dob: user?.dob || "",
      permanent_address_line_1: user?.permanent_address_line_1 || "",
      permanent_address_line_2: user?.permanent_address_line_2 || "",
      permanent_address_city: user?.permanent_address_city || "",
      permanent_address_area: user?.permanent_address_area || "",
      permanent_address_state: user?.permanent_address_state || "",
      permanent_address_pincode: user?.permanent_address_pincode || "",
      communication_address_line_1: user?.communication_address_line_1 || "",
      communication_address_line_2: user?.communication_address_line_2 || "",
      communication_address_city: user?.communication_address_city || "",
      communication_address_area: user?.communication_address_area || "",
      communication_address_state: user?.communication_address_state || "",
      communication_address_pincode: user?.communication_address_pincode || "",
      personal_email: user?.personal_email || "",
      official_email: user?.official_email || "",
      mobile: user?.mobile || "",
      emergency_contact: user?.emergency_contact || "",
      emergency_contact_name: user?.emergency_contact_name || "",
      family_members: user?.family_members || [],
      close_friend_contact_no: user?.close_friend_contact_no || "",
      close_friend_contact_name: user?.close_friend_contact_name || "",
      blood_group: user?.blood_group || "",
      highest_qualification: user?.highest_qualification || "",
      aadhar_no: user?.aadhar_no || "",
      aadhar_photo_front: user?.aadhar_photo_front || "",
      aadhar_photo_back: user?.aadhar_photo_back || "",
      pan_no: user?.pan_no || "",
      pan_photo: user?.pan_photo || "",
      pf_no: user?.pf_no || "",
      esic_no: user?.esic_no || "",
      insurance_status: user?.insurance_status || [],
      insurance_not_applicable: user?.insurance_not_applicable || false,
      pf_not_applicable: user?.pf_not_applicable || false,
      esic_not_applicable: user?.esic_not_applicable || false,
      license_front: user?.license_front || "",
      license_back: user?.license_back || "",
      bank_account_no: user?.bank_account_no || "",
      bank_name: user?.bank_name || "",
      ifsc_code: user?.ifsc_code || "",
      favorite_song: user?.favorite_song || "",
      marital_status: user?.marital_status || "",
      children_details: user?.children_details || [],
    },
    enableReinitialize: true,
    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/complete-kyc`,
        { ...values, username: user.username }
      );
      alert(res.data.message);
      if (username) {
        // If editing another user, reload their data
        const refreshRes = await axios.get(`${process.env.REACT_APP_API_STRING}/get-user-data/${username}`);
        setTargetUser(refreshRes.data);
      } else {
        // If editing self, refresh context
        await refreshUser();
      }
    },
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [childrenDetails, setChildrenDetails] = useState([]);

  // Set initial Edit Mode based on data existence
  useEffect(() => {
    if (user && Object.keys(user).length > 0) {
      const hasData = user.designation || user.joining_date;
      setIsEditMode(!hasData);
    }
  }, [user]);

  // Sync Formik family_members with childrenDetails state
  useEffect(() => {
    if (formik.values.children_details) {
      setChildrenDetails(formik.values.children_details);
    }
  }, [formik.values.children_details]);

  // Show loading if editing another user and data not yet fetched
  if (username && !targetUser) {
    return <div className="hr-page-container">Loading user details...</div>;
  }

  const handleAddChild = () => {
    const newChild = { gender: "", age_group: "" };
    const updatedDetails = [...childrenDetails, newChild];
    setChildrenDetails(updatedDetails);
    formik.setFieldValue("children_details", updatedDetails);
    
    // Also update family_members array for backward compatibility if needed, 
    // or just rely on children_details for the new logic
    const currentMembers = formik.values.family_members || [];
    if (!currentMembers.includes("Children")) {
      formik.setFieldValue("family_members", [...currentMembers, "Children"]);
    }
  };

  const handleRemoveChild = (index) => {
    const updatedDetails = childrenDetails.filter((_, i) => i !== index);
    setChildrenDetails(updatedDetails);
    formik.setFieldValue("children_details", updatedDetails);
    
    if (updatedDetails.length === 0) {
      const currentMembers = formik.values.family_members || [];
      formik.setFieldValue("family_members", currentMembers.filter(m => m !== "Children"));
    }
  };

  const handleChildDetailChange = (index, field, value) => {
    const updatedDetails = [...childrenDetails];
    updatedDetails[index] = { ...updatedDetails[index], [field]: value };
    setChildrenDetails(updatedDetails);
    formik.setFieldValue("children_details", updatedDetails);
  };


  const handleSameAsPermanentAddress = (event) => {
    if (event.target.checked) {
      formik.setValues({
        ...formik.values,
        communication_address_line_1: formik.values.permanent_address_line_1,
        communication_address_line_2: formik.values.permanent_address_line_2,
        communication_address_city: formik.values.permanent_address_city,
        communication_address_area: formik.values.permanent_address_area,
        communication_address_state: formik.values.permanent_address_state,
        communication_address_pincode: formik.values.permanent_address_pincode,
      });
    } else {
      formik.setValues({
        ...formik.values,
        communication_address_line_1: "",
        communication_address_line_2: "",
        communication_address_city: "",
        communication_address_area: "",
        communication_address_state: "",
        communication_address_pincode: "",
      });
    }
  };

  const handlePincodeChange = (event, field) => {
    const { value } = event.target;
    const newValue = value.replace(/\D/g, "").slice(0, 6);
    formik.setFieldValue(field, newValue);
  };

  const handleFamilyMemberChange = (event) => {
    const member = event.target.name;
    const isChecked = event.target.checked;
    const currentMembers = formik.values.family_members;
    let updatedMembers = isChecked
      ? [...currentMembers, member]
      : currentMembers.filter((m) => m !== member);
    formik.setFieldValue("family_members", updatedMembers);
  };

  const handleAadharNoChange = (event) => {
    const { value } = event.target;
    const newValue = value.replace(/\D/g, "").slice(0, 12);
    formik.setFieldValue("aadhar_no", newValue);
  };

  // Handle file upload callback from FileUpload component
  const handleFilesUploaded = (field) => (uploadedUrls, replaceMode) => {
    if (uploadedUrls && uploadedUrls.length > 0) {
      // For single file fields, take the first URL
      formik.setFieldValue(field, uploadedUrls[0]);
      setFileSnackbar(true);
      setTimeout(() => setFileSnackbar(false), 3000);
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
        setTimeout(() => setFileSnackbar(false), 3000);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file");
    }
  };

  // Handle insurance not applicable change
  const handleInsuranceNotApplicableChange = (event) => {
    const isNotApplicable = event.target.value === "not_applicable";
    formik.setFieldValue("insurance_not_applicable", isNotApplicable);
    if (isNotApplicable) {
      // Clear insurance related fields when not applicable
      formik.setFieldValue("insurance_status", []);
      // PF and ESIC are now independent of insurance status
    }
  };

  // Handle insurance checkbox changes
  const handleInsuranceDetailsChange = (event) => {
    const member = event.target.name;
    const isChecked = event.target.checked;
    const currentMembers = formik.values.insurance_status || [];
    let updatedMembers = isChecked
      ? [...currentMembers, member]
      : currentMembers.filter((m) => m !== member);
    formik.setFieldValue("insurance_status", updatedMembers);
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
        </div>
        <FormControlLabel
          control={<Checkbox checked={isEditMode} onChange={(e) => setIsEditMode(e.target.checked)} color="primary" />}
          label="Edit Mode"
          style={{ marginLeft: 'auto', marginRight: '16px' }}
        />
        {username && (
          <button
            type="button"
            className="hr-compact-btn hr-compact-btn-secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="hr-compact-layout">
        {/* LEFT COLUMN */}
        <div>
          {/* Basic Information */}
          <div className="hr-compact-section">
            <div className="hr-section-header">Basic Information</div>
            <div className="hr-section-body">
              <div className="hr-compact-grid cols-2">
                <Field label="Designation">
                  <TextField size="small" variant="filled" fullWidth name="designation" value={formik.values.designation} onChange={formik.handleChange} error={formik.touched.designation && Boolean(formik.errors.designation)} helperText={formik.touched.designation && formik.errors.designation} className="hr-quick-input" placeholder="Enter designation" disabled={!isEditMode} />
                </Field>
                <div style={{ display: 'contents' }}>
                  <Field label="Company">
                    <TextField select size="small" variant="filled" fullWidth name="company" value={formik.values.company} onChange={formik.handleChange} error={formik.touched.company && Boolean(formik.errors.company)} helperText={formik.touched.company && formik.errors.company} className="hr-quick-input" disabled={!isEditMode}>
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
                    <TextField select size="small" variant="filled" fullWidth name="employment_type" value={formik.values.employment_type} onChange={formik.handleChange} error={formik.touched.employment_type && Boolean(formik.errors.employment_type)} helperText={formik.touched.employment_type && formik.errors.employment_type} className="hr-quick-input" disabled={!isEditMode || user?.role !== "Admin"}>
                      <MenuItem value="">Select Type</MenuItem>
                      <MenuItem value="Internship">Internship</MenuItem>
                      <MenuItem value="Probation">Probation</MenuItem>
                      <MenuItem value="Permanent">Permanent</MenuItem>
                    </TextField>
                  </Field>
                </div>
                <Field label="Department">
                  <TextField select size="small" variant="filled" fullWidth name="department" value={formik.values.department} onChange={formik.handleChange} error={formik.touched.department && Boolean(formik.errors.department)} helperText={formik.touched.department && formik.errors.department} className="hr-quick-input" disabled={!isEditMode}>
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Import">Import</MenuItem>
                    <MenuItem value="Export">Export</MenuItem>
                    <MenuItem value="Operations">Operations</MenuItem>
                    <MenuItem value="Accounts">Accounts</MenuItem>
                    <MenuItem value="Field">Field</MenuItem>
                    <MenuItem value="DGFT">DGFT</MenuItem>
                    <MenuItem value="Office Assistant">Office Assistant</MenuItem>
                    <MenuItem value="Software Development">Software Development</MenuItem>
                    <MenuItem value="Designing">Designing</MenuItem>
                    <MenuItem value="Sales & Marketing">Sales & Marketing</MenuItem>
                    <MenuItem value="HR Admin">HR Admin</MenuItem>
                  </TextField>
                </Field>
                <Field label="Joining Date">
                  <DatePicker 
                    slotProps={{ textField: { size: 'small', variant: 'filled', fullWidth: true, error: formik.touched.joining_date && Boolean(formik.errors.joining_date), helperText: formik.touched.joining_date && formik.errors.joining_date, className: "hr-quick-input", disabled: !isEditMode } }}
                    format="dd-MM-yyyy"
                    value={formik.values.joining_date ? new Date(formik.values.joining_date) : null}
                    onChange={(val) => {
                      if (val && !isNaN(val)) {
                         const year = val.getFullYear();
                         const month = String(val.getMonth() + 1).padStart(2, '0');
                         const day = String(val.getDate()).padStart(2, '0');
                         formik.setFieldValue("joining_date", `${year}-${month}-${day}`);
                      } else {
                         formik.setFieldValue("joining_date", "");
                      }
                    }}
                  />
                </Field>
                <Field label="Date of Birth">
                  <DatePicker 
                    slotProps={{ textField: { size: 'small', variant: 'filled', fullWidth: true, error: formik.touched.dob && Boolean(formik.errors.dob), helperText: formik.touched.dob && formik.errors.dob, className: "hr-quick-input", disabled: !isEditMode } }}
                    format="dd-MM-yyyy"
                    value={formik.values.dob ? new Date(formik.values.dob) : null}
                     onChange={(val) => {
                      if (val && !isNaN(val)) {
                         const year = val.getFullYear();
                         const month = String(val.getMonth() + 1).padStart(2, '0');
                         const day = String(val.getDate()).padStart(2, '0');
                         formik.setFieldValue("dob", `${year}-${month}-${day}`);
                      } else {
                         formik.setFieldValue("dob", "");
                      }
                    }}
                  />
                </Field>
                <Field label="Blood Group">
                  <TextField size="small" variant="filled" fullWidth name="blood_group" value={formik.values.blood_group} onChange={formik.handleChange} error={formik.touched.blood_group && Boolean(formik.errors.blood_group)} helperText={formik.touched.blood_group && formik.errors.blood_group} className="hr-quick-input" placeholder="Enter blood group" disabled={!isEditMode} />
                </Field>
                <Field label="Highest Qualification">
                  <TextField size="small" variant="filled" fullWidth name="highest_qualification" value={formik.values.highest_qualification} onChange={formik.handleChange} error={formik.touched.highest_qualification && Boolean(formik.errors.highest_qualification)} helperText={formik.touched.highest_qualification && formik.errors.highest_qualification} className="hr-quick-input" placeholder="Enter qualification" disabled={!isEditMode} />
                </Field>
              </div>
              <div style={{ marginTop: '10px' }}>
                <label className="hr-field-label">Marital Status</label>
                <RadioGroup row name="marital_status" value={formik.values.marital_status} onChange={formik.handleChange} className="hr-compact-radio-group">
                  <FormControlLabel value="single" control={<Radio size="small" />} label="Single" disabled={!isEditMode} />
                  <FormControlLabel value="married" control={<Radio size="small" />} label="Married" disabled={!isEditMode} />
                  <FormControlLabel value="widowed" control={<Radio size="small" />} label="Widowed" disabled={!isEditMode} />
                  <FormControlLabel value="divroced" control={<Radio size="small" />} label="Divorced" disabled={!isEditMode} />
                </RadioGroup>
                {formik.touched.marital_status && formik.errors.marital_status && (
                  <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '3px' }}>{formik.errors.marital_status}</div>
                )}
              </div>
            </div>
          </div>

          {/* Permanent Address */}
          <div className="hr-compact-section">
            <div className="hr-section-header">Permanent Address</div>
            <div className="hr-section-body">
              <div className="hr-compact-grid cols-1">
                <Field label="Address Line 1">
                  <TextField size="small" variant="filled" fullWidth name="permanent_address_line_1" value={formik.values.permanent_address_line_1} onChange={formik.handleChange} error={formik.touched.permanent_address_line_1 && Boolean(formik.errors.permanent_address_line_1)} helperText={formik.touched.permanent_address_line_1 && formik.errors.permanent_address_line_1} className="hr-quick-input" disabled={!isEditMode} />
                </Field>
                <Field label="Address Line 2">
                  <TextField size="small" variant="filled" fullWidth name="permanent_address_line_2" value={formik.values.permanent_address_line_2} onChange={formik.handleChange} error={formik.touched.permanent_address_line_2 && Boolean(formik.errors.permanent_address_line_2)} helperText={formik.touched.permanent_address_line_2 && formik.errors.permanent_address_line_2} className="hr-quick-input" disabled={!isEditMode} />
                </Field>
              </div>
              <div className="hr-compact-grid cols-4" style={{ marginTop: '8px' }}>
                <Field label="City">
                  <TextField size="small" variant="filled" fullWidth name="permanent_address_city" value={formik.values.permanent_address_city} onChange={formik.handleChange} error={formik.touched.permanent_address_city && Boolean(formik.errors.permanent_address_city)} helperText={formik.touched.permanent_address_city && formik.errors.permanent_address_city} className="hr-quick-input" disabled={!isEditMode} />
                </Field>
                <Field label="Area">
                  <TextField size="small" variant="filled" fullWidth name="permanent_address_area" value={formik.values.permanent_address_area} onChange={formik.handleChange} error={formik.touched.permanent_address_area && Boolean(formik.errors.permanent_address_area)} helperText={formik.touched.permanent_address_area && formik.errors.permanent_address_area} className="hr-quick-input" disabled={!isEditMode} />
                </Field>
                <Field label="State">
                  <TextField select size="small" variant="filled" fullWidth name="permanent_address_state" value={formik.values.permanent_address_state} onChange={formik.handleChange} error={formik.touched.permanent_address_state && Boolean(formik.errors.permanent_address_state)} helperText={formik.touched.permanent_address_state && formik.errors.permanent_address_state} className="hr-quick-input" disabled={!isEditMode}>
                    <MenuItem value="">Select</MenuItem>
                    {states?.map((state) => <MenuItem value={state} key={state}>{state}</MenuItem>)}
                  </TextField>
                </Field>
                <Field label="PIN Code">
                  <TextField size="small" variant="filled" fullWidth name="permanent_address_pincode" value={formik.values.permanent_address_pincode} onChange={(e) => handlePincodeChange(e, "permanent_address_pincode")} error={formik.touched.permanent_address_pincode && Boolean(formik.errors.permanent_address_pincode)} helperText={formik.touched.permanent_address_pincode && formik.errors.permanent_address_pincode} className="hr-quick-input" inputProps={{ maxLength: 6 }} disabled={!isEditMode} />
                </Field>
              </div>
            </div>
          </div>

          {/* Communication Address */}
          <div className="hr-compact-section">
            <div className="hr-section-header">Communication Address</div>
            <div className="hr-section-body">
              <FormControlLabel control={<Checkbox size="small" onChange={handleSameAsPermanentAddress} disabled={!isEditMode} />} label={<span style={{ fontSize: '0.8rem' }}>Same as Permanent Address</span>} style={{ marginBottom: '8px' }} />
              <div className="hr-compact-grid cols-1">
                <Field label="Address Line 1">
                  <TextField size="small" variant="filled" fullWidth name="communication_address_line_1" value={formik.values.communication_address_line_1} onChange={formik.handleChange} error={formik.touched.communication_address_line_1 && Boolean(formik.errors.communication_address_line_1)} helperText={formik.touched.communication_address_line_1 && formik.errors.communication_address_line_1} className="hr-quick-input" disabled={!isEditMode} />
                </Field>
                <Field label="Address Line 2">
                  <TextField size="small" variant="filled" fullWidth name="communication_address_line_2" value={formik.values.communication_address_line_2} onChange={formik.handleChange} error={formik.touched.communication_address_line_2 && Boolean(formik.errors.communication_address_line_2)} helperText={formik.touched.communication_address_line_2 && formik.errors.communication_address_line_2} className="hr-quick-input" disabled={!isEditMode} />
                </Field>
              </div>
              <div className="hr-compact-grid cols-4" style={{ marginTop: '8px' }}>
                <Field label="City">
                  <TextField size="small" variant="filled" fullWidth name="communication_address_city" value={formik.values.communication_address_city} onChange={formik.handleChange} error={formik.touched.communication_address_city && Boolean(formik.errors.communication_address_city)} helperText={formik.touched.communication_address_city && formik.errors.communication_address_city} className="hr-quick-input" disabled={!isEditMode} />
                </Field>
                <Field label="Area">
                  <TextField size="small" variant="filled" fullWidth name="communication_address_area" value={formik.values.communication_address_area} onChange={formik.handleChange} error={formik.touched.communication_address_area && Boolean(formik.errors.communication_address_area)} helperText={formik.touched.communication_address_area && formik.errors.communication_address_area} className="hr-quick-input" disabled={!isEditMode} />
                </Field>
                <Field label="State">
                  <TextField select size="small" variant="filled" fullWidth name="communication_address_state" value={formik.values.communication_address_state} onChange={formik.handleChange} error={formik.touched.communication_address_state && Boolean(formik.errors.communication_address_state)} helperText={formik.touched.communication_address_state && formik.errors.communication_address_state} className="hr-quick-input" disabled={!isEditMode}>
                    <MenuItem value="">Select</MenuItem>
                    {states?.map((state) => <MenuItem value={state} key={state}>{state}</MenuItem>)}
                  </TextField>
                </Field>
                <Field label="PIN Code">
                  <TextField size="small" variant="filled" fullWidth name="communication_address_pincode" value={formik.values.communication_address_pincode} onChange={(e) => handlePincodeChange(e, "communication_address_pincode")} error={formik.touched.communication_address_pincode && Boolean(formik.errors.communication_address_pincode)} helperText={formik.touched.communication_address_pincode && formik.errors.communication_address_pincode} className="hr-quick-input" inputProps={{ maxLength: 6 }} disabled={!isEditMode} />
                </Field>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="hr-compact-section">
            <div className="hr-section-header">Bank Details</div>
            <div className="hr-section-body">
              <div className="hr-compact-grid cols-3">
                <Field label="Account Number">
                  <TextField size="small" variant="filled" fullWidth name="bank_account_no" value={formik.values.bank_account_no} onChange={formik.handleChange} error={formik.touched.bank_account_no && Boolean(formik.errors.bank_account_no)} helperText={formik.touched.bank_account_no && formik.errors.bank_account_no} className="hr-quick-input" disabled={!isEditMode} />
                </Field>
                <Field label="Bank Name">
                  <TextField size="small" variant="filled" fullWidth name="bank_name" value={formik.values.bank_name} onChange={formik.handleChange} error={formik.touched.bank_name && Boolean(formik.errors.bank_name)} helperText={formik.touched.bank_name && formik.errors.bank_name} className="hr-quick-input" disabled={!isEditMode} />
                </Field>
                <Field label="IFSC Code">
                  <TextField size="small" variant="filled" fullWidth name="ifsc_code" value={formik.values.ifsc_code} onChange={formik.handleChange} error={formik.touched.ifsc_code && Boolean(formik.errors.ifsc_code)} helperText={formik.touched.ifsc_code && formik.errors.ifsc_code} className="hr-quick-input" disabled={!isEditMode} />
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Contact Details */}
          <div className="hr-compact-section">
            <div className="hr-section-header">Contact Details</div>
            <div className="hr-section-body">
              <div className="hr-compact-grid cols-2">
                <Field label="Personal Email">
                  <TextField size="small" variant="filled" fullWidth name="personal_email" value={formik.values.personal_email} onChange={formik.handleChange} error={formik.touched.personal_email && Boolean(formik.errors.personal_email)} helperText={formik.touched.personal_email && formik.errors.personal_email} className="hr-quick-input" disabled={!isEditMode} />
                </Field>
                <Field label="Official Email">
                  <TextField size="small" variant="filled" fullWidth name="official_email" value={formik.values.official_email} onChange={formik.handleChange} error={formik.touched.official_email && Boolean(formik.errors.official_email)} helperText={formik.touched.official_email && formik.errors.official_email} className="hr-quick-input" disabled={!isEditMode} />
                </Field>
                <Field label="Mobile Number">
                  <TextField size="small" variant="filled" fullWidth name="mobile" value={formik.values.mobile} onChange={(e) => { if (/^[0-9]*$/.test(e.target.value)) formik.handleChange(e); }} error={formik.touched.mobile && Boolean(formik.errors.mobile)} helperText={formik.touched.mobile && formik.errors.mobile} className="hr-quick-input" inputProps={{ maxLength: 10 }} disabled={!isEditMode} />
                </Field>
                <Field label="Favorite Song">
                  <TextField size="small" variant="filled" fullWidth name="favorite_song" value={formik.values.favorite_song} onChange={formik.handleChange} error={formik.touched.favorite_song && Boolean(formik.errors.favorite_song)} helperText={formik.touched.favorite_song && formik.errors.favorite_song} className="hr-quick-input" disabled={!isEditMode} />
                </Field>
              </div>
              <div style={{ marginTop: '10px' }}>
                <label className="hr-field-label">Emergency Contact</label>
                <div className="hr-compact-grid cols-2" style={{ marginTop: '6px' }}>
                  <TextField size="small" variant="filled" fullWidth name="emergency_contact_name" value={formik.values.emergency_contact_name} onChange={formik.handleChange} error={formik.touched.emergency_contact_name && Boolean(formik.errors.emergency_contact_name)} helperText={formik.touched.emergency_contact_name && formik.errors.emergency_contact_name} className="hr-quick-input" placeholder="Contact Name" disabled={!isEditMode} />
                  <TextField size="small" variant="filled" fullWidth name="emergency_contact" value={formik.values.emergency_contact} onChange={(e) => { if (/^[0-9]*$/.test(e.target.value)) formik.handleChange(e); }} error={formik.touched.emergency_contact && Boolean(formik.errors.emergency_contact)} helperText={formik.touched.emergency_contact && formik.errors.emergency_contact} className="hr-quick-input" placeholder="Phone Number" inputProps={{ maxLength: 10 }} disabled={!isEditMode} />
                </div>
              </div>
              <div style={{ marginTop: '10px' }}>
                <label className="hr-field-label">Close Friend Contact</label>
                <div className="hr-compact-grid cols-2" style={{ marginTop: '6px' }}>
                  <TextField size="small" variant="filled" fullWidth name="close_friend_contact_name" value={formik.values.close_friend_contact_name} onChange={formik.handleChange} error={formik.touched.close_friend_contact_name && Boolean(formik.errors.close_friend_contact_name)} helperText={formik.touched.close_friend_contact_name && formik.errors.close_friend_contact_name} className="hr-quick-input" placeholder="Friend Name" disabled={!isEditMode} />
                  <TextField size="small" variant="filled" fullWidth name="close_friend_contact_no" value={formik.values.close_friend_contact_no} onChange={(e) => { if (/^[0-9]*$/.test(e.target.value)) formik.handleChange(e); }} error={formik.touched.close_friend_contact_no && Boolean(formik.errors.close_friend_contact_no)} helperText={formik.touched.close_friend_contact_no && formik.errors.close_friend_contact_no} className="hr-quick-input" placeholder="Phone Number" inputProps={{ maxLength: 10 }} disabled={!isEditMode} />
                </div>
              </div>
            </div>
          </div>

          {/* Family & Insurance */}
          <div className="hr-compact-section">
            <div className="hr-section-header">Family & Insurance</div>
            <div className="hr-section-body">
              <label className="hr-field-label">Family Members</label>
              <FormGroup row className="hr-compact-checkbox-group" style={{ marginTop: '6px' }}>
                <FormControlLabel control={<Checkbox size="small" name="Father" checked={formik.values.family_members?.includes("Father")} onChange={handleFamilyMemberChange} disabled={!isEditMode} />} label="Father" />
                <FormControlLabel control={<Checkbox size="small" name="Mother" checked={formik.values.family_members?.includes("Mother")} onChange={handleFamilyMemberChange} disabled={!isEditMode} />} label="Mother" />
                <FormControlLabel control={<Checkbox size="small" name="Spouse" checked={formik.values.family_members?.includes("Spouse")} onChange={handleFamilyMemberChange} disabled={!isEditMode} />} label="Spouse" />
              </FormGroup>
              
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="hr-field-label" style={{ marginBottom: 0 }}>Children Details</label>
                  <button 
                    type="button" 
                    onClick={handleAddChild} 
                    disabled={!isEditMode}
                    style={{ 
                      fontSize: '0.75rem', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      border: '1px solid #ccc', 
                      background: isEditMode ? '#f5f5f5' : '#e0e0e0', 
                      cursor: isEditMode ? 'pointer' : 'not-allowed',
                      opacity: isEditMode ? 1 : 0.7
                    }}
                  >
                    + Add Child
                  </button>
                </div>
                
                {childrenDetails.map((child, index) => (
                  <div key={index} className="hr-compact-grid cols-3" style={{ marginBottom: '8px', alignItems: 'end' }}>
                    <Field label={`Child ${index + 1} Gender`}>
                      <TextField 
                        select 
                        size="small" 
                        variant="filled" 
                        fullWidth 
                        value={child.gender} 
                        onChange={(e) => handleChildDetailChange(index, 'gender', e.target.value)}
                        disabled={!isEditMode}
                        className="hr-quick-input"
                      >
                        <MenuItem value="Boy">Boy</MenuItem>
                        <MenuItem value="Girl">Girl</MenuItem>
                      </TextField>
                    </Field>
                    <Field label="Age Group">
                      <TextField 
                        select 
                        size="small" 
                        variant="filled" 
                        fullWidth 
                        value={child.age_group} 
                        onChange={(e) => handleChildDetailChange(index, 'age_group', e.target.value)}
                        disabled={!isEditMode}
                        className="hr-quick-input"
                      >
                        <MenuItem value="0-5 Years">0-5 Years</MenuItem>
                        <MenuItem value="6-12 Years">6-12 Years</MenuItem>
                        <MenuItem value="13-18 Years">13-18 Years</MenuItem>
                        <MenuItem value="18+ Years">18+ Years</MenuItem>
                      </TextField>
                    </Field>
                    {isEditMode && (
                      <div style={{ width: 'fit-content' }}>
                        <IconButton size="small" color="error" onClick={() => handleRemoveChild(index)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {formik.touched.family_members && formik.errors.family_members && (
                <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '3px' }}>{formik.errors.family_members}</div>
              )}
              <div style={{ marginTop: '16px' }}>
                <label className="hr-field-label">Insurance Status</label>
                {/* Not Applicable Option */}
                <RadioGroup 
                  row 
                  value={formik.values.insurance_not_applicable ? "not_applicable" : "applicable"}
                  onChange={handleInsuranceNotApplicableChange}
                  className="hr-compact-radio-group"
                  style={{ marginTop: '6px', marginBottom: '8px' }}
                >
                  <FormControlLabel value="applicable" control={<Radio size="small" disabled={!isEditMode} />} label="Applicable" disabled={!isEditMode} />
                  <FormControlLabel value="not_applicable" control={<Radio size="small" disabled={!isEditMode} />} label="Not Applicable" disabled={!isEditMode} />
                </RadioGroup>
                
                {/* Insurance Checkboxes - disabled when Not Applicable */}
                <FormGroup row className="hr-compact-checkbox-group" style={{ opacity: formik.values.insurance_not_applicable ? 0.5 : 1 }}>
                  <FormControlLabel 
                    control={
                      <Checkbox 
                        size="small" 
                        name="Mediclaim" 
                        checked={formik.values.insurance_status?.includes("Mediclaim")}
                        onChange={handleInsuranceDetailsChange} 
                        disabled={formik.values.insurance_not_applicable || !isEditMode}
                      />
                    } 
                    label="Mediclaim" 
                  />
                  <FormControlLabel 
                    control={
                      <Checkbox 
                        size="small" 
                        name="Personal Accident" 
                        checked={formik.values.insurance_status?.includes("Personal Accident")}
                        onChange={handleInsuranceDetailsChange} 
                        disabled={formik.values.insurance_not_applicable || !isEditMode}
                      />
                    } 
                    label="Personal Accident" 
                  />
                </FormGroup>
                {formik.touched.insurance_status && formik.errors.insurance_status && !formik.values.insurance_not_applicable && (
                  <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '3px' }}>{formik.errors.insurance_status}</div>
                )}
              </div>
              <div className="hr-compact-grid cols-2" style={{ marginTop: '12px' }}>

                <Field label={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span>PF Number</span>
                    <FormControlLabel 
                      control={
                        <Checkbox 
                          size="small" 
                          checked={formik.values.pf_not_applicable} 
                          onChange={(e) => {
                            formik.setFieldValue("pf_not_applicable", e.target.checked);
                            if (e.target.checked) formik.setFieldValue("pf_no", "");
                          }}
                          disabled={!isEditMode}
                          style={{ padding: '0 4px' }}
                        />
                      } 
                      label={<span style={{fontSize: '0.7rem'}}>Not Applicable</span>}
                      style={{ marginRight: 0 }}
                    />
                  </div>
                }>
                  <TextField 
                    size="small" 
                    variant="filled" 
                    fullWidth 
                    name="pf_no" 
                    value={formik.values.pf_no} 
                    onChange={formik.handleChange} 
                    error={formik.touched.pf_no && Boolean(formik.errors.pf_no)} 
                    helperText={formik.touched.pf_no && formik.errors.pf_no} 
                    className="hr-quick-input"
                    disabled={!isEditMode || formik.values.pf_not_applicable}
                    placeholder={formik.values.pf_not_applicable ? "Not Applicable" : ""}
                  />
                </Field>
                <Field label={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span>ESIC Number</span>
                    <FormControlLabel 
                      control={
                        <Checkbox 
                          size="small" 
                          checked={formik.values.esic_not_applicable} 
                          onChange={(e) => {
                            formik.setFieldValue("esic_not_applicable", e.target.checked);
                            if (e.target.checked) formik.setFieldValue("esic_no", "");
                          }}
                          disabled={!isEditMode}
                          style={{ padding: '0 4px' }}
                        />
                      } 
                      label={<span style={{fontSize: '0.7rem'}}>Not Applicable</span>}
                      style={{ marginRight: 0 }}
                    />
                  </div>
                }>
                  <TextField 
                    size="small" 
                    variant="filled" 
                    fullWidth 
                    name="esic_no" 
                    value={formik.values.esic_no} 
                    onChange={formik.handleChange} 
                    error={formik.touched.esic_no && Boolean(formik.errors.esic_no)} 
                    helperText={formik.touched.esic_no && formik.errors.esic_no} 
                    className="hr-quick-input"
                    disabled={!isEditMode || formik.values.esic_not_applicable}
                    placeholder={formik.values.esic_not_applicable ? "Not Applicable" : ""}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Identity Documents */}
          <div className="hr-compact-section">
            <div className="hr-section-header">Identity Documents</div>
            <div className="hr-section-body">
              <div className="hr-compact-grid cols-2">
                <Field label="Aadhaar Number">
                  <TextField size="small" variant="filled" fullWidth name="aadhar_no" value={formik.values.aadhar_no} onChange={handleAadharNoChange} error={formik.touched.aadhar_no && Boolean(formik.errors.aadhar_no)} helperText={formik.touched.aadhar_no && formik.errors.aadhar_no} className="hr-quick-input" inputProps={{ maxLength: 12 }} disabled={!isEditMode} />
                </Field>
                <Field label="PAN Number">
                  <TextField size="small" variant="filled" fullWidth name="pan_no" value={formik.values.pan_no} onChange={(e) => { if (e.target.value.length <= 10) formik.handleChange(e); }} error={formik.touched.pan_no && Boolean(formik.errors.pan_no)} helperText={formik.touched.pan_no && formik.errors.pan_no} className="hr-quick-input" inputProps={{ maxLength: 10, style: { textTransform: 'uppercase' } }} disabled={!isEditMode} />
                </Field>
              </div>
              <div className="hr-document-uploads">
                <div className="hr-upload-item">
                  <span className="hr-upload-label">Aadhaar Front *</span>
                  <div className="hr-upload-controls">
                    <FileUpload
                      label="Upload"
                      onFilesUploaded={handleFilesUploaded("aadhar_photo_front")}
                      bucketPath="kyc"
                      singleFileOnly={true}
                      acceptedFileTypes={["image/*", ".pdf"]}
                      buttonSx={{ fontSize: '0.7rem', padding: '4px 12px', minWidth: 'auto' }}
                      disabled={!isEditMode}
                    />
                    {formik.values.aadhar_photo_front && (
                      <div className="hr-upload-actions">
                        <a href={formik.values.aadhar_photo_front} target="_blank" rel="noopener noreferrer" className="hr-view-link">View</a>
                        <IconButton size="small" color="error" onClick={() => handleDeleteFile("aadhar_photo_front")} title="Delete file" disabled={!isEditMode}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    )}
                  </div>
                  {formik.touched.aadhar_photo_front && formik.errors.aadhar_photo_front && (
                    <span className="hr-upload-error">{formik.errors.aadhar_photo_front}</span>
                  )}
                </div>

                <div className="hr-upload-item">
                  <span className="hr-upload-label">Aadhaar Back *</span>
                  <div className="hr-upload-controls">
                    <FileUpload
                      label="Upload"
                      onFilesUploaded={handleFilesUploaded("aadhar_photo_back")}
                      bucketPath="kyc"
                      singleFileOnly={true}
                      acceptedFileTypes={["image/*", ".pdf"]}
                      buttonSx={{ fontSize: '0.7rem', padding: '4px 12px', minWidth: 'auto' }}
                      disabled={!isEditMode}
                    />
                    {formik.values.aadhar_photo_back && (
                      <div className="hr-upload-actions">
                        <a href={formik.values.aadhar_photo_back} target="_blank" rel="noopener noreferrer" className="hr-view-link">View</a>
                        <IconButton size="small" color="error" onClick={() => handleDeleteFile("aadhar_photo_back")} title="Delete file" disabled={!isEditMode}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    )}
                  </div>
                  {formik.touched.aadhar_photo_back && formik.errors.aadhar_photo_back && (
                    <span className="hr-upload-error">{formik.errors.aadhar_photo_back}</span>
                  )}
                </div>

                <div className="hr-upload-item">
                  <span className="hr-upload-label">PAN Card *</span>
                  <div className="hr-upload-controls">
                    <FileUpload
                      label="Upload"
                      onFilesUploaded={handleFilesUploaded("pan_photo")}
                      bucketPath="kyc"
                      singleFileOnly={true}
                      acceptedFileTypes={["image/*", ".pdf"]}
                      buttonSx={{ fontSize: '0.7rem', padding: '4px 12px', minWidth: 'auto' }}
                      disabled={!isEditMode}
                    />
                    {formik.values.pan_photo && (
                      <div className="hr-upload-actions">
                        <a href={formik.values.pan_photo} target="_blank" rel="noopener noreferrer" className="hr-view-link">View</a>
                        <IconButton size="small" color="error" onClick={() => handleDeleteFile("pan_photo")} title="Delete file" disabled={!isEditMode}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    )}
                  </div>
                  {formik.touched.pan_photo && formik.errors.pan_photo && (
                    <span className="hr-upload-error">{formik.errors.pan_photo}</span>
                  )}
                </div>

                <div className="hr-upload-item">
                  <span className="hr-upload-label">License Front</span>
                  <div className="hr-upload-controls">
                    <FileUpload
                      label="Upload"
                      onFilesUploaded={handleFilesUploaded("license_front")}
                      bucketPath="kyc"
                      singleFileOnly={true}
                      acceptedFileTypes={["image/*", ".pdf"]}
                      buttonSx={{ fontSize: '0.7rem', padding: '4px 12px', minWidth: 'auto' }}
                      disabled={!isEditMode}
                    />
                    {formik.values.license_front && (
                      <div className="hr-upload-actions">
                        <a href={formik.values.license_front} target="_blank" rel="noopener noreferrer" className="hr-view-link">View</a>
                        <IconButton size="small" color="error" onClick={() => handleDeleteFile("license_front")} title="Delete file" disabled={!isEditMode}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    )}
                  </div>
                  {formik.touched.license_front && formik.errors.license_front && (
                    <span className="hr-upload-error">{formik.errors.license_front}</span>
                  )}
                </div>

                <div className="hr-upload-item">
                  <span className="hr-upload-label">License Back</span>
                  <div className="hr-upload-controls">
                    <FileUpload
                      label="Upload"
                      onFilesUploaded={handleFilesUploaded("license_back")}
                      bucketPath="kyc"
                      singleFileOnly={true}
                      acceptedFileTypes={["image/*", ".pdf"]}
                      buttonSx={{ fontSize: '0.7rem', padding: '4px 12px', minWidth: 'auto' }}
                      disabled={!isEditMode}
                    />
                    {formik.values.license_back && (
                      <div className="hr-upload-actions">
                        <a href={formik.values.license_back} target="_blank" rel="noopener noreferrer" className="hr-view-link">View</a>
                        <IconButton size="small" color="error" onClick={() => handleDeleteFile("license_back")} title="Delete file" disabled={!isEditMode}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    )}
                  </div>
                  {formik.touched.license_back && formik.errors.license_back && (
                    <span className="hr-upload-error">{formik.errors.license_back}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="hr-btn-row">
        <button className="hr-compact-btn hr-compact-btn-primary" type="submit" disabled={!isEditMode} style={{ opacity: isEditMode ? 1 : 0.6, cursor: isEditMode ? 'pointer' : 'not-allowed' }}>
          Submit KYC Details
        </button>
      </div>

      <Snackbar open={fileSnackbar} message="File uploaded successfully!" sx={{ left: "auto !important", right: "24px !important" }} />
    </form>
  );
}

export default React.memo(CompleteKYC);
