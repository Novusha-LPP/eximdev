import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { message, Modal } from 'antd';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import ContactFormModal from './ContactFormModal';

export default function ContactsList() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [accounts, setAccounts] = useState([]);

  const dummyContacts = [
    { _id: '1', firstName: 'John', lastName: 'Smith', email: 'john.smith@techcorp.com', phone: '+1-555-2001', title: 'VP Sales', accountId: '1', department: 'Sales', linkedinUrl: 'linkedin.com/in/johnsmith' },
    { _id: '2', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@financefirst.com', phone: '+1-555-2002', title: 'CFO', accountId: '2', department: 'Finance', linkedinUrl: 'linkedin.com/in/sarahjohnson' },
    { _id: '3', firstName: 'Michael', lastName: 'Chen', email: 'mchen@innovate.co', phone: '+1-555-2003', title: 'CEO', accountId: '3', department: 'Executive', linkedinUrl: 'linkedin.com/in/michaelchen' },
    { _id: '4', firstName: 'Emily', lastName: 'Davis', email: 'emily.davis@global-sys.com', phone: '+1-555-2004', title: 'Procurement Manager', accountId: '4', department: 'Procurement', linkedinUrl: 'linkedin.com/in/emilydavis' },
    { _id: '5', firstName: 'Robert', lastName: 'Wilson', email: 'rwilson@enterprise.com', phone: '+1-555-2005', title: 'Director IT', accountId: '5', department: 'IT', linkedinUrl: 'linkedin.com/in/robertwilson' },
    { _id: '6', firstName: 'Lisa', lastName: 'Anderson', email: 'lisa.a@techcorp.com', phone: '+1-555-2006', title: 'Operations Manager', accountId: '1', department: 'Operations', linkedinUrl: 'linkedin.com/in/lisaanderson' }
  ];

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/contacts`, { withCredentials: true });
      setContacts(res.data && res.data.length > 0 ? res.data : dummyContacts);
    } catch (err) {
      setContacts(dummyContacts);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/accounts`, { withCredentials: true });
      setAccounts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchAccounts();
  }, []);

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Contact',
      content: 'Are you sure you want to delete this contact?',
      okText: 'Delete',
      okType: 'danger',
      async onOk() {
        try {
          await axios.delete(`${process.env.REACT_APP_API_STRING}/crm/contacts/${id}`, { withCredentials: true });
          message.success('Contact deleted successfully');
          fetchContacts();
        } catch (error) {
          message.error('Error deleting contact');
        }
      }
    });
  };

  const filteredContacts = contacts.filter(contact => {
    const contactName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
    const matchesSearch = contactName.includes(searchTerm.toLowerCase()) ||
                          contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          contact.phone?.includes(searchTerm);
    const matchesAccount = !accountFilter || contact.accountId === accountFilter;
    return matchesSearch && matchesAccount;
  });

  if (loading) return <div style={{ padding: '20px', color: '#64748b' }}>Loading contacts...</div>;

  return (
    <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
      <ContactFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingContact(null);
        }}
        onRefresh={fetchContacts}
        contact={editingContact}
        accounts={accounts}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontWeight: 700 }}>Contacts Management</h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{filteredContacts.length} contacts</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.9rem' }}
          />
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.9rem' }}
          >
            <option value="">All Accounts</option>
            {accounts.map(acc => <option key={acc._id} value={acc._id}>{acc.name}</option>)}
          </select>
          <button
            onClick={() => setIsFormOpen(true)}
            style={{ background: '#4f46e5', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
          >
            <Plus size={18} /> New Contact
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '16px 12px' }}>Name</th>
              <th style={{ padding: '16px 12px' }}>Title</th>
              <th style={{ padding: '16px 12px' }}>Email</th>
              <th style={{ padding: '16px 12px' }}>Phone</th>
              <th style={{ padding: '16px 12px' }}>Account</th>
              <th style={{ padding: '16px 12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No contacts found.</td></tr>
            ) : filteredContacts.map(contact => {
              const account = accounts.find(a => a._id === contact.accountId);
              return (
                <tr key={contact._id} style={{ borderBottom: '1px solid #f1f5f9' }} onMouseEnter={e => e.currentTarget.style.background = '#fafafa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '16px 12px', fontWeight: 600, color: '#334155' }}>
                    {contact.firstName} {contact.lastName}
                    {contact.isPrimary && <span style={{ marginLeft: '8px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>PRIMARY</span>}
                  </td>
                  <td style={{ padding: '16px 12px', color: '#475569' }}>{contact.title || 'N/A'}</td>
                  <td style={{ padding: '16px 12px', color: '#475569' }}>
                    {contact.email ? <a href={`mailto:${contact.email}`} style={{ color: '#4f46e5' }}>{contact.email}</a> : 'N/A'}
                  </td>
                  <td style={{ padding: '16px 12px', color: '#475569' }}>
                    {contact.phone ? <a href={`tel:${contact.phone}`} style={{ color: '#4f46e5' }}>{contact.phone}</a> : 'N/A'}
                  </td>
                  <td style={{ padding: '16px 12px', color: '#475569' }}>{account?.name || 'Unlinked'}</td>
                  <td style={{ padding: '16px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => {
                          setEditingContact(contact);
                          setIsFormOpen(true);
                        }}
                        title="Edit"
                        style={{ background: '#10b981', color: 'white', padding: '6px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(contact._id)}
                        title="Delete"
                        style={{ background: '#ef4444', color: 'white', padding: '6px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
