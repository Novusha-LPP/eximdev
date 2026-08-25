import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { format } from 'date-fns';
import './InvoicingStyles.css';

const PALETTE = ['#4f46e5','#0ea5e9','#10b981','#f59e0b','#ec4899','#8b5cf6','#3b82f6','#14b8a6'];

const COMPANY_BADGES = {
    SRCC:          { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' },
    SFPL_GUJ:      { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
    SFPL_NON_GUJ:  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    NOVUSHA_ALV:   { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
    NOVUSHA_NEXT:  { bg: '#fdf2f8', text: '#be185d', border: '#fbcfe8' },
    PARAMOUNT:     { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    ALLUVIUM:      { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    RABS:          { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
};

const fmt = v => {
    if (!v && v !== 0) return '₹0';
    return '₹' + Number(v).toLocaleString('en-IN');
};
const fmtShort = v => {
    if (!v) return '₹0';
    const n = Math.abs(Number(v));
    if (n >= 1e7) return '₹' + (Number(v)/1e7).toFixed(2) + ' Cr';
    if (n >= 1e5) return '₹' + (Number(v)/1e5).toFixed(2) + ' L';
    return '₹' + Number(v).toLocaleString('en-IN');
};

const CleanTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="clean-tooltip">
            <div className="tooltip-title">{label ? format(new Date(label), 'EEE, dd MMM yyyy') : ''}</div>
            {payload.map((e, i) => (
                <div key={i} className="tooltip-row">
                    <span style={{ color: e.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color }} />
                        {e.name}
                    </span>
                    <strong style={{ fontFamily: 'var(--inv-font-sans)', color: '#0f172a' }}>{fmt(e.value)}</strong>
                </div>
            ))}
        </div>
    );
};

const InvoicingGroupDashboard = () => {
    const [periodType, setPeriodType] = useState('month');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth()+1)/3));
    const [dateRange] = useState({ start: '', end: '' });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const api = (process.env.REACT_APP_API_STRING || 'http://localhost:9006').replace(/\/api$/, '') + '/api';

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${api}/project-nucleus/invoicing/group-summary`, {
                params: { periodType, selectedMonth, selectedYear, selectedQuarter,
                    customStartDate: dateRange.start || undefined, customEndDate: dateRange.end || undefined },
                withCredentials: true
            });
            if (res.data?.success) setData(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [periodType, selectedMonth, selectedYear, selectedQuarter]);

    const s = data?.summary || {};
    const companies = data?.company_breakdown || [];
    const trend = data?.daily_trend || [];

    const filtered = useMemo(() =>
        companies.filter(c =>
            [c.display_name, c.group_category, c.responsible_person]
                .some(f => (f||'').toLowerCase().includes(search.toLowerCase()))
        ), [companies, search]);

    const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    if (loading && !data) {
        return (
            <div className="invoicing-container">
                <div className="inv-skeleton inv-skeleton-block" style={{ height: '90px', marginBottom: '1.75rem' }} />
                <div className="invoicing-kpi-grid">
                    {[1,2,3,4,5].map(i => <div key={i} className="inv-skeleton inv-skeleton-block" style={{ height: '130px' }} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="invoicing-container">
            {/* === HEADER BANNER === */}
            <div className="invoicing-header-banner">
                <div className="invoicing-title-area">
                    <h2><span>🏛️</span> Executive Group Invoicing</h2>
                    <p>Consolidated multi-unit billing intelligence with dynamic projection modeling and real-time Tally feed integration.</p>
                </div>
                <div className="invoicing-header-actions">
                    <span className="read-only-badge read-only-badge-live">🔒 Read-Only · Tally Synced</span>
                    <div className="sync-status-pill">
                        <span className="sync-dot" />
                        <span>{s.sync_status || 'LIVE'}</span>
                    </div>
                </div>
            </div>

            {/* === FILTER BAR === */}
            <div className="invoicing-filter-bar">
                <div className="period-pill-group">
                    {[{id:'today',l:'Today',i:'⚡'},{id:'yesterday',l:'Yesterday',i:'⏪'},{id:'this_week',l:'This Week',i:'📅'},{id:'month',l:'Month',i:'🗓️'},{id:'quarter',l:'Quarter',i:'📊'},{id:'half_year',l:'H1/H2',i:'📈'},{id:'year',l:'FY',i:'🏛️'}].map(p => (
                        <button key={p.id} className={`period-pill-btn ${periodType===p.id?'active':''}`} onClick={() => setPeriodType(p.id)}>
                            <span>{p.i}</span> {p.l}
                        </button>
                    ))}
                </div>
                {periodType === 'month' && (
                    <div style={{ display:'flex', gap:'0.5rem' }}>
                        <select className="clean-select" value={selectedMonth} onChange={e => setSelectedMonth(+e.target.value)}>
                            {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                        <select className="clean-select" value={selectedYear} onChange={e => setSelectedYear(+e.target.value)}>
                            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* === KPI METRIC CARDS === */}
            <div className="invoicing-kpi-grid">
                {[
                    { label:'Group Net Billing', value: fmt(s.group_mtd_sales), sub: fmtShort(s.group_mtd_sales),
                      extra: `${s.group_invoice_count||0} Invoices`, icon:'💰', iconColor:'#4f46e5' },
                    { label:'Monthly Target', value: fmt(s.group_target), sub: fmtShort(s.group_target),
                      badge: { pct: s.group_achievement_pct||0, text: `${s.group_achievement_pct||0}% Achieved` },
                      icon:'🎯', iconColor:'#0284c7' },
                    { label:'Projected Billing', value: fmt(s.group_projected), sub: fmtShort(s.group_projected),
                      extra: 'SRCC 36d Rule', icon:'📈', iconColor:'#059669', valColor:'#059669' },
                    { label:'Daily Avg Velocity', value: fmt(s.group_daily_average), sub: `${s.working_days||0} Working Days`,
                      extra: 'Sun / 2nd Sat OFF', icon:'⚡', iconColor:'#d97706' },
                    { label:'YoY Performance', value: `${s.yoy_growth_pct>=0?'+':''}${s.yoy_growth_pct||0}%`,
                      sub: 'vs Last Year', badge: { pct: s.yoy_growth_pct, text: `${s.yoy_diff>=0?'+':''}${fmtShort(s.yoy_diff)}` },
                      icon:'📊', iconColor:'#7c3aed' },
                ].map((card, idx) => (
                    <div key={idx} className={`invoicing-kpi-card inv-stagger-${idx+1}`}>
                        <div className="kpi-card-header">
                            <span className="kpi-card-label">{card.label}</span>
                            <div className="kpi-card-icon-wrap" style={{ color: card.iconColor }}>{card.icon}</div>
                        </div>
                        <div className="kpi-card-value" style={card.valColor ? { color: card.valColor } : {}}>
                            {card.value}
                        </div>
                        <div className="kpi-card-subtext">
                            <span style={{ fontWeight: 700, color: card.iconColor }}>{card.sub}</span>
                            {card.badge ? (
                                <span className={card.badge.pct >= 80 ? 'kpi-badge-positive' : 'kpi-badge-negative'}>
                                    {card.badge.text}
                                </span>
                            ) : card.extra ? (
                                <span style={{ color: 'var(--inv-text-muted)', fontSize: '0.75rem' }}>{card.extra}</span>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>

            {/* === CHARTS GRID === */}
            <div className="invoicing-charts-grid inv-stagger-4">
                {/* Daily Trend Area Chart */}
                <div className="invoicing-chart-card">
                    <div className="chart-card-header">
                        <h3>📅 Daily Invoicing Velocity</h3>
                        <span style={{ fontSize:'0.78rem', color:'var(--inv-text-muted)', fontWeight:600 }}>Gross vs Net Invoiced</span>
                    </div>
                    <div className="clean-chart-canvas">
                        <div style={{ width:'100%', height:310 }}>
                            <ResponsiveContainer>
                                <AreaChart data={trend} margin={{ top:10, right:15, left:5, bottom:0 }}>
                                    <defs>
                                        <linearGradient id="cleanNetGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.25}/>
                                            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.01}/>
                                        </linearGradient>
                                        <linearGradient id="cleanGrossGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.15}/>
                                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.01}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                    <XAxis dataKey="date" tickFormatter={d => { try { return format(new Date(d),'dd MMM'); } catch(e) { return d; }}}
                                        tick={{ fontSize:11, fill:'#64748b', fontWeight:600 }} axisLine={{ stroke:'#cbd5e1' }} tickLine={false}/>
                                    <YAxis tickFormatter={v => `₹${(v/1e5).toFixed(1)}L`}
                                        tick={{ fontSize:11, fill:'#64748b', fontWeight:600 }} axisLine={false} tickLine={false}/>
                                    <Tooltip content={<CleanTooltip/>}/>
                                    <Legend wrapperStyle={{ fontSize:'12px', fontWeight:600, paddingTop:'10px' }}/>
                                    <Area type="monotone" dataKey="net_amount" name="Net Billing" stroke="#4f46e5" strokeWidth={2.5}
                                        fill="url(#cleanNetGrad)" dot={false} activeDot={{ r:5, fill:'#4f46e5', stroke:'#ffffff', strokeWidth:2 }}/>
                                    <Area type="monotone" dataKey="sales_amount" name="Gross Sales" stroke="#0ea5e9" strokeWidth={1.5}
                                        fill="url(#cleanGrossGrad)" strokeDasharray="4 4" dot={false}/>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Contribution Donut Chart */}
                <div className="invoicing-chart-card">
                    <div className="chart-card-header">
                        <h3>🍰 Revenue Contribution</h3>
                        <span style={{ fontSize:'0.78rem', color:'var(--inv-text-muted)', fontWeight:600 }}>By Business Unit</span>
                    </div>
                    <div className="clean-chart-canvas">
                        <div style={{ width:'100%', height:310 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={companies} dataKey="net_sales" nameKey="display_name"
                                        cx="50%" cy="48%" innerRadius={62} outerRadius={98} paddingAngle={3}
                                        cornerRadius={4}>
                                        {companies.map((_, i) => <Cell key={i} fill={PALETTE[i%PALETTE.length]} stroke="#ffffff" strokeWidth={2}/>)}
                                    </Pie>
                                    <Tooltip formatter={v => fmt(v)}/>
                                    <Legend wrapperStyle={{ fontSize:'11px', fontWeight:600, paddingTop:'8px' }}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* === LEADERBOARD TABLE === */}
            <div className="invoicing-table-card inv-stagger-5">
                <div className="invoicing-table-header">
                    <h3>🏢 Unit Performance Leaderboard</h3>
                    <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
                        <input className="clean-input" type="text" placeholder="Search company or owner..." value={search} onChange={e => setSearch(e.target.value)}
                            style={{ width:'230px' }}/>
                        <span className="read-only-badge">🔒 Tally Live</span>
                    </div>
                </div>
                <div className="invoicing-table-responsive">
                    <table className="invoicing-data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 35, textAlign: 'center' }}>#</th>
                                <th>Company Unit</th>
                                <th>Category</th>
                                <th style={{ textAlign:'right' }}>MTD Net Sales</th>
                                <th style={{ textAlign:'right' }}>Target</th>
                                <th style={{ textAlign:'right' }}>Projected</th>
                                <th style={{ textAlign:'center' }}>Rule</th>
                                <th style={{ textAlign:'right' }}>Daily Avg</th>
                                <th style={{ minWidth: 120 }}>Achievement</th>
                                <th style={{ minWidth: 90 }}>Share</th>
                                <th>Owner</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((c, i) => {
                                const b = COMPANY_BADGES[c.company_key] || { bg:'#f8fafc', text:'#334155', border:'#e2e8f0' };
                                return (
                                    <tr key={c.company_key}>
                                        <td style={{ textAlign:'center', fontWeight:600, color:'#94a3b8' }}>{i+1}</td>
                                        <td>
                                            <div style={{ display:'flex', alignItems:'center', gap:'0.65rem' }}>
                                                <span style={{
                                                    padding:'0.2rem 0.5rem', borderRadius:6, fontSize:'0.72rem',
                                                    fontWeight:800, background:b.bg, color:b.text, border:`1px solid ${b.border}`,
                                                    fontFamily:'var(--inv-font-mono)'
                                                }}>
                                                    {c.company_key}
                                                </span>
                                                <strong style={{ fontSize:'0.86rem', color:'#0f172a' }}>{c.display_name}</strong>
                                            </div>
                                        </td>
                                        <td><span className="severity-pill" style={{ color:'#475569', background:'#f1f5f9', border:'1px solid #e2e8f0' }}>{c.group_category}</span></td>
                                        <td style={{ textAlign:'right' }}>
                                            <strong style={{ fontSize:'0.88rem' }}>{fmt(c.net_sales)}</strong>
                                            <div style={{ fontSize:'0.72rem', color:'#64748b', fontWeight:500 }}>{fmtShort(c.net_sales)}</div>
                                        </td>
                                        <td style={{ textAlign:'right', fontWeight:500 }}>{fmt(c.monthly_target)}</td>
                                        <td style={{ textAlign:'right' }}>
                                            <strong style={{ color:'#059669', fontSize:'0.88rem' }}>{fmt(c.projected_billing)}</strong>
                                        </td>
                                        <td style={{ textAlign:'center' }}><span className="projection-days-badge">{c.projection_days}d</span></td>
                                        <td style={{ textAlign:'right', fontWeight:500 }}>{fmt(c.average_daily_billing)}</td>
                                        <td>
                                            <div style={{ minWidth:110 }}>
                                                <span className={c.target_achievement_pct>=80?'kpi-badge-positive':'kpi-badge-negative'} style={{ marginBottom:'0.25rem', display:'inline-flex' }}>
                                                    {c.target_achievement_pct}%
                                                </span>
                                                <div className="clean-progress-bar">
                                                    <div className="clean-progress-fill" style={{
                                                        width: `${Math.min(100, c.target_achievement_pct)}%`,
                                                        background: c.target_achievement_pct>=80 ? 'var(--inv-success)' : 'var(--inv-warning)'
                                                    }}/>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                                                <div className="clean-progress-bar" style={{ width:40 }}>
                                                    <div className="clean-progress-fill" style={{ width:`${Math.min(100,c.contribution_share_pct)}%`, background:PALETTE[i%PALETTE.length] }}/>
                                                </div>
                                                <span style={{ fontSize:'0.74rem', fontWeight:700 }}>{c.contribution_share_pct}%</span>
                                            </div>
                                        </td>
                                        <td><span style={{ fontWeight:700, color:'#334155', fontSize:'0.82rem' }}>{c.responsible_person}</span></td>
                                    </tr>
                                );
                            })}
                            <tr className="total-row">
                                <td colSpan="3"><strong>GROUP TOTAL</strong></td>
                                <td style={{ textAlign:'right' }}><strong>{fmt(s.group_mtd_sales)}</strong></td>
                                <td style={{ textAlign:'right' }}><strong>{fmt(s.group_target)}</strong></td>
                                <td style={{ textAlign:'right' }}><strong style={{ color:'#059669' }}>{fmt(s.group_projected)}</strong></td>
                                <td style={{ textAlign:'center' }}>–</td>
                                <td style={{ textAlign:'right' }}><strong>{fmt(s.group_daily_average)}</strong></td>
                                <td><strong>{s.group_achievement_pct||0}%</strong></td>
                                <td><strong>100%</strong></td>
                                <td>–</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InvoicingGroupDashboard;
