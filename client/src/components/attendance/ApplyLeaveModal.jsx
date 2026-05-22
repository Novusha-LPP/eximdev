import React, { useState, useEffect, useContext } from 'react';
import {
  FiX, FiCalendar, FiActivity, FiCheckCircle, FiAlertCircle, FiList, FiClock, FiEdit3
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

  const selectedDate = activeTab === 'correction' ? (correctionForm.date || new Date().toISOString().slice(0, 10)) : (initialDate || form.from_date || new Date().toISOString().slice(0, 10));
  const selectedEmployeeId = employeeId || user?._id || user?.id;

  const selectedPolicy = balances.find(b => b._id === form.leave_policy_id);
  const isLwpPolicy = (policy) => String(policy?.leave_type || '').toLowerCase() === 'lwp';

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
      
      // Check if ranges overlap
      return newFrom <= existingTo && newTo >= existingFrom;
    });

    setHasOverlap(overlap);
    if (overlap) {
      toast.error('You already have a leave application for these dates');
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
    } else {
      // Fetch existing applications when modal opens
      fetchExistingApplications();
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
    // Check for overlapping leaves first
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

    const timer = setTimeout(getPreview, 500); // 500ms debounce
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
        <div className="lm-modal-head">
          <h2><FiCalendar size={15} /> Apply for Leave</h2>
          <button className="lm-mclose" onClick={onClose}>
            <FiX size={13} />
          </button>
        </div>

        <div className="aam-tabs" style={{ margin: '0 18px 16px' }}>
          <button
            type="button"
            className={`aam-tab ${activeTab === 'leave' ? 'active' : ''}`}
            onClick={() => setActiveTab('leave')}
          >
            <FiCalendar size={13} /> Leave
          </button>
          <button
            type="button"
            className={`aam-tab ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            <FiList size={13} /> Attendance Logs
          </button>
          <button
            type="button"
            className={`aam-tab ${activeTab === 'correction' ? 'active' : ''}`}
            onClick={() => setActiveTab('correction')}
          >
            <FiEdit3 size={13} /> Request for Correction
          </button>
        </div>

        <div className="lm-form">

          {activeTab === 'attendance' && (
            <div className="attendance-log-panel">
              <div className="attendance-log-head">
                <div style={{ flex: 1 }}>
                  <div className="attendance-log-title">Attendance logs for {fmtDate(selectedDate)}</div>
                  <div className="attendance-log-subtitle">Punch sequence for the selected day.</div>
                </div>
                <div>
                  <input type="date" 
                    className="lm-date-picker" 
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                    value={form.from_date || new Date().toISOString().slice(0, 10)} 
                    onChange={(e) => {
                      setForm(v => ({ ...v, from_date: e.target.value, to_date: e.target.value }));
                      setCorrectionForm(v => ({ ...v, date: e.target.value }));
                    }}
                  />
                </div>
              </div>

              {attendanceLoading ? (
                <div className="attendance-log-empty">Loading attendance logs...</div>
              ) : attendanceDay ? (
                <>
                  <div className="attendance-log-summary">
                    <div className="attendance-log-stat">
                      <span>Status</span>
                      <strong>{String(attendanceDay.status || '-').replace(/_/g, ' ')}</strong>
                    </div>
                    <div className="attendance-log-stat">
                      <span>First Punch In</span>
                      <strong>{fmtTime(attendanceDay.first_in)}</strong>
                    </div>
                    <div className="attendance-log-stat">
                      <span>Last Punch Out</span>
                      <strong>{fmtTime(attendanceDay.last_out)}</strong>
                    </div>
                    <div className="attendance-log-stat">
                      <span>Punch Count</span>
                      <strong>{punchCount || 0}</strong>
                    </div>
                  </div>

                  <div className="attendance-session-list">
                    {workSessions.length > 0 ? workSessions.map((session, index) => (
                      <div key={`${session.session_number || index}-${index}`} className="attendance-session-card">
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
                    )) : (
                      <div className="attendance-log-empty">No punch sessions found for this day.</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="attendance-log-empty">No attendance record found for this day.</div>
              )}
            </div>
          )}

          {activeTab === 'leave' && (
            <form onSubmit={handleSubmit} className="leave-tab-form">

          {/* Form Grid */}
          <div className="form-grid">
            {/* Leave type - full width */}
            <div className="fg" style={{ gridColumn: 'span 2' }}>
              <label>LEAVE TYPE</label>
              <select
                value={form.leave_policy_id}
                onChange={e => setForm({ ...form, leave_policy_id: e.target.value })}
                required
              >
                <option value="">Select leave type...</option>
                {balances
                  .map(b => {
                    const netBalance = isLwpPolicy(b) ? 'Unlimited' : (b.available ?? (b.opening_balance - (b.used || 0) - (b.pending || 0)));
                    return (
                      <option key={b._id} value={b._id}>
                        {b.name}
                        {isLwpPolicy(b) ? ' (Unlimited)' : ` • ${netBalance} days left`}
                      </option>
                    );
                  })
                }
              </select>
            </div>

            {/* From Date */}
            <div className="fg">
              <label>FROM DATE</label>
              <input 
                type="date" 
                value={form.from_date} 
                onChange={e => setForm({ ...form, from_date: e.target.value })} 
                required 
              />
            </div>

            {/* To Date */}
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

            {/* Half Day Option - full width */}
            <div className="fg" style={{ gridColumn: 'span 2' }}>
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
          </div>

          {/* Reason */}
          <div className="fg">
            <label>REASON</label>
            <textarea
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              required
              rows={3}
              placeholder="Briefly describe the reason for your leave..."
            />
          </div>

          {/* Attachment */}
          <div className="fg">
            <label>SUPPORTING DOCUMENT <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
            <input type="file" onChange={e => setForm({ ...form, attachment: e.target.files[0] })} />
          </div>

          {/* Overlap Warning */}
          {hasOverlap && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '.8125rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiAlertCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
              <span style={{ color: '#991b1b' }}>You already have a leave application for these dates</span>
            </div>
          )}

          {/* 3-Column Preview Box */}
          {form.leave_policy_id && form.from_date && form.to_date && !hasOverlap && (
            <div className={`preview-infobox ani-in${loadingPreview ? ' loading' : ''}`}>
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

          <div className="lm-mfooter">
            <button
              type="submit"
              className="lm-submit"
              disabled={submitting || !form.leave_policy_id || !form.from_date || !form.to_date || hasOverlap}
            >
              {submitting ? (
                <><FiActivity className="animate-spin" size={16} /> Submitting...</>
              ) : (
                <><FiCheckCircle size={16} /> Submit Request</>
              )}
            </button>
            </div>
            </form>
          )}

          {activeTab === 'correction' && (
            <div className="correction-tab-panel" style={{ padding: '4px 6px' }}>
              {attendanceLoading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                  <FiActivity className="animate-spin" style={{ marginRight: '6px' }} /> Fetching date context...
                </div>
              ) : (
                <>
                  {attendanceDay && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '8px', borderRadius: '50%' }}>
                        <FiClock size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>Current Log for {fmtDate(selectedDate)}</div>
                        <div style={{ color: '#64748b', fontSize: '12px' }}>
                          First In: <strong style={{ color: '#475569' }}>{fmtTime(attendanceDay.first_in)}</strong> |
                          Last Out: <strong style={{ color: '#475569' }}>{fmtTime(attendanceDay.last_out)}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      setSubmittingCorrection(true);
                      // payload expects: date, type, in_time, out_time, reason
                      await attendanceAPI.requestRegularization({
                        date: correctionForm.date,
                        type: correctionForm.type,
                        in_time: correctionForm.in_time,
                        out_time: correctionForm.out_time,
                        reason: correctionForm.reason
                      });
                      toast.success('Correction request submitted');
                      setSubmittingCorrection(false);
                      onClose();
                      if (onSuccess) onSuccess();
                    } catch (err) {
                      setSubmittingCorrection(false);
                      toast.error(err?.message || err?.response?.data?.message || 'Failed to submit correction');
                    }
                  }}>
                    <div className="fg">
                      <label>DATE</label>
                      <input type="date" value={correctionForm.date} onChange={e => setCorrectionForm(v => ({ ...v, date: e.target.value }))} required />
                    </div>

                    <div className="fg">
                      <label>ISSUE TYPE</label>
                      <select value={correctionForm.type} onChange={e => setCorrectionForm(v => ({ ...v, type: e.target.value }))} required>
                        <option value="missing_punch">Missing Punch</option>
                        <option value="absent">Absent</option>
                        <option value="half_day">Half Day</option>
                      </select>
                    </div>

                    <div className="mfg2">
                      <div className="mfg">
                        <label>Check-in Time</label>
                        <input type="time" value={correctionForm.in_time} onChange={e => setCorrectionForm(v => ({ ...v, in_time: e.target.value }))} />
                      </div>
                      <div className="mfg">
                        <label>Check-out Time</label>
                        <input type="time" value={correctionForm.out_time} onChange={e => setCorrectionForm(v => ({ ...v, out_time: e.target.value }))} />
                      </div>
                    </div>

                    <div className="fg">
                      <label>REASON</label>
                      <textarea value={correctionForm.reason} onChange={e => setCorrectionForm(v => ({ ...v, reason: e.target.value }))} required rows={3} placeholder="Explain why the correction is needed" />
                    </div>

                    <div className="lm-mfooter">
                      <button type="submit" className="lm-submit" disabled={submittingCorrection || !correctionForm.date || !correctionForm.reason}>
                        {submittingCorrection ? (<><FiActivity className="animate-spin" size={16} /> Submitting...</>) : (<><FiCheckCircle size={16} /> Submit Correction</>)}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplyLeaveModal;
