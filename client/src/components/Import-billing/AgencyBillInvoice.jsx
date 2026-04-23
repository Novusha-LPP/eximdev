import React, { useState, useEffect, useCallback, useContext } from "react";
import { Reorder } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./AgencyBillInvoice.css";
import logo from '../../assets/images/logo.svg';
import signature from '../../assets/images/signature.png';
import { downloadInvoiceAsPDF } from "../../utils/invoicePrint.js";

import { UserContext } from "../../contexts/UserContext";

const AgencyBillInvoice = () => {
    const { branch_code, trade_type, mode, job_no, year } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(UserContext);

    const [jobData, setJobData] = useState(null);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generationLog, setGenerationLog] = useState(null);
    const [suggestedNo, setSuggestedNo] = useState("");
    const printableRef = React.useRef();

    const [invoiceRows, setInvoiceRows] = useState([]);
    const [chargeHeadsMaster, setChargeHeadsMaster] = useState([]);
    const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
    const [masterSearchTerm, setMasterSearchTerm] = useState("");
    const [selectedMasterHeads, setSelectedMasterHeads] = useState(new Set());
    const [preCombineRows, setPreCombineRows] = useState(null);

    const isAdmin = user?.role === "Admin";
    const isJobCompleted = jobData?.status?.toUpperCase() === "COMPLETED";
    // Managed via state for manual control

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

    const handleInvalidate = async () => {
        const remark = window.prompt("Enter reason for invalidation (Remark):");
        if (remark === null) return; 

        if (window.confirm(`Are you sure you want to invalidate the GIA bill? The job status will move back to Pending.`)) {
            try {
                setLoading(true);
                const res = await axios.post(`${process.env.REACT_APP_API_STRING}/billing/invalidate`, {
                    jobId: jobData._id,
                    remark,
                    type: 'GIA'
                });
                if (res.data.success) {
                    alert("Bill invalidated and system reset to Pending.");
                    navigate(-1);
                }
            } catch (err) {
                console.error("Error invalidating:", err);
                alert("Failed to invalidate bill.");
                setLoading(false);
            }
        }
    };

    const fetchJobDetails = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `${process.env.REACT_APP_API_STRING}/get-job/${branch_code}/${trade_type}/${mode}/${year}/${job_no}`
            );
            const job = response.data;
            setJobData(job);
            
            // Fetch suggested next available number
            try {
                const suggestRes = await axios.get(`${process.env.REACT_APP_API_STRING}/billing/next-suggested/GIA/${job._id}`);
                if (suggestRes.data.success) {
                    setSuggestedNo(suggestRes.data.suggestedNo);
                }
            } catch (e) {
                console.error("Error fetching suggestion", e);
            }

            const isCompleted = job.status?.toUpperCase() === "COMPLETED";
            const isAdmin = user?.role === "Admin";
            setIsReadOnly(isCompleted && !isAdmin);

            // Fetch Charge Heads for adding
            try {
                const chargeHeadsRes = await axios.get(`${process.env.REACT_APP_API_STRING}/charge-heads`);
                if (chargeHeadsRes.data.success) {
                    setChargeHeadsMaster(chargeHeadsRes.data.data || []);
                }
            } catch (e) {
                console.error("Error fetching charge heads", e);
            }

            // Default static rows (Profit charges)
            const defaultChargeNames = [
                "DOCUMENTATION CHARGES", 
                "EXAMINATION CHARGES",
                "IMPORT AGENCY CHARGES"
            ];
            let rows = defaultChargeNames.map(name => ({
                id: `default-${name}`,
                description: name,
                sac: "996713",
                receipt_no: "",
                receipt_date: "",
                receipt_amt: "",
                taxType: "T",
                nonGst: "",
                taxable: 0,
                cgstPercent: 9,
                sgstPercent: 9
            }));
            
            const profitNames = defaultChargeNames.map(n => n.toUpperCase());

            // Pull Agency/Margin charges from job records
            const agencyCharges = (job.charges || []).filter(ch => {
                const categoryMatch = (ch.category || "").trim().toLowerCase() === "margin";
                const amtVal = parseFloat(ch.revenue?.amountINR || ch.revenue?.basicAmount || 0);
                const desc = (ch.charge_name || ch.chargeHead || "").trim().toUpperCase();
                
                // Skip if it's already a profit/default charge handled above to avoid duplicates
                const isProfitCharge = profitNames.includes(desc);
                
                return categoryMatch && Math.abs(amtVal) > 0.001 && !isProfitCharge;
            });

            // Integrated job charges into rows individually (No Clubbing)
            agencyCharges.forEach(ch => {
                const baseDesc = (ch.charge_name || ch.chargeHead || "").trim().toUpperCase();
                const chargeDescStr = (ch.revenue?.chargeDescription || ch.charge_description || "").trim();
                const desc = chargeDescStr ? `${baseDesc}\n(${chargeDescStr})` : baseDesc;
                // Mandatory basic values for Agency Bill
                let amount = Math.round(parseFloat(ch.revenue?.basicAmount || 0));
                
                // If basicAmount is missing, calculate it from total (Total / 1.18)
                if (!amount || isNaN(amount)) {
                    const totalAmt = parseFloat(ch.revenue?.amountINR || 0);
                    amount = Math.round(totalAmt / 1.18);
                }
                
                const invNoRaw = (ch.invoice_number || "").trim();
                const invNo = invNoRaw === "-" ? "" : invNoRaw;
                const invDate = invNo ? formatDate(ch.invoice_date) : "";
                const invAmtVal = parseFloat(ch.revenue?.basicAmount || ch.revenue?.amountINR || 0);
                const invAmtStr = invNo ? formatCurrency(invAmtVal) : "";
                
                // Add as a new individual row instead of clubbing
                rows.push({
                    id: ch._id || Math.random().toString(),
                    description: desc || "Unnamed Charge",
                    sac: ch.sacHsn || "996713",
                    receipt_no: invNo,
                    receipt_date: invDate,
                    receipt_amt: invAmtStr,
                    taxType: "T",
                    nonGst: "",
                    taxable: amount,
                    // Always force 9%/9% for Agency Bill as per USER request
                    cgstPercent: 9,
                    sgstPercent: 9
                });
            });

            setInvoiceRows(rows);

            const firstInv = (job.invoice_details && job.invoice_details[0]) || {};

            // Initialize editable fields with job data
            let initialFields = {
                beHeading: job.item_description || job.description || "",
                shipperName: job.supplier_exporter || "",
                customerRef: job.po_no || "",
                cifValue: firstInv.total_inv_value || "",
                termsOfInvoice: firstInv.toi || "CIF",
                invoiceNo: (job.bill_no || "").split(",")[0] || "",
                invoiceDate: (job.bill_date || "").split(",")[1] ? formatDate((job.bill_date || "").split(",")[0]) : formatDate(new Date()),
                dueDate: formatDate(new Date(new Date().setDate(new Date().getDate() + 15))),
                placeOfSupply: `[${job.importer_address?.state || "24"}] ${job.importer_address?.state || "Gujarat"}`,
                importerAddress: job.importer_address?.details || "",
                panNo: job.pan_no || job.importer_pan || "",
                gstin: job.gst_no || job.importer_gstin || "",
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
                const savedBillRes = await axios.get(`${process.env.REACT_APP_API_STRING}/billing/${job._id}/GIA`);
                if (savedBillRes.data.success && savedBillRes.data.data) {
                    const saved = savedBillRes.data.data;
                    const isInvoiceGenerated = saved.billNo || (saved.editableFields && saved.editableFields.invoiceNo);
                    
                    if (isInvoiceGenerated) {
                        setInvoiceRows(saved.rows || []);
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
                        setIsReadOnly(job.status?.toUpperCase() === "COMPLETED" && !isAdmin);
                        setLoading(false);
                        return;
                    }

                    let existingRows = [...(saved.rows || [])];
                    
                    // ALWAYS KEEP DEFAULT THREE CHARGES
                    const defaultNames = ["DOCUMENTATION CHARGES", "EXAMINATION CHARGES", "IMPORT AGENCY CHARGES"];
                    defaultNames.forEach(name => {
                        const isPresent = existingRows.some(r => r.description.toUpperCase() === name);
                        if (!isPresent) {
                            existingRows.push({
                                id: `default-${name}-${Math.random()}`,
                                description: name,
                                sac: "996713",
                                receipt_no: "",
                                receipt_date: "",
                                receipt_amt: "",
                                taxType: "T",
                                nonGst: "",
                                taxable: 0,
                                cgstPercent: 9,
                                sgstPercent: 9
                            });
                        }
                    });

                    // AUTO-SYNC NEW & UPDATED CHARGES WITH SAFE CLUBBING
                    const allExistingIds = existingRows.map(r => r.id);
                    const allExistingReceipts = existingRows.map(r => (r.receipt_no || "").split("\n")).flat().map(s => s.trim().toUpperCase()).filter(Boolean);

                    // Group incoming agencyCharges by description to combine them
                    const groupedIncoming = {};
                    agencyCharges.forEach(ch => {
                        if (!ch._id) return;
                        const baseDesc = (ch.charge_name || ch.chargeHead || "").trim().toUpperCase();
                        const chargeDescStr = (ch.revenue?.chargeDescription || ch.charge_description || "").trim();
                        const desc = chargeDescStr ? `${baseDesc}\n(${chargeDescStr})` : baseDesc;
                        if (!groupedIncoming[desc]) groupedIncoming[desc] = { ids: [], taxable: 0, receipts: [], date: "" };
                        
                        let amount = Math.round(parseFloat(ch.revenue?.basicAmount || 0));
                        if (!amount || isNaN(amount)) {
                            amount = Math.round(parseFloat(ch.revenue?.amountINR || 0) / 1.18);
                        }
                        
                        // Split multiline invoice numbers to ensure uniqueness
                        const invNoRaw = (ch.invoice_number || "").trim().toUpperCase();
                        const individualNos = invNoRaw.split(/\r?\n/).map(s => s.trim()).filter(s => s && s !== "-");
                        
                        const invDate = (invNoRaw && invNoRaw !== "-") ? formatDate(ch.invoice_date) : "";
                        const invAmtVal = parseFloat(ch.revenue?.basicAmount || ch.revenue?.amountINR || 0);
                        
                        groupedIncoming[desc].ids.push(ch._id.toString());
                        groupedIncoming[desc].taxable += amount;
                        // Sum the total receipt amount for the combined row
                        groupedIncoming[desc].receiptTotal = (groupedIncoming[desc].receiptTotal || 0) + invAmtVal;
                        
                        individualNos.forEach(no => {
                            if (!groupedIncoming[desc].receipts.includes(no)) {
                                groupedIncoming[desc].receipts.push(no);
                            }
                        });
                        
                        if (!groupedIncoming[desc].date && invDate) groupedIncoming[desc].date = invDate;
                    });

                    // Sync the grouped charges into existingRows
                    Object.entries(groupedIncoming).forEach(([desc, data]) => {
                        // Priority 1: Find a row that already matches one of these IDs
                        let existingIdx = existingRows.findIndex(r => data.ids.includes(r.id));
                        
                        // Priority 2: If not found by ID, find by Description (for default rows)
                        if (existingIdx === -1) {
                            existingIdx = existingRows.findIndex(r => r.description.toUpperCase() === desc);
                        }

                        if (existingIdx !== -1) {
                            // Update existing row
                            existingRows[existingIdx].description = desc;
                            existingRows[existingIdx].taxable = data.taxable;
                            existingRows[existingIdx].receipt_no = data.receipts.join("\n");
                            existingRows[existingIdx].receipt_date = data.date;
                            existingRows[existingIdx].receipt_amt = formatCurrency(data.receiptTotal); // Set the combined receipt amount
                            existingRows[existingIdx].sourceIds = data.ids; 
                        } else {
                            // Add new combined row
                            existingRows.push({
                                id: data.ids[0],
                                sourceIds: data.ids,
                                description: desc,
                                sac: "996713",
                                receipt_no: data.receipts.join("\n"),
                                receipt_date: data.date,
                                receipt_amt: formatCurrency(data.receiptTotal), // Set the combined receipt amount
                                taxType: "T",
                                taxable: data.taxable,
                                cgstPercent: 9,
                                sgstPercent: 9
                            });
                        }
                    });

                    const roundedRows = existingRows.map(r => ({
                        ...r,
                        taxable: r.taxable === "" ? "" : Math.round(parseFloat(r.taxable) || 0),
                        nonGst: r.nonGst === "" ? "" : Math.round(parseFloat(r.nonGst) || 0)
                    }));
                    
                    setInvoiceRows(roundedRows); 
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

                    setIsReadOnly(job.status?.toUpperCase() === "COMPLETED" && !isAdmin);
                    setLoading(false);
                    return; // Stop here after merging
                }
            } catch (e) {
                console.log("No saved bill found, using defaults", e);
            }

            setEditableFields(initialFields);

            setIsReadOnly(isCompleted && !isAdmin);
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

    const handleSave = async (manual = false) => {
        if (!jobData?._id || isReadOnly) return;
        
        try {
            setSaveStatus('saving');
            // Calculate totals for saving
            let totalTaxable = 0;
            let totalCgst = 0;
            let totalSgst = 0;
            invoiceRows.forEach(r => {
                const amt = Math.round(parseFloat(r.taxable) || 0);
                const cgstP = parseFloat(r.cgstPercent) || 0;
                const sgstP = parseFloat(r.sgstPercent) || 0;
                totalTaxable += amt;
                totalCgst += (amt * cgstP / 100);
                totalSgst += (amt * sgstP / 100);
            });
            const rawFinalTotal = totalTaxable + totalCgst + totalSgst;
            const roundedFinalTotal = Math.round(rawFinalTotal);
            const roundOff = roundedFinalTotal - rawFinalTotal;

            const res = await axios.post(`${process.env.REACT_APP_API_STRING}/billing/save`, {
                jobId: jobData._id,
                type: 'GIA',
                billNo: editableFields.invoiceNo,
                rows: invoiceRows,
                editableFields,
                totals: {
                    totalTaxable,
                    totalCgst,
                    totalSgst,
                    roundOff,
                    finalTotal: roundedFinalTotal
                },
                firstName: user?.first_name,
                lastName: user?.last_name
            });

            if (res.data.success) {
                // Sync backend rows (IDs) back to frontend state
                if (res.data.data?.rows) {
                    setInvoiceRows(res.data.data.rows);
                }
                
                // Update audit log if missing
                if (!generationLog && res.data.data?.generatedAt) {
                    setGenerationLog({
                        firstName: res.data.data.generatedByFirstName,
                        lastName: res.data.data.generatedByLastName,
                        at: res.data.data.generatedAt
                    });
                }
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 3000);
            } else {
                setSaveStatus('error');
            }
        } catch (err) {
            console.error("Save error:", err);
            setSaveStatus('error');
            if (manual) alert("Error saving bill: " + err.message);
        }
    };

    // Autosave removed as per request

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "-";
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/ /g, '-');
    };

    const handleRowChange = (index, field, value) => {
        const newRows = [...invoiceRows];
        if (field === 'taxable' || field === 'nonGst') {
            // Round to whole number for basic amounts
            newRows[index][field] = value === "" ? "" : Math.round(parseFloat(value) || 0);
        } else if (field === 'receipt_no' || field === 'receipt_date' || field === 'receipt_amt') {
            newRows[index][field] = value;
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
            sac: "996713",
            receipt_no: "",
            receipt_date: "",
            receipt_amt: "",
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
                sac: ch.sacHsn || "996713",
                receipt_no: "",
                receipt_date: "",
                receipt_amt: "",
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

    const handleCombineDuplicates = () => {
        const combined = [];
        let combinedCount = 0;

        invoiceRows.forEach(row => {
            if (!row.description) {
                combined.push({ ...row });
                return;
            }
            const heading = row.description.split("\n")[0].trim().toUpperCase();
            
            const existing = combined.find(r => 
                r.description && 
                r.description.split("\n")[0].trim().toUpperCase() === heading && 
                r.sac === row.sac && 
                r.taxType === row.taxType && 
                r.cgstPercent === row.cgstPercent && 
                r.sgstPercent === row.sgstPercent
            );
            
            if (existing) {
                combinedCount++;
                existing.taxable = (parseFloat(existing.taxable) || 0) + (parseFloat(row.taxable) || 0);

                if (!existing.sourceIds) {
                    existing.sourceIds = [existing.id];
                }
                if (row.sourceIds) {
                    existing.sourceIds.push(...row.sourceIds);
                } else if (row.id) {
                    existing.sourceIds.push(row.id);
                }

                
                const existingDescs = existing.description.split("\n").map(s => s.trim()).filter(Boolean);
                const newDescs = row.description.split("\n").map(s => s.trim()).filter(Boolean);
                
                newDescs.forEach(nd => {
                    if (!existingDescs.includes(nd)) {
                        existingDescs.push(nd);
                    }
                });
                existing.description = existingDescs.join("\n");
                
                const existingReceipts = (existing.receipt_no || "").toString().split("\n").map(s => s.trim()).filter(Boolean);
                const newReceipts = (row.receipt_no || "").toString().split("\n").map(s => s.trim()).filter(Boolean);
                
                const existingDates = (existing.receipt_date || "").toString().split("\n").map(s => s.trim()).filter(Boolean);
                const newDates = (row.receipt_date || "").toString().split("\n").map(s => s.trim()).filter(Boolean);
                
                const existingAmts = (existing.receipt_amt || "").toString().split("\n").map(s => s.trim()).filter(Boolean);
                const newAmts = (row.receipt_amt || "").toString().split("\n").map(s => s.trim()).filter(Boolean);

                newReceipts.forEach((nr, idx) => {
                    if (!existingReceipts.includes(nr)) {
                        existingReceipts.push(nr);
                        existingDates.push(newDates[idx] || "");
                        existingAmts.push(newAmts[idx] || "");
                    }
                });

                existing.receipt_no = existingReceipts.join("\n");
                existing.receipt_date = existingDates.join("\n");
                existing.receipt_amt = existingAmts.join("\n");
            } else {
                combined.push({ ...row });
            }
        });

        if (combinedCount > 0) {
            if (window.confirm(`Found ${combinedCount} duplicate row(s) with identical headings. Do you want to combine them?`)) {
                setPreCombineRows([...invoiceRows]);
                setInvoiceRows(combined);
            }
        } else {
            alert("No duplicate headings found to combine.");
        }
    };

    const handleUndoCombine = () => {
        if (preCombineRows) {
            setInvoiceRows(preCombineRows);
            setPreCombineRows(null);
        }
    };



    if (loading) return <div className="loading" style={{ margin: '20px' }}>Loading Tax Invoice...</div>;
    if (error) return <div className="error" style={{ margin: '20px' }}>{error}</div>;
    if (!jobData) return <div className="error" style={{ margin: '20px' }}>No job data found.</div>;

    // Totals logic
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;

    invoiceRows.forEach(r => {
        const amt = Math.round(parseFloat(r.taxable) || 0);
        const cgstP = parseFloat(r.cgstPercent) || 0;
        const sgstP = parseFloat(r.sgstPercent) || 0;
        totalTaxable += amt;
        totalCgst += (amt * cgstP / 100);
        totalSgst += (amt * sgstP / 100);
    });

    const totalGst = totalCgst + totalSgst;
    const rawFinalTotal = totalTaxable + totalGst;
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

    return (
        <div className="abi-main-wrapper" style={{ minHeight: '100vh', background: '#e0e0e0', paddingBottom: '40px' }}>
            {/* Action Bar (Top Level, No Zoom) */}
            <div className="no-print abi-action-bar" style={{ padding: '10px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap', background: '#333', color: '#fff', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                <button onClick={() => navigate(-1)} style={{ padding: '6px 12px', cursor: 'pointer', background: '#eee', border: 'none', borderRadius: '4px' }}>Back</button>
                <button onClick={() => addChargeRow()} disabled={isReadOnly} style={{ padding: '6px 12px', cursor: isReadOnly ? 'not-allowed' : 'pointer', background: isReadOnly ? '#ccc' : '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}>+ Add Blank Row</button>
                <button className="bill-master-btn" onClick={() => setIsMasterModalOpen(true)} disabled={isReadOnly} style={{ cursor: isReadOnly ? 'not-allowed' : 'pointer', opacity: isReadOnly ? 0.6 : 1 }}>+ Add Charge from Master</button>
                <button className="bill-master-btn" onClick={() => handleSave(true)} disabled={isReadOnly || saveStatus === 'saving'} style={{ backgroundColor: '#28a745', opacity: isReadOnly ? 0.6 : 1 }}>
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Bill'}
                </button>
                <button className="bill-master-btn" onClick={handlePrint} style={{ backgroundColor: '#1976d2' }}>Print Bill</button>
                {preCombineRows ? (
                    <button className="bill-generate-btn" onClick={handleUndoCombine} disabled={isReadOnly} style={{ padding: '6px 12px', cursor: isReadOnly ? 'not-allowed' : 'pointer', background: isReadOnly ? '#ccc' : '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>↩️ Undo Combine</button>
                ) : (
                    <button className="bill-generate-btn" onClick={handleCombineDuplicates} disabled={isReadOnly} style={{ padding: '6px 12px', cursor: isReadOnly ? 'not-allowed' : 'pointer', background: isReadOnly ? '#ccc' : '#f0ad4e', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>🪄 Combine Duplicates</button>
                )}
                {!editableFields.invoiceNo && (
                    <button className="bill-generate-btn" onClick={() => handleGenerateInvoice('GIA')} disabled={isReadOnly} style={{ padding: '6px 12px', cursor: isReadOnly ? 'not-allowed' : 'pointer', background: isReadOnly ? '#ccc' : '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>⚡ Generate Invoice No</button>
                )}
                {isAdmin && editableFields.invoiceNo && (
                    <button onClick={handleInvalidate} style={{ padding: '6px 12px', cursor: 'pointer', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Invalidate Bill</button>
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

                {/* Unified Master Job Info Grid */}
                <div className="abi-master-grid">
                    {/* Left Side: 55% */}
                    <div className="abi-grid-col abi-grid-left">
                        <div className="abi-grid-row abi-row-span-2" style={{ alignItems: 'flex-start', paddingTop: '4px' }}>
                            <div className="abi-lbl" style={{ minWidth: '60px' }}>Customer</div><div className="abi-sep">:</div>
                            <div className="abi-val">
                                <strong style={{ fontSize: '11px', textTransform: 'uppercase' }}>{jobData.importer || ""}</strong>
                                <div style={{ marginTop: '2px', lineHeight: '1.2' }}>
                                    <textarea readOnly={isReadOnly} className="abi-input" style={{ height: '35px', background: '#e9ffe9' }} value={editableFields.importerAddress} onChange={(e) => handleFieldChange("importerAddress", e.target.value)} />
                                    <div style={{ display: 'flex', marginTop: '4px', alignItems: 'center' }}>
                                        <div style={{ minWidth: '55px', fontWeight: 'bold' }}>PAN No</div>
                                        <div style={{ padding: '0 5px', fontWeight: 'bold' }}>:</div>
                                        <div style={{ flex: 1 }}>
                                            <input readOnly={isReadOnly} className="abi-input" style={{ width: '100%', background: '#e9ffe9', fontWeight: 'bold' }} value={editableFields.panNo} onChange={e => handleFieldChange('panNo', e.target.value)} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', marginTop: '2px', alignItems: 'center' }}>
                                        <div style={{ minWidth: '55px', fontWeight: 'bold' }}>GSTIN</div>
                                        <div style={{ padding: '0 5px', fontWeight: 'bold' }}>:</div>
                                        <div style={{ flex: 1 }}>
                                            <input readOnly={isReadOnly} className="abi-input" style={{ width: '100%', background: isReadOnly ? '#f5f5f5' : '#e9ffe9', fontWeight: 'bold' }} value={editableFields.gstin} onChange={e => handleFieldChange('gstin', e.target.value)} />
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

                        <div className="abi-grid-row"><div className="abi-lbl">{mode === 'AIR' ? 'Flight' : 'Vessel'}</div><div className="abi-sep">:</div><div className="abi-val">{jobData.vessel_flight || ""}</div></div>
                        <div className="abi-grid-row"><div className="abi-lbl">{mode === 'AIR' ? 'Flight No' : 'Voyage'}</div><div className="abi-sep">:</div><div className="abi-val">{jobData.voyage_no || ""}</div></div>

                        <div className="abi-grid-row abi-row-span-2"><div className="abi-lbl">Origin Port</div><div className="abi-sep">:</div><div className="abi-val">{jobData.loading_port || ""}</div></div>
                    </div>

                    {/* Right Side: 45% */}
                    <div className="abi-grid-col abi-grid-right">
                        {/* Top Row: Invoice Meta */}
                        <div className="abi-grid-row abi-row-span-2" style={{ padding: 0, display: 'grid' }}>
                            <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '1.5px 4px' }}>
                                <div className="abi-lbl" style={{ minWidth: '95px', fontSize: '11px' }}>Invoice No.</div>
                                <div className="abi-sep">:</div>
                                <div className="abi-val">
                                    <input className="abi-input highlight-field" style={{ fontWeight: '900', fontSize: '13.5px', color: '#000' }} value={editableFields.invoiceNo} onChange={e => handleFieldChange('invoiceNo', e.target.value)} />
                                    {suggestedNo && !editableFields.invoiceNo && (
                                        <div className="no-print" style={{ fontSize: '9px', color: '#dc3545', cursor: 'pointer', marginTop: '2px', fontWeight: 'bold' }} onClick={() => handleFieldChange('invoiceNo', suggestedNo)}>
                                            Suggested: {suggestedNo} (Click to use)
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '1.5px 4px' }}>
                                <div className="abi-lbl" style={{ minWidth: '95px' }}>Invoice Date</div>
                                <div className="abi-sep">:</div>
                                <div className="abi-val"><input readOnly={isReadOnly} className="abi-input" value={editableFields.invoiceDate} onChange={e => handleFieldChange('invoiceDate', e.target.value)} /></div>
                            </div>
                            <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '1.5px 4px' }}>
                                <div className="abi-lbl" style={{ minWidth: '95px' }}>Due Date</div>
                                <div className="abi-sep">:</div>
                                <div className="abi-val"><input readOnly={isReadOnly} className="abi-input" value={editableFields.dueDate} onChange={e => handleFieldChange('dueDate', e.target.value)} /></div>
                            </div>
                            <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '1.5px 4px' }}>
                                <div className="abi-lbl" style={{ minWidth: '95px' }}>Place of Supply</div>
                                <div className="abi-sep">:</div>
                                <div className="abi-val"><input readOnly={isReadOnly} className="abi-input" value={editableFields.placeOfSupply} onChange={e => handleFieldChange('placeOfSupply', e.target.value)} /></div>
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

                        <div className="abi-grid-row abi-row-span-2">
                            <div className="abi-lbl" style={{ minWidth: '95px' }}>Customer Ref.</div><div className="abi-sep">:</div>
                            <div className="abi-val"><input className="abi-input" value={editableFields.customerRef} onChange={e => handleFieldChange('customerRef', e.target.value)} /></div>
                        </div>

                        <div className="abi-grid-row abi-row-span-2">
                            <div className="abi-lbl" style={{ minWidth: '95px' }}>Invoice Number</div><div className="abi-sep">:</div>
                            <div style={{ marginRight: '20px' }}>{jobData.invoice_details?.[0]?.invoice_number || ""}</div>
                            <div className="abi-lbl" style={{ minWidth: 'auto', marginRight: '5px' }}>Date</div><div className="abi-sep">:</div>
                            <div className="abi-val">{formatDate(jobData.invoice_details?.[0]?.invoice_date)}</div>
                        </div>

                        <div className="abi-grid-row abi-row-span-2">
                            <div className="abi-lbl" style={{ minWidth: '95px' }}>Terms of Invoice</div><div className="abi-sep">:</div>
                            <div className="abi-val"><input className="abi-input" value={editableFields.termsOfInvoice} onChange={e => handleFieldChange('termsOfInvoice', e.target.value)} /></div>
                        </div>

                        <div className="abi-grid-row abi-row-span-2">
                            <div className="abi-lbl" style={{ minWidth: '95px' }}>Invoice Value</div><div className="abi-sep">:</div>
                            <div style={{ marginRight: '20px', whiteSpace: 'nowrap' }}>{jobData.invoice_details?.[0]?.total_inv_value || "0"} {jobData.invoice_details?.[0]?.inv_currency || ""}</div>
                            <div className="abi-lbl" style={{ minWidth: 'auto', marginRight: '5px' }}>CIF Value</div><div className="abi-sep">:</div>
                            <div className="abi-val" style={{ whiteSpace: 'nowrap' }}><input className="abi-input" value={editableFields.cifValue} onChange={e => handleFieldChange('cifValue', e.target.value)} /></div>
                        </div>

                        <div className="abi-grid-row abi-row-span-2">
                            <div className="abi-lbl" style={{ minWidth: '95px' }}>Assess Value</div><div className="abi-sep">:</div>
                            <div className="abi-val">{jobData.assessable_ammount || "0"} INR</div>
                        </div>
                        <div className="abi-grid-row abi-row-span-2">
                            <div className="abi-lbl" style={{ minWidth: '95px' }}>Total Duty</div><div className="abi-sep">:</div>
                            <div className="abi-val">{jobData.total_duty || "0"} INR</div>
                        </div>

                        <div className="abi-grid-row abi-row-span-2">
                            <div className="abi-lbl" style={{ minWidth: '95px' }}>Shipper Name</div><div className="abi-sep">:</div>
                            <div className="abi-val"><input className="abi-input" value={editableFields.shipperName} onChange={e => handleFieldChange('shipperName', e.target.value)} /></div>
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
                        {mode !== 'AIR' && (
                            <div className="abi-grid-row abi-row-span-2">
                                <div className="abi-lbl">No. of Containers</div><div className="abi-sep">:</div>
                                <div className="abi-val">{getContainerCountSummary()}</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="abi-full-box">
                    <div className="abi-full-row">
                        <div className="abi-full-lbl">Importer Name</div>
                        <div>: {jobData.importer || ""}</div>
                    </div>
                    {mode !== 'AIR' && (
                        <div className="abi-full-row">
                            <div className="abi-full-lbl">Containers</div>
                            <div>: {getContainerString()}</div>
                        </div>
                    )}
                </div>

                <table className="abi-table">
                    <thead>
                        <tr>
                            <th rowSpan="2" style={{ width: '3%' }}>Sr No</th>
                            <th rowSpan="2" style={{ width: '22%', textAlign: 'center' }}>Description</th>
                            <th rowSpan="2" style={{ width: '7.5%' }}>SAC/HSN code</th>
                            <th colSpan="3" style={{ width: '24%', textAlign: 'center', borderBottom: '1px solid #000', padding: '3px' }}>Receipt Details</th>
                            <th rowSpan="2" style={{ width: '4%' }}>Tax Type</th>
                            <th rowSpan="2" style={{ width: '7%' }}>Non GST Exempt Value (INR)</th>
                            <th rowSpan="2" style={{ width: '8.5%' }}>Taxable Value (INR)</th>
                            <th colSpan="2" style={{ width: '8%', padding: '3px', borderBottom: '1px solid #000' }}>CGST</th>
                            <th colSpan="2" style={{ width: '8%', padding: '3px', borderBottom: '1px solid #000' }}>SGST</th>
                            <th rowSpan="2" style={{ width: '10%' }}>Total (INR)</th>
                        </tr>
                        <tr>
                            <th style={{ width: '8%', borderRight: '1px solid #000', padding: '3px' }}>Inv No</th>
                            <th style={{ width: '8%', borderRight: '1px solid #000', padding: '3px' }}>Date</th>
                            <th style={{ width: '8%', borderRight: '1px solid #000', padding: '3px' }}>Amount</th>
                            <th style={{ width: '3.5%', borderRight: '1px solid #000', padding: '3px' }}>%</th>
                            <th style={{ width: '4.5%', borderRight: '1px solid #000', padding: '3px' }}>Tax</th>
                            <th style={{ width: '3.5%', borderRight: '1px solid #000', padding: '3px' }}>%</th>
                            <th style={{ width: '4.5%', padding: '3px' }}>Tax</th>
                        </tr>
                    </thead>
                    <Reorder.Group axis="y" values={invoiceRows} onReorder={setInvoiceRows} as="tbody">
                        {invoiceRows.map((r, idx) => {
                            const amt = Math.round(parseFloat(r.taxable) || 0);
                            const cP = parseFloat(r.cgstPercent) || 0;
                            const sP = parseFloat(r.sgstPercent) || 0;
                            const cTax = amt * (cP / 100);
                            const sTax = amt * (sP / 100);
                            const rowTotal = amt + cTax + sTax;

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
                                            <button className="no-print" onClick={() => !isReadOnly && deleteRow(idx)} disabled={isReadOnly} style={{ background: 'none', border: 'none', color: isReadOnly ? '#ccc' : 'red', cursor: isReadOnly ? 'not-allowed' : 'pointer', padding: 0, fontSize: '12px', marginLeft: '4px' }}>x</button>
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
                                    <td style={{ textAlign: 'center' }}><input readOnly={isReadOnly} className="abi-input" style={{ textAlign: 'center' }} value={r.sac} onChange={e => handleRowChange(idx, 'sac', e.target.value)} /></td>
                                    <td style={{ verticalAlign: 'middle', padding: '0 4px', borderRight: '1px solid #000' }}>
                                        <textarea
                                            className="abi-input"
                                            readOnly={isReadOnly}
                                            style={{ height: 'auto', minHeight: '18px', resize: 'none', overflow: 'hidden', width: '100%', padding: '2px 0', textAlign: 'left' }}
                                            rows={1}
                                            value={r.receipt_no}
                                            onChange={e => handleRowChange(idx, 'receipt_no', e.target.value)}
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
                                    <td style={{ verticalAlign: 'middle', padding: '0 4px', borderRight: '1px solid #000' }}>
                                        <textarea
                                            className="abi-input"
                                            readOnly={isReadOnly}
                                            style={{ height: 'auto', minHeight: '18px', resize: 'none', overflow: 'hidden', width: '100%', padding: '2px 0', textAlign: 'left' }}
                                            rows={1}
                                            value={r.receipt_date}
                                            onChange={e => handleRowChange(idx, 'receipt_date', e.target.value)}
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
                                    <td style={{ verticalAlign: 'middle', padding: '0 4px', borderRight: '1px solid #000' }}>
                                        <textarea
                                            className="abi-input"
                                            readOnly={true}
                                            style={{ height: 'auto', minHeight: '18px', resize: 'none', overflow: 'hidden', width: '100%', padding: '2px 0', textAlign: 'right', background: 'transparent' }}
                                            rows={1}
                                            value={r.receipt_amt}
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
                                    <td style={{ textAlign: 'center' }}><input readOnly={isReadOnly} className="abi-input" style={{ textAlign: 'center' }} value={r.taxType} onChange={e => handleRowChange(idx, 'taxType', e.target.value)} /></td>
                                    <td style={{ textAlign: 'right' }}><input readOnly={isReadOnly} className="abi-input" style={{ textAlign: 'right' }} value={r.nonGst} onChange={e => handleRowChange(idx, 'nonGst', e.target.value)} /></td>
                                    <td style={{ textAlign: 'right' }}><input type="number" readOnly={isReadOnly} className="abi-input" style={{ textAlign: 'right' }} value={r.taxable} onChange={e => handleRowChange(idx, 'taxable', e.target.value)} /></td>
                                    <td style={{ padding: '4px', borderRight: '1px solid #000' }}>
                                        <input readOnly={isReadOnly} className="abi-input" style={{ textAlign: 'right', width: '100%' }} value={r.cgstPercent} onChange={e => handleRowChange(idx, 'cgstPercent', e.target.value)} />
                                    </td>
                                    <td style={{ padding: '4px', textAlign: 'right' }}>
                                        {cTax ? formatCurrency(cTax) : ''}
                                    </td>
                                    <td style={{ padding: '4px', borderRight: '1px solid #000' }}>
                                        <input readOnly={isReadOnly} className="abi-input" style={{ textAlign: 'right', width: '100%' }} value={r.sgstPercent} onChange={e => handleRowChange(idx, 'sgstPercent', e.target.value)} />
                                    </td>
                                    <td style={{ padding: '4px', textAlign: 'right' }}>
                                        {sTax ? formatCurrency(sTax) : ''}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>{rowTotal ? formatCurrency(rowTotal) : ''}</td>
                                </Reorder.Item>
                            )
                        })}
                        {/* Padding Row to stretch like image */}
                        <tr>
                            <td style={{ height: '100px', borderBottom: 'none' }}></td>
                            <td style={{ borderBottom: 'none' }}></td>
                            <td style={{ borderBottom: 'none' }}></td>
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
                            <td colSpan="8" style={{ textAlign: 'right', padding: '4px 8px' }}>Sub Total</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(totalTaxable)}</td>
                            <td style={{ borderRight: '1px solid #000' }}></td>
                            <td style={{ textAlign: 'right', padding: '4px' }}>{formatCurrency(totalCgst)}</td>
                            <td style={{ borderRight: '1px solid #000' }}></td>
                            <td style={{ textAlign: 'right', padding: '4px' }}>{formatCurrency(totalSgst)}</td>
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
                            <div className="abi-tot-val">{formatCurrency(rawFinalTotal)}</div>
                        </div>
                        <div className="abi-tot-row">
                            <div className="abi-tot-lbl">Less : Advance Received</div>
                            <div className="abi-tot-cur">INR</div>
                            <div className="abi-tot-val">0.00</div>
                        </div>
                        <div className="abi-tot-row">
                            <div className="abi-tot-lbl">Round-Off</div>
                            <div className="abi-tot-cur">INR</div>
                            <div className="abi-tot-val">
                                <input 
                                    readOnly={true} 
                                    className="abi-input" 
                                    style={{ textAlign: 'right', width: '100%', background: 'transparent' }} 
                                    value={roundOff.toFixed(2)} 
                                />
                            </div>
                        </div>
                        <div className="abi-tot-row" style={{ height: '22px' }}>
                            <div className="abi-tot-lbl" style={{ fontSize: '10px' }}>Net Payable</div>
                            <div className="abi-tot-cur">INR</div>
                            <div className="abi-tot-val" style={{ fontSize: '10px' }}>{formatCurrency(roundedFinalTotal)}</div>
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
                    <strong>Net Payable In Words (INR)</strong> <span style={{ marginLeft: '10px', textTransform: 'capitalize' }}>{numberToWords(roundedFinalTotal).toLowerCase()}</span>
                </div>
                <div className="abi-text-row">
                    <strong>Remarks :</strong>
                </div>

                <div className="abi-signature-row">
                    <div className="abi-terms">
                        <strong>Terms & Conditions :</strong>
                        <ul style={{ margin: '3px 0 0 0', paddingLeft: '15px' }}>
                            <li style={{ paddingLeft: '10px' }}>In case of any discrepancy in the invoice, please bring the same to our attention within 7 days on receipt of invoice; else the same would be treated as correct.</li>
                            <li style={{ paddingLeft: '10px' }}>Delay in payment beyond the agreed credit period will attract interest @ 18% p.a.</li>
                            <li style={{ paddingLeft: '10px' }}>Government Taxes applied as per the prevailing rates.</li>
                            <li style={{ paddingLeft: '10px' }}>All disputes are subject to AHMEDABAD Jurisdiction.</li>
                            <li style={{ paddingLeft: '10px' }}>We are Register in MSME - Our UDYAM No : UDYAM-GJ-01-0010319 / Type of Enterprise : SERVICE</li>
                        </ul>
                    </div>
                    <div className="abi-sig-block">
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}>For SURAJ FORWARDERS PVT LTD</div>
                        <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px 0' }}>
                            <img src={signature} alt="Signature" style={{ maxHeight: '75px', mixBlendMode: 'multiply' }} />
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

                {generationLog && (
                    <div className="no-print" style={{ marginTop: '10px', fontSize: '9px', color: '#666', fontStyle: 'italic', borderTop: '1px solid #eee', paddingTop: '5px' }}>
                        * This invoice was generated by {generationLog.firstName} {generationLog.lastName} on {new Date(generationLog.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                )}
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
                                    .filter(ch => 
                                        ch.category === "Margin" &&
                                        ch.name.toLowerCase().includes(masterSearchTerm.toLowerCase())
                                    )
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
            {/* Floating Save Button */}
            <div 
                className="no-print" 
                style={{ 
                    position: 'fixed', 
                    bottom: '30px', 
                    right: '30px', 
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '10px'
                }}
            >
                {saveStatus !== 'idle' && (
                    <div style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        backgroundColor: saveStatus === 'error' ? '#fee2e2' : '#f0fdf4',
                        color: saveStatus === 'error' ? '#dc2626' : '#16a34a',
                        fontSize: '12px',
                        fontWeight: '600',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        border: `1px solid ${saveStatus === 'error' ? '#fecaca' : '#bbf7d0'}`,
                        animation: 'slideIn 0.3s ease'
                    }}>
                        {saveStatus === 'saving' ? 'Saving changes...' : 
                         saveStatus === 'saved' ? 'All changes saved' : 
                         'Error saving changes'}
                    </div>
                )}
                <button
                    onClick={() => handleSave(true)}
                    disabled={isReadOnly || saveStatus === 'saving'}
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: isReadOnly ? '#94a3b8' : '#2563eb',
                        color: 'white',
                        border: 'none',
                        cursor: (isReadOnly || saveStatus === 'saving') ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: saveStatus === 'saving' ? 'scale(0.95)' : 'scale(1)',
                        opacity: 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isReadOnly) {
                            e.currentTarget.style.transform = 'translateY(-5px) scale(1.05)';
                            e.currentTarget.style.boxShadow = '0 8px 30px rgba(37, 99, 235, 0.6)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isReadOnly) {
                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(37, 99, 235, 0.4)';
                        }
                    }}
                    title="Save Changes"
                >
                    {saveStatus === 'saving' ? (
                        <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="31.4" />
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
};

export default AgencyBillInvoice;
