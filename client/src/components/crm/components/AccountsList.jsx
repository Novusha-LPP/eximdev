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

  const dummyAccounts = [
    { _id: '1', name: 'TechCorp Inc', industry: 'Technology', website: 'www.techcorp.com', phone: '+1-555-1001', employees: 500, annualRevenue: 25000000, status: 'active', owner: 'John Doe', rating: 5, lastContact: new Date(Date.now() - 2*24*60*60*1000) },
    { _id: '2', name: 'FinanceFirst Bank', industry: 'Financial Services', website: 'www.financefirst.com', phone: '+1-555-1002', employees: 2000, annualRevenue: 150000000, status: 'active', owner: 'Sarah Smith', rating: 5, lastContact: new Date(Date.now() - 1*24*60*60*1000) },
    { _id: '3', name: 'Innovate Solutions', industry: 'Software', website: 'www.innovate.co', phone: '+1-555-1003', employees: 150, annualRevenue: 8000000, status: 'active', owner: 'Michael Chen', rating: 4, lastContact: new Date(Date.now() - 5*24*60*60*1000) },
    { _id: '4', name: 'Global Systems', industry: 'Consulting', website: 'www.global-sys.com', phone: '+1-555-1004', employees: 1000, annualRevenue: 75000000, status: 'active', owner: 'Emily Davis', rating: 5, lastContact: new Date(Date.now() - 3*24*60*60*1000) },
    { _id: '5', name: 'Enterprise Inc', industry: 'Manufacturing', website: 'www.enterprise.com', phone: '+1-555-1005', employees: 5000, annualRevenue: 500000000, status: 'active', owner: 'Robert Wilson', rating: 4, lastContact: new Date(Date.now() - 7*24*60*60*1000) }
  ];

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/accounts`, { withCredentials: true });
      setAccounts(res.data && res.data.length > 0 ? res.data : dummyAccounts);
    } catch (err) {
      setAccounts(dummyAccounts);
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
          await axios.delete(`${process.env.REACT_APP_API_STRING}/crm/accounts/${id}`, { withCredentials: true });
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
              <th style={{ padding: '16px 12px' }}>Health Score</th>
              <th style={{ padding: '16px 12px' }}>Website</th>
              <th style={{ padding: '16px 12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No accounts found.</td></tr>
            ) : filteredAccounts.map(account => (
              <tr key={account._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fafafa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '16px 12px', fontWeight: 600, color: '#334155' }}>{account.name}</td>
                <td style={{ padding: '16px 12px', color: '#475569' }}>{account.industry || 'N/A'}</td>
                <td style={{ padding: '16px 12px', color: '#475569' }}>{account.size || 'N/A'}</td>
                <td style={{ padding: '16px 12px' }}>
                  <span style={{
                    background: (account.healthScore || 0) > 70 ? '#dcfce7' : (account.healthScore || 0) > 40 ? '#fef3c7' : '#fee2e2',
                    color: (account.healthScore || 0) > 70 ? '#166534' : (account.healthScore || 0) > 40 ? '#92400e' : '#991b1b',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}>
                    {account.healthScore || 0}%
                  </span>
                </td>
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
