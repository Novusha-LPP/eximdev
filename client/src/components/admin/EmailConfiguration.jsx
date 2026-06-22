
import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  CircularProgress,
  FormControlLabel,
  Switch,
  Divider,
  Alert,
  Snackbar,
  InputAdornment,
  IconButton,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import TestIcon from "@mui/icons-material/CheckCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { toast } from "react-hot-toast";
import { emailAPI } from "../../api/emailAPI";

// Email provider options
const EMAIL_PROVIDERS = [
  { id: "smtp", name: "SMTP Server", description: "Custom SMTP server configuration" },
  { id: "resend", name: "Resend", description: "Resend email service" },
  { id: "sendgrid", name: "SendGrid", description: "SendGrid email service" },
  { id: "mailgun", name: "Mailgun", description: "Mailgun transactional email" },
  { id: "gmail", name: "Gmail API", description: "Google Gmail API" },
];

// Default email configuration
const DEFAULT_CONFIG = {
  provider: "smtp",
  smtp_server: "",
  smtp_port: 587,
  username: "",
  password: "",
  use_tls: true,
  use_ssl: false,
  from_email: "",
  from_name: "",
  reply_to: "",
  test_email: "",
  rate_limit: 100,
  daily_limit: 1000,
  enabled: true,
  last_test: null,
  last_test_status: null,
};

// Email template variables
const EMAIL_TEMPLATE_VARIABLES = [
  { variable: "{user_name}", description: "Recipient's full name" },
  { variable: "{user_email}", description: "Recipient's email address" },
  { variable: "{ticket_number}", description: "Ticket reference number" },
  { variable: "{ticket_title}", description: "Ticket subject/title" },
  { variable: "{ticket_priority}", description: "Ticket priority level" },
  { variable: "{assignee_name}", description: "Assignee's name" },
  { variable: "{creator_name}", description: "Ticket creator's name" },
  { variable: "{asset_tag}", description: "Asset tag/number" },
  { variable: "{asset_name}", description: "Asset name/description" },
  { variable: "{system_name}", description: "System/application name" },
  { variable: "{date}", description: "Current date" },
  { variable: "{time}", description: "Current time" },
  { variable: "{company_name}", description: "Company/organization name" },
  { variable: "{support_email}", description: "Support email address" },
  { variable: "{support_phone}", description: "Support phone number" },
];

export default function EmailConfiguration() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testLogs, setTestLogs] = useState([]);

  // Fetch configuration
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await emailAPI.config.get();
      if (response.success && response.data) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error("Error fetching email configuration:", error);
      toast.error("Failed to load email configuration");
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  // Handle provider change
  const handleProviderChange = (providerId) => {
    const provider = EMAIL_PROVIDERS.find(p => p.id === providerId);
    if (!provider) return;

    setConfig(prev => ({
      ...prev,
      provider: providerId
    }));
  };

  // Save configuration
  const handleSaveConfig = async () => {
    setSaving(true);

    // Validate required fields
    if (!config.smtp_server || !config.username || !config.from_email) {
      toast.error("SMTP Server, Username, and From Email are required");
      setSaving(false);
      return;
    }

    try {
      await emailAPI.config.save(config);
      toast.success("Email configuration saved successfully");
      setSaving(false);
      // Update last modified timestamp
      setConfig(prev => ({
        ...prev,
        last_test: new Date().toISOString().split('T')[0] + " " + 
                  new Date().toLocaleTimeString('en-US', { hour12: false })
      }));
    } catch (error) {
      console.error("Error saving email configuration:", error);
      toast.error("Failed to save email configuration: " + (error.response?.data?.message || error.message));
      setSaving(false);
    }
  };

  // Test email configuration
  const handleTestConfig = async () => {
    if (!config.test_email) {
      toast.error("Please enter a test email address");
      return;
    }

    setTesting(true);
    setTestLogs([]);

    try {
      const result = await emailAPI.config.sendTest({
        to: config.test_email,
        config: config
      });

      if (result.success) {
        setTestResult("success");
        toast.success("Email test completed successfully");

        // Update config with test result
        setConfig(prev => ({
          ...prev,
          last_test: new Date().toISOString().split('T')[0] + " " + 
                    new Date().toLocaleTimeString('en-US', { hour12: false }),
          last_test_status: "success"
        }));
      } else {
        setTestResult("error");
        toast.error("Email test failed: " + result.error);

        setConfig(prev => ({
          ...prev,
          last_test_status: "error"
        }));
      }

      // Set the test logs
      setTestLogs(result.logs || []);
    } catch (error) {
      console.error("Error testing email configuration:", error);
      setTestResult("error");
      toast.error("Email test failed: " + (error.response?.data?.message || error.message));

      setConfig(prev => ({
        ...prev,
        last_test_status: "error"
      }));
    } finally {
      setTesting(false);
    }
  };

  // Reset configuration
  const handleResetConfig = () => {
    if (window.confirm("Are you sure you want to reset to default configuration?")) {
      setConfig(DEFAULT_CONFIG);
      toast.success("Configuration reset to defaults");
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Format last test timestamp
  const formatLastTest = () => {
    if (!config.last_test) return "Never tested";
    return config.last_test;
  };

  // Initialize data
  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <EmailIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Email Configuration
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Status and Actions Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Email Service Status
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: config.enabled ? '#4caf50' : '#f44336'
                        }}
                      />
                      <Typography variant="body2">
                        {config.enabled ? "Active" : "Disabled"}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Last Test: {formatLastTest()}
                      {config.last_test_status === "success" && (
                        <Typography component="span" color="success.main" ml={1}>
                          ✓ Success
                        </Typography>
                      )}
                      {config.last_test_status === "error" && (
                        <Typography component="span" color="error.main" ml={1}>
                          ✗ Failed
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" gap={1} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={handleResetConfig}
                    >
                      Reset
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<TestIcon />}
                      onClick={handleTestConfig}
                      disabled={testing || !config.enabled}
                    >
                      {testing ? "Testing..." : "Test Configuration"}
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveConfig}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Configuration"}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Main Configuration Form */}
          <Grid container spacing={3}>
            {/* SMTP Configuration */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    SMTP Configuration
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="SMTP Server"
                        name="smtp_server"
                        value={config.smtp_server}
                        onChange={handleInputChange}
                        fullWidth
                        required
                        placeholder="e.g., smtp.gmail.com"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="SMTP Port"
                        name="smtp_port"
                        value={config.smtp_port}
                        onChange={handleInputChange}
                        fullWidth
                        type="number"
                        placeholder="e.g., 587"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Username"
                        name="username"
                        value={config.username}
                        onChange={handleInputChange}
                        fullWidth
                        required
                        placeholder="SMTP username"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={config.password}
                        onChange={handleInputChange}
                        fullWidth
                        required
                        placeholder="SMTP password"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={togglePasswordVisibility}
                                edge="end"
                              >
                                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.use_tls}
                            onChange={handleInputChange}
                            name="use_tls"
                          />
                        }
                        label="Use TLS"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.use_ssl}
                            onChange={handleInputChange}
                            name="use_ssl"
                          />
                        }
                        label="Use SSL"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Sender Information */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Sender Information
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="From Email"
                        name="from_email"
                        value={config.from_email}
                        onChange={handleInputChange}
                        fullWidth
                        required
                        placeholder="e.g., noreply@company.com"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="From Name"
                        name="from_name"
                        value={config.from_name}
                        onChange={handleInputChange}
                        fullWidth
                        placeholder="e.g., IT Helpdesk"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Reply-To Email"
                        name="reply_to"
                        value={config.reply_to}
                        onChange={handleInputChange}
                        fullWidth
                        placeholder="e.g., support@company.com"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Limits and Testing */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Rate Limits
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Rate Limit (per hour)"
                        name="rate_limit"
                        value={config.rate_limit}
                        onChange={handleInputChange}
                        fullWidth
                        type="number"
                        helperText="Maximum emails per hour"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Daily Limit"
                        name="daily_limit"
                        value={config.daily_limit}
                        onChange={handleInputChange}
                        fullWidth
                        type="number"
                        helperText="Maximum emails per day"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.enabled}
                            onChange={handleInputChange}
                            name="enabled"
                          />
                        }
                        label="Enable Email Service"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Test Configuration */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Test Configuration
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="Test Email Address"
                        name="test_email"
                        value={config.test_email}
                        onChange={handleInputChange}
                        fullWidth
                        placeholder="Enter email for testing"
                        helperText="A test email will be sent to this address"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        startIcon={<TestIcon />}
                        onClick={handleTestConfig}
                        disabled={testing || !config.enabled || !config.test_email}
                        fullWidth
                      >
                        {testing ? "Testing..." : "Send Test Email"}
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Test Logs */}
            {testLogs.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Test Results
                    </Typography>
                    <Box
                      sx={{
                        backgroundColor: '#f5f5f5',
                        borderRadius: 1,
                        p: 2,
                        maxHeight: 200,
                        overflowY: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                      }}
                    >
                      {testLogs.map((log, index) => (
                        <Box key={index} mb={0.5}>
                          {log}
                        </Box>
                      ))}
                    </Box>
                    {testResult === "success" && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        Email test completed successfully! Configuration is working correctly.
                      </Alert>
                    )}
                    {testResult === "error" && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        Email test failed. Please check your SMTP settings and credentials.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Template Variables */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Email Template Variables
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Use these variables in your email templates for dynamic content:
                  </Typography>
                  <Grid container spacing={1}>
                    {EMAIL_TEMPLATE_VARIABLES.map((item, index) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                        <Card variant="outlined" sx={{ p: 1.5 }}>
                          <Typography variant="body2" fontFamily="monospace" color="primary">
                            {item.variable}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.description}
                          </Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
