import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { message, Modal } from 'antd';
import { MapPin, Plus, Edit2, Trash2, Users } from 'lucide-react';

export default function TerritoryManagement() {
  const [territories, setTerritories] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTerritory, setEditingTerritory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'geographic',
    boundaries: { countries: [], states: [], cities: [] },
    industries: [],
    customerSize: [],
    assignedTeamId: '',
    leadRoutingRules: { autoAssign: true, roundRobin: false }
  });

  useEffect(() => {
    fetchTerritories();
    fetchTeams();
  }, []);

  const dummyTerritories = [
    { _id: '1', name: 'North America', type: 'geographic', description: 'USA, Canada & Mexico', assignedTeamId: { _id: 'team1', name: 'Enterprise Team' }, currentAccountCount: 24, currentLeadCount: 56, leadRoutingRules: { autoAssign: true, roundRobin: false }, isActive: true },
    { _id: '2', name: 'Technology Sector', type: 'industry', description: 'SaaS, Software & IT Services', assignedTeamId: { _id: 'team2', name: 'Tech Sales' }, currentAccountCount: 18, currentLeadCount: 42, leadRoutingRules: { autoAssign: true, roundRobin: false }, isActive: true },
    { _id: '3', name: 'Enterprise Accounts', type: 'customer-size', description: 'Companies with 1000+ employees', assignedTeamId: { _id: 'team1', name: 'Enterprise Team' }, currentAccountCount: 12, currentLeadCount: 28, leadRoutingRules: { autoAssign: false, roundRobin: true }, isActive: true },
    { _id: '4', name: 'Financial Services', type: 'industry', description: 'Banks, Insurance & Investment Firms', assignedTeamId: { _id: 'team3', name: 'Vertical Sales' }, currentAccountCount: 15, currentLeadCount: 35, leadRoutingRules: { autoAssign: true, roundRobin: false }, isActive: true },
    { _id: '5', name: 'EMEA Region', type: 'geographic', description: 'Europe, Middle East & Africa', assignedTeamId: { _id: 'team4', name: 'International Sales' }, currentAccountCount: 31, currentLeadCount: 67, leadRoutingRules: { autoAssign: true, roundRobin: false }, isActive: true }
  ];

  const fetchTerritories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/territories`,
        { withCredentials: true }
      );
      setTerritories(res.data.territories && res.data.territories.length > 0 ? res.data.territories : dummyTerritories);
    } catch (err) {
      setTerritories(dummyTerritories);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/teams`,
        { withCredentials: true }
      );
      setTeams(res.data.teams);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTerritory?._id) {
        await axios.put(
          `${process.env.REACT_APP_API_STRING}/crm/territories/${editingTerritory._id}`,
          formData,
          { withCredentials: true }
        );
        message.success('Territory updated successfully');
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_STRING}/crm/territories`,
          formData,
          { withCredentials: true }
        );
        message.success('Territory created successfully');
      }
      fetchTerritories();
      handleClose();
    } catch (error) {
      message.error('Error saving territory');
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Territory',
      content: 'Are you sure? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      async onOk() {
        try {
          await axios.delete(`${process.env.REACT_APP_API_STRING}/crm/territories/${id}`, { withCredentials: true });
          message.success('Territory deleted');
          fetchTerritories();
        } catch (error) {
          message.error('Failed to delete territory');
        }
      }
    });
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingTerritory(null);
    setFormData({
      name: '', description: '', type: 'geographic', boundaries: { countries: [], states: [], cities: [] },
      industries: [], customerSize: [], assignedTeamId: '', leadRoutingRules: { autoAssign: true, roundRobin: false }
    });
  };

  const handleEdit = (territory) => {
    setEditingTerritory(territory);
    setFormData(territory);
    setIsFormOpen(true);
  };

  const getTerritoryIcon = (type) => {
    const icons = {
      geographic: '🌍',
      industry: '🏢',
      'customer-size': '📊',
      product: '📦',
      channel: '🔗'
    };
    return icons[type] || '📍';
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading territories...</div>;

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
                {editingTerritory ? 'Edit Territory' : 'New Territory'}
              </h3>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Name *</label>
                <input
                  type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Territory Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                >
                  <option value="geographic">Geographic</option>
                  <option value="industry">Industry</option>
                  <option value="customer-size">Customer Size</option>
                  <option value="product">Product</option>
                  <option value="channel">Channel</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Assigned Team</label>
                <select
                  value={formData.assignedTeamId}
                  onChange={(e) => setFormData({ ...formData, assignedTeamId: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                >
                  <option value="">Select a team</option>
                  {teams.map(team => <option key={team._id} value={team._id}>{team.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  id="autoAssign"
                  checked={formData.leadRoutingRules.autoAssign}
                  onChange={(e) => setFormData({
                    ...formData,
                    leadRoutingRules: { ...formData.leadRoutingRules, autoAssign: e.target.checked }
                  })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="autoAssign" style={{ color: '#475569', fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                  Auto-assign leads to this territory
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={handleClose} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontWeight: 700, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={24} style={{ color: '#4f46e5' }} />
            Territory Management
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Organize sales territories and assignments</span>
        </div>
        <button
          onClick={() => { setEditingTerritory(null); setIsFormOpen(true); }}
          style={{
            background: '#4f46e5', color: 'white', padding: '10px 20px', border: 'none',
            borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '8px', whiteSpace: 'nowrap'
          }}
        >
          <Plus size={18} /> New Territory
        </button>
      </div>

      {/* Territories Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {territories.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            No territories created yet.
          </div>
        ) : territories.map(territory => (
          <div key={territory._id} style={{
            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px',
            transition: 'all 0.2s', cursor: 'pointer'
          }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.1)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#1e293b', fontWeight: 700, fontSize: '1rem' }}>
                  {getTerritoryIcon(territory.type)} {territory.name}
                </h4>
                <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>
                  {territory.type}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => handleEdit(territory)} style={{ background: '#3b82f6', color: 'white', padding: '6px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(territory._id)} style={{ background: '#ef4444', color: 'white', padding: '6px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '12px', padding: '12px', background: 'white', borderRadius: '6px', fontSize: '0.85rem' }}>
              {territory.assignedTeamId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', marginBottom: '6px' }}>
                  <Users size={14} />
                  <span>{territory.assignedTeamId.name}</span>
                </div>
              )}
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                Accounts: {territory.currentAccountCount || 0} | Leads: {territory.currentLeadCount || 0}
              </div>
            </div>

            {territory.leadRoutingRules?.autoAssign && (
              <span style={{
                display: 'inline-block',
                background: '#dcfce7', color: '#166534', padding: '4px 8px',
                borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700
              }}>
                ✓ Auto-assign enabled
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
