import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './charges.css';

const PurchaseBookModal = ({ isOpen, onClose, initialData, jobNumber, jobDisplayNumber, jobYear, awbBlNo, awbBlDate, onSuccess }) => {
    const [loading, setLoading] = useState(false);
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
        "Charge Description": '',
        "Charge Head Category": ''
    });

    useEffect(() => {
        const fetchNextSequence = async () => {
            if (isOpen && initialData) {
                const party = initialData.partyDetails;
                const branchIndex = initialData.branchIndex || 0;
                const branch = party?.branches?.[branchIndex] || {};

                const jobNum = initialData.jobDisplayNumber || jobDisplayNumber || initialData.jobNumber || jobNumber || '';

                let finalEntryNo = `PB01/${jobNum}`;
                let updatedJobNum = jobNum;
                try {
                    const API_KEY = "INTERNAL_TEAM_TALLY_KEY";
                    const response = await axios.get(
                        `${process.env.REACT_APP_API_STRING}/tally/next-sequence`,
                        {
                            params: {
                                type: 'purchase',
                                jobNo: jobNum,
                                year: jobYear,
                                jobId: initialData.jobId
                            },
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

                const formatToISO = (dateStr) => {
                    if (!dateStr) return '';
                    if (dateStr.includes('-')) return dateStr; // Already ISO
                    if (dateStr.includes('/')) {
                        const parts = dateStr.split('/');
                        if (parts.length === 3) {
                            // DD/MM/YYYY to YYYY-MM-DD
                            return `${parts[2]}-${parts[1]}-${parts[0]}`;
                        }
                    }
                    return dateStr;
                };

                setFormData(prev => ({
                    ...prev,
                    "Entry No": finalEntryNo,
                    "Job No": updatedJobNum,
                    "Supplier Inv No": initialData.invoice_number || initialData.awbBlNo || awbBlNo || '',
                    "Supplier Inv Date": formatToISO(initialData.invoice_date || initialData.awbBlDate || awbBlDate || ''),
                    "Supplier Name": initialData.partyName || '',
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
                    "Taxable Value": initialData.basicAmount ? initialData.basicAmount.toFixed(2) : (initialData.amount ? initialData.amount.toFixed(2) : ''),
                    "GST%": initialData.gstRate || '',
                    "CGST": (initialData.cgst > 0) ? initialData.cgst.toFixed(2) : '',
                    "SGST": (initialData.sgst > 0) ? initialData.sgst.toFixed(2) : '',
                    "IGST": (initialData.igst > 0) ? initialData.igst.toFixed(2) : '',
                    "TDS": initialData.tdsAmount ? initialData.tdsAmount.toFixed(2) : '',
                    "Total": initialData.netPayable ? initialData.netPayable.toFixed(2) : '',
                    "Description of Services": initialData.chargeHead || '',
                    "SAC": initialData.cthNo || '',
                    "Status": '',
                    "chargeRef": initialData.chargeId || '',
                    "jobRef": initialData.jobId || '',
                    "Charge Description": initialData.chargeDescription || '',
                    "Charge Head Category": initialData.chargeHeadCategory || ''
                }));
            }
        };

        fetchNextSequence();
    }, [isOpen, initialData, jobNumber, jobDisplayNumber, jobYear, awbBlNo, awbBlDate]);

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        
        // Use AWB/BL No if Supplier Inv No is left blank
        const finalFormData = { ...formData };
        if (!finalFormData["Supplier Inv No"] || finalFormData["Supplier Inv No"].trim() === '') {
            finalFormData["Supplier Inv No"] = initialData?.awbBlNo || awbBlNo || '';
        }

        // Use AWB/BL Date if Supplier Inv Date is left blank
        if (!finalFormData["Supplier Inv Date"] || finalFormData["Supplier Inv Date"].trim() === '') {
            const rawDate = initialData?.awbBlDate || awbBlDate || '';
            if (rawDate) {
                if (rawDate.includes('/')) {
                    const parts = rawDate.split('/');
                    if (parts.length === 3) {
                        finalFormData["Supplier Inv Date"] = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                } else {
                    finalFormData["Supplier Inv Date"] = rawDate;
                }
            }
        }

        setLoading(true);
        try {
            const API_KEY = "INTERNAL_TEAM_TALLY_KEY";

            // Fixed URL: process.env.REACT_APP_API_STRING already contains '/api'
            const response = await axios.post(
                `${process.env.REACT_APP_API_STRING}/tally/purchase-entry`,
                finalFormData,
                {
                    headers: { 'x-api-key': API_KEY },
                    withCredentials: true
                }
            );

            if (response.data.success) {
                alert("Purchase Book Entry Submitted Successfully to Tally!");
                if (onSuccess) onSuccess(finalFormData["Entry No"]);
                onClose();
            } else {
                alert("Failed to submit to Tally: " + response.data.message);
            }
        } catch (error) {
            console.error("Submission Error:", error);
            alert("Error submitting to Tally. Please check the logs.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="charges-edit-modal-overlay charges-active" style={{ zIndex: 1100 }}>
            <div className="charges-edit-modal" style={{ width: '1000px', maxWidth: '95vw' }}>
                <div className="charges-modal-title">Purchase Book Entry</div>
                <form onSubmit={handleSubmit}>
                    <div className="charges-modal-body">
                        <div className="charges-ep-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 20px', marginRight: '30px' }}>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Entry No</span>
                                <input type="text" name="Entry No" className="charges-ep-desc-input" value={formData["Entry No"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Entry Date</span>
                                <input type="date" name="Entry Date" className="charges-ep-desc-input" value={formData["Entry Date"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Supplier Inv No</span>
                                <input type="text" name="Supplier Inv No" className="charges-ep-desc-input" value={formData["Supplier Inv No"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Supplier Inv Date</span>
                                <input type="date" name="Supplier Inv Date" className="charges-ep-desc-input" value={formData["Supplier Inv Date"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Job No</span>
                                <input type="text" name="Job No" className="charges-ep-desc-input" value={formData["Job No"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Supplier Name</span>
                                <input type="text" name="Supplier Name" className="charges-ep-desc-input" value={formData["Supplier Name"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Address 1</span>
                                <input type="text" name="Address 1" className="charges-ep-desc-input" value={formData["Address 1"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Address 2</span>
                                <input type="text" name="Address 2" className="charges-ep-desc-input" value={formData["Address 2"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Address 3</span>
                                <input type="text" name="Address 3" className="charges-ep-desc-input" value={formData["Address 3"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">State</span>
                                <input type="text" name="State" className="charges-ep-desc-input" value={formData["State"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Country</span>
                                <input type="text" name="Country" className="charges-ep-desc-input" value={formData["Country"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Pin code</span>
                                <input type="text" name="Pin Code" className="charges-ep-desc-input" value={formData["Pin Code"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Registration Type</span>
                                <select name="Registration Type" className="charges-ep-select" value={formData["Registration Type"]} onChange={handleInputChange}>
                                    <option value="Regular">Regular</option>
                                    <option value="Composite">Composite</option>
                                    <option value="Exempt">Exempt</option>
                                    <option value="Nil Rated">Nil Rated</option>
                                    <option value="SEZ">SEZ</option>
                                    <option value="Consumers">Consumers</option>
                                </select>
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">GSTIN No</span>
                                <input type="text" name="GSTIN No" className="charges-ep-desc-input" value={formData["GSTIN No"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">PAN</span>
                                <input type="text" name="PAN" className="charges-ep-desc-input" value={formData["PAN"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">CIN</span>
                                <input type="text" name="CIN" className="charges-ep-desc-input" value={formData["CIN"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Place of Supply</span>
                                <input type="text" name="Place of Supply" className="charges-ep-desc-input" value={formData["Place of Supply"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Credit Terms</span>
                                <input type="text" name="Credit Terms" className="charges-ep-desc-input" value={formData["Credit Terms"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Description of Services</span>
                                <input type="text" name="Description of Services" className="charges-ep-desc-input" value={formData["Description of Services"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">SAC</span>
                                <input type="text" name="SAC" className="charges-ep-desc-input" value={formData["SAC"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Taxable Value</span>
                                <input type="number" name="Taxable Value" className="charges-ep-desc-input" value={formData["Taxable Value"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">GST%</span>
                                <input type="number" name="GST%" className="charges-ep-desc-input" value={formData["GST%"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">CGST</span>
                                <input type="number" name="CGST" className="charges-ep-desc-input" value={formData["CGST"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">SGST</span>
                                <input type="number" name="SGST" className="charges-ep-desc-input" value={formData["SGST"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">IGST</span>
                                <input type="number" name="IGST" className="charges-ep-desc-input" value={formData["IGST"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">TDS</span>
                                <input type="number" name="TDS" className="charges-ep-desc-input" value={formData["TDS"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Total</span>
                                <input type="number" name="Total" className="charges-ep-desc-input" value={formData["Total"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Status</span>
                                <input type="text" name="Status" className="charges-ep-desc-input" value={formData["Status"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">Charge Head Category</span>
                                <input type="text" name="Charge Head Category" className="charges-ep-desc-input" value={formData["Charge Head Category"]} onChange={handleInputChange} />
                            </div>
                            <div className="charges-ep-row" style={{ gridColumn: 'span 2' }}>
                                <span className="charges-ep-label">Charge Description</span>
                                <input type="text" name="Charge Description" className="charges-ep-desc-input" value={formData["Charge Description"]} onChange={handleInputChange} />
                            </div>
                        </div>
                    </div>
                    <div className="charges-modal-footer">
                        <button type="button" className="charges-btn" onClick={handleSubmit} disabled={loading}>
                            {loading ? "Submitting..." : "Submit Purchase Entry"}
                        </button>
                        <button type="button" className="charges-btn" onClick={onClose} style={{ marginRight: '30px' }}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PurchaseBookModal;
