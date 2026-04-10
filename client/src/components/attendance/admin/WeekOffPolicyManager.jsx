import React, { useEffect, useState, useCallback, useContext } from 'react';
import masterAPI from '../../../api/attendance/master.api';
import toast from 'react-hot-toast';
import { Radio, Checkbox, Spin, Empty, Modal } from 'antd';
import { FiPlus, FiEdit2, FiTrash2, FiArrowLeft, FiSave, FiList } from 'react-icons/fi';
import { UserContext } from '../../../contexts/UserContext';
import './AdminSettings.css';

const ALLOWED_USERNAMES = new Set(['shalini_arun', 'manu_pillai', 'suraj_rajan', 'rajan_aranamkatte', 'uday_zope']);

const DAYS = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
];

const WEEK_LABELS = [
  { label: 'All', value: 0 },
  { label: '1st', value: 1 },
  { label: '2nd', value: 2 },
  { label: '3rd', value: 3 },
  { label: '4th', value: 4 },
  { label: '5th', value: 5 },
];

const POLICY_TYPES = [
  { label: 'Fix Weekoff', value: 'fixed' },
  { label: 'Set Monthly Number of Weekoff', value: 'monthly_count_paid' },
  { label: 'Set Monthly Number of Weekoff on Paid Days', value: 'monthly_count_present_holiday' },
  { label: 'Set Monthly Number of Weekoff on Physical Present + Holiday', value: 'monthly_count_physical_present_holiday' },
  { label: 'Set Monthly Number of Weekoff on Present + Holiday (No Hourly)', value: 'monthly_count_present_holiday_no_hourly' },
];

const emptyForm = () => ({
  policy_name: '',
  description: '',
  policy_type: 'fixed',
  applicability: {
    teams: { all: true, list: [] }
  },
  day_rules: [], // [{ day_index: 6, rules: [{week_number: 0, off_type: 'full_day'}] }]
});

const formatActor = (actor) => {
  if (!actor) return 'Unknown';
  if (typeof actor === 'string') return actor;
  const fullName = `${actor.first_name || ''} ${actor.last_name || ''}`.trim();
  return fullName || actor.username || 'Unknown';
};

const WeekOffPolicyManager = () => {
  const { user } = useContext(UserContext);
  const username = (user?.username || '').toLowerCase();
  const isAllowedAdmin = (user?.role === 'ADMIN' || user?.role === 'Admin') && ALLOWED_USERNAMES.has(username);
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]         = useState(emptyForm());
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsRows, setLogsRows] = useState([]);

  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      const [plist] = await Promise.all([
        masterAPI.getWeekOffPolicies()
      ]);
      setPolicies(plist.data || []);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  const fetchLogs = useCallback(async (policyId = '') => {
    if (!isAllowedAdmin) return;
    try {
      setLogsLoading(true);
      const res = await masterAPI.getPolicyHistory({
        limit: 100,
        policy_type: 'weekoff',
        policy_id: policyId || undefined,
        include_approvals: false
      });
      setLogsRows(res?.data || []);
    } catch (e) {
      toast.error('Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  }, [isAllowedAdmin]);

  const handleEdit = (p) => {
    setEditingId(p._id);
    setForm({
      policy_name: p.policy_name,
      description: p.description || '',
      policy_type: p.policy_type || 'fixed',
      applicability: {
        teams: { 
            all: p.applicability?.teams?.all ?? true, 
            list: (p.applicability?.teams?.list || []).map(t => t._id || t) 
        }
      },
      day_rules: p.day_rules || [],
    });
    setView('form');
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Policy',
      content: 'Are you sure you want to delete this policy?',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await masterAPI.deleteWeekOffPolicy(id);
          toast.success('Deleted');
          fetchLists();
        } catch (e) { toast.error(e.message); }
      }
    });
  };

  const handleSave = async () => {
    if (!form.policy_name) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
        const payload = {
          ...form,
          applicability: { teams: { all: true, list: [] } }
        };
        if (editingId) {
          await masterAPI.updateWeekOffPolicy(editingId, payload);
        toast.success('Updated');
      } else {
          await masterAPI.createWeekOffPolicy(payload);
        toast.success('Created');
      }
      setView('list');
      fetchLists();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleDaySelection = (dayIndex) => {
    setForm(f => {
      const exists = f.day_rules.find(r => r.day_index === dayIndex);
      if (exists) {
        return { ...f, day_rules: f.day_rules.filter(r => r.day_index !== dayIndex) };
      } else {
        return { ...f, day_rules: [...f.day_rules, { day_index: dayIndex, rules: [{ week_number: 0, off_type: 'full_day' }] }] };
      }
    });
  };

  const updateDayRule = (dayIndex, weekNum, offType) => {
    setForm(f => {
      const dayRules = [...f.day_rules];
      const dayIdx = dayRules.findIndex(r => r.day_index === dayIndex);
      if (dayIdx === -1) return f;

      const rules = [...dayRules[dayIdx].rules];
      const ruleIdx = rules.findIndex(r => r.week_number === weekNum);
      
      if (ruleIdx === -1) {
        rules.push({ week_number: weekNum, off_type: offType });
      } else {
        rules[ruleIdx] = { ...rules[ruleIdx], off_type: offType };
      }
      
      dayRules[dayIdx] = { ...dayRules[dayIdx], rules };
      return { ...f, day_rules: dayRules };
    });
  };

  const toggleWeekInDay = (dayIndex, weekNum, checked) => {
      setForm(f => {
          const dayRules = [...f.day_rules];
          const dayIdx = dayRules.findIndex(r => r.day_index === dayIndex);
          if (dayIdx === -1) return f;

          let rules = [...dayRules[dayIdx].rules];
          if (checked) {
              if (!rules.find(r => r.week_number === weekNum)) {
                  rules.push({ week_number: weekNum, off_type: 'full_day' });
              }
          } else {
              rules = rules.filter(r => r.week_number !== weekNum);
          }

          dayRules[dayIdx] = { ...dayRules[dayIdx], rules };
          return { ...f, day_rules: dayRules };
      });
  }

  const isOwnerOrUnowned = (policy) => {
    const creatorId = policy?.created_by?._id || policy?.created_by;
    const userId = user?._id?._id || user?._id;
    return !creatorId || String(creatorId) === String(userId);
  };

  if (view === 'form') {
    return (
      <div className="policy-form-container">
        <div className="form-header">
          <button className="back-btn" onClick={() => setView('list')}><FiArrowLeft /> Back</button>
          <h2>{editingId ? 'Edit' : 'New'} WeekOff Policy</h2>
          <button className="btn btn-primary save-btn" onClick={handleSave} disabled={saving}>
            <FiSave /> {saving ? 'Saving...' : 'Save Policy'}
          </button>
        </div>

        <div className="form-content-card">
          {/* Row 1: Basic Info */}
          <div className="form-row">
            <div className="form-group flex-1">
              <label>WeekOff Policy Name *</label>
              <input 
                className="form-control" 
                value={form.policy_name} 
                onChange={e => setForm(f => ({ ...f, policy_name: e.target.value }))}
                placeholder="e.g. Corporate Standard"
              />
            </div>
            <div className="form-group flex-1">
                <label>WeekOff Policy Description</label>
                <textarea 
                    className="form-control" 
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={1}
                />
            </div>
          </div>

          <hr className="divider" />

          <div className="section-title">Policy Scope</div>
          <div className="applicability-grid">
            <div className="app-item">
              <label>Applicability</label>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                This week-off policy is global and can be assigned from the Users tab.
              </div>
            </div>
          </div>

          <hr className="divider" />

          {/* Section: Types */}
          <div className="form-group">
            <Radio.Group value={form.policy_type} onChange={e => setForm(f => ({ ...f, policy_type: e.target.value }))} className="policy-type-radios">
              {POLICY_TYPES.map(t => (
                <Radio key={t.value} value={t.value} className="block-radio">{t.label}</Radio>
              ))}
            </Radio.Group>
          </div>

          <hr className="divider" />

          {/* Section: Days */}
          <div className="day-selector-container">
            {DAYS.map(d => (
              <Checkbox 
                key={d.value} 
                checked={!!form.day_rules.find(r => r.day_index === d.value)}
                onChange={() => toggleDaySelection(d.value)}
              >
                {d.label}
              </Checkbox>
            ))}
          </div>

          {/* Grids for selected days */}
          <div className="day-grids-container">
            {form.day_rules.map(dr => {
              const dayObj = DAYS.find(d => d.value === dr.day_index);
              return (
                <div key={dr.day_index} className="day-grid-card">
                  <div className="grid-title">{dayObj.label}</div>
                  <table className="rules-table">
                    <thead>
                      <tr>
                        <th>Option</th>
                        <th>Status</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {WEEK_LABELS.map(w => {
                        const rule = dr.rules.find(r => r.week_number === w.value);
                        return (
                          <tr key={w.value}>
                            <td>
                                <Checkbox 
                                    checked={!!rule} 
                                    onChange={e => toggleWeekInDay(dr.day_index, w.value, e.target.checked)}
                                >
                                    {w.label} {dayObj.label}
                                </Checkbox>
                            </td>
                            <td>
                              <Radio.Group 
                                disabled={!rule}
                                value={rule?.off_type || 'full_day'}
                                onChange={e => updateDayRule(dr.day_index, w.value, e.target.value)}
                              >
                                <Radio value="full_day">Full Day Off</Radio>
                                <Radio value="half_day">Second Half Off</Radio>
                              </Radio.Group>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="settings-container">
      <div className="settings-header">
        <div className="settings-header-content">
          <h2>📅 Week-Off Policies</h2>
          <p>Define dynamic weekly rest-day rules for the organization.</p>
        </div>
        <div className="settings-header-actions">
          {isAllowedAdmin && (
            <button className="btn btn-outline" onClick={() => { setLogsOpen(true); fetchLogs(); }}>
              <FiList /> Logs
            </button>
          )}
          <button className="btn btn-primary" onClick={() => { setEditingId(null); setForm(emptyForm()); setView('form'); }}>
            <FiPlus /> New Policy
          </button>
        </div>
      </div>

      <Modal
        title="Week-Off Policy Logs"
        open={logsOpen}
        onCancel={() => setLogsOpen(false)}
        footer={null}
        width={820}
      >
        {logsLoading ? (
          <div style={{ padding: '16px', color: '#64748b' }}>Loading logs...</div>
        ) : logsRows.length === 0 ? (
          <div style={{ padding: '16px', color: '#94a3b8' }}>No logs found.</div>
        ) : (
          <div style={{ maxHeight: '460px', overflowY: 'auto', display: 'grid', gap: '10px' }}>
            {logsRows.map((row) => {
              const actionLabel = (row.action || '').replaceAll('_', ' ');
              const isDelete = actionLabel.includes('DELETE');
              const isCreate = actionLabel.includes('CREATE');
              const badgeStyle = isDelete
                ? { color: '#b91c1c', background: '#fee2e2' }
                : isCreate
                  ? { color: '#166534', background: '#dcfce7' }
                  : { color: '#1e3a8a', background: '#dbeafe' };
              return (
                <div key={row.id} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.3px', padding: '3px 8px', borderRadius: '999px', ...badgeStyle }}>
                      {actionLabel}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{new Date(row.timestamp).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>{row.details || '-'}</div>
                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#475569' }}>
                    By {row.actor_name || 'Unknown'} ({row.actor_role || 'N/A'})
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {loading ? (
        <div className="loading-state"><Spin size="large" tip="Loading Policies..." /></div>
      ) : policies.length === 0 ? (
        <div className="empty-state">
           <Empty description={<span>No week-off policies found.</span>} />
        </div>
      ) : (
        <>
          <div className="policies-list">
            {policies.map(p => (
              <div key={p._id} className="policy-list-item">
                <div className="item-main">
                  <h3>{p.policy_name}</h3>
                  <p className="company-tag">
                    Global policy
                  </p>
                  <p className="company-tag">
                    Created by: {formatActor(p.created_by)}
                  </p>
                  {p.description && <p className="desc">{p.description}</p>}
                  
                  <div className="tags-container">
                    {p.day_rules.map(dr => (
                      <span key={dr.day_index} className="rule-tag">
                        {DAYS.find(d => d.value === dr.day_index)?.label}: {dr.rules.length > 1 ? 'Mix' : dr.rules[0]?.week_number === 0 ? 'All' : 'Selected'}
                      </span>
                    ))}
                    {p.policy_type !== 'fixed' && <span className="type-tag">{p.policy_type}</span>}
                  </div>
                </div>
                <div className="item-actions">
                  <button title={isOwnerOrUnowned(p) ? 'Edit Policy' : 'Only creator can edit'} disabled={!isOwnerOrUnowned(p)} onClick={() => handleEdit(p)}><FiEdit2 /></button>
                  <button title={isOwnerOrUnowned(p) ? 'Delete Policy' : 'Only creator can delete'} disabled={!isOwnerOrUnowned(p)} className="del-btn" onClick={() => handleDelete(p._id)}><FiTrash2 /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default WeekOffPolicyManager;
