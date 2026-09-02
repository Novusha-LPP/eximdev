import React, { useState, useEffect, useContext } from 'react';
import {
  FiX, FiCalendar, FiActivity, FiCheckCircle, FiAlertCircle, FiList, FiClock, FiEdit3,
  FiAlertTriangle, FiCheck, FiXCircle, FiChevronDown, FiChevronUp, FiRefreshCw
} from 'react-icons/fi';
import { UserContext } from '../../contexts/UserContext';
import leaveAPI from '../../api/attendance/leave.api';
import attendanceAPI from '../../api/attendance/attendance.api';
import toast from 'react-hot-toast';
import moment from 'moment';
import './LeaveManagement.css';

/**
 * Reusable Apply Leave Modal Component
 * 
 * Props:
 * - isOpen: boolean — controls modal visibility
 * - onClose: function — called when user closes modal
 * - onSuccess: function — called after successful submission
 * - balances: array — leave balance data
 * - initialDate: string (optional) — pre-fill from_date (format: "YYYY-MM-DD")
 */
const fmtDate = (value) => {
  if (!value) return '';
  return moment(value).isValid() ? moment(value).format('DD MMM YYYY') : String(value);
};

const fmtTime = (value) => {
  if (!value) return '--:--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getCorrectionStatusMeta = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'approved' || s === 'resolved') return { label: 'Resolved', cls: 'approved', icon: FiCheck };
  if (s === 'rejected') return { label: 'Rejected', cls: 'rejected', icon: FiXCircle };
  if (s === 'cancelled') return { label: 'Cancelled', cls: 'cancelled', icon: FiXCircle };
  return { label: 'Pending', cls: 'pending', icon: FiClock };
};

const ISSUE_TYPE_LABELS = {
  missing_punch: 'Missing Punch',
  absent: 'Marked Absent',
  half_day: 'Half Day Issue',
};

const ApplyLeaveModal = ({ isOpen, onClose, onSuccess, balances = [], initialDate = '', employeeId }) => {
  const { user } = useContext(UserContext);
  const [form, setForm] = useState({
    leave_policy_id: '',
    from_date: '',
    to_date: '',
    reason: '',
    is_half_day: false,
    half_day_session: 'first_half',
    attachment: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [existingApplications, setExistingApplications] = useState([]);
  const [hasOverlap, setHasOverlap] = useState(false);
  const [activeTab, setActiveTab] = useState('leave');
  const [attendanceDay, setAttendanceDay] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({ date: '', type: 'missing_punch', in_time: '', out_time: '', reason: '' });
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // Correction history state
  const [correctionHistory, setCorrectionHistory] = useState([]);
  const [correctionHistoryLoading, setCorrectionHistoryLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);
  const [correctionDatesSet, setCorrectionDatesSet] = useState(new Set()); // dates with corrections

  const selectedDate = activeTab === 'correction' ? (correctionForm.date || new Date().toISOString().slice(0, 10)) : (initialDate || form.from_date || new Date().toISOString().slice(0, 10));
  const selectedEmployeeId = employeeId || user?._id || user?.id;

  const selectedPolicy = balances.find(b => b._id === form.leave_policy_id);
  const isLwpPolicy = (policy) => String(policy?.leave_type || '').toLowerCase() === 'lwp';

  // Corrections already for the selected date
  const correctionsForDate = correctionHistory.filter(r => {
    const d = String(r.date || r.attendance_date || '').slice(0, 10);
    return d === selectedDate;
  });
  const hasPendingCorrectionForDate = correctionsForDate.some(r => {
    const s = String(r.status || '').toLowerCase();
    return s !== 'approved' && s !== 'resolved' && s !== 'rejected' && s !== 'cancelled';
  });

  // Check for overlapping leave applications
  const checkForOverlap = (fromDate, toDate) => {
    if (!fromDate || !toDate) {
      setHasOverlap(false);
      return;
    }

    const newFrom = new Date(fromDate);
    const newTo = new Date(toDate);

    const overlap = existingApplications.some(app => {
      if (!['approved', 'pending'].includes(app.status)) return false;
      const existingFrom = new Date(app.from_date);
      const existingTo = new Date(app.to_date);
      return newFrom <= existingTo && newTo >= existingFrom;
    });

    setHasOverlap(overlap);
    if (overlap) {
      toast.error('You already have a leave application for these dates');
    }
  };

  // Fetch correction history
  const fetchCorrectionHistory = async () => {
    try {
      setCorrectionHistoryLoading(true);
      const res = await attendanceAPI.getRegularizations({ limit: 50 });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.requests) ? res.requests : [];
      setCorrectionHistory(list);
      // Build set of dates that have corrections (non-cancelled, non-rejected)
      const datesWithCorr = new Set();
      list.forEach(r => {
        const s = String(r.status || '').toLowerCase();
        if (s !== 'cancelled') {
          const d = String(r.date || r.attendance_date || '').slice(0, 10);
          if (d) datesWithCorr.add(d);
        }
      });
      setCorrectionDatesSet(datesWithCorr);
    } catch (err) {
      console.error('Failed to fetch correction history:', err);
    } finally {
      setCorrectionHistoryLoading(false);
    }
  };

  // Cancel correction request
  const handleCancelCorrection = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this request?")) return;
    try {
      setCorrectionHistoryLoading(true);
      await attendanceAPI.cancelRegularization(id);
      toast.success("Correction request cancelled");
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        toast.info("Request was already processed or cancelled");
      } else {
        toast.error(err?.response?.data?.message || err?.message || "Failed to cancel request");
      }
    } finally {
      await fetchCorrectionHistory();
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setForm({
        leave_policy_id: '',
        from_date: '',
        to_date: '',
        reason: '',
        is_half_day: false,
        half_day_session: 'first_half',
        attachment: null,
      });
      setPreview(null);
      setHasOverlap(false);
      setActiveTab('leave');
      setAttendanceDay(null);
      setCorrectionForm({ date: '', type: 'missing_punch', in_time: '', out_time: '', reason: '' });
      setExpandedLog(null);
    } else {
      fetchExistingApplications();
      fetchCorrectionHistory();
      if (initialDate) {
        setForm(prev => ({
          ...prev,
          from_date: initialDate,
          to_date: initialDate,
        }));
        setCorrectionForm(cf => ({ ...cf, date: initialDate }));
      } else {
        const today = new Date().toISOString().slice(0, 10);
        setCorrectionForm(cf => ({ ...cf, date: today }));
      }
    }
  }, [isOpen, initialDate]);

  useEffect(() => {
    if (!isOpen || (activeTab !== 'attendance' && activeTab !== 'correction') || !selectedDate) return;

    const fetchAttendanceDay = async () => {
      try {
        setAttendanceLoading(true);
        const res = await attendanceAPI.getHistory({
          employee_id: selectedEmployeeId,
          startDate: selectedDate,
          endDate: selectedDate,
          limit: 10,
        });

        const records = Array.isArray(res?.data) ? res.data : [];
        const target = records.find(r => String(r.attendance_date || '').slice(0, 10) === selectedDate) || records[0] || null;
        setAttendanceDay(target);
      } catch (err) {
        console.error('Failed to fetch attendance logs:', err);
        setAttendanceDay(null);
      } finally {
        setAttendanceLoading(false);
      }
    };

    fetchAttendanceDay();
  }, [isOpen, activeTab, selectedDate, selectedEmployeeId]);

  // Auto pre-fill correction form when attendanceDay is fetched
  useEffect(() => {
    if (activeTab === 'correction' && attendanceDay) {
      const inTime = attendanceDay.first_in ? new Date(attendanceDay.first_in).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '';
      const outTime = attendanceDay.last_out ? new Date(attendanceDay.last_out).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '';
      
      setCorrectionForm(prev => ({
        ...prev,
        in_time: prev.in_time || inTime,
        out_time: prev.out_time || outTime,
        type: (inTime && !outTime) ? 'missing_punch' : (!inTime && outTime) ? 'missing_punch' : (inTime && outTime) ? 'half_day' : 'absent'
      }));
    }
  }, [attendanceDay, activeTab]);

  // Fetch existing leave applications
  const fetchExistingApplications = async () => {
    try {
      const res = await leaveAPI.getApplications();
      setExistingApplications(res?.data || []);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    }
  };

  // Real-time Preview Effect
  useEffect(() => {
    checkForOverlap(form.from_date, form.to_date);

    const getPreview = async () => {
      if (form.leave_policy_id && form.from_date && form.to_date) {
        setLoadingPreview(true);
        try {
          const res = await leaveAPI.previewLeave({
            leave_policy_id: form.leave_policy_id,
            from_date: form.from_date,
            to_date: form.to_date,
            is_half_day: form.is_half_day.toString(),
            is_start_half_day: 'false',
            is_end_half_day: 'false',
            start_half_session: form.half_day_session,
            end_half_session: form.half_day_session
          });

          if (res.success) {
            setPreview(res.data);
          }
        } catch (err) {
          console.error('[Preview Error]', err);
          setPreview(null);
        } finally {
          setLoadingPreview(false);
        }
      } else {
        setPreview(null);
      }
    };

    const timer = setTimeout(getPreview, 500);
    return () => clearTimeout(timer);
  }, [form.leave_policy_id, form.from_date, form.to_date, form.is_half_day, form.half_day_session, existingApplications]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('leave_policy_id', form.leave_policy_id);
      fd.append('from_date', form.from_date);
      fd.append('to_date', form.to_date);
      fd.append('reason', form.reason);
      fd.append('is_half_day', form.is_half_day);
      if (form.is_half_day) fd.append('half_day_session', form.half_day_session);
      if (form.attachment) fd.append('attachment', form.attachment);

      await leaveAPI.applyLeave(fd);
      toast.success('Leave application submitted');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const workSessions = Array.isArray(attendanceDay?.work_sessions) ? attendanceDay.work_sessions : [];
  const punchCount = attendanceDay?.total_punches ?? workSessions.length * 2;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="lm-modal" onClick={e => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="lm-modal-head">
          <h2><FiCalendar size={15} /> Apply for Leave</h2>
          <button className="lm-mclose" onClick={onClose}>
            <FiX size={13} />
          </button>
        </div>

        {/* ── Improved Tabs ── */}
        <div className="alm-tabs">
          <button
            type="button"
            className={`alm-tab ${activeTab === 'leave' ? 'active' : ''}`}
            onClick={() => setActiveTab('leave')}
          >
            <span className="alm-tab-icon"><FiCalendar size={14} /></span>
            <span className="alm-tab-label">Leave</span>
          </button>
          <button
            type="button"
            className={`alm-tab ${activeTab === 'correction' ? 'active' : ''} ${correctionHistory.length > 0 ? 'has-badge' : ''}`}
            onClick={() => setActiveTab('correction')}
          >
            <span className="alm-tab-icon"><FiEdit3 size={14} /></span>
            <span className="alm-tab-label">Correction</span>
            {correctionHistory.filter(r => {
              const s = String(r.status || '').toLowerCase();
              return s !== 'approved' && s !== 'resolved' && s !== 'cancelled' && s !== 'rejected';
            }).length > 0 && (
              <span className="alm-tab-count">
                {correctionHistory.filter(r => {
                  const s = String(r.status || '').toLowerCase();
                  return s !== 'approved' && s !== 'resolved' && s !== 'cancelled' && s !== 'rejected';
                }).length}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`alm-tab ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            <span className="alm-tab-icon"><FiList size={14} /></span>
            <span className="alm-tab-label">Attendance Logs</span>
          </button>
        </div>

        <div className="lm-form">

          {/* ── ATTENDANCE LOG TAB ── */}
          {activeTab === 'attendance' && (
            <div className="attendance-log-panel">
              <div className="lm-modal-split">
                {/* Left Side: Controls & Summary */}
                <div>
                  <div className="attendance-log-head" style={{ padding: 0, marginBottom: '16px', borderBottom: 'none' }}>
                    <div style={{ flex: 1 }}>
                      <div className="attendance-log-title">Attendance logs for {fmtDate(selectedDate)}</div>
                      <div className="attendance-log-subtitle">Select date to view punch logs.</div>
                    </div>
                  </div>
                  <div className="fg" style={{ marginBottom: '16px' }}>
                    <label>SELECT DATE</label>
                    <input type="date" 
                      className="lm-date-picker" 
                      style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', width: '100%' }}
                      value={form.from_date || new Date().toISOString().slice(0, 10)} 
                      onChange={(e) => {
                        setForm(v => ({ ...v, from_date: e.target.value, to_date: e.target.value }));
                        setCorrectionForm(v => ({ ...v, date: e.target.value }));
                      }}
                    />
                  </div>

                  {attendanceLoading ? (
                    <div className="attendance-log-empty">Loading attendance logs...</div>
                  ) : attendanceDay ? (
                    <div className="attendance-log-summary" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: 0, padding: '12px', background: 'var(--card2)', border: '1px solid var(--b1)', borderRadius: '8px' }}>
                      <div className="attendance-log-stat" style={{ margin: 0, padding: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Status</span>
                        <strong style={{ fontSize: '13px' }}>{String(attendanceDay.status || '-').replace(/_/g, ' ')}</strong>
                      </div>
                      <div className="attendance-log-stat" style={{ margin: 0, padding: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Punch Count</span>
                        <strong style={{ fontSize: '13px' }}>{punchCount || 0}</strong>
                      </div>
                      <div className="attendance-log-stat" style={{ margin: 0, padding: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>First Punch In</span>
                        <strong style={{ fontSize: '13px' }}>{fmtTime(attendanceDay.first_in)}</strong>
                      </div>
                      <div className="attendance-log-stat" style={{ margin: 0, padding: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Last Punch Out</span>
                        <strong style={{ fontSize: '13px' }}>{fmtTime(attendanceDay.last_out)}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="attendance-log-empty">No attendance record found.</div>
                  )}
                </div>

                {/* Right Side: Session Cards */}
                <div>
                  <div className="attendance-log-title" style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 600 }}>Work Sessions</div>
                  {attendanceLoading ? (
                    <div className="attendance-log-empty">Loading...</div>
                  ) : attendanceDay && workSessions.length > 0 ? (
                    <div className="attendance-session-list" style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {workSessions.map((session, index) => (
                        <div key={`${session.session_number || index}-${index}`} className="attendance-session-card" style={{ margin: 0 }}>
                          <div className="attendance-session-top">
                            <div className="attendance-session-name">Session {session.session_number || index + 1}</div>
                            <div className={`attendance-session-badge ${session.is_incomplete ? 'warn' : 'ok'}`}>
                              {session.is_incomplete ? 'Incomplete' : 'Completed'}
                            </div>
                          </div>
                          <div className="attendance-session-grid">
                            <div>
                              <span>In</span>
                              <strong>{fmtTime(session.punch_in_time)}</strong>
                            </div>
                            <div>
                              <span>Out</span>
                              <strong>{fmtTime(session.punch_out_time)}</strong>
                            </div>
                            <div>
                              <span>Duration</span>
                              <strong>{typeof session.duration_hours === 'number' ? `${session.duration_hours.toFixed(2)}h` : '--'}</strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="attendance-log-empty">No punch sessions found for this day.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── LEAVE TAB ── */}
          {activeTab === 'leave' && (
            <form onSubmit={handleSubmit} className="leave-tab-form">
              <div className="lm-modal-split">
                {/* Left Side: Form Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Leave type */}
                  <div className="fg">
                    <label>LEAVE TYPE</label>
                    <select
                      value={form.leave_policy_id}
                      onChange={e => setForm({ ...form, leave_policy_id: e.target.value })}
                      required
                    >
                      <option value="">Select leave type...</option>
                      {balances.map(b => {
                        const netBalance = isLwpPolicy(b) ? 'Unlimited' : (b.available ?? (b.opening_balance - (b.used || 0) - (b.pending || 0)));
                        return (
                          <option key={b._id} value={b._id}>
                            {b.name}
                            {isLwpPolicy(b) ? ' (Unlimited)' : ` • ${netBalance} days left`}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Dates Row */}
                  <div className="fg2">
                    <div className="fg">
                      <label>FROM DATE</label>
                      <input 
                        type="date" 
                        value={form.from_date} 
                        onChange={e => setForm({ ...form, from_date: e.target.value })} 
                        required 
                      />
                    </div>
                    <div className="fg">
                      <label>TO DATE</label>
                      <input 
                        type="date" 
                        value={form.to_date} 
                        min={form.from_date} 
                        onChange={e => setForm({ ...form, to_date: e.target.value })} 
                        required 
                      />
                    </div>
                  </div>

                  {/* Half Day Option */}
                  <div className="fg">
                    <label>HALF DAY</label>
                    <div className="form-block" style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={form.is_half_day}
                          onChange={e => setForm(v => ({ ...v, is_half_day: e.target.checked }))}
                        />
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>Apply as Half Day</span>
                      </label>
                      {form.is_half_day && (
                        <select
                          style={{ fontSize: '11px', padding: '2px 4px', height: '24px', width: 'auto' }}
                          value={form.half_day_session}
                          onChange={e => setForm(v => ({ ...v, half_day_session: e.target.value }))}
                        >
                          <option value="first_half">First Half</option>
                          <option value="second_half">Second Half</option>
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Attachment */}
                  <div className="fg">
                    <label>SUPPORTING DOCUMENT <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                    <input type="file" onChange={e => setForm({ ...form, attachment: e.target.files[0] })} />
                  </div>
                </div>

                {/* Right Side: Reason + Preview + Submit */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Reason */}
                    <div className="fg">
                      <label>REASON</label>
                      <textarea
                        value={form.reason}
                        onChange={e => setForm({ ...form, reason: e.target.value })}
                        required
                        rows={4}
                        placeholder="Briefly describe the reason for your leave..."
                        style={{ resize: 'none' }}
                      />
                    </div>

                    {/* Overlap Warning */}
                    {hasOverlap && (
                      <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: '.8125rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FiAlertCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
                        <span style={{ color: '#991b1b' }}>You already have a leave application for these dates</span>
                      </div>
                    )}

                    {/* Preview Box */}
                    {form.leave_policy_id && form.from_date && form.to_date && !hasOverlap && (
                      <div className={`preview-infobox ani-in${loadingPreview ? ' loading' : ''}`} style={{ marginTop: 0 }}>
                        {loadingPreview ? (
                          <div className="proj-loader" style={{ gridColumn: 'span 3' }}>
                              <FiActivity className="animate-spin" size={14} />
                              Calculating statistics...
                          </div>
                        ) : preview ? (
                          <>
                            {/* Column 1: Total Range */}
                            <div className="p-info-col">
                              <span className="p-i-lbl">TOTAL RANGE</span>
                              <span className="p-i-val" style={{ fontSize: '1.1rem' }}>{preview.breakdown?.total_range} Day{preview.breakdown?.total_range !== 1 ? 's' : ''}</span>
                              {preview.breakdown?.holiday_days > 0 && <span className="p-i-sub positive">+{preview.breakdown.holiday_days} Holiday</span>}
                              {preview.breakdown?.weekly_off_days > 0 && <span className="p-i-sub positive">+{preview.breakdown.weekly_off_days} Week-off</span>}
                            </div>

                            {/* Column 2: Applied / Deducted */}
                            <div className="p-info-col">
                              <span className="p-i-lbl">APPLIED</span>
                              <span className="p-i-val deduct" style={{ fontSize: '1.1rem' }}>-{preview.totalDays} Day{preview.totalDays !== 1 ? 's' : ''}</span>
                              <span className={`p-i-sub ${preview.sandwichDays > 0 ? 'negative' : 'positive'}`}>
                                 {preview.sandwichDays > 0 ? 'Sandwich' : 'No Sandwich'}
                              </span>
                            </div>

                            {/* Column 3: Available Balance */}
                            <div className="p-info-col">
                              <span className="p-i-lbl">AVAILABLE</span>
                              <span className="p-i-val balance" style={{ fontSize: '1.1rem' }}>
                                  {isLwpPolicy(selectedPolicy) ? 'Unlimited' : `${preview.available} Day${preview.available !== 1 ? 's' : ''}`}
                              </span>
                              <span className={`p-i-sub ${preview.projected_balance < 0 ? 'negative' : 'positive'}`}>
                                  After: {preview.projected_balance}
                              </span>
                            </div>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="lm-mfooter" style={{ padding: '10px 0 0 0', borderTop: 'none', background: 'transparent' }}>
                    <button
                      type="submit"
                      className="lm-submit"
                      disabled={submitting || !form.leave_policy_id || !form.from_date || !form.to_date || hasOverlap}
                      style={{ width: '100%' }}
                    >
                      {submitting ? (
                        <><FiActivity className="animate-spin" size={16} /> Submitting...</>
                      ) : (
                        <><FiCheckCircle size={16} /> Submit Request</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* ── CORRECTION TAB ── */}
          {activeTab === 'correction' && (
            <div className="correction-tab-panel">

              {/* ── Improved Correction Header ── */}
              <div className="corr-header">
                <div className="corr-header-icon">
                  <FiEdit3 size={18} />
                </div>
                <div className="corr-header-body">
                  <div className="corr-header-title">Request Attendance Correction</div>
                  <div className="corr-header-sub">
                    Report incorrect punch times, missed punches or wrongly marked absences
                  </div>
                </div>
                {correctionHistoryLoading ? (
                  <FiRefreshCw size={14} className="corr-header-refresh spinning" />
                ) : (
                  <button className="corr-header-refresh-btn" onClick={fetchCorrectionHistory} title="Refresh history">
                    <FiRefreshCw size={14} />
                  </button>
                )}
              </div>

              {/* ── Alert if already have correction for this date ── */}
              {hasPendingCorrectionForDate && (
                <div className="corr-already-alert" style={{ marginBottom: '16px' }}>
                  <FiAlertTriangle size={14} />
                  <span>You already have a pending correction request for <strong>{fmtDate(selectedDate)}</strong>.</span>
                </div>
              )}

              <div className="lm-modal-split">
                {/* Left Side: Correction Form */}
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    setSubmittingCorrection(true);
                    await attendanceAPI.requestRegularization({
                      date: correctionForm.date,
                      type: correctionForm.type,
                      in_time: correctionForm.in_time,
                      out_time: correctionForm.out_time,
                      reason: correctionForm.reason
                    });
                    toast.success('Correction request submitted');
                    setSubmittingCorrection(false);
                    await fetchCorrectionHistory();
                    onClose();
                    if (onSuccess) onSuccess();
                  } catch (err) {
                    setSubmittingCorrection(false);
                    toast.error(err?.message || err?.response?.data?.message || 'Failed to submit correction');
                  }
                }} className="corr-form" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                  
                  <div className="fg" style={{ marginBottom: '12px' }}>
                    <label>DATE</label>
                    <input type="date" value={correctionForm.date} onChange={e => {
                      setCorrectionForm(v => ({ ...v, date: e.target.value }));
                    }} required />
                    {correctionDatesSet.has(correctionForm.date) && (
                      <span className="corr-date-hint">
                        <FiAlertTriangle size={11} /> Correction previously submitted for this date
                      </span>
                    )}
                  </div>

                  <div className="fg" style={{ marginBottom: '12px' }}>
                    <label>ISSUE TYPE</label>
                    <select value={correctionForm.type} onChange={e => setCorrectionForm(v => ({ ...v, type: e.target.value }))} required>
                      <option value="missing_punch">Missing Punch</option>
                      <option value="absent">Absent</option>
                      <option value="half_day">Half Day</option>
                    </select>
                  </div>

                  <div className="mfg2" style={{ marginBottom: '12px' }}>
                    <div className="mfg">
                      <label>Check-in Time</label>
                      <input type="time" value={correctionForm.in_time} onChange={e => setCorrectionForm(v => ({ ...v, in_time: e.target.value }))} />
                    </div>
                    <div className="mfg">
                      <label>Check-out Time</label>
                      <input type="time" value={correctionForm.out_time} onChange={e => setCorrectionForm(v => ({ ...v, out_time: e.target.value }))} />
                    </div>
                  </div>

                  <div className="fg" style={{ marginBottom: '16px' }}>
                    <label>REASON</label>
                    <textarea value={correctionForm.reason} onChange={e => setCorrectionForm(v => ({ ...v, reason: e.target.value }))} required rows={3} placeholder="Explain why the correction is needed" />
                  </div>

                  <div className="lm-mfooter" style={{ padding: 0, borderTop: 'none', background: 'transparent' }}>
                    <button type="submit" className="lm-submit" disabled={submittingCorrection || !correctionForm.date || !correctionForm.reason} style={{ width: '100%' }}>
                      {submittingCorrection ? (<><FiActivity className="animate-spin" size={16} /> Submitting...</>) : (<><FiCheckCircle size={16} /> Submit Correction</>)}
                    </button>
                  </div>
                </form>

                {/* Right Side: Current Log Card + History */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* ── Current Log Card ── */}
                  {attendanceLoading ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                      <FiActivity className="animate-spin" style={{ marginRight: '6px' }} /> Fetching date context...
                    </div>
                  ) : attendanceDay && (
                    <div className="corr-current-log" style={{ margin: 0 }}>
                      <div className="corr-log-icon">
                        <FiClock size={15} />
                      </div>
                      <div className="corr-log-body">
                        <div className="corr-log-title">Current Log — {fmtDate(selectedDate)}</div>
                        <div className="corr-log-times">
                          <span className="corr-log-time-item">
                            <span className="corr-log-time-lbl">First In</span>
                            <strong>{fmtTime(attendanceDay.first_in)}</strong>
                          </span>
                          <span className="corr-log-sep">→</span>
                          <span className="corr-log-time-item">
                            <span className="corr-log-time-lbl">Last Out</span>
                            <strong>{fmtTime(attendanceDay.last_out)}</strong>
                          </span>
                          <span className={`corr-log-status-badge corr-status-${String(attendanceDay.status || '').toLowerCase()}`}>
                            {String(attendanceDay.status || 'No Record').replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Correction Log History ── */}
                  {correctionHistory.length > 0 && (
                    <div className="corr-history-section" style={{ marginTop: 0 }}>
                      <div className="corr-history-header">
                        <span className="corr-history-title">
                          <FiList size={13} /> My Correction Requests
                        </span>
                        <span className="corr-history-count">
                          {correctionHistory.filter(req => String(req.status || '').toLowerCase() === 'pending').length}
                        </span>
                      </div>

                      <div className="corr-history-list" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                        {[...correctionHistory]
                          .sort((a, b) => {
                            const stA = String(a.status || '').toLowerCase();
                            const stB = String(b.status || '').toLowerCase();
                            if (stA === 'pending' && stB !== 'pending') return -1;
                            if (stA !== 'pending' && stB === 'pending') return 1;
                            const dateA = new Date(a.date || a.attendance_date || 0);
                            const dateB = new Date(b.date || b.attendance_date || 0);
                            return dateB - dateA;
                          })
                          .slice(0, 8)
                          .map((req, idx) => {
                          const reqDate = String(req.date || req.attendance_date || '').slice(0, 10);
                          const meta = getCorrectionStatusMeta(req.status);
                          const StatusIcon = meta.icon;
                          const isExpanded = expandedLog === (req._id || idx);
                          return (
                            <div
                              key={req._id || idx}
                              className={`corr-history-item ${meta.cls}`}
                              onClick={() => setExpandedLog(isExpanded ? null : (req._id || idx))}
                            >
                              <div className="corr-history-item-main">
                                <div className="corr-history-item-left">
                                  <div className={`corr-status-dot corr-dot-${meta.cls}`} />
                                  <div className="corr-history-item-info">
                                    <div className="corr-history-item-date">{fmtDate(reqDate)}</div>
                                    <div className="corr-history-item-type">{ISSUE_TYPE_LABELS[req.type] || req.type || 'Correction'}</div>
                                  </div>
                                </div>
                                <div className="corr-history-item-right">
                                  {String(req.status || '').toLowerCase() === 'pending' && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleCancelCorrection(req._id || req.id); }}
                                      className="corr-cancel-btn-inline"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                  <span className={`corr-status-pill corr-pill-${meta.cls}`}>
                                    <StatusIcon size={10} /> {meta.label}
                                  </span>
                                  {isExpanded ? <FiChevronUp size={12} style={{ color: '#94a3b8' }} /> : <FiChevronDown size={12} style={{ color: '#94a3b8' }} />}
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="corr-history-item-detail">
                                  {req.reason && (
                                    <div className="corr-detail-row">
                                      <span className="corr-detail-lbl">Reason</span>
                                      <span className="corr-detail-val">{req.reason}</span>
                                    </div>
                                  )}
                                  {(req.in_time || req.requested_in_time) && (
                                    <div className="corr-detail-row">
                                      <span className="corr-detail-lbl">Requested In</span>
                                      <span className="corr-detail-val">{req.in_time || req.requested_in_time}</span>
                                    </div>
                                  )}
                                  {(req.out_time || req.requested_out_time) && (
                                    <div className="corr-detail-row">
                                      <span className="corr-detail-lbl">Requested Out</span>
                                      <span className="corr-detail-val">{req.out_time || req.requested_out_time}</span>
                                    </div>
                                  )}
                                  {req.approval_remarks && (
                                    <div className="corr-detail-row">
                                      <span className="corr-detail-lbl">Remarks</span>
                                      <span className="corr-detail-val">{req.approval_remarks}</span>
                                    </div>
                                  )}
                                  {req.createdAt && (
                                    <div className="corr-detail-row">
                                      <span className="corr-detail-lbl">Applied On</span>
                                      <span className="corr-detail-val">{fmtDate(req.createdAt)}</span>
                                    </div>
                                  )}
                                  {String(req.status || '').toLowerCase() === 'pending' && (
                                    <div style={{ marginTop: '8px' }}>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleCancelCorrection(req._id || req.id); }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '4px 10px',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          color: '#ef4444',
                                          background: '#fef2f2',
                                          border: '1px solid #fecaca',
                                          borderRadius: '4px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        <FiXCircle size={12} /> Cancel Request
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplyLeaveModal;
