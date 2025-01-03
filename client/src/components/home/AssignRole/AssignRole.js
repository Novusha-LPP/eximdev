import React, { useState } from "react";
import { useFormik } from "formik";
import { MenuItem, TextField } from "@mui/material";
import { Row, Col } from "react-bootstrap";
import axios from "axios";
import ExecutiveRoleModal from "./ExecutiveRoleModal"; // Import the modal

function AssignRole(props) {
  const [showModal, setShowModal] = useState(false);
  const [selectedImporters, setSelectedImporters] = useState([]); // Store selected importers

  const formik = useFormik({
    initialValues: {
      role: "",
    },
    onSubmit: async (values, { resetForm }) => {
      if (!props.selectedUser) {
        alert("Please select a user");
        return;
      }
      const data = {
        ...values,
        username: props.selectedUser,
        importers: selectedImporters,
      };
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/assign-role`,
        data
      );
      alert(res.data.message);
      resetForm();
    },
  });

  const handleRoleChange = (event) => {
    const role = event.target.value;
    formik.setFieldValue("role", role);

    // Show modal if the role is "Executive"
    if (role === "Executive") {
      setShowModal(true);
    }
  };

  const handleSaveImporters = (importers) => {
    setSelectedImporters(importers); // Update selected importers
  };

  return (
    <>
      <div className="job-details-container">
        <h4>Assign Role</h4>
        <form onSubmit={formik.handleSubmit}>
          <Row style={{ marginBottom: "20px" }}>
            <Col xs={12} lg={2}>
              <TextField
                select
                size="small"
                margin="dense"
                variant="filled"
                fullWidth
                id="role"
                name="role"
                label="Role"
                value={formik.values.role}
                onChange={handleRoleChange}
                error={formik.touched.role && Boolean(formik.errors.role)}
                helperText={formik.touched.role && formik.errors.role}
                className="login-input"
              >
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="Sr_Manager">Sr. Manager</MenuItem>
                <MenuItem value="Manager">Manager</MenuItem>
                <MenuItem value="Asst_Manager">Asst. Manager</MenuItem>
                <MenuItem value="Sr_Executive">Sr. Executive</MenuItem>
                <MenuItem value="Executive">Executive</MenuItem>
                <MenuItem value="Asst_Executive">Asst. Executive</MenuItem>
                <MenuItem value="User">User</MenuItem>
              </TextField>
              <button className="btn" type="submit">
                Submit
              </button>
            </Col>
          </Row>
        </form>
      </div>

      {/* Modal Component with Editing Capability */}
      <ExecutiveRoleModal
        open={showModal}
        onClose={() => setShowModal(false)}
        initialSelectedImporters={selectedImporters} // Pass saved importers
        onSave={handleSaveImporters} // Save updated importers
        selectedUser={props.selectedUser} // Pass the selected user
      />
    </>
  );
}

export default React.memo(AssignRole);
