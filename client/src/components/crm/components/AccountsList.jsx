import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { message, Modal, Button } from 'antd';
import { Edit2, Plus, Trash2, Eye } from 'lucide-react';
import AccountFormModal from './AccountFormModal';
import AccountDetailModal from './AccountDetailModal';

export default function AccountsList() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const getHeaders = () => {
    const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
    return {
      headers: {
        'Content-Type': 'application/json',
        'user-id': user._id || user.id || '',
        'username': user.username || '',
        'user-role': user.role || '',
        'Authorization': user.token ? `Bearer ${user.token}` : undefined
      },
      withCredentials: true
    };
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/accounts`, getHeaders());
      setAccounts(res.data || []);
    } catch (err) {
      setAccounts([]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Account',
      content: 'Are you sure you want to delete this account?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        try {
          await axios.delete(`${process.env.REACT_APP_API_STRING}/crm/accounts/${id}`, getHeaders());
          message.success('Account deleted successfully');
          fetchAccounts();
        } catch (error) {
          message.error('Error deleting account: ' + (error.response?.data?.message || error.message));
        }
      }
    });
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setIsFormOpen(true);
  };

  const handleViewDetail = (account) => {
    setSelectedAccount(account);
    setIsDetailOpen(true);
  };

  const filteredAccounts = accounts.filter(account =>
    (account.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (account.industry?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (account.website?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div style={{ padding: '20px', color: '#64748b' }}>Loading accounts...</div>;

  return (
    <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
      <AccountFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingAccount(null);
        }}
        onRefresh={fetchAccounts}
        account={editingAccount}
      />
      <AccountDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedAccount(null);
        }}
        account={selectedAccount}
        onEdit={handleEdit}
        onRefresh={fetchAccounts}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontWeight: 700 }}>Accounts Management</h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{filteredAccounts.length} accounts</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by name, industry, or website..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '0.9rem',
              minWidth: '250px'
            }}
          />
          <button
            onClick={() => setIsFormOpen(true)}
            style={{ background: '#4f46e5', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} /> New Account
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '16px 12px' }}>Company Name</th>
              <th style={{ padding: '16px 12px' }}>Industry</th>
              <th style={{ padding: '16px 12px' }}>Size</th>
              <th style={{ padding: '16px 12px' }}>Website</th>
              <th style={{ padding: '16px 12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No accounts found.</td></tr>
            ) : filteredAccounts.map(account => (
              <tr key={account._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fafafa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '16px 12px', fontWeight: 600, color: '#334155' }}>{account.name}</td>
                <td style={{ padding: '16px 12px', color: '#475569' }}>{account.industry || 'N/A'}</td>
                <td style={{ padding: '16px 12px', color: '#475569' }}>{account.size || 'N/A'}</td>
                <td style={{ padding: '16px 12px', color: '#475569' }}>
                  {account.website ? <a href={account.website} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5' }}>{account.website}</a> : 'N/A'}
                </td>
                <td style={{ padding: '16px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => handleViewDetail(account)}
                      title="View Details"
                      style={{ background: '#3b82f6', color: 'white', padding: '6px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleEdit(account)}
                      title="Edit"
                      style={{ background: '#10b981', color: 'white', padding: '6px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(account._id)}
                      title="Delete"
                      style={{ background: '#ef4444', color: 'white', padding: '6px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
