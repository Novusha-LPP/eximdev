import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import './InvoicingStyles.css';

const InvoicingSettingsModal = ({ isOpen, onClose, onSettingsUpdated }) => {
    const [tab, setTab] = useState('targets');
    const [settingsData, setSettingsData] = useState(null);
    const [companyMappings, setCompanyMappings] = useState([]);
    const [refreshHistory, setRefreshHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);

    // Form states
    const [targetValues, setTargetValues] = useState({});
    const [projectionValues, setProjectionValues] = useState({});
    const [notes, setNotes] = useState({});
    
    // Sync schedule state
    const [autoRetrieve, setAutoRetrieve] = useState(true);
    const [frequency, setFrequency] = useState('CUSTOM');
    const [scheduledTimes, setScheduledTimes] = useState(['09:00', '13:00', '18:00']);
    const [newTime, setNewTime] = useState('');

    // Mapping modal state
    const [newCompanyKey, setNewCompanyKey] = useState('');
    const [newTallyName, setNewTallyName] = useState('');
    const [newDisplayName, setNewDisplayName] = useState('');
    const [newCategory, setNewCategory] = useState('Core Group');
    const [newDefaultDays, setNewDefaultDays] = useState(30);
    const [newOwner, setNewOwner] = useState('Yash');

    const api = (process.env.REACT_APP_API_STRING || 'http://localhost:9006').replace(/\/api$/, '') + '/api';

    const loadData = async () => {
        setLoading(true);
        try {
            const [setRes, mapRes, histRes] = await Promise.all([
                axios.get(`${api}/project-nucleus/invoicing/settings`, { withCredentials: true }),
                axios.get(`${api}/project-nucleus/invoicing/company-mappings`, { withCredentials: true }),
                axios.get(`${api}/project-nucleus/invoicing/refresh-history`, { withCredentials: true })
            ]);

            if (setRes.data?.success) {
                setSettingsData(setRes.data);
                const tVals = {};
                const pVals = {};
                (setRes.data.settings || []).forEach(s => {
                    tVals[s.company_key] = s.monthly_target || 0;
                    pVals[s.company_key] = s.projection_days || 30;
                });
                setTargetValues(tVals);
                setProjectionValues(pVals);

                if (setRes.data.sync_schedule) {
                    setAutoRetrieve(setRes.data.sync_schedule.auto_retrieve_enabled !== false);
                    setFrequency(setRes.data.sync_schedule.frequency || 'CUSTOM');
                    setScheduledTimes(setRes.data.sync_schedule.scheduled_times || ['09:00', '13:00', '18:00']);
                }
            }

            if (mapRes.data?.success) {
                setCompanyMappings(mapRes.data.mappings || []);
            }

            if (histRes.data?.success) {
                setRefreshHistory(histRes.data.history || []);
            }
        } catch (err) {
            console.error('Error loading settings:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) loadData();
    }, [isOpen]);

    const handleSaveTarget = async (company_key) => {
        setSaving(true);
        try {
            await axios.put(`${api}/project-nucleus/invoicing/settings/targets`, {
                company_key,
                monthly_target: Number(targetValues[company_key] || 0),
                projection_days: Number(projectionValues[company_key] || 30),
                notes: notes[company_key] || 'Updated via Settings'
            }, { withCredentials: true });
            
            await loadData();
            if (onSettingsUpdated) onSettingsUpdated();
        } catch (err) {
            alert('Failed to update target: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSyncSchedule = async () => {
        setSaving(true);
        try {
            await axios.put(`${api}/project-nucleus/invoicing/settings/sync-schedule`, {
                auto_retrieve_enabled: autoRetrieve,
                frequency,
                scheduled_times: scheduledTimes,
                reason: 'Schedule adjusted in settings'
            }, { withCredentials: true });

            await loadData();
            if (onSettingsUpdated) onSettingsUpdated();
            alert('Sync schedule saved successfully');
        } catch (err) {
            alert('Failed to save schedule: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleTriggerSyncNow = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await axios.post(`${api}/project-nucleus/invoicing/settings/sync-now`, {}, { withCredentials: true });
            setSyncResult(res.data);
            await loadData();
            if (onSettingsUpdated) onSettingsUpdated();
        } catch (err) {
            alert('Sync failed: ' + err.message);
        } finally {
            setSyncing(false);
        }
    };

    const handleAddMapping = async (e) => {
        e.preventDefault();
        if (!newCompanyKey || !newTallyName || !newDisplayName) {
            alert('Please fill all required mapping fields');
            return;
        }
        setSaving(true);
        try {
            await axios.post(`${api}/project-nucleus/invoicing/company-mappings`, {
                company_key: newCompanyKey.trim().toUpperCase(),
                tally_company_name: newTallyName.trim(),
                display_name: newDisplayName.trim(),
                group_category: newCategory,
                default_projection_days: Number(newDefaultDays || 30),
                responsible_person_name: newOwner
            }, { withCredentials: true });

            setNewCompanyKey('');
            setNewTallyName('');
            setNewDisplayName('');
            await loadData();
            if (onSettingsUpdated) onSettingsUpdated();
        } catch (err) {
            alert('Failed to save mapping: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAddTime = () => {
        if (!newTime) return;
        if (!scheduledTimes.includes(newTime)) {
            setScheduledTimes([...scheduledTimes, newTime].sort());
        }
        setNewTime('');
    };

    const handleRemoveTime = (t) => {
        setScheduledTimes(scheduledTimes.filter(item => item !== t));
    };

    if (!isOpen) return null;

    const schedule = settingsData?.sync_schedule || {};

    return (
        <div className="invoicing-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="invoicing-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 940 }}>
                {/* Header */}
                <div className="invoicing-modal-header">
                    <h3>⚙️ Invoicing Engine & Tally Integration Settings</h3>
                    <button className="invoicing-modal-close-btn" onClick={onClose} title="Close Settings">
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="invoicing-modal-body">
                    {/* Navigation Tabs */}
                    <div className="modal-tab-bar">
                        {[
                            { id: 'targets', l: '🎯 Targets & Projections' },
                            { id: 'schedule', l: '🔄 Auto-Retrieve & Sync Schedule' },
                            { id: 'mappings', l: '🏢 Company Mappings' },
                            { id: 'audit', l: '📜 Sync History & Audit Trail' }
                        ].map(t => (
                            <button key={t.id} className={`modal-tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                                {t.l}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div style={{ padding:'3rem', textAlign:'center' }}>
                            <div className="inv-skeleton inv-skeleton-block" style={{ height: 200 }} />
                        </div>
                    ) : tab === 'targets' ? (
                        /* ================= TAB 1: TARGETS & PROJECTION LIMITS ================= */
                        <div>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
                                <p style={{ fontSize:'0.84rem', color:'var(--inv-text-muted)', margin:0, fontWeight:500 }}>
                                    Set monthly billing targets and custom projection days. Changes take effect immediately with full audit trail logging.
                                </p>
                                <span className="read-only-badge">FY {settingsData?.financial_year || '26-27'}</span>
                            </div>

                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'1.25rem' }}>
                                {(settingsData?.settings || []).map(comp => (
                                    <div key={comp.company_key} className="clean-selector-card" style={{ cursor:'default', padding:'1.15rem' }}>
                                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.65rem' }}>
                                            <strong style={{ fontSize:'0.92rem', color:'#0f172a' }}>{comp.display_name}</strong>
                                            <span className="severity-pill" style={{ color:'#475569', background:'#f1f5f9', border:'1px solid #e2e8f0', fontSize:'0.68rem' }}>
                                                {comp.company_key}
                                            </span>
                                        </div>

                                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'0.65rem' }}>
                                            <div>
                                                <label style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--inv-text-muted)', textTransform:'uppercase', display:'block', marginBottom:'0.25rem' }}>
                                                    Monthly Target (₹)
                                                </label>
                                                <input className="clean-input" type="number"
                                                    value={targetValues[comp.company_key] !== undefined ? targetValues[comp.company_key] : comp.monthly_target}
                                                    onChange={e => setTargetValues({ ...targetValues, [comp.company_key]: e.target.value })}
                                                    style={{ width:'100%', fontSize:'0.92rem', fontWeight:700, boxSizing:'border-box', height:36 }}/>
                                            </div>
                                            <div>
                                                <label style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--inv-text-muted)', textTransform:'uppercase', display:'block', marginBottom:'0.25rem' }}>
                                                    Projection Days
                                                </label>
                                                <input className="clean-input" type="number"
                                                    value={projectionValues[comp.company_key] !== undefined ? projectionValues[comp.company_key] : comp.projection_days}
                                                    onChange={e => setProjectionValues({ ...projectionValues, [comp.company_key]: e.target.value })}
                                                    placeholder="30"
                                                    style={{ width:'100%', fontSize:'0.92rem', fontWeight:700, boxSizing:'border-box', height:36 }}/>
                                            </div>
                                        </div>

                                        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                                            <input className="clean-input" type="text"
                                                placeholder="Change reason / note..."
                                                value={notes[comp.company_key] || ''}
                                                onChange={e => setNotes({ ...notes, [comp.company_key]: e.target.value })}
                                                style={{ fontSize:'0.78rem', height:36, flex:1, boxSizing:'border-box' }}/>
                                            <button className="invoicing-btn-primary"
                                                onClick={() => handleSaveTarget(comp.company_key)}
                                                disabled={saving}
                                                style={{ padding:'0 0.9rem', fontSize:'0.78rem', flexShrink:0 }}>
                                                {saving ? 'Saving...' : 'Update'}
                                            </button>
                                        </div>

                                        {comp.audit_trail && comp.audit_trail.length > 0 && (
                                            <div style={{ marginTop:'0.65rem', paddingTop:'0.5rem', borderTop:'1px solid var(--inv-border-light)', fontSize:'0.72rem', color:'var(--inv-text-muted)' }}>
                                                Last changed by <strong style={{ color:'var(--inv-text-primary)' }}>{comp.audit_trail[comp.audit_trail.length - 1].changed_by}</strong> on {format(new Date(comp.audit_trail[comp.audit_trail.length - 1].changed_at), 'dd MMM yyyy, hh:mm a')}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : tab === 'schedule' ? (
                        /* ================= TAB 2: AUTO RETRIEVE & TALLY SYNC SCHEDULE ================= */
                        <div>
                            <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:'1.5rem', marginBottom:'1.5rem' }}>
                                {/* Schedule Config */}
                                <div className="clean-selector-card" style={{ cursor:'default', padding:'1.35rem' }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                                        <div>
                                            <strong style={{ fontSize:'1rem', color:'#0f172a', display:'block' }}>Auto-Retrieve from Tally</strong>
                                            <span style={{ fontSize:'0.78rem', color:'var(--inv-text-muted)' }}>Automatically fetch daily sales register figures</span>
                                        </div>
                                        <label style={{ display:'inline-flex', alignItems:'center', cursor:'pointer', gap:'0.4rem' }}>
                                            <input type="checkbox" checked={autoRetrieve} onChange={e => setAutoRetrieve(e.target.checked)} style={{ width:18, height:18, cursor:'pointer' }}/>
                                            <span style={{ fontSize:'0.85rem', fontWeight:700, color: autoRetrieve ? 'var(--inv-success)' : 'var(--inv-text-muted)' }}>
                                                {autoRetrieve ? 'ENABLED' : 'DISABLED'}
                                            </span>
                                        </label>
                                    </div>

                                    <div style={{ marginBottom:'1.25rem' }}>
                                        <label style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--inv-text-muted)', textTransform:'uppercase', display:'block', marginBottom:'0.4rem' }}>
                                            Retrieval Frequency
                                        </label>
                                        <div className="period-pill-group" style={{ width:'100%', justifyContent:'space-around' }}>
                                            {['HOURLY', 'DAILY', 'CUSTOM'].map(f => (
                                                <button key={f} className={`period-pill-btn ${frequency === f ? 'active' : ''}`} onClick={() => setFrequency(f)} style={{ flex:1, justifyContent:'center' }}>
                                                    {f}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--inv-text-muted)', textTransform:'uppercase', display:'block', marginBottom:'0.4rem' }}>
                                            Scheduled Daily Retrieval Times
                                        </label>
                                        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', marginBottom:'0.75rem', alignItems:'center' }}>
                                            {scheduledTimes.map(t => (
                                                <span key={t} style={{
                                                    display:'inline-flex', alignItems:'center', gap:'0.4rem',
                                                    background:'var(--inv-primary-light)', color:'var(--inv-primary)',
                                                    border:'1px solid var(--inv-primary-border)',
                                                    padding:'0 0.65rem', height:30, borderRadius:6, fontWeight:700, fontSize:'0.82rem'
                                                }}>
                                                    <span>🕒</span>
                                                    <span>{t}</span>
                                                    <button onClick={() => handleRemoveTime(t)} style={{
                                                        background:'transparent', border:'none', cursor:'pointer',
                                                        color:'var(--inv-primary)', fontWeight:800, fontSize:'1rem',
                                                        padding:0, marginLeft:'2px', display:'flex', alignItems:'center'
                                                    }}>×</button>
                                                </span>
                                            ))}
                                        </div>
                                        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                                            <input className="clean-input" type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                                                style={{ width:140, height:36, boxSizing:'border-box' }}/>
                                            <button className="invoicing-btn-secondary" onClick={handleAddTime}
                                                style={{ height:36, padding:'0 1rem' }}>
                                                + Add Time
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ marginTop:'1.5rem' }}>
                                        <button className="invoicing-btn-primary" onClick={handleSaveSyncSchedule} disabled={saving}
                                            style={{ width:'100%', justifyContent:'center', height:38 }}>
                                            {saving ? 'Saving Schedule...' : '💾 Save Sync Schedule'}
                                        </button>
                                    </div>
                                </div>

                                {/* Live Sync Status & Trigger */}
                                <div className="clean-selector-card" style={{ cursor:'default', padding:'1.35rem', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                                    <div>
                                        <strong style={{ fontSize:'1rem', color:'#0f172a', display:'block', marginBottom:'0.75rem' }}>Live Connection Status</strong>
                                        
                                        <div style={{ marginBottom:'0.85rem' }}>
                                            <span style={{ fontSize:'0.75rem', color:'var(--inv-text-muted)', display:'block' }}>Current Status:</span>
                                            <span className="sync-status-pill" style={{ marginTop:'0.25rem' }}>
                                                <span className="sync-dot" />
                                                <strong style={{ color:'var(--inv-success)' }}>{schedule.last_sync_status || 'LIVE / READY'}</strong>
                                            </span>
                                        </div>

                                        <div style={{ marginBottom:'0.85rem' }}>
                                            <span style={{ fontSize:'0.75rem', color:'var(--inv-text-muted)', display:'block' }}>Last Successful Sync:</span>
                                            <strong style={{ fontSize:'0.85rem', color:'var(--inv-text-primary)' }}>
                                                {schedule.last_successful_sync ? format(new Date(schedule.last_successful_sync), 'dd MMM yyyy, hh:mm a') : 'Today, Live Feed'}
                                            </strong>
                                        </div>

                                        <div style={{ marginBottom:'0.85rem' }}>
                                            <span style={{ fontSize:'0.75rem', color:'var(--inv-text-muted)', display:'block' }}>Next Scheduled Sync:</span>
                                            <strong style={{ fontSize:'0.85rem', color:'var(--inv-primary)' }}>
                                                Today at 06:00 PM
                                            </strong>
                                        </div>
                                    </div>

                                    <div>
                                        <button className="invoicing-btn-primary" onClick={handleTriggerSyncNow} disabled={syncing}
                                            style={{ width:'100%', justifyContent:'center', background:'var(--inv-success)', height:38 }}>
                                            {syncing ? '🔄 Syncing Tally...' : '⚡ Retrieve Sales Data Now'}
                                        </button>
                                        {syncResult && (
                                            <div style={{ marginTop:'0.5rem', padding:'0.5rem', background:'var(--inv-success-light)', borderRadius:6, fontSize:'0.75rem', color:'var(--inv-success-text)' }}>
                                                ✅ {syncResult.message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : tab === 'mappings' ? (
                        /* ================= TAB 3: COMPANY MAPPINGS ================= */
                        <div>
                            <p style={{ fontSize:'0.84rem', color:'var(--inv-text-muted)', margin:'0 0 1.25rem', fontWeight:500 }}>
                                Configure Tally Company Name ↔ Application Display Name mapping. New companies can be added dynamically without code changes.
                            </p>

                            {/* Add New Company Form */}
                            <form onSubmit={handleAddMapping} className="clean-selector-card" style={{ cursor:'default', padding:'1.15rem', marginBottom:'1.5rem', background:'#fafbfc' }}>
                                <strong style={{ fontSize:'0.88rem', color:'#0f172a', display:'block', marginBottom:'0.75rem' }}>+ Register New Business Unit</strong>
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'0.75rem', marginBottom:'0.75rem' }}>
                                    <input className="clean-input" placeholder="Company Key (e.g. NEW_CO)" value={newCompanyKey} onChange={e => setNewCompanyKey(e.target.value)} style={{ height:36, boxSizing:'border-box' }} required />
                                    <input className="clean-input" placeholder="Tally Company Name" value={newTallyName} onChange={e => setNewTallyName(e.target.value)} style={{ height:36, boxSizing:'border-box' }} required />
                                    <input className="clean-input" placeholder="App Display Name" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} style={{ height:36, boxSizing:'border-box' }} required />
                                    <select className="clean-select" value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ height:36, boxSizing:'border-box' }}>
                                        <option value="Core Group">Core Group</option>
                                        <option value="Customs Brokerage">Customs Brokerage</option>
                                        <option value="Forwarding">Forwarding</option>
                                        <option value="Digital">Digital</option>
                                        <option value="Manufacturing">Manufacturing</option>
                                        <option value="IoT">IoT</option>
                                    </select>
                                    <select className="clean-select" value={newOwner} onChange={e => setNewOwner(e.target.value)} style={{ height:36, boxSizing:'border-box' }}>
                                        <option value="Yash">Yash (SFPL)</option>
                                        <option value="Ayan">Ayan (SRCC / Novusha)</option>
                                        <option value="Naresh">Naresh (Paramount / Alluvium / RABS)</option>
                                    </select>
                                </div>
                                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                                    <button type="submit" className="invoicing-btn-primary" disabled={saving} style={{ height:36, padding:'0 1.2rem' }}>
                                        {saving ? 'Adding...' : '+ Save Mapping'}
                                    </button>
                                </div>
                            </form>

                            {/* Existing Mappings Table */}
                            <div className="invoicing-table-responsive" style={{ maxHeight:320, overflowY:'auto' }}>
                                <table className="invoicing-data-table">
                                    <thead><tr>
                                        <th>Key</th>
                                        <th>Tally Ledger Name</th>
                                        <th>Display Name</th>
                                        <th>Category</th>
                                        <th style={{ textAlign:'center' }}>Default Days</th>
                                        <th>Triage Owner</th>
                                        <th style={{ textAlign:'center' }}>Status</th>
                                    </tr></thead>
                                    <tbody>
                                        {companyMappings.map(m => (
                                            <tr key={m._id || m.company_key}>
                                                <td><span style={{ fontFamily:'var(--inv-font-mono)', fontWeight:700, color:'var(--inv-primary)' }}>{m.company_key}</span></td>
                                                <td>{m.tally_company_name}</td>
                                                <td><strong>{m.display_name}</strong></td>
                                                <td><span className="severity-pill" style={{ color:'#475569', background:'#f1f5f9', border:'1px solid #e2e8f0', fontSize:'0.68rem' }}>{m.group_category}</span></td>
                                                <td style={{ textAlign:'center' }}><span className="projection-days-badge">{m.default_projection_days}d</span></td>
                                                <td><strong style={{ color:'#334155' }}>{m.responsible_person_name}</strong></td>
                                                <td style={{ textAlign:'center' }}><span className="status-pill status-converted">Active</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        /* ================= TAB 4: AUDIT TRAIL & REFRESH LOGS ================= */
                        <div>
                            <p style={{ fontSize:'0.84rem', color:'var(--inv-text-muted)', margin:'0 0 1.25rem', fontWeight:500 }}>
                                Immutable audit trail of parameter adjustments, schedule modifications, and Tally data synchronization history.
                            </p>

                            {refreshHistory.length === 0 ? (
                                <div style={{ textAlign:'center', padding:'2.5rem 1rem', color:'var(--inv-text-muted)' }}>
                                    <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>📋</div>
                                    <p style={{ margin:0, fontSize:'0.85rem' }}>No configuration changes recorded yet in current audit cycle.</p>
                                </div>
                            ) : (
                                <div className="invoicing-table-responsive" style={{ maxHeight:360, overflowY:'auto' }}>
                                    <table className="invoicing-data-table">
                                        <thead><tr>
                                            <th>Timestamp</th>
                                            <th>Changed By</th>
                                            <th>Event / Reason</th>
                                            <th>Details</th>
                                        </tr></thead>
                                        <tbody>
                                            {refreshHistory.slice().reverse().map((h, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontSize:'0.8rem', color:'var(--inv-text-muted)' }}>
                                                        {h.changed_at ? format(new Date(h.changed_at), 'dd MMM yyyy, hh:mm:ss a') : '–'}
                                                    </td>
                                                    <td><strong>{h.changed_by || 'System Admin'}</strong></td>
                                                    <td><span className="severity-pill severity-low">{h.reason || 'Configuration Update'}</span></td>
                                                    <td style={{ fontFamily:'var(--inv-font-mono)', fontSize:'0.75rem', color:'#475569' }}>
                                                        {JSON.stringify(h.new_schedule || h)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="invoicing-modal-footer">
                    <button className="invoicing-btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default InvoicingSettingsModal;
