import React, { useContext, useState } from "react";
import axios from "axios";
import { useFormik } from "formik";
import { TextField, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";
import { UserContext } from "../contexts/UserContext";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

function LoginPage() {
  const { setUser } = useContext(UserContext);

  // Error Dialog State
  const [errorDialog, setErrorDialog] = useState({
    open: false,
    title: "",
    message: ""
  });

  const closeErrorDialog = () => {
    setErrorDialog({ open: false, title: "", message: "" });
  };

  const showError = (title, message) => {
    setErrorDialog({ open: true, title, message });
  };

  const formik = useFormik({
    initialValues: {
      username: "",
      password: "",
    },

    onSubmit: async (values, { resetForm }) => {
      try {
        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/login`,
          values,
          { withCredentials: true }
        );

        if (res.status === 200) {
          localStorage.setItem("selected_branch", res.data.assignedBranch || "AHMEDABAD HO");
          setUser(res.data);
          resetForm();
        }
      } catch (error) {
        if (error.response) {
          if (error.response.status === 400) {
            showError("Login Failed", error.response.data.message || "Invalid username or password.");
          } else if (error.response.status === 403) {
            showError("Account Deactivated", "Your account has been deactivated. Please contact the administrator.");
          } else {
            showError("Error", "An unexpected error occurred. Please try again later.");
          }
        } else {
          showError("Network Error", "Unable to connect to the server. Please check your internet connection.");
        }
      }
    },
  });

  return (
    <>
      <form onSubmit={formik.handleSubmit}>
        <TextField
          size="small"
          fullWidth
          margin="dense"
          variant="filled"
          id="username"
          name="username"
          label="Username"
          value={formik.values.username}
          onChange={formik.handleChange}
          error={formik.touched.username && Boolean(formik.errors.username)}
          helperText={formik.touched.username && formik.errors.username}
        />
        <TextField
          type="password"
          size="small"
          fullWidth
          margin="dense"
          variant="filled"
          id="password"
          name="password"
          label="Password"
          value={formik.values.password}
          onChange={formik.handleChange}
          error={formik.touched.password && Boolean(formik.errors.password)}
          helperText={formik.touched.password && formik.errors.password}
        />
        <button type="submit" className="btn">
          Login
        </button>
      </form>

      {/* Error Dialog */}
      <Dialog
        open={errorDialog.open}
        onClose={closeErrorDialog}
        aria-labelledby="error-dialog-title"
        aria-describedby="error-dialog-description"
        PaperProps={{
          sx: {
            borderRadius: '12px',
            minWidth: '350px'
          }
        }}
      >
        <DialogTitle
          id="error-dialog-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: '#dc2626',
            fontWeight: 600
          }}
        >
          <ErrorOutlineIcon sx={{ color: '#dc2626' }} />
          {errorDialog.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="error-dialog-description" sx={{ color: '#4b5563' }}>
            {errorDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ padding: '16px 24px' }}>
          <Button
            onClick={closeErrorDialog}
            variant="contained"
            sx={{
              backgroundColor: '#dc2626',
              '&:hover': { backgroundColor: '#b91c1c' },
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default LoginPage;
