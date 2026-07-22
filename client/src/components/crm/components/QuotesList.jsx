import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, FileText, CheckCircle2, AlertCircle, Eye, ArrowRight, DollarSign } from 'lucide-react';
import { message } from 'antd';
import QuoteFormModal from './QuoteFormModal';
import QuoteDetailPanel from './QuoteDetailPanel';

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

export default function QuotesList() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [quoteToEdit, setQuoteToEdit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/quotes?limit=100`,
        getHeaders()
      );
      setQuotes(res.data?.quotes || []);
    } catch (err) {
      console.error('Failed to load quotes:', err);
      message.error('Failed to load quotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const getStatusBadge = (status) => {
    const config = {
      draft: { bg: '#f1f5f9', text: '#475569', label: 'Draft' },
      sent: { bg: '#dbeafe', text: '#2563eb', label: 'Sent' },
      viewed: { bg: '#ede9fe', text: '#7c3aed', label: 'Viewed' },
      accepted: { bg: '#dcfce7', text: '#16a34a', label: 'Accepted', icon: <CheckCircle2 size={12} /> },
      rejected: { bg: '#fee2e2', text: '#dc2626', label: 'Rejected', icon: <AlertCircle size={12} /> },
      converted: { bg: '#ecfdf5', text: '#059669', label: 'Converted' },
      expired: { bg: '#fff7ed', text: '#ea580c', label: 'Expired' }
    };
    const s = config[status] || config.draft;
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: s.bg,
        color: s.text,
        padding: '3px 8px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: 600
      }}>
        {s.icon} {s.label}
      </span>
    );
  };

  const filteredQuotes = quotes.filter(q => {
    const matchSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.accountId?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !statusFilter || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Calculate high-level summary metrics
  const totalValue = quotes.reduce((sum, q) => sum + (q.total || 0), 0);
  const acceptedQuotes = quotes.filter(q => q.status === 'accepted' || q.status === 'converted');
  const winRate = quotes.length > 0 ? Math.round((acceptedQuotes.length / quotes.length) * 100) : 0;
  const totalDraftValue = quotes.filter(q => q.status === 'draft').reduce((sum, q) => sum + (q.total || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>

        {/* Metric 1 */}
        <div style={{ padding: '20px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Pipeline Value</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            ₹{totalValue.toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Across {quotes.length} total quotations</span>
        </div>

        {/* Metric 2 */}
        <div style={{ padding: '20px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Draft Proposals Value</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#475569', marginTop: '6px' }}>
            ₹{totalDraftValue.toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Awaiting negotiation/approval</span>
        </div>

        {/* Metric 3 */}
        <div style={{ padding: '20px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Proposal Win Rate</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
            {winRate}%
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>{acceptedQuotes.length} accepted proposals</span>
        </div>

      </div>

      {/* Main Table Listing */}
      <div style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '500px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="Search quotes by number, title, or customer name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '10px 16px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.9rem',
                background: '#fff',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="viewed">Viewed</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <button
            onClick={() => {
              setQuoteToEdit(null);
              setIsFormOpen(true);
            }}
            style={{
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
            }}
          >
            <Plus size={16} /> Create Quotation
          </button>
        </div>

        {/* Listing Grid */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>⏳ Loading quotations registry...</div>
        ) : filteredQuotes.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '12px' }}>
            📄 No quotations created yet. Click "Create Quotation" to draft your first pricing proposal.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Quote ID / Title</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Customer Account</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Version</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Grand Total</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Valid Until</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Created By</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map(q => (
                  <tr
                    key={q._id}
                    onClick={() => setSelectedQuote(q)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '0.75rem', background: '#e0e7ff', color: '#4338ca', display: 'inline-block', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, marginBottom: '4px' }}>
                        {q.quoteNumber}
                      </div>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{q.title}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#334155', fontWeight: 500 }}>
                      {q.accountId?.name || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>{getStatusBadge(q.status)}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                      v{q.version || 1}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                      ₹{(q.total || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#475569' }}>
                      {q.terms?.validUntil ? new Date(q.terms.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#64748b' }}>
                      {q.createdById?.name || q.createdById?.username || 'Sales Rep'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Quote creation / edit Form Modal */}
      <QuoteFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setQuoteToEdit(null);
        }}
        quoteToEdit={quoteToEdit}
        onRefresh={fetchQuotes}
      />

      {/* Detail slide-over */}
      {selectedQuote && (
        <QuoteDetailPanel
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onEdit={() => {
            setQuoteToEdit(selectedQuote);
            setSelectedQuote(null);
            setIsFormOpen(true);
          }}
          onRefresh={fetchQuotes}
        />
      )}

    </div>
  );
}
