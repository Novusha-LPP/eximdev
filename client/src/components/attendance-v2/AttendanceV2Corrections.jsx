import React, { useState, useEffect } from 'react';
import { FiPlus, FiCheckCircle, FiClock, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import attendanceV2API from '../../api/attendance/attendanceV2.api';

const formatDateTime = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return '-';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const AttendanceV2Corrections = ({ initialDate = null }) => {
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
      // Build ISO timestamps if times are provided
      const punchInIso = requestedPunchIn ? `${workDate}T${requestedPunchIn}:00Z` : null;
      const punchOutIso = requestedPunchOut ? `${workDate}T${requestedPunchOut}:00Z` : null;

      await attendanceV2API.requestCorrection({
        work_date: workDate,
        correction_type: correctionType,
        requested_punch_in: punchInIso,
        requested_punch_out: punchOutIso,
        reason,
      });

      toast.success('Correction request submitted');
      setShowModal(false);
      setReason('');
      setRequestedPunchIn('');
      setRequestedPunchOut('');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to submit correction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this correction request?')) return;
    try {
      await attendanceV2API.cancelCorrection(id);
      toast.success('Correction request cancelled');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel correction');
    }
  };

  return (
    <div className="att-v2-card">
      <div className="att-v2-card-header">
        <h3>
          <FiAlertTriangle className="text-primary" />
          <span>Attendance Regularization & Corrections</span>
        </h3>
        <button className="att-v2-btn-primary" onClick={() => setShowModal(true)}>
          <FiPlus size={16} />
          <span>New Correction Request</span>
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
                <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  Loading corrections...
                </td>
              </tr>
            ) : corrections.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  No correction requests submitted.
                </td>
              </tr>
            ) : (
              corrections.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.work_date}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#4f46e5' }}>
                      {c.correction_type?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{formatDateTime(c.requested_punch_in)}</td>
                  <td>{formatDateTime(c.requested_punch_out)}</td>
                  <td style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                        style={{ padding: '4px 10px', fontSize: '12px', color: '#ef4444' }}
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
        <div className="att-v2-modal-overlay">
          <div className="att-v2-modal">
            <div className="att-v2-modal-header">
              <h3>Attendance Correction</h3>
              <button className="att-v2-modal-close" onClick={() => setShowModal(false)}>
                &times;
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
                <label>Correction Type *</label>
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
                <label>Reason *</label>
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
                  {submitting ? 'Submitting...' : 'Submit Request'}
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
