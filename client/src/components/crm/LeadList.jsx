import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { message } from 'antd';

import LeadFormModal from './components/LeadFormModal';

export default function LeadList() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const dummyLeads = [
    { _id: '1', company: 'Acme Corp', firstName: 'John', lastName: 'Smith', email: 'john@acme.com', phone: '+1-555-0101', status: 'open', source: 'LinkedIn', lastContact: new Date(Date.now() - 2*24*60*60*1000) },
    { _id: '2', company: 'Tech Ventures', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah@techventures.io', phone: '+1-555-0102', status: 'open', source: 'Referral', lastContact: new Date(Date.now() - 1*24*60*60*1000) },
    { _id: '3', company: 'Innovate Solutions', firstName: 'Michael', lastName: 'Chen', email: 'michael@innovate.co', phone: '+1-555-0103', status: 'open', source: 'Website', lastContact: new Date(Date.now() - 5*24*60*60*1000) },
    { _id: '4', company: 'Global Systems', firstName: 'Emily', lastName: 'Davis', email: 'emily@global.net', phone: '+1-555-0104', status: 'converted', source: 'Cold Call', lastContact: new Date(Date.now() - 10*24*60*60*1000) },
    { _id: '5', company: 'Enterprise Inc', firstName: 'Robert', lastName: 'Wilson', email: 'robert@enterprise.com', phone: '+1-555-0105', status: 'open', source: 'Event', lastContact: new Date(Date.now() - 3*24*60*60*1000) },
    { _id: '6', company: 'Startup Hub', firstName: 'Lisa', lastName: 'Anderson', email: 'lisa@startup.io', phone: '+1-555-0106', status: 'open', source: 'LinkedIn', lastContact: new Date(Date.now() - 7*24*60*60*1000) }
  ];

  const fetchLeads = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/leads`, { withCredentials: true });
      setLeads(res.data && res.data.length > 0 ? res.data : dummyLeads);
    } catch (err) {
      setLeads(dummyLeads);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleConvert = async (leadId) => {
    try {
      if(!window.confirm("Convert this Lead into an Account & Opportunity?")) return;
      const res = await axios.post(`${process.env.REACT_APP_API_STRING}/crm/leads/${leadId}/convert`, {}, { withCredentials: true });
      const { accountId, opportunityId } = res.data;
      message.success(`Lead converted successfully! Account: ${accountId}, Opportunity: ${opportunityId}`);
      fetchLeads();
    } catch (error) {
      message.error("Error converting lead: " + (error.response?.data?.message || error.message));
    }
  };

  if (loading) return <div style={{ padding: '20px', color: '#64748b' }}>Loading leads...</div>;

  return (
    <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
      <LeadFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={fetchLeads} 
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: '#1e293b', fontWeight: 700 }}>Lead Management</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ background: '#4f46e5', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', position: 'relative', zIndex: 10 }}
        >
          + New Lead
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '16px 12px' }}>Company</th>
              <th style={{ padding: '16px 12px' }}>Contact Person</th>
              <th style={{ padding: '16px 12px' }}>Status</th>
              <th style={{ padding: '16px 12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No leads found in your pipeline.</td></tr>
            ) : leads.map(lead => (
              <tr key={lead._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fafafa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '16px 12px', fontWeight: 600, color: '#334155' }}>{lead.company || 'N/A'}</td>
                <td style={{ padding: '16px 12px', color: '#475569' }}>{lead.firstName} {lead.lastName}</td>
                <td style={{ padding: '16px 12px' }}>
                  <span style={{ 
                    background: lead.status === 'converted' ? '#dcfce7' : '#fef3c7', 
                    color: lead.status === 'converted' ? '#166534' : '#92400e', 
                    padding: '6px 12px', 
                    borderRadius: '20px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700,
                    textTransform: 'capitalize'
                  }}>
                    {lead.status}
                  </span>
                </td>
                <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                  {lead.status !== 'converted' && (
                    <button 
                      onClick={() => handleConvert(lead._id)} 
                      style={{ background: '#10b981', color: 'white', padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      Convert
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
