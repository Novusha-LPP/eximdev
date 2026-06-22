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
  Select,
  MenuItem,
  InputAdornment,
  Chip,
  Slider,
  Tabs,
  Tab,
  FormGroup,
  RadioGroup,
  Radio,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import SaveIcon from "@mui/icons-material/Save";
import RestoreIcon from "@mui/icons-material/Restore";
import BackupIcon from "@mui/icons-material/Backup";
import SecurityIcon from "@mui/icons-material/Security";
import NotificationsIcon from "@mui/icons-material/Notifications";
import LanguageIcon from "@mui/icons-material/Language";
import StorageIcon from "@mui/icons-material/Storage";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { toast } from "react-hot-toast";

// System settings categories
const SETTING_CATEGORIES = [
  { id: "general", label: "General", icon: <SettingsIcon /> },
  { id: "security", label: "Security", icon: <SecurityIcon /> },
  { id: "notifications", label: "Notifications", icon: <NotificationsIcon /> },
  { id: "localization", label: "Localization", icon: <LanguageIcon /> },
  { id: "performance", label: "Performance", icon: <StorageIcon /> },
  { id: "backup", label: "Backup", icon: <BackupIcon /> },
];

// Timezone options
const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney"
];

// Date format options
const DATE_FORMATS = [
  "YYYY-MM-DD",
  "MM/DD/YYYY",
  "DD/MM/YYYY",
  "MMMM DD, YYYY",
  "DD MMMM, YYYY"
];

// Time format options
const TIME_FORMATS = [
  "24-hour",
  "12-hour"
];

// Default system settings
const DEFAULT_SETTINGS = {
  // General settings
  system_name: "IT Helpdesk Management System",
  organization_name: "Company Name",
  support_email: "support@company.com",
  support_phone: "+1 (555) 123-4567",
  timezone: "Asia/Kolkata",
  date_format: "YYYY-MM-DD",
  time_format: "24-hour",
  enable_maintenance_mode: false,
  maintenance_message: "System is under maintenance. Please try again later.",
  
  // Security settings
  enable_two_factor_auth: true,
  session_timeout_minutes: 30,
  max_login_attempts: 5,
  password_min_length: 8,
  require_password_complexity: true,
  enable_ip_whitelisting: false,
  allowed_ips: ["192.168.1.0/24", "10.0.0.0/8"],
  enable_audit_logging: true,
  audit_log_retention_days: 90,
  
  // Notification settings
  enable_email_notifications: true,
  enable_sms_notifications: false,
  enable_push_notifications: true,
  notification_cooldown_minutes: 5,
  enable_digest_emails: true,
  digest_email_frequency: "daily", // daily, weekly, monthly
  digest_email_time: "08:00",
  
  // Localization settings
  default_language: "en",
  currency_symbol: "$",
  currency_code: "USD",
  number_format: "1,234.56",
  decimal_separator: ".",
  thousand_separator: ",",
  
  // Performance settings
  cache_enabled: true,
  cache_ttl_minutes: 60,
  query_cache_size: 1000,
  max_upload_size_mb: 50,
  max_concurrent_users: 1000,
  enable_gzip_compression: true,
  enable_cdn: false,
  
  // Backup settings
  enable_auto_backup: true,
  backup_frequency: "daily", // daily, weekly, monthly
  backup_retention_days: 30,
  backup_time: "02:00",
  enable_cloud_backup: false,
  backup_encryption: true,
  last_backup_date: null,
  last_backup_status: null,
};

export default function SystemSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState("general");
  const [backupLogs, setBackupLogs] = useState([]);
  const [backupInProgress, setBackupInProgress] = useState(false);

  // Fetch settings
  const fetchSettings = () => {
    setLoading(true);
    // In a real app, this would be an API call
    setTimeout(() => {
      // Mock settings data with some modifications
      const mockSettings = {
        ...DEFAULT_SETTINGS,
        system_name: "AlVision IT Helpdesk",
        organization_name: "AlVision Exim",
        support_email: "helpdesk@alvision.in",
        support_phone: "+91 9876543210",
        timezone: "Asia/Kolkata",
        date_format: "DD/MM/YYYY",
        enable_two_factor_auth: true,
        session_timeout_minutes: 60,
        max_login_attempts: 3,
        enable_email_notifications: true,
        enable_auto_backup: true,
        last_backup_date: "2023-07-15 02:00:00",
        last_backup_status: "success",
      };

      setSettings(mockSettings);
      setLoading(false);
    }, 700);
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  // Handle category change
  const handleCategoryChange = (event, newValue) => {
    setActiveCategory(newValue);
  };

  // Save settings
  const handleSaveSettings = () => {
    setSaving(true);
    
    // Validate required fields
    if (!settings.system_name || !settings.organization_name) {
      toast.error("System Name and Organization Name are required");
      setSaving(false);
      return;
    }

    // In a real app, this would be an API call
    setTimeout(() => {
      toast.success("System settings saved successfully");
      setSaving(false);
      
      // Update last modified timestamp
      const now = new Date().toLocaleString();
      setBackupLogs(prev => [...prev, `[${now}] System settings updated`]);
    }, 1200);
  };

  // Restore defaults
  const handleRestoreDefaults = () => {
    if (window.confirm("Are you sure you want to restore all settings to defaults?")) {
      setSettings(DEFAULT_SETTINGS);
      toast.success("Settings restored to defaults");
      setBackupLogs(prev => [...prev, `[${new Date().toLocaleString()}] Settings restored to defaults`]);
    }
  };

  // Run manual backup
  const handleRunBackup = () => {
    setBackupInProgress(true);
    setBackupLogs(prev => [...prev, `[${new Date().toLocaleString()}] Starting manual backup...`]);
    
    // Simulate backup process
    setTimeout(() => {
      setBackupLogs(prev => [...prev, `[${new Date().toLocaleString()}] Initializing backup process...`]);
      
      setTimeout(() => {
        setBackupLogs(prev => [...prev, `[${new Date().toLocaleString()}] Backing up database...`]);
        
        setTimeout(() => {
          setBackupLogs(prev => [...prev, `[${new Date().toLocaleString()}] Backing up user files...`]);
          
          setTimeout(() => {
            setBackupLogs(prev => [...prev, `[${new Date().toLocaleString()}] Compressing backup files...`]);
            
            setTimeout(() => {
              const success = Math.random() > 0.1; // 90% success rate for demo
              if (success) {
                setBackupLogs(prev => [...prev, `[${new Date().toLocaleString()}] ✓ Backup completed successfully!`]);
                toast.success("Backup completed successfully");
                
                // Update settings with backup info
                setSettings(prev => ({
                  ...prev,
                  last_backup_date: new Date().toLocaleString(),
                  last_backup_status: "success"
                }));
              } else {
                setBackupLogs(prev => [...prev, `[${new Date().toLocaleString()}] ✗ Backup failed. Check storage permissions.`]);
                toast.error("Backup failed. Please check system permissions.");
              }
              setBackupInProgress(false);
            }, 800);
          }, 600);
        }, 400);
      }, 200);
    }, 100);
  };

  // Format last backup date
  const formatLastBackup = () => {
    if (!settings.last_backup_date) return "Never backed up";
    return settings.last_backup_date;
  };

  // Get backup status color
  const getBackupStatusColor = () => {
    if (!settings.last_backup_status) return "default";
    return settings.last_backup_status === "success" ? "success" : "error";
  };

  // Initialize data
  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <SettingsIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          System Settings
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Category Tabs */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 0 }}>
              <Tabs
                value={activeCategory}
                onChange={handleCategoryChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                {SETTING_CATEGORIES.map(category => (
                  <Tab
                    key={category.id}
                    value={category.id}
                    icon={category.icon}
                    iconPosition="start"
                    label={category.label}
                    sx={{ minHeight: 64 }}
                  />
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Settings Form */}
          <Grid container spacing={3}>
            {/* General Settings */}
            {activeCategory === "general" && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      General Settings
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="System Name"
                          name="system_name"
                          value={settings.system_name}
                          onChange={handleInputChange}
                          fullWidth
                          required
                          placeholder="IT Helpdesk Management System"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Organization Name"
                          name="organization_name"
                          value={settings.organization_name}
                          onChange={handleInputChange}
                          fullWidth
                          required
                          placeholder="Your Company Name"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Support Email"
                          name="support_email"
                          value={settings.support_email}
                          onChange={handleInputChange}
                          fullWidth
                          type="email"
                          placeholder="support@company.com"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Support Phone"
                          name="support_phone"
                          value={settings.support_phone}
                          onChange={handleInputChange}
                          fullWidth
                          placeholder="+1 (555) 123-4567"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Select
                          label="Timezone"
                          name="timezone"
                          value={settings.timezone}
                          onChange={handleInputChange}
                          fullWidth
                        >
                          {TIMEZONES.map(tz => (
                            <MenuItem key={tz} value={tz}>{tz}</MenuItem>
                          ))}
                        </Select>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Select
                          label="Date Format"
                          name="date_format"
                          value={settings.date_format}
                          onChange={handleInputChange}
                          fullWidth
                        >
                          {DATE_FORMATS.map(format => (
                            <MenuItem key={format} value={format}>{format}</MenuItem>
                          ))}
                        </Select>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Select
                          label="Time Format"
                          name="time_format"
                          value={settings.time_format}
                          onChange={handleInputChange}
                          fullWidth
                        >
                          {TIME_FORMATS.map(format => (
                            <MenuItem key={format} value={format}>{format}</MenuItem>
                          ))}
                        </Select>
                      </Grid>
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.enable_maintenance_mode}
                              onChange={handleInputChange}
                              name="enable_maintenance_mode"
                            />
                          }
                          label="Enable Maintenance Mode"
                        />
                      </Grid>
                      {settings.enable_maintenance_mode && (
                        <Grid item xs={12}>
                          <TextField
                            label="Maintenance Message"
                            name="maintenance_message"
                            value={settings.maintenance_message}
                            onChange={handleInputChange}
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="System is under maintenance. Please try again later."
                          />
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Security Settings */}
            {activeCategory === "security" && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Security Settings
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.enable_two_factor_auth}
                              onChange={handleInputChange}
                              name="enable_two_factor_auth"
                            />
                          }
                          label="Enable Two-Factor Authentication"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Session Timeout (minutes)"
                          name="session_timeout_minutes"
                          value={settings.session_timeout_minutes}
                          onChange={handleInputChange}
                          fullWidth
                          type="number"
                          InputProps={{
                            endAdornment: <InputAdornment position="end">min</InputAdornment>,
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Max Login Attempts"
                          name="max_login_attempts"
                          value={settings.max_login_attempts}
                          onChange={handleInputChange}
                          fullWidth
                          type="number"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Minimum Password Length"
                          name="password_min_length"
                          value={settings.password_min_length}
                          onChange={handleInputChange}
                          fullWidth
                          type="number"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.require_password_complexity}
                              onChange={handleInputChange}
                              name="require_password_complexity"
                            />
                          }
                          label="Require Complex Passwords"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.enable_ip_whitelisting}
                              onChange={handleInputChange}
                              name="enable_ip_whitelisting"
                            />
                          }
                          label="Enable IP Whitelisting"
                        />
                      </Grid>
                      {settings.enable_ip_whitelisting && (
                        <Grid item xs={12}>
                          <TextField
                            label="Allowed IP Addresses/Ranges"
                            name="allowed_ips"
                            value={settings.allowed_ips.join(", ")}
                            onChange={(e) => {
                              const ips = e.target.value.split(",").map(ip => ip.trim());
                              setSettings(prev => ({ ...prev, allowed_ips: ips }));
                            }}
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="192.168.1.0/24, 10.0.0.0/8"
                            helperText="Enter IP addresses or ranges separated by commas"
                          />
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.enable_audit_logging}
                              onChange={handleInputChange}
                              name="enable_audit_logging"
                            />
                          }
                          label="Enable Audit Logging"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Audit Log Retention (days)"
                          name="audit_log_retention_days"
                          value={settings.audit_log_retention_days}
                          onChange={handleInputChange}
                          fullWidth
                          type="number"
                          disabled={!settings.enable_audit_logging}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Notification Settings */}
            {activeCategory === "notifications" && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Notification Settings
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.enable_email_notifications}
                              onChange={handleInputChange}
                              name="enable_email_notifications"
                            />
                          }
                          label="Enable Email Notifications"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.enable_sms_notifications}
                              onChange={handleInputChange}
                              name="enable_sms_notifications"
                            />
                          }
                          label="Enable SMS Notifications"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.enable_push_notifications}
                              onChange={handleInputChange}
                              name="enable_push_notifications"
                            />
                          }
                          label="Enable Push Notifications"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Notification Cooldown (minutes)"
                          name="notification_cooldown_minutes"
                          value={settings.notification_cooldown_minutes}
                          onChange={handleInputChange}
                          fullWidth
                          type="number"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.enable_digest_emails}
                              onChange={handleInputChange}
                              name="enable_digest_emails"
                            />
                          }
                          label="Enable Digest Emails"
                        />
                      </Grid>
                      {settings.enable_digest_emails && (
                        <>
                          <Grid item xs={12} md={6}>
                            <Select
                              label="Digest Frequency"
                              name="digest_email_frequency"
                              value={settings.digest_email_frequency}
                              onChange={handleInputChange}
                              fullWidth
                            >
                              <MenuItem value="daily">Daily</MenuItem>
                              <MenuItem value="weekly">Weekly</MenuItem>
                              <MenuItem value="monthly">Monthly</MenuItem>
                            </Select>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Digest Time"
                              name="digest_email_time"
                              value={settings.digest_email_time}
                              onChange={handleInputChange}
                              fullWidth
                              type="time"
                            />
                          </Grid>
                        </>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Backup Settings */}
            {activeCategory === "backup" && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Backup Settings
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Box>
                            <Typography variant="subtitle1">
                              Backup Status
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Last Backup: {formatLastBackup()}
                              {settings.last_backup_status && (
                                <Chip
                                  label={settings.last_backup_status}
                                  color={getBackupStatusColor()}
                                  size="small"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Typography>
                          </Box>
                          <Button
                            variant="contained"
                            startIcon={<BackupIcon />}
                            onClick={handleRunBackup}
                            disabled={backupInProgress}
                          >
                            {backupInProgress ? "Backing up..." : "Run Backup Now"}
                          </Button>
                        </Box>
                      </Grid>
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.enable_auto_backup}
                              onChange={handleInputChange}
                              name="enable_auto_backup"
                            />
                          }
                          label="Enable Automatic Backups"
                        />
                      </Grid>
                      {settings.enable_auto_backup && (
                        <>
                          <Grid item xs={12} md={6}>
                            <Select
                              label="Backup Frequency"
                              name="backup_frequency"
                              value={settings.backup_frequency}
                              onChange={handleInputChange}
                              fullWidth
                            >
                              <MenuItem value="daily">Daily</MenuItem>
                              <MenuItem value="weekly">Weekly</MenuItem>
                              <MenuItem value="monthly">Monthly</MenuItem>
                            </Select>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Backup Time"
                              name="backup_time"
                              value={settings.backup_time}
                              onChange={handleInputChange}
                              fullWidth
                              type="time"
                            />
                          </Grid>
                        </>
                      )}
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Backup Retention (days)"
                          name="backup_retention_days"
                          value={settings.backup_retention_days}
                          onChange={handleInputChange}
                          fullWidth
                          type="number"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.backup_encryption}
                              onChange={handleInputChange}
                              name="backup_encryption"
                            />
                          }
                          label="Enable Backup Encryption"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.enable_cloud_backup}
                              onChange={handleInputChange}
                              name="enable_cloud_backup"
                            />
                          }
                          label="Enable Cloud Backup (AWS S3/GCS/Azure)"
                        />
                      </Grid>
                    </Grid>
                    
                    {/* Backup Logs */}
                    {backupLogs.length > 0 && (
                      <Box mt={3}>
                        <Typography variant="subtitle2" gutterBottom>
                          Backup Logs
                        </Typography>
                        <Box
                          sx={{
                            backgroundColor: '#f5f5f5',
                            borderRadius: 1,
                            p: 2,
                            maxHeight: 150,
                            overflowY: 'auto',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                          }}
                        >
                          {backupLogs.map((log, index) => (
                            <Box key={index} mb={0.5}>
                              {log}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle1">
                        Apply Changes
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Changes will be applied immediately after saving
                      </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                      <Button
                        variant="outlined"
                        startIcon={<RestoreIcon />}
                        onClick={handleRestoreDefaults}
                      >
                        Restore Defaults
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveSettings}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save All Settings"}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}