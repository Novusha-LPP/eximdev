import React, { useContext, useState } from "react";
import { useFormik } from "formik";
import { MenuItem, TextField } from "@mui/material";
import { Row, Col } from "react-bootstrap";
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
      console.log(values);
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/complete-kyc`,
        { ...values, username: user.username }
      );
      console.log(res.data);
      alert(res.data.message);
      // resetForm();
    },
  });

  const handleNumChildrenChange = (event) => {
    setNumChildren(event.target.value);
    const numChildren = event.target.value.split(" ")[1];
    // Update the family_members array based on the number of children selected
    const updatedFamilyMembers = formik.values.family_members.filter(
      (member) => !member.startsWith("Child")
    );
    for (let i = 1; i <= numChildren; i++) {
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
      // If unchecked, you can clear the communication address fields or handle as needed
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
    // Remove non-digit characters and limit length to 6
    const newValue = value.replace(/\D/g, "").slice(0, 6);
    // Update the formik values with the sanitized input
    formik.setFieldValue(field, newValue);
  };

  const handleFamilyMemberChange = (event) => {
    const member = event.target.name;
    const isChecked = event.target.checked;

    // Retrieve the current array of family members
    const currentMembers = formik.values.family_members;

    // Update the array based on the checkbox state
    let updatedMembers = [];
    if (isChecked) {
      updatedMembers = [...currentMembers, member];
    } else {
      updatedMembers = currentMembers.filter((m) => m !== member);
    }

    // Update formik values with the updated array of family members
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
        Bucket: "alvision-exim-images",
        Key: key,
        Body: file,
      };

      const data = await s3.upload(params).promise();
      const photoUrl = data.Location;

      formik.setValues((values) => ({
        ...values,
        [formikField]: photoUrl,
      }));

      setFileSnackbar(true);

      setTimeout(() => {
        setFileSnackbar(false);
      }, 3000);
    } catch (err) {
      console.error("Error uploading file:", err);
    }
  };

  const handleInsuranceDetailsChange = (event) => {
    const member = event.target.name;
    const isChecked = event.target.checked;

    // Retrieve the current array of family members
    const currentMembers = formik.values.insurance_status;

    // Update the array based on the checkbox state
    let updatedMembers = [];
    if (isChecked) {
      updatedMembers = [...currentMembers, member];
    } else {
      updatedMembers = currentMembers.filter((m) => m !== member);
    }

    // Update formik values with the updated array of family members
    formik.setFieldValue("insurance_status", updatedMembers);
  };

  const employee_name = [user.first_name, user.middle_name, user.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <form onSubmit={formik.handleSubmit}>
      Name:&nbsp;
      {employee_name}
      <br />
      Email:&nbsp;{user.email}
      <br />
      Company:&nbsp;{user.company}
      <br />
      <Row>
        <Col xs={4}>
          <TextField
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="designation"
            name="designation"
            label="Designation"
            value={formik.values.designation}
            onChange={formik.handleChange}
            error={
              formik.touched.designation && Boolean(formik.errors.designation)
            }
            helperText={formik.touched.designation && formik.errors.designation}
            className="login-input"
          />
        </Col>

        <Col xs={4}>
          <TextField
            select
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="department"
            name="department"
            label="Department"
            value={formik.values.department}
            onChange={formik.handleChange}
            error={
              formik.touched.department && Boolean(formik.errors.department)
            }
            helperText={formik.touched.department && formik.errors.department}
            className="login-input"
          >
            <MenuItem value="Import">Import</MenuItem>
            <MenuItem value="Export">Export</MenuItem>
            <MenuItem value="Operations">Operations</MenuItem>
            <MenuItem value="Accounts">Accounts</MenuItem>
            <MenuItem value="Field">Field</MenuItem>
            <MenuItem value="DGFT">DGFT</MenuItem>
            <MenuItem value="Office Assistant">Office Assistant</MenuItem>
            <MenuItem value="Software Development">
              Software Development
            </MenuItem>
            <MenuItem value="Designing">Designing</MenuItem>
            <MenuItem value="Sales & Marketing">Sales & Marketing</MenuItem>
            <MenuItem value="HR Admin">HR Admin</MenuItem>
          </TextField>
        </Col>
        <Col xs={4}>
          <TextField
            type="date"
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="joining_date"
            name="joining_date"
            label="Joining Date"
            value={formik.values.joining_date}
            onChange={formik.handleChange}
            error={
              formik.touched.joining_date && Boolean(formik.errors.joining_date)
            }
            helperText={
              formik.touched.joining_date && formik.errors.joining_date
            }
            className="login-input"
            InputLabelProps={{ shrink: true }}
          />
        </Col>
      </Row>
      <Row>
        <Col xs={4}>
          <TextField
            type="date"
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="dob"
            name="dob"
            label="Date of birth"
            value={formik.values.dob}
            onChange={formik.handleChange}
            error={formik.touched.dob && Boolean(formik.errors.dob)}
            helperText={formik.touched.dob && formik.errors.dob}
            className="login-input"
            InputLabelProps={{ shrink: true }}
          />
        </Col>
      </Row>
      <br />
      <br />
      <h5>Permanent Address</h5>
      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="permanent_address_line_1"
        name="permanent_address_line_1"
        label="Address Line 1"
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
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="permanent_address_line_2"
        name="permanent_address_line_2"
        label="Address Line 2"
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
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
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
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="permanent_address_area"
            name="permanent_address_area"
            label="Area"
            value={formik.values.permanent_address_area}
            onChange={formik.handleChange}
            error={
              formik.touched.permanent_address_area &&
              Boolean(formik.errors.permanent_address_area)
            }
            helperText={
              formik.touched.permanent_address_area &&
              formik.errors.permanent_address_area
            }
            className="login-input"
          />
        </Col>
        <Col>
          <TextField
            select
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
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
          >
            {states?.map((state) => (
              <MenuItem value={state} key={state}>
                {state}
              </MenuItem>
            ))}
          </TextField>
        </Col>
        <Col>
          <TextField
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="permanent_address_pincode"
            name="permanent_address_pincode"
            label="PIN Code"
            value={formik.values.permanent_address_pincode}
            onChange={(event) =>
              handlePincodeChange(event, "permanent_address_pincode")
            }
            error={
              formik.touched.permanent_address_pincode &&
              Boolean(formik.errors.permanent_address_pincode)
            }
            helperText={
              formik.touched.permanent_address_pincode &&
              formik.errors.permanent_address_pincode
            }
            className="login-input"
          />
        </Col>
      </Row>
      <br />
      <br />
      <h5>Communication Address</h5>
      <FormControlLabel
        control={
          <Checkbox
            name="sameAsPermanentAddress"
            onChange={handleSameAsPermanentAddress}
          />
        }
        label="Same as Permanent Address"
      />
      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="communication_address_line_1"
        name="communication_address_line_1"
        label="Address Line 1"
        value={formik.values.communication_address_line_1}
        onChange={formik.handleChange}
        error={
          formik.touched.communication_address_line_1 &&
          Boolean(formik.errors.communication_address_line_1)
        }
        helperText={
          formik.touched.communication_address_line_1 &&
          formik.errors.communication_address_line_1
        }
        className="login-input"
      />
      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="communication_address_line_2"
        name="communication_address_line_2"
        label="Address Line 2"
        value={formik.values.communication_address_line_2}
        onChange={formik.handleChange}
        error={
          formik.touched.communication_address_line_2 &&
          Boolean(formik.errors.communication_address_line_2)
        }
        helperText={
          formik.touched.communication_address_line_2 &&
          formik.errors.communication_address_line_2
        }
        className="login-input"
      />
      <Row>
        <Col>
          <TextField
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="communication_address_city"
            name="communication_address_city"
            label="City"
            value={formik.values.communication_address_city}
            onChange={formik.handleChange}
            error={
              formik.touched.communication_address_city &&
              Boolean(formik.errors.communication_address_city)
            }
            helperText={
              formik.touched.communication_address_city &&
              formik.errors.communication_address_city
            }
            className="login-input"
          />
        </Col>
        <Col>
          <TextField
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="communication_address_area"
            name="communication_address_area"
            label="Area"
            value={formik.values.communication_address_area}
            onChange={formik.handleChange}
            error={
              formik.touched.communication_address_area &&
              Boolean(formik.errors.communication_address_area)
            }
            helperText={
              formik.touched.communication_address_area &&
              formik.errors.communication_address_area
            }
            className="login-input"
          />
        </Col>
        <Col>
          <TextField
            select
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="communication_address_state"
            name="communication_address_state"
            label="State"
            value={formik.values.communication_address_state}
            onChange={formik.handleChange}
            error={
              formik.touched.communication_address_state &&
              Boolean(formik.errors.communication_address_state)
            }
            helperText={
              formik.touched.communication_address_state &&
              formik.errors.communication_address_state
            }
            className="login-input"
          >
            {states?.map((state) => (
              <MenuItem value={state} key={state}>
                {state}
              </MenuItem>
            ))}
          </TextField>
        </Col>
        <Col>
          <TextField
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="communication_address_pincode"
            name="communication_address_pincode"
            label="PIN Code"
            value={formik.values.communication_address_pincode}
            onChange={(event) =>
              handlePincodeChange(event, "communication_address_pincode")
            }
            error={
              formik.touched.communication_address_pincode &&
              Boolean(formik.errors.communication_address_pincode)
            }
            helperText={
              formik.touched.communication_address_pincode &&
              formik.errors.communication_address_pincode
            }
            className="login-input"
          />
        </Col>
      </Row>
      <br />
      <br />
      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="personal_email"
        name="personal_email"
        label="Personal Email"
        value={formik.values.personal_email}
        onChange={formik.handleChange}
        error={
          formik.touched.personal_email && Boolean(formik.errors.personal_email)
        }
        helperText={
          formik.touched.personal_email && formik.errors.personal_email
        }
        className="login-input"
      />
      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="official_email"
        name="official_email"
        label="Official Email (optional)"
        value={formik.values.official_email}
        onChange={formik.handleChange}
        error={
          formik.touched.official_email && Boolean(formik.errors.official_email)
        }
        helperText={
          formik.touched.official_email && formik.errors.official_email
        }
        className="login-input"
      />
      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="mobile"
        name="mobile"
        label="Personal Mobile"
        value={formik.values.mobile}
        error={formik.touched.mobile && Boolean(formik.errors.mobile)}
        helperText={formik.touched.mobile && formik.errors.mobile}
        className="login-input"
        onChange={(e) => {
          const re = /^[0-9\b]+$/;
          if (e.target.value === "" || re.test(e.target.value)) {
            formik.handleChange(e);
          }
        }}
        inputProps={{
          inputMode: "numeric",
          pattern: "[0-9]*",
          maxLength: 10,
        }}
      />
      <br />
      <br />
      <br />
      <h5>Emergency Contact Details</h5>
      <Row>
        <Col>
          <TextField
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="emergency_contact_name"
            name="emergency_contact_name"
            label="Emergency Contact Name"
            value={formik.values.emergency_contact_name}
            onChange={formik.handleChange}
            error={
              formik.touched.emergency_contact_name &&
              Boolean(formik.errors.emergency_contact_name)
            }
            helperText={
              formik.touched.emergency_contact_name &&
              formik.errors.emergency_contact_name
            }
            className="login-input"
          />
        </Col>
        <Col>
          <TextField
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="emergency_contact"
            name="emergency_contact"
            label="Emergency Contact"
            value={formik.values.emergency_contact}
            onChange={(e) => {
              const re = /^[0-9\b]+$/;

              if (e.target.value === "" || re.test(e.target.value)) {
                formik.handleChange(e);
              }
            }}
            inputProps={{
              inputMode: "numeric",
              pattern: "[0-9]*",
              maxLength: 10,
            }}
            error={
              formik.touched.emergency_contact &&
              Boolean(formik.errors.emergency_contact)
            }
            helperText={
              formik.touched.emergency_contact &&
              formik.errors.emergency_contact
            }
            className="login-input"
          />
        </Col>
      </Row>
      <Row>
        <Col>
          <TextField
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="close_friend_contact_no"
            name="close_friend_contact_no"
            label="Close Friend Contact No"
            value={formik.values.close_friend_contact_no}
            error={
              formik.touched.close_friend_contact_no &&
              Boolean(formik.errors.close_friend_contact_no)
            }
            helperText={
              formik.touched.close_friend_contact_no &&
              formik.errors.close_friend_contact_no
            }
            className="login-input"
            onChange={(e) => {
              const re = /^[0-9\b]+$/;

              if (e.target.value === "" || re.test(e.target.value)) {
                formik.handleChange(e);
              }
            }}
            inputProps={{
              inputMode: "numeric",
              pattern: "[0-9]*",
              maxLength: 10,
            }}
          />
        </Col>
        <Col>
          <TextField
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="close_friend_contact_name"
            name="close_friend_contact_name"
            label="Close Friend Contact Name"
            value={formik.values.close_friend_contact_name}
            error={
              formik.touched.close_friend_contact_name &&
              Boolean(formik.errors.close_friend_contact_name)
            }
            helperText={
              formik.touched.close_friend_contact_name &&
              formik.errors.close_friend_contact_name
            }
            className="login-input"
            onChange={formik.handleChange}
          />
        </Col>
      </Row>
      <br />
      <br />
      <h5>Family Members</h5>
      <FormGroup row>
        <FormControlLabel
          control={
            <Checkbox name="Father" onChange={handleFamilyMemberChange} />
          }
          label="Father"
        />
        <FormControlLabel
          control={
            <Checkbox name="Mother" onChange={handleFamilyMemberChange} />
          }
          label="Mother"
        />
        <FormControlLabel
          control={
            <Checkbox name="Spouse" onChange={handleFamilyMemberChange} />
          }
          label="Spouse"
        />

        <FormControl
          variant="outlined"
          style={{ minWidth: 120, margin: "8px" }}
        >
          <TextField
            select
            label="Number of Children"
            name=""
            id=""
            onChange={handleNumChildrenChange}
            value={numChildren}
            sx={{ width: "200px" }}
            size="small"
          >
            <MenuItem value="Child 1">Child 1</MenuItem>
            <MenuItem value="Child 2">Child 2</MenuItem>
            <MenuItem value="Child 3">Child 3</MenuItem>
            <MenuItem value="Child 4">Child 4</MenuItem>
          </TextField>
        </FormControl>
      </FormGroup>
      {formik.touched.family_members && formik.errors.family_members ? (
        <div style={{ color: "red" }}>{formik.errors.family_members}</div>
      ) : null}
      <br />
      <br />
      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="blood_group"
        name="blood_group"
        label="Blood Group"
        value={formik.values.blood_group}
        onChange={formik.handleChange}
        error={formik.touched.blood_group && Boolean(formik.errors.blood_group)}
        helperText={formik.touched.blood_group && formik.errors.blood_group}
        className="login-input"
      />
      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="highest_qualification"
        name="highest_qualification"
        label="Highest Qualification"
        value={formik.values.highest_qualification}
        onChange={formik.handleChange}
        error={
          formik.touched.highest_qualification &&
          Boolean(formik.errors.highest_qualification)
        }
        helperText={
          formik.touched.highest_qualification &&
          formik.errors.highest_qualification
        }
        className="login-input"
      />
      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="aadhar_no"
        name="aadhar_no"
        label="Aadhar Number"
        value={formik.values.aadhar_no}
        onChange={handleAadharNoChange}
        inputProps={{
          inputMode: "numeric", // Set input mode to numeric for better mobile support
          pattern: "[0-9]*", // Pattern to allow only numeric input
          maxLength: 12, // Limit the input to 12 characters
        }}
        error={formik.touched.aadhar_no && Boolean(formik.errors.aadhar_no)}
        helperText={formik.touched.aadhar_no && formik.errors.aadhar_no}
        className="login-input"
      />
      <br />
      <br />
      <Row>
        <Col xs={6}>
          <label htmlFor="aadharPhotoFront">
            <b>Aadhar Photo Front:&nbsp;</b>
          </label>

          <input
            type="file"
            id="aadharPhotoFront"
            name="aadharPhotoFront"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileUpload(e, "aadhar_photo_front")}
          />
          <br />
          <br />
          {formik.values.aadhar_photo_front !== "" ? (
            <>
              <a href={formik.values.aadhar_photo_front}>
                {formik.values.aadhar_photo_front}
              </a>
              <br />
            </>
          ) : (
            ""
          )}
          {formik.touched.aadhar_photo_front &&
          formik.errors.aadhar_photo_front ? (
            <div style={{ color: "red" }}>
              {formik.errors.aadhar_photo_front}
            </div>
          ) : null}
        </Col>
        <Col xs={6}>
          <label htmlFor="aadharPhotoBack">
            <b>Aadhar Photo Back:&nbsp;</b>
          </label>
          <input
            type="file"
            id="aadharPhotoBack"
            name="aadharPhotoBack"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileUpload(e, "aadhar_photo_back")}
          />
          <br />
          <br />
          {formik.values.aadhar_photo_back !== "" ? (
            <>
              <a href={formik.values.aadhar_photo_back}>
                {formik.values.aadhar_photo_back}
              </a>
              <br />
            </>
          ) : (
            ""
          )}
          {formik.touched.aadhar_photo_back &&
          formik.errors.aadhar_photo_back ? (
            <div style={{ color: "red" }}>
              {formik.errors.aadhar_photo_back}
            </div>
          ) : null}
        </Col>
      </Row>
      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="pan_no"
        name="pan_no"
        label="PAN Number"
        value={formik.values.pan_no}
        onChange={(e) => {
          if (e.target.value.length <= 10) {
            formik.handleChange(e);
          }
        }}
        inputProps={{
          maxLength: 10,
          pattern: "[A-Za-z0-9]*",
        }}
        error={formik.touched.pan_no && Boolean(formik.errors.pan_no)}
        helperText={formik.touched.pan_no && formik.errors.pan_no}
        className="login-input"
      />
      <br />
      <br />
      <label htmlFor="panPhoto">
        <b>PAN Photo:&nbsp;</b>
      </label>
      <input
        type="file"
        id="panPhoto"
        name="panPhoto"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileUpload(e, "pan_photo")}
      />
      <br />
      <br />
      {formik.values.pan_photo !== "" ? (
        <>
          <a href={formik.values.pan_photo}>{formik.values.pan_photo}</a>
          <br />
        </>
      ) : (
        ""
      )}
      {formik.touched.pan_photo && formik.errors.pan_photo ? (
        <div style={{ color: "red" }}>{formik.errors.pan_photo}</div>
      ) : null}
      <br />
      <Row>
        <Col xs={6}>
          <label htmlFor="licensePhotoFront">
            <b>Driving License Photo Front:&nbsp;</b>
          </label>
          <input
            type="file"
            id="licensePhotoFront"
            name="licensePhotoFront"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileUpload(e, "license_front")}
          />
          <br />
          <br />
          {formik.values.license_front !== "" ? (
            <>
              <a href={formik.values.license_front}>
                {formik.values.license_front}
              </a>
              <br />
            </>
          ) : (
            ""
          )}
        </Col>
        <Col xs={6}>
          <label htmlFor="licensePhotoBack">
            <b>Driving License Photo Back:&nbsp;</b>
          </label>
          <input
            type="file"
            id="licensePhotoBack"
            name="licensePhotoBack"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileUpload(e, "license_back")}
          />
          <br />
          <br />
          {formik.values.license_back !== "" ? (
            <>
              <a href={formik.values.license_back}>
                {formik.values.license_back}
              </a>
              <br />
              <br />
            </>
          ) : (
            ""
          )}
        </Col>
      </Row>
      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="pf_no"
        name="pf_no"
        label="PF Number"
        value={formik.values.pf_no}
        onChange={formik.handleChange}
        error={formik.touched.pf_no && Boolean(formik.errors.pf_no)}
        helperText={formik.touched.pf_no && formik.errors.pf_no}
        className="login-input"
      />
      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="esic_no"
        name="esic_no"
        label="ESIC Number"
        value={formik.values.esic_no}
        onChange={formik.handleChange}
        error={formik.touched.esic_no && Boolean(formik.errors.esic_no)}
        helperText={formik.touched.esic_no && formik.errors.esic_no}
        className="login-input"
      />
      <br />
      <br />
      <h5>Insurance Details</h5>
      <FormGroup row>
        <FormControlLabel
          control={
            <Checkbox
              name="Mediclaim"
              onChange={handleInsuranceDetailsChange}
            />
          }
          label="Mediclaim"
        />
        <FormControlLabel
          control={
            <Checkbox
              name="Personal Accident"
              onChange={handleInsuranceDetailsChange}
            />
          }
          label="Personal Accident"
        />

        <FormControlLabel
          control={
            <Checkbox
              name="Not Available"
              onChange={handleInsuranceDetailsChange}
            />
          }
          label="Not Available"
        />
      </FormGroup>
      {formik.touched.insurance_status && formik.errors.insurance_status ? (
        <div style={{ color: "red" }}>{formik.errors.insurance_status}</div>
      ) : null}
      <br />
      <br />
      <h5>Bank Details</h5>
      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="bank_account_no"
        name="bank_account_no"
        label="Bank Account Number"
        value={formik.values.bank_account_no}
        onChange={formik.handleChange}
        error={
          formik.touched.bank_account_no &&
          Boolean(formik.errors.bank_account_no)
        }
        helperText={
          formik.touched.bank_account_no && formik.errors.bank_account_no
        }
        className="login-input"
      />
      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="bank_name"
        name="bank_name"
        label="Bank Name"
        value={formik.values.bank_name}
        onChange={formik.handleChange}
        error={formik.touched.bank_name && Boolean(formik.errors.bank_name)}
        helperText={formik.touched.bank_name && formik.errors.bank_name}
        className="login-input"
      />
      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="ifsc_code"
        name="ifsc_code"
        label="IFSC"
        value={formik.values.ifsc_code}
        onChange={formik.handleChange}
        error={formik.touched.ifsc_code && Boolean(formik.errors.ifsc_code)}
        helperText={formik.touched.ifsc_code && formik.errors.ifsc_code}
        className="login-input"
      />
      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="favorite_song"
        name="favorite_song"
        label="Favorite Song"
        value={formik.values.favorite_song}
        onChange={formik.handleChange}
        error={
          formik.touched.favorite_song && Boolean(formik.errors.favorite_song)
        }
        helperText={formik.touched.favorite_song && formik.errors.favorite_song}
        className="login-input"
      />
      <br />
      <br />
      <FormControl>
        <FormLabel id="demo-radio-buttons-group-label">
          <b>Marital Status</b>
        </FormLabel>

        <RadioGroup
          row
          aria-labelledby="demo-radio-buttons-group-label"
          name="marital_status"
          value={formik.values.marital_status}
          onChange={formik.handleChange}
        >
          <FormControlLabel value="single" control={<Radio />} label="Single" />
          <FormControlLabel
            value="married"
            control={<Radio />}
            label="Married"
          />
          <FormControlLabel
            value="widowed"
            control={<Radio />}
            label="Widowed"
          />
          <FormControlLabel
            value="divroced"
            control={<Radio />}
            label="Divorced"
          />
          <FormControlLabel
            value="separated"
            control={<Radio />}
            label="Separated"
          />
        </RadioGroup>
      </FormControl>
      {formik.touched.marital_status && formik.errors.marital_status ? (
        <div style={{ color: "red" }}>{formik.errors.marital_status}</div>
      ) : null}
      <br />
      <button className="btn" type="submit">
        Submit
      </button>
      <Snackbar
        open={fileSnackbar}
        message="File uploaded successfully!"
        sx={{ left: "auto !important", right: "24px !important" }}
      />
    </form>
  );
}

export default React.memo(CompleteKYC);
