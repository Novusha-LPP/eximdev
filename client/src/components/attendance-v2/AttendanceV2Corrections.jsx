import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiPlus, FiAlertTriangle, FiClock, FiCalendar, FiX, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import attendanceV2API from '../../api/attendance/attendanceV2.api';

const formatDateTime = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return '-';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const AttendanceV2Corrections = ({ initialDate = null, onBack }) => {
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [workDate, setWorkDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [correctionType, setCorrectionType] = useState('MISSED_PUNCH');
  const [requestedPunchIn, setRequestedPunchIn] = useState('');
  const [requestedPunchOut, setRequestedPunchOut] = useState('');
  const [reason, setReason] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await attendanceV2API.getCorrections();
      setCorrections(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load corrections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialDate) {
      setWorkDate(initialDate);
      setShowModal(true);
    }
  }, [initialDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workDate || !correctionType || !reason) {
      toast.error('Please fill in work date, correction type, and reason');
      return;
    }

    setSubmitting(true);
    try {
      // Build ISO timestamps in local timezone
      const punchInIso = requestedPunchIn ? new Date(`${workDate}T${requestedPunchIn}:00`).toISOString() : null;
      const punchOutIso = requestedPunchOut ? new Date(`${workDate}T${requestedPunchOut}:00`).toISOString() : null;

      await attendanceV2API.requestCorrection({
        work_date: workDate,
        correction_type: correctionType,
        requested_punch_in: punchInIso,
        requested_punch_out: punchOutIso,
        reason,
      });

      toast.success('Attendance regularization request submitted');
      setShowModal(false);
      setReason('');
      setRequestedPunchIn('');
      setRequestedPunchOut('');
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to submit correction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this regularization request?')) return;
    try {
      await attendanceV2API.cancelCorrection(id);
      toast.success('Regularization request cancelled');
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to cancel correction');
    }
  };

  return (
    <div className="att-v2-card">
      <div className="att-v2-card-header">
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
              <FiAlertTriangle className="text-primary" />
              <span>Attendance Regularization & Corrections</span>
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--att-text-muted)' }}>
              Request adjustments for missed punches, late arrivals, or biometric discrepancies
            </p>
          </div>
        </div>
        <button className="att-v2-btn-primary" onClick={() => setShowModal(true)}>
          <FiPlus size={16} />
          <span>New Regularization Request</span>
        </button>
      </div>

      <div className="att-v2-table-wrapper">
        <table className="att-v2-table">
          <thead>
            <tr>
              <th>Work Date</th>
              <th>Correction Type</th>
              <th>Requested In</th>
              <th>Requested Out</th>
              <th>Reason</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <FiClock size={24} className="spinning" style={{ color: 'var(--att-primary)', marginBottom: '8px' }} />
                  <div>Loading regularization requests...</div>
                </td>
              </tr>
            ) : corrections.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                  <FiCheckCircle size={32} style={{ color: '#10b981', marginBottom: '8px' }} />
                  <h4 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>No Regularizations Pending</h4>
                  <p style={{ margin: 0, fontSize: '13px' }}>Your attendance records have no unresolved punch disputes or corrections.</p>
                </td>
              </tr>
            ) : (
              corrections.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.work_date}</td>
                  <td>
                    <span className="att-v2-chip" style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', fontWeight: 700 }}>
                      {c.correction_type?.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatDateTime(c.requested_punch_in)}</td>
                  <td style={{ fontWeight: 600 }}>{formatDateTime(c.requested_punch_out)}</td>
                  <td style={{ maxWidth: '260px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--att-text-secondary)' }}>
                    {c.reason}
                  </td>
                  <td>
                    <span className={`att-v2-status-pill ${c.status}`}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {c.status === 'PENDING' && (
                      <button
                        className="att-v2-btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px', color: '#ef4444', borderColor: '#fee2e2' }}
                        onClick={() => handleCancel(c.id)}
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

      {/* Modal */}
      {showModal && (
        <div className="att-v2-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="att-v2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="att-v2-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiAlertTriangle className="text-primary" size={20} />
                <h3 style={{ margin: 0 }}>Request Attendance Regularization</h3>
              </div>
              <button className="att-v2-modal-close" onClick={() => setShowModal(false)}>
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="att-v2-form-group">
                <label>Work Date *</label>
                <input
                  type="date"
                  className="att-v2-input"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  required
                />
              </div>

              <div className="att-v2-form-group">
                <label>Correction Category *</label>
                <select
                  className="att-v2-select"
                  value={correctionType}
                  onChange={(e) => setCorrectionType(e.target.value)}
                  required
                >
                  <option value="MISSED_PUNCH">Missed Punch (Both In & Out)</option>
                  <option value="PUNCH_IN">Forgot Punch In</option>
                  <option value="PUNCH_OUT">Forgot Punch Out</option>
                  <option value="REGULARIZE">General Regularization</option>
                  <option value="LATE_REASON">Late Arrival Justification</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="att-v2-form-group">
                  <label>Requested Punch In (Time)</label>
                  <input
                    type="time"
                    className="att-v2-input"
                    value={requestedPunchIn}
                    onChange={(e) => setRequestedPunchIn(e.target.value)}
                  />
                </div>
                <div className="att-v2-form-group">
                  <label>Requested Punch Out (Time)</label>
                  <input
                    type="time"
                    className="att-v2-input"
                    value={requestedPunchOut}
                    onChange={(e) => setRequestedPunchOut(e.target.value)}
                  />
                </div>
              </div>

              <div className="att-v2-form-group">
                <label>Justification Reason *</label>
                <textarea
                  className="att-v2-textarea"
                  rows="3"
                  placeholder="Explain why the punch was missed or requires regularization..."
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
                  {submitting ? 'Submitting...' : 'Submit Regularization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceV2Corrections;
