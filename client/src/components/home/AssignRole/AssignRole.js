import React, { useState } from "react";
import axios from "axios";
import {
  MenuItem,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Avatar,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { useFormik } from "formik";
import { Row, Col } from "react-bootstrap";
import ExecutiveRoleModal from "./ExecutiveRoleModal";

function AssignRole({ selectedUser }) {
  const [selectedRole, setSelectedRole] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [importerOptions, setImporterOptions] = useState([]);
  const [selectedImporters, setSelectedImporters] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "",
  });

  const fetchUsersByRole = async (role) => {
    if (!role) {
      setUsers([]);
      setErrorMessage("Please select a role to fetch users.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/users-by-role?role=${role}`
      );

      if (res.data.success && res.data.users.length === 0) {
        setErrorMessage(res.data.message);
      } else {
        setUsers(res.data.users);
      }
    } catch (error) {
      setErrorMessage("Failed to fetch users. Please try again later.");
      console.error("Error fetching users by role:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchImporterOptions = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/importers`
      );
      setImporterOptions(res.data.importers.map((importer) => importer.name));
    } catch (error) {
      console.error("Error fetching importer options:", error);
    }
  };

  const handleRoleChange = (event) => {
    const role = event.target.value;
    setSelectedRole(role);
    fetchUsersByRole(role);
  };

  const handleBoxClick = async (user) => {
    setSelectedUserDetails(user);
    setSelectedImporters(user.assigned_importer_name); // Set the raw IDs for now

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/importers`
      );
      const allImporters = res.data.importers;

      // Filter importers based on assigned_importer_name
      const assignedImporters = allImporters.filter((importer) =>
        user.assigned_importer_name.includes(importer._id)
      );

      setSelectedImporters(assignedImporters); // Update with detailed importer info
    } catch (error) {
      console.error("Error fetching importer details:", error);
    }

    fetchImporterOptions();
    setShowModal(true);
  };

  const formik = useFormik({
    initialValues: {
      role: "",
    },
    onSubmit: async (values, { resetForm }) => {
      if (!selectedUser) {
        setSnackbar({
          open: true,
          message: "Please select a user",
          type: "warning",
        });
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

        setSnackbar({
          open: true,
          message: res.data.message,
          type: "success",
        });

        resetForm();
        setSelectedImporters([]);
      } catch (error) {
        console.error("Error assigning role:", error);

        setSnackbar({
          open: true,
          message: "Failed to assign role. Please try again.",
          type: "error",
        });
      }
    },
  });

  const handleSnackbarClose = () => {
    setSnackbar({ open: false, message: "", type: "" });
  };

  return (
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
              label="Role"
              value={formik.values.role}
              onChange={(event) => {
                handleRoleChange(event);
                formik.setFieldValue("role", event.target.value);
              }}
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
          </Col>
          <Col xs={12} lg={10}>
            {loading ? (
              <CircularProgress />
            ) : errorMessage ? (
              <Typography>{errorMessage}</Typography>
            ) : (
              <Grid container spacing={2}>
                {users.map((user) => (
                  <Grid item xs={12} sm={6} md={4} key={user._id}>
                    <Card onClick={() => handleBoxClick(user)}>
                      <CardContent>
                        <Avatar
                          src={user.employee_photo || "/default-avatar.png"}
                        />
                        <Typography>{user.username}</Typography>
                        <Typography>Role: {user.role}</Typography>
                        <Typography>
                          Importers: {user.assigned_importer_name.length}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Col>
        </Row>
      </form>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
      >
        <Alert severity={snackbar.type}>{snackbar.message}</Alert>
      </Snackbar>

      <ExecutiveRoleModal
        open={showModal}
        onClose={() => setShowModal(false)}
        initialSelectedImporters={selectedImporters.map((imp) => imp.name)}
        onSave={(importers) => setSelectedImporters(importers)}
        selectedUser={selectedUser}
        userDetails={selectedUserDetails}
      />
    </div>
  );
}

export default React.memo(AssignRole);
