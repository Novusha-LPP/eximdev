import React, { useState, useEffect, useMemo } from 'react';
import {
  FiArrowLeft, FiPlus, FiFileText, FiClock, FiCalendar, FiCheckCircle,
  FiXCircle, FiAlertCircle, FiX, FiLayers
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import attendanceV2API from '../../api/attendance/attendanceV2.api';

const AttendanceV2Leaves = ({ initialDate = null, onBack, initialBalances = [] }) => {
  const [balances, setBalances] = useState(Array.isArray(initialBalances) ? initialBalances : []);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(!Array.isArray(initialBalances) || initialBalances.length === 0);
  const [showModal, setShowModal] = useState(Boolean(initialDate));
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [fromDate, setFromDate] = useState(initialDate || '');
  const [toDate, setToDate] = useState(initialDate || '');
  const [halfDayOption, setHalfDayOption] = useState('NONE');
  const [reason, setReason] = useState('');

  // Keep balances in sync if initialBalances changes
  useEffect(() => {
    if (Array.isArray(initialBalances) && initialBalances.length > 0 && balances.length === 0) {
      setBalances(initialBalances);
      setLoading(false);
    }
  }, [initialBalances]);

  const loadData = async () => {
    if (balances.length === 0) setLoading(true);
    try {
      const [balRes, typesRes, appsRes] = await Promise.all([
        attendanceV2API.getLeaveBalances().catch(() => []),
        attendanceV2API.getLeaveTypes().catch(() => []),
        attendanceV2API.getLeaveApplications().catch(() => []),
      ]);

      setBalances(Array.isArray(balRes) ? balRes : []);
      setLeaveTypes(Array.isArray(typesRes) ? typesRes : []);
      setApplications(Array.isArray(appsRes) ? appsRes : []);

      if (Array.isArray(typesRes) && typesRes.length > 0) {
        setLeaveTypeId((prev) => prev || typesRes[0].id);
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

  useEffect(() => {
    if (initialDate) {
      setFromDate(initialDate);
      setToDate(initialDate);
      setShowModal(true);
    }
  }, [initialDate]);

  // Calculate estimated days count
  const estimatedDays = useMemo(() => {
    if (!fromDate || !toDate) return 0;
    const d1 = new Date(fromDate);
    const d2 = new Date(toDate);
    if (isNaN(d1) || isNaN(d2) || d2 < d1) return 0;
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (halfDayOption !== 'NONE') {
      return diffDays === 1 ? 0.5 : diffDays - 0.5;
    }
    return diffDays;
  }, [fromDate, toDate, halfDayOption]);

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
      toast.error(err?.response?.data?.message || err?.message || 'Failed to apply for leave');
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
      toast.error(err?.response?.data?.message || err?.message || 'Failed to cancel leave');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Leave Balances Header & Grid */}
      <div>
        <div className="att-v2-card-header" style={{ marginBottom: '20px', borderBottom: 'none', paddingBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {onBack && (
              <button
                type="button"
                className="att-v2-btn-back-overview"
                onClick={onBack}
                title="Back to Overview"
              >
                <FiArrowLeft size={14} />
                <span>Back to Overview</span>
              </button>
            )}
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FiLayers className="text-primary" />
                <span>Leave Allocation & Balances</span>
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--att-text-muted)' }}>
                Fiscal Year 2026-2027 active quotas and consumed leaves
              </p>
            </div>
          </div>
          <button className="att-v2-btn-primary" onClick={() => setShowModal(true)}>
            <FiPlus size={16} />
            <span>Apply Leave</span>
          </button>
        </div>

        {/* Dynamic Balances: Shimmer Skeletons while loading vs Empty state vs Real HRMS balances */}
        {loading && balances.length === 0 ? (
          <div className="att-v2-balances-grid">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="att-v2-skeleton-card">
                <div className="att-v2-skeleton-line" style={{ width: '55%', height: '18px', marginBottom: '14px' }} />
                <div className="att-v2-skeleton-line" style={{ width: '40%', height: '38px', marginBottom: '14px' }} />
                <div className="att-v2-skeleton-line" style={{ width: '100%', height: '8px', marginBottom: '14px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="att-v2-skeleton-line" style={{ width: '35%', height: '14px' }} />
                  <div className="att-v2-skeleton-line" style={{ width: '35%', height: '14px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : balances.length === 0 ? (
          <div className="att-v2-card" style={{ padding: '36px', textAlign: 'center', marginBottom: '28px', color: '#64748b' }}>
            <FiFileText size={36} style={{ color: '#cbd5e1', marginBottom: '10px' }} />
            <h4 style={{ margin: '0 0 6px 0', color: '#1e293b', fontSize: '16px', fontWeight: 700 }}>No Active Leave Quotas</h4>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--att-text-muted)' }}>
              No active leave balances were found for Fiscal Year 2026-2027. Contact HR to configure your leave allocations.
            </p>
          </div>
        ) : (
          <div className="att-v2-balances-grid">
            {balances.map((b, idx) => {
              const avail = b.available_days ?? 0;
              const alloc = (b.allocated_days || 0) + (b.carry_forward_days || 0) || (avail + (b.used_days || 0)) || 1;
              const used = b.used_days || 0;
              const pending = b.pending_days || 0;
              const pct = Math.min(100, Math.max(0, Math.round((avail / alloc) * 100)));
              const barColor = b.color || (idx === 0 ? '#4f46e5' : idx === 1 ? '#059669' : idx === 2 ? '#d97706' : '#7c3aed');

              return (
                <div key={b.id || b.leave_type_id || idx} className="att-v2-balance-card">
                  <div className="att-v2-balance-card-top">
                    <span className="att-v2-balance-name">{b.leave_type_name}</span>
                    <span className="att-v2-balance-code">{b.leave_type_code}</span>
                  </div>
                  <div className="att-v2-balance-main">
                    <span className="att-v2-balance-avail" style={{ color: barColor }}>{avail}</span>
                    <span className="att-v2-balance-total">/ {alloc} days left</span>
                  </div>
                  <div className="att-v2-progress-bar">
                    <div
                      className="att-v2-progress-fill"
                      style={{ width: `${pct}%`, background: barColor }}
                    />
                  </div>
                  <div className="att-v2-balance-footer">
                    <span>Used: <strong>{used}d</strong></span>
                    <span>Pending: <strong>{pending}d</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Leave Applications History */}
      <div className="att-v2-card">
        <div className="att-v2-card-header">
          <h3>
            <FiClock className="text-primary" />
            <span>Leave Applications History</span>
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--att-text-muted)' }}>
            Showing {applications.length} submitted request{applications.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="att-v2-table-wrapper">
          <table className="att-v2-table">
            <thead>
              <tr>
                <th>Leave Type</th>
                <th>From Date</th>
                <th>To Date</th>
                <th>Session</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Reason</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && applications.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <FiClock size={24} className="spinning" style={{ color: 'var(--att-primary)', marginBottom: '8px' }} />
                    <div>Loading applications history...</div>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    <FiFileText size={32} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                    <h4 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>No Applications Yet</h4>
                    <p style={{ margin: 0, fontSize: '13px' }}>You haven't submitted any leave applications this period.</p>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id}>
                    <td style={{ fontWeight: 600 }}>{app.leave_type_name || app.leave_type_id}</td>
                    <td>{app.from_date}</td>
                    <td>{app.to_date}</td>
                    <td>
                      <span className="att-v2-chip" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                        {app.half_day_option === 'NONE' ? 'Full Day' : app.half_day_option?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {app.days_requested ?? app.days_count ? `${app.days_requested ?? app.days_count}d` : '-'}
                    </td>
                    <td>
                      <span className={`att-v2-status-pill ${app.status?.startsWith('PENDING') ? 'PENDING' : app.status}`}>
                        {app.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--att-text-secondary)' }}>
                      {app.reason || '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {app.status?.startsWith('PENDING') && (
                        <button
                          className="att-v2-btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px', color: '#ef4444', borderColor: '#fee2e2' }}
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
        <div className="att-v2-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="att-v2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="att-v2-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiFileText className="text-primary" size={20} />
                <h3 style={{ margin: 0 }}>Apply for Leave</h3>
              </div>
              <button className="att-v2-modal-close" onClick={() => setShowModal(false)}>
                <FiX size={18} />
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
                  {leaveTypes.length === 0 && (
                    <option value="" disabled>Loading leave types...</option>
                  )}
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
                    min={fromDate}
                    required
                  />
                </div>
              </div>

              <div className="att-v2-form-group">
                <label>Session / Half-Day Option</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { key: 'NONE', label: 'Full Day' },
                    { key: 'FIRST_HALF', label: 'First Half' },
                    { key: 'SECOND_HALF', label: 'Second Half' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setHalfDayOption(opt.key)}
                      style={{
                        padding: '9px 12px',
                        borderRadius: 'var(--att-radius-md)',
                        border: halfDayOption === opt.key ? '2px solid var(--att-primary)' : '1px solid var(--att-border)',
                        background: halfDayOption === opt.key ? 'var(--att-primary-subtle)' : '#ffffff',
                        color: halfDayOption === opt.key ? 'var(--att-primary)' : 'var(--att-text)',
                        fontWeight: halfDayOption === opt.key ? 700 : 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estimated Days Calculation Pill */}
              {estimatedDays > 0 && (
                <div style={{ padding: '10px 14px', background: 'var(--att-surface-muted)', borderRadius: '8px', border: '1px solid var(--att-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--att-text-muted)' }}>Estimated Duration:</span>
                  <span style={{ fontWeight: 800, color: 'var(--att-primary)', fontSize: '14px' }}>
                    {estimatedDays} working day{estimatedDays !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              <div className="att-v2-form-group">
                <label>Reason for Leave *</label>
                <textarea
                  className="att-v2-textarea"
                  rows="3"
                  placeholder="Provide brief explanation or medical reason..."
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
                  Cancel
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
