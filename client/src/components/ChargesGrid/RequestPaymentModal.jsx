import React, { useState, useEffect } from 'react';
import './charges.css';

const RequestPaymentModal = ({ isOpen, onClose, initialData, jobNumber, jobYear }) => {
    const [formData, setFormData] = useState({
        requestNo: '',
        requestDate: new Date().toISOString().split('T')[0],
        bankFrom: '',
        paymentTo: '',
        againstBill: '',
        amount: '',
        transactionType: 'NEFT',
        accountNo: '',
        ifscCode: '',
        bankName: '',
        instrumentNo: '',
        instrumentDate: '',
        transferMode: 'Online',
        beneficiaryCode: ''
    });

    useEffect(() => {
        if (isOpen && initialData) {
            // Generate request number: R1/JOB_NO/YEAR
            const generatedRequestNo = `R1/${jobNumber || ''}/${jobYear || ''}`;
            
            setFormData(prev => ({
                ...prev,
                requestNo: generatedRequestNo,
                paymentTo: initialData.partyName || '',
                amount: initialData.netPayable || '',
                againstBill: initialData.chargeHead || ''
            }));
        }
    }, [isOpen, initialData, jobNumber, jobYear]);

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Payment Request Submitted:", formData);
        alert("Payment Request Submitted Successfully (Simulation)");
        onClose();
    };

    return (
        <div className="modal-overlay active" style={{ zIndex: 1100 }}>
            <div className="edit-charge-modal" style={{ width: '600px' }}>
                <div className="modal-title">Request Payment</div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="ep-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
                            <div className="ep-row">
                                <span className="ep-label">Request No</span>
                                <input type="text" name="requestNo" className="ep-desc-input" value={formData.requestNo} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Request Date</span>
                                <input type="date" name="requestDate" className="ep-desc-input" value={formData.requestDate} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Bank From</span>
                                <select name="bankFrom" className="ep-select" value={formData.bankFrom} onChange={handleInputChange}>
                                    <option value="">Select Bank</option>
                                    <option value="HDFC">HDFC Bank</option>
                                    <option value="ICICI">ICICI Bank</option>
                                    <option value="SBI">SBI Bank</option>
                                </select>
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Payment to</span>
                                <input type="text" name="paymentTo" className="ep-desc-input" value={formData.paymentTo} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Against Bill</span>
                                <input type="text" name="againstBill" className="ep-desc-input" value={formData.againstBill} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Amount</span>
                                <input type="number" name="amount" className="ep-desc-input" value={formData.amount} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Transfer Mode</span>
                                <select name="transferMode" className="ep-select" value={formData.transferMode} onChange={handleInputChange}>
                                    <option value="Online">Online</option>
                                    <option value="Offline">Offline</option>
                                </select>
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">A/c No</span>
                                <input type="text" name="accountNo" className="ep-desc-input" value={formData.accountNo} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">IFS Code</span>
                                <input type="text" name="ifscCode" className="ep-desc-input" value={formData.ifscCode} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Bank Name</span>
                                <input type="text" name="bankName" className="ep-desc-input" value={formData.bankName} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Transaction Type</span>
                                <select name="transactionType" className="ep-select" value={formData.transactionType} onChange={handleInputChange}>
                                    <option value="NEFT">NEFT</option>
                                    <option value="RTGS">RTGS</option>
                                    <option value="IMPS">IMPS</option>
                                    <option value="CHEQUE">CHEQUE</option>
                                </select>
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Beneficiary Code</span>
                                <input type="text" name="beneficiaryCode" className="ep-desc-input" value={formData.beneficiaryCode} onChange={handleInputChange} />
                            </div>
                            {formData.transactionType === 'CHEQUE' && (
                                <>
                                    <div className="ep-row">
                                        <span className="ep-label">Instrument No</span>
                                        <input type="text" name="instrumentNo" className="ep-desc-input" value={formData.instrumentNo} onChange={handleInputChange} />
                                    </div>
                                    <div className="ep-row">
                                        <span className="ep-label">Instrument Date</span>
                                        <input type="date" name="instrumentDate" className="ep-desc-input" value={formData.instrumentDate} onChange={handleInputChange} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="submit" className="btn">Submit Request</button>
                        <button type="button" className="btn" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RequestPaymentModal;
