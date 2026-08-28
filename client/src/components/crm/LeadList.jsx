import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { message } from 'antd';

import LeadFormModal from './components/LeadFormModal';
import LeadDetailModal from './components/LeadDetailModal';
import FilterBar from './components/FilterBar';

const ALLOWED_SERVICES = [
  'freight forwarding',
  'dgft',
  'e-lock',
  'client',
  'transportation',
  'paramount',
  'rabs',
  'auto rack'
];

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

export default function LeadList() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(null);

  // Teams & Source for filtering
  const [userTeams, setUserTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [viewScope, setViewScope] = useState('my_teams');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedLeadForDuplicate, setSelectedLeadForDuplicate] = useState(null);
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState(null);
  const [selectedLeadForRefer, setSelectedLeadForRefer] = useState(null);
  const [targetReferTeamId, setTargetReferTeamId] = useState('');
  const [isReferring, setIsReferring] = useState(false);
  const [allTeams, setAllTeams] = useState([]);
  const [searchReferral, setSearchReferral] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [filters, setFilters] = useState(() => {
    try {
      const stored = localStorage.getItem('crm_filters_leads');
      if (stored) return JSON.parse(stored);
    } catch (e) { }
    return {
      type: 'this_month',
      month: new Date().toISOString().substring(0, 7),
      startDate: '',
      endDate: ''
    };
  });

  const handleFilterChange = (newFilters) => {
    setFilters(prev => {
      if (
        prev &&
        prev.type === newFilters.type &&
        prev.month === newFilters.month &&
        prev.startDate === newFilters.startDate &&
        prev.endDate === newFilters.endDate
      ) {
        return prev;
      }
      return newFilters;
    });
  };

  const fetchLeads = async (teamId = selectedTeamId, source = selectedSource, service = selectedService, referral = searchReferral, activeFilters = filters, scope = viewScope, query = searchQuery) => {
    if (!activeFilters) return;
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (scope === 'all') queryParams.append('all', 'true');
      if (teamId) queryParams.append('teamId', teamId);
      if (source) queryParams.append('source', source);
      if (service) queryParams.append('service', service);
      if (referral) queryParams.append('referralSourceName', referral);
      if (query) queryParams.append('searchQuery', query);

      if (activeFilters.startDate && activeFilters.endDate) {
        queryParams.append('startDate', activeFilters.startDate);
        queryParams.append('endDate', activeFilters.endDate);
      } else if (activeFilters.month) {
        queryParams.append('period', activeFilters.month);
      }

      queryParams.append('_t', Date.now());

      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/leads?${queryParams.toString()}`,
        getHeaders()
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

      const teamsList = res.data.teams || [];
      setAllTeams(teamsList);
      const myTeams = teamsList.filter(team => {
        const isManager = team.managerId === userId || team.managerId?._id === userId;
        const isMember = team.memberIds?.some(m => m === userId || m?._id === userId);
        return isManager || isMember;
      });
      setUserTeams(myTeams);
    } catch (err) {
      console.error('Error fetching user teams:', err);
    }
  };

  const handleReferSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLeadForRefer || !targetReferTeamId) return;
    setIsReferring(true);
    try {
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/crm/leads/${selectedLeadForRefer._id}/refer`,
        { targetTeamId: targetReferTeamId },
        getHeaders()
      );
      message.success('Lead referred to internal team successfully!');
      setSelectedLeadForRefer(null);
      setTargetReferTeamId('');
      fetchLeads();
    } catch (err) {
      console.error('Referral failed:', err);
      message.error(err.response?.data?.message || 'Failed to refer lead');
    } finally {
      setIsReferring(false);
    }
  };

  useEffect(() => {
    fetchUserTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (filters) {
      // Adding a small debounce for the search query if the user is typing fast
      const delayDebounceFn = setTimeout(() => {
        fetchLeads(selectedTeamId, selectedSource, selectedService, searchReferral, filters, viewScope, searchQuery);
      }, 500);

      return () => clearTimeout(delayDebounceFn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, selectedTeamId, selectedSource, selectedService, searchReferral, viewScope, searchQuery]);

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
        getHeaders()
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

  return (
    <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
      <LeadFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedLeadForDuplicate(null);
          setSelectedLeadForEdit(null);
        }}
        onRefresh={fetchLeads}
        leadToDuplicate={selectedLeadForDuplicate}
        leadToEdit={selectedLeadForEdit}
      />

      <LeadDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedLead(null);
        }}
        lead={selectedLead}
        onEdit={(lead) => {
          setSelectedLeadForEdit(lead);
          setIsModalOpen(true);
        }}
        onRefresh={fetchLeads}
      {/* Refer Lead Modal */}
      {selectedLeadForRefer && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', color: '#1e293b', fontWeight: 700 }}>
              Refer Lead to Internal Team
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>
              Refer <strong>{selectedLeadForRefer.company}</strong> to another team (e.g. Team Paramount → Team eLock). Both teams will retain visibility.
            </p>
            <form onSubmit={handleReferSubmit}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Target Internal Team *</label>
              <select
                required
                value={targetReferTeamId}
                onChange={e => setTargetReferTeamId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px', fontSize: '0.9rem', background: '#fff' }}
              >
                <option value="">-- Select Target Team --</option>
                {allTeams.map(team => (
                  <option key={team._id} value={team._id}>{team.name || team.teamName}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setSelectedLeadForRefer(null)}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReferring}
                  style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {isReferring ? 'Referring...' : 'Confirm Referral'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
          {/* View Scope Dropdown */}
          <select
            value={viewScope}
            onChange={(e) => {
              setViewScope(e.target.value);
              if (e.target.value === 'all') {
                setSelectedTeamId('');
              }
            }}
            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#4f46e5', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
          >
            <option value="my_teams">My Team Leads</option>
            <option value="all">All Company Leads</option>
          </select>

          {/* Team Filter Dropdown */}
          {userTeams.length > 0 && viewScope !== 'all' && (
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 500, outline: 'none', cursor: 'pointer' }}
            >
              <option value="">All My Teams</option>
              {userTeams.map(team => (
                <option key={team._id} value={team._id}>{team.name}</option>
              ))}
            </select>
          )}

          {/* Lead Source Dropdown */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 500, outline: 'none', cursor: 'pointer' }}
          >
            <option value="">All Lead Sources</option>
            <optgroup label="── Standard ──">
              <option value="Web / Own Generated Lead">Web / Own Generated Lead</option>
              <option value="IndiaMart Lead">IndiaMart Lead</option>
              <option value="Direct Sales Visit">Direct Sales Visit</option>
              <option value="Referral">Referral</option>
              <option value="Email Campaign">Email Campaign</option>
            </optgroup>
            <optgroup label="── Transportation ──">
              <option value="CHA (Custom House Agent)">CHA (Custom House Agent)</option>
              <option value="Freight Forwarder">Freight Forwarder</option>
              <option value="Importer">Importer</option>
              <option value="Exporter">Exporter</option>
            </optgroup>
          </select>

          {/* Service Filter Dropdown */}
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 500, outline: 'none', cursor: 'pointer' }}
          >
            <option value="">All Services</option>
            {ALLOWED_SERVICES.map(s => (
              <option key={s} value={s}>{s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
            ))}
          </select>

          {/* Referral Search Input */}
          <input
            type="text"
            placeholder="Search Referral By..."
            value={searchReferral}
            onChange={(e) => setSearchReferral(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 500, outline: 'none', width: '160px' }}
          />

          {/* General Search Input */}
          <input
            type="text"
            placeholder="Search Leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 500, outline: 'none', width: '160px' }}
          />

          <button
            onClick={() => setIsModalOpen(true)}
            style={{ background: '#4f46e5', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
          >
            + New Lead
          </button>
        </div>
      </div>

      {/* Persistent Filter Bar */}
      <FilterBar moduleName="leads" onChange={handleFilterChange} />

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>
            <div style={{ fontSize: '18px', marginBottom: '12px' }}>⏳ Loading leads...</div>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>Fetching your lead list</div>
          </div>
        </div>
      ) : (
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
                  <td style={{ padding: '16px 12px', fontWeight: 600, color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{lead.company || 'N/A'}</span>
                      {lead.source && (
                        <span style={{
                          fontSize: '0.65rem',
                          background: lead.source === 'IndiaMart Lead' ? '#ffedd5'
                            : lead.source === 'Referral' ? '#dcfce7'
                              : lead.source === 'Direct Sales Visit' ? '#f3e8ff'
                                : lead.source === 'Email Campaign' ? '#fce7f3'
                                  : lead.source === 'Web / Own Generated Lead' ? '#e0f2fe'
                                    : '#f1f5f9',
                          color: lead.source === 'IndiaMart Lead' ? '#c2410c'
                            : lead.source === 'Referral' ? '#15803d'
                              : lead.source === 'Direct Sales Visit' ? '#6b21a8'
                                : lead.source === 'Email Campaign' ? '#be185d'
                                  : lead.source === 'Web / Own Generated Lead' ? '#0369a1'
                                    : '#475569',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          border: '1px solid',
                          borderColor: lead.source === 'IndiaMart Lead' ? '#fed7aa'
                            : lead.source === 'Referral' ? '#bbf7d0'
                              : lead.source === 'Direct Sales Visit' ? '#e9d5ff'
                                : lead.source === 'Email Campaign' ? '#fbcfe8'
                                  : lead.source === 'Web / Own Generated Lead' ? '#bae6fd'
                                    : '#e2e8f0',
                        }}>
                          {lead.source}
                        </span>
                      {lead.isReferral && (
                        <span style={{
                          fontSize: '0.65rem', background: '#fef2f2', color: '#b91c1c',
                          padding: '2px 8px', borderRadius: '12px', fontWeight: 800, border: '1px solid #fecaca'
                        }}>
                          ⚡ Referred ({lead.referredFromTeamId?.teamName || lead.referredFromTeamId?.name || 'Team'} → {lead.referredToTeamId?.teamName || lead.referredToTeamId?.name || 'Team'})
                        </span>
                      )}
                    </div>
                    {lead.source === 'Referral' && lead.referralSourceName && (
                      <div style={{ fontSize: '0.75rem', color: '#165b33', marginTop: '4px', fontWeight: 600 }}>
                        Referral By: <span>{lead.referralSourceName}</span>
                      </div>
                    )}
                    {lead.interestedServices && lead.interestedServices.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {lead.interestedServices.map((service, i) => (
                          <span key={i} style={{
                            fontSize: '0.65rem', background: '#eef2ff', color: '#4f46e5',
                            padding: '1px 6px', borderRadius: '4px', border: '1px solid #c7d2fe',
                            whiteSpace: 'nowrap', textTransform: 'capitalize', fontWeight: 600
                          }}>
                            {service}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
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
                      <button
                        onClick={() => {
                          setSelectedLeadForRefer(lead);
                          setTargetReferTeamId('');
                        }}
                        style={{ background: '#fef3c7', color: '#92400e', padding: '6px 14px', border: '1px solid #fde68a', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Refer
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLeadForDuplicate(lead);
                          setIsModalOpen(true);
                        }}
                        style={{ background: '#eef2ff', color: '#4f46e5', padding: '6px 14px', border: '1px solid #c7d2fe', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Duplicate
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
      )}
    </div>
  );
}
