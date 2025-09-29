import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Alert,
  CircularProgress,
  Divider,
  Autocomplete,
  IconButton,
  Chip,
} from "@mui/material";
import {
  Download,
  PictureAsPdf,
  Search,
  Refresh,
  Print,
  Visibility,
} from "@mui/icons-material";
import axios from "axios";

const ExportChecklistGenerator = () => {
  const [jobNumber, setJobNumber] = useState("");
  const [exportJobs, setExportJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [jobDetails, setJobDetails] = useState(null);

  // Base API URL
  const API_BASE_URL = process.env.REACT_APP_API_STRING || "http://localhost:3000/api";

  // Fetch available export jobs
  useEffect(() => {
    fetchExportJobs();
  }, []);

  const fetchExportJobs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/export-jobs`);
      if (response.data.success) {
        setExportJobs(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching export jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate and download Export Checklist PDF
  const generateChecklist = async () => {
    if (!jobNumber.trim()) {
      setError("Please enter a job number");
      return;
    }

    try {
      setGenerating(true);
      setError("");
      setSuccess("");

      const response = await axios({
        method: "GET",
        url: `${API_BASE_URL}/export-checklist/${jobNumber}`,
        responseType: "blob",
        headers: {
          "Accept": "application/pdf",
        },
      });

      // Create blob link to download PDF
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Generate filename matching your format
      const currentDate = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).replace(/ /g, "-");
      
      const filename = `Export-CheckList-${jobNumber}-${currentDate}.pdf`;
      
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(`✅ Export Checklist generated: ${filename}`);
      
    } catch (error) {
      console.error("Error generating checklist:", error);
      if (error.response?.status === 404) {
        setError(`Export job '${jobNumber}' not found in database`);
      } else if (error.response?.status === 400) {
        setError("Invalid job number format provided");
      } else {
        setError("Failed to generate Export Checklist. Please check the job number.");
      }
    } finally {
      setGenerating(false);
    }
  };

  // Preview checklist in new tab
  const previewChecklist = async () => {
    if (!jobNumber.trim()) {
      setError("Please enter a job number");
      return;
    }
    
    const url = `${API_BASE_URL}/export-checklist/${jobNumber}`;
    window.open(url, '_blank');
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      {/* Header - Matching PDF Format */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          mb: 4, 
          background: "linear-gradient(135deg, #1565C0 0%, #1976D2 50%, #42A5F5 100%)",
          borderRadius: 2
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={3}>
            <PictureAsPdf sx={{ fontSize: 48, color: "white" }} />
            <Box>
              <Typography variant="h3" sx={{ color: "white", fontWeight: "bold", mb: 1 }}>
                SURAJ FORWARDERS & SHIPPING AGENCIES
              </Typography>
              <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.9)" }}>
                Export Checklist Generator - Shipping Bill Documentation
              </Typography>
            </Box>
          </Box>
          <Box textAlign="center">
            <Chip 
              label={`Generated On: ${new Date().toLocaleDateString("en-GB")}`}
              sx={{ 
                bgcolor: "rgba(255,255,255,0.2)", 
                color: "white",
                fontWeight: "bold",
                mb: 1
              }}
            />
            <Typography variant="caption" sx={{ color: "white", display: "block" }}>
              PDF Format: 3 Pages
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={4}>
        {/* Input Section */}
        <Grid item xs={12} md={7}>
          <Card elevation={4} sx={{ borderRadius: 2 }}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={2}>
                  <Search color="primary" />
                  <Typography variant="h5" fontWeight="bold">
                    Generate Export Checklist
                  </Typography>
                </Box>
              }
              subheader="Enter job number to generate 3-page Export Checklist PDF with exact formatting"
              action={
                <IconButton onClick={() => {
                  setJobNumber("");
                  setError("");
                  setSuccess("");
                }} color="primary">
                  <Refresh />
                </IconButton>
              }
              sx={{ bgcolor: "grey.50" }}
            />
            <CardContent sx={{ p: 4 }}>
              {/* Job Number Input */}
              <TextField
                fullWidth
                label="Export Job Number"
                placeholder="Enter job number (e.g., AMDEXPSEA0154625-26)"
                value={jobNumber}
                onChange={(e) => setJobNumber(e.target.value.toUpperCase())}
                sx={{ mb: 4 }}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: "action.active" }} />,
                }}
                helperText="Format: AMD-EXP-SEA-XXXXX-XX or similar"
              />

              {/* Action Buttons */}
              <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={generateChecklist}
                  disabled={generating || !jobNumber.trim()}
                  startIcon={generating ? <CircularProgress size={20} /> : <Download />}
                  sx={{ 
                    minWidth: 180,
                    height: 48,
                    fontSize: "1rem",
                    fontWeight: "bold"
                  }}
                >
                  {generating ? "Generating PDF..." : "Download Checklist PDF"}
                </Button>

                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  onClick={previewChecklist}
                  disabled={!jobNumber.trim()}
                  startIcon={<Visibility />}
                  sx={{ minWidth: 120, height: 48 }}
                >
                  Preview
                </Button>

                <Button
                  variant="outlined"
                  color="secondary"
                  size="large"
                  onClick={() => window.print()}
                  startIcon={<Print />}
                  sx={{ minWidth: 100, height: 48 }}
                >
                  Print Page
                </Button>
              </Box>

              {/* Status Messages */}
              {error && (
                <Alert 
                  severity="error" 
                  sx={{ mb: 2 }} 
                  onClose={() => setError("")}
                  variant="filled"
                >
                  {error}
                </Alert>
              )}

              {success && (
                <Alert 
                  severity="success" 
                  sx={{ mb: 2 }} 
                  onClose={() => setSuccess("")}
                  variant="filled"
                >
                  {success}
                </Alert>
              )}

              {/* PDF Format Info */}
              <Paper elevation={1} sx={{ p: 3, bgcolor: "info.light", borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ color: "info.contrastText" }}>
                  📋 Export Checklist Format
                </Typography>
                <Typography variant="body2" sx={{ color: "info.contrastText" }}>
                  <strong>Page 1:</strong> Basic Details, Item Details, Exporter Details<br/>
                  <strong>Page 2:</strong> DBK Details, Vessel Details, Container Details<br/>
                  <strong>Page 3:</strong> Declarations, Supporting Documents<br/>
                  <strong>Format:</strong> Exact match with SURAJ FORWARDERS checklist layout
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        {/* Sample & Instructions */}
        <Grid item xs={12} md={5}>
          <Card elevation={4} sx={{ mb: 3, borderRadius: 2 }}>
            <CardHeader
              title="Sample Job Numbers"
              subheader="Click to use these sample numbers"
              sx={{ bgcolor: "warning.light", color: "warning.contrastText" }}
            />
            <CardContent>
              <Box display="flex" gap={1} flexWrap="wrap">
                {[
                  "AMDEXPSEA0154625-26",
                  "AMD-EXP-SEA-01546-25-26", 
                  "EXP2025001",
                  "JOB001"
                ].map((sample) => (
                  <Chip
                    key={sample}
                    label={sample}
                    variant="outlined"
                    clickable
                    onClick={() => setJobNumber(sample)}
                    sx={{ 
                      '&:hover': { 
                        bgcolor: 'primary.main', 
                        color: 'white',
                        transform: 'scale(1.05)'
                      },
                      transition: 'all 0.2s'
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card elevation={4} sx={{ borderRadius: 2 }}>
            <CardHeader
              title="Instructions"
              sx={{ bgcolor: "success.light", color: "success.contrastText" }}
            />
            <CardContent>
              <Typography variant="body2" component="div">
                <Box component="ol" sx={{ pl: 2, m: 0 }}>
                  <li>Enter the export job number in the field above</li>
                  <li>Click "Download Checklist PDF" to generate the document</li>
                  <li>PDF will download with filename: Export-CheckList-[JobNo]-[Date].pdf</li>
                  <li>Use "Preview" to view before downloading</li>
                  <li>The generated PDF matches exact SURAJ FORWARDERS format</li>
                </Box>
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="caption" color="textSecondary">
                <strong>API Endpoint:</strong> /api/export-checklist/[job_no]<br/>
                <strong>Response:</strong> PDF file with 3-page checklist format
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Footer */}
      <Paper elevation={1} sx={{ p: 2, mt: 4, textAlign: "center", bgcolor: "grey.100" }}>
        <Typography variant="caption" color="textSecondary">
          Export Checklist Generator v1.0 | SURAJ FORWARDERS & SHIPPING AGENCIES | 
          Generates PDF matching exact checklist format with all required fields
        </Typography>
      </Paper>
    </Box>
  );
};

export default ExportChecklistGenerator;
