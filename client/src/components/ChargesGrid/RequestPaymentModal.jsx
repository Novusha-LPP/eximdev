import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import './charges.css';
import { UserContext } from '../../contexts/UserContext';

const RequestPaymentModal = ({ isOpen, onClose, initialData, jobNumber, jobDisplayNumber, jobYear, onSuccess }) => {
    const { user } = useContext(UserContext);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        "Request No": '',
        "Request Date": new Date().toISOString().split('T')[0],
        "Bank From": '',
        "Payment To": '',
        "Against Bill": '',
        "Amount": '',
        "Transaction Type": 'NEFT',
        "Account No": '',
        "IFSC Code": '',
        "Bank Name": '',
        "Instrument No": '',
        "Instrument Date": '',
        "Transfer Mode": 'Online',
        "Beneficiary Code": '',
        "Status": '',
        "Requested By": '',
        "jobNo": '',
        "chargeRef": '',
        "jobRef": ''
    });

    const [errorPopup, setErrorPopup] = useState({ isOpen: false, messages: [] });


    useEffect(() => {
        const fetchNextSequence = async () => {
            if (isOpen && initialData) {
                // Generate request number using canonical job reference (e.g. IMP/24-25/0001)
                const jobRefStr = initialData.jobDisplayNumber || jobDisplayNumber || initialData.jobNumber || jobNumber || '';

                let finalRequestNo = `R01/${jobRefStr}`;
                let updatedJobNo = jobRefStr;
                try {
                    const API_KEY = "INTERNAL_TEAM_TALLY_KEY";
                    const response = await axios.get(
                        `${process.env.REACT_APP_API_STRING}/tally/next-sequence`,
                        {
                            params: {
                                type: 'payment',
                                jobNo: jobRefStr,
                                year: jobYear,
                                jobId: initialData.jobId
                            },
                            headers: { 'x-api-key': API_KEY },
                            withCredentials: true
                        }
                    );
                    if (response.data.success) {
                        if (response.data.fullNo) finalRequestNo = response.data.fullNo;
                        if (response.data.jobNo) updatedJobNo = response.data.jobNo;
                    }
                } catch (error) {
                    console.error("Error fetching sequence:", error);
                }

                const party = initialData.partyDetails;
                const branchIndex = initialData.branchIndex || 0;
                const branch = party?.branches?.[branchIndex];
                const account = branch?.accounts?.[0] || {};

                setFormData(prev => ({
                    ...prev,
                    "Request No": finalRequestNo,
                    "Payment To": initialData.partyName || '',
                    "Amount": initialData.netPayable || '',
                    "Against Bill": initialData.chargeHead || '',
                    "Account No": account.accountNo || '',
                    "Bank Name": account.bankName || '',
                    "IFSC Code": account.ifsc || '',
                    "Status": '',
                    "jobNo": updatedJobNo,
                    "chargeRef": initialData.chargeId || '',
                    "jobRef": initialData.jobId || ''
                }));
            }
        };

        fetchNextSequence();
    }, [isOpen, initialData, jobNumber, jobDisplayNumber, jobYear]);

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        // Mandatory fields except "Beneficiary Code"
        const requiredFields = [
            "Request No",
            "Request Date",
            "Payment To",
            "Against Bill",
            "Amount",
            "Transfer Mode",
            "Transaction Type"
        ];

        // Conditional mandatory fields for Online transfer
        if (formData["Transfer Mode"] === 'Online') {
            requiredFields.push("Account No", "IFSC Code", "Bank Name");
        }

        // Conditional mandatory fields

        const missingFields = requiredFields.filter(field => !formData[field] || formData[field].toString().trim() === '');

        if (missingFields.length > 0) {
            setErrorPopup({ isOpen: true, messages: missingFields });
            return;
        }

        setLoading(true);
        try {
            const API_KEY = "INTERNAL_TEAM_TALLY_KEY";
            
            const submitData = {
                ...formData,
                "Requested By": user ? `${user.first_name} ${user.last_name}` : (localStorage.getItem("username") || "Unknown")
            };

            // Fixed URL: process.env.REACT_APP_API_STRING already contains '/api'
            const response = await axios.post(
                `${process.env.REACT_APP_API_STRING}/tally/payment-request`,
                submitData,
                {
                    headers: { 'x-api-key': API_KEY },
                    withCredentials: true
                }
            );

            if (response.data.success) {
                alert("Payment Request Submitted Successfully to Tally!");
                if (onSuccess) onSuccess(formData["Request No"]);
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
        <div className="charge-modal-overlay active" style={{ zIndex: 1100 }}>
            <div className="edit-charge-modal" style={{ width: '800px' }}>
                <div className="modal-title">Request Payment</div>
                <form>
                    <div className="modal-body">
                        <div className="ep-grid" style={{ gridTemplateColumns: '1fr 1fr 30px', gap: '10px 20px', marginRight: '10px' }}>
                            <div className="ep-row">
                                <span className="ep-label">Request No <span style={{ color: 'red' }}>*</span></span>
                                <input type="text" name="Request No" className="ep-desc-input" value={formData["Request No"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Request Date <span style={{ color: 'red' }}>*</span></span>
                                <input type="date" name="Request Date" className="ep-desc-input" value={formData["Request Date"]} onChange={handleInputChange} />
                            </div>
                            <div /> {/* Spacer */}
                            <div className="ep-row">
                                <span className="ep-label">Bank From</span>
                                <select name="Bank From" className="ep-select" value={formData["Bank From"]} onChange={handleInputChange}>
                                    <option value="">SELECT BANK</option>
                                    <option value="HDFC BANK">HDFC BANK</option>
                                    <option value="ICICI BANK">ICICI BANK</option>
                                    <option value="SBI BANK">SBI BANK</option>
                                    <option value="KOTAK BANK">KOTAK BANK</option>
                                    <option value="IDBI BANK">IDBI BANK</option>
                                    <option value="SOUTH INDIAN BANK">SOUTH INDIAN BANK</option>
                                </select>
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Payment to <span style={{ color: 'red' }}>*</span></span>
                                <input type="text" name="Payment To" className="ep-desc-input" value={formData["Payment To"]} onChange={handleInputChange} />
                            </div>
                            <div /> {/* Spacer */}
                            <div className="ep-row">
                                <span className="ep-label">Against Bill <span style={{ color: 'red' }}>*</span></span>
                                <input type="text" name="Against Bill" className="ep-desc-input" value={formData["Against Bill"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Amount <span style={{ color: 'red' }}>*</span></span>
                                <input type="number" name="Amount" className="ep-desc-input" value={formData["Amount"]} onChange={handleInputChange} />
                            </div>
                            <div /> {/* Spacer */}
                            <div className="ep-row">
                                <span className="ep-label">Transfer Mode <span style={{ color: 'red' }}>*</span></span>
                                <select name="Transfer Mode" className="ep-select" value={formData["Transfer Mode"]} onChange={handleInputChange}>
                                    <option value="Online">Online</option>
                                    <option value="Offline">Offline</option>
                                </select>
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">A/c No {formData["Transfer Mode"] === 'Online' && <span style={{ color: 'red' }}>*</span>}</span>
                                <input type="text" name="Account No" className="ep-desc-input" value={formData["Account No"]} onChange={handleInputChange} />
                            </div>
                            <div /> {/* Spacer */}
                            <div className="ep-row">
                                <span className="ep-label">IFS Code {formData["Transfer Mode"] === 'Online' && <span style={{ color: 'red' }}>*</span>}</span>
                                <input type="text" name="IFSC Code" className="ep-desc-input" value={formData["IFSC Code"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Bank Name {formData["Transfer Mode"] === 'Online' && <span style={{ color: 'red' }}>*</span>}</span>
                                <input type="text" name="Bank Name" className="ep-desc-input" value={formData["Bank Name"]} onChange={handleInputChange} />
                            </div>
                            <div /> {/* Spacer */}
                            <div className="ep-row">
                                <span className="ep-label">Transaction Type <span style={{ color: 'red' }}>*</span></span>
                                <select name="Transaction Type" className="ep-select" value={formData["Transaction Type"]} onChange={handleInputChange}>
                                    <option value="NEFT">NEFT</option>
                                    <option value="RTGS">RTGS</option>
                                    <option value="IMPS">IMPS</option>
                                    <option value="CHEQUE">CHEQUE</option>
                                    <option value="DEMAND DRAFT">DEMAND DRAFT</option>
                                    <option value="CASH">CASH</option>
                                    <option value="ODEX">ODEX</option>
                                </select>
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Beneficiary Code</span>
                                <input type="text" name="Beneficiary Code" className="ep-desc-input" value={formData["Beneficiary Code"]} onChange={handleInputChange} />
                            </div>
                            <div /> {/* Spacer */}
                             {['CHEQUE', 'DEMAND DRAFT'].includes(formData["Transaction Type"]) && (
                                <>
                                    <div className="ep-row">
                                        <span className="ep-label">Instrument No</span>
                                        <input type="text" name="Instrument No" className="ep-desc-input" value={formData["Instrument No"]} onChange={handleInputChange} />
                                    </div>
                                    <div className="ep-row">
                                        <span className="ep-label">Instrument Date</span>
                                        <input type="date" name="Instrument Date" className="ep-desc-input" value={formData["Instrument Date"]} onChange={handleInputChange} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn" onClick={handleSubmit} disabled={loading}>
                            {loading ? "Submitting..." : "Submit Request"}
                        </button>
                        <button type="button" className="btn" onClick={onClose} style={{ marginRight: '30px' }}>Cancel</button>
                    </div>
                </form>
            </div>

            {/* Validation Error Popup */}
            {errorPopup.isOpen && (
                <div className="charge-modal-overlay active" style={{ zIndex: 1200 }}>
                    <div className="edit-charge-modal" style={{ width: '400px' }}>
                        <div className="modal-title" style={{ background: 'linear-gradient(to bottom, #d32f2f, #b71c1c)' }}>
                            Validation Error
                        </div>
                        <div className="modal-body">
                            <div style={{ color: '#333', marginBottom: '10px', fontWeight: 'bold' }}>
                                Please fill in the following mandatory fields:
                            </div>
                            <ul style={{ color: '#d32f2f', paddingLeft: '20px', margin: 0 }}>
                                {errorPopup.messages.map((msg, i) => (
                                    <li key={i} style={{ marginBottom: '4px' }}>{msg}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'center' }}>
                            <button 
                                type="button" 
                                className="btn" 
                                onClick={() => setErrorPopup({ isOpen: false, messages: [] })}
                                style={{ background: 'linear-gradient(to bottom, #7fa8d0, #5580a8)', color: 'white' }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestPaymentModal;
