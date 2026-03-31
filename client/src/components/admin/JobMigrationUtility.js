import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
    Grid,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    Divider,
    IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import HistoryIcon from '@mui/icons-material/History';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const JobMigrationUtility = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [jobData, setJobData] = useState(null);
    const [error, setError] = useState(null);
    
    const [targetYear, setTargetYear] = useState('');
    const [years, setYears] = useState([]);
    const [gaps, setGaps] = useState([]);
    const [selectedSequence, setSelectedSequence] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        // Fetch available years plus generate upcoming ones
        const fetchYears = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-years`, { withCredentials: true });
                const existingYears = (res.data || []).filter(y => y !== null);
                
                // Generate a few years around the current date to ensure future targets are available
                const now = new Date();
                const currentMonth = now.getMonth() + 1; // 1-indexed (Jan=1, Apr=4)
                const currentYear = now.getFullYear();
                
                // FY starts in April (4)
                const startYear = currentMonth < 4 ? currentYear - 1 : currentYear;
                
                const generatedYears = [];
                for (let i = -1; i <= 2; i++) { // From 1 year ago to 2 years ahead
                    const yr = startYear + i;
                    const nextYr = (yr + 1).toString().slice(-2);
                    const yrStr = `${yr.toString().slice(-2)}-${nextYr}`;
                    if (!existingYears.includes(yrStr)) {
                        generatedYears.push(yrStr);
                    }
                }

                const allYears = Array.from(new Set([...existingYears, ...generatedYears])).sort((a, b) => b.localeCompare(a));
                setYears(allYears);
            } catch (err) {
                console.error("Error fetching years:", err);
            }
        };
        fetchYears();
    }, []);

    const handleSearch = async () => {
        if (!searchQuery) return;
        
        setLoading(true);
        setError(null);
        setJobData(null);
        setPreviewData(null);
        setSuccessMessage(null);
        setGaps([]);
        setSelectedSequence(null);

        try {
            // Find job by structured job_number, bl_no, or be_no
            const response = await axios.get(`${process.env.REACT_APP_API_STRING}/admin/job-migration/get-job?query=${encodeURIComponent(searchQuery)}`, { withCredentials: true });
            
            if (response.data) {
                setJobData(response.data);
            } else {
                setError("Job not found. Please check the job number.");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Error searching for job.");
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = async () => {
        if (!jobData || !targetYear) return;
        
        setPreviewLoading(true);
        setError(null);
        setGaps([]);
        setSelectedSequence(null);
        
        try {
            // 1. Get standard preview (next available)
            const res = await axios.get(
                `${process.env.REACT_APP_API_STRING}/admin/job-migration/preview?jobId=${jobData._id}&targetYear=${targetYear}`,
                { withCredentials: true }
            );
            setPreviewData(res.data);

            // 2. Fetch gaps in the target year
            const gapsRes = await axios.get(
                `${process.env.REACT_APP_API_STRING}/admin/job-migration/gaps?jobId=${jobData._id}&targetYear=${targetYear}`,
                { withCredentials: true }
            );
            if (gapsRes.data && gapsRes.data.gaps) {
                setGaps(gapsRes.data.gaps);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Error generating preview.");
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleGapSelect = (sequence) => {
        setSelectedSequence(sequence);
        const gapInfo = gaps.find(g => g.sequence_number === sequence);
        
        // Update the preview data to show the selected gap number
        if (gapInfo && previewData) {
            // Reconstruct the job number with the gap sequence
            // Original format: BRANCH/TRADE/MODE/SEQ/YEAR
            const parts = previewData.proposedJobNumber.split('/');
            parts[3] = gapInfo.job_no;
            const newProposedJobNumber = parts.join('/');
            
            setPreviewData({
                ...previewData,
                proposedJobNumber: newProposedJobNumber,
                isGap: true
            });
        }
    };

    const handleMigrate = async () => {
        setExecuting(true);
        setError(null);
        
        try {
            const res = await axios.post(
                `${process.env.REACT_APP_API_STRING}/admin/job-migration/execute`,
                { 
                    jobId: jobData._id, 
                    targetYear: targetYear,
                    requestedSequence: selectedSequence // This will be null if "Next Available" is used
                },
                { withCredentials: true }
            );
            
            setSuccessMessage(res.data.message);
            setConfirmOpen(false);
            setJobData(null);
            setPreviewData(null);
            setSearchQuery('');
            setGaps([]);
            setSelectedSequence(null);
        } catch (err) {
            setError(err.response?.data?.message || "Migration failed.");
            setConfirmOpen(false);
        } finally {
            setExecuting(false);
        }
    };

    return (
        <Box sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
                <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SwapHorizIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h4" fontWeight="bold">Job Migration Utility</Typography>
                        <Typography variant="body2" color="text.secondary">Move a job from its current fiscal year to a target year safely.</Typography>
                    </Box>
                </Box>

                {successMessage && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}
                {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={8}>
                        <TextField
                            fullWidth
                            label="Search by Job Number, BL No, or BE No"
                            placeholder="e.g., AMD/IMP/SEA/07481/24-25, BL12345, or BE67890"
                            variant="outlined"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Button 
                            fullWidth 
                            variant="contained" 
                            size="large" 
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                            onClick={handleSearch}
                            disabled={loading}
                            sx={{ height: '56px' }}
                        >
                            Search Job
                        </Button>
                    </Grid>
                </Grid>

                {jobData && (
                    <Box>
                        <Card sx={{ mb: 4, border: '1px solid', borderColor: 'divider' }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom color="primary">Current Job Details</Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Grid container spacing={2}>
                                    <Grid item xs={6} md={3}>
                                        <Typography variant="caption" color="text.secondary">Job Number</Typography>
                                        <Typography variant="body1" fontWeight="500">{jobData.job_number}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography variant="caption" color="text.secondary">Importer</Typography>
                                        <Typography variant="body1" fontWeight="500">{jobData.importer}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={2}>
                                        <Typography variant="caption" color="text.secondary">Year</Typography>
                                        <Typography variant="body1" fontWeight="500">{jobData.year}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography variant="caption" color="text.secondary">BL No</Typography>
                                        <Typography variant="body1" fontWeight="500">{jobData.awb_bl_no || 'N/A'}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography variant="caption" color="text.secondary">BE No</Typography>
                                        <Typography variant="body1" fontWeight="500">{jobData.be_no || 'N/A'}</Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        <Box sx={{ mb: 4 }}>
                            <Typography variant="h6" gutterBottom>Migration Setup</Typography>
                            <Grid container spacing={3} alignItems="center">
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        label="Select Target Year"
                                        value={targetYear}
                                        onChange={(e) => {
                                            setTargetYear(e.target.value);
                                            setPreviewData(null);
                                        }}
                                    >
                                        {years.map((yearStr) => (
                                            <MenuItem key={yearStr} value={yearStr}>
                                                {yearStr}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Button 
                                        variant="outlined" 
                                        size="large" 
                                        onClick={handlePreview}
                                        disabled={!targetYear || previewLoading}
                                        startIcon={previewLoading && <CircularProgress size={20} />}
                                    >
                                        Preview Proposed Number
                                    </Button>
                                </Grid>
                            </Grid>
                        </Box>

                        {previewData && (
                            <>
                                {gaps.length > 0 && (
                                    <Box sx={{ mb: 4, p: 3, border: '1px solid', borderColor: 'warning.light', borderRadius: 2, bgcolor: '#fffde7' }}>
                                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <HistoryIcon color="warning" />
                                            Available Sequence Gaps Found
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            The following job numbers were skipped or deleted in the target year. You can reuse them to maintain a continuous sequence.
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            <Button 
                                                variant={selectedSequence === null ? "contained" : "outlined"}
                                                size="small"
                                                onClick={() => {
                                                    setSelectedSequence(null);
                                                    handlePreview();
                                                }}
                                            >
                                                Next Available ({previewData.nextSequence})
                                            </Button>
                                            {gaps.map((gap) => (
                                                <Button 
                                                    key={gap.sequence_number}
                                                    variant={selectedSequence === gap.sequence_number ? "contained" : "outlined"}
                                                    color="secondary"
                                                    size="small"
                                                    onClick={() => handleGapSelect(gap.sequence_number)}
                                                >
                                                    Reuse {gap.job_no}
                                                </Button>
                                            ))}
                                        </Box>
                                    </Box>
                                )}

                                <Box sx={{ mb: 4, p: 3, bgcolor: previewData.isGap ? '#f3e5f5' : '#f0f4f8', borderRadius: 2, border: '2px dashed', borderColor: previewData.isGap ? 'secondary.main' : 'primary.main' }}>
                                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom color={previewData.isGap ? "secondary" : "primary"}>
                                        {previewData.isGap ? "Selected Gap Migration Preview" : "Standard migration Preview"}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, py: 2 }}>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="caption" color="text.secondary">Old Job Number</Typography>
                                            <Typography variant="h6">{previewData.currentJobNumber}</Typography>
                                        </Box>
                                        <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="caption" color={previewData.isGap ? "secondary" : "primary"}>NEW Job Number</Typography>
                                            <Typography variant="h5" color={previewData.isGap ? "secondary" : "primary"} fontWeight="bold">{previewData.proposedJobNumber}</Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                                        <Button 
                                            variant="contained" 
                                            color={previewData.isGap ? "secondary" : "warning"}
                                            size="large" 
                                            onClick={() => setConfirmOpen(true)}
                                            sx={{ px: 6 }}
                                        >
                                            Proceed to Migration
                                        </Button>
                                    </Box>
                                </Box>
                            </>
                        )}
                    </Box>
                )}
            </Paper>

            {/* Confirmation Dialog */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>Confirm Job Migration</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>
                        Are you sure you want to migrate this job to the fiscal year <strong>{targetYear}</strong>?
                    </Typography>
                    <Typography variant="body2" color="error" sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HistoryIcon fontSize="small" />
                        This will officially consume sequence number {previewData?.nextSequence} in the target year.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        The original job number will no longer be valid for searching or reporting.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setConfirmOpen(false)} disabled={executing}>Cancel</Button>
                    <Button 
                        onClick={handleMigrate} 
                        variant="contained" 
                        color="warning" 
                        disabled={executing}
                        startIcon={executing && <CircularProgress size={20} />}
                    >
                        {executing ? "Migrating..." : "Confirm & Execute"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default JobMigrationUtility;
