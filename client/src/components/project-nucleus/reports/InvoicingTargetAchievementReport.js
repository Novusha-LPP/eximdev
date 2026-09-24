import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import './InvoicingStyles.css';

const fmt = v => !v && v !== 0 ? '₹0' : '₹' + Number(v).toLocaleString('en-IN');
const fmtS = v => { if (!v) return '₹0'; const n = Math.abs(Number(v)); return n >= 1e7 ? '₹'+(Number(v)/1e7).toFixed(2)+' Cr' : n >= 1e5 ? '₹'+(Number(v)/1e5).toFixed(2)+' L' : fmt(v); };

const CleanTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="clean-tooltip">
            <div className="tooltip-title">{label}</div>
            {payload.map((e,i) => (
                <div key={i} className="tooltip-row">
                    <span style={{ color:e.color, fontWeight:600, display:'flex', alignItems:'center', gap:'4px' }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:e.color }}/>
                        {e.name}
                    </span>
                    <strong>{fmt(e.value)}</strong>
                </div>
            ))}
        </div>
    );
};

const InvoicingTargetAchievementReport = () => {
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const api = (process.env.REACT_APP_API_STRING || 'http://localhost:9006').replace(/\/api$/, '') + '/api';

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${api}/project-nucleus/invoicing/target-achievement`, {
                params: { month, year }, withCredentials: true });
            if (res.data?.success) setData(res.data);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
    }, [month, year]);

    const s = data?.summary || {};
    const rows = data?.rows || [];
    const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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
                    <h2><span>🎯</span> Target vs Achievement Matrix</h2>
                    <p>Monthly financial targets benchmarked against actual invoicing velocity with variance and projected close-out.</p>
                </div>
                <div className="invoicing-header-actions">
                    <span className="read-only-badge read-only-badge-live">🔒 Read-Only · Tally Live</span>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="invoicing-filter-bar">
                <div style={{ display:'flex', gap:'0.6rem', alignItems:'center' }}>
                    <span style={{ fontSize:'0.85rem', fontWeight:700, color:'#334155' }}>Period:</span>
                    <select className="clean-select" value={month} onChange={e => setMonth(+e.target.value)}>
                        {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select className="clean-select" value={year} onChange={e => setYear(+e.target.value)}>
                        {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="invoicing-kpi-grid">
                {[
                    { label:'Total Group Target', value:fmt(s.total_target), sub:fmtS(s.total_target), icon:'🎯', iconColor:'#4f46e5' },
                    { label:'MTD Achievement', value:fmt(s.total_achievement), sub:fmtS(s.total_achievement),
                      badge:{ pct:s.overall_pct||0, text:`${s.overall_pct||0}% Achieved` }, icon:'💰', iconColor:'#059669', valColor:'#059669' },
                    { label:'Gap / Surplus', value:fmt(s.total_gap),
                      sub: s.total_gap >= 0 ? 'Surplus' : 'Deficit',
                      icon: s.total_gap >= 0 ? '📈' : '📉',
                      iconColor: s.total_gap >= 0 ? '#059669' : '#e11d48',
                      valColor: s.total_gap >= 0 ? '#059669' : '#e11d48' },
                    { label:'Projected Close-out', value:fmt(s.total_projected), sub:fmtS(s.total_projected), extra:'Factoring current run rate',
                      icon:'📊', iconColor:'#7c3aed' },
                ].map((c,i) => (
                    <div key={i} className={`invoicing-kpi-card inv-stagger-${i+1}`}>
                        <div className="kpi-card-header">
                            <span className="kpi-card-label">{c.label}</span>
                            <div className="kpi-card-icon-wrap" style={{ color:c.iconColor }}>{c.icon}</div>
                        </div>
                        <div className="kpi-card-value" style={c.valColor ? { color:c.valColor } : {}}>{c.value}</div>
                        <div className="kpi-card-subtext">
                            <span style={{ fontWeight:700, color:c.iconColor }}>{c.sub}</span>
                            {c.badge ? <span className={c.badge.pct>=80?'kpi-badge-positive':'kpi-badge-negative'}>{c.badge.text}</span>
                             : c.extra ? <span style={{ color:'var(--inv-text-muted)', fontSize:'0.75rem' }}>{c.extra}</span> : null}
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart Card */}
            <div className="invoicing-chart-card inv-stagger-4" style={{ marginBottom:'1.75rem' }}>
                <div className="chart-card-header">
                    <h3>🏢 Target vs Achievement by Company</h3>
                    <span style={{ fontSize:'0.78rem', color:'var(--inv-text-muted)', fontWeight:600 }}>Performance Benchmark</span>
                </div>
                <div className="clean-chart-canvas">
                    <div style={{ width:'100%', height:320 }}>
                        <ResponsiveContainer>
                            <BarChart data={rows} margin={{ top:10,right:15,left:5,bottom:10 }} barGap={6}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                <XAxis dataKey="display_name" tick={{ fontSize:11, fill:'#64748b', fontWeight:600 }}
                                    axisLine={{ stroke:'#cbd5e1' }} tickLine={false} interval={0}/>
                                <YAxis tickFormatter={v => `₹${(v/1e5).toFixed(0)}L`}
                                    tick={{ fontSize:11, fill:'#64748b', fontWeight:600 }} axisLine={false} tickLine={false}/>
                                <Tooltip content={<CleanTooltip/>}/>
                                <Legend wrapperStyle={{ fontSize:'12px', fontWeight:600, paddingTop:'10px' }}/>
                                <Bar dataKey="monthly_target" name="Monthly Target" fill="#c7d2fe" radius={[6,6,0,0]} maxBarSize={38}/>
                                <Bar dataKey="mtd_achievement" name="Achieved MTD" fill="#4f46e5" radius={[6,6,0,0]} maxBarSize={38}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="invoicing-table-card inv-stagger-5">
                <div className="invoicing-table-header">
                    <h3><span>📋</span> Detailed Target Matrix</h3>
                </div>
                <div className="invoicing-table-responsive">
                    <table className="invoicing-data-table">
                        <thead><tr>
                            <th style={{ width:35, textAlign:'center' }}>#</th>
                            <th>Company Unit</th>
                            <th style={{ textAlign:'right' }}>Monthly Target (₹)</th>
                            <th style={{ textAlign:'right' }}>Achievement (₹)</th>
                            <th style={{ textAlign:'right' }}>Variance / Gap (₹)</th>
                            <th style={{ textAlign:'right' }}>Projected (₹)</th>
                            <th style={{ textAlign:'center' }}>Achievement %</th>
                            <th style={{ minWidth:120 }}>Progress Visual</th>
                        </tr></thead>
                        <tbody>
                            {rows.map((r,i) => (
                                <tr key={r.company_key}>
                                    <td style={{ textAlign:'center', fontWeight:600, color:'#94a3b8' }}>{i+1}</td>
                                    <td><strong style={{ fontSize:'0.88rem', color:'#0f172a' }}>{r.display_name}</strong></td>
                                    <td style={{ textAlign:'right', fontWeight:500 }}>{fmt(r.monthly_target)}</td>
                                    <td style={{ textAlign:'right' }}><strong style={{ color:'#059669', fontSize:'0.88rem' }}>{fmt(r.mtd_achievement)}</strong></td>
                                    <td style={{ textAlign:'right' }}>
                                        <strong style={{ color:r.gap>=0?'#059669':'#e11d48', fontSize:'0.88rem' }}>
                                            {r.gap>=0?'+':''}{fmt(r.gap)}
                                        </strong>
                                    </td>
                                    <td style={{ textAlign:'right', fontWeight:500 }}>{fmt(r.projected_close)}</td>
                                    <td style={{ textAlign:'center' }}>
                                        <span className={r.achievement_pct>=80?'kpi-badge-positive':'kpi-badge-negative'}>
                                            {r.achievement_pct}%
                                        </span>
                                    </td>
                                    <td>
                                        <div className="clean-progress-bar">
                                            <div className="clean-progress-fill" style={{
                                                width:`${Math.min(100,r.achievement_pct)}%`,
                                                background: r.achievement_pct>=80 ? 'var(--inv-success)' : 'var(--inv-warning)'
                                            }}/>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            <tr className="total-row">
                                <td colSpan="2"><strong>GROUP TOTAL</strong></td>
                                <td style={{ textAlign:'right' }}><strong>{fmt(s.total_target)}</strong></td>
                                <td style={{ textAlign:'right' }}><strong>{fmt(s.total_achievement)}</strong></td>
                                <td style={{ textAlign:'right' }}>
                                    <strong style={{ color:s.total_gap>=0?'#059669':'#e11d48' }}>{s.total_gap>=0?'+':''}{fmt(s.total_gap)}</strong>
                                </td>
                                <td style={{ textAlign:'right' }}><strong>{fmt(s.total_projected)}</strong></td>
                                <td style={{ textAlign:'center' }}><strong>{s.overall_pct||0}%</strong></td>
                                <td/>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InvoicingTargetAchievementReport;
