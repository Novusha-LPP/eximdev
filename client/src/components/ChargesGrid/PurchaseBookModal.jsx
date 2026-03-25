import React, { useState, useEffect } from 'react';
import './charges.css';

const PurchaseBookModal = ({ isOpen, onClose, initialData, jobNumber }) => {
    const [formData, setFormData] = useState({
        entryNo: '',
        entryDate: new Date().toISOString().split('T')[0],
        supplierInvNo: '',
        supplierInvDate: '',
        jobNo: '',
        supplierName: '',
        address1: '',
        address2: '',
        address3: '',
        state: '',
        country: '',
        pinCode: '',
        registrationType: 'Regular',
        gstinNo: '',
        pan: '',
        cin: '',
        placeOfSupply: '',
        creditTerms: '',
        descriptionOfServices: '',
        sac: '',
        taxableValue: '',
        gstPercent: '',
        cgstAmt: '',
        sgstAmt: '',
        igstAmt: '',
        tds: '',
        total: '',
        status: 'Active'
    });

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData(prev => ({
                ...prev,
                jobNo: jobNumber || '',
                supplierName: initialData.partyName || '',
                taxableValue: initialData.amount || '',
                gstPercent: initialData.gstRate || '',
                cgstAmt: initialData.cgst || '',
                sgstAmt: initialData.sgst || '',
                igstAmt: initialData.igst || '',
                tds: initialData.tdsAmount || '',
                total: initialData.totalAmount || '',
                descriptionOfServices: initialData.chargeHead || ''
            }));
        }
    }, [isOpen, initialData, jobNumber]);

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Purchase Book Entry Submitted:", formData);
        alert("Purchase Book Entry Submitted Successfully (Simulation)");
        onClose();
    };

    return (
        <div className="modal-overlay active" style={{ zIndex: 1100 }}>
            <div className="edit-charge-modal" style={{ width: '1000px', maxWidth: '95vw' }}>
                <div className="modal-title">Purchase Book Entry</div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="ep-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 20px' }}>
                            <div className="ep-row">
                                <span className="ep-label">Entry No</span>
                                <input type="text" name="entryNo" className="ep-desc-input" value={formData.entryNo} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Entry Date</span>
                                <input type="date" name="entryDate" className="ep-desc-input" value={formData.entryDate} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Supplier Inv No</span>
                                <input type="text" name="supplierInvNo" className="ep-desc-input" value={formData.supplierInvNo} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Supplier Inv Date</span>
                                <input type="date" name="supplierInvDate" className="ep-desc-input" value={formData.supplierInvDate} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Job No</span>
                                <input type="text" name="jobNo" className="ep-desc-input" value={formData.jobNo} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Supplier Name</span>
                                <input type="text" name="supplierName" className="ep-desc-input" value={formData.supplierName} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Address_1</span>
                                <input type="text" name="address1" className="ep-desc-input" value={formData.address1} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Address_2</span>
                                <input type="text" name="address2" className="ep-desc-input" value={formData.address2} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Address_3</span>
                                <input type="text" name="address3" className="ep-desc-input" value={formData.address3} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">State</span>
                                <input type="text" name="state" className="ep-desc-input" value={formData.state} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Country</span>
                                <input type="text" name="country" className="ep-desc-input" value={formData.country} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Pin code</span>
                                <input type="text" name="pinCode" className="ep-desc-input" value={formData.pinCode} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Registration Type</span>
                                <select name="registrationType" className="ep-select" value={formData.registrationType} onChange={handleInputChange}>
                                    <option value="Regular">Regular</option>
                                    <option value="Composite">Composite</option>
                                    <option value="Exempt">Exempt</option>
                                    <option value="Nil Rated">Nil Rated</option>
                                    <option value="SEZ">SEZ</option>
                                    <option value="Consumers">Consumers</option>
                                </select>
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">GSTIN No</span>
                                <input type="text" name="gstinNo" className="ep-desc-input" value={formData.gstinNo} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">PAN</span>
                                <input type="text" name="pan" className="ep-desc-input" value={formData.pan} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">CIN</span>
                                <input type="text" name="cin" className="ep-desc-input" value={formData.cin} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Place of Supply</span>
                                <input type="text" name="placeOfSupply" className="ep-desc-input" value={formData.placeOfSupply} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Credit Terms</span>
                                <input type="text" name="creditTerms" className="ep-desc-input" value={formData.creditTerms} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Description of Services</span>
                                <input type="text" name="descriptionOfServices" className="ep-desc-input" value={formData.descriptionOfServices} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">SAC</span>
                                <input type="text" name="sac" className="ep-desc-input" value={formData.sac} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Taxable Value</span>
                                <input type="number" name="taxableValue" className="ep-desc-input" value={formData.taxableValue} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">GST%</span>
                                <input type="number" name="gstPercent" className="ep-desc-input" value={formData.gstPercent} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">CGST Amt</span>
                                <input type="number" name="cgstAmt" className="ep-desc-input" value={formData.cgstAmt} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">SGST</span>
                                <input type="number" name="sgstAmt" className="ep-desc-input" value={formData.sgstAmt} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">IGST</span>
                                <input type="number" name="igstAmt" className="ep-desc-input" value={formData.igstAmt} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">TDS</span>
                                <input type="number" name="tds" className="ep-desc-input" value={formData.tds} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Total</span>
                                <input type="number" name="total" className="ep-desc-input" value={formData.total} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Status</span>
                                <select name="status" className="ep-select" value={formData.status} onChange={handleInputChange}>
                                    <option value="Active">Active</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="submit" className="btn">Submit Purchase Entry</button>
                        <button type="button" className="btn" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PurchaseBookModal;
