import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Box,
    Paper,
    Typography,
    Grid,
    TextField,
    Button,
    Autocomplete,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    IconButton,
    Divider,
    Card,
    CardContent
} from "@mui/material";
import { Search, Print, Edit, Delete, ArrowBack } from "@mui/icons-material";
import axios from "axios";
import { downloadInvoiceAsPDF } from "../../utils/invoicePrint.js";
import logo from '../../assets/images/logo.svg';

const BillCover = () => {
    const [importers, setImporters] = useState([]);
    const [selectedImporter, setSelectedImporter] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [jobs, setJobs] = useState([]);
    const [selectedJobIds, setSelectedJobIds] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState("search"); // "search" or "generate"
    const printableRef = useRef();

    const [coverData, setCoverData] = useState({
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
        partyName: "",
        subject: "SUBMISSION OF BILLS",
        agencyRows: [],
        reimbursementRows: [],
        totalAgency: 0,
        totalReimbursement: 0,
        grandTotal: 0
    });

    useEffect(() => {
        fetchImporters();
    }, []);

    const fetchImporters = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-importer-list/25-26`);
            setImporters(res.data || []);
        } catch (err) {
            console.error("Error fetching importers:", err);
        }
    };

    const handleSearch = async () => {
        if (!selectedImporter) {
            alert("Please select an importer");
            return;
        }
        setLoading(true);
        try {
            // Format date to DD-Mon-YYYY as stored in bill_date
            const dateObj = new Date(selectedDate);
            const formattedDate = dateObj.toISOString().split('T')[0];
            
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-bill-cover`, {
                params: {
                    importer: selectedImporter.importer,
                    date: formattedDate
                }
            });
            setJobs(res.data.data || []);
            setSelectedJobIds(new Set());
        } catch (err) {
            console.error("Error fetching bills:", err);
            alert("Error fetching bills");
        }
        setLoading(false);
    };

    const toggleJobSelection = (id) => {
        const newSet = new Set(selectedJobIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedJobIds(newSet);
    };

    const handleGenerate = () => {
        if (selectedJobIds.size === 0) {
            alert("Please select at least one bill");
            return;
        }

        const selectedJobs = jobs.filter(j => selectedJobIds.has(j._id));
        const agencyRows = [];
        const reimbursementRows = [];

        selectedJobs.forEach(job => {
            const giaBill = job.bills.find(b => b.type === "GIA");
            const girBill = job.bills.find(b => b.type === "GIR");

            if (giaBill) {
                agencyRows.push({
                    jobNo: job.job_number || job.job_no,
                    billNo: giaBill.billNo,
                    amount: giaBill.finalTotal || giaBill.totalTaxable || 0
                });
            }
            if (girBill) {
                reimbursementRows.push({
                    jobNo: job.job_number || job.job_no,
                    billNo: girBill.billNo,
                    amount: girBill.finalTotal || girBill.totalNonGst || 0
                });
            }
        });

        const totalAgency = agencyRows.reduce((sum, r) => sum + r.amount, 0);
        const totalReimbursement = reimbursementRows.reduce((sum, r) => sum + r.amount, 0);

        setCoverData({
            ...coverData,
            partyName: selectedImporter.importer,
            agencyRows,
            reimbursementRows,
            totalAgency,
            totalReimbursement,
            grandTotal: totalAgency + totalReimbursement
        });
        setViewMode("generate");
    };

    const handlePrint = () => {
        if (printableRef.current) {
            downloadInvoiceAsPDF(printableRef.current, `BillCover_${coverData.partyName.replace(/\s+/g, '_')}.pdf`);
        }
    };

    const handleRowChange = (type, index, field, value) => {
        const updatedData = { ...coverData };
        const rows = type === 'agency' ? updatedData.agencyRows : updatedData.reimbursementRows;
        rows[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
        
        // Recalculate totals
        updatedData.totalAgency = updatedData.agencyRows.reduce((sum, r) => sum + r.amount, 0);
        updatedData.totalReimbursement = updatedData.reimbursementRows.reduce((sum, r) => sum + r.amount, 0);
        updatedData.grandTotal = updatedData.totalAgency + updatedData.totalReimbursement;
        
        setCoverData(updatedData);
    };

    if (viewMode === "generate") {
        return (
            <Box sx={{ p: 3 }}>
                <Box sx={{ mb: 2, display: 'flex', gap: 2 }} className="no-print">
                    <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => setViewMode("search")}>
                        Back to Search
                    </Button>
                    <Button variant="contained" startIcon={<Print />} onClick={handlePrint} color="primary">
                        Print Cover
                    </Button>
                </Box>

                <Paper sx={{ p: 5, maxWidth: "800px", margin: "0 auto", minHeight: "11in", position: "relative" }} ref={printableRef}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                        <img src={logo} alt="Logo" style={{ height: '60px' }} />
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1a237e' }}>SURAJ FORWARDERS PVT LTD</Typography>
                            <Typography variant="body2">A/204-205, WALL STREET II, ELLIS BRIDGE, AHMEDABAD</Typography>
                            <Typography variant="body2">GSTIN: 24AAKCS6838D1Z8 | PAN: AAKCS6838D</Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ mb: 4, borderBottomWidth: 2, borderColor: '#000' }} />

                    {/* Date and Address */}
                    <Box sx={{ mb: 4 }}>
                        <Typography sx={{ mb: 2 }}><strong>Date:</strong> {coverData.date}</Typography>
                        <Typography sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>To,</Typography>
                        <Typography sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{coverData.partyName}</Typography>
                    </Box>

                    {/* Subject */}
                    <Box sx={{ mb: 4, textAlign: 'center' }}>
                        <Typography sx={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                            Subject: {coverData.subject}
                        </Typography>
                    </Box>

                    <Typography sx={{ mb: 2 }}>Dear Sir/Madam,</Typography>
                    <Typography sx={{ mb: 4 }}>We are submitting herewith our following bills for your kind perusal and payment.</Typography>

                    {/* Agency Charges Table */}
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, backgroundColor: '#f5f5f5', p: 1 }}>Agency Charges Details</Typography>
                    <Table size="small" sx={{ mb: 4, border: '1px solid #ddd' }}>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#eeeeee' }}>
                                <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>Sr No</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>Job No</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>Bill No</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd', textAlign: 'right' }}>Amount (INR)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {coverData.agencyRows.map((row, idx) => (
                                <TableRow key={idx}>
                                    <TableCell sx={{ border: '1px solid #ddd' }}>{idx + 1}</TableCell>
                                    <TableCell sx={{ border: '1px solid #ddd' }}>{row.jobNo}</TableCell>
                                    <TableCell sx={{ border: '1px solid #ddd' }}>{row.billNo}</TableCell>
                                    <TableCell sx={{ border: '1px solid #ddd', textAlign: 'right' }}>
                                        <input 
                                            className="abi-input" 
                                            style={{ textAlign: 'right', border: 'none', width: '100%' }} 
                                            value={row.amount} 
                                            onChange={(e) => handleRowChange('agency', idx, 'amount', e.target.value)} 
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow sx={{ fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>
                                <TableCell colSpan={3} sx={{ border: '1px solid #ddd', textAlign: 'right' }}>Total Agency Charges:</TableCell>
                                <TableCell sx={{ border: '1px solid #ddd', textAlign: 'right' }}>{coverData.totalAgency.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>

                    {/* Reimbursement Charges Table */}
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, backgroundColor: '#f5f5f5', p: 1 }}>Reimbursement Charges Details</Typography>
                    <Table size="small" sx={{ mb: 4, border: '1px solid #ddd' }}>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#eeeeee' }}>
                                <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>Sr No</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>Job No</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>Bill No</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd', textAlign: 'right' }}>Amount (INR)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {coverData.reimbursementRows.map((row, idx) => (
                                <TableRow key={idx}>
                                    <TableCell sx={{ border: '1px solid #ddd' }}>{idx + 1}</TableCell>
                                    <TableCell sx={{ border: '1px solid #ddd' }}>{row.jobNo}</TableCell>
                                    <TableCell sx={{ border: '1px solid #ddd' }}>{row.billNo}</TableCell>
                                    <TableCell sx={{ border: '1px solid #ddd', textAlign: 'right' }}>
                                        <input 
                                            className="abi-input" 
                                            style={{ textAlign: 'right', border: 'none', width: '100%' }} 
                                            value={row.amount} 
                                            onChange={(e) => handleRowChange('reimbursement', idx, 'amount', e.target.value)} 
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow sx={{ fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>
                                <TableCell colSpan={3} sx={{ border: '1px solid #ddd', textAlign: 'right' }}>Total Reimbursement Charges:</TableCell>
                                <TableCell sx={{ border: '1px solid #ddd', textAlign: 'right' }}>{coverData.totalReimbursement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>

                    {/* Grand Total */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 6 }}>
                        <Paper sx={{ p: 2, backgroundColor: '#1a237e', color: '#fff', minWidth: '250px' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography>Total Agency:</Typography>
                                <Typography>{coverData.totalAgency.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography>Total Reimb.:</Typography>
                                <Typography>{coverData.totalReimbursement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                            </Box>
                            <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.3)' }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="h6">Grand Total:</Typography>
                                <Typography variant="h6">₹{coverData.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                            </Box>
                        </Paper>
                    </Box>

                    <Typography sx={{ mb: 8 }}>Kindly acknowledge the receipt of the same.</Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <Box>
                            <Typography sx={{ mb: 1 }}>Receiver's Signature</Typography>
                            <Box sx={{ width: '150px', borderBottom: '1px solid #000' }}></Box>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography sx={{ fontWeight: 'bold' }}>For, SURAJ FORWARDERS PVT LTD</Typography>
                            <Box sx={{ height: '60px' }}></Box>
                            <Typography>Authorized Signatory</Typography>
                        </Box>
                    </Box>
                </Paper>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: 'primary.main' }}>
                Bill Cover Generator
            </Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={3} alignItems="flex-end">
                    <Grid item xs={12} md={5}>
                        <Autocomplete
                            options={importers}
                            getOptionLabel={(option) => option.importer || ""}
                            value={selectedImporter}
                            onChange={(event, newValue) => setSelectedImporter(newValue)}
                            renderInput={(params) => <TextField {...params} label="Select Party Name" fullWidth />}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            label="Billing Date"
                            type="date"
                            fullWidth
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Button
                            fullWidth
                            variant="contained"
                            startIcon={<Search />}
                            onClick={handleSearch}
                            disabled={loading}
                            sx={{ height: '56px' }}
                        >
                            Fetch Bills
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {jobs.length > 0 && (
                <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        indeterminate={selectedJobIds.size > 0 && selectedJobIds.size < jobs.length}
                                        checked={selectedJobIds.size === jobs.length}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedJobIds(new Set(jobs.map(j => j._id)));
                                            else setSelectedJobIds(new Set());
                                        }}
                                    />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Job No</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Bill Numbers</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Billing Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Total Amount</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {jobs.map((job) => {
                                const totalAmount = job.bills.reduce((sum, b) => sum + (b.finalTotal || b.totalTaxable || 0), 0);
                                return (
                                    <TableRow key={job._id} hover onClick={() => toggleJobSelection(job._id)} sx={{ cursor: 'pointer' }}>
                                        <TableCell padding="checkbox">
                                            <Checkbox checked={selectedJobIds.has(job._id)} />
                                        </TableCell>
                                        <TableCell>{job.job_number || job.job_no}</TableCell>
                                        <TableCell>{job.bill_no}</TableCell>
                                        <TableCell>{job.bill_date}</TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>₹{totalAmount.toLocaleString('en-IN')}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            color="success"
                            size="large"
                            onClick={handleGenerate}
                            disabled={selectedJobIds.size === 0}
                        >
                            Generate Cover for {selectedJobIds.size} Jobs
                        </Button>
                    </Box>
                </TableContainer>
            )}

            {jobs.length === 0 && !loading && selectedImporter && (
                <Box sx={{ textAlign: 'center', p: 5 }}>
                    <Typography color="text.secondary">No bills found for this party and date.</Typography>
                </Box>
            )}
        </Box>
    );
};

export default BillCover;
