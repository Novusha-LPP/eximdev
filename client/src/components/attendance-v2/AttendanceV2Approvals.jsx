import React, { useState, useEffect } from 'react';
import {
  FiArrowLeft, FiCheckCircle, FiXCircle, FiCheck, FiX, FiClock,
  FiCalendar, FiUser, FiMessageSquare, FiRefreshCw
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import attendanceV2API from '../../api/attendance/attendanceV2.api';

const getInitials = (name) => {
  if (!name) return 'EM';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AttendanceV2Approvals = ({ onBack }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [rejectDialogItem, setRejectDialogItem] = useState(null);
  const [remarks, setRemarks] = useState('');

  const loadInbox = async () => {
    setLoading(true);
    try {
      const res = await attendanceV2API.getApprovalsInbox();
      setItems(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load approvals inbox:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, []);

  const handleDecision = async (id, action, comments = '') => {
    setActingId(id);
    try {
      await attendanceV2API.decideApproval(id, action, comments);
      toast.success(`Request ${action === 'APPROVE' ? 'Approved' : 'Rejected'} successfully`);
      setRejectDialogItem(null);
      setRemarks('');
      loadInbox();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update approval decision');
    } finally {
      setActingId(null);
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
              <FiCheckCircle className="text-primary" />
              <span>Manager Approvals Inbox ({items.length})</span>
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--att-text-muted)' }}>
              Review pending leave applications and missed-punch regularizations from your direct reports
            </p>
          </div>
        </div>
        <button className="att-v2-btn-secondary" onClick={loadInbox} disabled={loading}>
          <FiRefreshCw size={14} className={loading ? 'spinning' : ''} />
          <span>Refresh Inbox</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <FiClock size={28} className="spinning" style={{ color: 'var(--att-primary)', marginBottom: '8px' }} />
          <div>Loading pending approvals...</div>
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: '56px 20px', textAlign: 'center', color: '#64748b' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#ecfdf5',
            color: '#10b981',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
          }}>
            <FiCheckCircle size={32} />
          </div>
          <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '18px', fontWeight: 800 }}>Inbox Zero!</h4>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--att-text-muted)' }}>
            There are no pending employee leave or punch correction requests awaiting your approval.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map((item) => {
            const req = item.request || {};
            const isLeave = item.request_type === 'LEAVE';
            const isCorrection = item.request_type === 'CORRECTION';
            const initials = getInitials(item.employee_name);

            return (
              <div key={item.id} className="att-v2-approval-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1, minWidth: '280px' }}>
                  <div className="att-v2-avatar">{initials}</div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span
                        style={{
                          background: isLeave ? '#e0e7ff' : '#fef3c7',
                          color: isLeave ? '#3730a3' : '#92400e',
                          padding: '3px 9px',
                          borderRadius: 'var(--att-radius-pill)',
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.request_type}
                      </span>
                      <strong style={{ fontSize: '16px', color: 'var(--att-text)' }}>
                        {item.employee_name || item.employee_number}
                      </strong>
                      <span className="att-v2-chip" style={{ fontSize: '11px' }}>
                        ID: {item.employee_number}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--att-text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '18px', margin: '8px 0' }}>
                      {isLeave && (
                        <>
                          <div>
                            <span style={{ color: 'var(--att-text-muted)' }}>Period: </span>
                            <strong>{req.from_date}</strong> to <strong>{req.to_date}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--att-text-muted)' }}>Type: </span>
                            <span className="att-v2-chip" style={{ background: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe' }}>
                              {req.leave_type_name || 'Leave'}
                            </span>
                          </div>
                          {req.half_day_option && req.half_day_option !== 'NONE' && (
                            <div>
                              <span style={{ color: 'var(--att-text-muted)' }}>Session: </span>
                              <strong>{req.half_day_option.replace('_', ' ')}</strong>
                            </div>
                          )}
                        </>
                      )}

                      {isCorrection && (
                        <>
                          <div>
                            <span style={{ color: 'var(--att-text-muted)' }}>Date: </span>
                            <strong>{req.work_date}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--att-text-muted)' }}>Category: </span>
                            <span className="att-v2-chip" style={{ background: '#fffbeb', color: '#b45309', borderColor: '#fde68a' }}>
                              {req.correction_type}
                            </span>
                          </div>
                          {req.requested_punch_in && (
                            <div>
                              <span style={{ color: 'var(--att-text-muted)' }}>Punch In: </span>
                              <strong>{new Date(req.requested_punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                            </div>
                          )}
                          {req.requested_punch_out && (
                            <div>
                              <span style={{ color: 'var(--att-text-muted)' }}>Punch Out: </span>
                              <strong>{new Date(req.requested_punch_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {req.reason && (
                      <div style={{
                        fontSize: '13px',
                        color: 'var(--att-text-secondary)',
                        fontStyle: 'italic',
                        background: '#f8fafc',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        borderLeft: '3px solid var(--att-primary)',
                        marginTop: '8px'
                      }}>
                        "{req.reason}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Approve / Reject buttons */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    className="att-v2-btn-secondary"
                    style={{ color: '#ef4444', borderColor: '#fee2e2', background: '#fff1f2' }}
                    onClick={() => setRejectDialogItem(item)}
                    disabled={actingId === item.id}
                  >
                    <FiX size={15} />
                    <span>Reject</span>
                  </button>

                  <button
                    className="att-v2-btn-primary"
                    style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)' }}
                    onClick={() => handleDecision(item.id, 'APPROVE')}
                    disabled={actingId === item.id}
                  >
                    <FiCheck size={16} />
                    <span>{actingId === item.id ? 'Processing...' : 'Approve'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Remarks Modal */}
      {rejectDialogItem && (
        <div className="att-v2-modal-overlay" onClick={() => setRejectDialogItem(null)}>
          <div className="att-v2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="att-v2-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiXCircle style={{ color: '#ef4444' }} size={20} />
                <h3 style={{ margin: 0 }}>Reject Request</h3>
              </div>
              <button className="att-v2-modal-close" onClick={() => setRejectDialogItem(null)}>
                <FiX size={18} />
              </button>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--att-text-secondary)', marginTop: 0 }}>
              Rejecting {rejectDialogItem.request_type.toLowerCase()} request for <strong>{rejectDialogItem.employee_name}</strong>.
            </p>
            <div className="att-v2-form-group">
              <label>Rejection Remarks (Optional)</label>
              <textarea
                className="att-v2-textarea"
                rows="3"
                placeholder="Explain the reason for denial (visible to employee)..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
            <div className="att-v2-modal-actions">
              <button className="att-v2-btn-secondary" onClick={() => setRejectDialogItem(null)}>
                Cancel
              </button>
              <button
                className="att-v2-btn-primary"
                style={{ background: '#ef4444' }}
                onClick={() => handleDecision(rejectDialogItem.id, 'REJECT', remarks)}
                disabled={actingId === rejectDialogItem.id}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceV2Approvals;
