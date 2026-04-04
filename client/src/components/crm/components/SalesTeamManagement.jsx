import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { message, Modal } from 'antd';
import { Users, Plus, Edit2, Trash2, UserCheck, X, Check } from 'lucide-react';

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
    memberIds: [],
    quotas: { monthlyRevenue: 0, dealCount: 0 }
  });
  const [userSearch, setUserSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
    setFormData({ name: '', description: '', type: 'regional', memberIds: [], quotas: { monthlyRevenue: 0, dealCount: 0 } });
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    const currentMemberIds = (team.memberIds || []).map(m => (typeof m === 'object' ? m._id?.toString() || m.id?.toString() : m.toString()));
    setFormData({
      name: team.name,
      description: team.description || '',
      type: team.type || 'regional',
      memberIds: currentMemberIds,
      quotas: team.quotas || { monthlyRevenue: 0, dealCount: 0 }
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

  if (loading) return <div style={{ padding: '20px' }}>Loading sales teams...</div>;

  return (
    <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
      {/* Modal Form */}
      {isFormOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: '#fff', width: '100%', maxWidth: '560px',
            borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column'
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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontWeight: 700, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} style={{ color: '#4f46e5' }} />
            Sales Teams
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Creator becomes team owner. Members see only their own leads.</span>
        </div>
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

      {/* Teams Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '16px 12px' }}>Team Name</th>
              <th style={{ padding: '16px 12px' }}>Owner</th>
              <th style={{ padding: '16px 12px' }}>Type</th>
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
                                const name = typeof m === 'object' 
                                  ? (m.first_name ? `${m.first_name} ${m.last_name || ''}`.trim() : m.username || 'User')
                                  : 'User';
                                return (
                                  <span key={idx} style={{ 
                                    background: '#f8fafc', border: '1px solid #e2e8f0', 
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem',
                                    color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap'
                                  }}>
                                    {name}
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
