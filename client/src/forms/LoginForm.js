import React, { useContext, useState } from "react";
import axios from "axios";
import {
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { UserContext } from "../contexts/UserContext";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const { setUser } = useContext(UserContext);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/login`,
        { username, password },
        { withCredentials: true }
      );

      setUser(res.data); // user info returned from backend
      navigate("/");
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        if (status === 400 || status === 401) {
          setLoginError(error.response.data.message || "Invalid credentials");
        } else if (status === 500) {
          setLoginError("Server error. Please try again later.");
        } else {
          setLoginError("An unexpected error occurred.");
        }
      } else {
        setLoginError("Network error. Please check your connection.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        maxWidth: 400,
        margin: "auto",
        padding: 3,
      }}
    >
      <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
        Login
      </Typography>

      {loginError && (
        <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
          {loginError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} style={{ width: "100%" }}>
        <TextField
          fullWidth
          label="Username"
          variant="outlined"
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <TextField
          fullWidth
          label="Password"
          type={showPassword ? "text" : "password"}
          variant="outlined"
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          sx={{ mt: 3, mb: 2 }}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Logging In..." : "Login"}
        </Button>
      </form>
    </Box>
  );
}

export default LoginPage;
