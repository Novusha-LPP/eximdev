import React, { useState } from 'react';
import axios from 'axios';
import { X, Mail, Download, Edit3, CheckCircle2, XCircle, Clock, User } from 'lucide-react';
import { message } from 'antd';
import { generateQuotePDF } from '../utils/pdfGenerator';
import EmailQuoteModal from './EmailQuoteModal';

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

export default function QuoteDetailPanel({ quote: initialQuote, onClose, onEdit, onRefresh }) {
  const [quote, setQuote] = useState(initialQuote);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);

  const handleUpdateStatus = async (status, rejectReason = '') => {
    setIsUpdatingStatus(true);
    try {
      const res = await axios.put(
        `${process.env.REACT_APP_API_STRING}/crm/quotes/${quote._id}/status`,
        { status, rejectionReason: rejectReason },
        getHeaders()
      );
      setQuote(res.data);
      message.success(`Quote marked as ${status}`);
      setShowRejectReason(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to update quote status:', err);
      message.error('Failed to update quote status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConvert = async () => {
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/crm/quotes/${quote._id}/convert-to-opportunity`,
        {},
        getHeaders()
      );
      message.success('Quote converted to opportunity successfully!');
      setQuote(res.data.quote || quote);
      onRefresh();
    } catch (err) {
      console.error('Failed to convert quote:', err);
      message.error(err.response?.data?.message || 'Failed to convert quote');
    }
  };

  const getStatusBadgeColor = (status) => {
    const config = {
      draft: { bg: '#f1f5f9', text: '#475569' },
      sent: { bg: '#dbeafe', text: '#2563eb' },
      viewed: { bg: '#ede9fe', text: '#7c3aed' },
      accepted: { bg: '#dcfce7', text: '#16a34a' },
      rejected: { bg: '#fee2e2', text: '#dc2626' },
      converted: { bg: '#ecfdf5', text: '#059669' }
    };
    return config[status] || config.draft;
  };

  const badge = getStatusBadgeColor(quote.status);
  const emailHistory = quote?.emailHistory || [];

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: '100%', maxWidth: '620px', background: '#fff',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .scrollable-panel::-webkit-scrollbar {
          width: 6px;
        }
        .scrollable-panel::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .scrollable-panel::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#f8fafc'
      }}>
        <div>
          <span style={{
            fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
            background: badge.bg, color: badge.text, textTransform: 'uppercase'
          }}>
            {quote.quoteNumber} (v{quote.version || 1}) - {quote.status}
          </span>
          <h3 style={{ margin: '6px 0 0 0', color: '#0f172a', fontWeight: 800, fontSize: '1.25rem' }}>{quote.title}</h3>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
          <X size={20} />
        </button>
      </div>

      {/* Actions Row */}
      <div style={{
        display: 'flex', gap: '10px', padding: '12px 24px',
        borderBottom: '1px solid #f1f5f9', background: '#fff',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={onEdit}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
            borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff',
            fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer'
          }}
        >
          <Edit3 size={14} /> Edit Quote
        </button>
        <button
          onClick={() => generateQuotePDF(quote)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
            borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff',
            fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer'
          }}
        >
          <Download size={14} /> Download PDF
        </button>
        <button
          onClick={() => setShowEmailModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
            borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff',
            fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer'
          }}
        >
          <Mail size={14} /> Send Email
        </button>
      </div>

      {/* Panel Scrollable Body */}
      <div className="scrollable-panel" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Account / Importer</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>{quote.accountId?.name || '—'}</span>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Linked Deal</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>{quote.opportunityId?.name || 'No linked deal'}</span>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Place Of Supply</span>
            <span style={{ fontSize: '0.85rem', color: '#334155' }}>{quote.placeOfSupply || 'Gujarat (24)'}</span>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Representative</span>
            <span style={{ fontSize: '0.85rem', color: '#334155' }}>{quote.createdById?.name || quote.createdById?.username || 'Sales Rep'}</span>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px', gridColumn: 'span 2' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Attention (Contact)</span>
            <span style={{ fontSize: '0.85rem', color: '#334155' }}>
              {quote.contactId ? `${quote.contactId.firstName} ${quote.contactId.lastName || ''}`.trim() : 'No primary contact'}
              {quote.contactId?.email && ` (${quote.contactId.email})`}
            </span>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Bill To Address</span>
            <span style={{ fontSize: '0.8rem', color: '#475569', whiteSpace: 'pre-wrap' }}>{quote.billToAddress || '—'}</span>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Ship To Address</span>
            <span style={{ fontSize: '0.8rem', color: '#475569', whiteSpace: 'pre-wrap' }}>{quote.shipToAddress || '—'}</span>
          </div>
        </div>

        {/* Status Resolution Actions */}
        {quote.status !== 'accepted' && quote.status !== 'converted' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Resolve Negotiation Status</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleUpdateStatus('accepted')}
                disabled={isUpdatingStatus}
                style={{
                  flex: 1, padding: '8px 12px', border: 'none', borderRadius: '6px',
                  background: '#16a34a', color: '#fff', fontSize: '0.8rem', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                }}
              >
                <CheckCircle2 size={14} /> Accept Proposal
              </button>
              <button
                onClick={() => setShowRejectReason(!showRejectReason)}
                disabled={isUpdatingStatus}
                style={{
                  flex: 1, padding: '8px 12px', border: 'none', borderRadius: '6px',
                  background: '#dc2626', color: '#fff', fontSize: '0.8rem', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                }}
              >
                <XCircle size={14} /> Reject Proposal
              </button>
            </div>

            {showRejectReason && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Specify Rejection Reason</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Ex. Competitor quoted lower ocean rate..."
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                  />
                  <button
                    onClick={() => handleUpdateStatus('rejected', rejectionReason)}
                    disabled={!rejectionReason.trim()}
                    style={{
                      background: '#1e293b', color: '#fff', border: 'none', borderRadius: '6px',
                      padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}

            {!quote.opportunityId && (
              <button
                onClick={handleConvert}
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #4f46e5', borderRadius: '6px',
                  background: '#fff', color: '#4f46e5', fontSize: '0.8rem', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px'
                }}
              >
                Convert to Active Opportunity Deal
              </button>
            )}
          </div>
        )}

        {/* Line Items Table */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Items Breakdown</h4>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '8px 10px' }}>Description</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>HSN/SAC</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Price (₹)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Disc %</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Tax %</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.lineItems?.map((item, idx) => (
                  <tr key={item._id || idx} style={{ borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                    <td style={{ padding: '8px 10px' }}>{item.productName}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{item.hsnSac || '392310'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Math.round(item.unitPrice).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{item.discount ? `${item.discount}%` : '0%'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{item.tax ? `${item.tax}%` : '0%'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{Math.round(item.lineTotal).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total Row */}
            <div style={{ background: '#f8fafc', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Subtotal:</span>
                <span>₹{Math.round(quote.subtotal).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Discount:</span>
                <span>- ₹{Math.round(quote.totalDiscount).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Tax:</span>
                <span>+ ₹{Math.round(quote.totalTax).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem', marginTop: '4px', borderTop: '1px dashed #cbd5e1', paddingTop: '6px' }}>
                <span>Grand Total:</span>
                <span>₹{Math.round(quote.total).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Negotiation Version Logs */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={14} /> Negotiation Version History
          </h4>

          {quote.previousVersions?.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              First negotiation draft. No previous versions archived.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

              {/* Active version info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#1e40af' }}>Version {quote.version || 1} (Active version)</span>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Last updated on {new Date(quote.updatedAt).toLocaleDateString('en-IN')}</div>
                </div>
                <span style={{ fontWeight: 700, color: '#1e40af' }}>₹{Math.round(quote.total).toLocaleString('en-IN')}</span>
              </div>

              {/* Archived versions */}
              {quote.previousVersions?.map((hist, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: '#475569' }}>Version {hist.version} (Archived)</span>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>Created on {new Date(hist.createdAt).toLocaleDateString('en-IN')}</div>
                  </div>
                  <span style={{ fontWeight: 600, color: '#475569' }}>₹{Math.round(hist.total).toLocaleString('en-IN')}</span>
                </div>
              ))}

            </div>
          )}
        </div>

        {/* Email Activity Log */}
        {emailHistory.length > 0 && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Mail size={14} /> Email Activity Log ({emailHistory.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {emailHistory.slice().reverse().map((entry, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', background: '#f8fafc', borderRadius: '8px',
                  border: '1px solid #e2e8f0', fontSize: '0.8rem'
                }}>
                  <User size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>
                      {entry.sentByUsername || 'User'}
                    </span>
                    <span style={{ color: '#64748b' }}> → </span>
                    <span style={{ color: '#475569' }}>{entry.recipientEmail}</span>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                      {new Date(entry.sentAt).toLocaleString('en-IN')} via {entry.mailClient === 'gmail' ? 'Gmail' : entry.mailClient === 'outlook' ? 'Outlook' : 'Default Client'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejection Remarks display */}
        {quote.status === 'rejected' && quote.tracking?.rejectedReason && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '12px', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 700 }}>Reason for Rejection:</span> {quote.tracking.rejectedReason}
            {quote.tracking.rejectedAt && (
              <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '4px' }}>
                Rejected on {new Date(quote.tracking.rejectedAt).toLocaleString('en-IN')}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Email Quote Modal */}
      {showEmailModal && (
        <EmailQuoteModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          quote={quote}
          onRefresh={() => {
            // Re-fetch the quote to get updated emailHistory
            axios.get(
              `${process.env.REACT_APP_API_STRING}/crm/quotes/${quote._id}`,
              getHeaders()
            ).then(res => {
              setQuote(res.data);
            }).catch(() => { });
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}
