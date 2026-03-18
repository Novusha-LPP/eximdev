import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { message, Modal } from 'antd';
import { Users, Plus, Edit2, Trash2, Target } from 'lucide-react';

export default function SalesTeamManagement() {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    managerId: '',
    type: 'regional',
    quotas: { monthlyRevenue: 0, dealCount: 0 }
  });

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, []);

  const dummyTeams = [
    { _id: '1', name: 'Enterprise Team', type: 'enterprise', description: 'Fortune 500 & Large Enterprise accounts', managerId: { _id: 'mgr1', name: 'John Doe' }, memberIds: ['rep1', 'rep2', 'rep3', 'rep4'], quotas: { monthlyRevenue: 500000, dealCount: 8 }, performance: { currentRevenue: 475000, currentDealCount: 7, winRate: 0.85 }, isActive: true },
    { _id: '2', name: 'Mid-Market Sales', type: 'regional', description: 'Growing mid-sized companies', managerId: { _id: 'mgr2', name: 'Sarah Smith' }, memberIds: ['rep5', 'rep6', 'rep7'], quotas: { monthlyRevenue: 250000, dealCount: 15 }, performance: { currentRevenue: 198000, currentDealCount: 12, winRate: 0.72 }, isActive: true },
    { _id: '3', name: 'Tech Sector Specialists', type: 'product', description: 'Technology & SaaS focused', managerId: { _id: 'mgr3', name: 'Michael Chen' }, memberIds: ['rep8', 'rep9', 'rep10', 'rep11', 'rep12'], quotas: { monthlyRevenue: 350000, dealCount: 20 }, performance: { currentRevenue: 385000, currentDealCount: 22, winRate: 0.79 }, isActive: true },
    { _id: '4', name: 'Inside Sales', type: 'channel', description: 'Inbound & phone-based sales', managerId: { _id: 'mgr4', name: 'Emily Davis' }, memberIds: ['rep13', 'rep14', 'rep15', 'rep16'], quotas: { monthlyRevenue: 150000, dealCount: 25 }, performance: { currentRevenue: 142000, currentDealCount: 24, winRate: 0.68 }, isActive: true },
    { _id: '5', name: 'International Sales', type: 'regional', description: 'EMEA & APAC regions', managerId: { _id: 'mgr5', name: 'Robert Wilson' }, memberIds: ['rep17', 'rep18', 'rep19'], quotas: { monthlyRevenue: 300000, dealCount: 12 }, performance: { currentRevenue: 325000, currentDealCount: 14, winRate: 0.81 }, isActive: true }
  ];

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/teams`,
        { withCredentials: true }
      );
      setTeams(res.data.teams && res.data.teams.length > 0 ? res.data.teams : dummyTeams);
    } catch (err) {
      setTeams(dummyTeams);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // This would be a separate endpoint to get users
      // For now, leaving stub
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTeam?._id) {
        await axios.put(
          `${process.env.REACT_APP_API_STRING}/crm/teams/${editingTeam._id}`,
          formData,
          { withCredentials: true }
        );
        message.success('Team updated successfully');
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_STRING}/crm/teams`,
          formData,
          { withCredentials: true }
        );
        message.success('Team created successfully');
      }
      fetchTeams();
      handleClose();
    } catch (error) {
      message.error('Error saving team');
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
          await axios.delete(`${process.env.REACT_APP_API_STRING}/crm/teams/${id}`, { withCredentials: true });
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
    setFormData({
      name: '', description: '', managerId: '', type: 'regional',
      quotas: { monthlyRevenue: 0, dealCount: 0 }
    });
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    setFormData(team);
    setIsFormOpen(true);
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading sales teams...</div>;

  return (
    <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
      {/* Modal Form */}
      {isFormOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: '#fff', width: '100%', maxWidth: '500px',
            borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 700 }}>
                {editingTeam ? 'Edit Team' : 'New Sales Team'}
              </h3>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Team Name *</label>
                <input
                  type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Enterprise Sales"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Team Type</label>
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

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Monthly Revenue Quota</label>
                <input
                  type="number"
                  value={formData.quotas?.monthlyRevenue || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    quotas: { ...formData.quotas, monthlyRevenue: Number(e.target.value) }
                  })}
                  placeholder="0"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Deal Quota (Monthly)</label>
                <input
                  type="number"
                  value={formData.quotas?.dealCount || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    quotas: { ...formData.quotas, dealCount: Number(e.target.value) }
                  })}
                  placeholder="0"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={handleClose} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Save Team</button>
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
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Manage sales team structure and quotas</span>
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
              <th style={{ padding: '16px 12px' }}>Type</th>
              <th style={{ padding: '16px 12px' }}>Members</th>
              <th style={{ padding: '16px 12px' }}>Monthly Quota</th>
              <th style={{ padding: '16px 12px' }}>Current Revenue</th>
              <th style={{ padding: '16px 12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No teams created yet.</td></tr>
            ) : teams.map(team => {
              const quotaAttainment = team.quotas?.monthlyRevenue > 0
                ? Math.round((team.performance?.currentRevenue || 0) / team.quotas.monthlyRevenue * 100)
                : 0;
              return (
                <tr key={team._id} style={{ borderBottom: '1px solid #f1f5f9' }} onMouseEnter={e => e.currentTarget.style.background = '#fafafa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '16px 12px', fontWeight: 600, color: '#334155' }}>{team.name}</td>
                  <td style={{ padding: '16px 12px', color: '#475569' }}>
                    <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                      {team.type}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px', color: '#475569' }}>{team.memberIds?.length || 0} members</td>
                  <td style={{ padding: '16px 12px', color: '#475569' }}>
                    ${(team.quotas?.monthlyRevenue || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <div>
                      <div style={{ color: '#334155', fontWeight: 600 }}>
                        ${(team.performance?.currentRevenue || 0).toLocaleString()}
                      </div>
                      <div style={{
                        fontSize: '0.8rem',
                        color: quotaAttainment >= 100 ? '#10b981' : quotaAttainment >= 80 ? '#f59e0b' : '#ef4444'
                      }}>
                        {quotaAttainment}% of quota
                      </div>
                    </div>
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
                ${teams.reduce((sum, t) => sum + (t.quotas?.monthlyRevenue || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
