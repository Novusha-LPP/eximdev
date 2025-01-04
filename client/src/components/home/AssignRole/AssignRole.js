// src/components/AssignRole.js
import React, { useState } from "react";
import { useFormik } from "formik";
import { MenuItem, TextField, Button, Typography } from "@mui/material";
import { Row, Col } from "react-bootstrap";
import axios from "axios";
import ExecutiveRoleModal from "./ExecutiveRoleModal";
import UserImportersBox from "./UserImportersBox";
import sampleUsers from "./sampleUsers";

function AssignRole({ selectedUser }) {
  // Destructure props
  const [showModal, setShowModal] = useState(false);
  const [selectedImporters, setSelectedImporters] = useState([]);
  const [selectedUserData, setSelectedUserData] = useState(null); // State for UserRoleInfoModal

  const formik = useFormik({
    initialValues: {
      role: "",
    },
    onSubmit: async (values, { resetForm }) => {
      if (!selectedUser) {
        alert("Please select a user");
        return;
      }
      const data = {
        ...values,
        username: selectedUser,
        importers: selectedImporters,
      };
      try {
        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/assign-role`,
          data
        );
        alert(res.data.message);
        resetForm();
        setSelectedImporters([]); // Reset selected importers after submission
      } catch (error) {
        console.error("Error assigning role:", error);
        alert("Failed to assign role. Please try again.");
      }
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
    setSelectedImporters(importers);
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
                <MenuItem value="">Clear</MenuItem>
              </TextField>
              <Button
                variant="contained"
                color="primary"
                type="submit"
                style={{ marginTop: "10px" }}
              >
                Submit
              </Button>
            </Col>
            <Col xs={12} lg={10}>
              <UserImportersBox
                users={sampleUsers}
                role={formik.values.role}
                selectedUser={selectedUser}
              />
            </Col>
          </Row>
        </form>
      </div>

      {/* ExecutiveRoleModal for 'Executive' role */}
      <ExecutiveRoleModal
        open={showModal}
        onClose={() => setShowModal(false)}
        initialSelectedImporters={selectedImporters} // Pass saved importers
        onSave={handleSaveImporters} // Save updated importers
        selectedUser={selectedUser} // Pass the selected user
      />
    </>
  );
}

export default React.memo(AssignRole);
