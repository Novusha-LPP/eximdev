import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format } from 'date-fns';
import './InvoicingStyles.css';

const UNITS = [
    { key:'SRCC', name:'SRCC', sector:'Container Logistics', badge:'36d Rule', color:'#4f46e5' },
    { key:'SFPL_GUJ', name:'SFPL Gujarat', sector:'Customs Brokerage', badge:'Core', color:'#0284c7' },
    { key:'SFPL_NON_GUJ', name:'SFPL Non-Gujarat', sector:'Customs Brokerage', badge:'Regional', color:'#2563eb' },
    { key:'NOVUSHA_ALV', name:'Novusha Alvision', sector:'Forwarding', badge:'Tech', color:'#7c3aed' },
    { key:'NOVUSHA_NEXT', name:'Novusha Nextwave', sector:'Software & IoT', badge:'Digital', color:'#db2777' },
    { key:'PARAMOUNT', name:'Paramount', sector:'Manufacturing', badge:'Propack', color:'#d97706' },
    { key:'ALLUVIUM', name:'Alluvium', sector:'IoT Solutions', badge:'IoT', color:'#059669' },
    { key:'RABS', name:'RABS', sector:'Industrial', badge:'Industries', color:'#e11d48' },
];

const fmt = v => !v && v !== 0 ? '₹0' : '₹' + Number(v).toLocaleString('en-IN');
const fmtS = v => { if (!v) return '₹0'; const n = Math.abs(Number(v)); return n >= 1e7 ? '₹'+(Number(v)/1e7).toFixed(2)+' Cr' : n >= 1e5 ? '₹'+(Number(v)/1e5).toFixed(2)+' L' : fmt(v); };

const CleanTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="clean-tooltip">
            <div className="tooltip-title">{label ? format(new Date(label),'EEE, dd MMM yyyy') : ''}</div>
            {payload.map((e,i) => (
                <div key={i} className="tooltip-row">
                    <span style={{ color:e.color, fontWeight:600, display:'flex', alignItems:'center', gap:'4px' }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:e.color }}/>
                        {e.name}
                    </span>
                    <strong style={{ color:'#0f172a' }}>{fmt(e.value)}</strong>
                </div>
            ))}
        </div>
    );
};

const InvoicingCompanyDashboard = () => {
    const [sel, setSel] = useState('SRCC');
    const [periodType, setPeriodType] = useState('month');
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const api = (process.env.REACT_APP_API_STRING || 'http://localhost:9006').replace(/\/api$/, '') + '/api';

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${api}/project-nucleus/invoicing/company-summary`, {
                    params: { companyKey: sel, periodType, selectedMonth: month, selectedYear: year }, withCredentials: true });
                if (res.data?.success) setData(res.data);
            } catch(e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, [sel, periodType, month, year]);

    const s = data?.summary || {};
    const co = data?.company || {};
    const entries = data?.daily_entries || [];
    const active = UNITS.find(u => u.key === sel) || UNITS[0];

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
            {/* Header Banner */}
            <div className="invoicing-header-banner">
                <div className="invoicing-title-area">
                    <h2><span>🏢</span> Company Invoicing Deep-Dive</h2>
                    <p>Unit-level billing velocity and metrics for <strong style={{ color:'#4f46e5' }}>{co.display_name || sel}</strong> with active projection modeling.</p>
                </div>
                <div className="invoicing-header-actions">
                    <span className="read-only-badge read-only-badge-live">🔒 Read-Only · Tally Synced</span>
                </div>
            </div>

            {/* Clean Company Selector Grid */}
            <div className="clean-selector-grid">
                {UNITS.map(u => {
                    const on = sel === u.key;
                    return (
                        <div key={u.key} onClick={() => setSel(u.key)}
                            className={`clean-selector-card ${on ? 'active' : ''}`}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.3rem' }}>
                                <span style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase',
                                    color: on ? '#4f46e5' : '#64748b', letterSpacing:'0.04em' }}>{u.sector}</span>
                                <span style={{
                                    fontSize:'0.65rem', fontWeight:700,
                                    background: on ? '#ffffff' : '#f1f5f9',
                                    color: on ? '#4f46e5' : '#475569',
                                    padding:'0.1rem 0.4rem', borderRadius:4, border: '1px solid ' + (on ? '#c7d2fe' : '#e2e8f0')
                                }}>{u.badge}</span>
                            </div>
                            <strong style={{ fontSize:'0.92rem', color: on ? '#1e1b4b' : '#0f172a', display:'block' }}>{u.name}</strong>
                        </div>
                    );
                })}
            </div>

            {/* KPI Cards */}
            <div className="invoicing-kpi-grid">
                {[
                    { label:'MTD Net Sales', value:fmt(s.net_sales), sub:fmtS(s.net_sales), extra:`${s.invoice_count||0} Invoices`, icon:'💵', iconColor:active.color },
                    { label:'Monthly Target', value:fmt(s.monthly_target), sub:fmtS(s.monthly_target),
                      badge:{ pct:s.target_achievement_pct||0, text:`${s.target_achievement_pct||0}% Achieved` }, icon:'🎯', iconColor:'#0284c7' },
                    { label:'Projected Billing', value:fmt(s.projected_billing), sub:fmtS(s.projected_billing),
                      extra:`Rule: ${s.projection_days||30} Days`, icon:'📈', iconColor:'#059669', valColor:'#059669' },
                    { label:'Daily Avg Velocity', value:fmt(s.average_daily_billing), sub:`Lead: ${co.responsible_person_name||'Ayan'}`,
                      extra:'Sun / 2nd Sat OFF', icon:'⚡', iconColor:'#d97706' },
                ].map((card,idx) => (
                    <div key={idx} className={`invoicing-kpi-card inv-stagger-${idx+1}`}>
                        <div className="kpi-card-header">
                            <span className="kpi-card-label">{card.label}</span>
                            <div className="kpi-card-icon-wrap" style={{ color:card.iconColor }}>{card.icon}</div>
                        </div>
                        <div className="kpi-card-value" style={card.valColor ? { color:card.valColor } : {}}>{card.value}</div>
                        <div className="kpi-card-subtext">
                            <span style={{ fontWeight:700, color:card.iconColor }}>{card.sub}</span>
                            {card.badge ? <span className={card.badge.pct>=80?'kpi-badge-positive':'kpi-badge-negative'}>{card.badge.text}</span>
                             : card.extra ? <span style={{ color:'var(--inv-text-muted)', fontSize:'0.75rem' }}>{card.extra}</span> : null}
                        </div>
                    </div>
                ))}
            </div>

            {/* Daily Trend Chart */}
            <div className="invoicing-chart-card inv-stagger-4" style={{ marginBottom:'1.75rem' }}>
                <div className="chart-card-header">
                    <h3>📊 {co.display_name || sel} — Daily Invoicing Velocity</h3>
                    <span className="read-only-badge">🔒 Tally Live Feed</span>
                </div>
                <div className="clean-chart-canvas">
                    <div style={{ width:'100%', height:300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={entries} margin={{ top:10,right:15,left:5,bottom:0 }}>
                                <defs>
                                    <linearGradient id="cleanCompanyGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={active.color} stopOpacity={0.25}/>
                                        <stop offset="100%" stopColor={active.color} stopOpacity={0.01}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                <XAxis dataKey="date" tickFormatter={d => { try { return format(new Date(d),'dd MMM'); } catch(e) { return d; }}}
                                    tick={{ fontSize:11, fill:'#64748b', fontWeight:600 }} axisLine={{ stroke:'#cbd5e1' }} tickLine={false}/>
                                <YAxis tickFormatter={v => `₹${(v/1e5).toFixed(1)}L`} tick={{ fontSize:11, fill:'#64748b', fontWeight:600 }} axisLine={false} tickLine={false}/>
                                <Tooltip content={<CleanTooltip/>}/>
                                <Legend wrapperStyle={{ fontSize:'12px', fontWeight:600, paddingTop:'10px' }}/>
                                <Area type="monotone" dataKey="net_amount" name="Net Invoiced" stroke={active.color} strokeWidth={2.5}
                                    fill="url(#cleanCompanyGrad)" dot={false} activeDot={{ r:5, fill:active.color, stroke:'#ffffff', strokeWidth:2 }}/>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Daily Entries Table */}
            <div className="invoicing-table-card inv-stagger-5">
                <div className="invoicing-table-header">
                    <h3>📅 Date-wise Financial Ledger</h3>
                    <span style={{ fontSize:'0.82rem', color:'var(--inv-text-muted)', fontWeight:600 }}>Weekends & 2nd Saturdays excluded from velocity</span>
                </div>
                <div className="invoicing-table-responsive" style={{ maxHeight:520, overflowY:'auto' }}>
                    <table className="invoicing-data-table">
                        <thead><tr>
                            <th style={{ width:120 }}>Date</th>
                            <th style={{ width:110 }}>Day</th>
                            <th style={{ width:150 }}>Working Status</th>
                            <th style={{ textAlign:'right' }}>Gross Invoiced (₹)</th>
                            <th style={{ textAlign:'right' }}>Credit Notes (₹)</th>
                            <th style={{ textAlign:'right' }}>Net Amount (₹)</th>
                            <th style={{ textAlign:'center' }}>Invoice Count</th>
                            <th style={{ textAlign:'center' }}>Source</th>
                        </tr></thead>
                        <tbody>
                            {entries.map(r => (
                                <tr key={r._id||r.date} className={r.is_off_day ? 'off-day-row' : ''}>
                                    <td style={{ fontFamily:'var(--inv-font-mono)', fontSize:'0.82rem', fontWeight:600 }}>{r.date}</td>
                                    <td style={{ color:'var(--inv-text-secondary)', fontWeight:500 }}>{format(new Date(r.date),'EEEE')}</td>
                                    <td>{r.is_off_day ?
                                        <span className="off-day-badge">{r.off_day_reason==='Sunday'?'☀️':'🏖️'} OFF ({r.off_day_reason||'Weekend'})</span>
                                        : <span style={{ color:'var(--inv-success)', fontWeight:700, fontSize:'0.78rem' }}>● Working Day</span>}
                                    </td>
                                    <td style={{ textAlign:'right', fontWeight:500 }}>{fmt(r.sales_amount)}</td>
                                    <td style={{ textAlign:'right' }}>
                                        {r.credit_notes_amount > 0
                                            ? <span style={{ color:'var(--inv-danger)', fontWeight:700 }}>-{fmt(r.credit_notes_amount)}</span>
                                            : <span style={{ color:'var(--inv-text-disabled)' }}>₹0</span>}
                                    </td>
                                    <td style={{ textAlign:'right' }}><strong style={{ color:'#0f172a', fontSize:'0.88rem' }}>{fmt(r.net_amount)}</strong></td>
                                    <td style={{ textAlign:'center', fontWeight:600 }}>{r.invoice_count||0}</td>
                                    <td style={{ textAlign:'center' }}>
                                        <span style={{ fontSize:'0.72rem', background:'#eef2ff', color:'#4338ca', padding:'0.15rem 0.45rem', borderRadius:4, fontWeight:700, fontFamily:'var(--inv-font-mono)' }}>
                                            {r.source||'TALLY'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InvoicingCompanyDashboard;
