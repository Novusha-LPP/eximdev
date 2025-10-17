import * as React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  CloudUpload,
  Description,
  Download,
  CheckCircle,
  AttachFile,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const Steps = [
  'Upload Ledger Files',
  'Enter Year Information',
  'Process & Download',
];

function LedgerProcessor() {
  const [activeStep, setActiveStep] = React.useState(0);
  const [files, setFiles] = React.useState([]);
  const [years, setYears] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [downloadUrl, setDownloadUrl] = React.useState('');

  const handleFileUpload = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(selectedFiles);
    setError('');
    setSuccess('');
    
    // Auto-advance to next step if files are selected
    if (selectedFiles.length > 0) {
      setActiveStep(1);
    }
  };

  const handleYearsChange = (event) => {
    setYears(event.target.value);
  };

  const validateYears = () => {
    if (!years.trim()) {
      setError('Please enter years');
      return false;
    }
    
    const yearsArray = years.split(',').map(y => y.trim());
    if (yearsArray.length !== files.length) {
      setError(`Number of years (${yearsArray.length}) must match number of files (${files.length})`);
      return false;
    }
    
    return true;
  };

  const processLedgers = async () => {
    if (!validateYears()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      
      // Add all files
      files.forEach((file, index) => {
        formData.append('files', file);
      });
      
      // Add years
      formData.append('years', years);

      const response = await fetch(`${process.env.REACT_APP_API_STRING}/process-multi-year-ledgers`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process ledgers');
      }

      // Create download URL from blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
      setSuccess('Ledgers processed successfully! Click download to get your file.');
      setActiveStep(2);

    } catch (err) {
      setError(err.message || 'An error occurred while processing ledgers');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'Ledger_Processed.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setYears('');
    setActiveStep(0);
    setError('');
    setSuccess('');
    setDownloadUrl('');
    if (downloadUrl) {
      window.URL.revokeObjectURL(downloadUrl);
    }
  };

  const removeFile = (indexToRemove) => {
    const newFiles = files.filter((_, index) => index !== indexToRemove);
    setFiles(newFiles);
    if (newFiles.length === 0) {
      setActiveStep(0);
    }
  };

  React.useEffect(() => {
    return () => {
      // Clean up download URL on unmount
      if (downloadUrl) {
        window.URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
          Ledger Interest calculation
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 4 }} align="center">
          Upload ledger files and process them with FIFO allocation
        </Typography>

        {/* Error/Success Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Stepper activeStep={activeStep} orientation="vertical">
          {/* Step 1: File Upload */}
          <Step>
            <StepLabel>Upload Ledger Files</StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Upload Excel files for each year's ledger data. Files should contain invoice and payment information.
              </Typography>
              
              <Button
                component="label"
                variant="contained"
                startIcon={<CloudUpload />}
                sx={{ mb: 2 }}
              >
                Choose Files
                <VisuallyHiddenInput
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                />
              </Button>

              {files.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected Files ({files.length}):
                  </Typography>
                  <List dense>
                    {files.map((file, index) => (
                      <ListItem
                        key={index}
                        secondaryAction={
                          <Button
                            size="small"
                            color="error"
                            onClick={() => removeFile(index)}
                          >
                            Remove
                          </Button>
                        }
                      >
                        <ListItemIcon>
                          <AttachFile fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={file.name}
                          secondary={`${(file.size / 1024).toFixed(2)} KB`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(1)}
                  disabled={files.length === 0}
                >
                  Continue
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Step 2: Year Information */}
          <Step>
            <StepLabel>Enter Year Information</StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter the financial years for each uploaded file, separated by commas.
                <br />
                <strong>Example:</strong> "2024-25, 2025-26"
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Files to process ({files.length}):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {files.map((file, index) => (
                    <Chip
                      key={index}
                      icon={<Description />}
                      label={file.name}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Years (comma-separated):
                </Typography>
                <input
                  type="text"
                  value={years}
                  onChange={handleYearsChange}
                  placeholder="e.g., 2024-25, 2025-26"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '16px',
                  }}
                />
              </Box>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => setActiveStep(0)}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={processLedgers}
                  disabled={loading || !years.trim()}
                  startIcon={loading ? <CircularProgress size={16} /> : null}
                >
                  {loading ? 'Processing...' : 'Process Ledgers'}
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Step 3: Download Result */}
          <Step>
            <StepLabel>Download Processed File</StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your ledger files have been processed successfully. Download the consolidated Excel file containing:
              </Typography>
              
              <List dense sx={{ mb: 2 }}>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText primary="FIFO allocation results" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Interest calculations" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Pending invoices summary" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Year-wise breakdown" />
                </ListItem>
              </List>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={handleReset}
                >
                  Process New Files
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={handleDownload}
                  disabled={!downloadUrl}
                >
                  Download Excel File
                </Button>
              </Box>
            </StepContent>
          </Step>
        </Stepper>

        {/* Instructions */}
        <Paper variant="outlined" sx={{ p: 2, mt: 4, bgcolor: 'background.default' }}>
          <Typography variant="h6" gutterBottom>
            📋 Instructions
          </Typography>
          <Typography variant="body2" component="div">
            <ol>
              <li>Upload Excel files containing ledger data for each financial year</li>
              <li>Enter corresponding years in comma-separated format (e.g., "2024-25, 2025-26")</li>
              <li>Ensure the number of years matches the number of uploaded files</li>
              <li>Click "Process Ledgers" to generate the consolidated report</li>
              <li>Download the processed Excel file with FIFO allocation results</li>
            </ol>
            <Typography variant="caption" color="text.secondary">
              Note: The system automatically calculates interest for payments delayed beyond 30 days.
            </Typography>
          </Typography>
        </Paper>
      </Paper>
    </Box>
  );
}

export default React.memo(LedgerProcessor);