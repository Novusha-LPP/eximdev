import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, Filter, MessageSquare, Clock, ArrowRight, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { message } from 'antd';
import PricingRequestFormModal from './PricingRequestFormModal';
import PricingRequestDetailPanel from './PricingRequestDetailPanel';

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

export default function PricingRequestsList({ hideRaiseButton }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/pricing-requests`,
        getHeaders()
      );
      setRequests(res.data || []);
    } catch (err) {
      console.error('Failed to fetch pricing requests:', err);
      message.error('Failed to load pricing requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const getStatusBadge = (status) => {
    const config = {
      pending: { bg: '#fef3c7', text: '#d97706', label: 'Pending', icon: <Clock size={12} /> },
      in_progress: { bg: '#dbeafe', text: '#2563eb', label: 'In Progress', icon: <Clock size={12} /> },
      approved: { bg: '#dcfce7', text: '#16a34a', label: 'Approved', icon: <CheckCircle2 size={12} /> },
      rejected: { bg: '#fee2e2', text: '#dc2626', label: 'Rejected', icon: <AlertCircle size={12} /> }
    };
    const s = config[status] || config.pending;
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
        fontWeight: 600,
        textTransform: 'capitalize'
      }}>
        {s.icon} {s.label}
      </span>
    );
  };

  const filteredRequests = requests.filter(req => {
    const matchSearch = req.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.relatedTo?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !statusFilter || req.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '500px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Search by subject or related record name..."
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
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {!hideRaiseButton && (
          <button
            onClick={() => setIsFormOpen(true)}
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
            <Plus size={16} /> Request Pricing
          </button>
        )}
      </div>

      {/* Requests List */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>⏳ Loading pricing requests...</div>
      ) : filteredRequests.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '12px' }}>
          📭 No pricing requests found matching filters.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Subject / Issue</th>
                <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Related To</th>
                <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Status</th>

                <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Salesperson</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map(req => (
                <tr
                  key={req._id}
                  onClick={() => setSelectedRequest(req)}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{req.subject}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>
                      {req.relatedTo.model}: {req.relatedTo.name || 'Link'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>{getStatusBadge(req.status)}</td>

                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#475569' }}>
                    {req.requestedBy?.first_name ? `${req.requestedBy.first_name} ${req.requestedBy.last_name || ''}` : req.requestedBy?.username || 'Sales'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Request Modal */}
      <PricingRequestFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onRefresh={fetchRequests}
      />

      {/* Detail Slide-over */}
      {selectedRequest && (
        <PricingRequestDetailPanel
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onRefresh={fetchRequests}
          isAccountsView={!!hideRaiseButton}
        />
      )}
    </div>
  );
}
