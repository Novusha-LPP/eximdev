import React, { useState, useEffect, useCallback, useContext } from "react";
import { Reorder } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./ReimbursementBill.css";
import logo from '../../assets/images/logo.svg';
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
                // Pull charges explicitly tagged as "Reimbursement"
                const reimbursementCharges = (job.charges || []).filter(ch =>
                    ch.category === "Reimbursement"
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
                            description: ch.charge_name || ch.chargeHead || ch.charge_description || "Reimbursement",
                            sac: ch.sacHsn || "996713",
                            receipt: ch.invoice_number || "",
                            taxType: "P",
                            nonGst: Math.round(parseFloat(amount) || 0),
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
                dueDate: formatDate(new Date(new Date().setDate(new Date().getDate() + 15))),
                placeOfSupply: `[${job.importer_address?.state || "24"}] ${job.importer_address?.state || "Gujarat"}`,
                importerAddress: job.importer_address?.details || "",
                panNo: job.pan_no || job.importer_pan || "",
                gstin: job.gst_no || job.importer_gstin || "",
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
                        initialFields.panNo = initialFields.panNo || kyc.pan_no || "";

                        let kycGst = kyc.gst_no;
                        if (!kycGst && kyc.factory_addresses && kyc.factory_addresses.length > 0) {
                            kycGst = kyc.factory_addresses[0].gst;
                        }

                        initialFields.gstin = initialFields.gstin || kycGst || "";
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
                    const savedFields = saved.editableFields || {};
                    setEditableFields({
                        ...initialFields,
                        ...savedFields,
                        gstin: savedFields.gstin || initialFields.gstin,
                        panNo: savedFields.panNo || initialFields.panNo
                    });

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
                    totalNonGst += Math.round(parseFloat(r.nonGst) || 0);
                    const amt = Math.round(parseFloat(r.taxable) || 0);
                    const cgstP = parseFloat(r.cgstPercent) || 0;
                    const sgstP = parseFloat(r.sgstPercent) || 0;
                    totalTaxable += amt;
                    totalCgst += (amt * cgstP / 100);
                    totalSgst += (amt * sgstP / 100);
                });
                const rawFinalTotal = totalNonGst + totalTaxable + totalCgst + totalSgst;
                const roundedFinalTotal = Math.round(rawFinalTotal);
                const roundOff = roundedFinalTotal - rawFinalTotal;

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
                        roundOff,
                        finalTotal: roundedFinalTotal
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
        if (field === 'taxable' || field === 'nonGst') {
            newRows[index][field] = value === "" ? "" : Math.round(parseFloat(value) || 0);
        } else {
            newRows[index][field] = value;
        }
        setInvoiceRows(newRows);
    };

    const handleFieldChange = (field, value) => {
        setEditableFields(prev => {
            const updated = { ...prev, [field]: value };
            if (field === 'invoiceDate') {
                const parts = value.split('-');
                if (parts.length === 3) {
                    const parsedDate = new Date(`${parts[1]} ${parts[0]} ${parts[2]}`);
                    if (!isNaN(parsedDate.getTime())) {
                        parsedDate.setDate(parsedDate.getDate() + 15);
                        updated.dueDate = formatDate(parsedDate);
                    }
                }
            }
            return updated;
        });
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
        totalNonGst += Math.round(parseFloat(r.nonGst) || 0);
        const amt = Math.round(parseFloat(r.taxable) || 0);
        const cgstP = parseFloat(r.cgstPercent) || 0;
        const sgstP = parseFloat(r.sgstPercent) || 0;
        totalTaxable += amt;
        totalCgst += (amt * cgstP / 100);
        totalSgst += (amt * sgstP / 100);
    });

    const totalGst = totalCgst + totalSgst;
    const rawFinalTotal = totalNonGst + totalTaxable + totalGst;
    const roundedFinalTotal = Math.round(rawFinalTotal);
    const roundOff = roundedFinalTotal - rawFinalTotal;

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
            const nonGstAmt = Math.round(parseFloat(r.nonGst) || 0);
            const amt = Math.round(parseFloat(r.taxable) || 0);
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
                        <p>AHMEDABAD - 380006, GUJARAT</p>
                        <p>Tel : (079)26402005</p>
                        <p>Email : account@surajforwarders.com</p>

                        <div style={{ marginTop: '8px', borderTop: '1px solid #777', paddingTop: '4px', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', columnGap: '40px', fontSize: '9px', textAlign: 'left' }}>
                            <div style={{ paddingLeft: '20px' }}>
                                <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', minWidth: '45px' }}>GSTIN</span>: <span style={{ fontWeight: 'bold', marginLeft: '4px' }}>24AAKCS6838D1Z8</span></div>
                                <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', minWidth: '45px' }}>PAN No</span>: <span style={{ fontWeight: 'bold', marginLeft: '4px' }}>AAKCS6838D</span></div>
                            </div>
                            <div>
                                <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', minWidth: '45px' }}>State</span>: <span style={{ marginLeft: '4px', textTransform: 'uppercase' }}>[24] GUJARAT</span></div>
                                <div style={{ display: 'flex' }}><span style={{ fontWeight: 'bold', minWidth: '45px' }}>CIN</span>: <span style={{ marginLeft: '4px' }}>U63090GJ2007PTC050253</span></div>
                            </div>
                        </div>
                    </div>
                    <div className="abi-qr-section"></div>
                </div>

                <div className="abi-master-grid">
                    <div className="abi-grid-col abi-grid-left">
                        <div className="abi-grid-row abi-row-span-2" style={{ alignItems: 'flex-start', paddingTop: '4px' }}>
                            <div className="abi-lbl" style={{ minWidth: '60px' }}>Customer</div><div className="abi-sep">:</div>
                            <div className="abi-val">
                                <strong style={{ fontSize: '11px', textTransform: 'uppercase' }}>{jobData.importer || ""}</strong>
                                <div style={{ marginTop: '2px', lineHeight: '1.2' }}>
                                    <textarea className="abi-input" style={{ height: '35px', background: '#e9ffe9' }} value={editableFields.importerAddress} onChange={(e) => handleFieldChange("importerAddress", e.target.value)} />
                                    <div style={{ display: 'flex', marginTop: '4px', alignItems: 'center' }}>
                                        <div style={{ minWidth: '55px', fontWeight: 'bold' }}>PAN No</div>
                                        <div style={{ padding: '0 5px', fontWeight: 'bold' }}>:</div>
                                        <div style={{ flex: 1 }}>
                                            <input className="abi-input" style={{ width: '100%', background: '#e9ffe9', fontWeight: 'bold' }} value={editableFields.panNo} onChange={e => handleFieldChange('panNo', e.target.value)} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', marginTop: '2px', alignItems: 'center' }}>
                                        <div style={{ minWidth: '55px', fontWeight: 'bold' }}>GSTIN</div>
                                        <div style={{ padding: '0 5px', fontWeight: 'bold' }}>:</div>
                                        <div style={{ flex: 1 }}>
                                            <input className="abi-input" style={{ width: '100%', background: '#e9ffe9', fontWeight: 'bold' }} value={editableFields.gstin} onChange={e => handleFieldChange('gstin', e.target.value)} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', marginTop: '4px', alignItems: 'center' }}>
                                        <div style={{ minWidth: '55px', fontWeight: 'bold' }}>State</div>
                                        <div style={{ padding: '0 5px', fontWeight: 'bold' }}>:</div>
                                        <div style={{ flex: 1 }}>
                                            [{editableFields.stateCode}] {editableFields.stateName}
                                        </div>
                                    </div>
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
                        <div className="abi-grid-row"><div className="abi-lbl">{mode === 'AIR' ? 'Flight' : 'Vessel'}</div><div className="abi-sep">:</div><div className="abi-val">{jobData.vessel_flight || ""}</div></div>
                        <div className="abi-grid-row"><div className="abi-lbl">{mode === 'AIR' ? 'Flight No' : 'Voyage'}</div><div className="abi-sep">:</div><div className="abi-val">{jobData.voyage_no || ""}</div></div>
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
                        <div className="abi-grid-row abi-row-span-2"><div className="abi-lbl" style={{ minWidth: '95px' }}>Customer Ref.</div><div className="abi-sep">:</div><div className="abi-val"><input className="abi-input" value={editableFields.customerRef} onChange={e => handleFieldChange('customerRef', e.target.value)} /></div></div>
                        <div className="abi-grid-row abi-row-span-2">
                            <div className="abi-lbl" style={{ minWidth: '95px' }}>Invoice Number</div><div className="abi-sep">:</div>
                            <div style={{ marginRight: '20px' }}>{jobData.invoice_details?.[0]?.invoice_number || ""}</div>
                            <div className="abi-lbl" style={{ minWidth: 'auto', marginRight: '5px' }}>Date</div><div className="abi-sep">:</div>
                            <div className="abi-val">{formatDate(jobData.invoice_details?.[0]?.invoice_date)}</div>
                        </div>
                        <div className="abi-grid-row abi-row-span-2"><div className="abi-lbl" style={{ minWidth: '95px' }}>Terms of Invoice</div><div className="abi-sep">:</div><div className="abi-val"><input className="abi-input" value={editableFields.termsOfInvoice} onChange={e => handleFieldChange('termsOfInvoice', e.target.value)} /></div></div>
                        <div className="abi-grid-row abi-row-span-2">
                            <div className="abi-lbl" style={{ minWidth: '95px' }}>Invoice Value</div><div className="abi-sep">:</div>
                            <div style={{ marginRight: '20px', whiteSpace: 'nowrap' }}>{jobData.invoice_details?.[0]?.total_inv_value || "0"} {jobData.invoice_details?.[0]?.inv_currency || ""}</div>
                            <div className="abi-lbl" style={{ minWidth: 'auto', marginRight: '5px' }}>CIF Value</div><div className="abi-sep">:</div>
                            <div className="abi-val" style={{ whiteSpace: 'nowrap' }}><input className="abi-input" value={editableFields.cifValue} onChange={e => handleFieldChange('cifValue', e.target.value)} /></div>
                        </div>
                        <div className="abi-grid-row abi-row-span-2"><div className="abi-lbl" style={{ minWidth: '95px' }}>Assess Value</div><div className="abi-sep">:</div><div className="abi-val">{jobData.assessable_ammount || "0"} INR</div></div>
                        <div className="abi-grid-row abi-row-span-2"><div className="abi-lbl" style={{ minWidth: '95px' }}>Total Duty</div><div className="abi-sep">:</div><div className="abi-val">{jobData.total_duty || "0"} INR</div></div>
                        <div className="abi-grid-row abi-row-span-2">
                            <div className="abi-lbl" style={{ minWidth: '95px' }}>Shipper Name</div><div className="abi-sep">:</div>
                            <div className="abi-val"><input className="abi-input" value={editableFields.shipperName || ""} onChange={e => handleFieldChange('shipperName', e.target.value)} /></div>
                        </div>
                        <div className="abi-grid-row abi-row-span-2">
                            <div className="abi-lbl" style={{ minWidth: '95px' }}>BE Heading</div><div className="abi-sep">:</div>
                            <div className="abi-val">
                                <textarea
                                    className="abi-input"
                                    style={{ fontWeight: 'bold', height: 'auto', minHeight: '18px', resize: 'none', overflow: 'hidden', width: '100%', display: 'block' }}
                                    rows={1}
                                    value={editableFields.beHeading || ""}
                                    onChange={e => handleFieldChange('beHeading', e.target.value)}
                                    onInput={(e) => {
                                        e.target.style.height = '18px';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                    ref={el => {
                                        if (el) {
                                            el.style.height = '18px';
                                            el.style.height = el.scrollHeight + 'px';
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="abi-full-box">
                    <div className="abi-full-row"><div className="abi-full-lbl">Importer Name</div><div>: {jobData.importer || ""}</div></div>
                    {mode !== 'AIR' && (
                        <div className="abi-full-row"><div className="abi-full-lbl">Containers</div><div>: {getContainerString()}</div></div>
                    )}
                </div>

                <table className="abi-table">
                    <thead>
                        <tr>
                            <th rowSpan="2" style={{ width: '3%' }}>Sr No</th>
                            <th rowSpan="2" style={{ width: '28%', textAlign: 'center' }}>Description</th>
                            <th rowSpan="2" style={{ width: '7%' }}>SAC/ HSN</th>
                            <th rowSpan="2" style={{ width: '12%' }}>Receipt Details</th>
                            <th rowSpan="2" style={{ width: '4%' }}>Tax Type</th>
                            <th rowSpan="2" style={{ width: '10%' }}>Non GST Exempt Value (INR)</th>
                            <th rowSpan="2" style={{ width: '10%' }}>Taxable Value (INR)</th>
                            <th colSpan="2" style={{ width: '8%', padding: '3px', borderBottom: '1px solid #000' }}>CGST</th>
                            <th colSpan="2" style={{ width: '8%', padding: '3px', borderBottom: '1px solid #000' }}>SGST</th>
                            <th rowSpan="2" style={{ width: '10%' }}>Total (INR)</th>
                        </tr>
                        <tr>
                            <th style={{ width: '3.5%', borderRight: '1px solid #000', padding: '3px' }}>%</th>
                            <th style={{ width: '4.5%', padding: '3px' }}>Tax</th>
                            <th style={{ width: '3.5%', borderRight: '1px solid #000', padding: '3px' }}>%</th>
                            <th style={{ width: '4.5%', padding: '3px' }}>Tax</th>
                        </tr>
                    </thead>
                    <Reorder.Group axis="y" values={invoiceRows} onReorder={setInvoiceRows} as="tbody">
                        {invoiceRows.map((r, idx) => {
                            const nonGst = Math.round(parseFloat(r.nonGst) || 0);
                            const amt = Math.round(parseFloat(r.taxable) || 0);
                            const cP = parseFloat(r.cgstPercent) || 0;
                            const sP = parseFloat(r.sgstPercent) || 0;
                            const cTax = amt * (cP / 100);
                            const sTax = amt * (sP / 100);
                            const rowTotal = nonGst + amt + cTax + sTax;

                            return (
                                <Reorder.Item value={r} key={r.id} as="tr">
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: '#666' }} className="no-print">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M10 13a1 1 0 100-2 1 1 0 000 2zm4 0a1 1 0 100-2 1 1 0 000 2zm-4-4a1 1 0 100-2 1 1 0 000 2zm4 0a1 1 0 100-2 1 1 0 000 2zm-4 8a1 1 0 100-2 1 1 0 000 2zm4 0a1 1 0 100-2 1 1 0 000 2z" />
                                                </svg>
                                            </div>
                                            {idx + 1}
                                            <button className="no-print" onClick={() => deleteRow(idx)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', padding: 0, fontSize: '12px', marginLeft: '4px' }}>x</button>
                                        </div>
                                    </td>
                                    <td style={{ verticalAlign: 'middle', textAlign: 'left' }}>
                                        <textarea
                                            className="abi-input desc"
                                            rows={1}
                                            style={{ height: 'auto', minHeight: '18px', resize: 'none', overflow: 'hidden', width: '100%', padding: '2px 0', textAlign: 'left' }}
                                            value={r.description}
                                            onChange={e => handleRowChange(idx, 'description', e.target.value)}
                                            onInput={(e) => {
                                                e.target.style.height = '18px';
                                                e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            ref={el => {
                                                if (el) {
                                                    el.style.height = '18px';
                                                    el.style.height = el.scrollHeight + 'px';
                                                }
                                            }}
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center' }}><input className="abi-input" style={{ textAlign: 'center' }} value={r.sac} onChange={e => handleRowChange(idx, 'sac', e.target.value)} /></td>
                                    <td><input className="abi-input" value={r.receipt} onChange={e => handleRowChange(idx, 'receipt', e.target.value)} /></td>
                                    <td style={{ textAlign: 'center' }}><input className="abi-input" style={{ textAlign: 'center' }} value={r.taxType} onChange={e => handleRowChange(idx, 'taxType', e.target.value)} /></td>
                                    <td style={{ textAlign: 'right' }}><input className="abi-input" style={{ textAlign: 'right' }} value={r.nonGst} onChange={e => handleRowChange(idx, 'nonGst', e.target.value)} /></td>
                                    <td style={{ textAlign: 'right' }}><input type="number" className="abi-input" style={{ textAlign: 'right' }} value={r.taxable} onChange={e => handleRowChange(idx, 'taxable', e.target.value)} /></td>
                                    <td style={{ padding: '4px', borderRight: '1px solid #000' }}>
                                        <input className="abi-input" style={{ textAlign: 'right', width: '100%' }} value={r.cgstPercent} onChange={e => handleRowChange(idx, 'cgstPercent', e.target.value)} />
                                    </td>
                                    <td style={{ padding: '4px', textAlign: 'right' }}>
                                        {cTax ? formatCurrency(cTax) : ''}
                                    </td>
                                    <td style={{ padding: '4px', borderRight: '1px solid #000' }}>
                                        <input className="abi-input" style={{ textAlign: 'right', width: '100%' }} value={r.sgstPercent} onChange={e => handleRowChange(idx, 'sgstPercent', e.target.value)} />
                                    </td>
                                    <td style={{ padding: '4px', textAlign: 'right' }}>
                                        {sTax ? formatCurrency(sTax) : ''}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>{rowTotal ? formatCurrency(rowTotal) : ''}</td>
                                </Reorder.Item>
                            )
                        })}
                        <tr>
                            <td style={{ height: '100px', borderBottom: 'none' }}></td>
                            <td style={{ borderBottom: 'none' }}></td>
                            <td style={{ borderBottom: 'none' }}></td>
                            <td style={{ borderBottom: 'none' }}></td>
                            <td style={{ borderBottom: 'none' }}></td>
                            <td style={{ borderBottom: 'none' }}></td>
                            <td style={{ borderBottom: 'none' }}></td>
                            <td style={{ borderBottom: 'none', borderRight: '1px solid #000' }}></td>
                            <td style={{ borderBottom: 'none' }}></td>
                            <td style={{ borderBottom: 'none', borderRight: '1px solid #000' }}></td>
                            <td style={{ borderBottom: 'none' }}></td>
                            <td style={{ borderBottom: 'none' }}></td>
                        </tr>
                        <tr className="abi-subtotal-row">
                            <td colSpan="5" style={{ textAlign: 'right', padding: '4px 8px' }}>Sub Total</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(totalNonGst)}</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(totalTaxable)}</td>
                            <td style={{ borderRight: '1px solid #000' }}></td>
                            <td style={{ padding: '4px', textAlign: 'right' }}>{formatCurrency(totalCgst)}</td>
                            <td style={{ borderRight: '1px solid #000' }}></td>
                            <td style={{ padding: '4px', textAlign: 'right' }}>{formatCurrency(totalSgst)}</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(rawFinalTotal)}</td>
                        </tr>
                    </Reorder.Group>
                </table>

                <div className="abi-legend-bar">
                    T: Taxable <span style={{ marginLeft: '10px' }}>P:Pure Agent</span> <span style={{ marginLeft: '10px' }}>E:Exemption</span> <span style={{ marginLeft: '10px' }}>R:Reverse Charge</span> <span style={{ marginLeft: '10px' }}>N:Non Taxable</span>
                </div>

                <div className="abi-btm-box">
                    <div className="abi-bank-info">
                        <div className="abi-bank-header">Bank Account Details</div>
                        <div style={{ padding: '4px' }}>
                            <strong style={{ fontSize: '10.5px' }}>IDBI Bank Ltd.</strong><br />
                            C G ROAD BRANCH, AHMEDABAD<br />
                            A/C No: 009102000030542<br />
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
                        <div className="abi-tot-row"><div className="abi-tot-lbl">Total Invoice Value</div><div className="abi-tot-cur">INR</div><div className="abi-tot-val">{formatCurrency(rawFinalTotal)}</div></div>
                        <div className="abi-tot-row"><div className="abi-tot-lbl">Less : Advance Received</div><div className="abi-tot-cur">INR</div><div className="abi-tot-val">0.00</div></div>
                        <div className="abi-tot-row"><div className="abi-tot-lbl">Round-Off</div><div className="abi-tot-cur">INR</div><div className="abi-tot-val">{formatCurrency(roundOff)}</div></div>
                        <div className="abi-tot-row" style={{ height: '22px' }}><div className="abi-tot-lbl" style={{ fontSize: '10px' }}>Net Payable</div><div className="abi-tot-cur">INR</div><div className="abi-tot-val" style={{ fontSize: '10px' }}>{formatCurrency(roundedFinalTotal)}</div></div>
                        <div className="abi-tot-row" style={{ borderBottom: 'none' }}><div className="abi-tot-lbl">Tax Payable on Reverse Charges</div><div className="abi-tot-cur">INR</div><div className="abi-tot-val">0.00</div></div>
                    </div>
                </div>

                <div className="abi-text-row"><strong>Payment Details :</strong></div>
                <div className="abi-text-row">
                    <strong>Net Payable In Words (INR)</strong> <span style={{ marginLeft: '10px', textTransform: 'capitalize' }}>{numberToWords(roundedFinalTotal).toLowerCase()}</span>
                </div>
                <div className="abi-text-row"><strong>Remarks :</strong></div>

                <div className="abi-signature-row">
                    <div className="abi-terms">
                        <strong>Terms & Conditions :</strong>
                        <ul style={{ margin: '3px 0 0 0', paddingLeft: '15px' }}>
                            <li style={{ paddingLeft: '10px' }}>In case of any discrepancy in the invoice, please bring the same to our attention within 7 days on receipt of invoice; else the same would be treated as correct.</li>
                            <li style={{ paddingLeft: '10px' }}>Delay in payment beyond the agreed credit period will attract interest @ 18% p.a.</li>
                            <li style={{ paddingLeft: '10px' }}>Government Taxes applied as per the prevailing rates.</li>
                            <li style={{ paddingLeft: '10px' }}>All disputes are subject to AHMEDABAD Jurisdiction.</li>
                        </ul>
                    </div>
                    <div className="abi-sig-block">
                        <div style={{ fontWeight: 'bold' }}>For SURAJ FORWARDERS PVT LTD</div>
                        <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={signature} alt="Signature" style={{ maxHeight: '75px', mixBlendMode: 'multiply' }} />
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
                                {chargeHeadsMaster
                                    .filter(ch => 
                                        ch.category === "Reimbursement" &&
                                        ch.name.toLowerCase().includes(masterSearchTerm.toLowerCase())
                                    )
                                    .map(ch => (
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
