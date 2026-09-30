import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { message, Modal } from 'antd';
import { Users, Plus, Edit2, Trash2, UserCheck, X, Check, Sliders, CheckSquare, Square } from 'lucide-react';

const PIPELINE_STAGES = [
  { id: 'lead', name: 'Lead', color: '#4f8ef7', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'qualified', name: 'Qualified', color: '#7b8ef7', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'opportunity', name: 'Opportunity', color: '#a47af7', bg: '#faf5ff', border: '#e9d5ff' },
  { id: 'sales_visit', name: 'Sales Visit', color: '#d45af7', bg: '#fdf2f8', border: '#fbcfe8' },
  { id: 'proposal', name: 'Proposal', color: '#c47af7', bg: '#fbf5ff', border: '#f5d0fe' },
  { id: 'negotiation', name: 'Negotiation', color: '#f77ac4', bg: '#fff1f2', border: '#fecdd3' },
  { id: 'won', name: 'Won', color: '#00d4aa', bg: '#f0fdf4', border: '#bbf7d0' },
  { id: 'lost', name: 'Lost', color: '#f75a5a', bg: '#fef2f2', border: '#fecaca' }
];

export default function SalesTeamManagement() {
  const [teams, setTeams] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'regional',
    businessVertical: 'Paramount',
    memberIds: [],
    quotas: { monthlyRevenue: 0, dealCount: 0 },
    stagnantDays: 2
  });
  const [userSearch, setUserSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // FR-12 HOD Multi-Team Management States
  const [isHodModalOpen, setIsHodModalOpen] = useState(false);
  const [hodsList, setHodsList] = useState([]);
  const [selectedHodUser, setSelectedHodUser] = useState(null);
  const [hodManagedTeams, setHodManagedTeams] = useState([]);
  const [isSavingHod, setIsSavingHod] = useState(false);

  // Pipeline Stage Assignment States
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [selectedTeamForStages, setSelectedTeamForStages] = useState(null);
  const [memberStageMap, setMemberStageMap] = useState({}); // { [userId]: string[] }
  const [isSavingStages, setIsSavingStages] = useState(false);
  const [stageMemberSearch, setStageMemberSearch] = useState('');

  const fetchHods = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/teams/hod-assignments`,
        getHeaders()
      );
      setHodsList(res.data.hods || []);
    } catch (err) {
      console.error('Failed to load HODs', err);
    }
  };

  const handleSaveHodTeams = async () => {
    if (!selectedHodUser) return;
    setIsSavingHod(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/crm/teams/assign-hod-teams`,
        {
          userId: selectedHodUser._id,
          isHod: true,
          teamIds: hodManagedTeams
        },
        getHeaders()
      );
      message.success('HOD multi-team assignments updated successfully');
      fetchHods();
      setSelectedHodUser(null);
    } catch (err) {
      console.error('Failed to update HOD assignments:', err);
      message.error(err.response?.data?.message || 'Failed to update HOD assignments');
    } finally {
      setIsSavingHod(false);
    }
  };

  // Pipeline Stage Assignment Handlers
  const handleOpenStageModal = (team) => {
    setSelectedTeamForStages(team);
    setStageMemberSearch('');

    const initialMap = {};
    const existingAssignments = team.memberStageAssignments || [];
    const allStageIds = PIPELINE_STAGES.map(s => s.id);

    const memberUserIds = [];
    if (team.managerId) {
      const mgrId = typeof team.managerId === 'object' ? (team.managerId._id || team.managerId.id) : team.managerId;
      if (mgrId && !memberUserIds.includes(mgrId.toString())) {
        memberUserIds.push(mgrId.toString());
      }
    }
    if (Array.isArray(team.memberIds)) {
      team.memberIds.forEach(m => {
        const id = typeof m === 'object' ? (m._id || m.id) : m;
        if (id && !memberUserIds.includes(id.toString())) {
          memberUserIds.push(id.toString());
        }
      });
    }

    memberUserIds.forEach(userId => {
      const assignment = existingAssignments.find(a => {
        const aUserId = typeof a.userId === 'object' ? (a.userId._id || a.userId.id) : a.userId;
        return aUserId?.toString() === userId;
      });
      if (assignment && Array.isArray(assignment.stages) && assignment.stages.length > 0) {
        initialMap[userId] = [...assignment.stages];
      } else {
        initialMap[userId] = [...allStageIds];
      }
    });

    setMemberStageMap(initialMap);
    setIsStageModalOpen(true);
  };

  const toggleMemberStage = (userId, stageId) => {
    setMemberStageMap(prev => {
      const current = prev[userId] || [];
      const updated = current.includes(stageId)
        ? current.filter(s => s !== stageId)
        : [...current, stageId];
      return { ...prev, [userId]: updated };
    });
  };

  const setAllStagesForMember = (userId) => {
    setMemberStageMap(prev => ({
      ...prev,
      [userId]: PIPELINE_STAGES.map(s => s.id)
    }));
  };

  const clearStagesForMember = (userId) => {
    setMemberStageMap(prev => ({
      ...prev,
      [userId]: []
    }));
  };

  const setAllMembersToFullAccess = () => {
    const allIds = PIPELINE_STAGES.map(s => s.id);
    setMemberStageMap(prev => {
      const updated = {};
      Object.keys(prev).forEach(userId => {
        updated[userId] = [...allIds];
      });
      return updated;
    });
  };

  const handleSaveMemberStages = async () => {
    if (!selectedTeamForStages) return;
    setIsSavingStages(true);
    try {
      const payload = Object.entries(memberStageMap).map(([userId, stages]) => ({
        userId,
        stages: stages || []
      }));

      await axios.put(
        `${process.env.REACT_APP_API_STRING}/crm/teams/${selectedTeamForStages._id}/member-stages`,
        { memberStageAssignments: payload },
        getHeaders()
      );

      message.success('Member pipeline stage assignments updated successfully');
      setIsStageModalOpen(false);
      setSelectedTeamForStages(null);
      fetchTeams();
    } catch (err) {
      console.error('Failed to update stage assignments:', err);
      message.error(err.response?.data?.message || 'Failed to update stage assignments');
    } finally {
      setIsSavingStages(false);
    }
  };

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

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/teams`,
        getHeaders()
      );
      setTeams(res.data.teams || []);
    } catch (err) {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-all-users`,
        getHeaders()
      );
      setAllUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const toggleMember = (userId) => {
    setFormData(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(userId)
        ? prev.memberIds.filter(id => id !== userId)
        : [...prev.memberIds, userId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTeam?._id) {
        await axios.put(
          `${process.env.REACT_APP_API_STRING}/crm/teams/${editingTeam._id}`,
          formData,
          getHeaders()
        );
        message.success('Team updated successfully');
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_STRING}/crm/teams`,
          formData,
          getHeaders()
        );
        message.success('Team created — you are now the team owner');
      }
      fetchTeams();
      handleClose();
    } catch (error) {
      message.error(error.response?.data?.message || 'Error saving team');
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Team',
      content: 'Are you sure? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      async onOk() {
        try {
          await axios.delete(`${process.env.REACT_APP_API_STRING}/crm/teams/${id}`, getHeaders());
          message.success('Team deleted');
          fetchTeams();
        } catch (error) {
          message.error('Failed to delete team');
        }
      }
    });
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingTeam(null);
    setUserSearch('');
    setFormData({ name: '', description: '', type: 'regional', businessVertical: 'Paramount', memberIds: [], quotas: { monthlyRevenue: 0, dealCount: 0 }, stagnantDays: 2 });
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    const currentMemberIds = (team.memberIds || []).map(m => (typeof m === 'object' ? m._id?.toString() || m.id?.toString() : m.toString()));
    setFormData({
      name: team.name,
      description: team.description || '',
      type: team.type || 'regional',
      businessVertical: team.businessVertical || 'Paramount',
      memberIds: currentMemberIds,
      quotas: team.quotas || { monthlyRevenue: 0, dealCount: 0 },
      stagnantDays: team.stagnantDays !== undefined ? team.stagnantDays : 2
    });
    setIsFormOpen(true);
  };

  const filteredUsers = allUsers.filter(u => {
    const displayName = u.first_name ? `${u.first_name} ${u.last_name || ''}`.toLowerCase() : u.username?.toLowerCase() || '';
    return displayName.includes(userSearch.toLowerCase()) || u.username?.toLowerCase().includes(userSearch.toLowerCase());
  });

  // Safe string extractor — prevents "Objects are not valid as React child" if managerId is a populated object
  const getManagerName = (managerId) => {
    if (!managerId) return 'Unknown';
    if (typeof managerId === 'string') return managerId;
    if (typeof managerId === 'object') {
      if (managerId.first_name) return `${managerId.first_name} ${managerId.last_name || ''}`.trim();
      if (managerId.username) return managerId.username;
      return 'Unknown';
    }
    return String(managerId);
  };

  // Compile members for the Pipeline Stage Assignment Modal
  const stageModalMembers = React.useMemo(() => {
    if (!selectedTeamForStages) return [];
    const list = [];
    const seen = new Set();

    // Manager
    if (selectedTeamForStages.managerId) {
      const mgrObj = typeof selectedTeamForStages.managerId === 'object'
        ? selectedTeamForStages.managerId
        : allUsers.find(u => (u._id || u.id)?.toString() === selectedTeamForStages.managerId?.toString());
      const mgrId = (mgrObj?._id || mgrObj?.id || selectedTeamForStages.managerId)?.toString();
      if (mgrId) {
        seen.add(mgrId);
        list.push({
          _id: mgrId,
          user: mgrObj,
          name: mgrObj?.first_name ? `${mgrObj.first_name} ${mgrObj.last_name || ''}`.trim() : mgrObj?.username || 'Team Manager',
          email: mgrObj?.email || '',
          role: mgrObj?.role || 'Manager',
          isManager: true
        });
      }
    }

    // Members
    if (Array.isArray(selectedTeamForStages.memberIds)) {
      selectedTeamForStages.memberIds.forEach(m => {
        const memObj = typeof m === 'object' ? m : allUsers.find(u => (u._id || u.id)?.toString() === m?.toString());
        const memId = (memObj?._id || memObj?.id || m)?.toString();
        if (memId && !seen.has(memId)) {
          seen.add(memId);
          list.push({
            _id: memId,
            user: memObj,
            name: memObj?.first_name ? `${memObj.first_name} ${memObj.last_name || ''}`.trim() : memObj?.username || 'User',
            email: memObj?.email || '',
            role: memObj?.role || 'Member',
            isManager: false
          });
        }
      });
    }

    return list;
  }, [selectedTeamForStages, allUsers]);

  const filteredStageMembers = stageModalMembers.filter(m => {
    const q = stageMemberSearch.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  if (loading) return <div style={{ padding: '20px' }}>Loading sales teams...</div>;

  return (
    <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
      {/* Modal Form */}
      {isFormOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '16px', overflowY: 'auto'
        }}>
          <div style={{
            background: '#fff', width: '100%', maxWidth: '560px',
            borderRadius: '18px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden', maxHeight: 'min(92vh, 700px)', display: 'flex', flexDirection: 'column',
            margin: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexShrink: 0 }}>
              <div>
                <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 700 }}>
                  {editingTeam ? 'Edit Team' : 'New Sales Team'}
                </h3>
                {!editingTeam && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    You will automatically become the team owner
                  </p>
                )}
              </div>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Team Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.875rem' }}>Team Name *</label>
                <input
                  type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Enterprise Sales"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.875rem' }}>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Team Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.875rem' }}>Team Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                  >
                    <option value="regional">Regional</option>
                    <option value="product">Product-based</option>
                    <option value="industry">Industry-based</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="channel">Channel</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.875rem' }}>Business Vertical *</label>
                  <select
                    value={formData.businessVertical}
                    onChange={(e) => setFormData({ ...formData, businessVertical: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                  >
                    <option value="Novusha">Novusha</option>
                    <option value="Paramount">Paramount</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Freight Forwarding">Freight Forwarding</option>
                    <option value="Export">Export</option>
                    <option value="Import">Import</option>
                  </select>
                </div>
              </div>

              {/* Stagnant Duration */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.875rem' }}>Stagnant Duration (Days) *</label>
                <input
                  type="number" required min="1"
                  value={formData.stagnantDays}
                  onChange={(e) => setFormData({ ...formData, stagnantDays: parseInt(e.target.value, 10) || 2 })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* ── MEMBER SELECTION DROPDOWN ── */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.875rem' }}>
                  Add Members {formData.memberIds.length > 0 && <span style={{ color: '#4f46e5', fontWeight: 700 }}>({formData.memberIds.length} selected)</span>}
                </label>
                
                {/* Selected Members Pills */}
                {formData.memberIds.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {formData.memberIds.map(id => {
                      const user = allUsers.find(u => (u._id || u.id)?.toString() === id);
                      if (!user) return null;
                      const displayName = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username;
                      return (
                        <div key={id} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          background: '#eef2ff', color: '#4f46e5', padding: '4px 8px',
                          borderRadius: '16px', fontSize: '0.8rem', fontWeight: 500
                        }}>
                          {displayName}
                          <X size={14} style={{ cursor: 'pointer' }} onClick={() => toggleMember(id)} />
                        </div>
                      );
                    })}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Click to search users..."
                  value={userSearch}
                  onChange={e => {
                    setUserSearch(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '8px', boxSizing: 'border-box' }}
                />
                
                {isDropdownOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '180px',
                    overflowY: 'auto', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}>
                    {filteredUsers.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No users found</div>
                    ) : filteredUsers.map(user => {
                      const userId = (user._id || user.id)?.toString();
                      const displayName = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username;
                      const isSelected = formData.memberIds.includes(userId);
                      return (
                        <div
                          key={userId}
                          onClick={() => {
                            toggleMember(userId);
                            setUserSearch(''); // Clear search on select
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                            background: isSelected ? '#f8fafc' : 'transparent',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f1f5f9'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#f8fafc' : 'transparent'; }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isSelected ? '#94a3b8' : '#1e293b' }}>{displayName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.role || 'User'}</div>
                          </div>
                          {isSelected ? (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Added</span>
                          ) : (
                            <Plus size={16} style={{ color: '#4f46e5', flexShrink: 0 }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Backdrop to close dropdown when clicking outside */}
                {isDropdownOpen && (
                  <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }}
                    onClick={() => setIsDropdownOpen(false)}
                  />
                )}
                
                <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                  Selected members will only see their own leads within this team context.
                </p>

                {editingTeam && (
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenStageModal(editingTeam);
                    }}
                    style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      background: '#f5f3ff',
                      color: '#4f46e5',
                      border: '1px solid #c7d2fe',
                      borderRadius: '8px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: '100%',
                      justifyContent: 'center'
                    }}
                  >
                    <Sliders size={15} /> Configure Pipeline Stages for Team Members
                  </button>
                )}
              </div>

              {/* Quotas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.875rem' }}>Monthly Revenue Quota</label>
                  <input
                    type="number"
                    value={formData.quotas?.monthlyRevenue || 0}
                    onChange={(e) => setFormData({ ...formData, quotas: { ...formData.quotas, monthlyRevenue: Number(e.target.value) } })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.875rem' }}>Deal Quota (Monthly)</label>
                  <input
                    type="number"
                    value={formData.quotas?.dealCount || 0}
                    onChange={(e) => setFormData({ ...formData, quotas: { ...formData.quotas, dealCount: Number(e.target.value) } })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={handleClose} style={{ flex: 1, padding: '10px 20px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit" style={{ flex: 2, padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                  {editingTeam ? 'Update Team' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FR-12 HOD Multi-Team Access Modal */}
      {isHodModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '16px', overflowY: 'auto'
        }}>
          <div style={{
            background: '#fff', width: '100%', maxWidth: '680px',
            borderRadius: '18px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden', maxHeight: 'min(92vh, 750px)', display: 'flex', flexDirection: 'column',
            margin: 'auto'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexShrink: 0 }}>
              <div>
                <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={20} color="#4f46e5" /> Admin HOD Multi-Team Access
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Assign cross-team visibility to Head of Departments (HODs) so they can monitor leads, deals, and members across multiple sales units.
                </p>
              </div>
              <button onClick={() => { setIsHodModalOpen(false); setSelectedHodUser(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Select User / HOD */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#334155', fontWeight: 700, fontSize: '0.875rem' }}>
                  Select Head of Department (HOD) / Manager
                </label>
                <select
                  value={selectedHodUser?._id || ''}
                  onChange={e => {
                    const u = allUsers.find(user => user._id === e.target.value);
                    setSelectedHodUser(u || null);
                    // Pre-fill existing managed teams
                    const existingHod = hodsList.find(h => h._id === e.target.value);
                    const currentTeams = existingHod?.crmManagedTeams
                      ? existingHod.crmManagedTeams.map(t => typeof t === 'object' ? t._id : t)
                      : (u?.crmManagedTeams || []);
                    setHodManagedTeams(currentTeams);
                  }}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: '#fff' }}
                >
                  <option value="">-- Choose User / HOD --</option>
                  {allUsers.map(u => {
                    const name = u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username;
                    const isHodTag = u.role?.toLowerCase() === 'hod' || u.isHod ? ' [HOD]' : '';
                    return (
                      <option key={u._id} value={u._id}>
                        {name} ({u.username}) {isHodTag}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedHodUser && (
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                      Assign Accessible Teams to {selectedHodUser.first_name || selectedHodUser.username}
                    </h4>
                    <span style={{ fontSize: '0.75rem', background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      {hodManagedTeams.length} {hodManagedTeams.length === 1 ? 'Team' : 'Teams'} Selected
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {teams.map(team => {
                      const isChecked = hodManagedTeams.includes(team._id);
                      return (
                        <div
                          key={team._id}
                          onClick={() => {
                            if (isChecked) {
                              setHodManagedTeams(hodManagedTeams.filter(id => id !== team._id));
                            } else {
                              setHodManagedTeams([...hodManagedTeams, team._id]);
                            }
                          }}
                          style={{
                            padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                            border: `1px solid ${isChecked ? '#4f46e5' : '#cbd5e1'}`,
                            background: isChecked ? '#eef2ff' : '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'all 0.15s'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isChecked ? '#312e81' : '#334155' }}>
                              {team.name}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {team.businessVertical || 'General'}
                            </span>
                          </div>
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '4px',
                            border: `2px solid ${isChecked ? '#4f46e5' : '#94a3b8'}`,
                            background: isChecked ? '#4f46e5' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {isChecked && <Check size={14} color="#fff" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => { setIsHodModalOpen(false); setSelectedHodUser(null); }}
                      style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      disabled={isSavingHod}
                      onClick={handleSaveHodTeams}
                      style={{ padding: '8px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {isSavingHod ? 'Saving...' : 'Save HOD Multi-Team Access'}
                    </button>
                  </div>
                </div>
              )}

              {/* Current Active HODs Summary */}
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Current HOD Designations & Coverage
                </h4>
                {hodsList.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', padding: '12px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                    No HOD multi-team designations configured yet. Select a user above to designate as HOD and assign teams.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {hodsList.map(h => (
                      <div key={h._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
                            {h.first_name ? `${h.first_name} ${h.last_name || ''}`.trim() : h.username}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '8px' }}>({h.email || h.username})</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {h.crmManagedTeams && h.crmManagedTeams.length > 0 ? (
                            h.crmManagedTeams.map((tm, idx) => (
                              <span key={idx} style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                                {typeof tm === 'object' ? tm.name : tm}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Default team scope</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Pipeline Stages Modal */}
      {isStageModalOpen && selectedTeamForStages && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '16px', overflowY: 'auto'
        }}>
          <div style={{
            background: '#fff', width: '100%', maxWidth: '820px',
            borderRadius: '18px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden', maxHeight: 'min(92vh, 800px)', display: 'flex', flexDirection: 'column',
            margin: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexShrink: 0 }}>
              <div>
                <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 800, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sliders size={22} style={{ color: '#4f46e5' }} />
                  Assign Pipeline Stages to Members
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.825rem', color: '#64748b' }}>
                  Team: <strong style={{ color: '#1e293b' }}>{selectedTeamForStages.name}</strong> • Vertical: <span style={{ color: '#6d28d9', fontWeight: 600 }}>{selectedTeamForStages.businessVertical || 'Paramount'}</span>
                </p>
              </div>
              <button
                onClick={() => { setIsStageModalOpen(false); setSelectedTeamForStages(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', borderRadius: '6px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Informational Guidance Box */}
              <div style={{
                background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '10px',
                padding: '12px 16px', fontSize: '0.85rem', color: '#4c1d95', lineHeight: '1.5'
              }}>
                💡 <strong>Admin Stage Access Control:</strong> Configure individual pipeline stages for users in this team. For instance, assign only <em>Proposal</em> & <em>Won</em> to members who don't need the <em>Lead</em> stage.
                Users with all stages selected have full pipeline access.
              </div>

              {/* Toolbar: Search & Global Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Search members in team..."
                  value={stageMemberSearch}
                  onChange={e => setStageMemberSearch(e.target.value)}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    fontSize: '0.875rem', width: '260px', outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={setAllMembersToFullAccess}
                  style={{
                    background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe',
                    borderRadius: '8px', padding: '7px 14px', fontSize: '0.825rem', fontWeight: 600,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <CheckSquare size={15} /> Reset Everyone to All Stages (Full Access)
                </button>
              </div>

              {/* Members List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredStageMembers.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                    No members found in this team matching your search.
                  </div>
                ) : filteredStageMembers.map(member => {
                  const assignedStages = memberStageMap[member._id] || [];
                  const isFullAccess = assignedStages.length === PIPELINE_STAGES.length;
                  const isNone = assignedStages.length === 0;

                  return (
                    <div
                      key={member._id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'border-color 0.15s'
                      }}
                    >
                      {/* Member Info Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: member.isManager ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'linear-gradient(135deg, #0284c7, #2563eb)',
                            color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.875rem', fontWeight: 700
                          }}>
                            {member.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                                {member.name}
                              </span>
                              {member.isManager && (
                                <span style={{
                                  background: '#dcfce7', color: '#166534', padding: '1px 8px',
                                  borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700
                                }}>
                                  Team Owner / Manager
                                </span>
                              )}
                              <span style={{
                                background: isFullAccess ? '#dcfce7' : isNone ? '#fee2e2' : '#eff6ff',
                                color: isFullAccess ? '#166534' : isNone ? '#991b1b' : '#1d4ed8',
                                border: `1px solid ${isFullAccess ? '#bbf7d0' : isNone ? '#fecaca' : '#bfdbfe'}`,
                                padding: '1px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700
                              }}>
                                {isFullAccess
                                  ? 'Full Access (All 8 Stages)'
                                  : isNone
                                    ? 'No Stages Assigned'
                                    : `${assignedStages.length} Stages: ${assignedStages.map(sId => PIPELINE_STAGES.find(st => st.id === sId)?.name || sId).join(', ')}`}
                              </span>
                            </div>
                            {member.email && (
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{member.email}</div>
                            )}
                          </div>
                        </div>

                        {/* Quick Member Actions */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setAllStagesForMember(member._id)}
                            style={{
                              fontSize: '0.75rem', color: '#4f46e5', background: '#eef2ff',
                              border: '1px solid #c7d2fe', borderRadius: '6px', padding: '3px 10px',
                              cursor: 'pointer', fontWeight: 600
                            }}
                          >
                            All Stages
                          </button>
                          <button
                            type="button"
                            onClick={() => clearStagesForMember(member._id)}
                            style={{
                              fontSize: '0.75rem', color: '#64748b', background: '#f8fafc',
                              border: '1px solid #e2e8f0', borderRadius: '6px', padding: '3px 10px',
                              cursor: 'pointer', fontWeight: 600
                            }}
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* Interactive Stage Chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {PIPELINE_STAGES.map(stage => {
                          const isSelected = assignedStages.includes(stage.id);
                          return (
                            <button
                              key={stage.id}
                              type="button"
                              onClick={() => toggleMemberStage(member._id, stage.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                border: isSelected ? `1.5px solid ${stage.color}` : '1.5px solid #cbd5e1',
                                background: isSelected ? stage.bg : '#f8fafc',
                                color: isSelected ? '#0f172a' : '#64748b',
                                boxShadow: isSelected ? `0 2px 4px ${stage.color}25` : 'none'
                              }}
                            >
                              <span style={{
                                width: '9px',
                                height: '9px',
                                borderRadius: '50%',
                                background: isSelected ? stage.color : '#94a3b8'
                              }} />
                              {stage.name}
                              {isSelected && (
                                <Check size={13} color={stage.color} strokeWidth={3} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex',
              justifyContent: 'flex-end', gap: '10px', background: '#f8fafc', flexShrink: 0
            }}>
              <button
                type="button"
                onClick={() => { setIsStageModalOpen(false); setSelectedTeamForStages(null); }}
                style={{
                  padding: '9px 18px', border: '1px solid #cbd5e1', background: '#ffffff',
                  borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, color: '#475569', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingStages}
                onClick={handleSaveMemberStages}
                style={{
                  padding: '9px 22px', background: '#4f46e5', color: '#ffffff', border: 'none',
                  borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)', opacity: isSavingStages ? 0.7 : 1
                }}
              >
                {isSavingStages ? 'Saving...' : 'Save Pipeline Stage Assignments'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontWeight: 700, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} style={{ color: '#4f46e5' }} />
            Sales Teams & Access Control
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Manage sales team hierarchies, quotas, and admin-controlled HOD multi-team access.</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => { fetchHods(); setIsHodModalOpen(true); }}
            style={{
              background: '#f8fafc', color: '#334155', padding: '10px 18px', border: '1px solid #cbd5e1',
              borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex',
              alignItems: 'center', gap: '8px', whiteSpace: 'nowrap'
            }}
          >
            <UserCheck size={18} style={{ color: '#4f46e5' }} /> HOD Multi-Team Access
          </button>
          <button
            onClick={() => { setEditingTeam(null); setIsFormOpen(true); }}
            style={{
              background: '#4f46e5', color: 'white', padding: '10px 20px', border: 'none',
              borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex',
              alignItems: 'center', gap: '8px', whiteSpace: 'nowrap'
            }}
          >
            <Plus size={18} /> New Team
          </button>
        </div>
      </div>

      {/* Teams Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '16px 12px' }}>Team Name</th>
              <th style={{ padding: '16px 12px' }}>Owner</th>
              <th style={{ padding: '16px 12px' }}>Type</th>
              <th style={{ padding: '16px 12px' }}>Vertical</th>
              <th style={{ padding: '16px 12px' }}>Members</th>
              <th style={{ padding: '16px 12px' }}>Monthly Quota</th>
              <th style={{ padding: '16px 12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No teams created yet. Create one — you'll become the owner.</td></tr>
            ) : teams.map(team => {
              const managerName = getManagerName(team.managerId);
              return (
                <tr key={team._id} style={{ borderBottom: '1px solid #f1f5f9' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '16px 12px', fontWeight: 600, color: '#334155' }}>{team.name}</td>
                  <td style={{ padding: '16px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={14} style={{ color: '#10b981' }} />
                      <span style={{ fontSize: '0.875rem', color: '#475569' }}>{managerName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 12px', color: '#475569' }}>
                    <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                      {team.type}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px', color: '#475569' }}>
                    <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                      {team.businessVertical || 'Paramount'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px', color: '#475569' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                      {(team.memberIds || []).length === 0 ? (
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem italic' }}>No members</span>
                      ) : (
                        (() => {
                          const members = team.memberIds || [];
                          const displayLimit = 3;
                          const displayMembers = members.slice(0, displayLimit);
                          const remaining = members.length - displayLimit;
                          
                          return (
                            <>
                              {displayMembers.map((m, idx) => {
                                const memId = typeof m === 'object' ? (m._id || m.id) : m;
                                const name = typeof m === 'object' 
                                  ? (m.first_name ? `${m.first_name} ${m.last_name || ''}`.trim() : m.username || 'User')
                                  : 'User';
                                const assignment = (team.memberStageAssignments || []).find(a => {
                                  const aId = typeof a.userId === 'object' ? (a.userId._id || a.userId.id) : a.userId;
                                  return aId?.toString() === memId?.toString();
                                });
                                const hasRestrictedStages = assignment && Array.isArray(assignment.stages) && assignment.stages.length < PIPELINE_STAGES.length;

                                return (
                                  <span key={idx} style={{ 
                                    background: hasRestrictedStages ? '#f5f3ff' : '#f8fafc', 
                                    border: `1px solid ${hasRestrictedStages ? '#c7d2fe' : '#e2e8f0'}`, 
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem',
                                    color: hasRestrictedStages ? '#4338ca' : '#64748b',
                                    fontWeight: hasRestrictedStages ? 600 : 500,
                                    whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px'
                                  }}>
                                    {name}
                                    {hasRestrictedStages && (
                                      <span style={{ fontSize: '0.65rem', background: '#e0e7ff', color: '#3730a3', padding: '0 4px', borderRadius: '4px', fontWeight: 700 }} title={`Assigned stages: ${assignment.stages.join(', ')}`}>
                                        {assignment.stages.length}st
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                              {remaining > 0 && (
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '2px 4px', fontWeight: 600 }}>
                                  +{remaining} more
                                </span>
                              )}
                            </>
                          );
                        })()
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px 12px', color: '#475569' }}>
                    ₹{(team.quotas?.monthlyRevenue || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => handleOpenStageModal(team)}
                        title="Assign Pipeline Stages to Members"
                        style={{
                          background: '#6366f1',
                          color: 'white',
                          padding: '6px 10px',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
                        onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
                      >
                        <Sliders size={14} />
                      </button>
                      <button onClick={() => handleEdit(team)} style={{ background: '#3b82f6', color: 'white', padding: '6px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(team._id)} style={{ background: '#ef4444', color: 'white', padding: '6px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      {teams.length > 0 && (
        <div style={{ marginTop: '2rem', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#1e293b', fontWeight: 700 }}>Team Summary</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '4px' }}>Total Teams</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#334155' }}>{teams.length}</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '4px' }}>Total Members</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#334155' }}>
                {teams.reduce((sum, t) => sum + (t.memberIds?.length || 0), 0)}
              </div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '4px' }}>Total Quota</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#334155' }}>
                ₹{teams.reduce((sum, t) => sum + (t.quotas?.monthlyRevenue || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
