import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './charges.css';

const MultiPurchaseBookModal = ({ isOpen, onClose, chargesData, jobNumber, jobDisplayNumber, jobYear, awbBlNo, awbBlDate, onSuccess }) => {
    const [loading, setLoading] = useState(false);

    // Aggregated form data (supplier-level fields + totals)
    const [formData, setFormData] = useState({
        "Entry No": '',
        "Entry Date": new Date().toISOString().split('T')[0],
        "Supplier Inv No": '',
        "Supplier Inv Date": '',
        "Job No": '',
        "Supplier Name": '',
        "Address 1": '',
        "Address 2": '',
        "Address 3": '',
        "State": '',
        "Country": '',
        "Pin Code": '',
        "Registration Type": 'Regular',
        "GSTIN No": '',
        "PAN": '',
        "CIN": '',
        "Place of Supply": '',
        "Credit Terms": '',
        "Description of Services": '',
        "Charge Heading": '',
        "SAC": '',
        "Taxable Value": '',
        "GST%": '',
        "CGST": '',
        "SGST": '',
        "IGST": '',
        "TDS": '',
        "Total": '',
        "Status": '',
        "chargeRef": '',
        "jobRef": '',
        "Charge Head Category": '',
        "TDS Category": '94C_1',
        "attachments": []
    });

    const [chargeItems, setChargeItems] = useState([]);

    useEffect(() => {
        const initialize = async () => {
            if (!isOpen || !chargesData || chargesData.length === 0) return;

            const firstCharge = chargesData[0];
            const party = firstCharge.partyDetails;
            const branchIndex = firstCharge.branchIndex || 0;
            const branch = party?.branches?.[branchIndex] || {};
            const jobNum = firstCharge.jobDisplayNumber || jobDisplayNumber || firstCharge.jobNumber || jobNumber || '';

            // Build charge items array
            const items = chargesData.map(c => {
                const isReimb = c.chargeHeadCategory?.toLowerCase() === 'reimbursement';
                const taxableVal = (c.basicAmount !== undefined && c.basicAmount !== null && c.basicAmount !== '')
                    ? parseFloat(c.basicAmount)
                    : ((c.amount !== undefined && c.amount !== null && c.amount !== '')
                        ? parseFloat(c.amount)
                        : parseFloat(c.rate || 0));

                const tdsVal = c.tdsAmount ? parseFloat(c.tdsAmount) : 0;
                const totalVal = isReimb
                    ? (taxableVal - tdsVal)
                    : ((c.netPayable !== undefined && c.netPayable !== null && c.netPayable !== '')
                        ? parseFloat(c.netPayable)
                        : (parseFloat(c.amount || 0) - tdsVal));

                const costAmt = parseFloat(c.amount || 0);
                const costGst = !isReimb ? Number((c.cgst || 0) + (c.sgst || 0) + (c.igst || 0)) : 0;

                const revAmt = Number(c.revenueAmount || c.revenueTotal || 0);
                const revBasic = Number(c.revenueBasicAmount || c.revenueAmount || 0);
                const revGst = Number(c.revenueGstAmount || 0);
                const revCgst = Number(c.revenueCgst || 0);
                const revSgst = Number(c.revenueSgst || 0);
                const revIgst = Number(c.revenueIgst || 0);
                const revTot = Number(c.revenueTotal || c.revenueAmount || 0);

                return {
                    chargeHead: c.chargeHead || c.name || '',
                    chargeDescription: c.chargeDescription || c.chargeHead || c.name || '',
                    chargeId: c.chargeId || '',
                    sac: c.cthNo || '',
                    chargeType: c.chargeHeadCategory || c.category || '',
                    category: c.category || '',
                    taxableValue: taxableVal,
                    basicAmount: taxableVal,
                    costAmount: costAmt,
                    costBasicAmount: taxableVal,
                    gstRate: !isReimb ? Number(c.gstRate || 0) : 0,
                    gstAmount: costGst,
                    costGstAmount: costGst,
                    cgst: !isReimb ? Number(c.cgst || 0) : 0,
                    sgst: !isReimb ? Number(c.sgst || 0) : 0,
                    igst: !isReimb ? Number(c.igst || 0) : 0,
                    costCgst: !isReimb ? Number(c.cgst || 0) : 0,
                    costSgst: !isReimb ? Number(c.sgst || 0) : 0,
                    costIgst: !isReimb ? Number(c.igst || 0) : 0,
                    tdsAmount: tdsVal,
                    costTdsAmount: tdsVal,
                    total: totalVal,
                    costTotal: totalVal,
                    netPayable: totalVal,
                    costNetPayable: totalVal,

                    // Individual Revenue details
                    revenueAmount: revAmt,
                    revenueBasicAmount: revBasic,
                    revenueGstAmount: revGst,
                    revenueGstRate: Number(c.revenueGstRate || 0),
                    revenueCgst: revCgst,
                    revenueSgst: revSgst,
                    revenueIgst: revIgst,
                    revenueTotal: revTot,

                    invoiceNumber: c.invoice_number || '',
                    invoiceDate: c.invoice_date || ''
                };
            });
            setChargeItems(items);

            // Aggregate totals
            let totalTaxable = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0, totalTDS = 0, totalAmount = 0;
            let totalRevAmount = 0, totalRevBasic = 0, totalRevGST = 0, totalRevCGST = 0, totalRevSGST = 0, totalRevIGST = 0, totalRevTotal = 0;

            items.forEach(item => {
                totalTaxable += item.taxableValue;
                totalCGST += item.cgst;
                totalSGST += item.sgst;
                totalIGST += item.igst;
                totalTDS += item.tdsAmount;
                totalAmount += item.total;

                totalRevAmount += item.revenueAmount;
                totalRevBasic += item.revenueBasicAmount;
                totalRevGST += item.revenueGstAmount;
                totalRevCGST += item.revenueCgst;
                totalRevSGST += item.revenueSgst;
                totalRevIGST += item.revenueIgst;
                totalRevTotal += item.revenueTotal;
            });

            // Fetch next sequence
            let finalEntryNo = `PB01/${jobNum}`;
            let updatedJobNum = jobNum;
            try {
                const API_KEY = "INTERNAL_TEAM_TALLY_KEY";
                const response = await axios.get(
                    `${process.env.REACT_APP_API_STRING}/tally/next-sequence`,
                    {
                        params: { type: 'purchase', jobNo: jobNum, year: jobYear, jobId: firstCharge.jobId },
                        headers: { 'x-api-key': API_KEY },
                        withCredentials: true
                    }
                );
                if (response.data.success) {
                    if (response.data.fullNo) finalEntryNo = response.data.fullNo;
                    if (response.data.jobNo) updatedJobNum = response.data.jobNo;
                }
            } catch (error) {
                console.error("Error fetching sequence:", error);
            }

            const invNumbers = [...new Set(items.map(i => i.invoiceNumber).filter(Boolean))];
            const commonInvNo = invNumbers[0] || awbBlNo || '';
            const invDates = [...new Set(items.map(i => i.invoiceDate).filter(Boolean))];
            const firstInvDate = invDates[0] || awbBlDate || '';

            const formatToISO = (dateStr) => {
                if (!dateStr) return '';
                if (dateStr.includes('-')) return dateStr;
                if (dateStr.includes('/')) {
                    const parts = dateStr.split('/');
                    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
                return dateStr;
            };

            const chargeHeadList = items.map(i => i.chargeHead).filter(Boolean).join(', ');

            setFormData(prev => ({
                ...prev,
                "Entry No": finalEntryNo,
                "Job No": updatedJobNum,
                "Supplier Inv No": commonInvNo,
                "Supplier Inv Date": formatToISO(firstInvDate),
                "Supplier Name": firstCharge.partyName || '',
                "Address 1": branch.address || '',
                "Address 2": branch.city || '',
                "Address 3": branch.state || branch.city || '',
                "State": branch.state || '',
                "Country": branch.country || '',
                "Pin Code": branch.pincode || branch.postal_code || '',
                "GSTIN No": branch.gst || '',
                "PAN": branch.pan || '',
                "CIN": party?.cin || '',
                "Credit Terms": party?.credit_terms || '',
                "Description of Services": `COMBINED PB - ${chargeHeadList}`,
                "SAC": items[0]?.sac || '',
                "Taxable Value": totalTaxable.toFixed(2),
                "GST%": '',
                "CGST": totalCGST > 0 ? totalCGST.toFixed(2) : '',
                "SGST": totalSGST > 0 ? totalSGST.toFixed(2) : '',
                "IGST": totalIGST > 0 ? totalIGST.toFixed(2) : '',
                "TDS": totalTDS > 0 ? totalTDS.toFixed(2) : '',
                "Total": totalAmount.toFixed(2),
                "Revenue Amount": totalRevAmount.toFixed(2),
                "Revenue Basic Amount": totalRevBasic.toFixed(2),
                "Revenue GST Amount": totalRevGST.toFixed(2),
                "Revenue CGST": totalRevCGST.toFixed(2),
                "Revenue SGST": totalRevSGST.toFixed(2),
                "Revenue IGST": totalRevIGST.toFixed(2),
                "Revenue Total": totalRevTotal.toFixed(2),
                revenueAmount: totalRevAmount,
                revenueBasicAmount: totalRevBasic,
                revenueGstAmount: totalRevGST,
                revenueCgst: totalRevCGST,
                revenueSgst: totalRevSGST,
                revenueIgst: totalRevIGST,
                revenueTotal: totalRevTotal,
                "Charge Head Category": firstCharge.chargeHeadCategory || '',
                "TDS Category": '94C_1',
                "chargeRef": chargesData.map(c => c.chargeId).filter(Boolean).join(','),
                "jobRef": firstCharge.jobId || ''
            }));
        };

        if (isOpen) initialize();
    }, [isOpen, chargesData, jobNumber, jobDisplayNumber, jobYear, awbBlNo, awbBlDate]);

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setLoading(true);
        try {
            const API_KEY = "INTERNAL_TEAM_TALLY_KEY";
            const updatedItems = chargeItems.map(item => ({
                ...item,
                invoiceNumber: formData["Supplier Inv No"] || item.invoiceNumber,
                invoiceDate: formData["Supplier Inv Date"] || item.invoiceDate
            }));
            const submissionData = {
                ...formData,
                isMultiCharge: true,
                chargeItems: updatedItems,
                chargeRefs: chargesData.map(c => c.chargeId).filter(Boolean)
            };

            const response = await axios.post(
                `${process.env.REACT_APP_API_STRING}/tally/purchase-entry`,
                submissionData,
                {
                    headers: { 'x-api-key': API_KEY },
                    withCredentials: true
                }
            );

            if (response.data.success) {
                alert("Combined Purchase Book Entry Submitted Successfully!");
                if (onSuccess) onSuccess(formData["Entry No"]);
                onClose();
            } else {
                alert("Failed to submit: " + (response.data.message || response.data.error));
            }
        } catch (error) {
            console.error("Submission Error:", error);
            alert("Error submitting Combined Purchase Book. Please check the logs.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="charge-modal-overlay active" style={{ zIndex: 1100 }}>
            <div className="edit-charge-modal" style={{ width: '1100px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto' }}>
                <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>COMBINED</span>
                    Purchase Book Entry — {chargeItems.length} Charges
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Charge Items Summary Table */}
                        <div style={{ marginBottom: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ background: '#1a237e', color: '#fff', padding: '8px 16px', fontWeight: 700, fontSize: '13px' }}>
                                Selected Charges Summary
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ background: '#f5f5f5' }}>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>#</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Charge Head</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Type</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>Cost Taxable</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>Revenue Amt</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>GST</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>TDS</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {chargeItems.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '6px 12px' }}>{idx + 1}</td>
                                            <td style={{ padding: '6px 12px', fontWeight: 600 }}>{item.chargeHead}</td>
                                            <td style={{ padding: '6px 12px' }}>
                                                <span style={{
                                                    background: item.chargeType?.toLowerCase() === 'reimbursement' ? '#fff3e0' : '#e3f2fd',
                                                    color: item.chargeType?.toLowerCase() === 'reimbursement' ? '#e65100' : '#1565c0',
                                                    padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600
                                                }}>
                                                    {item.chargeType || item.category || '—'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '6px 12px', textAlign: 'right' }}>₹{item.taxableValue.toFixed(2)}</td>
                                            <td style={{ padding: '6px 12px', textAlign: 'right', color: '#2e7d32', fontWeight: 600 }}>₹{item.revenueAmount.toFixed(2)}</td>
                                            <td style={{ padding: '6px 12px', textAlign: 'right' }}>₹{item.gstAmount.toFixed(2)}</td>
                                            <td style={{ padding: '6px 12px', textAlign: 'right' }}>₹{item.tdsAmount.toFixed(2)}</td>
                                            <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600 }}>₹{item.total.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ background: '#f5f5f5', fontWeight: 700 }}>
                                        <td colSpan="3" style={{ padding: '8px 12px', textAlign: 'right' }}>TOTALS</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{Number(formData["Taxable Value"] || 0).toFixed(2)}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#2e7d32' }}>₹{Number(formData["Revenue Amount"] || 0).toFixed(2)}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                            ₹{(Number(formData["CGST"] || 0) + Number(formData["SGST"] || 0) + Number(formData["IGST"] || 0)).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{formData["TDS"] || '0.00'}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#1565c0' }}>₹{formData["Total"]}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Form controls */}
                        <div className="ep-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 20px', marginRight: '30px' }}>
                            <div className="ep-row">
                                <span className="ep-label">Entry No</span>
                                <input type="text" name="Entry No" className="ep-desc-input" value={formData["Entry No"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Entry Date</span>
                                <input type="date" name="Entry Date" className="ep-desc-input" value={formData["Entry Date"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Supplier Inv No</span>
                                <input type="text" name="Supplier Inv No" className="ep-desc-input" value={formData["Supplier Inv No"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Supplier Inv Date</span>
                                <input type="date" name="Supplier Inv Date" className="ep-desc-input" value={formData["Supplier Inv Date"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Job No</span>
                                <input type="text" name="Job No" className="ep-desc-input" value={formData["Job No"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Supplier Name</span>
                                <input type="text" name="Supplier Name" className="ep-desc-input" value={formData["Supplier Name"]} readOnly style={{ background: '#f5f5f5' }} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Address 1</span>
                                <input type="text" name="Address 1" className="ep-desc-input" value={formData["Address 1"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">State</span>
                                <input type="text" name="State" className="ep-desc-input" value={formData["State"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">GSTIN No</span>
                                <input type="text" name="GSTIN No" className="ep-desc-input" value={formData["GSTIN No"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">PAN</span>
                                <input type="text" name="PAN" className="ep-desc-input" value={formData["PAN"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Description of Services</span>
                                <input type="text" name="Description of Services" className="ep-desc-input" value={formData["Description of Services"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Registration Type</span>
                                <select name="Registration Type" className="ep-select" value={formData["Registration Type"]} onChange={handleInputChange}>
                                    <option value="Regular">Regular</option>
                                    <option value="Composite">Composite</option>
                                    <option value="Exempt">Exempt</option>
                                    <option value="Nil Rated">Nil Rated</option>
                                    <option value="SEZ">SEZ</option>
                                    <option value="Consumers">Consumers</option>
                                </select>
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Taxable Value</span>
                                <input type="number" name="Taxable Value" className="ep-desc-input" value={formData["Taxable Value"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">CGST</span>
                                <input type="number" name="CGST" className="ep-desc-input" value={formData["CGST"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">SGST</span>
                                <input type="number" name="SGST" className="ep-desc-input" value={formData["SGST"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">IGST</span>
                                <input type="number" name="IGST" className="ep-desc-input" value={formData["IGST"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">TDS</span>
                                <input type="number" name="TDS" className="ep-desc-input" value={formData["TDS"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Total</span>
                                <input type="number" name="Total" className="ep-desc-input" value={formData["Total"]} onChange={handleInputChange} />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" className="btn" onClick={handleSubmit} disabled={loading}
                            style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '8px 24px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>
                            {loading ? "Submitting..." : `Submit Combined PB (${chargeItems.length} charges)`}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ marginRight: '30px' }}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MultiPurchaseBookModal;
