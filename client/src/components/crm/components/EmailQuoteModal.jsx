import React, { useState } from 'react';
import axios from 'axios';
import { X, Send, Mail, Paperclip, AlertCircle, Clock, User, ArrowRight, Building } from 'lucide-react';
import { message } from 'antd';
import { getQuotePDFBase64 } from '../utils/pdfGenerator';

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

const MAIL_CLIENTS = [
  {
    id: 'ses',
    label: 'Company Email (Direct)',
    sublabel: 'Send directly from Company Server with PDF attached automatically',
    emoji: <Building size={20} style={{ color: '#059669' }} />,
    hoverBg: '#dcfce7',
    hoverBorder: '#86efac',
    buildUrl: null,
    openMode: 'server',
  },
  {
    id: 'gmail',
    label: 'Gmail (Web)',
    sublabel: 'Open draft in mail.google.com (Attach PDF manually)',
    emoji: <span style={{ fontSize: '1.2rem' }}>📧</span>,
    hoverBg: '#fee2e2',
    hoverBorder: '#fca5a5',
    buildUrl: (to, subject, body) =>
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    openMode: 'tab',
  },
  {
    id: 'outlook',
    label: 'Outlook Web (M365)',
    sublabel: 'Open draft in outlook.office.com (Attach PDF manually)',
    emoji: <span style={{ fontSize: '1.2rem' }}>📬</span>,
    hoverBg: '#e0f2fe',
    hoverBorder: '#bae6fd',
    buildUrl: (to, subject, body) =>
      `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    openMode: 'tab',
  },
  {
    id: 'default',
    label: 'Default Mail Client',
    sublabel: 'Open local app (e.g. desktop Outlook) (Attach PDF manually)',
    emoji: <span style={{ fontSize: '1.2rem' }}>🖥️</span>,
    hoverBg: '#ede9fe',
    hoverBorder: '#ddd6fe',
    buildUrl: (to, subject, body) =>
      `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    openMode: 'self',
  },
];

export default function EmailQuoteModal({ isOpen, onClose, quote, onRefresh }) {
  const contactEmail = quote?.contactId?.email || '';
  const contactName = quote?.contactId
    ? `${quote.contactId.firstName} ${quote.contactId.lastName || ''}`.trim()
    : 'Valued Customer';

  const [recipientEmail, setRecipientEmail] = useState(contactEmail);
  const [subject, setSubject] = useState(`Quotation ${quote?.quoteNumber || ''}: ${quote?.title || ''}`);

  const defaultBody = `Dear ${contactName},

Thank you for your continued trust in Paramount Propack Pvt Ltd.

We are pleased to present our pricing proposal for "${quote?.title || ''}" (Ref: ${quote?.quoteNumber || ''}). 

Key Details of the Proposal:
• Quotation ID: ${quote?.quoteNumber || ''}
• Grand Total: ₹${Math.round(quote?.total || 0).toLocaleString('en-IN')}
• Payment Terms: ${quote?.terms?.paymentTerms || 'Net 30'}
• Valid Until: ${quote?.terms?.validUntil ? new Date(quote.terms.validUntil).toLocaleDateString('en-IN') : ''}

A detailed breakdown of the items, pricing, and terms is provided below in this email, and a formal PDF copy is attached for your records.

We remain committed to delivering the highest quality products and services. Please feel free to reach out if you have any questions or require further clarifications regarding this proposal.

Warm regards,
Sales Team
Paramount Propack Pvt Ltd`;

  const [body, setBody] = useState(defaultBody);
  const [isSending, setIsSending] = useState(false);
  const [hoveredClient, setHoveredClient] = useState(null);

  if (!isOpen) return null;

  const handleSendViaClient = async (client) => {
    if (!recipientEmail) {
      message.warning('Recipient email is required.');
      return;
    }

    setIsSending(true);
    let hideLoading;
    try {
      let payload = {
        recipientEmail,
        subject,
        body,
        mailClient: client.id,
      };

      if (client.openMode === 'server') {
        hideLoading = message.loading('Generating PDF and sending email...', 0);
        try {
          payload.pdfBase64 = getQuotePDFBase64(quote);
        } catch (pdfErr) {
          if (hideLoading) hideLoading();
          message.error('Failed to generate PDF. Please try another mail client.');
          setIsSending(false);
          return;
        }
      }

      // 1. Call backend to update status + log email activity
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/crm/quotes/${quote._id}/send`,
        payload,
        getHeaders()
      );

      if (hideLoading) hideLoading();

      if (res.data.success !== false) {
        if (client.openMode === 'server') {
          if (res.data.emailDelivered === false) {
            message.warning(res.data.message || 'Status updated, but email delivery failed.');
          } else {
            message.success(res.data.message || 'Email sent successfully via Company Email.');
          }
        } else {
          // 2. Open the mail client with pre-filled draft
          const url = client.buildUrl(recipientEmail, subject, body);
          if (client.openMode === 'tab') {
            window.open(url, '_blank');
          } else {
            window.location.href = url;
          }
          message.success(`Status updated. Opening ${client.label}...`);
        }
        if (onRefresh) onRefresh();
        onClose();
      } else {
        message.warning(res.data.message || 'Status update failed.');
      }
    } catch (err) {
      if (hideLoading) hideLoading();
      console.error('Failed to process quote send:', err);
      message.error(err.response?.data?.message || 'Failed to update quote status');
    } finally {
      setIsSending(false);
    }
  };

  const emailHistory = quote?.emailHistory || [];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: '20px'
    }}>
      <style>{`
        @keyframes modalEntrance {
          from { transform: scale(0.95) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .email-modal-card {
          animation: modalEntrance 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .email-modal-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .email-modal-scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .email-modal-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
      `}</style>

      <div className="email-modal-card" style={{
        background: '#fff', width: '100%', maxWidth: '720px', maxHeight: '92vh',
        borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
          color: '#fff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mail size={22} />
            <div>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.15rem', color: '#fff' }}>Send Quotation</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
                Compose, review, and send {quote?.quoteNumber} via your preferred mail client
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', opacity: 0.8 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="email-modal-scroll" style={{
          flex: 1, overflowY: 'auto', padding: '24px',
          display: 'flex', flexDirection: 'column', gap: '18px'
        }}>

          {/* Recipient Email */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
              Recipient Email *
            </label>
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="customer@example.com"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem',
                transition: 'border-color 0.2s', background: '#f8fafc',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#4f46e5'}
              onBlur={e => e.target.style.borderColor = '#cbd5e1'}
            />
            {!contactEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: '#ea580c', fontSize: '0.75rem', fontWeight: 500 }}>
                <AlertCircle size={12} />
                <span>No primary contact email found. Please specify the recipient email address above.</span>
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email Subject"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem',
                transition: 'border-color 0.2s', boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#4f46e5'}
              onBlur={e => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>

          {/* Body */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
              Email Body
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={7}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '10px',
                border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem',
                fontFamily: 'inherit', resize: 'vertical', lineHeight: '1.5',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#4f46e5'}
              onBlur={e => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>



          {/* Choose Mail Client — Send Buttons */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '18px', marginTop: '4px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send size={14} /> Choose Mail Client & Send
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {MAIL_CLIENTS.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleSendViaClient(client)}
                  disabled={isSending}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', padding: '12px 16px',
                    borderRadius: '10px',
                    border: `1px solid ${hoveredClient === client.id ? client.hoverBorder : '#e2e8f0'}`,
                    background: hoveredClient === client.id ? client.hoverBg : '#f8fafc',
                    textAlign: 'left', cursor: isSending ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s', width: '100%',
                    opacity: isSending ? 0.6 : 1,
                    gridColumn: client.id === 'ses' ? '1 / -1' : 'auto'
                  }}
                  onMouseEnter={() => setHoveredClient(client.id)}
                  onMouseLeave={() => setHoveredClient(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: '#fff', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      {client.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{client.label}</span>
                    </div>
                    <ArrowRight size={16} style={{ color: '#94a3b8' }} />
                  </div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>{client.sublabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Email History Audit Log */}
          {emailHistory.length > 0 && (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '18px', marginTop: '4px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} /> Email Activity Log ({emailHistory.length})
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
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ fontWeight: 600, color: '#334155' }}>
                            {entry.sentByUsername || 'User'}
                          </span>
                          <span style={{ color: '#64748b' }}> → </span>
                          <span style={{ color: '#475569' }}>{entry.recipientEmail}</span>
                        </div>
                        {entry.deliveryStatus && (
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                            padding: '2px 6px', borderRadius: '4px',
                            background: entry.deliveryStatus === 'failed' ? '#fee2e2' : entry.deliveryStatus === 'sent' ? '#dcfce7' : '#f1f5f9',
                            color: entry.deliveryStatus === 'failed' ? '#dc2626' : entry.deliveryStatus === 'sent' ? '#16a34a' : '#64748b'
                          }}>
                            {entry.deliveryStatus}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                        {new Date(entry.sentAt).toLocaleString('en-IN')} via {
                          entry.mailClient === 'gmail' ? 'Gmail' :
                            entry.mailClient === 'outlook' ? 'Outlook' :
                              entry.mailClient === 'ses' ? 'Company Server' : 'Default Client'
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc',
          display: 'flex', justifyContent: 'flex-end'
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            style={{
              padding: '10px 20px', border: '1px solid #cbd5e1', borderRadius: '8px',
              background: '#fff', fontSize: '0.875rem', fontWeight: 600, color: '#475569',
              cursor: 'pointer', transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
