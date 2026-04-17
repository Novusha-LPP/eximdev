import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./AgencyBillInvoice.css";
import logo from '../../assets/images/logo.webp';
import signature from '../../assets/images/signature.png';
import { downloadInvoiceAsPDF } from "../../utils/invoicePrint.js";

const AgencyBillInvoice = () => {
    const { branch_code, trade_type, mode, job_no, year } = useParams();
    const [jobData, setJobData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const printableRef = React.useRef();

    const [invoiceRows, setInvoiceRows] = useState([]);
    const [chargeHeadsMaster, setChargeHeadsMaster] = useState([]);
    const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
    const [masterSearchTerm, setMasterSearchTerm] = useState("");
    const [selectedMasterHeads, setSelectedMasterHeads] = useState(new Set());
    
        // Editable top fields
    const [editableFields, setEditableFields] = useState({
        beHeading: "",
        shipperName: "",
        customerRef: "",
        cifValue: "",
        termsOfInvoice: "CIF",
        invoiceNo: "",
        invoiceDate: "",
        dueDate: "",
        placeOfSupply: "[24] Gujarat",
        // KYC fields
        importerAddress: "",
        panNo: "",
        gstin: "",
        stateName: "Gujarat",
        stateCode: "24"
    });

    const fetchJobDetails = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `${process.env.REACT_APP_API_STRING}/get-job/${branch_code}/${trade_type}/${mode}/${year}/${job_no}`
            );
            const job = response.data;
            setJobData(job);
            
            // Fetch Charge Heads for adding
            try {
                const chargeHeadsRes = await axios.get(`${process.env.REACT_APP_API_STRING}/charge-heads`);
                if (chargeHeadsRes.data.success) {
                    setChargeHeadsMaster(chargeHeadsRes.data.data || []);
                }
            } catch (e) {
                console.error("Error fetching charge heads", e);
            }

            // Keep charges always blank as per user request
            setInvoiceRows([]);

            const firstInv = (job.invoice_details && job.invoice_details[0]) || {};
            
            // Initialize editable fields with job data
            let initialFields = {
                beHeading: job.item_description || job.description || "",
                shipperName: job.supplier_exporter || "",
                customerRef: job.po_no || "",
                cifValue: firstInv.total_inv_value || "",
                termsOfInvoice: firstInv.toi || "CIF",
                invoiceNo: job.agency_invoice_no || "", 
                invoiceDate: formatDate(new Date()), 
                dueDate: formatDate(new Date()),
                placeOfSupply: `[${job.importer_address?.state || "24"}] ${job.importer_address?.state || "Gujarat"}`,
                importerAddress: job.importer_address?.details || "",
                panNo: job.importer_pan || "",
                gstin: job.importer_gstin || "",
                stateName: job.importer_address?.state || "Gujarat",
                stateCode: "24"
            };

            // If job has IEC, fetch KYC details to override/fill blanks
            if (job.ie_code_no) {
                try {
                    const kycRes = await axios.get(`${process.env.REACT_APP_API_STRING}/get-customer-kyc-by-iec/${job.ie_code_no}`);
                    const kyc = kycRes.data;
                    if (kyc) {
                        const addr = `${kyc.principle_business_address_line_1 || ""} ${kyc.principle_business_address_line_2 || ""}, ${kyc.principle_business_address_city || ""}, ${kyc.principle_business_address_state || ""} - ${kyc.principle_business_address_pin_code || ""}`.trim();
                        initialFields.importerAddress = addr || initialFields.importerAddress;
                        initialFields.panNo = kyc.pan_no || initialFields.panNo;
                        initialFields.gstin = kyc.gst_no || initialFields.gstin;
                        initialFields.stateName = kyc.principle_business_address_state || initialFields.stateName;
                        initialFields.placeOfSupply = `[${initialFields.stateCode}] ${initialFields.stateName}`;
                    }
                } catch (e) {
                    console.log("No KYC found for IEC:", job.ie_code_no);
                }
            }

            // Check for saved bill first
            try {
                const savedBillRes = await axios.get(`${process.env.REACT_APP_API_STRING}/billing/${job._id}/GIA`);
                if (savedBillRes.data.success && savedBillRes.data.data) {
                    const saved = savedBillRes.data.data;
                    setInvoiceRows(saved.rows || []);
                    setEditableFields(saved.editableFields || initialFields);
                    setLoading(false);
                    return; // Stop here if loaded from save
                }
            } catch (e) {
                console.log("No saved bill found, proceeding with defaults");
            }

            setEditableFields(initialFields);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching job details:", err);
            setError("Failed to load job details. Please try again.");
            setLoading(false);
        }
    }, [branch_code, trade_type, mode, job_no, year]);

    useEffect(() => {
        fetchJobDetails();
    }, [fetchJobDetails]);

    const handlePrint = () => {
        if (printableRef.current) {
            const fileName = `Invoice_${editableFields.invoiceNo.replace(/\//g, '-')}.pdf`;
            downloadInvoiceAsPDF(printableRef.current, fileName);
        }
    };

    useEffect(() => {
        if (!editableFields.invoiceNo || !jobData?._id) return;

        const timer = setTimeout(async () => {
            try {
                // Calculate totals for saving
                let totalTaxable = 0;
                let totalCgst = 0;
                let totalSgst = 0;
                invoiceRows.forEach(r => {
                    const amt = parseFloat(r.taxable) || 0;
                    const cgstP = parseFloat(r.cgstPercent) || 0;
                    const sgstP = parseFloat(r.sgstPercent) || 0;
                    totalTaxable += amt;
                    totalCgst += (amt * cgstP / 100);
                    totalSgst += (amt * sgstP / 100);
                });
                const finalTotal = totalTaxable + totalCgst + totalSgst;

                await axios.post(`${process.env.REACT_APP_API_STRING}/billing/save`, {
                    jobId: jobData._id,
                    type: 'GIA',
                    billNo: editableFields.invoiceNo,
                    rows: invoiceRows,
                    editableFields,
                    totals: {
                        totalTaxable,
                        totalCgst,
                        totalSgst,
                        finalTotal
                    }
                });
                console.log("Bill auto-saved");
            } catch (err) {
                console.error("Autosave error:", err);
            }
        }, 1000); // 1 second debounce

        return () => clearTimeout(timer);
    }, [invoiceRows, editableFields, jobData?._id]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/ /g, '-');
    };

    const handleRowChange = (index, field, value) => {
        const newRows = [...invoiceRows];
        newRows[index][field] = value;
        setInvoiceRows(newRows);
    };

    const handleFieldChange = (field, value) => {
        setEditableFields(prev => ({ ...prev, [field]: value }));
    };

    const handleGenerateInvoice = async (type) => {
        if (!jobData?._id) return;
        try {
            const res = await axios.post(`${process.env.REACT_APP_API_STRING}/billing/generate-invoice-number`, {
                jobId: jobData._id,
                type
            });
            if (res.data.success) {
                setEditableFields(prev => ({ ...prev, invoiceNo: res.data.invoiceNo }));
            }
        } catch (err) {
            alert("Error generating invoice number: " + err.message);
        }
    };

    const addChargeRow = (chargeHeadName = "") => {
        setInvoiceRows([...invoiceRows, {
            id: Math.random().toString(),
            description: chargeHeadName,
            sac: "996713",
            receipt: "",
            taxType: "T",
            nonGst: "",
            taxable: 0,
            cgstPercent: 9,
            sgstPercent: 9
        }]);
    };

    const addSelectedFromMaster = () => {
        const newRows = [...invoiceRows];
        const selected = chargeHeadsMaster.filter(ch => selectedMasterHeads.has(ch._id));
        
        selected.forEach(ch => {
            newRows.push({
                id: Math.random().toString(),
                description: ch.name || "",
                sac: "996713",
                receipt: "",
                taxType: "T",
                nonGst: "",
                taxable: 0,
                cgstPercent: 9,
                sgstPercent: 9
            });
        });
        
        setInvoiceRows(newRows);
        setIsMasterModalOpen(false);
        setSelectedMasterHeads(new Set());
    };

    const toggleMasterSelection = (id) => {
        const newSet = new Set(selectedMasterHeads);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedMasterHeads(newSet);
    };

    const deleteRow = (index) => {
        const newRows = [...invoiceRows];
        newRows.splice(index, 1);
        setInvoiceRows(newRows);
    };

    const getContainerString = () => {
        if (!jobData?.container_nos || jobData.container_nos.length === 0) return "-";
        return jobData.container_nos.map(c => `${c.size || ""} ${jobData.consignment_type || ""} ${c.container_number || ""}`).join(', ');
    };

    const getContainerCountSummary = () => {
        if (!jobData?.container_nos) return "0";
        const counts = {};
        jobData.container_nos.forEach(c => {
            const key = `${c.size || ''}'`;
            counts[key] = (counts[key] || 0) + 1;
        });
        return Object.entries(counts).map(([k, v]) => `${v}x${k}`).join(', ');
    };

    if (loading) return <div className="loading" style={{ margin: '20px' }}>Loading Tax Invoice...</div>;
    if (error) return <div className="error" style={{ margin: '20px' }}>{error}</div>;
    if (!jobData) return <div className="error" style={{ margin: '20px' }}>No job data found.</div>;

    // Totals logic
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;

    invoiceRows.forEach(r => {
        const amt = parseFloat(r.taxable) || 0;
        const cgstP = parseFloat(r.cgstPercent) || 0;
        const sgstP = parseFloat(r.sgstPercent) || 0;
        totalTaxable += amt;
        totalCgst += (amt * cgstP / 100);
        totalSgst += (amt * sgstP / 100);
    });

    const totalGst = totalCgst + totalSgst;
    const finalTotal = totalTaxable + totalGst;

    const numberToWords = (num) => {
        const a = ['', 'ONE ', 'TWO ', 'THREE ', 'FOUR ', 'FIVE ', 'SIX ', 'SEVEN ', 'EIGHT ', 'NINE ', 'TEN ', 'ELEVEN ', 'TWELVE ', 'THIRTEEN ', 'FOURTEEN ', 'FIFTEEN ', 'SIXTEEN ', 'SEVENTEEN ', 'EIGHTEEN ', 'NINETEEN '];
        const b = ['', '', 'TWENTY ', 'THIRTY ', 'FORTY ', 'FIFTY ', 'SIXTY ', 'SEVENTY ', 'EIGHTY ', 'NINETY '];

        const inWords = (n) => {
            if ((n = n.toString()).length > 9) return 'OVERFLOW';
            let n_arr = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
            if (!n_arr) return '';
            let str = '';
            str += (Number(n_arr[1]) !== 0) ? (a[Number(n_arr[1])] || b[n_arr[1][0]] + a[n_arr[1][1]]) + 'CRORE ' : '';
            str += (Number(n_arr[2]) !== 0) ? (a[Number(n_arr[2])] || b[n_arr[2][0]] + a[n_arr[2][1]]) + 'LAKH ' : '';
            str += (Number(n_arr[3]) !== 0) ? (a[Number(n_arr[3])] || b[n_arr[3][0]] + a[n_arr[3][1]]) + 'THOUSAND ' : '';
            str += (Number(n_arr[4]) !== 0) ? (a[Number(n_arr[4])] || b[n_arr[4][0]] + a[n_arr[4][1]]) + 'HUNDRED ' : '';
            str += (Number(n_arr[5]) !== 0) ? (a[Number(n_arr[5])] || b[n_arr[5][0]] + a[n_arr[5][1]]) : '';
            return str;
        };

        if (num === 0) return 'ZERO ONLY';
        const parts = Math.abs(Number(num)).toFixed(2).split('.');
        let words = 'RUPEES ' + inWords(parts[0]);
        if (parts.length > 1 && Number(parts[1]) > 0) {
            words += 'AND ' + (a[Number(parts[1])] || b[parts[1][0]] + a[parts[1][1]]) + 'PAISE ';
        }
        return words + 'ONLY';
    };

    return (
        <div className="abi-main-wrapper" style={{ minHeight: '100vh', background: '#e0e0e0', paddingBottom: '40px' }}>
            {/* Action Bar (Top Level, No Zoom) */}
            <div className="no-print abi-action-bar" style={{ padding: '10px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap', background: '#333', color: '#fff', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                <button onClick={() => navigate(-1)} style={{ padding: '6px 12px', cursor: 'pointer', background: '#eee', border: 'none', borderRadius: '4px' }}>Back</button>
                <button onClick={() => addChargeRow()} style={{ padding: '6px 12px', cursor: 'pointer', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}>+ Add Blank Row</button>
                <button className="bill-master-btn" onClick={() => setIsMasterModalOpen(true)}>+ Add Charge from Master</button>
                <button className="bill-master-btn" onClick={handlePrint} style={{ backgroundColor: '#1976d2' }}>Print Bill</button>
                {!editableFields.invoiceNo && (
                    <button className="bill-generate-btn" onClick={() => handleGenerateInvoice('GIA')} style={{ padding: '6px 12px', cursor: 'pointer', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>⚡ Generate Invoice No</button>
                )}
                <span style={{ fontSize: '11px', alignSelf: 'center', color: '#ccc', marginLeft: 'auto' }}>
                    <strong>Editor Mode:</strong> 25% Zoom applied to invoice only. Green fields are editable.
                </span>
            </div>

            {/* Actual Invoice Page (with Zoom) */}
            <div className="abi-page" ref={printableRef}>
                <div className="abi-header-top">TAX INVOICE</div>

            <div className="abi-header-main">
                <div className="abi-logo-section">
                    <img src={logo} alt="SURAJ" />
                </div>
                <div className="abi-company-center">
                    <h1>SURAJ FORWARDERS PVT LTD</h1>
                    <p>A/204-205, WALL STREET II, OPP. ORIENT CLUB,</p>
                    <p>NR. GUJARAT COLLEGE, ELLIS BRIDGE,</p>
                    <p>AHMEDABAD - 380006,GUJARAT</p>
                    <p>Tel. No.-07926402005</p>
                    <p>Email -account@surajforwarders.com</p>
                </div>
                <div className="abi-qr-section">
                    <div className="abi-qr-box">
                        QR CODE
                    </div>
                </div>
            </div>

            <div className="abi-registration-block">
                <div className="abi-reg-col">
                    <div className="abi-reg-item">
                        <span className="abi-reg-lbl">GSTIN</span>
                        <span className="abi-reg-sep">:</span>
                        <span className="abi-reg-val" style={{ fontWeight: 'bold' }}>24AAACS6838D1ZB</span>
                    </div>
                    <div className="abi-reg-item">
                        <span className="abi-reg-lbl">PAN No</span>
                        <span className="abi-reg-sep">:</span>
                        <span className="abi-reg-val" style={{ fontWeight: 'bold' }}>AAACS6838D</span>
                    </div>
                </div>
                <div className="abi-reg-col">
                    <div className="abi-reg-item">
                        <span className="abi-reg-lbl">State</span>
                        <span className="abi-reg-sep">:</span>
                        <span className="abi-reg-val" style={{ textTransform: 'uppercase' }}>[24] GUJARAT</span>
                    </div>
                    <div className="abi-reg-item">
                        <span className="abi-reg-lbl">CIN</span>
                        <span className="abi-reg-sep">:</span>
                        <span className="abi-reg-val">U63090GJ2007PTC050253</span>
                    </div>
                </div>
            </div>

            {/* Unified Master Job Info Grid */}
            <div className="abi-master-grid">
                {/* Left Side: 55% */}
                <div className="abi-grid-col abi-grid-left">
                    {/* Top Row: Customer */}
                    <div className="abi-grid-row abi-row-span-2">
                        <div className="abi-lbl" style={{ minWidth: '60px' }}>Customer</div>
                        <div className="abi-sep">:</div>
                        <div className="abi-val">
                            <strong style={{ fontSize: '10.5px' }}>{jobData.importer || ""}</strong>
                            <div style={{ marginTop: '2px' }}>
                                <textarea 
                                    className="abi-input" 
                                    style={{ height: '35px', background: '#e9ffe9' }}
                                    value={editableFields.importerAddress}
                                    onChange={(e) => handleFieldChange("importerAddress", e.target.value)}
                                />
                                <div>Gujarat, INDIA</div>
                                <strong>PAN No : </strong> 
                                <input className="abi-input" style={{ width: '100px', display: 'inline', background: '#e9ffe9' }} value={editableFields.panNo} onChange={e => handleFieldChange('panNo', e.target.value)} />
                                <br />
                                <strong>GSTIN : </strong>
                                <input className="abi-input" style={{ width: '120px', display: 'inline', background: '#e9ffe9' }} value={editableFields.gstin} onChange={e => handleFieldChange('gstin', e.target.value)} />
                                <strong style={{ marginLeft: '10px' }}>State : </strong> [{editableFields.stateCode}] {editableFields.stateName}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Rows */}
                    <div className="abi-grid-row"><div className="abi-lbl">BE Number</div><div className="abi-sep">:</div><div className="abi-val">{jobData.be_no || ""}</div></div>
                    <div className="abi-grid-row"><div className="abi-lbl">Date</div><div className="abi-sep">:</div><div className="abi-val">{formatDate(jobData.be_date)}</div></div>

                    <div className="abi-grid-row"><div className="abi-lbl">BE Type</div><div className="abi-sep">:</div><div className="abi-val">{jobData.type_of_b_e || "Home"}</div></div>
                    <div className="abi-grid-row"></div>

                    <div className="abi-grid-row"><div className="abi-lbl">MBL No.</div><div className="abi-sep">:</div><div className="abi-val">{jobData.awb_bl_no || ""}</div></div>
                    <div className="abi-grid-row"><div className="abi-lbl">Date</div><div className="abi-sep">:</div><div className="abi-val">{formatDate(jobData.awb_bl_date)}</div></div>

                    <div className="abi-grid-row"><div className="abi-lbl">HBL No.</div><div className="abi-sep">:</div><div className="abi-val">{jobData.hbl_no || ""}</div></div>
                    <div className="abi-grid-row"><div className="abi-lbl">Date</div><div className="abi-sep">:</div><div className="abi-val">{formatDate(jobData.hbl_date)}</div></div>

                    <div className="abi-grid-row"><div className="abi-lbl">Consignment Type</div><div className="abi-sep">:</div><div className="abi-val">{jobData.consignment_type || ""}</div></div>
                    <div className="abi-grid-row"><div className="abi-lbl">Packages</div><div className="abi-sep">:</div><div className="abi-val">{jobData.no_of_packages || "0"}</div></div>

                    <div className="abi-grid-row"><div className="abi-lbl">Gross Weight</div><div className="abi-sep">:</div><div className="abi-val">{jobData.gross_weight || "0.000"} KGS</div></div>
                    <div className="abi-grid-row"><div className="abi-lbl">Net Wt.</div><div className="abi-sep">:</div><div className="abi-val">{jobData.job_net_weight || "0.000"} KGS</div></div>

                    <div className="abi-grid-row"><div className="abi-lbl">Custom House</div><div className="abi-sep">:</div><div className="abi-val">{jobData.custom_house || ""}</div></div>
                    <div className="abi-grid-row"><div className="abi-lbl">Chg. Wt.</div><div className="abi-sep">:</div><div className="abi-val">{jobData.chargeable_weight || "0.000"}</div></div>

                    <div className="abi-grid-row"><div className="abi-lbl">Vessel</div><div className="abi-sep">:</div><div className="abi-val">{jobData.vessel_flight || ""}</div></div>
                    <div className="abi-grid-row"><div className="abi-lbl">Voyage</div><div className="abi-sep">:</div><div className="abi-val">{jobData.voyage_no || ""}</div></div>

                    <div className="abi-grid-row abi-row-span-2"><div className="abi-lbl">Origin Port</div><div className="abi-sep">:</div><div className="abi-val">{jobData.loading_port || ""}</div></div>
                </div>

                {/* Right Side: 45% */}
                <div className="abi-grid-col abi-grid-right">
                    {/* Top Row: Invoice Meta */}
                    <div className="abi-grid-row abi-row-span-2" style={{ padding: 0, display: 'grid' }}>
                        <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '1.5px 4px' }}>
                            <div className="abi-lbl" style={{ minWidth: '95px', fontSize: '11px' }}>Invoice No.</div>
                            <div className="abi-sep">:</div>
                            <div className="abi-val"><input className="abi-input highlight-field" style={{ fontWeight: '900', fontSize: '13.5px', color: '#000' }} value={editableFields.invoiceNo} onChange={e => handleFieldChange('invoiceNo', e.target.value)} /></div>
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '1.5px 4px' }}>
                            <div className="abi-lbl" style={{ minWidth: '95px' }}>Invoice Date</div>
                            <div className="abi-sep">:</div>
                            <div className="abi-val"><input className="abi-input" value={editableFields.invoiceDate} onChange={e => handleFieldChange('invoiceDate', e.target.value)} /></div>
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '1.5px 4px' }}>
                            <div className="abi-lbl" style={{ minWidth: '95px' }}>Due Date</div>
                            <div className="abi-sep">:</div>
                            <div className="abi-val"><input className="abi-input" value={editableFields.dueDate} onChange={e => handleFieldChange('dueDate', e.target.value)} /></div>
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '1.5px 4px' }}>
                            <div className="abi-lbl" style={{ minWidth: '95px' }}>Place of Supply</div>
                            <div className="abi-sep">:</div>
                            <div className="abi-val"><input className="abi-input" value={editableFields.placeOfSupply} onChange={e => handleFieldChange('placeOfSupply', e.target.value)} /></div>
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '1.5px 4px' }}>
                            <div className="abi-lbl" style={{ minWidth: '95px' }}>Job Number</div>
                            <div className="abi-sep">:</div>
                            <div className="abi-val">{jobData.job_number || "N/A"}</div>
                        </div>
                        <div style={{ display: 'flex', padding: '1.5px 4px' }}>
                            <div className="abi-lbl" style={{ minWidth: '95px' }}>Job Type</div>
                            <div className="abi-sep">:</div>
                            <div className="abi-val">{mode === 'SEA' ? 'Sea' : 'Air'} {trade_type === 'IMP' ? 'Import' : 'Export'}</div>
                        </div>
                    </div>

                    {/* Right Detailed Rows */}
                    <div className="abi-grid-row abi-row-span-2">
                        <div className="abi-lbl">Customer Ref.</div><div className="abi-sep">:</div>
                        <div className="abi-val"><input className="abi-input" value={editableFields.customerRef} onChange={e => handleFieldChange('customerRef', e.target.value)} /></div>
                    </div>

                    <div className="abi-grid-row">
                        <div className="abi-lbl">Invoice Number</div><div className="abi-sep">:</div>
                        <div className="abi-val">{jobData.invoice_details?.[0]?.invoice_number || ""}</div>
                    </div>
                    <div className="abi-grid-row">
                        <div className="abi-lbl" style={{ minWidth: '40px' }}>Date</div><div className="abi-sep">:</div>
                        <div className="abi-val">{formatDate(jobData.invoice_details?.[0]?.invoice_date)}</div>
                    </div>

                    <div className="abi-grid-row abi-row-span-2">
                        <div className="abi-lbl">Terms of Invoice</div><div className="abi-sep">:</div>
                        <div className="abi-val"><input className="abi-input" value={editableFields.termsOfInvoice} onChange={e => handleFieldChange('termsOfInvoice', e.target.value)} /></div>
                    </div>

                    <div className="abi-grid-row">
                        <div className="abi-lbl" style={{ minWidth: '70px' }}>Invoice Value</div><div className="abi-sep">:</div>
                        <div className="abi-val" style={{ whiteSpace: 'nowrap' }}>{jobData.invoice_details?.[0]?.total_inv_value || "0"} {jobData.invoice_details?.[0]?.inv_currency || ""}</div>
                    </div>
                    <div className="abi-grid-row">
                        <div className="abi-lbl" style={{ minWidth: '60px' }}>CIF Value</div><div className="abi-sep">:</div>
                        <div className="abi-val" style={{ whiteSpace: 'nowrap' }}><input className="abi-input" value={editableFields.cifValue} onChange={e => handleFieldChange('cifValue', e.target.value)} /></div>
                    </div>

                    <div className="abi-grid-row abi-row-span-2">
                        <div className="abi-lbl">Assess Value</div><div className="abi-sep">:</div>
                        <div className="abi-val">{jobData.assessable_ammount || "0"} INR</div>
                    </div>
                    <div className="abi-grid-row abi-row-span-2">
                        <div className="abi-lbl">Total Duty</div><div className="abi-sep">:</div>
                        <div className="abi-val">{jobData.total_duty || "0"} INR</div>
                    </div>

                    <div className="abi-grid-row abi-row-span-2">
                        <div className="abi-lbl">Shipper Name</div><div className="abi-sep">:</div>
                        <div className="abi-val"><input className="abi-input" value={editableFields.shipperName} onChange={e => handleFieldChange('shipperName', e.target.value)} /></div>
                    </div>
                    <div className="abi-grid-row abi-row-span-2">
                        <div className="abi-lbl">BE Heading</div><div className="abi-sep">:</div>
                        <div className="abi-val"><input className="abi-input" style={{ fontWeight: 'bold' }} value={editableFields.beHeading} onChange={e => handleFieldChange('beHeading', e.target.value)} /></div>
                    </div>
                    <div className="abi-grid-row abi-row-span-2">
                        <div className="abi-lbl">No. of Containers</div><div className="abi-sep">:</div>
                        <div className="abi-val">{getContainerCountSummary()}</div>
                    </div>
                </div>
            </div>

            <div className="abi-full-box">
                <div className="abi-full-row">
                    <div className="abi-full-lbl">Importer Name</div>
                    <div>: {jobData.importer || ""}</div>
                </div>
                <div className="abi-full-row">
                    <div className="abi-full-lbl">Containers</div>
                    <div>: {getContainerString()}</div>
                </div>
            </div>

            <table className="abi-table">
                <thead>
                    <tr>
                        <th style={{ width: '3%' }}>Sr No</th>
                        <th style={{ width: '30%', textAlign: 'left' }}>Description</th>
                        <th style={{ width: '8%' }}>SAC/ HSN</th>
                        <th style={{ width: '12%' }}>Receipt Details</th>
                        <th style={{ width: '5%' }}>Tax Type</th>
                        <th style={{ width: '10%' }}>Non GST Exempt Value (INR)</th>
                        <th style={{ width: '10%' }}>Taxable Value (INR)</th>
                        <th style={{ width: '7%', padding: 0, height: '1px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'stretch' }}>
                                <div style={{ padding: '3px' }}>CGST</div>
                                <div style={{ height: '1px', background: '#000' }}></div>
                                <div style={{ display: 'flex', flex: 1, alignItems: 'stretch' }}>
                                    <span style={{ width: '40%', borderRight: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>%</span>
                                    <span style={{ width: '60%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Tax</span>
                                </div>
                            </div>
                        </th>
                        <th style={{ width: '7%', padding: 0, height: '1px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'stretch' }}>
                                <div style={{ padding: '3px' }}>SGST</div>
                                <div style={{ height: '1px', background: '#000' }}></div>
                                <div style={{ display: 'flex', flex: 1, alignItems: 'stretch' }}>
                                    <span style={{ width: '40%', borderRight: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>%</span>
                                    <span style={{ width: '60%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Tax</span>
                                </div>
                            </div>
                        </th>
                        <th style={{ width: '10%' }}>Total (INR)</th>
                    </tr>
                </thead>
                <tbody>
                    {invoiceRows.map((r, idx) => {
                        const amt = parseFloat(r.taxable) || 0;
                        const cP = parseFloat(r.cgstPercent) || 0;
                        const sP = parseFloat(r.sgstPercent) || 0;
                        const cTax = amt * (cP / 100);
                        const sTax = amt * (sP / 100);
                        const rowTotal = amt + cTax + sTax;

                        return (
                            <tr key={r.id}>
                                <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {idx + 1}
                                        <button className="no-print" onClick={() => deleteRow(idx)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', padding: 0, fontSize: '12px' }}>x</button>
                                    </div>
                                </td>
                                <td><input className="abi-input desc" value={r.description} onChange={e => handleRowChange(idx, 'description', e.target.value)} /></td>
                                <td style={{ textAlign: 'center' }}><input className="abi-input" style={{ textAlign: 'center' }} value={r.sac} onChange={e => handleRowChange(idx, 'sac', e.target.value)} /></td>
                                <td><input className="abi-input" value={r.receipt} onChange={e => handleRowChange(idx, 'receipt', e.target.value)} /></td>
                                <td style={{ textAlign: 'center' }}><input className="abi-input" style={{ textAlign: 'center' }} value={r.taxType} onChange={e => handleRowChange(idx, 'taxType', e.target.value)} /></td>
                                <td style={{ textAlign: 'right' }}><input className="abi-input" style={{ textAlign: 'right' }} value={r.nonGst} onChange={e => handleRowChange(idx, 'nonGst', e.target.value)} /></td>
                                <td style={{ textAlign: 'right' }}><input type="number" className="abi-input" style={{ textAlign: 'right' }} value={r.taxable} onChange={e => handleRowChange(idx, 'taxable', e.target.value)} /></td>
                                <td style={{ padding: 0, height: '1px' }}>
                                    <div style={{ display: 'flex', height: '100%', alignItems: 'stretch' }}>
                                        <div style={{ width: '40%', padding: '4px', borderRight: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                            <input className="abi-input" style={{ textAlign: 'right' }} value={r.cgstPercent} onChange={e => handleRowChange(idx, 'cgstPercent', e.target.value)} />
                                        </div>
                                        <div style={{ width: '60%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                            {cTax ? formatCurrency(cTax) : ''}
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: 0, height: '1px' }}>
                                    <div style={{ display: 'flex', height: '100%', alignItems: 'stretch' }}>
                                        <div style={{ width: '40%', padding: '4px', borderRight: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                            <input className="abi-input" style={{ textAlign: 'right' }} value={r.sgstPercent} onChange={e => handleRowChange(idx, 'sgstPercent', e.target.value)} />
                                        </div>
                                        <div style={{ width: '60%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                            {sTax ? formatCurrency(sTax) : ''}
                                        </div>
                                    </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>{rowTotal ? formatCurrency(rowTotal) : ''}</td>
                            </tr>
                        )
                    })}
                    {/* Padding Row to stretch like image */}
                    <tr>
                        <td colSpan="10" style={{ height: '100px', borderBottom: 'none' }}></td>
                    </tr>
                    <tr className="abi-subtotal-row">
                        <td colSpan="6" style={{ textAlign: 'right', padding: '4px 8px' }}>Sub Total</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(totalTaxable)}</td>
                        <td style={{ padding: 0, height: '1px' }}>
                            <div style={{ display: 'flex', height: '100%', alignItems: 'stretch' }}>
                                <div style={{ width: '40%', borderRight: '1px solid #000' }}></div>
                                <div style={{ width: '60%', padding: '4px', textAlign: 'right' }}>{formatCurrency(totalCgst)}</div>
                            </div>
                        </td>
                        <td style={{ padding: 0, height: '1px' }}>
                            <div style={{ display: 'flex', height: '100%', alignItems: 'stretch' }}>
                                <div style={{ width: '40%', borderRight: '1px solid #000' }}></div>
                                <div style={{ width: '60%', padding: '4px', textAlign: 'right' }}>{formatCurrency(totalSgst)}</div>
                            </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(finalTotal)}</td>
                    </tr>
                </tbody>
            </table>

            <div className="abi-legend-bar">
                T: Taxable <span style={{ marginLeft: '10px' }}>P:Pure Agent</span> <span style={{ marginLeft: '10px' }}>E:Exemption</span> <span style={{ marginLeft: '10px' }}>R:Reverse Charge</span> <span style={{ marginLeft: '10px' }}>N:Non Taxable</span>
            </div>

            <div className="abi-btm-box">
                <div className="abi-bank-info">
                    <div className="abi-bank-header">Bank Account Details</div>
                    <div style={{ padding: '4px' }}>
                        <strong style={{ fontSize: '10.5px' }}>IDBI Bank Ltd.</strong><br/>
                        C G ROAD BRANCH<br/>
                        A/C No: 009102000030542<br/>
                        IFSC: IBKL0000009
                    </div>
                </div>

                <div className="abi-sac-summary">
                    <table className="abi-bank-inner-table">
                        <thead>
                            <tr>
                                <th style={{ width: '22%' }}>SAC/HSN</th>
                                <th style={{ width: '10%' }}>%</th>
                                <th style={{ width: '24%' }}>Taxable</th>
                                <th style={{ width: '22%' }}>CGST</th>
                                <th style={{ width: '22%' }}>SGST</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>996713</td>
                                <td>9.00</td>
                                <td>{formatCurrency(totalTaxable)}</td>
                                <td>{formatCurrency(totalCgst)}</td>
                                <td>{formatCurrency(totalSgst)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="abi-totals-side">
                    <div className="abi-tot-row">
                        <div className="abi-tot-lbl">Total Amount Before Tax</div>
                        <div className="abi-tot-cur">INR</div>
                        <div className="abi-tot-val">{formatCurrency(totalTaxable)}</div>
                    </div>
                    <div className="abi-tot-row">
                        <div className="abi-tot-lbl">Add : GST</div>
                        <div className="abi-tot-cur">INR</div>
                        <div className="abi-tot-val">{formatCurrency(totalGst)}</div>
                    </div>
                    <div className="abi-tot-row">
                        <div className="abi-tot-lbl">Total Invoice Value</div>
                        <div className="abi-tot-cur">INR</div>
                        <div className="abi-tot-val">{formatCurrency(finalTotal)}</div>
                    </div>
                    <div className="abi-tot-row">
                        <div className="abi-tot-lbl">Less : Advance Received</div>
                        <div className="abi-tot-cur">INR</div>
                        <div className="abi-tot-val">0.00</div>
                    </div>
                    <div className="abi-tot-row">
                        <div className="abi-tot-lbl">Round-Off</div>
                        <div className="abi-tot-cur">INR</div>
                        <div className="abi-tot-val">0.00</div>
                    </div>
                    <div className="abi-tot-row" style={{ height: '22px' }}>
                        <div className="abi-tot-lbl" style={{ fontSize: '10px' }}>Net Payable</div>
                        <div className="abi-tot-cur">INR</div>
                        <div className="abi-tot-val" style={{ fontSize: '10px' }}>{formatCurrency(finalTotal)}</div>
                    </div>
                    <div className="abi-tot-row" style={{ borderBottom: 'none' }}>
                        <div className="abi-tot-lbl">Tax Payable on Reverse Charges</div>
                        <div className="abi-tot-cur">INR</div>
                        <div className="abi-tot-val">0.00</div>
                    </div>
                </div>
            </div>

            <div className="abi-text-row">
                <strong>Payment Details :</strong>
            </div>
            <div className="abi-text-row">
                <strong>Net Payable In Words (INR)</strong> <span style={{ marginLeft: '10px', textTransform: 'capitalize' }}>{numberToWords(finalTotal).toLowerCase()}</span>
            </div>
            <div className="abi-text-row">
                <strong>Remarks :</strong>
            </div>

            <div className="abi-signature-row">
                <div className="abi-terms">
                    <strong>Terms & Conditions :</strong>
                    <ul style={{ margin: '3px 0 0 12px', padding: 0 }}>
                        <li>In case of any discrepancy in the invoice, please bring the same to our attention within 7 days of receipt of invoice; else the same would be treated as correct.</li>
                        <li>Delay in payment beyond the agreed credit period will attract interest @ 18% p.a.</li>
                        <li>Government Taxes applied as per the prevailing rates.</li>
                        <li>All disputes are subject to AHMEDABAD Jurisdiction.</li>
                        <li>We are Register in MSME - Our UDYAM No : UDYAM-GJ-01-0010319 / Type of Enterprise : SERVICE</li>
                    </ul>
                </div>
                <div className="abi-sig-block">
                    <div style={{ fontWeight: 'bold', fontSize: '10px' }}>For SURAJ FORWARDERS PVT LTD</div>
                    <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px 0' }}>
                        <img src={signature} alt="Signature" style={{ maxHeight: '45px', mixBlendMode: 'multiply' }} />
                    </div>
                    <div style={{ fontWeight: 'bold' }}>Authorised Signatory</div>
                </div>
            </div>

            <div className="abi-bottom-bar">
                <div style={{ width: '50%', textAlign: 'center' }}>
                    <div style={{ fontSize: '7px', fontWeight: 'normal', marginTop: '2px' }}>Powered By ALVISION</div>
                </div>
                <div style={{ width: '25%', textAlign: 'right' }}>Page : 1 / 1</div>
            </div>
            </div>

            {/* Master Charge Search Modal - Outside zoom for fixed positioning */}
            {isMasterModalOpen && (
                <div className="abi-modal-overlay no-print">
                    <div className="abi-modal-content">
                        <div className="abi-modal-header">
                            <h3 style={{ margin: 0 }}>Search or Select Predefined Charges</h3>
                            <button onClick={() => setIsMasterModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
                        </div>
                        <div className="abi-modal-body">
                            <div className="abi-search-box">
                                <input 
                                    type="text" 
                                    placeholder="Type to filter charges (e.g. THC, DO, etc.)..." 
                                    value={masterSearchTerm}
                                    onChange={(e) => setMasterSearchTerm(e.target.value)}
                                    style={{ width: '100%', padding: '10px', marginBottom: '15px' }}
                                />
                            </div>
                            <div className="abi-charge-list">
                                {chargeHeadsMaster
                                    .filter(ch => ch.name.toLowerCase().includes(masterSearchTerm.toLowerCase()))
                                    .map(ch => (
                                        <div key={ch._id} className="abi-charge-item">
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedMasterHeads.has(ch._id)}
                                                    onChange={() => toggleMasterSelection(ch._id)}
                                                />
                                                <span>{ch.name}</span>
                                            </label>
                                            <span className="abi-cat-tag" style={{ fontSize: '10px', background: '#eee', padding: '2px 6px', borderRadius: '10px' }}>{ch.category}</span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                        <div className="abi-modal-footer">
                            <button onClick={() => setIsMasterModalOpen(false)} style={{ padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
                            <button 
                                onClick={addSelectedFromMaster}
                                disabled={selectedMasterHeads.size === 0}
                                style={{ padding: '8px 16px', cursor: 'pointer', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}
                            >
                                Add Selected ({selectedMasterHeads.size})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgencyBillInvoice;
