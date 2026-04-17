import React, { useState, useEffect, useCallback, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./ReimbursementBill.css";
import logo from '../../assets/images/logo.webp';
import signature from '../../assets/images/signature.png';
import { downloadInvoiceAsPDF } from "../../utils/invoicePrint.js";
import { UserContext } from "../../contexts/UserContext";

const ReimbursementBill = () => {
    const { branch_code, trade_type, mode, job_no, year } = useParams();
    const [jobData, setJobData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { user } = useContext(UserContext);
    const [generationLog, setGenerationLog] = useState(null);
    const printableRef = React.useRef();

    const [invoiceRows, setInvoiceRows] = useState([]);
    const [chargeHeadsMaster, setChargeHeadsMaster] = useState([]);
    const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
    const [masterSearchTerm, setMasterSearchTerm] = useState("");
    const [selectedMasterHeads, setSelectedMasterHeads] = useState(new Set());
    
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
        importerAddress: "",
        panNo: "",
        gstin: "",
        stateName: "Gujarat",
        stateCode: "24"
    });

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/ /g, '-');
    };

    const fetchJobDetails = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `${process.env.REACT_APP_API_STRING}/get-job/${branch_code}/${trade_type}/${mode}/${year}/${job_no}`
            );
            const job = response.data;
            setJobData(job);
            
            try {
                const chargeHeadsRes = await axios.get(`${process.env.REACT_APP_API_STRING}/charge-heads`);
                if (chargeHeadsRes.data.success) {
                    setChargeHeadsMaster(chargeHeadsRes.data.data || []);
                }
            } catch (e) {
                console.error("Error fetching charge heads", e);
            }

            try {
                // Get reimbursement charges directly from job charges grid revenue section
                // We include all revenue charges that have an amount > 0
                const reimbursementCharges = (job.charges || []).filter(ch => 
                    ch.revenue?.amountINR > 0
                );
                
                if (reimbursementCharges.length > 0) {
                    const mappedRows = reimbursementCharges.map(ch => {
                        const isGst = ch.revenue?.isGst;
                        const amount = ch.revenue?.amountINR || 0;
                        const gstRate = ch.revenue?.gstRate || 0;
                        
                        // Format receipt details: Number Date Amount
                        const receiptDetails = `${ch.invoice_number || ""} ${ch.invoice_date || ""} ${amount > 0 ? amount.toFixed(2) : ""}`.trim();

                        return {
                            id: ch._id || Math.random().toString(),
                            description: ch.revenue?.partyName || ch.charge_description || ch.chargeHead || "Reimbursement",
                            sac: ch.sacHsn || "996713", 
                            receipt: "", // Always blank as per user request
                            taxType: "P", 
                            nonGst: amount, 
                            taxable: 0,
                            cgstPercent: 0,
                            sgstPercent: 0
                        };
                    });
                    setInvoiceRows(mappedRows);
                }
            } catch (e) {
                console.error("Error fetching reimbursement data", e);
            }

            const firstInv = (job.invoice_details && job.invoice_details[0]) || {};
            
            // Initialize editable fields with job data
            let initialFields = {
                beHeading: job.item_description || job.description || "",
                shipperName: job.supplier_exporter || "",
                customerRef: job.po_no || "",
                cifValue: firstInv.total_inv_value || "",
                termsOfInvoice: firstInv.toi || "CIF",
                invoiceNo: job.reimbursement_invoice_no || "", 
                invoiceDate: formatDate(new Date()), 
                dueDate: formatDate(new Date()),
                placeOfSupply: `[${job.importer_address?.state || "24"}] ${job.importer_address?.state || "Gujarat"}`,
                importerAddress: job.importer_address?.details || "",
                panNo: job.importer_pan || "",
                gstin: job.importer_gstin || "",
                stateName: job.importer_address?.state || "Gujarat",
                stateCode: "24"
            };

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
                const savedBillRes = await axios.get(`${process.env.REACT_APP_API_STRING}/billing/${job._id}/GIR`);
                if (savedBillRes.data.success && savedBillRes.data.data) {
                    const saved = savedBillRes.data.data;
                    // Note: We always fresh-sync rows from the grid for now to avoid old cached "G" type data
                    // Only loading editable fields (invoice no, date, address) from save
                    setEditableFields(saved.editableFields || initialFields);
                    
                    if (saved.generatedAt) {
                        setGenerationLog({
                            firstName: saved.generatedByFirstName,
                            lastName: saved.generatedByLastName,
                            at: saved.generatedAt
                        });
                    }

                    setLoading(false);
                    return; 
                }
            } catch (e) {
                console.log("No saved reimbursement bill found, proceeding with defaults");
            }

            setEditableFields(initialFields);
            setLoading(false);
        } catch (err) {
            setError("Failed to load job details. Please try again.");
            setLoading(false);
        }
    }, [branch_code, trade_type, mode, job_no, year]);

    useEffect(() => {
        fetchJobDetails();
    }, [fetchJobDetails]);

    const handlePrint = () => {
        if (printableRef.current) {
            const fileName = `DebitNote_${editableFields.invoiceNo.replace(/\//g, '-')}.pdf`;
            downloadInvoiceAsPDF(printableRef.current, fileName);
        }
    };

    useEffect(() => {
        if (!editableFields.invoiceNo || !jobData?._id) return;

        const timer = setTimeout(async () => {
            try {
                // Calculate totals for saving
                let totalNonGst = 0;
                let totalTaxable = 0;
                let totalCgst = 0;
                let totalSgst = 0;

                invoiceRows.forEach(r => {
                    totalNonGst += parseFloat(r.nonGst) || 0;
                    const amt = parseFloat(r.taxable) || 0;
                    const cgstP = parseFloat(r.cgstPercent) || 0;
                    const sgstP = parseFloat(r.sgstPercent) || 0;
                    totalTaxable += amt;
                    totalCgst += (amt * cgstP / 100);
                    totalSgst += (amt * sgstP / 100);
                });
                const finalTotal = totalNonGst + totalTaxable + totalCgst + totalSgst;

                const res = await axios.post(`${process.env.REACT_APP_API_STRING}/billing/save`, {
                    jobId: jobData._id,
                    type: 'GIR',
                    billNo: editableFields.invoiceNo,
                    rows: invoiceRows,
                    editableFields,
                    totals: {
                        totalNonGst,
                        totalTaxable,
                        totalCgst,
                        totalSgst,
                        finalTotal
                    },
                    firstName: user?.first_name,
                    lastName: user?.last_name
                });
                
                // If log was missing, update it from the save response
                if (!generationLog && res.data.data?.generatedAt) {
                    setGenerationLog({
                        firstName: res.data.data.generatedByFirstName,
                        lastName: res.data.data.generatedByLastName,
                        at: res.data.data.generatedAt
                    });
                }
                console.log("Reimbursement Bill auto-saved");
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
                type,
                firstName: user?.first_name,
                lastName: user?.last_name
            });
            if (res.data.success) {
                setEditableFields(prev => ({ ...prev, invoiceNo: res.data.invoiceNo }));
                setGenerationLog({
                    firstName: user?.first_name,
                    lastName: user?.last_name,
                    at: new Date()
                });
            }
        } catch (err) {
            alert("Error generating invoice number: " + err.message);
        }
    };

    const addChargeRow = (chargeHeadName = "") => {
        setInvoiceRows([...invoiceRows, {
            id: Math.random().toString(),
            description: chargeHeadName,
            sac: "996713", // Default SAC
            receipt: "",
            taxType: "P", // Default to Pure Agent for reimbursements
            nonGst: 0,
            taxable: 0,
            cgstPercent: 0,
            sgstPercent: 0
        }]);
    };

    const addSelectedFromMaster = () => {
        const newRows = [...invoiceRows];
        const selected = chargeHeadsMaster.filter(ch => selectedMasterHeads.has(ch._id));
        
        selected.forEach(ch => {
            newRows.push({
                id: Math.random().toString(),
                description: ch.name || "",
                sac: "996713", // Default SAC
                receipt: "",
                taxType: "P", // Default to Pure Agent
                nonGst: 0,
                taxable: 0,
                cgstPercent: 0,
                sgstPercent: 0
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

    // Totals logic
    let totalNonGst = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;

    invoiceRows.forEach(r => {
        totalNonGst += parseFloat(r.nonGst) || 0;
        const amt = parseFloat(r.taxable) || 0;
        const cgstP = parseFloat(r.cgstPercent) || 0;
        const sgstP = parseFloat(r.sgstPercent) || 0;
        totalTaxable += amt;
        totalCgst += (amt * cgstP / 100);
        totalSgst += (amt * sgstP / 100);
    });

    const totalGst = totalCgst + totalSgst;
    const finalTotal = totalNonGst + totalTaxable + totalGst;

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

    // --- SAC SUMMARY CALCULATOR ---
    const getSacSummary = () => {
        const summaryMap = {};
        invoiceRows.forEach(r => {
            const s = r.sac || "N/A";
            const amt = parseFloat(r.taxable) || 0;
            const cP = parseFloat(r.cgstPercent) || 0;
            const sP = parseFloat(r.sgstPercent) || 0;
            const cVal = amt * (cP / 100);
            const sVal = amt * (sP / 100);
            const totalPercent = cP + sP;

            if (!summaryMap[s]) {
                summaryMap[s] = { sac: s, percent: totalPercent, taxable: 0, cgst: 0, sgst: 0 };
            }
            summaryMap[s].taxable += amt;
            summaryMap[s].cgst += cVal;
            summaryMap[s].sgst += sVal;
            // Use the highest percent found for this SAC in case of discrepancies
            if (totalPercent > summaryMap[s].percent) summaryMap[s].percent = totalPercent;
        });
        return Object.values(summaryMap);
    };

    if (loading) return <div className="loading" style={{ margin: '20px' }}>Loading Reimbursement Bill...</div>;
    if (error) return <div className="error" style={{ margin: '20px' }}>{error}</div>;
    if (!jobData) return <div className="error" style={{ margin: '20px' }}>No job data found.</div>;

    const sacSummary = getSacSummary();

    return (
        <div className="abi-main-wrapper" style={{ minHeight: '100vh', background: '#e0e0e0', paddingBottom: '40px' }}>
            <div className="no-print abi-action-bar" style={{ padding: '10px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap', background: '#333', color: '#fff', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                <button onClick={() => navigate(-1)} style={{ padding: '6px 12px', cursor: 'pointer', background: '#eee', border: 'none', borderRadius: '4px' }}>Back</button>
                <button className="bill-master-btn" onClick={handlePrint} style={{ backgroundColor: '#1976d2', padding: '6px 12px', cursor: 'pointer', border: 'none', borderRadius: '4px', color: '#fff' }}>Print Bill</button>
                <button onClick={() => addChargeRow()} style={{ padding: '6px 12px', cursor: 'pointer', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}>+ Add Row</button>
                <button className="bill-master-btn" onClick={() => setIsMasterModalOpen(true)} style={{ padding: '6px 12px', cursor: 'pointer', background: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px' }}>+ Add Charge from Master</button>
                {!editableFields.invoiceNo && (
                    <button className="bill-generate-btn" onClick={() => handleGenerateInvoice('GIR')} style={{ padding: '6px 12px', cursor: 'pointer', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>⚡ Generate Bill No</button>
                )}
                <span style={{ fontSize: '11px', alignSelf: 'center', color: '#ccc', marginLeft: 'auto' }}>
                    <strong>Editor Mode:</strong> 25% Zoom applied. Charges auto-populated correctly.
                </span>
            </div>

            <div className="abi-page" ref={printableRef}>
                <div className="abi-header-top">REIMBURSEMENT BILL</div>

                <div className="abi-header-main">
                    <div className="abi-logo-section"><img src={logo} alt="SURAJ" /></div>
                    <div className="abi-company-center">
                        <h1>SURAJ FORWARDERS PVT LTD</h1>
                        <p>A/204-205, WALL STREET II, OPP. ORIENT CLUB,</p>
                        <p>NR. GUJARAT COLLEGE, ELLIS BRIDGE,</p>
                        <p>AHMEDABAD - 380006,GUJARAT</p>
                        <p>Tel. No.-07926402005</p>
                        <p>Email -account@surajforwarders.com</p>
                    </div>
                    <div className="abi-qr-section"><div className="abi-qr-box">QR CODE</div></div>
                </div>

                <div className="abi-registration-block">
                    <div className="abi-reg-col">
                        <div className="abi-reg-item"><span className="abi-reg-lbl">GSTIN</span><span className="abi-reg-sep">:</span><span className="abi-reg-val" style={{ fontWeight: 'bold' }}>24AAACS6838D1ZB</span></div>
                        <div className="abi-reg-item"><span className="abi-reg-lbl">PAN No</span><span className="abi-reg-sep">:</span><span className="abi-reg-val" style={{ fontWeight: 'bold' }}>AAACS6838D</span></div>
                    </div>
                    <div className="abi-reg-col">
                        <div className="abi-reg-item"><span className="abi-reg-lbl">State</span><span className="abi-reg-sep">:</span><span className="abi-reg-val" style={{ textTransform: 'uppercase' }}>[24] GUJARAT</span></div>
                        <div className="abi-reg-item"><span className="abi-reg-lbl">CIN</span><span className="abi-reg-sep">:</span><span className="abi-reg-val">U63090GJ2007PTC050253</span></div>
                    </div>
                </div>

                <div className="abi-master-grid">
                    <div className="abi-grid-col abi-grid-left">
                        <div className="abi-grid-row abi-row-span-2">
                            <div className="abi-lbl" style={{ minWidth: '60px' }}>Customer</div><div className="abi-sep">:</div>
                            <div className="abi-val">
                                <strong style={{ fontSize: '10.5px' }}>{jobData.importer || ""}</strong>
                                <div style={{ marginTop: '2px' }}>
                                    <textarea className="abi-input" style={{ height: '35px', background: '#e9ffe9' }} value={editableFields.importerAddress} onChange={(e) => handleFieldChange("importerAddress", e.target.value)} />
                                    <div>Gujarat, INDIA</div>
                                    <strong>PAN No : </strong> <input className="abi-input" style={{ width: '100px', display: 'inline', background: '#e9ffe9' }} value={editableFields.panNo} onChange={e => handleFieldChange('panNo', e.target.value)} />
                                    <br />
                                    <strong>GSTIN : </strong> <input className="abi-input" style={{ width: '120px', display: 'inline', background: '#e9ffe9' }} value={editableFields.gstin} onChange={e => handleFieldChange('gstin', e.target.value)} />
                                    <strong style={{ marginLeft: '10px' }}>State : </strong> [{editableFields.stateCode}] {editableFields.stateName}
                                </div>
                            </div>
                        </div>
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
                    <div className="abi-grid-col abi-grid-right">
                        <div className="abi-grid-row abi-row-span-2" style={{ padding: 0, display: 'grid' }}>
                            <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '1.5px 4px' }}>
                                <div className="abi-lbl" style={{ minWidth: '95px', fontSize: '11px' }}>Bill No.</div><div className="abi-sep">:</div>
                                <div className="abi-val"><input className="abi-input highlight-field" style={{ fontWeight: '900', fontSize: '13.5px', color: '#000' }} value={editableFields.invoiceNo} onChange={e => handleFieldChange('invoiceNo', e.target.value)} /></div>
                            </div>
                            <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '1.5px 4px' }}>
                                <div className="abi-lbl" style={{ minWidth: '95px' }}>Bill Date</div><div className="abi-sep">:</div>
                                <div className="abi-val"><input className="abi-input" value={editableFields.invoiceDate} onChange={e => handleFieldChange('invoiceDate', e.target.value)} /></div>
                            </div>
                            <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '1.5px 4px' }}>
                                <div className="abi-lbl" style={{ minWidth: '95px' }}>Due Date</div><div className="abi-sep">:</div>
                                <div className="abi-val"><input className="abi-input" value={editableFields.dueDate} onChange={e => handleFieldChange('dueDate', e.target.value)} /></div>
                            </div>
                            <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '1.5px 4px' }}>
                                <div className="abi-lbl" style={{ minWidth: '95px' }}>Place of Supply</div><div className="abi-sep">:</div>
                                <div className="abi-val"><input className="abi-input" value={editableFields.placeOfSupply} onChange={e => handleFieldChange('placeOfSupply', e.target.value)} /></div>
                            </div>
                            <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '1.5px 4px' }}>
                                <div className="abi-lbl" style={{ minWidth: '95px' }}>Job Number</div><div className="abi-sep">:</div>
                                <div className="abi-val">{jobData.job_number || "N/A"}</div>
                            </div>
                            <div style={{ display: 'flex', padding: '1.5px 4px' }}>
                                <div className="abi-lbl" style={{ minWidth: '95px' }}>Job Type</div><div className="abi-sep">:</div>
                                <div className="abi-val">{mode === 'SEA' ? 'Sea' : 'Air'} {trade_type === 'IMP' ? 'Import' : 'Export'}</div>
                            </div>
                        </div>
                        <div className="abi-grid-row abi-row-span-2"><div className="abi-lbl">Customer Ref.</div><div className="abi-sep">:</div><div className="abi-val"><input className="abi-input" value={editableFields.customerRef} onChange={e => handleFieldChange('customerRef', e.target.value)} /></div></div>
                        <div className="abi-grid-row"><div className="abi-lbl">Invoice Number</div><div className="abi-sep">:</div><div className="abi-val">{jobData.invoice_details?.[0]?.invoice_number || ""}</div></div>
                        <div className="abi-grid-row"><div className="abi-lbl" style={{ minWidth: '40px' }}>Date</div><div className="abi-sep">:</div><div className="abi-val">{formatDate(jobData.invoice_details?.[0]?.invoice_date)}</div></div>
                        <div className="abi-grid-row abi-row-span-2"><div className="abi-lbl">Terms of Invoice</div><div className="abi-sep">:</div><div className="abi-val"><input className="abi-input" value={editableFields.termsOfInvoice} onChange={e => handleFieldChange('termsOfInvoice', e.target.value)} /></div></div>
                        <div className="abi-grid-row"><div className="abi-lbl" style={{ minWidth: '70px' }}>Invoice Value</div><div className="abi-sep">:</div><div className="abi-val" style={{ whiteSpace: 'nowrap' }}>{jobData.invoice_details?.[0]?.total_inv_value || "0"} {jobData.invoice_details?.[0]?.inv_currency || ""}</div></div>
                        <div className="abi-grid-row"><div className="abi-lbl" style={{ minWidth: '60px' }}>CIF Value</div><div className="abi-sep">:</div><div className="abi-val" style={{ whiteSpace: 'nowrap' }}><input className="abi-input" value={editableFields.cifValue} onChange={e => handleFieldChange('cifValue', e.target.value)} /></div></div>
                        <div className="abi-grid-row abi-row-span-2"><div className="abi-lbl">Assess Value</div><div className="abi-sep">:</div><div className="abi-val">{jobData.assessable_ammount || "0"} INR</div></div>
                        <div className="abi-grid-row abi-row-span-2"><div className="abi-lbl">Total Duty</div><div className="abi-sep">:</div><div className="abi-val">{jobData.total_duty || "0"} INR</div></div>
                    </div>
                </div>

                <div className="abi-full-box">
                    <div className="abi-full-row"><div className="abi-full-lbl">Importer Name</div><div>: {jobData.importer || ""}</div></div>
                    <div className="abi-full-row"><div className="abi-full-lbl">Containers</div><div>: {getContainerString()}</div></div>
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
                            const nonGst = parseFloat(r.nonGst) || 0;
                            const amt = parseFloat(r.taxable) || 0;
                            const cP = parseFloat(r.cgstPercent) || 0;
                            const sP = parseFloat(r.sgstPercent) || 0;
                            const cTax = amt * (cP / 100);
                            const sTax = amt * (sP / 100);
                            const rowTotal = nonGst + amt + cTax + sTax;

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
                                            <div style={{ width: '60%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{cTax ? formatCurrency(cTax) : ''}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: 0, height: '1px' }}>
                                        <div style={{ display: 'flex', height: '100%', alignItems: 'stretch' }}>
                                            <div style={{ width: '40%', padding: '4px', borderRight: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                <input className="abi-input" style={{ textAlign: 'right' }} value={r.sgstPercent} onChange={e => handleRowChange(idx, 'sgstPercent', e.target.value)} />
                                            </div>
                                            <div style={{ width: '60%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{sTax ? formatCurrency(sTax) : ''}</div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>{rowTotal ? formatCurrency(rowTotal) : ''}</td>
                                </tr>
                            )
                        })}
                        <tr><td colSpan="10" style={{ height: '100px', borderBottom: 'none' }}></td></tr>
                        <tr className="abi-subtotal-row">
                            <td colSpan="5" style={{ textAlign: 'right', padding: '4px 8px' }}>Sub Total</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(totalNonGst)}</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(totalTaxable)}</td>
                            <td style={{ padding: 0, height: '1px' }}><div style={{ display: 'flex', height: '100%', alignItems: 'stretch' }}><div style={{ width: '40%', borderRight: '1px solid #000' }}></div><div style={{ width: '60%', padding: '4px', textAlign: 'right' }}>{formatCurrency(totalCgst)}</div></div></td>
                            <td style={{ padding: 0, height: '1px' }}><div style={{ display: 'flex', height: '100%', alignItems: 'stretch' }}><div style={{ width: '40%', borderRight: '1px solid #000' }}></div><div style={{ width: '60%', padding: '4px', textAlign: 'right' }}>{formatCurrency(totalSgst)}</div></div></td>
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
                                    <th style={{ width: '22%' }}>SAC/HSN</th><th style={{ width: '10%' }}>%</th><th style={{ width: '24%' }}>Taxable</th><th style={{ width: '22%' }}>CGST</th><th style={{ width: '22%' }}>SGST</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sacSummary.length > 0 ? sacSummary.map((s, idx) => (
                                    <tr key={idx}>
                                        <td>{s.sac}</td>
                                        <td>{s.percent ? s.percent.toFixed(2) : "0.00"}</td>
                                        <td>{formatCurrency(s.taxable)}</td>
                                        <td>{formatCurrency(s.cgst)}</td>
                                        <td>{formatCurrency(s.sgst)}</td>
                                    </tr>
                                )) : (
                                    <tr><td>996713</td><td>0.00</td><td>0.00</td><td>0.00</td><td>0.00</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="abi-totals-side">
                        <div className="abi-tot-row"><div className="abi-tot-lbl">Total Amount Before Tax</div><div className="abi-tot-cur">INR</div><div className="abi-tot-val">{formatCurrency(totalTaxable + totalNonGst)}</div></div>
                        <div className="abi-tot-row"><div className="abi-tot-lbl">Add : GST</div><div className="abi-tot-cur">INR</div><div className="abi-tot-val">{formatCurrency(totalGst)}</div></div>
                        <div className="abi-tot-row"><div className="abi-tot-lbl">Total Invoice Value</div><div className="abi-tot-cur">INR</div><div className="abi-tot-val">{formatCurrency(finalTotal)}</div></div>
                        <div className="abi-tot-row"><div className="abi-tot-lbl">Less : Advance Received</div><div className="abi-tot-cur">INR</div><div className="abi-tot-val">0.00</div></div>
                        <div className="abi-tot-row"><div className="abi-tot-lbl">Round-Off</div><div className="abi-tot-cur">INR</div><div className="abi-tot-val">0.00</div></div>
                        <div className="abi-tot-row" style={{ height: '22px' }}><div className="abi-tot-lbl" style={{ fontSize: '10px' }}>Net Payable</div><div className="abi-tot-cur">INR</div><div className="abi-tot-val" style={{ fontSize: '10px' }}>{formatCurrency(finalTotal)}</div></div>
                        <div className="abi-tot-row" style={{ borderBottom: 'none' }}><div className="abi-tot-lbl">Tax Payable on Reverse Charges</div><div className="abi-tot-cur">INR</div><div className="abi-tot-val">0.00</div></div>
                    </div>
                </div>

                <div className="abi-text-row"><strong>Payment Details :</strong></div>
                <div className="abi-text-row">
                    <strong>Net Payable In Words (INR)</strong> <span style={{ marginLeft: '10px', textTransform: 'capitalize' }}>{numberToWords(finalTotal).toLowerCase()}</span>
                </div>
                <div className="abi-text-row"><strong>Remarks :</strong></div>

                <div className="abi-signature-row">
                    <div className="abi-terms">
                        <strong>Terms & Conditions :</strong>
                        <ul style={{ margin: '3px 0 0 12px', padding: 0 }}>
                            <li>In case of any discrepancy in the invoice, please bring the same to our attention within 7 days of receipt of invoice; else the same would be treated as correct.</li>
                            <li>Delay in payment beyond the agreed credit period will attract interest @ 18% p.a.</li>
                            <li>Government Taxes applied as per the prevailing rates.</li>
                            <li>All disputes are subject to AHMEDABAD Jurisdiction.</li>
                        </ul>
                    </div>
                    <div className="abi-sig-block">
                        <div style={{ fontWeight: 'bold' }}>For SURAJ FORWARDERS PVT LTD</div>
                        <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={signature} alt="Signature" style={{ maxHeight: '45px', mixBlendMode: 'multiply' }} />
                        </div>
                        <div style={{ fontWeight: 'bold' }}>Authorised Signatory</div>
                    </div>
                </div>

                {generationLog && (
                    <div className="no-print" style={{ marginTop: '10px', fontSize: '9px', color: '#666', fontStyle: 'italic', borderTop: '1px solid #eee', paddingTop: '5px' }}>
                        * This bill was generated by {generationLog.firstName} {generationLog.lastName} on {new Date(generationLog.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                )}
            </div>
            
            {isMasterModalOpen && (
                <div className="abi-modal-overlay no-print">
                    <div className="abi-modal-content">
                        <div className="abi-modal-header"><h3 style={{ margin: 0 }}>Select Additional Charges</h3><button onClick={() => setIsMasterModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button></div>
                        <div className="abi-modal-body">
                            <input type="text" placeholder="Search charges..." value={masterSearchTerm} onChange={(e) => setMasterSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px' }} />
                            <div className="abi-charge-list">
                                {chargeHeadsMaster.filter(ch => ch.name.toLowerCase().includes(masterSearchTerm.toLowerCase())).map(ch => (
                                    <div key={ch._id} className="abi-charge-item"><label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={selectedMasterHeads.has(ch._id)} onChange={() => toggleMasterSelection(ch._id)} />
                                        <span>{ch.name}</span></label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="abi-modal-footer">
                            <button onClick={() => setIsMasterModalOpen(false)} style={{ padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={addSelectedFromMaster} disabled={selectedMasterHeads.size === 0} style={{ padding: '8px 16px', cursor: 'pointer', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}>Add Selected ({selectedMasterHeads.size})</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReimbursementBill;
