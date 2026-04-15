import React, { useState, useEffect, useCallback } from 'react';
import { 
    X, 
    Calendar, 
    FileText, 
    ChevronRight, 
    AlertCircle, 
    CheckCircle2,
    UserCheck,
    Loader2
} from 'lucide-react';
import { message } from 'antd';
import moment from 'moment';
import leaveAPI from '../../../api/attendance/leave.api';
import '../LeaveManagement.css'; // Reuse existing styles

const AdminApplyLeaveModal = ({ isOpen, onClose, employeeId, employeeName, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [balances, setBalances] = useState([]);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [formData, setFormData] = useState({
        policyId: '',
        fromDate: '',
        toDate: '',
        isHalfDay: false,
        isStartHalfDay: false,
        isEndHalfDay: false,
        halfDaySession: 'First Half',
        reason: '',
        attachment: null
    });

    const [preview, setPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const getErrorMessage = useCallback((err, fallback) => {
        return err?.message || err?.response?.data?.message || fallback;
    }, []);

    // Initial load: fetch balances for the target employee
    useEffect(() => {
        if (isOpen && employeeId) {
            fetchBalances();
        } else {
            // Reset form when closed
            setFormData({
                policyId: '',
                fromDate: '',
                toDate: '',
                isHalfDay: false,
                isStartHalfDay: false,
                isEndHalfDay: false,
                startHalfSession: 'First Half',
                endHalfSession: 'First Half',
                halfDaySession: 'First Half',
                reason: '',
                attachment: null
            });
            setPreview(null);
            setSelectedPolicy(null);
        }
    }, [isOpen, employeeId]);

    const fetchBalances = async () => {
        setLoading(true);
        try {
            const res = await leaveAPI.getBalance(employeeId);
            if (res.data) {
                setBalances(res.data);
            }
        } catch (err) {
            console.error('Error fetching balances:', err);
            message.error(getErrorMessage(err, 'Failed to load leave balances'));
        } finally {
            setLoading(false);
        }
    };

    // Debounced preview calculation
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.policyId && formData.fromDate && (formData.isHalfDay || formData.toDate)) {
                handlePreview();
            } else {
                setPreview(null);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [formData.policyId, formData.fromDate, formData.toDate, formData.isHalfDay, formData.isStartHalfDay, formData.isEndHalfDay, formData.halfDaySession]);

    const handlePreview = async () => {
        setPreviewLoading(true);
        try {
            const res = await leaveAPI.previewLeave({
                leave_policy_id: formData.policyId,
                from_date: formData.fromDate,
                to_date: formData.isHalfDay ? formData.fromDate : formData.toDate,
                is_half_day: formData.isHalfDay,
                is_start_half_day: formData.isStartHalfDay,
                is_end_half_day: formData.isEndHalfDay,
                start_half_session: formData.startHalfSession,
                end_half_session: formData.endHalfSession,
                employee_id: employeeId
            });
            if (res.success) {
                setPreview(res.data);
            }
        } catch (err) {
            console.error('Preview error:', err);
            const errMsg = getErrorMessage(err, '');
            if (errMsg && /already have a leave application/i.test(errMsg)) {
                message.error(errMsg);
            }
            setPreview(null);
        } finally {
            setPreviewLoading(false);
        }
    };

    const handlePolicyChange = (e) => {
        const pid = e.target.value;
        const policy = balances.find(b => String(b._id) === String(pid));
        setSelectedPolicy(policy);
        setFormData(prev => ({ ...prev, policyId: pid }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.policyId || !formData.fromDate || (!formData.isHalfDay && !formData.toDate) || !formData.reason) {
            message.warning('Please fill in all required fields');
            return;
        }

        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('leave_policy_id', formData.policyId);
            fd.append('from_date', formData.fromDate);
            fd.append('to_date', formData.isHalfDay ? formData.fromDate : formData.toDate);
            fd.append('is_half_day', formData.isHalfDay);
            fd.append('is_start_half_day', formData.isStartHalfDay);
            fd.append('is_end_half_day', formData.isEndHalfDay);
            fd.append('start_half_session', formData.startHalfSession);
            fd.append('end_half_session', formData.endHalfSession);
            fd.append('reason', formData.reason);
            fd.append('employee_id', employeeId);
            
            if (formData.isHalfDay) {
                fd.append('half_day_session', formData.halfDaySession);
            }
            if (formData.attachment) {
                fd.append('attachment', formData.attachment);
            }

            const res = await leaveAPI.applyLeave(fd);
            if (res.success) {
                message.success(res.message || 'Leave applied successfully');
                if (onSuccess) onSuccess();
                onClose();
            } else {
                message.error(res.message || 'Failed to apply leave');
            }
        } catch (err) {
            console.error('Submit error:', err);
            message.error(getErrorMessage(err, 'Error submitting leave application'));
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && onClose()}>
            <div className="lm-modal ani-in" style={{ maxWidth: '520px' }}>
                <div className="lm-modal-head">
                    <h2>
                        <UserCheck size={18} />
                        Apply Leave for {employeeName}
                    </h2>
                    <button className="lm-mclose" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <form className="lm-form" onSubmit={handleSubmit}>
                    {/* Policy Selection */}
                    <div className="fg">
                        <label>Select Leave Type *</label>
                        <select 
                            value={formData.policyId} 
                            onChange={handlePolicyChange}
                            disabled={loading || submitting}
                            required
                        >
                            <option value="">-- Choose leave type --</option>
                            {balances.map(b => {
                                const label = b.name || b.policy_name || b.leave_type || 'Policy';
                                const isLwp = String(b.leave_type || label || '').toLowerCase().includes('lwp');
                                const availableDays = b.available ?? b.balance ?? 0;
                                return (
                                    <option key={b._id} value={b._id}>
                                        {label} {isLwp ? '(Unpaid)' : `(${availableDays} days available)`}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Sessions Toggle */}
                    <div className="toggle-row">
                        <div className="toggle-txt">Single Day Half Day</div>
                        <label className="sw">
                            <input 
                                type="checkbox" 
                                checked={formData.isHalfDay}
                                onChange={e => setFormData(p => ({ ...p, isHalfDay: e.target.checked, isStartHalfDay: false, isEndHalfDay: false }))}
                            />
                            <span className="sw-slider"></span>
                        </label>
                    </div>

                    {!formData.isHalfDay && formData.fromDate && formData.toDate && formData.fromDate !== formData.toDate && (
                        <div className="ani-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '15px', border: '1px solid #e2e8f0' }}>
                           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input 
                                        type="checkbox" 
                                        id="start-half"
                                        checked={formData.isStartHalfDay}
                                        onChange={e => setFormData(p => ({ ...p, isStartHalfDay: e.target.checked }))}
                                    />
                                    <label htmlFor="start-half" style={{ fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>Starts with Half Day</label>
                                </div>
                                {formData.isStartHalfDay && (
                                    <select 
                                        style={{ fontSize: '11px', padding: '2px 4px', height: '24px' }}
                                        value={formData.startHalfSession}
                                        onChange={e => setFormData(p => ({ ...p, startHalfSession: e.target.value }))}
                                    >
                                        <option value="First Half">First Half</option>
                                        <option value="Second Half">Second Half</option>
                                    </select>
                                )}
                           </div>
                           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input 
                                        type="checkbox" 
                                        id="end-half"
                                        checked={formData.isEndHalfDay}
                                        onChange={e => setFormData(p => ({ ...p, isEndHalfDay: e.target.checked }))}
                                    />
                                    <label htmlFor="end-half" style={{ fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>Ends with Half Day</label>
                                </div>
                                {formData.isEndHalfDay && (
                                    <select 
                                        style={{ fontSize: '11px', padding: '2px 4px', height: '24px' }}
                                        value={formData.endHalfSession}
                                        onChange={e => setFormData(p => ({ ...p, endHalfSession: e.target.value }))}
                                    >
                                        <option value="First Half">First Half</option>
                                        <option value="Second Half">Second Half</option>
                                    </select>
                                )}
                           </div>
                        </div>
                    )}

                    {/* Date Picker */}
                    <div className="fg2">
                        <div className="fg">
                            <label>{formData.isHalfDay ? 'Date *' : 'From Date *'}</label>
                            <input 
                                type="date" 
                                value={formData.fromDate}
                                onChange={e => setFormData(p => ({ ...p, fromDate: e.target.value }))}
                                required
                            />
                        </div>
                        {!formData.isHalfDay ? (
                            <div className="fg">
                                <label>To Date *</label>
                                <input 
                                    type="date" 
                                    value={formData.toDate}
                                    min={formData.fromDate}
                                    onChange={e => setFormData(p => ({ ...p, toDate: e.target.value }))}
                                    required
                                />
                            </div>
                        ) : (
                            <div className="fg">
                                <label>Session *</label>
                                <select 
                                    value={formData.halfDaySession}
                                    onChange={e => setFormData(p => ({ ...p, halfDaySession: e.target.value }))}
                                >
                                    <option value="First Half">First Half</option>
                                    <option value="Second Half">Second Half</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Reason */}
                    <div className="fg">
                        <label>Reason for Leave *</label>
                        <textarea 
                            placeholder="Please provide a briefly valid reason..."
                            value={formData.reason}
                            onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))}
                            required
                        />
                    </div>

                    {/* Attachment */}
                    <div className="fg">
                        <label>Supportive Documents (Optional)</label>
                        <input 
                            type="file" 
                            onChange={e => setFormData(p => ({ ...p, attachment: e.target.files[0] }))}
                        />
                    </div>

                    {previewLoading ? (
                        <div className="proj-loader ani-in">
                            <Loader2 className="animate-spin" size={16} />
                            <span>Calculating balance projection...</span>
                        </div>
                    ) : preview ? (
                        <div className="projection-card ani-in">
                            {!selectedPolicy?.leave_type?.toLowerCase().includes('lwp') && (
                                <>
                                    <div className="proj-row">
                                        <span>Currently Available:</span>
                                        <strong>{preview.available} Days</strong>
                                    </div>
                                    <div className="proj-divider" />
                                </>
                            )}
                            
                            <div className="proj-row" style={{ fontSize: '12px', opacity: 0.8 }}>
                                <span>Total Range:</span>
                                <span>{preview.breakdown?.total_range} Days</span>
                            </div>
                            
                            {preview.breakdown?.holiday_days > 0 && (
                                <div className="proj-row" style={{ fontSize: '12px', opacity: 0.8 }}>
                                    <span>Holidays Included:</span>
                                    <span>{preview.breakdown?.holiday_days} Days</span>
                                </div>
                            )}

                            {preview.breakdown?.weekly_off_days > 0 && (
                                <div className="proj-row" style={{ fontSize: '12px', opacity: 0.8 }}>
                                    <span>Week-Offs Included:</span>
                                    <span>{preview.breakdown?.weekly_off_days} Days</span>
                                </div>
                            )}

                            <div className="proj-row">
                                <span>Applied Leave (Deducted):</span>
                                <span className="requested-minus">
                                    -{preview.totalDays} {!selectedPolicy?.leave_type?.toLowerCase().includes('lwp') && 'Days'}
                                    {preview.sandwichDays > 0 ? (
                                        <small style={{ color: '#ef4444' }}> (Sandwich Applied)</small>
                                    ) : (
                                        <small style={{ color: '#10b981' }}> (No Sandwich)</small>
                                    )}
                                </span>
                            </div>

                            {!selectedPolicy?.leave_type?.toLowerCase().includes('lwp') && (
                                <>
                                    <div className="proj-divider" />
                                    <div className="proj-row final">
                                        <span>Projected Balance:</span>
                                        <span className="final-val">{preview.projected_balance} Days</span>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : null}

                    <div className="lm-mfooter">
                        <button 
                            type="submit" 
                            className="lm-submit" 
                            disabled={submitting || loading || !formData.policyId}
                        >
                            {submitting ? (
                                <><Loader2 className="animate-spin" size={18} /> Submitting...</>
                            ) : (
                                <><CheckCircle2 size={18} /> Apply Leave on Behalf</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminApplyLeaveModal;
