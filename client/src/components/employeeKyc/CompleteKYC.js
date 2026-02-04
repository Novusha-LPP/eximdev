import React, { useContext, useState } from "react";
import { useFormik } from "formik";
import { MenuItem, TextField } from "@mui/material";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import { states } from "../../assets/data/statesData";
import FormGroup from "@mui/material/FormGroup";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormLabel from "@mui/material/FormLabel";
import AWS from "aws-sdk";
import Snackbar from "@mui/material/Snackbar";
import { validationSchema } from "../../schemas/employeeKyc/completeKyc";

function CompleteKYC() {
  const [numChildren, setNumChildren] = useState("");
  const { user } = useContext(UserContext);
  const [fileSnackbar, setFileSnackbar] = useState(false);

  const formik = useFormik({
    initialValues: {
      designation: "",
      department: "",
      joining_date: "",
      dob: "",
      permanent_address_line_1: "",
      permanent_address_line_2: "",
      permanent_address_city: "",
      permanent_address_area: "",
      permanent_address_state: "",
      permanent_address_pincode: "",
      communication_address_line_1: "",
      communication_address_line_2: "",
      communication_address_city: "",
      communication_address_area: "",
      communication_address_state: "",
      communication_address_pincode: "",
      personal_email: "",
      official_email: "",
      mobile: "",
      emergency_contact: "",
      emergency_contact_name: "",
      family_members: [],
      close_friend_contact_no: "",
      close_friend_contact_name: "",
      blood_group: "",
      highest_qualification: "",
      aadhar_no: "",
      aadhar_photo_front: "",
      aadhar_photo_back: "",
      pan_no: "",
      pan_photo: "",
      pf_no: "",
      esic_no: "",
      insurance_status: [],
      license_front: "",
      license_back: "",
      bank_account_no: "",
      bank_name: "",
      ifsc_code: "",
      favorite_song: "",
      marital_status: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/complete-kyc`,
        { ...values, username: user.username }
      );
      alert(res.data.message);
    },
  });

  const handleNumChildrenChange = (event) => {
    setNumChildren(event.target.value);
    const num = event.target.value.split(" ")[1];
    const updatedFamilyMembers = formik.values.family_members.filter(
      (member) => !member.startsWith("Child")
    );
    for (let i = 1; i <= num; i++) {
      updatedFamilyMembers.push(`Child ${i}`);
    }
    formik.setFieldValue("family_members", updatedFamilyMembers);
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

  const handleFileUpload = async (e, formikField) => {
    if (e.target.files.length === 0) {
      alert("No file selected");
      return;
    }
    try {
      const file = e.target.files[0];
      const key = `kyc/${file.name}`;
      const s3 = new AWS.S3({
        accessKeyId: process.env.REACT_APP_ACCESS_KEY,
        secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
        region: "ap-south-1",
      });
      const params = {
        Bucket: process.env.REACT_APP_S3_BUCKET,
        Key: key,
        Body: file,
      };
      const data = await s3.upload(params).promise();
      formik.setValues((values) => ({
        ...values,
        [formikField]: data.Location,
      }));
      setFileSnackbar(true);
      setTimeout(() => setFileSnackbar(false), 3000);
    } catch (err) {
      console.error("Error uploading file:", err);
    }
  };

  const handleInsuranceDetailsChange = (event) => {
    const member = event.target.name;
    const isChecked = event.target.checked;
    const currentMembers = formik.values.insurance_status;
    let updatedMembers = isChecked
      ? [...currentMembers, member]
      : currentMembers.filter((m) => m !== member);
    formik.setFieldValue("insurance_status", updatedMembers);
  };

  const employee_name = [user.first_name, user.middle_name, user.last_name]
    .filter(Boolean)
    .join(" ");

  // Compact Field Component
  const Field = ({ label, children, fullWidth }) => (
    <div className={`hr-compact-field ${fullWidth ? 'full-width' : ''}`}>
      <label className="hr-field-label">{label}</label>
      {children}
    </div>
  );

  // Compact File Upload
  const FileUpload = ({ label, field }) => (
    <div className={`hr-compact-file-upload ${formik.values[field] ? 'uploaded' : ''}`}>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--hr-text-label)' }}>{label}</span>
      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, field)} />
      {formik.values[field] && (
        <span className="file-status">
          ✓ <a href={formik.values[field]} target="_blank" rel="noopener noreferrer">View</a>
        </span>
      )}
    </div>
  );

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
                  <TextField size="small" variant="filled" fullWidth name="designation" value={formik.values.designation} onChange={formik.handleChange} error={formik.touched.designation && Boolean(formik.errors.designation)} className="hr-quick-input" placeholder="Enter designation" />
                </Field>
                <Field label="Department">
                  <TextField select size="small" variant="filled" fullWidth name="department" value={formik.values.department} onChange={formik.handleChange} error={formik.touched.department && Boolean(formik.errors.department)} className="hr-quick-input">
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
                  <TextField type="date" size="small" variant="filled" fullWidth name="joining_date" value={formik.values.joining_date} onChange={formik.handleChange} className="hr-quick-input" InputLabelProps={{ shrink: true }} placeholder="DD-MM-YYYY" />
                </Field>
                <Field label="Date of Birth">
                  <TextField type="date" size="small" variant="filled" fullWidth name="dob" value={formik.values.dob} onChange={formik.handleChange} className="hr-quick-input" InputLabelProps={{ shrink: true }} placeholder="DD-MM-YYYY" />
                </Field>
                <Field label="Blood Group">
                  <TextField size="small" variant="filled" fullWidth name="blood_group" value={formik.values.blood_group} onChange={formik.handleChange} className="hr-quick-input" placeholder="Enter blood group" />
                </Field>
                <Field label="Highest Qualification">
                  <TextField size="small" variant="filled" fullWidth name="highest_qualification" value={formik.values.highest_qualification} onChange={formik.handleChange} className="hr-quick-input" placeholder="Enter qualification" />
                </Field>
              </div>
              <div style={{ marginTop: '10px' }}>
                <label className="hr-field-label">Marital Status</label>
                <RadioGroup row name="marital_status" value={formik.values.marital_status} onChange={formik.handleChange} className="hr-compact-radio-group">
                  <FormControlLabel value="single" control={<Radio size="small" />} label="Single" />
                  <FormControlLabel value="married" control={<Radio size="small" />} label="Married" />
                  <FormControlLabel value="widowed" control={<Radio size="small" />} label="Widowed" />
                  <FormControlLabel value="divroced" control={<Radio size="small" />} label="Divorced" />
                </RadioGroup>
              </div>
            </div>
          </div>

          {/* Permanent Address */}
          <div className="hr-compact-section">
            <div className="hr-section-header">Permanent Address</div>
            <div className="hr-section-body">
              <div className="hr-compact-grid cols-1">
                <Field label="Address Line 1">
                  <TextField size="small" variant="filled" fullWidth name="permanent_address_line_1" value={formik.values.permanent_address_line_1} onChange={formik.handleChange} className="hr-quick-input" />
                </Field>
                <Field label="Address Line 2">
                  <TextField size="small" variant="filled" fullWidth name="permanent_address_line_2" value={formik.values.permanent_address_line_2} onChange={formik.handleChange} className="hr-quick-input" />
                </Field>
              </div>
              <div className="hr-compact-grid cols-4" style={{ marginTop: '8px' }}>
                <Field label="City">
                  <TextField size="small" variant="filled" fullWidth name="permanent_address_city" value={formik.values.permanent_address_city} onChange={formik.handleChange} className="hr-quick-input" />
                </Field>
                <Field label="Area">
                  <TextField size="small" variant="filled" fullWidth name="permanent_address_area" value={formik.values.permanent_address_area} onChange={formik.handleChange} className="hr-quick-input" />
                </Field>
                <Field label="State">
                  <TextField select size="small" variant="filled" fullWidth name="permanent_address_state" value={formik.values.permanent_address_state} onChange={formik.handleChange} className="hr-quick-input">
                    <MenuItem value="">Select</MenuItem>
                    {states?.map((state) => <MenuItem value={state} key={state}>{state}</MenuItem>)}
                  </TextField>
                </Field>
                <Field label="PIN Code">
                  <TextField size="small" variant="filled" fullWidth name="permanent_address_pincode" value={formik.values.permanent_address_pincode} onChange={(e) => handlePincodeChange(e, "permanent_address_pincode")} className="hr-quick-input" inputProps={{ maxLength: 6 }} />
                </Field>
              </div>
            </div>
          </div>

          {/* Communication Address */}
          <div className="hr-compact-section">
            <div className="hr-section-header">Communication Address</div>
            <div className="hr-section-body">
              <FormControlLabel control={<Checkbox size="small" onChange={handleSameAsPermanentAddress} />} label={<span style={{ fontSize: '0.8rem' }}>Same as Permanent Address</span>} style={{ marginBottom: '8px' }} />
              <div className="hr-compact-grid cols-1">
                <Field label="Address Line 1">
                  <TextField size="small" variant="filled" fullWidth name="communication_address_line_1" value={formik.values.communication_address_line_1} onChange={formik.handleChange} className="hr-quick-input" />
                </Field>
                <Field label="Address Line 2">
                  <TextField size="small" variant="filled" fullWidth name="communication_address_line_2" value={formik.values.communication_address_line_2} onChange={formik.handleChange} className="hr-quick-input" />
                </Field>
              </div>
              <div className="hr-compact-grid cols-4" style={{ marginTop: '8px' }}>
                <Field label="City">
                  <TextField size="small" variant="filled" fullWidth name="communication_address_city" value={formik.values.communication_address_city} onChange={formik.handleChange} className="hr-quick-input" />
                </Field>
                <Field label="Area">
                  <TextField size="small" variant="filled" fullWidth name="communication_address_area" value={formik.values.communication_address_area} onChange={formik.handleChange} className="hr-quick-input" />
                </Field>
                <Field label="State">
                  <TextField select size="small" variant="filled" fullWidth name="communication_address_state" value={formik.values.communication_address_state} onChange={formik.handleChange} className="hr-quick-input">
                    <MenuItem value="">Select</MenuItem>
                    {states?.map((state) => <MenuItem value={state} key={state}>{state}</MenuItem>)}
                  </TextField>
                </Field>
                <Field label="PIN Code">
                  <TextField size="small" variant="filled" fullWidth name="communication_address_pincode" value={formik.values.communication_address_pincode} onChange={(e) => handlePincodeChange(e, "communication_address_pincode")} className="hr-quick-input" inputProps={{ maxLength: 6 }} />
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
                  <TextField size="small" variant="filled" fullWidth name="bank_account_no" value={formik.values.bank_account_no} onChange={formik.handleChange} className="hr-quick-input" />
                </Field>
                <Field label="Bank Name">
                  <TextField size="small" variant="filled" fullWidth name="bank_name" value={formik.values.bank_name} onChange={formik.handleChange} className="hr-quick-input" />
                </Field>
                <Field label="IFSC Code">
                  <TextField size="small" variant="filled" fullWidth name="ifsc_code" value={formik.values.ifsc_code} onChange={formik.handleChange} className="hr-quick-input" />
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
                  <TextField size="small" variant="filled" fullWidth name="personal_email" value={formik.values.personal_email} onChange={formik.handleChange} className="hr-quick-input" />
                </Field>
                <Field label="Official Email">
                  <TextField size="small" variant="filled" fullWidth name="official_email" value={formik.values.official_email} onChange={formik.handleChange} className="hr-quick-input" />
                </Field>
                <Field label="Mobile Number">
                  <TextField size="small" variant="filled" fullWidth name="mobile" value={formik.values.mobile} onChange={(e) => { if (/^[0-9]*$/.test(e.target.value)) formik.handleChange(e); }} className="hr-quick-input" inputProps={{ maxLength: 10 }} />
                </Field>
                <Field label="Favorite Song">
                  <TextField size="small" variant="filled" fullWidth name="favorite_song" value={formik.values.favorite_song} onChange={formik.handleChange} className="hr-quick-input" />
                </Field>
              </div>
              <div style={{ marginTop: '10px' }}>
                <label className="hr-field-label">Emergency Contact</label>
                <div className="hr-compact-grid cols-2" style={{ marginTop: '6px' }}>
                  <TextField size="small" variant="filled" fullWidth name="emergency_contact_name" value={formik.values.emergency_contact_name} onChange={formik.handleChange} className="hr-quick-input" placeholder="Contact Name" />
                  <TextField size="small" variant="filled" fullWidth name="emergency_contact" value={formik.values.emergency_contact} onChange={(e) => { if (/^[0-9]*$/.test(e.target.value)) formik.handleChange(e); }} className="hr-quick-input" placeholder="Phone Number" inputProps={{ maxLength: 10 }} />
                </div>
              </div>
              <div style={{ marginTop: '10px' }}>
                <label className="hr-field-label">Close Friend Contact</label>
                <div className="hr-compact-grid cols-2" style={{ marginTop: '6px' }}>
                  <TextField size="small" variant="filled" fullWidth name="close_friend_contact_name" value={formik.values.close_friend_contact_name} onChange={formik.handleChange} className="hr-quick-input" placeholder="Friend Name" />
                  <TextField size="small" variant="filled" fullWidth name="close_friend_contact_no" value={formik.values.close_friend_contact_no} onChange={(e) => { if (/^[0-9]*$/.test(e.target.value)) formik.handleChange(e); }} className="hr-quick-input" placeholder="Phone Number" inputProps={{ maxLength: 10 }} />
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
                <FormControlLabel control={<Checkbox size="small" name="Father" onChange={handleFamilyMemberChange} />} label="Father" />
                <FormControlLabel control={<Checkbox size="small" name="Mother" onChange={handleFamilyMemberChange} />} label="Mother" />
                <FormControlLabel control={<Checkbox size="small" name="Spouse" onChange={handleFamilyMemberChange} />} label="Spouse" />
                <TextField select size="small" variant="filled" value={numChildren} onChange={handleNumChildrenChange} className="hr-quick-input" style={{ width: '120px' }}>
                  <MenuItem value="">Children</MenuItem>
                  <MenuItem value="Child 1">1</MenuItem>
                  <MenuItem value="Child 2">2</MenuItem>
                  <MenuItem value="Child 3">3</MenuItem>
                  <MenuItem value="Child 4">4</MenuItem>
                </TextField>
              </FormGroup>
              <div style={{ marginTop: '12px' }}>
                <label className="hr-field-label">Insurance Status</label>
                <FormGroup row className="hr-compact-checkbox-group" style={{ marginTop: '6px' }}>
                  <FormControlLabel control={<Checkbox size="small" name="Mediclaim" onChange={handleInsuranceDetailsChange} />} label="Mediclaim" />
                  <FormControlLabel control={<Checkbox size="small" name="Personal Accident" onChange={handleInsuranceDetailsChange} />} label="Personal Accident" />
                  <FormControlLabel control={<Checkbox size="small" name="Not Available" onChange={handleInsuranceDetailsChange} />} label="Not Available" />
                </FormGroup>
              </div>
              <div className="hr-compact-grid cols-2" style={{ marginTop: '12px' }}>
                <Field label="PF Number">
                  <TextField size="small" variant="filled" fullWidth name="pf_no" value={formik.values.pf_no} onChange={formik.handleChange} className="hr-quick-input" />
                </Field>
                <Field label="ESIC Number">
                  <TextField size="small" variant="filled" fullWidth name="esic_no" value={formik.values.esic_no} onChange={formik.handleChange} className="hr-quick-input" />
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
                  <TextField size="small" variant="filled" fullWidth name="aadhar_no" value={formik.values.aadhar_no} onChange={handleAadharNoChange} className="hr-quick-input" inputProps={{ maxLength: 12 }} />
                </Field>
                <Field label="PAN Number">
                  <TextField size="small" variant="filled" fullWidth name="pan_no" value={formik.values.pan_no} onChange={(e) => { if (e.target.value.length <= 10) formik.handleChange(e); }} className="hr-quick-input" inputProps={{ maxLength: 10, style: { textTransform: 'uppercase' } }} />
                </Field>
              </div>
              <div className="hr-compact-grid cols-2" style={{ marginTop: '10px' }}>
                <FileUpload label="Aadhaar Front" field="aadhar_photo_front" />
                <FileUpload label="Aadhaar Back" field="aadhar_photo_back" />
                <FileUpload label="PAN Card" field="pan_photo" />
                <FileUpload label="License Front" field="license_front" />
                <FileUpload label="License Back" field="license_back" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="hr-btn-row">
        <button className="hr-compact-btn hr-compact-btn-primary" type="submit">
          Submit KYC Details
        </button>
      </div>

      <Snackbar open={fileSnackbar} message="File uploaded successfully!" sx={{ left: "auto !important", right: "24px !important" }} />
    </form>
  );
}

export default React.memo(CompleteKYC);
