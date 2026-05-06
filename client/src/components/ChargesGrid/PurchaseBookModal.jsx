import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
        "Charge Description": '',
        "Charge Head Category": '',
        "TDS Category": '94C',
        "attachments": [],
        "Charges": []
    });

    useEffect(() => {
        const fetchNextSequence = async () => {
            if (isOpen && initialData) {
                const party = initialData.partyDetails;
                const branchIndex = initialData.branchIndex || 0;
                const branch = party?.branches?.[branchIndex] || {};

                const jobNum = initialData.jobDisplayNumber || initialData.jobNo || jobDisplayNumber || initialData.jobNumber || jobNumber || '';

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
                                year: initialData.jobYear || jobYear,
                                jobId: initialData.jobId || initialData.jobRef
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

                const charges = initialData.charges || [];
                const isMulti = charges.length > 0;
                const firstCharge = isMulti ? charges[0] : initialData;

                const getVal = (obj, fields) => {
                    for (const f of fields) {
                        if (obj[f] !== undefined && obj[f] !== null && obj[f] !== '') {
                            const val = typeof obj[f] === 'number' ? obj[f] : parseFloat(obj[f]);
                            if (!isNaN(val)) return val;
                        }
                    }
                    return 0;
                };

                const formatVal = (val) => {
                    if (!val || parseFloat(val) === 0) return '';
                    const num = parseFloat(val);
                    return isNaN(num) ? '' : num.toString();
                };

                const sumField = (fields) => {
                    const fieldList = Array.isArray(fields) ? fields : [fields];
                    if (!isMulti) {
                        return getVal(initialData, fieldList);
                    }
                    return charges.reduce((sum, c) => sum + getVal(c, fieldList), 0);
                };

                const taxable = sumField(["taxableValue", "basicAmount", "amount"]);
                const total = sumField(["total", "totalAmount", "amount"]);

                setFormData(prev => ({
                    ...prev,
                    "Entry No": finalEntryNo,
                    "Job No": updatedJobNum || jobNum,
                    "Supplier Inv No": initialData.invoice_number || initialData.supplierInvNo || initialData.awbBlNo || awbBlNo || '',
                    "Supplier Inv Date": initialData.invoice_date || initialData.supplierInvDate || initialData.awbBlDate || awbBlDate || '',
                    "Supplier Name": party?.party_name || party?.name || initialData.partyName || initialData.supplierName || '',
                    "Address 1": branch.address_line1 || party?.address_line1 || branch.address || party?.address || initialData.address1 || '',
                    "Address 2": branch.address_line2 || party?.address_line2 || branch.city || party?.city || initialData.address2 || '',
                    "Address 3": branch.address_line3 || party?.address_line3 || branch.state || party?.state || initialData.address3 || '',
                    "State": branch.state || party?.state || initialData.state || '',
                    "Country": branch.country || party?.country || initialData.country || '',
                    "Pin Code": branch.pincode || party?.pincode || branch.postal_code || party?.postal_code || initialData.pinCode || '',
                    "GSTIN No": branch.gst || party?.gst || party?.gstin || initialData.gstinNo || '',
                    "PAN": branch.pan || party?.pan || initialData.pan || '',
                    "CIN": party?.cin || initialData.cin || '',
                    "Registration Type": (branch.gst || party?.gst || party?.gstin || initialData.gstinNo) ? 'Regular' : 'Unregistered',
                    "Place of Supply": branch.state || party?.state || initialData.placeOfSupply || '',
                    "Description of Services": firstCharge.descriptionOfServices || 
                        ((firstCharge.chargeHeadCategory === 'Margin' || firstCharge.category === 'Margin') ? (firstCharge.chargeHeading || firstCharge.chargeHead || '') :
                        (party?.party_name || party?.name || initialData.partyName || initialData.supplierName ? `NEW ${party?.party_name || party?.name || initialData.partyName || initialData.supplierName}` : '')),
                    "Charge Heading": isMulti ? "Multiple Charges Included" : (firstCharge.chargeHeading || firstCharge.chargeHead || ''),
                    "SAC": firstCharge.sac || firstCharge.cthNo || initialData.cthNo || '',
                    "Taxable Value": taxable !== 0 ? taxable.toString() : '',
                    "GST%": isMulti ? '' : (firstCharge.gstPercent || firstCharge.gstRate || initialData.gstRate || ''),
                    "CGST": formatVal(sumField(["cgst", "cgstAmt"])),
                    "SGST": formatVal(sumField(["sgst", "sgstAmt"])),
                    "IGST": formatVal(sumField(["igst", "igstAmt"])),
                    "TDS": formatVal(sumField(["tds", "tdsAmount", "tdsAmt"])),
                    "Total": total !== 0 ? total.toString() : '',
                    "Charge Description": firstCharge.chargeDescription || '',
                    "Charge Head Category": firstCharge.chargeHeadCategory || firstCharge.category || '',
                    "TDS Category": firstCharge.tdsCategory || initialData.tdsCategory || '94C',
                    "jobRef": initialData.jobId || firstCharge.jobId,
                    "chargeRef": firstCharge.chargeId || initialData.chargeId,
                    "Charges": charges
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

    const handleChargeChange = (idx, field, value) => {
        const updatedCharges = [...formData.Charges];
        const charge = { ...updatedCharges[idx] };
        
        if (field === 'chargeHeading') {
            charge[field] = value;
        } else {
            charge[field] = parseFloat(value) || 0;
        }
        
        // Recalculate this charge's total and GST if taxable or GST% changed
        if (field === 'taxableValue' || field === 'gstPercent') {
            const tax = charge.taxableValue || 0;
            const rate = charge.gstPercent || 0;
            const gstAmt = tax * (rate / 100);
            
            // Re-split GST based on original split (or default to IGST if unknown)
            // For simplicity in the UI edit, we'll update IGST and then the modal logic 
            // usually handles the split on submission or based on state.
            // But let's try to maintain the CGST/SGST split if it existed.
            if (charge.cgst > 0 || charge.sgst > 0) {
                charge.cgst = gstAmt / 2;
                charge.sgst = gstAmt / 2;
                charge.igst = 0;
            } else {
                charge.igst = gstAmt;
                charge.cgst = 0;
                charge.sgst = 0;
            }
            charge.totalAmount = tax + gstAmt;
            charge.netPayable = charge.totalAmount - (charge.tdsAmount || 0);
        }

        if (field === 'tdsAmount') {
            charge.netPayable = (charge.totalAmount || 0) - charge.tdsAmount;
        }

        updatedCharges[idx] = charge;

        // Recalculate totals for the whole form
        const totalTaxable = updatedCharges.reduce((sum, c) => sum + (c.taxableValue || 0), 0);
        const totalCGST = updatedCharges.reduce((sum, c) => sum + (c.cgst || 0), 0);
        const totalSGST = updatedCharges.reduce((sum, c) => sum + (c.sgst || 0), 0);
        const totalIGST = updatedCharges.reduce((sum, c) => sum + (c.igst || 0), 0);
        const totalTDS = updatedCharges.reduce((sum, c) => sum + (c.tdsAmount || 0), 0);
        const totalNet = updatedCharges.reduce((sum, c) => sum + (c.netPayable || 0), 0);

        setFormData(prev => ({
            ...prev,
            "Charges": updatedCharges,
            "Taxable Value": totalTaxable.toFixed(2),
            "CGST": totalCGST.toFixed(2),
            "SGST": totalSGST.toFixed(2),
            "IGST": totalIGST.toFixed(2),
            "TDS": totalTDS.toFixed(2),
            "Total": totalNet.toFixed(2)
        }));
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


    return createPortal(
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
                                <span className="charges-ep-label">Charge Heading</span>
                                <input type="text" name="Charge Heading" className="charges-ep-desc-input" value={formData["Charge Heading"]} onChange={handleInputChange} />
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
                            <div className="charges-ep-row">
                                <span className="charges-ep-label">TDS Category</span>
                                <select name="TDS Category" className="charges-ep-select" value={formData["TDS Category"]} onChange={handleInputChange}>
                                    <option value="94C">94C</option>
                                    <option value="94I">94I</option>
                                </select>
                            </div>
                            <div className="charges-ep-row" style={{ gridColumn: 'span 1' }}>
                                <span className="charges-ep-label">Charge Description</span>
                                <input type="text" name="Charge Description" className="charges-ep-desc-input" value={formData["Charge Description"]} onChange={handleInputChange} />
                            </div>
                        </div>
                        {formData.Charges && formData.Charges.length > 0 && (
                            <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px', marginRight: '30px' }}>
                                <span className="charges-ep-label" style={{ marginBottom: '10px', display: 'block', fontWeight: 'bold' }}>Included Charges List ({formData.Charges.length})</span>
                                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                                    <thead>
                                        <tr style={{ background: '#f8f9fa' }}>
                                            <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Charge Head</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>Taxable Value</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>GST%</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>GST Amt</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>TDS</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formData.Charges.map((c, idx) => (
                                            <tr key={idx}>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                                                    <input 
                                                        type="text" 
                                                        style={{ width: '100%', border: '1px solid #ccc', borderRadius: '3px', fontSize: '11px' }}
                                                        value={c.chargeHeading || ''} 
                                                        onChange={(e) => handleChargeChange(idx, 'chargeHeading', e.target.value)}
                                                    />
                                                </td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>
                                                    <input 
                                                        type="number" 
                                                        style={{ width: '80px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', fontSize: '11px' }}
                                                        value={c.taxableValue || 0} 
                                                        onChange={(e) => handleChargeChange(idx, 'taxableValue', e.target.value)}
                                                    />
                                                </td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>
                                                    <input 
                                                        type="number" 
                                                        style={{ width: '50px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', fontSize: '11px' }}
                                                        value={c.gstPercent || 0} 
                                                        onChange={(e) => handleChargeChange(idx, 'gstPercent', e.target.value)}
                                                    /> %
                                                </td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>
                                                    {( (c.cgst || 0) + (c.sgst || 0) + (c.igst || 0) ).toFixed(2)}
                                                </td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>
                                                    <input 
                                                        type="number" 
                                                        style={{ width: '70px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', fontSize: '11px' }}
                                                        value={c.tdsAmount || 0} 
                                                        onChange={(e) => handleChargeChange(idx, 'tdsAmount', e.target.value)}
                                                    />
                                                </td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>
                                                    {c.netPayable?.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: '#f1f8e9', fontWeight: 'bold' }}>
                                            <td style={{ padding: '6px', border: '1px solid #ddd' }}>TOTAL</td>
                                            <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formData["Taxable Value"]}</td>
                                            <td style={{ padding: '6px', border: '1px solid #ddd' }}></td>
                                            <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{(parseFloat(formData["CGST"] || 0) + parseFloat(formData["SGST"] || 0) + parseFloat(formData["IGST"] || 0)).toFixed(2)}</td>
                                            <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formData["TDS"]}</td>
                                            <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formData["Total"]}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                    <div className="charges-modal-footer">
                        <button type="button" className="charges-btn" onClick={handleSubmit} disabled={loading}>
                            {loading ? "Submitting..." : "Submit Purchase Entry"}
                        </button>
                        <button type="button" className="charges-btn" onClick={onClose} style={{ marginRight: '30px' }}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default PurchaseBookModal;
