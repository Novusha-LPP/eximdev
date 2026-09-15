import React, { useContext, useState } from "react";
import axios from "axios";
import { useFormik } from "formik";
import { TextField, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";
import { UserContext } from "../contexts/UserContext";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

function LoginForm() {
  const { setUser } = useContext(UserContext);

  const [errorDialog, setErrorDialog] = useState({
    open: false,
    title: "",
    message: ""
  });

  const closeErrorDialog = () => setErrorDialog({ open: false, title: "", message: "" });
  const showError = (title, message) => setErrorDialog({ open: true, title, message });

  // Surface any session expiration or authentication notices stored from API interceptors
  React.useEffect(() => {
    const authMessage = sessionStorage.getItem('auth_error_message');
    if (authMessage) {
      sessionStorage.removeItem('auth_error_message');
      showError("Session Notice", authMessage);
    }
  }, []);

  const formik = useFormik({
    initialValues: { username: "", password: "" },

    onSubmit: async (values, { resetForm }) => {
      try {
        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/login`,
          values,
          { withCredentials: true }
        );

        if (res.status === 200) {
          const { token, ...userdata } = res.data;

          // ✅ Save token separately for Authorization header use
          if (token) {
            localStorage.setItem('token', token);
          }

          // ✅ Save user data (without token) to exim_user
          localStorage.setItem('exim_user', JSON.stringify(userdata));

          setUser(userdata);
          resetForm();
        }
      } catch (error) {
        if (error.response) {
          const serverMessage = error.response.data?.message || error.response.data?.error;
          const status = error.response.status;

          if (status === 400) {
            showError("Login Failed", serverMessage || "Invalid username or password.");
          } else if (status === 401) {
            showError("Authentication Failed", serverMessage || "Invalid credentials. Please check your username and password.");
          } else if (status === 403) {
            showError("Access Denied", serverMessage || "Your account has been deactivated. Please contact the administrator.");
          } else if (status === 500) {
            showError("Server Error", serverMessage || "An internal error occurred on the server. Please contact support.");
          } else {
            showError("Error", serverMessage || `Login failed with status ${status}. Please try again.`);
          }
        } else if (error.request) {
          showError("Network Error", "Unable to connect to the server. Please check your internet connection or server status.");
        } else {
          showError("Error", error.message || "An unexpected error occurred during login.");
        }
      }
    },
  });

  return (
    <>
      <form onSubmit={formik.handleSubmit}>
        <TextField
          size="small" fullWidth margin="dense" variant="filled"
          id="username" name="username" label="Username"
          value={formik.values.username} onChange={formik.handleChange}
          error={formik.touched.username && Boolean(formik.errors.username)}
          helperText={formik.touched.username && formik.errors.username}
        />
        <TextField
          type="password"
          size="small" fullWidth margin="dense" variant="filled"
          id="password" name="password" label="Password"
          value={formik.values.password} onChange={formik.handleChange}
          error={formik.touched.password && Boolean(formik.errors.password)}
          helperText={formik.touched.password && formik.errors.password}
        />
        <button type="submit" className="btn">Login</button>
      </form>

      <Dialog
        open={errorDialog.open} onClose={closeErrorDialog}
        aria-labelledby="error-dialog-title"
        PaperProps={{ sx: { borderRadius: '12px', minWidth: '350px' } }}
      >
        <DialogTitle id="error-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#dc2626', fontWeight: 600 }}>
          <ErrorOutlineIcon sx={{ color: '#dc2626' }} />
          {errorDialog.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#4b5563' }}>{errorDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ padding: '16px 24px' }}>
          <Button onClick={closeErrorDialog} variant="contained"
            sx={{ backgroundColor: '#dc2626', '&:hover': { backgroundColor: '#b91c1c' }, borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default LoginForm;
