import React, { useCallback, useContext, useEffect, useState } from 'react';
import { FiPlus, FiTrash2, FiEdit2, FiChevronDown, FiChevronUp, FiCalendar, FiLock, FiList } from 'react-icons/fi';
import masterAPI from '../../../api/attendance/master.api';
import toast from 'react-hot-toast';
import { Radio, Modal } from 'antd';
import { UserContext } from '../../../contexts/UserContext';
import './AdminSettings.css';
import './HolidayCalendar.css';

// Allowed-admin usernames (must match backend list)
const ALLOWED_USERNAMES = new Set(['shalini_arun', 'manu_pillai', 'suraj_rajan', 'rajan_aranamkatte', 'uday_zope']);

const HOLIDAY_TYPES = [
  { value: 'national', label: '🏛️ National', color: '#1a56db', bg: '#eef4ff' },
  { value: 'company',  label: '🏢 Company',  color: '#047857', bg: '#ecfdf5' },
  { value: 'optional', label: '🌟 Optional', color: '#92400e', bg: '#fffbeb' },
  { value: 'restricted',label:'🔒 Restricted',color:'#6b21a8',bg:'#faf5ff' },
];

const emptyPolicyForm = (user) => ({
  policy_name: '',
  year: new Date().getFullYear(),
  company_id: user?.company_id?._id || user?.company_id,
  holidays: [],
  applicability: {
    teams: { all: true, list: [] }
  }
});

const emptyHolidayRow = () => ({ holiday_name: '', holiday_date: '', is_optional: false });

const formatActor = (actor) => {
  if (!actor) return 'Unknown';
  if (typeof actor === 'string') return actor;
  const fullName = `${actor.first_name || ''} ${actor.last_name || ''}`.trim();
  return fullName || actor.username || 'Unknown';
};

const HolidayPolicyManager = ({ user: userProp }) => {
  const { user: ctxUser } = useContext(UserContext);
  const user = userProp || ctxUser;  // prefer prop, fall back to context
  const username = (user?.username || '').toLowerCase();
  const isAllowedAdmin = (user?.role === 'ADMIN' || user?.role === 'Admin') && ALLOWED_USERNAMES.has(username);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'Admin';

  const [policies, setPolicies]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [view, setView]                   = useState('list'); // 'list' | 'policy-form'
  const [expandedId, setExpandedId]       = useState(null);
  const [filterYear, setFilterYear]       = useState(new Date().getFullYear());

  // Forms state
  const [policyForm, setPolicyForm]       = useState(() => emptyPolicyForm(user));
  const [editingPolicyId, setEditingPolicyId] = useState(null);
  const [savingPolicy, setSavingPolicy]   = useState(false);
  const [logsOpen, setLogsOpen]           = useState(false);
  const [logsLoading, setLogsLoading]     = useState(false);
  const [logsRows, setLogsRows]           = useState([]);

  const loadPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const [res] = await Promise.all([
        masterAPI.getHolidayPolicies({ year: filterYear })
      ]);
      setPolicies(res.data || []);
    } catch {
      toast.error('Failed to load holiday policies');
    } finally {
      setLoading(false);
    }
  }, [filterYear]);

  const isOwnerOrUnowned = (policy) => {
    const creatorId = policy?.created_by?._id || policy?.created_by;
    const userId = user?._id?._id || user?._id;
    return !creatorId || String(creatorId) === String(userId);
  };

  useEffect(() => { loadPolicies(); }, [loadPolicies]);

  const fetchLogs = useCallback(async (policyId = '') => {
    if (!isAllowedAdmin) return;
    try {
      setLogsLoading(true);
      const res = await masterAPI.getPolicyHistory({
        limit: 100,
        policy_type: 'holiday',
        policy_id: policyId || undefined,
        include_approvals: false
      });
      setLogsRows(res?.data || []);
    } catch {
      toast.error('Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  }, [isAllowedAdmin]);

  // ── Policy CRUD ─────────────────────────────────────────────────────────────
  const handleSavePolicy = async () => {
    if (!policyForm.policy_name.trim()) { toast.error('Policy name required'); return; }
    if (policyForm.holidays.length === 0) { toast.error('Add at least one holiday'); return; }
    
    setSavingPolicy(true);
    try {
      // Validate all holidays have name and date
      for (const h of policyForm.holidays) {
        if (!h.holiday_name.trim() || !h.holiday_date) {
          toast.error('All holidays must have a name and date');
          setSavingPolicy(false);
          return;
        }
      }

      const payload = {
        ...policyForm,
        applicability: { teams: { all: true, list: [] } }
      };

      if (editingPolicyId) {
        await masterAPI.updateHolidayPolicy(editingPolicyId, payload);
        toast.success('Policy updated');
      } else {
        await masterAPI.createHolidayPolicy(payload);
        toast.success('Policy created');
      }
      setView('list');
      setEditingPolicyId(null);
      setPolicyForm(emptyPolicyForm(user));
      loadPolicies();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Save failed');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleDeletePolicy = (id, name) => {
    Modal.confirm({
      title: 'Delete Holiday Policy',
      content: `Are you sure you want to delete the holiday policy "${name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await masterAPI.deleteHolidayPolicy(id);
          toast.success('Policy deleted');
          loadPolicies();
        } catch (e) {
          toast.error(e.message || 'Delete failed');
        }
      }
    });
  };

  // ── Holiday Row Management ───────────────────────────────────────────────────
  const handleAddHolidayRow = () => {
    setPolicyForm(f => ({
      ...f,
      holidays: [...f.holidays, emptyHolidayRow()]
    }));
  };

  const handleRemoveHolidayRow = (index) => {
    setPolicyForm(f => ({
      ...f,
      holidays: f.holidays.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateHolidayRow = (index, field, value) => {
    setPolicyForm(f => {
      const updated = [...f.holidays];
      updated[index] = { ...updated[index], [field]: value };
      return { ...f, holidays: updated };
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  
  if (view === 'policy-form') {
    return (
      <div className="policy-form-container" style={{ padding: '20px 0' }}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <button className="btn btn-outline" onClick={() => { setView('list'); setEditingPolicyId(null); setPolicyForm(emptyPolicyForm(user)); }} style={{ padding: '8px 16px' }}>
                <FiChevronDown style={{ transform: 'rotate(90deg)' }} /> Back
             </button>
             <h2 style={{ margin: 0 }}>{editingPolicyId ? 'Edit' : 'New'} Holiday Policy</h2>
           </div>
           <button className="btn btn-primary" onClick={handleSavePolicy} disabled={savingPolicy}>
             {savingPolicy ? 'Saving...' : editingPolicyId ? 'Update Policy' : 'Create Policy'}
           </button>
         </div>

         <div className="form-content-card" style={{ background: '#fff', borderRadius: '12px', padding: '30px', border: '1px solid #eef0f7', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            
            {/* Policy Name & Year */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '30px' }}>
               <div>
                 <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>Policy Name *</label>
                 <input className="form-control" placeholder="e.g. Corporate Standard 2026"
                   value={policyForm.policy_name}
                   onChange={e => setPolicyForm(f => ({ ...f, policy_name: e.target.value }))} />
               </div>
               {!editingPolicyId && (
                 <div>
                   <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>Policy Year *</label>
                   <select className="form-control" value={policyForm.year}
                     onChange={e => setPolicyForm(f => ({ ...f, year: Number(e.target.value) }))}>
                     {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                   </select>
                 </div>
               )}
            </div>

            <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid #f3f4f6' }} />

            <div style={{ marginBottom: '20px', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', color: '#475569' }}>
              This holiday policy is global and will be assigned to users from the Users tab.
            </div>

            <hr style={{ margin: "20px 0 30px 0", border: "none", borderTop: "1px solid #f3f4f6" }} />

{/* Holiday List */}
            <div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>Holiday List *</label>
                  <button className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 14px' }}
                    onClick={handleAddHolidayRow}>
                    <FiPlus size={13} /> ADD Holiday List
                  </button>
               </div>

               {policyForm.holidays.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', background: '#f9fafb', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                     No holidays added yet. Click "ADD Holiday List" to add holidays.
                  </div>
               ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                     {/* Header Row */}
                     <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 0.8fr 80px', gap: '12px', paddingBottom: '10px', borderBottom: '2px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Holiday Name</div>
                        <div style={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Holiday Date</div>
                        <div style={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Optional</div>
                        <div style={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Action</div>
                     </div>

                     {/* Holiday Rows */}
                     {policyForm.holidays.map((h, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 0.8fr 80px', gap: '12px', alignItems: 'center', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #eef0f7' }}>
                           <input className="form-control" placeholder="e.g. Diwali"
                             style={{ margin: 0, fontSize: '13px' }}
                             value={h.holiday_name}
                             onChange={e => handleUpdateHolidayRow(idx, 'holiday_name', e.target.value)} />
                           
                           <input className="form-control" type="date"
                             style={{ margin: 0, fontSize: '13px' }}
                             value={h.holiday_date}
                             onChange={e => handleUpdateHolidayRow(idx, 'holiday_date', e.target.value)} />
                           
                           <Radio.Group
                             value={h.is_optional ? 'yes' : 'no'}
                             onChange={e => handleUpdateHolidayRow(idx, 'is_optional', e.target.value === 'yes')}
                           >
                              <Radio value="yes">YES</Radio>
                              <Radio value="no">NO</Radio>
                           </Radio.Group>
                           
                           <button style={{ background: '#fee2e2', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '6px', borderRadius: '6px', margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                             title="Remove holiday" onClick={() => handleRemoveHolidayRow(idx)}>
                             <FiTrash2 size={14} />
                           </button>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <div className="settings-header-content">
          <h2>🗓️ Holiday Policies</h2>
          <p>
            {isAllowedAdmin
              ? 'Create and manage year-wise holiday calendars per organisation.'
              : 'View holiday policies for this year.'}
            {!isAllowedAdmin && isAdmin && (
              <span style={{ marginLeft: '8px', color: '#c27c00', fontWeight: 600, fontSize: '12px' }}>
                🔒 Contact a super-admin to modify policies.
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Year filter */}
          <select className="form-control" style={{ width: '110px' }}
            value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
            {[filterYear - 1, filterYear, filterYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {isAllowedAdmin && (
            <button className="btn btn-outline" onClick={() => { setLogsOpen(true); fetchLogs(); }}>
              <FiList /> Logs
            </button>
          )}
          {isAllowedAdmin && (
            <button className="btn btn-primary"
              onClick={() => { setEditingPolicyId(null); setPolicyForm(emptyPolicyForm(user)); setView('policy-form'); }}>
              + New Policy
            </button>
          )}
        </div>
      </div>

      <Modal
        title="Holiday Policy Logs"
        open={logsOpen}
        onCancel={() => setLogsOpen(false)}
        footer={null}
        width={860}
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

      {/* Policy list */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading…</div>
      ) : policies.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '15px' }}>
          {isAllowedAdmin ? 'No policies for this year. Create one above ↑' : 'No holiday policies found for this year.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {policies.map(policy => {
            const expanded = expandedId === policy._id;
            const holidays = (policy.holidays || [])
              .slice().sort((a, b) => new Date(a.holiday_date) - new Date(b.holiday_date));

            return (
              <div key={policy._id} style={{
                background: '#fff', borderRadius: '12px', border: '1px solid #eef0f7',
                boxShadow: '0 2px 6px rgba(0,0,0,.04)', overflow: 'hidden'
              }}>
                {/* Policy header row */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', cursor: 'pointer', transition: 'background 0.2s',
                  background: expanded ? '#f9fafb' : '#fff'
                }} onClick={() => setExpandedId(expanded ? null : policy._id)}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: '#1e293b' }}>{policy.policy_name}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                      <span style={{ fontWeight: 600 }}>{policy.year}</span> • {holidays.length} holiday{holidays.length !== 1 ? 's' : ''}
                      {' • GLOBAL POLICY'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Created by: {formatActor(policy.created_by)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {isAllowedAdmin && (
                      <>
                        <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}
                          disabled={!isOwnerOrUnowned(policy)}
                          title={isOwnerOrUnowned(policy) ? 'Edit policy' : 'Only creator can edit'}
                          onClick={e => { 
                            e.stopPropagation(); 
                            setEditingPolicyId(policy._id); 
                            setPolicyForm({ 
                              policy_name: policy.policy_name, 
                              year: policy.year, 
                              company_id: policy.company_id,
                              holidays: policy.holidays || [],
                              applicability: { teams: { all: policy.applicability?.teams?.all ?? true, list: (policy.applicability?.teams?.list || []).map(t => t._id || t) } }
                            });
                            setView('policy-form');
                          }}>
                          <FiEdit2 size={13} /> Edit
                        </button>
                        <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }}
                          disabled={!isOwnerOrUnowned(policy)}
                          title={isOwnerOrUnowned(policy) ? 'Delete policy' : 'Only creator can delete'}
                          onClick={e => { e.stopPropagation(); handleDeletePolicy(policy._id, policy.policy_name); }}>
                          <FiTrash2 size={13} />
                        </button>
                      </>
                    )}
                    <div style={{ marginLeft: '10px', color: '#94a3b8' }}>
                      {expanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Holiday entries */}
                {expanded && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '20px' }}>
                    <div style={{ marginBottom: '16px' }}>
                       <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Holidays for {policy.policy_name}</h4>
                    </div>
                    {holidays.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No holidays added yet.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                        {holidays.map((h, i) => {
                          const d = new Date(h.holiday_date);
                          const typeCfg = HOLIDAY_TYPES.find(t => t.value === h.holiday_type) || HOLIDAY_TYPES[0];
                          return (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '12px', borderRadius: '10px', background: '#f8fafc',
                              border: '1px solid #f1f5f9', gap: '12px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{
                                  background: typeCfg.bg, color: typeCfg.color,
                                  borderRadius: '8px', padding: '6px', textAlign: 'center',
                                  minWidth: '48px', fontSize: '11px', fontWeight: 800,
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}>
                                  <div style={{ textTransform: 'uppercase' }}>{d.toLocaleString('default', { month: 'short' })}</div>
                                  <div style={{ fontSize: '18px', lineHeight: 1.1, marginTop: '2px' }}>{d.getDate()}</div>
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                                    {h.holiday_name}
                                    {h.is_optional && <span style={{ marginLeft: '8px', fontSize: '10px', background: '#ffedd5', color: '#9a3412', borderRadius: '4px', padding: '2px 6px', fontWeight: 700 }}>OPTIONAL</span>}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{d.toLocaleString('default', { weekday: 'long' })}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

        </div>
      )}
    </div>
  );
};

export default HolidayPolicyManager;









