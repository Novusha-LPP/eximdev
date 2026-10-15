import React, { useState, useEffect } from 'react';
import { FiPlus, FiFileText, FiCheckCircle, FiXCircle, FiClock, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import attendanceV2API from '../../api/attendance/attendanceV2.api';

const AttendanceV2Leaves = () => {
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [halfDayOption, setHalfDayOption] = useState('NONE');
  const [reason, setReason] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [balRes, typesRes, appsRes] = await Promise.all([
        attendanceV2API.getLeaveBalances().catch(() => []),
        attendanceV2API.getLeaveTypes().catch(() => []),
        attendanceV2API.getLeaveApplications().catch(() => []),
      ]);

      setBalances(Array.isArray(balRes) ? balRes : []);
      setLeaveTypes(Array.isArray(typesRes) ? typesRes : []);
      setApplications(Array.isArray(appsRes) ? appsRes : []);

      if (Array.isArray(typesRes) && typesRes.length > 0 && !leaveTypeId) {
        setLeaveTypeId(typesRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load leave data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!leaveTypeId || !fromDate || !toDate) {
      toast.error('Please select leave type and date range');
      return;
    }

    setSubmitting(true);
    try {
      await attendanceV2API.applyLeave({
        leave_type_id: leaveTypeId,
        from_date: fromDate,
        to_date: toDate,
        half_day_option: halfDayOption,
        reason,
      });

      toast.success('Leave application submitted for approval');
      setShowModal(false);
      setFromDate('');
      setToDate('');
      setReason('');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to apply for leave');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (appId) => {
    if (!window.confirm('Are you sure you want to cancel this leave application?')) return;

    try {
      await attendanceV2API.cancelLeave(appId);
      toast.success('Leave application cancelled');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel leave');
    }
  };

  return (
    <div>
      {/* Leave Balances Grid */}
      <div className="att-v2-card-header" style={{ marginBottom: '16px' }}>
        <h3>
          <FiFileText className="text-primary" />
          <span>Leave Balances (FY 2026-27)</span>
        </h3>
        <button className="att-v2-btn-primary" onClick={() => setShowModal(true)}>
          <FiPlus size={16} />
          <span>Apply Leave</span>
        </button>
      </div>

      <div className="att-v2-balances-grid">
        {balances.length === 0 ? (
          <div style={{ padding: '24px', color: '#64748b' }}>No leave balances active.</div>
        ) : (
          balances.map((b) => {
            const avail = b.available_days ?? 0;
            const alloc = b.allocated_days || 1;
            const used = b.used_days || 0;
            const pct = Math.min(100, Math.round((avail / alloc) * 100));

            return (
              <div key={b.id || b.leave_type_id} className="att-v2-balance-card">
                <div className="att-v2-balance-card-top">
                  <span className="att-v2-balance-name">{b.leave_type_name}</span>
                  <span className="att-v2-balance-code">{b.leave_type_code}</span>
                </div>
                <div className="att-v2-balance-main">
                  <span className="att-v2-balance-avail">{avail}</span>
                  <span className="att-v2-balance-total">/ {alloc} days left</span>
                </div>
                <div className="att-v2-progress-bar">
                  <div className="att-v2-progress-fill" style={{ width: `${pct}%`, background: b.color || '#4f46e5' }} />
                </div>
                <div className="att-v2-balance-footer">
                  <span>Used: {used}d</span>
                  <span>Pending: {b.pending_days || 0}d</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Applications History Table */}
      <div className="att-v2-card">
        <div className="att-v2-card-header">
          <h3>
            <FiClock className="text-primary" />
            <span>Leave Applications History</span>
          </h3>
        </div>

        <div className="att-v2-table-wrapper">
          <table className="att-v2-table">
            <thead>
              <tr>
                <th>Leave Type</th>
                <th>From Date</th>
                <th>To Date</th>
                <th>Session</th>
                <th>Days</th>
                <th>Status</th>
                <th>Reason</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    Loading applications...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No leave applications submitted yet.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id}>
                    <td style={{ fontWeight: 600 }}>{app.leave_type_name || app.leave_type_id}</td>
                    <td>{app.from_date}</td>
                    <td>{app.to_date}</td>
                    <td>{app.half_day_option === 'NONE' ? 'Full Day' : app.half_day_option?.replace('_', ' ')}</td>
                    <td style={{ fontWeight: 700 }}>{app.days_count || '-'}</td>
                    <td>
                      <span className={`att-v2-status-pill ${app.status?.startsWith('PENDING') ? 'PENDING' : app.status}`}>
                        {app.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {app.reason || '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {app.status?.startsWith('PENDING') && (
                        <button
                          className="att-v2-btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px', color: '#ef4444' }}
                          onClick={() => handleCancel(app.id)}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showModal && (
        <div className="att-v2-modal-overlay">
          <div className="att-v2-modal">
            <div className="att-v2-modal-header">
              <h3>Apply for Leave</h3>
              <button className="att-v2-modal-close" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleApply}>
              <div className="att-v2-form-group">
                <label>Leave Type *</label>
                <select
                  className="att-v2-select"
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(e.target.value)}
                  required
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="att-v2-form-group">
                  <label>From Date *</label>
                  <input
                    type="date"
                    className="att-v2-input"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    required
                  />
                </div>
                <div className="att-v2-form-group">
                  <label>To Date *</label>
                  <input
                    type="date"
                    className="att-v2-input"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="att-v2-form-group">
                <label>Half-Day Option</label>
                <select
                  className="att-v2-select"
                  value={halfDayOption}
                  onChange={(e) => setHalfDayOption(e.target.value)}
                >
                  <option value="NONE">Full Day</option>
                  <option value="FIRST_HALF">First Half</option>
                  <option value="SECOND_HALF">Second Half</option>
                </select>
              </div>

              <div className="att-v2-form-group">
                <label>Reason *</label>
                <textarea
                  className="att-v2-textarea"
                  rows="3"
                  placeholder="Provide reason for leave application..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <div className="att-v2-modal-actions">
                <button
                  type="button"
                  className="att-v2-btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Close
                </button>
                <button type="submit" className="att-v2-btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceV2Leaves;
