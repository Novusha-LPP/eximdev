import React, { useState, useEffect } from 'react';
import { FiX, FiAlertTriangle, FiArrowRight } from 'react-icons/fi';
import masterAPI from '../../../api/attendance/master.api';
import toast from 'react-hot-toast';

const UserMigrationModal = ({ isOpen, onClose, user, companies, onMigrate }) => {
    const [targetCompanyId, setTargetCompanyId] = useState('');
    const [targetShiftId, setTargetShiftId] = useState('');
    const [targetDepartmentId, setTargetDepartmentId] = useState('');
    const [shifts, setShifts] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loadingTargetData, setLoadingTargetData] = useState(false);
    const [migrating, setMigrating] = useState(false);

    useEffect(() => {
        if (targetCompanyId) {
            fetchTargetCompanyMasters(targetCompanyId);
        } else {
            setShifts([]);
            setDepartments([]);
        }
    }, [targetCompanyId]);

    const fetchTargetCompanyMasters = async (companyId) => {
        setLoadingTargetData(true);
        try {
            // We need to fetch shifts and departments for the specific company
            // Our existing APIs might need to accept company_id
            const [sRes, dRes] = await Promise.all([
                masterAPI.getShifts({ company_id: companyId }),
                masterAPI.getDesignations({ company_id: companyId }) // Assuming this returns depts or similar for now
            ]);
            setShifts(sRes?.data || []);
            // setDepartments(dRes?.data || []); 
            // Note: If designations API doesn't return depts, we might need a dedicated getDepartments API
        } catch (err) {
            console.error("Failed to fetch target masters:", err);
            toast.error("Could not load shifts for target company");
        } finally {
            setLoadingTargetData(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!targetCompanyId) return toast.error("Please select a target company");

        setMigrating(true);
        try {
            await onMigrate({
                userId: user._id,
                targetCompanyId,
                targetShiftId,
                targetDepartmentId
            });
            onClose();
        } catch (err) {
            toast.error(err.message || "Migration failed");
        } finally {
            setMigrating(false);
        }
    };

    if (!isOpen || !user) return null;

    return (
        <div className="cm-modal-overlay" onClick={onClose}>
            <div className="cm-modal" onClick={e => e.stopPropagation()}>
                <div className="cm-modal-header">
                    <h2>Migrate User</h2>
                    <button className="cm-modal-close" onClick={onClose}><FiX size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="cm-modal-body">
                        <div className="am-ctx-card" style={{ marginBottom: '20px', background: '#f8fafc', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="cm-user-avatar">
                                {user.first_name?.[0]}{user.last_name?.[0]}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user.first_name} {user.last_name}</div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Current: {user.company || 'No Company'}</div>
                            </div>
                            <FiArrowRight color="#94a3b8" />
                            <div style={{ flex: 1, textAlign: 'right' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#2563eb' }}>
                                    {companies.find(c => c._id === targetCompanyId)?.company_name || 'Select Target'}
                                </div>
                            </div>
                        </div>

                        <div className="cm-form-group">
                            <label>Target Company</label>
                            <select 
                                value={targetCompanyId} 
                                onChange={e => setTargetCompanyId(e.target.value)}
                                required
                            >
                                <option value="">Select a company...</option>
                                {companies.filter(c => c._id !== user.company_id).map(c => (
                                    <option key={c._id} value={c._id}>{c.company_name}</option>
                                ))}
                            </select>
                        </div>

                        {targetCompanyId && (
                            <>
                                {/* <div className="cm-form-group">
                                    <label>New Shift (Target Company)</label>
                                    <select 
                                        value={targetShiftId} 
                                        onChange={e => setTargetShiftId(e.target.value)}
                                        disabled={loadingTargetData}
                                    >
                                        <option value="">-- Clear Shift --</option>
                                        {shifts.map(s => (
                                            <option key={s._id} value={s._id}>{s.shift_name} ({s.start_time}-{s.end_time})</option>
                                        ))}
                                    </select>
                                    {loadingTargetData && <span style={{fontSize: '0.75rem', color: '#2563eb'}}>Loading shifts...</span>}
                                </div>

                                <div style={{ padding: '12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', display: 'flex', gap: '12px', marginTop: '20px' }}>
                                    <FiAlertTriangle color="#d97706" size={24} style={{ flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400e' }}>Dependency Warning</div>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#b45309', lineHeight: 1.4 }}>
                                            Migrating will reset company-specific leave policies and regularization rules for this user. 
                                            The user will need to be re-configured in the target company.
                                        </p>
                                    </div>
                                </div> */}
                            </>
                        )}
                    </div>
                    <div className="cm-modal-footer">
                        <button type="button" className="cm-btn cm-btn-secondary" onClick={onClose} disabled={migrating}>
                            Cancel
                        </button>
                        <button type="submit" className="cm-btn cm-btn-primary" disabled={migrating || !targetCompanyId}>
                            {migrating ? 'Migrating...' : 'Confirm Migration'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserMigrationModal;
