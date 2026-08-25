import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './InvoicingStyles.css';

const fmt = v => !v && v !== 0 ? '₹0' : '₹' + Number(v).toLocaleString('en-IN');
const fmtS = v => { if (!v) return '₹0'; const n = Math.abs(Number(v)); return n >= 1e7 ? '₹'+(Number(v)/1e7).toFixed(2)+' Cr' : n >= 1e5 ? '₹'+(Number(v)/1e5).toFixed(2)+' L' : fmt(v); };

const PALETTE = ['#4f46e5','#0ea5e9','#10b981','#f59e0b','#ec4899','#8b5cf6','#3b82f6','#14b8a6','#e11d48','#a855f7'];

const InvoicingCustomerReport = () => {
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [companyFilter, setCompanyFilter] = useState('ALL');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const api = (process.env.REACT_APP_API_STRING || 'http://localhost:9006').replace(/\/api$/, '') + '/api';

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${api}/project-nucleus/invoicing/customer-report`, {
                    params: { month, year, companyKey: companyFilter !== 'ALL' ? companyFilter : undefined }, withCredentials: true });
                if (res.data?.success) setData(res.data);
            } catch(e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, [month, year, companyFilter]);

    const s = data?.summary || {};
    const customers = data?.customers || [];
    const companies = data?.companies || [];
    const filtered = customers.filter(c => (c.customer_name||'').toLowerCase().includes(search.toLowerCase()));
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
                    <h2><span>👥</span> Customer Invoicing Intelligence</h2>
                    <p>Client-level revenue concentration, customer share analysis, and full customer billing ledgers across units.</p>
                </div>
                <div className="invoicing-header-actions">
                    <span className="read-only-badge read-only-badge-live">🔒 Read-Only · Tally Live</span>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="invoicing-filter-bar">
                <div style={{ display:'flex', gap:'0.6rem', alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'0.85rem', fontWeight:700, color:'#334155' }}>Period:</span>
                    <select className="clean-select" value={month} onChange={e => setMonth(+e.target.value)}>
                        {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select className="clean-select" value={year} onChange={e => setYear(+e.target.value)}>
                        {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span style={{ color:'#cbd5e1', margin:'0 0.2rem' }}>|</span>
                    <select className="clean-select" value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}>
                        <option value="ALL">All Companies</option>
                        {companies.map(c => <option key={c.company_key} value={c.company_key}>{c.display_name}</option>)}
                    </select>
                </div>
                <input className="clean-input" type="text" placeholder="Search customer..." value={search} onChange={e => setSearch(e.target.value)}
                    style={{ width:220 }}/>
            </div>

            {/* KPI Cards */}
            <div className="invoicing-kpi-grid">
                {[
                    { label:'Unique Active Customers', value:s.unique_customers||0, sub:`${s.total_invoices||0} Total Invoices`, icon:'👥', iconColor:'#4f46e5' },
                    { label:'Total Invoiced Value', value:fmt(s.total_billing), sub:fmtS(s.total_billing), icon:'💰', iconColor:'#059669' },
                    { label:'Avg Value per Customer', value:fmt(s.avg_per_customer), sub:fmtS(s.avg_per_customer), icon:'📊', iconColor:'#d97706' },
                    { label:'Top Customer Revenue Share', value:`${s.top_customer_share_pct||0}%`, sub:s.top_customer_name||'N/A',
                      badge:{ pct:s.top_customer_share_pct>30?30:90, text:fmtS(s.top_customer_value) },
                      icon:'🏆', iconColor:'#7c3aed' },
                ].map((c,i) => (
                    <div key={i} className={`invoicing-kpi-card inv-stagger-${i+1}`}>
                        <div className="kpi-card-header">
                            <span className="kpi-card-label">{c.label}</span>
                            <div className="kpi-card-icon-wrap" style={{ color:c.iconColor }}>{c.icon}</div>
                        </div>
                        <div className="kpi-card-value">{c.value}</div>
                        <div className="kpi-card-subtext">
                            <span style={{ fontWeight:700, color:c.iconColor }}>{c.sub}</span>
                            {c.badge ? <span className={c.badge.pct>=50?'kpi-badge-positive':'kpi-badge-negative'}>{c.badge.text}</span> : null}
                        </div>
                    </div>
                ))}
            </div>

            {/* Top 10 Revenue Contributors Cards */}
            {filtered.length > 0 && (
                <div className="invoicing-chart-card inv-stagger-4" style={{ marginBottom:'1.75rem' }}>
                    <div className="chart-card-header">
                        <h3>🏆 Top Revenue Contributors</h3>
                        <span style={{ fontSize:'0.78rem', color:'var(--inv-text-muted)', fontWeight:600 }}>{filtered.length} Total Customers</span>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(270px,1fr))', gap:'1rem' }}>
                        {filtered.slice(0, 10).map((cust, idx) => (
                            <div key={cust._id||idx}
                                className={`invoicing-kpi-card inv-stagger-${Math.min(idx+1,6)}`}
                                style={{ padding:'1.2rem 1.3rem' }}>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.45rem' }}>
                                    <div style={{ maxWidth:'75%' }}>
                                        <div style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--inv-text-muted)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'0.15rem' }}>
                                            #{idx+1} · {cust.company_name}
                                        </div>
                                        <strong style={{ fontSize:'0.92rem', color:'#0f172a', display:'block', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                            {cust.customer_name}
                                        </strong>
                                    </div>
                                    <div className="kpi-card-icon-wrap" style={{ fontSize:'0.85rem', fontWeight:800, color: PALETTE[idx%PALETTE.length] }}>
                                        {(cust.customer_name||'C')[0]}
                                    </div>
                                </div>
                                <div style={{ fontSize:'1.35rem', fontWeight:800, color:'#0f172a', letterSpacing:'-0.025em', marginBottom:'0.35rem' }}>
                                    {fmt(cust.total_billing)}
                                </div>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto' }}>
                                    <span style={{ fontSize:'0.76rem', color:'var(--inv-text-muted)', fontWeight:500 }}>{cust.invoice_count} Invoices</span>
                                    <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                                        <div className="clean-progress-bar" style={{ width:50 }}>
                                            <div className="clean-progress-fill" style={{
                                                width:`${Math.min(100,cust.share_pct||0)}%`,
                                                background: PALETTE[idx%PALETTE.length]
                                            }}/>
                                        </div>
                                        <span style={{ fontSize:'0.74rem', fontWeight:700, color:'#334155' }}>{cust.share_pct||0}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="invoicing-table-card inv-stagger-5">
                <div className="invoicing-table-header">
                    <h3><span>📋</span> Full Customer Ledger</h3>
                </div>
                <div className="invoicing-table-responsive" style={{ maxHeight:520, overflowY:'auto' }}>
                    <table className="invoicing-data-table">
                        <thead><tr>
                            <th style={{ width:35, textAlign:'center' }}>#</th>
                            <th>Customer Name</th>
                            <th>Company Unit</th>
                            <th style={{ textAlign:'right' }}>Total Invoiced (₹)</th>
                            <th style={{ textAlign:'center' }}>Invoices</th>
                            <th style={{ textAlign:'center', width:120 }}>Revenue Share</th>
                        </tr></thead>
                        <tbody>
                            {filtered.map((c,i) => (
                                <tr key={c._id||i}>
                                    <td style={{ textAlign:'center', fontWeight:600, color:'#94a3b8' }}>{i+1}</td>
                                    <td><strong style={{ color:'#0f172a', fontSize:'0.86rem' }}>{c.customer_name}</strong></td>
                                    <td><span className="severity-pill" style={{ color:'#475569', background:'#f1f5f9', border:'1px solid #e2e8f0' }}>{c.company_name}</span></td>
                                    <td style={{ textAlign:'right' }}>
                                        <strong style={{ fontSize:'0.88rem' }}>{fmt(c.total_billing)}</strong>
                                        <div style={{ fontSize:'0.72rem', color:'#64748b', fontWeight:500 }}>{fmtS(c.total_billing)}</div>
                                    </td>
                                    <td style={{ textAlign:'center', fontWeight:600 }}>{c.invoice_count}</td>
                                    <td style={{ textAlign:'center' }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', justifyContent:'center' }}>
                                            <div className="clean-progress-bar" style={{ width:45 }}>
                                                <div className="clean-progress-fill" style={{ width:`${Math.min(100,c.share_pct||0)}%`, background:'var(--inv-primary)' }}/>
                                            </div>
                                            <span style={{ fontSize:'0.74rem', fontWeight:700 }}>{c.share_pct||0}%</span>
                                        </div>
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

export default InvoicingCustomerReport;
