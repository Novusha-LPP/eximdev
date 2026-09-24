import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './InvoicingStyles.css';

const InvoicingPendingUnbilledReport = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState('ALL');

    const api = (process.env.REACT_APP_API_STRING || 'http://localhost:9006').replace(/\/api$/, '') + '/api';

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${api}/project-nucleus/invoicing/pending-unbilled`, { withCredentials: true });
                if (res.data?.success) setData(res.data);
            } catch(e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, []);

    const s = data?.summary || {};
    const branches = data?.branches || [];
    const jobs = data?.sample_jobs || [];
    const filtered = jobs.filter(j => {
        const ms = [j.job_no, j.importer, j.be_no].some(f => (f||'').toLowerCase().includes(search.toLowerCase()));
        const mb = branchFilter === 'ALL' || (j.branch||'').includes(branchFilter);
        return ms && mb;
    });

    if (loading && !data) {
        return (
            <div className="invoicing-container">
                <div className="inv-skeleton inv-skeleton-block" style={{ height:90, marginBottom:'1.75rem' }}/>
                <div className="invoicing-kpi-grid">{[1,2,3].map(i => <div key={i} className="inv-skeleton inv-skeleton-block" style={{ height:130 }}/>)}</div>
            </div>
        );
    }

    return (
        <div className="invoicing-container">
            {/* Header */}
            <div className="invoicing-header-banner">
                <div className="invoicing-title-area">
                    <h2><span>📦</span> SFPL Pending Unbilled Consignments</h2>
                    <p>Live operational pipeline of unbilled customs clearance consignments across all SFPL branches.</p>
                </div>
                <div className="invoicing-header-actions">
                    <span className="read-only-badge read-only-badge-live">🔒 Read-Only · AlVision Live Jobs</span>
                    <span style={{ fontSize:'0.8rem', color:'var(--inv-text-muted)', fontWeight:600 }}>Triage Lead: <strong style={{ color:'var(--inv-text-primary)' }}>Yash</strong></span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="invoicing-kpi-grid">
                {[
                    { label:'Total Unbilled Consignments', value:s.total_pending_unbilled||0, icon:'📑', iconColor:'#4f46e5', sub:'All active branches' },
                    { label:'Cleared Post OOC', value:s.total_cleared_ooc||0, icon:'✅', iconColor:'#059669', sub:'Ready for immediate billing', valColor:'#059669' },
                    { label:'Pending in Operations', value:s.total_in_operations||0, icon:'⏳', iconColor:'#d97706', sub:'Awaiting customs clearance / OOC' },
                ].map((c,i) => (
                    <div key={i} className={`invoicing-kpi-card inv-stagger-${i+1}`}>
                        <div className="kpi-card-header">
                            <span className="kpi-card-label">{c.label}</span>
                            <div className="kpi-card-icon-wrap" style={{ color:c.iconColor }}>{c.icon}</div>
                        </div>
                        <div className="kpi-card-value" style={c.valColor ? { color:c.valColor } : {}}>{c.value}</div>
                        <div className="kpi-card-subtext"><span>{c.sub}</span></div>
                    </div>
                ))}
            </div>

            {/* Branch Selector Grid */}
            <div className="invoicing-chart-card inv-stagger-3" style={{ marginBottom:'1.75rem' }}>
                <div className="chart-card-header">
                    <h3>🏢 Branch-wise Consignment Pipeline</h3>
                    <span style={{ fontSize:'0.78rem', color:'var(--inv-text-muted)', fontWeight:600 }}>Click any branch to filter</span>
                </div>
                <div className="clean-selector-grid">
                    {branches.map(b => {
                        const on = branchFilter === b.branch_code;
                        return (
                            <div key={b.branch_id||b.branch_name}
                                className={`clean-selector-card ${on ? 'active' : ''}`}
                                onClick={() => setBranchFilter(on ? 'ALL' : (b.branch_code||'ALL'))}>
                                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.35rem', alignItems:'center' }}>
                                    <strong style={{ fontSize:'0.92rem', color: on ? '#1e1b4b' : '#0f172a' }}>{b.branch_name}</strong>
                                    <span style={{
                                        fontSize:'0.68rem', fontWeight:700,
                                        background: on ? '#ffffff' : '#f1f5f9',
                                        color: on ? '#4f46e5' : '#475569',
                                        padding:'0.1rem 0.4rem', borderRadius:4, border:'1px solid ' + (on ? '#c7d2fe' : '#e2e8f0')
                                    }}>{b.branch_code}</span>
                                </div>
                                <div style={{ fontSize:'1.45rem', fontWeight:800, color: on ? '#4f46e5' : '#0f172a', marginBottom:'0.2rem' }}>
                                    {b.total_unbilled_jobs} <span style={{ fontSize:'0.75rem', fontWeight:500, color:'var(--inv-text-muted)' }}>Jobs</span>
                                </div>
                                <div style={{ fontSize:'0.76rem', color:'var(--inv-success)', fontWeight:600 }}>● {b.cleared_ooc_jobs} Ready to Bill</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Jobs Table */}
            <div className="invoicing-table-card inv-stagger-5">
                <div className="invoicing-table-header">
                    <h3><span>📋</span> Unbilled Consignment Records</h3>
                    <div style={{ display:'flex', gap:'0.6rem', alignItems:'center' }}>
                        <select className="clean-select" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
                            <option value="ALL">All Branches</option>
                            {branches.map(b => <option key={b.branch_code} value={b.branch_code}>{b.branch_name} ({b.branch_code})</option>)}
                        </select>
                        <input className="clean-input" type="text" placeholder="Search job / importer..." value={search} onChange={e => setSearch(e.target.value)}
                            style={{ width:220 }}/>
                    </div>
                </div>
                <div className="invoicing-table-responsive" style={{ maxHeight:520, overflowY:'auto' }}>
                    <table className="invoicing-data-table">
                        <thead><tr>
                            <th style={{ width:35, textAlign:'center' }}>#</th>
                            <th>Job Number</th>
                            <th>Importer Name</th>
                            <th>Branch</th>
                            <th>BE Number</th>
                            <th>BE Date</th>
                            <th>OOC Clearance</th>
                            <th>Billing Readiness</th>
                            <th>Current Status</th>
                        </tr></thead>
                        <tbody>
                            {filtered.map((j,i) => (
                                <tr key={j._id||i}>
                                    <td style={{ textAlign:'center', fontWeight:600, color:'#94a3b8' }}>{i+1}</td>
                                    <td><strong style={{ color:'var(--inv-primary)', fontFamily:'var(--inv-font-mono)', fontSize:'0.82rem' }}>{j.job_no}</strong></td>
                                    <td style={{ fontWeight:600 }}>{j.importer||'N/A'}</td>
                                    <td><span className="severity-pill" style={{ color:'#475569', background:'#f1f5f9', border:'1px solid #e2e8f0' }}>{j.branch}</span></td>
                                    <td style={{ fontFamily:'var(--inv-font-mono)', fontSize:'0.82rem' }}>{j.be_no||'Pending'}</td>
                                    <td style={{ color:'var(--inv-text-muted)', fontSize:'0.82rem' }}>{j.be_date||'–'}</td>
                                    <td>{j.is_ooc_cleared
                                        ? <span style={{ color:'var(--inv-success)', fontWeight:700, fontSize:'0.8rem' }}>✅ {j.out_of_charge}</span>
                                        : <span style={{ color:'var(--inv-warning)', fontWeight:600, fontSize:'0.78rem' }}>⏳ In Operations</span>}
                                    </td>
                                    <td><span className={`status-pill ${j.is_ooc_cleared?'status-resolved':'status-pending'}`}>
                                        {j.is_ooc_cleared ? 'Ready to Bill' : 'In Progress'}
                                    </span></td>
                                    <td><span style={{ fontSize:'0.76rem', fontWeight:600, color:'var(--inv-text-secondary)' }}>{j.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InvoicingPendingUnbilledReport;
