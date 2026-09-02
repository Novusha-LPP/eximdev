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

const InvoicingCreditNoteReport = () => {
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const api = (process.env.REACT_APP_API_STRING || 'http://localhost:9006').replace(/\/api$/, '') + '/api';

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${api}/project-nucleus/invoicing/credit-note-summary`, {
                    params: { month, year }, withCredentials: true });
                if (res.data?.success) setData(res.data);
            } catch(e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, [month, year]);

    const s = data?.summary || {};
    const companies = data?.company_breakdown || [];
    const top = data?.top_credit_notes || [];
    const filtered = top.filter(c => [c.credit_note_no, c.customer_name, c.company_name].some(f => (f||'').toLowerCase().includes(search.toLowerCase())));
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
                    <h2><span>🔴</span> Credit Note Impact & Reversal Analysis</h2>
                    <p>Analyze revenue deduction velocity, sales-to-credit-note ratios, and high-impact credit adjustments.</p>
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
                <input className="clean-input" type="text" placeholder="Search CN or customer..." value={search} onChange={e => setSearch(e.target.value)}
                    style={{ width:220 }}/>
            </div>

            {/* KPI Cards */}
            <div className="invoicing-kpi-grid">
                {[
                    { label:'Total Credit Notes', value:fmt(s.total_credit_notes), sub:fmtS(s.total_credit_notes),
                      extra:`${s.credit_note_count||0} Total CNs`, icon:'🔴', iconColor:'#e11d48' },
                    { label:'Gross Sales Invoiced', value:fmt(s.gross_sales_period), sub:fmtS(s.gross_sales_period),
                      extra:'Before credit deductions', icon:'💰', iconColor:'#4f46e5' },
                    { label:'Net Revenue After CN', value:fmt(s.net_after_cn), sub:fmtS(s.net_after_cn),
                      badge:{ pct: s.cn_to_sales_ratio_pct<=10 ? 95 : 30, text:`CN Ratio: ${s.cn_to_sales_ratio_pct||0}%` },
                      icon:'✅', iconColor:'#059669', valColor:'#059669' },
                ].map((c,i) => (
                    <div key={i} className={`invoicing-kpi-card inv-stagger-${i+1}`}>
                        <div className="kpi-card-header">
                            <span className="kpi-card-label">{c.label}</span>
                            <div className="kpi-card-icon-wrap" style={{ color:c.iconColor }}>{c.icon}</div>
                        </div>
                        <div className="kpi-card-value" style={c.valColor ? { color:c.valColor } : {}}>{c.value}</div>
                        <div className="kpi-card-subtext">
                            <span style={{ fontWeight:700, color:c.iconColor }}>{c.sub}</span>
                            {c.badge ? <span className={c.badge.pct>=50?'kpi-badge-positive':'kpi-badge-negative'}>{c.badge.text}</span>
                             : c.extra ? <span style={{ color:'var(--inv-text-muted)', fontSize:'0.75rem' }}>{c.extra}</span> : null}
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart Card */}
            <div className="invoicing-chart-card inv-stagger-3" style={{ marginBottom:'1.75rem' }}>
                <div className="chart-card-header">
                    <h3>🏢 Gross Sales vs Credit Notes by Company</h3>
                    <span style={{ fontSize:'0.78rem', color:'var(--inv-text-muted)', fontWeight:600 }}>Revenue Reversal Impact</span>
                </div>
                <div className="clean-chart-canvas">
                    <div style={{ width:'100%', height:320 }}>
                        <ResponsiveContainer>
                            <BarChart data={companies} margin={{ top:10,right:15,left:5,bottom:10 }} barGap={6}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                <XAxis dataKey="display_name" tick={{ fontSize:11, fill:'#64748b', fontWeight:600 }}
                                    axisLine={{ stroke:'#cbd5e1' }} tickLine={false} interval={0}/>
                                <YAxis tickFormatter={v => `₹${(v/1e5).toFixed(0)}L`}
                                    tick={{ fontSize:11, fill:'#64748b', fontWeight:600 }} axisLine={false} tickLine={false}/>
                                <Tooltip content={<CleanTooltip/>}/>
                                <Legend wrapperStyle={{ fontSize:'12px', fontWeight:600, paddingTop:'10px' }}/>
                                <Bar dataKey="gross_sales" name="Gross Sales" fill="#4f46e5" radius={[6,6,0,0]} maxBarSize={38}/>
                                <Bar dataKey="credit_notes" name="Credit Notes" fill="#e11d48" radius={[6,6,0,0]} maxBarSize={38}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="invoicing-table-card inv-stagger-4">
                <div className="invoicing-table-header">
                    <h3><span>📋</span> Top Credit Note Records</h3>
                </div>
                <div className="invoicing-table-responsive">
                    <table className="invoicing-data-table">
                        <thead><tr>
                            <th style={{ width:35, textAlign:'center' }}>#</th>
                            <th>CN Number</th>
                            <th>Date</th>
                            <th>Company Unit</th>
                            <th>Customer Name</th>
                            <th style={{ textAlign:'right' }}>Amount (₹)</th>
                            <th style={{ width:90 }}>Impact Tier</th>
                            <th>Reason / Remarks</th>
                        </tr></thead>
                        <tbody>
                            {filtered.map((cn,i) => (
                                <tr key={cn._id||i}>
                                    <td style={{ textAlign:'center', fontWeight:600, color:'#94a3b8' }}>{i+1}</td>
                                    <td><strong style={{ color:'var(--inv-danger)', fontFamily:'var(--inv-font-mono)', fontSize:'0.82rem' }}>{cn.credit_note_no}</strong></td>
                                    <td style={{ fontFamily:'var(--inv-font-mono)', fontSize:'0.82rem', color:'var(--inv-text-muted)' }}>{cn.date}</td>
                                    <td><span className="severity-pill" style={{ color:'#475569', background:'#f1f5f9', border:'1px solid #e2e8f0' }}>{cn.company_name}</span></td>
                                    <td><strong>{cn.customer_name}</strong></td>
                                    <td style={{ textAlign:'right' }}><strong style={{ color:'var(--inv-danger)', fontSize:'0.88rem' }}>-{fmt(cn.amount)}</strong></td>
                                    <td>
                                        <span className={`severity-pill ${cn.amount > 100000 ? 'severity-critical' : cn.amount > 50000 ? 'severity-high' : 'severity-low'}`}>
                                            {cn.amount > 100000 ? 'High' : cn.amount > 50000 ? 'Medium' : 'Low'}
                                        </span>
                                    </td>
                                    <td><span style={{ fontSize:'0.78rem', color:'var(--inv-text-muted)' }}>{cn.reason||'Standard Adjustment'}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InvoicingCreditNoteReport;
