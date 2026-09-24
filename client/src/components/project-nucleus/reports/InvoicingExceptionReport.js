import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './InvoicingStyles.css';

const InvoicingExceptionReport = () => {
    const [assignee, setAssignee] = useState('all');
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState(null);
    const [notes, setNotes] = useState('');

    const api = (process.env.REACT_APP_API_STRING || 'http://localhost:9006').replace(/\/api$/, '') + '/api';

    const fetch_ = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${api}/project-nucleus/invoicing/exceptions`, {
                params: { responsiblePerson: assignee === 'all' ? undefined : assignee,
                    status: statusFilter === 'all' ? undefined : statusFilter },
                withCredentials: true });
            if (res.data?.success) setData(res.data);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetch_(); }, [assignee, statusFilter]);

    const exceptions = data?.exceptions || [];
    const counts = data?.counts_by_person || {};

    const resolve = async (id) => {
        try {
            await axios.post(`${api}/project-nucleus/invoicing/exceptions/${id}/resolve`,
                { status:'RESOLVED', resolution_notes: notes || 'Acknowledged' }, { withCredentials: true });
            setResolvingId(null); setNotes(''); fetch_();
        } catch(e) { alert('Failed to resolve'); }
    };

    const OWNERS = [
        { id:'Yash', label:'Yash', scope:'SFPL Gujarat + Non-Gujarat', iconColor:'#4f46e5' },
        { id:'Ayan', label:'Ayan', scope:'SRCC + Novusha Alvision + Nextwave', iconColor:'#0284c7' },
        { id:'Naresh', label:'Naresh', scope:'Paramount + Alluvium + RABS', iconColor:'#d97706' },
        { id:'all', label:'All Owners', scope:'Entire Corporate Portfolio', iconColor:'#64748b' },
    ];

    if (loading && !data) {
        return (
            <div className="invoicing-container">
                <div className="inv-skeleton inv-skeleton-block" style={{ height:90, marginBottom:'1.75rem' }}/>
                <div className="invoicing-kpi-grid">{[1,2,3,4].map(i => <div key={i} className="inv-skeleton inv-skeleton-block" style={{ height:130 }}/>)}</div>
            </div>
        );
    }

    return (
        <div className="invoicing-container">
            {/* Header */}
            <div className="invoicing-header-banner">
                <div className="invoicing-title-area">
                    <h2><span>⚠️</span> Exception & Anomaly Resolution Center</h2>
                    <p>Automated detection for zero-billing days, revenue credit reversals, missing feeds, and overdue proformas.</p>
                </div>
                <div className="invoicing-header-actions">
                    <span className="read-only-badge">🔒 Automated Intelligence</span>
                </div>
            </div>

            {/* Owner Selector Grid */}
            <div className="invoicing-kpi-grid" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(230px,1fr))' }}>
                {OWNERS.map((o, idx) => {
                    const on = assignee === o.id;
                    return (
                        <div key={o.id}
                            className={`clean-selector-card ${on ? 'active' : ''} inv-stagger-${idx+1}`}
                            onClick={() => setAssignee(o.id)}
                            style={{ padding:'1.35rem 1.4rem' }}>
                            <div className="kpi-card-header">
                                <span className="kpi-card-label" style={{ color: on ? '#4f46e5' : 'var(--inv-text-muted)' }}>{o.label}</span>
                                <div className="kpi-card-icon-wrap" style={{ color: o.iconColor }}>👤</div>
                            </div>
                            <div className="kpi-card-value" style={{ color: on ? '#4f46e5' : '#0f172a' }}>
                                {o.id === 'all' ? (counts.total_pending||0) : (counts[o.id]||0)}
                                <span style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--inv-text-muted)', marginLeft:'0.35rem' }}>
                                    {o.id === 'all' ? 'Total' : 'Pending'}
                                </span>
                            </div>
                            <div className="kpi-card-subtext"><span style={{ color:'var(--inv-text-muted)', fontSize:'0.76rem' }}>{o.scope}</span></div>
                        </div>
                    );
                })}
            </div>

            {/* Filter Bar */}
            <div className="invoicing-filter-bar">
                <div className="period-pill-group">
                    {[{id:'PENDING',l:'Pending',i:'⏳'},{id:'RESOLVED',l:'Resolved',i:'✅'},{id:'all',l:'All',i:'📋'}].map(st =>
                        <button key={st.id} className={`period-pill-btn ${statusFilter===st.id?'active':''}`} onClick={() => setStatusFilter(st.id)}>
                            <span>{st.i}</span> {st.l}
                        </button>
                    )}
                </div>
                <span style={{ fontSize:'0.82rem', color:'var(--inv-text-muted)', fontWeight:600 }}>
                    Active Scope: <strong style={{ color:'var(--inv-primary)' }}>{assignee.toUpperCase()}</strong> ({exceptions.length} records)
                </span>
            </div>

            {/* Table */}
            <div className="invoicing-table-card inv-stagger-5">
                <div className="invoicing-table-header">
                    <h3><span>⚠️</span> Actionable Exception Queue</h3>
                </div>

                {exceptions.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'3.5rem 1rem', color:'var(--inv-text-muted)' }}>
                        <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>🎉</div>
                        <h4 style={{ margin:0, color:'var(--inv-text-primary)', fontSize:'1.1rem', fontWeight:700 }}>No Pending Exceptions Found</h4>
                        <p style={{ margin:'0.35rem 0 0', fontSize:'0.84rem' }}>All daily entries and registers are balanced and synchronized.</p>
                    </div>
                ) : (
                    <div className="invoicing-table-responsive">
                        <table className="invoicing-data-table">
                            <thead><tr>
                                <th style={{ width:100 }}>Severity</th>
                                <th style={{ width:120 }}>Category</th>
                                <th>Unit / Entity</th>
                                <th style={{ width:100 }}>Date</th>
                                <th>Exception Summary</th>
                                <th>Assigned Lead</th>
                                <th>Status</th>
                                <th style={{ textAlign:'center', width:160 }}>Action</th>
                            </tr></thead>
                            <tbody>
                                {exceptions.map(exc => (
                                    <tr key={exc._id}>
                                        <td><span className={`severity-pill severity-${(exc.severity||'MEDIUM').toLowerCase()}`}>
                                            {exc.severity==='CRITICAL'?'🚨':exc.severity==='HIGH'?'⚠️':'🟡'} {exc.severity||'MEDIUM'}
                                        </span></td>
                                        <td><span className="severity-pill" style={{ color:'#475569', background:'#f1f5f9', border:'1px solid #e2e8f0', fontSize:'0.68rem' }}>{exc.exception_type}</span></td>
                                        <td><strong style={{ color:'#0f172a' }}>{exc.display_name||exc.company_key||'Group'}</strong></td>
                                        <td style={{ fontFamily:'var(--inv-font-mono)', fontSize:'0.82rem', color:'var(--inv-text-muted)' }}>{exc.affected_date||'–'}</td>
                                        <td style={{ maxWidth:320 }}>
                                            <div style={{ fontWeight:700, color:'#0f172a', fontSize:'0.84rem' }}>{exc.title}</div>
                                            <div style={{ fontSize:'0.76rem', color:'var(--inv-text-muted)', marginTop:'0.15rem', lineHeight:1.4 }}>{exc.description}</div>
                                        </td>
                                        <td><span style={{ fontWeight:700, color:'#334155', fontSize:'0.82rem' }}>{exc.responsible_person}</span></td>
                                        <td><span className={`status-pill ${exc.status==='RESOLVED'?'status-resolved':'status-pending'}`}>
                                            {exc.status==='RESOLVED'?'✅ Resolved':'⏳ Pending'}
                                        </span></td>
                                        <td style={{ textAlign:'center' }}>
                                            {exc.status === 'PENDING' ? (
                                                resolvingId === exc._id ? (
                                                    <div style={{ display:'flex', flexDirection:'column', gap:'0.35rem' }}>
                                                        <input className="clean-input" type="text" placeholder="Resolution notes..." value={notes} onChange={e => setNotes(e.target.value)}
                                                            style={{ fontSize:'0.75rem', padding:'0.3rem 0.55rem' }}/>
                                                        <div style={{ display:'flex', gap:'0.3rem', justifyContent:'center' }}>
                                                            <button className="invoicing-btn-primary" onClick={() => resolve(exc._id)}
                                                                style={{ padding:'0.2rem 0.6rem', fontSize:'0.72rem' }}>Save</button>
                                                            <button className="invoicing-btn-secondary" onClick={() => setResolvingId(null)}
                                                                style={{ padding:'0.2rem 0.6rem', fontSize:'0.72rem' }}>Cancel</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button className="invoicing-btn-secondary" onClick={() => { setResolvingId(exc._id); setNotes(''); }}
                                                        style={{ padding:'0.3rem 0.75rem', fontSize:'0.76rem' }}>Acknowledge</button>
                                                )
                                            ) : (
                                                <span style={{ fontSize:'0.75rem', color:'var(--inv-text-muted)', fontWeight:500 }}>By {exc.resolved_by||'Admin'}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvoicingExceptionReport;
