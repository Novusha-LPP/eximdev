import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { message, Modal } from 'antd';

import LeadFormModal from './components/LeadFormModal';
import LeadDetailModal from './components/LeadDetailModal';
import FilterBar from './components/FilterBar';
import CrmFilterAutocomplete from './components/CrmFilterAutocomplete';
import { ALLOWED_SERVICES, formatServiceName } from './crmConstants';

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
  const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
  const role = user.role || '';
  const crmRole = user.crmRole || '';
  const isHOD = role === 'HOD' || role === 'Head_of_Department' || (typeof role === 'string' && (role.toLowerCase() === 'hod' || role.toLowerCase() === 'head_of_department'));
  const isCrmAdmin = crmRole === 'Admin' || (typeof crmRole === 'string' && crmRole.toLowerCase() === 'admin');
  const isSystemAdmin = role === 'Admin' || (typeof role === 'string' && role.toLowerCase() === 'admin');
  const isAdmin = (isSystemAdmin || isCrmAdmin) && !isHOD;
  const currentUserId = user._id || user.id || '';

  const canDeleteLead = (lead) => {
    if (!lead) return false;
    if (isAdmin) return true;
    if (!currentUserId) return false;
    const creatorId = lead.createdBy?._id || lead.createdBy || lead.referredByUserId?._id || lead.referredByUserId || lead.ownerId?._id || lead.ownerId;
    return Boolean(creatorId && creatorId.toString() === currentUserId.toString());
  };

  const handleDeleteLead = (lead) => {
    const leadName = lead.company || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'this lead';
    Modal.confirm({
      title: 'Delete Lead',
      content: `Are you sure you want to delete "${leadName}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        try {
          await axios.delete(`${process.env.REACT_APP_API_STRING}/crm/leads/${lead._id}`, getHeaders());
          message.success('Lead deleted successfully');
          fetchLeads();
        } catch (error) {
          message.error(error.response?.data?.message || 'Error deleting lead');
        }
      }
    });
  };

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
  const [targetReferUserId, setTargetReferUserId] = useState('');
  const [isReferring, setIsReferring] = useState(false);
  const [allTeams, setAllTeams] = useState([]);
  const [searchReferral, setSearchReferral] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedHsnCode, setSelectedHsnCode] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [hsnSuggestions, setHsnSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const [filters, setFilters] = useState(() => {
    try {
      const stored = localStorage.getItem('crm_filters_leads');
      if (stored) return JSON.parse(stored);
    } catch (e) { }
    return {
      type: 'all',
      month: '',
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

  const fetchLeads = async (
    teamId = selectedTeamId,
    source = selectedSource,
    service = selectedService,
    referral = searchReferral,
    activeFilters = filters,
    scope = viewScope,
    query = searchQuery,
    location = selectedLocation,
    hsnCode = selectedHsnCode
  ) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (scope === 'all') queryParams.append('all', 'true');

      const isSearching = Boolean(query && query.trim());
      if (isSearching) {
        // When searching, bypass all other applied filters!
        queryParams.append('searchQuery', query.trim());
        queryParams.append('bypassFilters', 'true');
      } else {
        if (teamId) queryParams.append('teamId', teamId);
        if (source) queryParams.append('source', source);
        if (service) queryParams.append('service', service);
        if (referral) queryParams.append('referralSourceName', referral);
        if (location) queryParams.append('location', location);
        if (hsnCode) queryParams.append('hsnCode', hsnCode);

        if (activeFilters && activeFilters.startDate && activeFilters.endDate) {
          queryParams.append('startDate', activeFilters.startDate);
          queryParams.append('endDate', activeFilters.endDate);
        } else if (activeFilters && activeFilters.month && activeFilters.month !== 'all') {
          queryParams.append('period', activeFilters.month);
        }
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
        `${process.env.REACT_APP_API_STRING}/crm/teams?all=true`,
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

  const selectedTargetTeamMembers = React.useMemo(() => {
    if (!targetReferTeamId) return [];
    const team = (allTeams.length > 0 ? allTeams : userTeams).find(t => (t._id || t.id)?.toString() === targetReferTeamId?.toString());
    if (!team) return [];
    const memberList = [];
    const seen = new Set();

    if (team.managerId) {
      const mgr = typeof team.managerId === 'object' ? team.managerId : null;
      if (mgr) {
        const id = (mgr._id || mgr.id)?.toString();
        seen.add(id);
        memberList.push({
          _id: id,
          name: `${mgr.first_name ? `${mgr.first_name} ${mgr.last_name || ''}`.trim() : mgr.username} (Team Manager)`
        });
      }
    }

    if (Array.isArray(team.memberIds)) {
      team.memberIds.forEach(m => {
        const mem = typeof m === 'object' ? m : null;
        if (mem) {
          const id = (mem._id || mem.id)?.toString();
          if (!seen.has(id)) {
            seen.add(id);
            memberList.push({
              _id: id,
              name: mem.first_name ? `${mem.first_name} ${mem.last_name || ''}`.trim() : mem.username
            });
          }
        }
      });
    }
    return memberList;
  }, [targetReferTeamId, allTeams, userTeams]);

  const handleReferSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLeadForRefer || !targetReferTeamId) return;
    setIsReferring(true);
    try {
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/crm/leads/${selectedLeadForRefer._id}/refer`,
        {
          targetTeamId: targetReferTeamId,
          targetUserId: targetReferUserId || undefined,
          targetOwnerId: targetReferUserId || undefined
        },
        getHeaders()
      );
      message.success('Lead referred to internal team successfully!');
      setSelectedLeadForRefer(null);
      setTargetReferTeamId('');
      setTargetReferUserId('');
      fetchLeads();
    } catch (err) {
      console.error('Referral failed:', err);
      message.error(err.response?.data?.message || 'Failed to refer lead');
    } finally {
      setIsReferring(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      setSuggestionsLoading(true);
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/leads/suggestions`,
        getHeaders()
      );
      if (res.data) {
        setLocationSuggestions(res.data.locations || []);
        setHsnSuggestions(res.data.hsnCodes || []);
      }
    } catch (err) {
      console.error('Failed to load lead suggestions:', err);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserTeams();
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (filters) {
      // Adding a small debounce for the search queries
      const delayDebounceFn = setTimeout(() => {
        fetchLeads(
          selectedTeamId,
          selectedSource,
          selectedService,
          searchReferral,
          filters,
          viewScope,
          searchQuery,
          selectedLocation,
          selectedHsnCode
        );
      }, 400);

      return () => clearTimeout(delayDebounceFn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, selectedTeamId, selectedSource, selectedService, searchReferral, viewScope, searchQuery, selectedLocation, selectedHsnCode]);

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
        onDelete={(lead) => {
          setIsDetailModalOpen(false);
          setSelectedLead(null);
          handleDeleteLead(lead);
        }}
        canDelete={selectedLead ? canDeleteLead(selectedLead) : false}
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0, color: '#1e293b', fontWeight: 700 }}>Lead Management</h2>

        <button
          onClick={() => setIsModalOpen(true)}
          style={{ background: '#4f46e5', color: 'white', padding: '9px 18px', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0, boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)' }}
        >
          + New Lead
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.25rem', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>
          {/* View Scope Dropdown */}
          {isAdmin && (
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
          )}

          {/* Team Filter Dropdown */}
          {(userTeams.length > 0 || allTeams.length > 0) && (
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 500, outline: 'none', cursor: 'pointer' }}
            >
              {isAdmin && <option value="">All Teams</option>}
              {(userTeams.length > 0 ? userTeams : allTeams).map(team => (
                <option key={team._id} value={team._id}>{team.name || team.teamName}</option>
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
            style={{ padding: '7px 11px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 500, fontSize: '0.825rem', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">All Services</option>
            {ALLOWED_SERVICES.map(s => (
              <option key={s} value={s}>{formatServiceName(s)}</option>
            ))}
          </select>

          {/* Location Filter Input (Primary Focus) with Autocomplete */}
          <CrmFilterAutocomplete
            icon="📍"
            label="Location"
            primary={true}
            placeholder="Port / City..."
            value={selectedLocation}
            onChange={setSelectedLocation}
            options={locationSuggestions}
            loading={suggestionsLoading}
            width="170px"
          />

          {/* HSN Code Filter Input with Autocomplete */}
          <CrmFilterAutocomplete
            icon="🏷️"
            label="HSN"
            primary={false}
            placeholder="HSN Code..."
            value={selectedHsnCode}
            onChange={setSelectedHsnCode}
            options={hsnSuggestions}
            loading={suggestionsLoading}
            width="130px"
          />

          {/* Referral Search Input */}
          <input
            type="text"
            placeholder="Search Referral By..."
            value={searchReferral}
            onChange={(e) => setSearchReferral(e.target.value)}
            style={{ padding: '7px 11px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 500, fontSize: '0.825rem', outline: 'none', width: '150px' }}
          />

          {/* General Search Input */}
          <input
            type="text"
            placeholder="Search Leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '7px 11px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 500, fontSize: '0.825rem', outline: 'none', width: '150px' }}
          />

      </div>


      {/* Persistent Filter Bar */}
      <FilterBar moduleName="leads" onChange={handleFilterChange} disabled={Boolean(searchQuery.trim())} />
      {Boolean(searchQuery.trim()) && (
        <div style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600, marginTop: '-16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>⚡</span>
          <span>Searching for <strong>"{searchQuery}"</strong> — other filters are bypassed to search across all leads.</span>
        </div>
      )}

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
              <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '10px 12px' }}>Company</th>
                <th style={{ padding: '10px 12px', background: '#f0f9ff', color: '#0369a1', fontWeight: 800 }}>📍 Location</th>
                <th style={{ padding: '10px 12px' }}>Contact Person</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No leads found matching your criteria.</td></tr>
              ) : leads.map(lead => (
                <tr key={lead._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fafafa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>
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
                      )}
                      {lead.companyType && (
                        <span style={{
                          fontSize: '0.65rem',
                          background: '#f1f5f9',
                          color: '#334155',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          border: '1px solid #cbd5e1'
                        }}>
                          🏢 {lead.companyType}
                        </span>
                      )}
                      {lead.isReferral && (
                        <span style={{
                          fontSize: '0.65rem', background: '#fef2f2', color: '#b91c1c',
                          padding: '2px 8px', borderRadius: '12px', fontWeight: 800, border: '1px solid #fecaca',
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          <span>⚡ Referred ({lead.referredFromTeamId?.teamName || lead.referredFromTeamId?.name || 'Team'} → {lead.referredToTeamId?.teamName || lead.referredToTeamId?.name || 'Team'})</span>
                          {lead.referredAt && (
                            <span style={{ color: '#991b1b', fontWeight: 600, borderLeft: '1px solid #fca5a5', paddingLeft: '4px' }}>
                              📅 {new Date(lead.referredAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    {lead.source === 'Referral' && lead.referralSourceName && (
                      <div style={{ fontSize: '0.75rem', color: '#165b33', marginTop: '4px', fontWeight: 600 }}>
                        Referral By: <span>{lead.referralSourceName}</span>
                      </div>
                    )}
                    {lead.garudaTeamMemberName && (
                      <div style={{ fontSize: '0.75rem', color: '#4f46e5', marginTop: '4px', fontWeight: 600 }}>
                        Garuda Member: <span>{lead.garudaTeamMemberName}</span>
                      </div>
                    )}
                    {lead.interestedServices && lead.interestedServices.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {lead.interestedServices.map((service, i) => (
                          <span key={i} style={{
                            fontSize: '0.65rem', background: '#eef2ff', color: '#4f46e5',
                            padding: '1px 6px', borderRadius: '4px', border: '1px solid #c7d2fe',
                            whiteSpace: 'nowrap', fontWeight: 600
                          }}>
                            {formatServiceName(service)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  {/* Location Column (Primary Focus) */}
                  <td style={{ padding: '8px 12px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 700, color: '#0369a1', fontSize: '0.82rem' }}>
                        {lead.location ? `📍 ${lead.location}` : (lead.pod || lead.pol ? `📍 ${lead.pod || lead.pol}` : '—')}
                      </span>
                      {lead.hsnCode && (
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                          🏷️ HSN: {lead.hsnCode}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px', color: '#475569', fontSize: '0.82rem' }}>{lead.firstName} {lead.lastName}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      background: lead.status === 'converted' ? '#dcfce7' : lead.status === 'lost' ? '#fee2e2' : '#fef3c7',
                      color: lead.status === 'converted' ? '#166534' : lead.status === 'lost' ? '#991b1b' : '#92400e',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'capitalize'
                    }}>
                      {lead.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsDetailModalOpen(true);
                        }}
                        style={{ background: '#f8fafc', color: '#475569', padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLeadForRefer(lead);
                          setTargetReferTeamId('');
                        }}
                        style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', border: '1px solid #fde68a', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                      >
                        Refer
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLeadForDuplicate(lead);
                          setIsModalOpen(true);
                        }}
                        style={{ background: '#eef2ff', color: '#4f46e5', padding: '4px 10px', border: '1px solid #c7d2fe', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
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
                            padding: '4px 10px',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: converting === lead._id ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            opacity: converting === lead._id ? 0.6 : 1,
                            minWidth: '70px'
                          }}
                        >
                          {converting === lead._id ? '⏳...' : 'Convert'}
                        </button>
                      )}
                      {canDeleteLead(lead) && (
                        <button
                          onClick={() => handleDeleteLead(lead)}
                          style={{
                            background: '#fee2e2',
                            color: '#991b1b',
                            padding: '4px 10px',
                            border: '1px solid #fecaca',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}
                        >
                          Delete
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
      {/* Refer Lead Modal */}
      {selectedLeadForRefer && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 99999,
          padding: '20px 14px', overflowY: 'auto'
        }}>
          <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '14px', width: '100%', maxWidth: '440px', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', margin: 'auto 0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', color: '#1e293b', fontWeight: 700 }}>
              Refer Lead to Internal Team
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: '#64748b' }}>
              Refer lead <strong>{selectedLeadForRefer.company || `${selectedLeadForRefer.firstName} ${selectedLeadForRefer.lastName}`}</strong> to another team or team member. Both teams will retain visibility.
            </p>
            <form onSubmit={handleReferSubmit}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Target Internal Team *</label>
              <select
                required
                value={targetReferTeamId}
                onChange={e => {
                  setTargetReferTeamId(e.target.value);
                  setTargetReferUserId('');
                }}
                style={{ width: '100%', padding: '7px 11px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '10px', fontSize: '0.825rem', background: '#fff' }}
              >
                <option value="">-- Select Target Team --</option>
                {(allTeams.length > 0 ? allTeams : userTeams).map(team => (
                  <option key={team._id} value={team._id}>{team.name || team.teamName}</option>
                ))}
              </select>

              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Team Member (Optional)
              </label>
              <select
                value={targetReferUserId}
                disabled={!targetReferTeamId}
                onChange={e => setTargetReferUserId(e.target.value)}
                style={{
                  width: '100%', padding: '7px 11px', borderRadius: '6px', border: '1px solid #cbd5e1',
                  marginBottom: '14px', fontSize: '0.825rem',
                  background: !targetReferTeamId ? '#f8fafc' : '#fff',
                  color: !targetReferTeamId ? '#94a3b8' : '#1e293b'
                }}
              >
                <option value="">
                  {!targetReferTeamId
                    ? '-- First select a target team --'
                    : selectedTargetTeamMembers.length === 0
                      ? '-- No members in team (Assigns to Team) --'
                      : '-- All Team / Default (Team Manager) --'}
                </option>
                {selectedTargetTeamMembers.map(m => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLeadForRefer(null);
                    setTargetReferTeamId('');
                    setTargetReferUserId('');
                  }}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', padding: '6px 14px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReferring}
                  style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  {isReferring ? 'Referring...' : 'Confirm Referral'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
