import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiCheck, FiX, FiClock, FiUser, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';
import attendanceV2API from '../../api/attendance/attendanceV2.api';

const AttendanceV2Approvals = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState(null);

  // Remarks dialog
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
      toast.error(err.message || 'Failed to update approval decision');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="att-v2-card">
      <div className="att-v2-card-header">
        <h3>
          <FiCheckCircle className="text-primary" />
          <span>Pending Approvals Inbox ({items.length})</span>
        </h3>
        <button className="att-v2-btn-secondary" onClick={loadInbox} disabled={loading}>
          Refresh Inbox
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
          Loading pending approvals...
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
          <FiCheckCircle size={36} style={{ color: '#10b981', marginBottom: '12px' }} />
          <h4 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>All Clear!</h4>
          <p style={{ margin: 0, fontSize: '14px' }}>There are no pending leave or correction approvals in your inbox.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map((item) => {
            const req = item.request || {};
            const isLeave = item.request_type === 'LEAVE';
            const isCorrection = item.request_type === 'CORRECTION';

            return (
              <div
                key={item.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--att-border)',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span
                      style={{
                        background: isLeave ? '#e0e7ff' : '#fef3c7',
                        color: isLeave ? '#3730a3' : '#92400e',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.request_type}
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                      {item.employee_name || item.employee_number}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      ({item.employee_number})
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: '#334155', display: 'flex', flexWrap: 'wrap', gap: '16px', margin: '8px 0' }}>
                    {isLeave && (
                      <>
                        <span><strong>Duration:</strong> {req.from_date} to {req.to_date}</span>
                        <span><strong>Type:</strong> {req.leave_type_name || 'Leave'}</span>
                      </>
                    )}
                    {isCorrection && (
                      <>
                        <span><strong>Date:</strong> {req.work_date}</span>
                        <span><strong>Type:</strong> {req.correction_type}</span>
                        {req.requested_punch_in && <span><strong>In:</strong> {new Date(req.requested_punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                        {req.requested_punch_out && <span><strong>Out:</strong> {new Date(req.requested_punch_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                      </>
                    )}
                  </div>

                  {req.reason && (
                    <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', borderLeft: '3px solid #cbd5e1' }}>
                      "{req.reason}"
                    </div>
                  )}
                </div>

                {/* Approve / Reject buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="att-v2-btn-secondary"
                    style={{ color: '#ef4444', borderColor: '#fee2e2', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => setRejectDialogItem(item)}
                    disabled={actingId === item.id}
                  >
                    <FiX size={15} />
                    <span>Reject</span>
                  </button>

                  <button
                    className="att-v2-btn-primary"
                    style={{ background: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleDecision(item.id, 'APPROVE')}
                    disabled={actingId === item.id}
                  >
                    <FiCheck size={15} />
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
        <div className="att-v2-modal-overlay">
          <div className="att-v2-modal">
            <div className="att-v2-modal-header">
              <h3>Reject Request</h3>
              <button className="att-v2-modal-close" onClick={() => setRejectDialogItem(null)}>
                &times;
              </button>
            </div>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: 0 }}>
              Rejecting request for <strong>{rejectDialogItem.employee_name}</strong>. You may provide remarks below.
            </p>
            <div className="att-v2-form-group">
              <label>Rejection Remarks</label>
              <textarea
                className="att-v2-textarea"
                rows="3"
                placeholder="Reason for rejection..."
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
