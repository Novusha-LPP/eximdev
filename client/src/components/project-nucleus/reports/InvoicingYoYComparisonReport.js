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

const InvoicingYoYComparisonReport = () => {
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
                const res = await axios.get(`${api}/project-nucleus/invoicing/last-year-comparison`, {
                    params: { periodType, selectedMonth: month, selectedYear: year }, withCredentials: true });
                if (res.data?.success) setData(res.data);
            } catch(e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, [periodType, month, year]);

    const s = data?.summary || {};
    const rows = data?.rows || [];
    const period = data?.period || {};
    const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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
                    <h2><span>📈</span> Year-over-Year Growth Intelligence</h2>
                    <p>Financial benchmarking comparing current performance against the exact historical period with YoY growth delta.</p>
                </div>
                <div className="invoicing-header-actions">
                    <span className="read-only-badge read-only-badge-live">🔒 Read-Only · Historical Feed</span>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="invoicing-filter-bar">
                <div className="period-pill-group">
                    {[{id:'month',l:'Month',i:'🗓️'},{id:'quarter',l:'Quarter',i:'📊'},{id:'year',l:'FY',i:'🏛️'}].map(p =>
                        <button key={p.id} className={`period-pill-btn ${periodType===p.id?'active':''}`} onClick={() => setPeriodType(p.id)}>
                            <span>{p.i}</span> {p.l}
                        </button>
                    )}
                </div>
                {periodType === 'month' && (
                    <div style={{ display:'flex', gap:'0.5rem' }}>
                        <select className="clean-select" value={month} onChange={e => setMonth(+e.target.value)}>
                            {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                        <select className="clean-select" value={year} onChange={e => setYear(+e.target.value)}>
                            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* KPI Cards */}
            <div className="invoicing-kpi-grid">
                {[
                    { label:'Current Period Net', value:fmt(s.current_group_total), sub:fmtS(s.current_group_total),
                      extra:period.current_period, icon:'💰', iconColor:'#4f46e5' },
                    { label:'Last Year Same Period', value:fmt(s.last_year_group_total), sub:fmtS(s.last_year_group_total),
                      extra:period.last_year_period, icon:'📅', iconColor:'#64748b' },
                    { label:'YoY Net Growth', value:`${s.group_yoy_growth_pct>=0?'+':''}${s.group_yoy_growth_pct||0}%`,
                      sub:'Net Variance', badge:{ pct:s.group_yoy_growth_pct, text:`${s.group_yoy_diff>=0?'+':''}${fmtS(s.group_yoy_diff)}` },
                      icon:'📈', iconColor: s.group_yoy_diff>=0 ? '#059669' : '#e11d48',
                      valColor: s.group_yoy_diff>=0 ? '#059669' : '#e11d48' },
                ].map((card,idx) => (
                    <div key={idx} className={`invoicing-kpi-card inv-stagger-${idx+1}`}>
                        <div className="kpi-card-header">
                            <span className="kpi-card-label">{card.label}</span>
                            <div className="kpi-card-icon-wrap" style={{ color:card.iconColor }}>{card.icon}</div>
                        </div>
                        <div className="kpi-card-value" style={card.valColor ? { color:card.valColor } : {}}>{card.value}</div>
                        <div className="kpi-card-subtext">
                            <span style={{ fontWeight:700, color:card.iconColor }}>{card.sub}</span>
                            {card.badge ? <span className={card.badge.pct>=0?'kpi-badge-positive':'kpi-badge-negative'}>{card.badge.text}</span>
                             : card.extra ? <span style={{ color:'var(--inv-text-muted)', fontSize:'0.75rem' }}>{card.extra}</span> : null}
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart Card */}
            <div className="invoicing-chart-card inv-stagger-3" style={{ marginBottom:'1.75rem' }}>
                <div className="chart-card-header">
                    <h3>🏢 Company-wise YoY Comparison</h3>
                    <span style={{ fontSize:'0.78rem', color:'var(--inv-text-muted)', fontWeight:600 }}>Current vs Previous Year</span>
                </div>
                <div className="clean-chart-canvas">
                    <div style={{ width:'100%', height:320 }}>
                        <ResponsiveContainer>
                            <BarChart data={rows} margin={{ top:10, right:15, left:5, bottom:10 }} barGap={6}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                <XAxis dataKey="display_name" tick={{ fontSize:11, fill:'#64748b', fontWeight:600 }}
                                    axisLine={{ stroke:'#cbd5e1' }} tickLine={false} interval={0}/>
                                <YAxis tickFormatter={v => `₹${(v/1e5).toFixed(0)}L`}
                                    tick={{ fontSize:11, fill:'#64748b', fontWeight:600 }} axisLine={false} tickLine={false}/>
                                <Tooltip content={<CleanTooltip/>}/>
                                <Legend wrapperStyle={{ fontSize:'12px', fontWeight:600, paddingTop:'10px' }}/>
                                <Bar dataKey="current_year_sales" name="Current Period" fill="#4f46e5" radius={[6,6,0,0]} maxBarSize={38}/>
                                <Bar dataKey="last_year_sales" name="Last Year" fill="#cbd5e1" radius={[6,6,0,0]} maxBarSize={38}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detail Table */}
            <div className="invoicing-table-card inv-stagger-4">
                <div className="invoicing-table-header">
                    <h3><span>📋</span> YoY Change Matrix</h3>
                </div>
                <div className="invoicing-table-responsive">
                    <table className="invoicing-data-table">
                        <thead><tr>
                            <th style={{ width:35, textAlign:'center' }}>#</th>
                            <th>Company Unit</th>
                            <th>Category</th>
                            <th style={{ textAlign:'right' }}>Current Period (₹)</th>
                            <th style={{ textAlign:'right' }}>Last Year Same Period (₹)</th>
                            <th style={{ textAlign:'right' }}>Growth Delta (₹)</th>
                            <th style={{ textAlign:'center' }}>Growth %</th>
                        </tr></thead>
                        <tbody>
                            {rows.map((r,i) => (
                                <tr key={r.company_key}>
                                    <td style={{ textAlign:'center', fontWeight:600, color:'#94a3b8' }}>{i+1}</td>
                                    <td><strong style={{ fontSize:'0.88rem', color:'#0f172a' }}>{r.display_name}</strong></td>
                                    <td><span className="severity-pill" style={{ color:'#475569', background:'#f1f5f9', border:'1px solid #e2e8f0' }}>{r.group_category}</span></td>
                                    <td style={{ textAlign:'right' }}>
                                        <strong style={{ fontSize:'0.88rem' }}>{fmt(r.current_year_sales)}</strong>
                                        <div style={{ fontSize:'0.72rem', color:'#64748b', fontWeight:500 }}>{fmtS(r.current_year_sales)}</div>
                                    </td>
                                    <td style={{ textAlign:'right', fontWeight:500 }}>{fmt(r.last_year_sales)}</td>
                                    <td style={{ textAlign:'right' }}>
                                        <strong style={{ color:r.yoy_diff>=0?'#059669':'#e11d48', fontSize:'0.88rem' }}>
                                            {r.yoy_diff>=0?'+':''}{fmt(r.yoy_diff)}
                                        </strong>
                                    </td>
                                    <td style={{ textAlign:'center' }}>
                                        <span className={r.yoy_growth_pct>=0?'kpi-badge-positive':'kpi-badge-negative'}>
                                            {r.yoy_growth_pct>=0?'+':''}{r.yoy_growth_pct}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            <tr className="total-row">
                                <td colSpan="3"><strong>GROUP TOTAL</strong></td>
                                <td style={{ textAlign:'right' }}><strong>{fmt(s.current_group_total)}</strong></td>
                                <td style={{ textAlign:'right' }}><strong>{fmt(s.last_year_group_total)}</strong></td>
                                <td style={{ textAlign:'right' }}>
                                    <strong style={{ color:s.group_yoy_diff>=0?'#059669':'#e11d48' }}>
                                        {s.group_yoy_diff>=0?'+':''}{fmt(s.group_yoy_diff)}
                                    </strong>
                                </td>
                                <td style={{ textAlign:'center' }}>
                                    <span className={s.group_yoy_growth_pct>=0?'kpi-badge-positive':'kpi-badge-negative'}>
                                        {s.group_yoy_growth_pct>=0?'+':''}{s.group_yoy_growth_pct}%
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InvoicingYoYComparisonReport;
