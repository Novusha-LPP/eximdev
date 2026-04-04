import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Edit2 } from 'lucide-react';
import { message } from 'antd';

export default function AccountDetailModal({ isOpen, onClose, account, onEdit, onRefresh }) {
  const [opportunities, setOpportunities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (isOpen && account?._id) {
      fetchDetails();
    }
  }, [isOpen, account]);

  const fetchDetails = async () => {
    try {
      setLoadingDetails(true);
      const [oppRes, contactRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_STRING}/crm/opportunities?accountId=${account._id}`, { withCredentials: true }),
        axios.get(`${process.env.REACT_APP_API_STRING}/crm/contacts?accountId=${account._id}`, { withCredentials: true })
      ]);
      setOpportunities(oppRes.data);
      setContacts(contactRes.data);
    } catch (err) {
      console.error('Error loading details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (!isOpen || !account) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        width: '100%',
        maxWidth: '700px',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 700, fontSize: '1.2rem' }}>{account.name}</h3>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{account.industry || 'No industry'}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                onEdit(account);
                onClose();
              }}
              style={{ padding: '8px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Edit2 size={16} /> Edit
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #4f46e5' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Size</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{account.size || 'N/A'}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Opportunities</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{opportunities.length}</div>
            </div>
          </div>

          {/* Details */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: '#475569', fontWeight: 700, marginBottom: '12px', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Website</span>
                <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>
                  {account.website ? <a href={account.website} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5' }}>{account.website}</a> : 'N/A'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Annual Revenue</span>
                <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>₹{account.annualRevenue ? parseFloat(account.annualRevenue).toLocaleString('en-IN') : '0'}</p>
              </div>
            </div>
            {account.address && (
              <div style={{ marginTop: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Address</span>
                <p style={{ margin: '4px 0 0 0', color: '#334155' }}>{account.address}</p>
              </div>
            )}
          </div>

          {/* Contacts */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: '#475569', fontWeight: 700, marginBottom: '12px', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contacts ({contacts.length})</h4>
            {contacts.length > 0 ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                {contacts.map(contact => (
                  <div key={contact._id} style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{contact.name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{contact.title || 'Contact'}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                        <div style={{ color: '#475569' }}>{contact.email || '-'}</div>
                        <div style={{ color: '#64748b' }}>{contact.phone || '-'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No contacts for this account.</p>
            )}
          </div>

          {/* Opportunities */}
          <div>
            <h4 style={{ color: '#475569', fontWeight: 700, marginBottom: '12px', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Opportunities ({opportunities.length})</h4>
            {opportunities.length > 0 ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                {opportunities.map(opp => (
                  <div key={opp._id} style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #4f46e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{opp.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Stage: {opp.stage || 'Unknown'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#4f46e5' }}>₹{parseFloat(opp.value || 0).toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{opp.probability || 0}% probability</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No opportunities for this account.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
