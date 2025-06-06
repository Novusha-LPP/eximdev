import React, { useState, useEffect } from "react";
import { TextField, Button, Container, Typography, Box } from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const SRCELLogin = () => {
  const [username, setUsername] = useState("alluvium");
  const [password, setPassword] = useState("cc093134255d6a0d77e590f4e847b84f");
  const [error, setError] = useState("");
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setUserData(null);
    setIsLoading(true);
    try {
      const response = await axios.post(
        "http://icloud.assetscontrols.com:8092/OpenApi/login",
        {
          FUserName: username,
          FPassword: password, // In a real app, you'd hash this password
        }
      );
      if (response.data.Result === 200) {
        const userDetails = response.data.FObject[0];
        localStorage.setItem("token", userDetails.FTokenID);
        localStorage.setItem("userData", JSON.stringify(userDetails));
        console.log(userDetails);
        setUserData(userDetails);
        setIsLoading(false);
        // Pass userDetails to dashboard using state
        setTimeout(
          () => navigate("/dashboard", { state: { userDetails } }),
          100
        );
      } else {
        setError(response.data.Message);
        setIsLoading(false);
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };
  useEffect(() => {
    if (userData) {
      console.log("userData updated:", userData);
    }
  }, [userData]);

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography component="h1" variant="h5">
          GPS Truck Tracking Login
        </Typography>
        <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            // type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </Button>
          {error && (
            <Typography color="error" align="center">
              {error}
            </Typography>
          )}
        </Box>
        {userData && (
          <Box mt={3}>
            <Typography variant="h6">Login Successful!</Typography>
            <Typography variant="body1">
              <strong>Username:</strong> {userData.FUserName}
            </Typography>
            <Typography variant="body1">
              <strong>User GUID:</strong> {userData.FUserGUID}
            </Typography>
            <Typography variant="body1">
              <strong>Token ID:</strong> {userData.FTokenID}
            </Typography>
            <Typography variant="body1">
              <strong>Expiration Time:</strong> {userData.FExpireTime}
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default SRCELLogin;
