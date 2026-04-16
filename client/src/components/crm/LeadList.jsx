import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { message } from 'antd';

import LeadFormModal from './components/LeadFormModal';
import LeadDetailModal from './components/LeadDetailModal';

export default function LeadList() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(null);
  
  // Teams for filtering
  const [userTeams, setUserTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');

  const fetchLeads = async (teamId = selectedTeamId) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (teamId) queryParams.append('teamId', teamId);
      
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/leads${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
        { withCredentials: true }
      );
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError(err.response?.data?.message || 'Failed to load leads');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTeams = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
      const userId = user._id || user.id || '';
      
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/teams`,
        { 
          headers: {
            'Content-Type': 'application/json',
            'user-id': userId,
            'username': user.username || '',
            'user-role': user.role || '',
            'Authorization': user.token ? `Bearer ${user.token}` : undefined
          },
          withCredentials: true 
        }
      );
      
      // Filter to only teams where the user is a member or manager
      const myTeams = (res.data.teams || []).filter(team => {
        const isManager = team.managerId === userId || team.managerId?._id === userId;
        const isMember = team.memberIds?.some(m => m === userId || m?._id === userId);
        return isManager || isMember;
      });
      setUserTeams(myTeams);
    } catch (err) {
      console.error('Error fetching user teams:', err);
    }
  };

  useEffect(() => {
    fetchUserTeams();
    fetchLeads();
  }, []);

  const handleConvert = async (leadId, leadName) => {
    if (!window.confirm(`Convert "${leadName}" into an Account & Opportunity?\n\nThis will create a new account, contact, and sales opportunity.`)) {
      return;
    }

    setConverting(leadId);
    setError(null);
    
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/crm/leads/${leadId}/convert`,
        {},
        { withCredentials: true }
      );
      
      if (res.data.success) {
        const { data } = res.data;
        message.success({
          content: `✓ Lead converted successfully!\nAccount: ${data.account.name}\nOpportunity: ${data.opportunity.name}`,
          duration: 3
        });
        // Refresh the leads list
        fetchLeads();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to convert lead';
      console.error('Conversion error:', error);
      setError(errorMsg);
      message.error(`❌ ${errorMsg}`);
    } finally {
      setConverting(null);
    }
  };

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>
        <div style={{ fontSize: '18px', marginBottom: '12px' }}>⏳ Loading leads...</div>
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>Fetching your lead list</div>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
      <LeadFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={fetchLeads} 
      />
      
      <LeadDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedLead(null);
        }}
        lead={selectedLead}
        onEdit={(lead) => {
          // Future: handle edit from detail
          setIsModalOpen(true);
        }}
        onRefresh={fetchLeads}
      />
      
      {/* Error notification */}
      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid #fca5a5'
        }}>
          <span>⚠️ {error}</span>
          <button 
            onClick={() => setError(null)}
            style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '18px' }}
          >×</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ margin: 0, color: '#1e293b', fontWeight: 700 }}>Lead Management</h2>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Team Filter Dropdown */}
          {userTeams.length > 0 && (
            <select
              value={selectedTeamId}
              onChange={(e) => {
                setSelectedTeamId(e.target.value);
                fetchLeads(e.target.value);
              }}
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 500, outline: 'none', cursor: 'pointer' }}
            >
              <option value="">All My Teams</option>
              {userTeams.map(team => (
                <option key={team._id} value={team._id}>{team.name}</option>
              ))}
            </select>
          )}
          
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ background: '#4f46e5', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
          >
            + New Lead
          </button>
        </div>
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
                   <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                     <button
                       onClick={() => {
                         setSelectedLead(lead);
                         setIsDetailModalOpen(true);
                       }}
                       style={{ background: '#f8fafc', color: '#475569', padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                     >
                       View
                     </button>
                     {lead.status !== 'converted' && (
                       <button 
                         onClick={() => handleConvert(lead._id, `${lead.firstName} ${lead.lastName}`)}
                         disabled={converting === lead._id}
                         style={{ 
                           background: converting === lead._id ? '#d1d5db' : '#10b981', 
                           color: 'white', 
                           padding: '6px 14px', 
                           border: 'none', 
                           borderRadius: '6px', 
                           cursor: converting === lead._id ? 'not-allowed' : 'pointer', 
                           fontSize: '0.8rem', 
                           fontWeight: 600,
                           opacity: converting === lead._id ? 0.6 : 1,
                           minWidth: '90px'
                         }}
                       >
                         {converting === lead._id ? '⏳ Converting...' : 'Convert'}
                       </button>
                     )}
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
