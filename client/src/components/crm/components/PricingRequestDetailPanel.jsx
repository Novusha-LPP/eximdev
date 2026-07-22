import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Clock, MessageSquare, Plus, Check, Send, AlertTriangle } from 'lucide-react';
import { message } from 'antd';

const getHeaders = () => {
  const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
  return {
    headers: {
      'Content-Type': 'application/json',
      'user-id': user._id || user.id || '',
      'username': user.username || '',
      'user-role': user.role || '',
    },
    withCredentials: true
  };
};

export default function PricingRequestDetailPanel({ request: initialRequest, onClose, onRefresh, isAccountsView }) {
  const [request, setRequest] = useState(initialRequest);
  const [remarkText, setRemarkText] = useState('');
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);
  const [status, setStatus] = useState(initialRequest.status);
  const [approvedPrice, setApprovedPrice] = useState(initialRequest.approvedPrice || '');
  const [targetPrice, setTargetPrice] = useState(initialRequest.targetPrice || '');
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('exim_user') || '{}');
  const userRole = (currentUser.role || '').toLowerCase();
  const userCrmRole = (currentUser.crmRole || '').toLowerCase();
  const assignedToId = request.assignedTo?._id || request.assignedTo;
  const isPricingAssignee = (currentUser._id && assignedToId && currentUser._id.toString() === assignedToId.toString()) ||
    (currentUser.id && assignedToId && currentUser.id.toString() === assignedToId.toString());
  const isAdmin = userRole === 'admin' || userCrmRole === 'admin';
  const isAccountsOrPricing = userRole.includes('account') || userRole.includes('pricing') || userCrmRole.includes('account') || userCrmRole.includes('pricing');
  const canModifyStatus = isPricingAssignee || isAdmin || isAccountsOrPricing;

  const fetchRequestDetails = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/pricing-requests/${request._id}`,
        getHeaders()
      );
      setRequest(res.data);
      setStatus(res.data.status);
      setApprovedPrice(res.data.approvedPrice || '');
      setTargetPrice(res.data.targetPrice || '');
    } catch (err) {
      console.error('Failed to reload pricing request details:', err);
    }
  };

  const handleAddRemark = async (e) => {
    e.preventDefault();
    if (!remarkText.trim()) return;

    setIsSubmittingRemark(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/crm/pricing-requests/${request._id}/remarks`,
        { text: remarkText },
        getHeaders()
      );
      setRemarkText('');
      setRequest(res.data);
      message.success('Remark added');
      onRefresh();
    } catch (err) {
      console.error('Failed to add remark:', err);
      message.error('Failed to add remark');
    } finally {
      setIsSubmittingRemark(false);
    }
  };

  const handleSubmitPrice = async () => {
    const priceToSubmit = isAccountsView ? Number(targetPrice) : Number(request.targetPrice);
    if (!priceToSubmit) {
      message.warning('Please enter a price.');
      return;
    }
    setIsSavingStatus(true);
    try {
      const payload = {
        status: 'approved',
        approvedPrice: priceToSubmit,
        ...(isAccountsView ? { targetPrice: priceToSubmit } : {})
      };

      const res = await axios.put(
        `${process.env.REACT_APP_API_STRING}/crm/pricing-requests/${request._id}`,
        payload,
        getHeaders()
      );
      setRequest(res.data);
      setStatus('approved');
      setApprovedPrice(res.data.approvedPrice || '');
      message.success('Price submitted successfully');
      onRefresh();
    } catch (err) {
      console.error('Failed to submit price:', err);
      message.error(err.response?.data?.message || 'Failed to submit price');
    } finally {
      setIsSavingStatus(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: '600px',
      background: '#fff',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .scrollable-content::-webkit-scrollbar {
          width: 6px;
        }
        .scrollable-content::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .scrollable-content::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#f8fafc'
      }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Pricing Request Details</span>
          <h3 style={{ margin: '4px 0 0 0', color: '#0f172a', fontWeight: 700, fontSize: '1.2rem' }}>{request.subject}</h3>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <X size={20} />
        </button>
      </div>

      {/* Body Content */}
      <div className="scrollable-content" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Linked To</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
              {request.relatedTo?.model}: {request.relatedTo?.name || 'Link'}
            </div>
          </div>
          {isAccountsView ? (
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Target Rate</div>
              {request.status !== 'approved' ? (
                <input
                  type="number"
                  value={targetPrice}
                  onChange={e => setTargetPrice(e.target.value)}
                  placeholder="Enter Rate"
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    fontSize: '0.85rem',
                    marginTop: '2px'
                  }}
                />
              ) : (
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
                  {request.targetPrice ? `₹${request.targetPrice.toLocaleString('en-IN')}` : '—'}
                </div>
              )}
            </div>
          ) : (
            <div></div>
          )}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Crate Size</div>
            <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '2px', fontWeight: 600 }}>
              {request.crateSize || '—'}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Quantity</div>
            <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '2px', fontWeight: 600 }}>
              {request.qty || '—'}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Requested By</div>
            <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '2px' }}>
              {request.requestedBy?.first_name ? `${request.requestedBy.first_name} ${request.requestedBy.last_name || ''}` : request.requestedBy?.username}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Status</div>
            <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '2px', fontWeight: 700, textTransform: 'capitalize' }}>
              {request.status?.replace('_', ' ')}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Submitted Rate</div>
            <div style={{ fontSize: '0.85rem', color: '#16a34a', marginTop: '2px', fontWeight: 700 }}>
              {request.approvedPrice ? `₹${request.approvedPrice.toLocaleString('en-IN')}` : '—'}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
            {/* Empty block to balance grid */}
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>Requirements Description</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', whiteSpace: 'pre-line' }}>
            {request.description || 'No requirements described.'}
          </p>
        </div>

        {/* Additional Requirement */}
        {request.additionalRequirement && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>Additional Requirement</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              {request.additionalRequirement}
            </p>
          </div>
        )}

        {/* Pricing team Approval / Status Update Actions */}
        {canModifyStatus && request.status !== 'approved' && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '18px', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.875rem', fontWeight: 700, color: '#166534' }}>Pricing Resolution Control</h4>
            {isAccountsView ? (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>
                  Price (₹) *
                </label>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={e => setTargetPrice(e.target.value)}
                  placeholder="Enter Price"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #bbf7d0',
                    outline: 'none',
                    fontSize: '0.9rem',
                    background: '#fff'
                  }}
                />
              </div>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>Price to Submit (Target Price from CRM)</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d' }}>
                  ₹{request.targetPrice ? request.targetPrice.toLocaleString('en-IN') : '0'}
                </div>
              </div>
            )}

            <button
              onClick={handleSubmitPrice}
              disabled={isSavingStatus || (isAccountsView ? !targetPrice : !request.targetPrice)}
              style={{
                width: '100%',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Check size={14} /> {isSavingStatus ? 'Submitting...' : 'Submit Price'}
            </button>
          </div>
        )}

        {request.status === 'approved' && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '18px', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.875rem', fontWeight: 700, color: '#166534' }}>Submitted Price</h4>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d' }}>
              ₹{request.approvedPrice ? request.approvedPrice.toLocaleString('en-IN') : '0'}
            </div>
          </div>
        )}

        {/* Remarks/Chat Thread */}
        <div>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.875rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={16} /> Remarks & Messages
          </h4>

          {/* Messages list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px', maxRawHeight: '200px', overflowY: 'auto' }}>
            {request.remarks?.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>No comments yet.</div>
            ) : (
              request.remarks?.map(rem => {
                const isMe = rem.userId === currentUser._id || rem.userId === currentUser.id;
                return (
                  <div key={rem._id} style={{
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    background: isMe ? '#eef2ff' : '#f1f5f9',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    border: '1px solid',
                    borderColor: isMe ? '#e0e7ff' : '#e2e8f0'
                  }}>
                    <div style={{ fontWeight: 600, color: isMe ? '#4338ca' : '#475569', fontSize: '0.75rem', marginBottom: '2px' }}>{rem.userName}</div>
                    <div style={{ color: '#1e293b', wordBreak: 'break-word' }}>{rem.text}</div>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', textAlign: 'right', marginTop: '2px' }}>
                      {new Date(rem.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* New message input */}
          <form onSubmit={handleAddRemark} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Add remark or message..."
              value={remarkText}
              onChange={e => setRemarkText(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              disabled={isSubmittingRemark}
            />
            <button
              type="submit"
              disabled={isSubmittingRemark || !remarkText.trim()}
              style={{
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>

        {/* History timeline */}
        <div>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>Action Log Timeline</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '8px', borderLeft: '2px solid #e2e8f0' }}>
            {request.history?.map((hist, index) => (
              <div key={hist._id || index} style={{ position: 'relative', paddingLeft: '12px' }}>
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute',
                  left: '-17px',
                  top: '4px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#94a3b8',
                  border: '2px solid #fff'
                }} />
                <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>{hist.action}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                  {new Date(hist.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
