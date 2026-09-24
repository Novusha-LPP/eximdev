import React, { useState, useEffect, useMemo } from 'react';
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
    Chip,
    Tooltip,
    Stack
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import HistoryIcon from '@mui/icons-material/History';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BusinessIcon from '@mui/icons-material/Business';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import FlightIcon from '@mui/icons-material/Flight';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const JobMigrationUtility = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [jobData, setJobData] = useState(null);
    const [error, setError] = useState(null);
    
    // Migration targets
    const [targetBranchCode, setTargetBranchCode] = useState('');
    const [targetMode, setTargetMode] = useState('');
    const [targetYear, setTargetYear] = useState('');

    // Available options
    const [branches, setBranches] = useState([]);
    const [years, setYears] = useState([]);

    // Previews & Gaps
    const [gaps, setGaps] = useState([]);
    const [selectedSequence, setSelectedSequence] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    
    // Execution & Dialogs
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);

    // Fetch branches from API
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await axios.get(
                    `${process.env.REACT_APP_API_STRING}/admin/get-branches`,
                    { withCredentials: true }
                );
                if (Array.isArray(res.data)) {
                    setBranches(res.data);
                }
            } catch (err) {
                console.error("Error fetching branches:", err);
            }
        };
        fetchBranches();
    }, []);

    // Fetch available years plus generate upcoming ones
    useEffect(() => {
        const fetchYears = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-years`, { withCredentials: true });
                const existingYears = (res.data || []).filter(y => y !== null);
                
                // Generate a few years around current date
                const now = new Date();
                const currentMonth = now.getMonth() + 1;
                const currentYear = now.getFullYear();
                
                const startYear = currentMonth < 4 ? currentYear - 1 : currentYear;
                
                const generatedYears = [];
                for (let i = -1; i <= 2; i++) {
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

    // Extract unique branches by branch_code
    const branchOptions = useMemo(() => {
        const map = new Map();
        (branches || []).forEach(b => {
            if (!b.branch_code) return;
            const code = b.branch_code.toUpperCase();
            if (!map.has(code)) {
                map.set(code, {
                    branch_code: code,
                    branch_name: b.branch_name || code,
                    categories: [b.category]
                });
            } else {
                const existing = map.get(code);
                if (b.category && !existing.categories.includes(b.category)) {
                    existing.categories.push(b.category);
                }
            }
        });
        return Array.from(map.values()).sort((a, b) => a.branch_name.localeCompare(b.branch_name));
    }, [branches]);

    // Handle Job Search
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
            const response = await axios.get(
                `${process.env.REACT_APP_API_STRING}/admin/job-migration/get-job?query=${encodeURIComponent(searchQuery.trim())}`,
                { withCredentials: true }
            );
            
            if (response.data) {
                const job = response.data;
                setJobData(job);
                
                // Initialize target values from the current job
                const initialBranch = (job.branch_code || job.branch_id?.branch_code || 'AMD').toUpperCase();
                const initialMode = (job.mode || 'SEA').toUpperCase();
                const initialYear = job.year || job.financial_year || '24-25';

                setTargetBranchCode(initialBranch);
                setTargetMode(initialMode);
                setTargetYear(initialYear);
            } else {
                setError("Job not found. Please check the job number, BL, or BE number.");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Error searching for job.");
        } finally {
            setLoading(false);
        }
    };

    // When branch changes, ensure targetMode is supported by the branch
    const handleBranchChange = (newBranchCode) => {
        setTargetBranchCode(newBranchCode);
        setPreviewData(null);
        setGaps([]);
        setSelectedSequence(null);

        const branchConfig = branchOptions.find(b => b.branch_code === newBranchCode);
        if (branchConfig && branchConfig.categories.length > 0) {
            if (!branchConfig.categories.includes(targetMode)) {
                setTargetMode(branchConfig.categories[0]);
            }
        }
    };

    const handleModeChange = (newMode) => {
        setTargetMode(newMode);
        setPreviewData(null);
        setGaps([]);
        setSelectedSequence(null);
    };

    const handleYearChange = (newYear) => {
        setTargetYear(newYear);
        setPreviewData(null);
        setGaps([]);
        setSelectedSequence(null);
    };

    // Check what aspects are modified
    const currentBranchCode = (jobData?.branch_code || jobData?.branch_id?.branch_code || '').toUpperCase();
    const currentMode = (jobData?.mode || '').toUpperCase();
    const currentYear = jobData?.year || jobData?.financial_year || '';

    const isBranchChanged = jobData && targetBranchCode !== currentBranchCode;
    const isModeChanged = jobData && targetMode !== currentMode;
    const isYearChanged = jobData && targetYear !== currentYear;
    const hasAnyChange = isBranchChanged || isModeChanged || isYearChanged;

    // Handle Preview & Gap Detection
    const handlePreview = async () => {
        if (!jobData || !targetYear || !targetBranchCode || !targetMode) return;
        
        setPreviewLoading(true);
        setError(null);
        setGaps([]);
        setSelectedSequence(null);
        
        try {
            // 1. Get standard preview
            const res = await axios.get(
                `${process.env.REACT_APP_API_STRING}/admin/job-migration/preview`,
                {
                    params: {
                        jobId: jobData._id,
                        targetYear,
                        targetBranchCode,
                        targetMode
                    },
                    withCredentials: true
                }
            );
            setPreviewData(res.data);

            // 2. Fetch gaps in the target scope
            const gapsRes = await axios.get(
                `${process.env.REACT_APP_API_STRING}/admin/job-migration/gaps`,
                {
                    params: {
                        jobId: jobData._id,
                        targetYear,
                        targetBranchCode,
                        targetMode
                    },
                    withCredentials: true
                }
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
        
        if (gapInfo && previewData) {
            const parts = previewData.proposedJobNumber.split('/');
            parts[3] = gapInfo.job_no;
            const newProposedJobNumber = parts.join('/');
            
            setPreviewData({
                ...previewData,
                proposedJobNumber: newProposedJobNumber,
                isGap: true,
                selectedGapSeq: sequence
            });
        }
    };

    const handleResetToNextAvailable = () => {
        setSelectedSequence(null);
        handlePreview();
    };

    // Execute Migration
    const handleMigrate = async () => {
        setExecuting(true);
        setError(null);
        
        try {
            const res = await axios.post(
                `${process.env.REACT_APP_API_STRING}/admin/job-migration/execute`,
                { 
                    jobId: jobData._id, 
                    targetYear,
                    targetBranchCode,
                    targetMode,
                    requestedSequence: selectedSequence
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
        <Box sx={{ p: 4, maxWidth: 1100, mx: 'auto' }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
                <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SwapHorizIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h4" fontWeight="bold">Job Migration Utility</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Safely migrate jobs across <strong>Financial Years</strong>, <strong>Branches</strong>, and <strong>Divisions (Air & Sea)</strong> with automated sequence and gap management.
                        </Typography>
                    </Box>
                </Box>

                {successMessage && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}
                {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

                {/* Search Bar */}
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
                            sx={{ height: '56px', fontWeight: 600 }}
                        >
                            Search Job
                        </Button>
                    </Grid>
                </Grid>

                {jobData && (
                    <Box>
                        {/* Current Job Information Card */}
                        <Card sx={{ mb: 4, border: '1px solid', borderColor: 'divider', bgcolor: '#fbfbfb' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                    <Typography variant="h6" color="primary" fontWeight="bold">Current Job Details</Typography>
                                    <Stack direction="row" spacing={1}>
                                        <Chip 
                                            icon={<BusinessIcon fontSize="small" />} 
                                            label={`Branch: ${currentBranchCode}`} 
                                            size="small" 
                                            variant="outlined" 
                                        />
                                        <Chip 
                                            icon={currentMode === 'AIR' ? <FlightIcon fontSize="small" /> : <DirectionsBoatIcon fontSize="small" />} 
                                            label={`Division: ${currentMode}`} 
                                            size="small" 
                                            color={currentMode === 'AIR' ? 'info' : 'primary'}
                                            variant="outlined"
                                        />
                                        <Chip 
                                            icon={<CalendarMonthIcon fontSize="small" />} 
                                            label={`FY: ${currentYear}`} 
                                            size="small" 
                                            variant="outlined" 
                                        />
                                    </Stack>
                                </Box>
                                <Divider sx={{ mb: 2 }} />
                                <Grid container spacing={2}>
                                    <Grid item xs={6} md={3}>
                                        <Typography variant="caption" color="text.secondary">Job Number</Typography>
                                        <Typography variant="body1" fontWeight="600">{jobData.job_number}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography variant="caption" color="text.secondary">Importer</Typography>
                                        <Typography variant="body1" fontWeight="500">{jobData.importer || 'N/A'}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography variant="caption" color="text.secondary">BL / AWB No</Typography>
                                        <Typography variant="body1" fontWeight="500">{jobData.awb_bl_no || 'N/A'}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography variant="caption" color="text.secondary">BE No</Typography>
                                        <Typography variant="body1" fontWeight="500">{jobData.be_no || 'N/A'}</Typography>
                                    </Grid>
                                </Grid>

                                {jobData.bill_no && (
                                    <Alert severity="warning" sx={{ mt: 2 }}>
                                        Notice: This job has already been billed (Bill No: <strong>{jobData.bill_no}</strong>). Migrating this job will update its job number. Please verify if corresponding accounting/Tally vouchers need reconciliation.
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>

                        {/* Migration Setup Section */}
                        <Box sx={{ mb: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6" fontWeight="bold">Migration Setup</Typography>
                                {hasAnyChange && (
                                    <Stack direction="row" spacing={1}>
                                        {isBranchChanged && (
                                            <Chip label={`Branch: ${currentBranchCode} → ${targetBranchCode}`} color="primary" size="small" />
                                        )}
                                        {isModeChanged && (
                                            <Chip label={`Division: ${currentMode} → ${targetMode}`} color="secondary" size="small" />
                                        )}
                                        {isYearChanged && (
                                            <Chip label={`Year: ${currentYear} → ${targetYear}`} color="warning" size="small" />
                                        )}
                                    </Stack>
                                )}
                            </Box>

                            <Grid container spacing={2.5}>
                                {/* Target Branch */}
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        select
                                        fullWidth
                                        label="Target Branch"
                                        value={targetBranchCode}
                                        onChange={(e) => handleBranchChange(e.target.value)}
                                        helperText={isBranchChanged ? "Branch changed" : "Same as current branch"}
                                        FormHelperTextProps={{ sx: { color: isBranchChanged ? 'primary.main' : 'text.secondary', fontWeight: isBranchChanged ? 600 : 400 } }}
                                    >
                                        {branchOptions.map((b) => (
                                            <MenuItem key={b.branch_code} value={b.branch_code}>
                                                {b.branch_name} ({b.branch_code})
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>

                                {/* Target Division (Mode: AIR / SEA) */}
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        select
                                        fullWidth
                                        label="Target Division (Mode)"
                                        value={targetMode}
                                        onChange={(e) => handleModeChange(e.target.value)}
                                        helperText={isModeChanged ? "Division changed" : "Same as current division"}
                                        FormHelperTextProps={{ sx: { color: isModeChanged ? 'secondary.main' : 'text.secondary', fontWeight: isModeChanged ? 600 : 400 } }}
                                    >
                                        <MenuItem value="SEA">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <DirectionsBoatIcon fontSize="small" color="primary" />
                                                <span>SEA (Ocean Freight)</span>
                                            </Box>
                                        </MenuItem>
                                        <MenuItem value="AIR">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <FlightIcon fontSize="small" color="info" />
                                                <span>AIR (Air Cargo)</span>
                                            </Box>
                                        </MenuItem>
                                    </TextField>
                                </Grid>

                                {/* Target Financial Year */}
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        select
                                        fullWidth
                                        label="Target Financial Year"
                                        value={targetYear}
                                        onChange={(e) => handleYearChange(e.target.value)}
                                        helperText={isYearChanged ? "Financial year changed" : "Same as current year"}
                                        FormHelperTextProps={{ sx: { color: isYearChanged ? 'warning.main' : 'text.secondary', fontWeight: isYearChanged ? 600 : 400 } }}
                                    >
                                        {years.map((yearStr) => (
                                            <MenuItem key={yearStr} value={yearStr}>
                                                FY {yearStr}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>

                                {/* Preview Button */}
                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                        <Tooltip 
                                            title={!hasAnyChange ? "Choose a different Branch, Division, or Year to proceed" : ""}
                                            placement="top"
                                        >
                                            <span>
                                                <Button 
                                                    variant="contained" 
                                                    size="large" 
                                                    onClick={handlePreview}
                                                    disabled={!targetYear || !targetBranchCode || !targetMode || previewLoading}
                                                    startIcon={previewLoading ? <CircularProgress size={20} color="inherit" /> : <SwapHorizIcon />}
                                                    sx={{ minWidth: 240, fontWeight: 600 }}
                                                >
                                                    Preview Proposed Number
                                                </Button>
                                            </span>
                                        </Tooltip>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>

                        {/* Preview and Gap Selection */}
                        {previewData && (
                            <>
                                {gaps.length > 0 && (
                                    <Box sx={{ mb: 4, p: 3, border: '1px solid', borderColor: 'warning.light', borderRadius: 2, bgcolor: '#fffde7' }}>
                                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <HistoryIcon color="warning" />
                                            Available Sequence Gaps in Target Scope
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            The following sequence numbers were freed or skipped in <strong>{targetBranchCode} ({targetMode}) FY {targetYear}</strong>. You can reuse a gap to maintain continuous numbering.
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            <Button 
                                                variant={selectedSequence === null ? "contained" : "outlined"}
                                                size="small"
                                                onClick={handleResetToNextAvailable}
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

                                <Box sx={{ 
                                    mb: 4, 
                                    p: 3, 
                                    bgcolor: previewData.isGap ? '#f3e5f5' : '#f0f4f8', 
                                    borderRadius: 2, 
                                    border: '2px dashed', 
                                    borderColor: previewData.isGap ? 'secondary.main' : 'primary.main' 
                                }}>
                                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom color={previewData.isGap ? "secondary" : "primary"}>
                                        {previewData.isGap ? "Selected Sequence Gap Migration Preview" : "Proposed Migration Preview"}
                                    </Typography>

                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, py: 2 }}>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="caption" color="text.secondary">Current Job Number</Typography>
                                            <Typography variant="h6" fontWeight="bold">{previewData.currentJobNumber}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {currentBranchCode} • {currentMode} • FY {currentYear}
                                            </Typography>
                                        </Box>
                                        <ArrowForwardIcon sx={{ color: 'text.secondary', fontSize: 32 }} />
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="caption" color={previewData.isGap ? "secondary" : "primary"} fontWeight="bold">
                                                NEW Job Number
                                            </Typography>
                                            <Typography variant="h5" color={previewData.isGap ? "secondary" : "primary"} fontWeight="bold">
                                                {previewData.proposedJobNumber}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {targetBranchCode} • {targetMode} • FY {targetYear}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                                        <Button 
                                            variant="contained" 
                                            color={previewData.isGap ? "secondary" : "warning"}
                                            size="large" 
                                            onClick={() => setConfirmOpen(true)}
                                            sx={{ px: 6, fontWeight: 700 }}
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
            <Dialog open={confirmOpen} onClose={() => !executing && setConfirmOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: "bold" }}>Confirm Job Migration</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Are you sure you want to execute this job migration with the following destination details?
                    </Typography>

                    <Paper variant="outlined" sx={{ p: 2, mb: 2.5, bgcolor: "#fafafa" }}>
                        <Grid container spacing={2}>
                            <Grid item xs={4}>
                                <Typography variant="caption" color="text.secondary">Branch</Typography>
                                <Typography variant="body2" fontWeight="600">
                                    {currentBranchCode} &rarr; <span style={{ color: '#1976d2' }}>{targetBranchCode}</span>
                                </Typography>
                            </Grid>
                            <Grid item xs={4}>
                                <Typography variant="caption" color="text.secondary">Division</Typography>
                                <Typography variant="body2" fontWeight="600">
                                    {currentMode} &rarr; <span style={{ color: '#9c27b0' }}>{targetMode}</span>
                                </Typography>
                            </Grid>
                            <Grid item xs={4}>
                                <Typography variant="caption" color="text.secondary">Financial Year</Typography>
                                <Typography variant="body2" fontWeight="600">
                                    {currentYear} &rarr; <span style={{ color: '#ed6c02' }}>{targetYear}</span>
                                </Typography>
                            </Grid>
                        </Grid>
                    </Paper>

                    <Box sx={{ p: 2, bgcolor: previewData?.isGap ? '#f3e5f5' : '#e3f2fd', borderRadius: 1.5, mb: 2, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">New Assigned Job Number</Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                            {previewData?.proposedJobNumber}
                        </Typography>
                    </Box>

                    {jobData?.bill_no && (
                        <Alert severity="warning" sx={{ mb: 2, fontSize: '0.85rem' }}>
                            Notice: This job was already billed (Invoice No: <strong>{jobData.bill_no}</strong>). Migrating it will update its job number.
                        </Alert>
                    )}

                    <Typography variant="body2" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HistoryIcon fontSize="small" />
                        {previewData?.isGap 
                            ? `This action will reuse sequence gap ${previewData.proposedJobNumber.split('/')[3]} in ${targetBranchCode} (${targetMode}).` 
                            : `This action will allocate sequence number ${previewData?.nextSequence} in ${targetBranchCode} (${targetMode}).`
                        }
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        The original job number ({jobData?.job_number}) will be archived and replaced by the new number across all reports and operational views.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setConfirmOpen(false)} disabled={executing}>Cancel</Button>
                    <Button 
                        onClick={handleMigrate} 
                        variant="contained" 
                        color="warning" 
                        disabled={executing}
                        startIcon={executing && <CircularProgress size={20} />}
                        sx={{ fontWeight: "bold", px: 3 }}
                    >
                        {executing ? "Migrating..." : "Confirm & Execute"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default JobMigrationUtility;
