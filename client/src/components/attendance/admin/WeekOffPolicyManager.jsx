import React, { useEffect, useState, useCallback } from 'react';
import masterAPI from '../../../api/attendance/master.api';
import toast from 'react-hot-toast';
import { Select, Radio, Checkbox, Spin, Empty, Modal } from 'antd';
import { FiPlus, FiEdit2, FiTrash2, FiArrowLeft, FiSave } from 'react-icons/fi';
import './AdminSettings.css';

const { Option } = Select;

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

const WeekOffPolicyManager = () => {
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [policies, setPolicies] = useState([]);
  const [teams, setTeams] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]         = useState(emptyForm());
console.log(teams)
  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      const [plist] = await Promise.all([
        masterAPI.getWeekOffPolicies()
      ]);
      setPolicies(plist.data || []);
      // Teams are fetched dynamically when "Selected Teams" is chosen
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  const loadTeamsIfEmpty = useCallback(async () => {
    if (teams.length === 0) {
      try {
        const tlist = await masterAPI.getTeams();
        setTeams(tlist.teams || []);
      } catch (e) {
        toast.error('Failed to load teams');
      }
    }
  }, [teams.length]);

  const handleEdit = (p) => {
    setEditingId(p._id);
    const isAllTeams = p.applicability?.teams?.all ?? true;
    if (!isAllTeams) {
      loadTeamsIfEmpty();
    }
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
      if (editingId) {
        await masterAPI.updateWeekOffPolicy(editingId, form);
        toast.success('Updated');
      } else {
        await masterAPI.createWeekOffPolicy(form);
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

          {/* Section: Applicability */}
          <div className="section-title">Policy Applicability Status</div>
          <div className="applicability-grid">
            {/* Teams */}
            <div className="app-item">
              <label>Policy Applicable To Team *</label>
              <Radio.Group 
                value={form.applicability.teams.all} 
                onChange={e => {
                  const isAll = e.target.value;
                  if (!isAll) loadTeamsIfEmpty();
                  setForm(f => ({ 
                    ...f, 
                    applicability: { 
                      ...f.applicability, 
                      teams: { ...f.applicability.teams, all: isAll } 
                    } 
                  }));
                }}
              >
                <Radio value={true}>All Teams</Radio>
                <Radio value={false}>Selected Teams</Radio>
              </Radio.Group>
              {!form.applicability.teams.all && (
                <Select
                  mode="multiple"
                  style={{ width: '100%', marginTop: '8px' }}
                  placeholder="Select Teams"
                  value={form.applicability.teams.list}
                  onChange={v => setForm(f => ({ ...f, applicability: { ...f.applicability, teams: { ...f.applicability.teams, list: v } } }))}
                >
                  {teams.map(t => <Option key={t._id} value={t._id}>{t.name}</Option>)}
                </Select>
              )}
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
          <button className="btn btn-primary" onClick={() => { setEditingId(null); setForm(emptyForm()); setView('form'); }}>
            <FiPlus /> New Policy
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state"><Spin size="large" tip="Loading Policies..." /></div>
      ) : policies.length === 0 ? (
        <div className="empty-state">
           <Empty description={<span>No week-off policies found.</span>} />
        </div>
      ) : (
        <div className="policies-list">
          {policies.map(p => (
            <div key={p._id} className="policy-list-item">
              <div className="item-main">
                <h3>{p.policy_name}</h3>
                <p className="company-tag">
                  {p.applicability?.teams?.all === false
                    ? `Selected: ${(p.applicability.teams.list || []).map(t => t.name || t).join(', ') || 'None'}`
                    : 'All Teams'}
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
                <button title="Edit Policy" onClick={() => handleEdit(p)}><FiEdit2 /></button>
                <button title="Delete Policy" className="del-btn" onClick={() => handleDelete(p._id)}><FiTrash2 /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeekOffPolicyManager;
