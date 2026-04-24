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
        halfDaySession: 'first_half',
        isSingleDay: true,
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
                startHalfSession: 'first_half',
                endHalfSession: 'first_half',
                halfDaySession: 'first_half',
                isSingleDay: true,
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
                    {/* Form Grid */}
                    <div className="form-grid">
                        {/* Policy Selection */}
                        <div className="fg">
                            <label>LEAVE TYPE</label>
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
                                            {label} {isLwp ? '(Unlimited)' : ` • ${availableDays} days left`}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Date Picker */}
                        <div className="fg">
                            <label>{formData.isSingleDay ? 'DATE' : 'FROM DATE'}</label>
                            <input 
                                type="date" 
                                value={formData.fromDate}
                                onChange={e => setFormData(p => ({ ...p, fromDate: e.target.value, toDate: formData.isSingleDay ? e.target.value : p.toDate }))}
                                required
                            />
                        </div>

                        {/* Day Option Toggle */}
                        <div className="fg">
                            <label>DAY OPTION</label>
                            <div className="form-block">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.isSingleDay}
                                        onChange={e => setFormData(p => ({ ...p, isSingleDay: e.target.checked, toDate: e.target.checked ? p.fromDate : p.toDate }))}
                                    />
                                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Apply for Single Day</span>
                                </label>
                            </div>
                        </div>

                        {/* Half Day / Multi-to Toggle */}
                        <div className="fg">
                            <label>{formData.isSingleDay ? 'HALF DAY' : 'TO DATE'}</label>
                            {formData.isSingleDay ? (
                                <div className="form-block" style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, flex: 1 }}>
                                        <input 
                                            type="checkbox" 
                                            checked={formData.isHalfDay}
                                            onChange={e => setFormData(p => ({ ...p, isHalfDay: e.target.checked, isStartHalfDay: e.target.checked, isEndHalfDay: e.target.checked }))}
                                        />
                                        <span style={{ fontSize: '13px', fontWeight: '500' }}>Apply as Half Day</span>
                                    </label>
                                    {formData.isHalfDay && (
                                        <select 
                                            style={{ fontSize: '11px', padding: '2px 4px', height: '24px', width: 'auto' }}
                                            value={formData.halfDaySession}
                                            onChange={e => setFormData(p => ({ ...p, halfDaySession: e.target.value, startHalfSession: e.target.value, endHalfSession: e.target.value }))}
                                        >
                                            <option value="first_half">First Half</option>
                                            <option value="second_half">Second Half</option>
                                        </select>
                                    )}
                                </div>
                            ) : (
                                <input 
                                    type="date" 
                                    value={formData.toDate}
                                    min={formData.fromDate}
                                    onChange={e => setFormData(p => ({ ...p, toDate: e.target.value }))}
                                    required
                                />
                            )}
                        </div>
                    </div>

                    {/* Multi-day Half Day Options */}
                    {!formData.isSingleDay && formData.fromDate && formData.toDate && (
                        <div className="ani-in form-block" style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.isStartHalfDay}
                                        onChange={e => setFormData(p => ({ ...p, isStartHalfDay: e.target.checked, isHalfDay: false }))}
                                    />
                                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Starts with Half Day</span>
                                </label>
                                {formData.isStartHalfDay && (
                                    <select 
                                        style={{ fontSize: '11px', padding: '2px 4px', height: '24px', width: 'auto' }}
                                        value={formData.startHalfSession}
                                        onChange={e => setFormData(p => ({ ...p, startHalfSession: e.target.value }))}
                                    >
                                        <option value="first_half">First Half</option>
                                        <option value="second_half">Second Half</option>
                                    </select>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.isEndHalfDay}
                                        onChange={e => setFormData(p => ({ ...p, isEndHalfDay: e.target.checked, isHalfDay: false }))}
                                    />
                                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Ends with Half Day</span>
                                </label>
                                {formData.isEndHalfDay && (
                                    <select 
                                        style={{ fontSize: '11px', padding: '2px 4px', height: '24px', width: 'auto' }}
                                        value={formData.endHalfSession}
                                        onChange={e => setFormData(p => ({ ...p, endHalfSession: e.target.value }))}
                                    >
                                        <option value="first_half">First Half</option>
                                        <option value="second_half">Second Half</option>
                                    </select>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Reason */}
                    <div className="fg">
                        <label>REASON</label>
                        <textarea 
                            placeholder="Briefly describe the reason for your leave..."
                            value={formData.reason}
                            onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))}
                            required
                            rows={3}
                        />
                    </div>

                    {/* Attachment */}
                    <div className="fg">
                        <label>SUPPORTING DOCUMENT <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                        <input 
                            type="file" 
                            onChange={e => setFormData(p => ({ ...p, attachment: e.target.files[0] }))}
                        />
                    </div>

                    {/* 3-Column Preview Box */}
                    {formData.policyId && formData.fromDate && formData.toDate && (
                        <div className={`preview-infobox ani-in${previewLoading ? ' loading' : ''}`}>
                            {previewLoading ? (
                                <div className="proj-loader" style={{ gridColumn: 'span 3' }}>
                                    <Loader2 className="animate-spin" size={14} />
                                    Calculating statistics...
                                </div>
                            ) : preview ? (
                                <>
                                    {/* Column 1: Total Range */}
                                    <div className="p-info-col">
                                        <span className="p-i-lbl">TOTAL RANGE</span>
                                        <span className="p-i-val">{preview.breakdown?.total_range} Day{preview.breakdown?.total_range !== 1 ? 's' : ''}</span>
                                        {preview.breakdown?.holiday_days > 0 && <span className="p-i-sub positive">+{preview.breakdown.holiday_days} Holiday</span>}
                                        {preview.breakdown?.weekly_off_days > 0 && <span className="p-i-sub positive">+{preview.breakdown.weekly_off_days} Week-off</span>}
                                    </div>

                                    {/* Column 2: Applied / Deducted */}
                                    <div className="p-info-col">
                                        <span className="p-i-lbl">APPLIED (DEDUCTED)</span>
                                        <span className="p-i-val deduct">-{preview.totalDays} Day{preview.totalDays !== 1 ? 's' : ''}</span>
                                        <span className={`p-i-sub ${preview.sandwichDays > 0 ? 'negative' : 'positive'}`}>
                                            {preview.sandwichDays > 0 ? 'Sandwich Applied' : 'No Sandwich'}
                                        </span>
                                    </div>

                                    {/* Column 3: Available Balance */}
                                    <div className="p-info-col">
                                        <span className="p-i-lbl">AVAILABLE BALANCE</span>
                                        <span className="p-i-val balance">
                                            {selectedPolicy?.leave_type?.toLowerCase().includes('lwp') ? 'Unlimited' : `${preview.projected_balance} Day${preview.projected_balance !== 1 ? 's' : ''}`}
                                        </span>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    )}

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
