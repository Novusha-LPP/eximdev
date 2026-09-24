import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import './InvoicingStyles.css';

const InvoicingSettingsReport = () => {
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
        loadData();
    }, []);

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
            alert(`Target for ${company_key} updated successfully`);
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
            alert('Company mapping saved successfully');
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

    const schedule = settingsData?.sync_schedule || {};

    return (
        <div className="invoicing-container">
            {/* Header Banner */}
            <div className="invoicing-header-banner">
                <div className="invoicing-title-area">
                    <h2><span>⚙️</span> Invoicing & Tally Engine Settings</h2>
                    <p>Centralized administration for monthly billing targets, projection parameters, auto-retrieve schedules, and company mappings.</p>
                </div>
                <div className="invoicing-header-actions">
                    <span className="read-only-badge read-only-badge-live">🔒 Admin Configuration</span>
                    <div className="sync-status-pill">
                        <span className="sync-dot" />
                        <span>{schedule.last_sync_status || 'LIVE / READY'}</span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="invoicing-filter-bar" style={{ padding: '0.5rem 1rem' }}>
                <div className="period-pill-group" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                    {[
                        { id: 'targets', l: 'Targets & Projections', icon: '🎯' },
                        { id: 'schedule', l: 'Auto-Retrieve & Tally Schedule', icon: '🔄' },
                        { id: 'mappings', l: 'Company Mappings', icon: '🏢' },
                        { id: 'audit', l: 'Sync History & Audit Trail', icon: '📜' }
                    ].map(t => (
                        <button key={t.id}
                            className={`period-pill-btn ${tab === t.id ? 'active' : ''}`}
                            onClick={() => setTab(t.id)}>
                            <span>{t.icon}</span>
                            <span>{t.l}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            {loading && !settingsData ? (
                <div className="invoicing-table-card">
                    <div className="inv-skeleton inv-skeleton-block" style={{ height: 250 }} />
                </div>
            ) : tab === 'targets' ? (
                /* ================= TAB 1: TARGETS & PROJECTION LIMITS ================= */
                <div className="invoicing-table-card inv-stagger-2">
                    <div className="invoicing-table-header">
                        <div>
                            <h3><span>🎯</span> Monthly Billing Targets & Projection Days</h3>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--inv-text-muted)' }}>
                                Configure unit targets and projection models. SRCC uses default 36d projection; other units use calendar or custom days.
                            </p>
                        </div>
                        <span className="read-only-badge">Financial Year: {settingsData?.financial_year || '26-27'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                        {(settingsData?.settings || []).map(comp => {
                            const curTarget = targetValues[comp.company_key] !== undefined ? targetValues[comp.company_key] : comp.monthly_target;
                            const curProj = projectionValues[comp.company_key] !== undefined ? projectionValues[comp.company_key] : comp.projection_days;
                            const numT = Number(curTarget || 0);
                            const previewStr = numT >= 1e7 ? `(₹${(numT / 1e7).toFixed(2)} Cr)` : numT >= 1e5 ? `(₹${(numT / 1e5).toFixed(2)} L)` : '';
                            const lastAudit = comp.audit_trail && comp.audit_trail.length > 0 ? comp.audit_trail[comp.audit_trail.length - 1] : null;

                            return (
                                <div key={comp.company_key} className="inv-setting-card">
                                    {/* Header */}
                                    <div className="inv-setting-card-header">
                                        <div>
                                            <strong style={{ fontSize: '1rem', color: '#0f172a', display: 'block', fontWeight: 800 }}>
                                                {comp.display_name}
                                            </strong>
                                            <span style={{ fontSize: '0.74rem', color: 'var(--inv-text-muted)', fontFamily: 'var(--inv-font-mono)', fontWeight: 600 }}>
                                                {comp.company_key}
                                            </span>
                                        </div>
                                        <span className="severity-pill" style={{ color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: '0.7rem' }}>
                                            {comp.group_category || comp.company_key}
                                        </span>
                                    </div>

                                    {/* Body Form */}
                                    <div className="inv-setting-card-body">
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.75rem' }}>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--inv-text-muted)', textTransform: 'uppercase' }}>
                                                        Target (₹)
                                                    </label>
                                                    {previewStr && (
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--inv-primary)' }}>
                                                            {previewStr}
                                                        </span>
                                                    )}
                                                </div>
                                                <input className="clean-input" type="number"
                                                    value={curTarget}
                                                    onChange={e => setTargetValues({ ...targetValues, [comp.company_key]: e.target.value })}
                                                    style={{ width: '100%', fontSize: '0.92rem', fontWeight: 700, height: 36, boxSizing: 'border-box' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--inv-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
                                                    Proj Days
                                                </label>
                                                <input className="clean-input" type="number"
                                                    value={curProj}
                                                    onChange={e => setProjectionValues({ ...projectionValues, [comp.company_key]: e.target.value })}
                                                    placeholder="30"
                                                    style={{ width: '100%', fontSize: '0.92rem', fontWeight: 700, height: 36, boxSizing: 'border-box' }} />
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--inv-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
                                                Reason / Audit Note
                                            </label>
                                            <input className="clean-input" type="text"
                                                placeholder="e.g. FY budget revision, revised projection model"
                                                value={notes[comp.company_key] || ''}
                                                onChange={e => setNotes({ ...notes, [comp.company_key]: e.target.value })}
                                                style={{ width: '100%', fontSize: '0.78rem', height: 36, boxSizing: 'border-box' }} />
                                        </div>
                                    </div>

                                    {/* Footer with Audit & Update Action */}
                                    <div className="inv-setting-card-footer">
                                        <div style={{ fontSize: '0.72rem', color: 'var(--inv-text-muted)', lineHeight: 1.3, flex: 1, paddingRight: '0.5rem' }}>
                                            {lastAudit ? (
                                                <span>
                                                    Changed by <strong style={{ color: 'var(--inv-text-primary)' }}>{lastAudit.changed_by}</strong> on {format(new Date(lastAudit.changed_at), 'dd MMM, hh:mm a')}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#94a3b8' }}>● Standard Baseline Rules</span>
                                            )}
                                        </div>
                                        <button className="invoicing-btn-primary"
                                            onClick={() => handleSaveTarget(comp.company_key)}
                                            disabled={saving}
                                            style={{ height: 34, padding: '0 1.1rem', fontSize: '0.78rem', flexShrink: 0 }}>
                                            {saving ? 'Saving...' : 'Update'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : tab === 'schedule' ? (
                /* ================= TAB 2: AUTO RETRIEVE & TALLY SYNC SCHEDULE ================= */
                <div className="invoicing-charts-grid inv-stagger-2">
                    {/* Schedule Configuration Card */}
                    <div className="invoicing-chart-card">
                        <div className="chart-card-header">
                            <h3>🔄 Automatic Sales Ingestion Schedule</h3>
                            <span style={{ fontSize: '0.78rem', color: 'var(--inv-text-muted)', fontWeight: 600 }}>Tally Sales Register Pipeline</span>
                        </div>

                        <div style={{ padding: '0.5rem 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem', background: '#fafbfc', borderRadius: 12, border: '1px solid var(--inv-border-light)' }}>
                                <div>
                                    <strong style={{ fontSize: '1rem', color: '#0f172a', display: 'block' }}>Auto-Retrieve from Tally</strong>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--inv-text-muted)' }}>Automatically fetch and reconcile daily sales register figures</span>
                                </div>
                                <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
                                    <input type="checkbox" checked={autoRetrieve} onChange={e => setAutoRetrieve(e.target.checked)} style={{ width: 20, height: 20, cursor: 'pointer' }} />
                                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: autoRetrieve ? 'var(--inv-success)' : 'var(--inv-text-muted)' }}>
                                        {autoRetrieve ? 'ENABLED' : 'DISABLED'}
                                    </span>
                                </label>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--inv-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                                    Retrieval Frequency
                                </label>
                                <div className="period-pill-group" style={{ width: '100%', justifyContent: 'space-around' }}>
                                    {['HOURLY', 'DAILY', 'CUSTOM'].map(f => (
                                        <button key={f} className={`period-pill-btn ${frequency === f ? 'active' : ''}`} onClick={() => setFrequency(f)} style={{ flex: 1, justifyContent: 'center', height: 34 }}>
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.75rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--inv-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                                    Scheduled Daily Retrieval Times
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem', alignItems: 'center' }}>
                                    {scheduledTimes.map(t => (
                                        <span key={t} style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                            background: 'var(--inv-primary-light)', color: 'var(--inv-primary)',
                                            border: '1px solid var(--inv-primary-border)',
                                            padding: '0 0.75rem', height: 32, borderRadius: 6, fontWeight: 700, fontSize: '0.84rem'
                                        }}>
                                            <span>🕒</span>
                                            <span>{t}</span>
                                            <button onClick={() => handleRemoveTime(t)} style={{
                                                background: 'transparent', border: 'none', cursor: 'pointer',
                                                color: 'var(--inv-primary)', fontWeight: 800, fontSize: '1.1rem',
                                                padding: 0, marginLeft: '2px', display: 'flex', alignItems: 'center'
                                            }}>×</button>
                                        </span>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input className="clean-input" type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                                        style={{ width: 140, height: 36, boxSizing: 'border-box' }} />
                                    <button className="invoicing-btn-secondary" onClick={handleAddTime} style={{ height: 36, padding: '0 1rem' }}>
                                        + Add Retrieval Time
                                    </button>
                                </div>
                            </div>

                            <div>
                                <button className="invoicing-btn-primary" onClick={handleSaveSyncSchedule} disabled={saving}
                                    style={{ width: '100%', justifyContent: 'center', height: 38 }}>
                                    {saving ? 'Saving Schedule...' : '💾 Save Sync Configuration'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Live Sync Status & Trigger Card */}
                    <div className="invoicing-chart-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div className="chart-card-header">
                            <h3>⚡ Live Integration & Manual Trigger</h3>
                            <span className="read-only-badge read-only-badge-live">Online</span>
                        </div>

                        <div style={{ padding: '0.5rem 0' }}>
                            <div style={{ marginBottom: '1.15rem' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--inv-text-muted)', display: 'block', fontWeight: 600 }}>Tally Bridge Status:</span>
                                <span className="sync-status-pill" style={{ marginTop: '0.35rem', padding: '0.45rem 1rem' }}>
                                    <span className="sync-dot" />
                                    <strong style={{ color: 'var(--inv-success)', fontSize: '0.88rem' }}>{schedule.last_sync_status || 'LIVE / READY'}</strong>
                                </span>
                            </div>

                            <div style={{ marginBottom: '1.15rem' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--inv-text-muted)', display: 'block', fontWeight: 600 }}>Last Successful Retrieval:</span>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--inv-text-primary)', marginTop: '0.2rem', display: 'block' }}>
                                    {schedule.last_successful_sync ? format(new Date(schedule.last_successful_sync), 'dd MMM yyyy, hh:mm a') : 'Today, Live Feed'}
                                </strong>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--inv-text-muted)', display: 'block', fontWeight: 600 }}>Next Scheduled Retrieval:</span>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--inv-primary)', marginTop: '0.2rem', display: 'block' }}>
                                    Today at 06:00 PM
                                </strong>
                            </div>

                            <div style={{ padding: '0.85rem', background: 'var(--inv-bg-subtle)', borderRadius: 10, border: '1px solid var(--inv-border-light)', fontSize: '0.78rem', color: 'var(--inv-text-muted)', lineHeight: 1.5 }}>
                                ℹ️ <strong>Idempotent Sync:</strong> Re-fetching historical dates will validate existing entries and update credit note reversals without creating duplicates.
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <button className="invoicing-btn-primary" onClick={handleTriggerSyncNow} disabled={syncing}
                                style={{ width: '100%', justifyContent: 'center', background: 'var(--inv-success)', height: 40 }}>
                                {syncing ? '🔄 Ingesting from Tally...' : '⚡ Retrieve Sales Data Now'}
                            </button>
                            {syncResult && (
                                <div style={{ marginTop: '0.65rem', padding: '0.65rem', background: 'var(--inv-success-light)', border: '1px solid var(--inv-success-border)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--inv-success-text)' }}>
                                    ✅ {syncResult.message}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : tab === 'mappings' ? (
                /* ================= TAB 3: COMPANY MAPPINGS ================= */
                <div className="invoicing-table-card inv-stagger-2">
                    <div className="invoicing-table-header">
                        <div>
                            <h3><span>🏢</span> Business Unit & Tally Ledger Mappings</h3>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--inv-text-muted)' }}>
                                Map Tally Company Ledger Names to Application Display Names. Register new entities dynamically without code changes.
                            </p>
                        </div>
                    </div>

                    {/* Add New Company Form */}
                    <form onSubmit={handleAddMapping} className="clean-selector-card" style={{ cursor: 'default', padding: '1.25rem', marginBottom: '1.75rem', background: '#fafbfc' }}>
                        <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block', marginBottom: '0.85rem' }}>+ Register New Business Unit</strong>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
                            <input className="clean-input" placeholder="Company Key (e.g. NEW_CO)" value={newCompanyKey} onChange={e => setNewCompanyKey(e.target.value)} style={{ height: 36, boxSizing: 'border-box' }} required />
                            <input className="clean-input" placeholder="Tally Company Ledger Name" value={newTallyName} onChange={e => setNewTallyName(e.target.value)} style={{ height: 36, boxSizing: 'border-box' }} required />
                            <input className="clean-input" placeholder="App Display Name" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} style={{ height: 36, boxSizing: 'border-box' }} required />
                            <select className="clean-select" value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ height: 36, boxSizing: 'border-box' }}>
                                <option value="Core Group">Core Group</option>
                                <option value="Customs Brokerage">Customs Brokerage</option>
                                <option value="Forwarding">Forwarding</option>
                                <option value="Digital">Digital</option>
                                <option value="Manufacturing">Manufacturing</option>
                                <option value="IoT">IoT</option>
                            </select>
                            <select className="clean-select" value={newOwner} onChange={e => setNewOwner(e.target.value)} style={{ height: 36, boxSizing: 'border-box' }}>
                                <option value="Yash">Yash (SFPL)</option>
                                <option value="Ayan">Ayan (SRCC / Novusha)</option>
                                <option value="Naresh">Naresh (Paramount / Alluvium / RABS)</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" className="invoicing-btn-primary" disabled={saving} style={{ height: 36, padding: '0 1.25rem' }}>
                                {saving ? 'Registering...' : '+ Register Entity'}
                            </button>
                        </div>
                    </form>

                    {/* Existing Mappings Table */}
                    <div className="invoicing-table-responsive" style={{ maxHeight: 420, overflowY: 'auto' }}>
                        <table className="invoicing-data-table">
                            <thead><tr>
                                <th style={{ width: 40, textAlign: 'center' }}>#</th>
                                <th>Key</th>
                                <th>Tally Ledger Name</th>
                                <th>Application Display Name</th>
                                <th>Category</th>
                                <th style={{ textAlign: 'center' }}>Default Proj Days</th>
                                <th>Triage Lead</th>
                                <th style={{ textAlign: 'center' }}>Status</th>
                            </tr></thead>
                            <tbody>
                                {companyMappings.map((m, i) => (
                                    <tr key={m._id || m.company_key}>
                                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#94a3b8' }}>{i + 1}</td>
                                        <td><span style={{ fontFamily: 'var(--inv-font-mono)', fontWeight: 700, color: 'var(--inv-primary)', fontSize: '0.82rem' }}>{m.company_key}</span></td>
                                        <td>{m.tally_company_name}</td>
                                        <td><strong style={{ color: '#0f172a' }}>{m.display_name}</strong></td>
                                        <td><span className="severity-pill" style={{ color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: '0.68rem' }}>{m.group_category}</span></td>
                                        <td style={{ textAlign: 'center' }}><span className="projection-days-badge">{m.default_projection_days}d</span></td>
                                        <td><strong style={{ color: '#334155' }}>{m.responsible_person_name}</strong></td>
                                        <td style={{ textAlign: 'center' }}><span className="status-pill status-converted">Active</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* ================= TAB 4: AUDIT TRAIL & REFRESH LOGS ================= */
                <div className="invoicing-table-card inv-stagger-2">
                    <div className="invoicing-table-header">
                        <div>
                            <h3><span>📜</span> Configuration Audit Trail & Sync History</h3>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--inv-text-muted)' }}>
                                Immutable audit log of all schedule changes, target overrides, and system sync events.
                            </p>
                        </div>
                    </div>

                    {refreshHistory.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--inv-text-muted)' }}>
                            <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>📋</div>
                            <p style={{ margin: 0, fontSize: '0.88rem' }}>No configuration changes recorded yet in current audit cycle.</p>
                        </div>
                    ) : (
                        <div className="invoicing-table-responsive" style={{ maxHeight: 480, overflowY: 'auto' }}>
                            <table className="invoicing-data-table">
                                <thead><tr>
                                    <th style={{ width: 170 }}>Timestamp</th>
                                    <th style={{ width: 140 }}>Changed By</th>
                                    <th style={{ width: 180 }}>Event Type</th>
                                    <th>Audit Details</th>
                                </tr></thead>
                                <tbody>
                                    {refreshHistory.slice().reverse().map((h, i) => (
                                        <tr key={i}>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--inv-text-muted)' }}>
                                                {h.changed_at ? format(new Date(h.changed_at), 'dd MMM yyyy, hh:mm:ss a') : '–'}
                                            </td>
                                            <td><strong style={{ color: '#0f172a' }}>{h.changed_by || 'System Admin'}</strong></td>
                                            <td><span className="severity-pill severity-low">{h.reason || 'Configuration Update'}</span></td>
                                            <td style={{ fontFamily: 'var(--inv-font-mono)', fontSize: '0.75rem', color: '#475569' }}>
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
    );
};

export default InvoicingSettingsReport;
