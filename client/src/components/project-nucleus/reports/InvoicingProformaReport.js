import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './InvoicingStyles.css';

const fmt = v => !v && v !== 0 ? '₹0' : '₹' + Number(v).toLocaleString('en-IN');
const fmtS = v => { if (!v) return '₹0'; const n = Math.abs(Number(v)); return n >= 1e7 ? '₹'+(Number(v)/1e7).toFixed(2)+' Cr' : n >= 1e5 ? '₹'+(Number(v)/1e5).toFixed(2)+' L' : fmt(v); };

const InvoicingProformaReport = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [search, setSearch] = useState('');

    const api = (process.env.REACT_APP_API_STRING || 'http://localhost:9006').replace(/\/api$/, '') + '/api';

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${api}/project-nucleus/invoicing/proforma-monitoring`, { withCredentials: true });
                if (res.data?.success) setData(res.data);
            } catch(e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, []);

    const s = data?.summary || {};
    const proformas = data?.proformas || [];
    const ageing = s.ageing || {};

    const filtered = proformas.filter(p => {
        const ms = statusFilter === 'ALL' || p.conversion_status === statusFilter;
        const mq = [p.proforma_no, p.customer_name, p.company_name].some(f => (f||'').toLowerCase().includes(search.toLowerCase()));
        return ms && mq;
    });

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
                    <h2><span>📄</span> Proforma Invoice Monitoring</h2>
                    <p>Track open proforma invoices across units, conversion velocity into final tax invoices, and ageing analysis.</p>
                </div>
                <div className="invoicing-header-actions">
                    <span className="read-only-badge">🔒 Read-Only Registry</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="invoicing-kpi-grid">
                {[
                    { label:'Total Proforma Value', value:fmt(s.total_value), sub:fmtS(s.total_value),
                      extra:`${s.total_count||0} Proformas`, icon:'📑', iconColor:'#4f46e5' },
                    { label:'Pending Conversion', value:fmt(s.pending_value), sub:fmtS(s.pending_value),
                      extra:`${s.pending_count||0} Pending`, icon:'⏳', iconColor:'#d97706' },
                    { label:'Converted to Final', value:fmt(s.converted_value), sub:fmtS(s.converted_value),
                      badge:{ pct:s.conversion_rate_pct||0, text:`${s.conversion_rate_pct||0}% Rate` },
                      icon:'✅', iconColor:'#059669', valColor:'#059669' },
                    { label:'Overdue >30 Days', value:ageing.over_30_days_exception||0,
                      sub:'High Priority', extra:'Flagged in Exceptions',
                      icon:'⚠️', iconColor: (ageing.over_30_days_exception||0) > 0 ? '#e11d48' : '#64748b',
                      valColor: (ageing.over_30_days_exception||0) > 0 ? '#e11d48' : undefined },
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

            {/* Table */}
            <div className="invoicing-table-card inv-stagger-4">
                <div className="invoicing-table-header">
                    <h3><span>📋</span> Proforma Register</h3>
                    <div style={{ display:'flex', gap:'0.6rem', alignItems:'center' }}>
                        <div className="period-pill-group">
                            {['ALL','PENDING','CONVERTED'].map(st =>
                                <button key={st} className={`period-pill-btn ${statusFilter===st?'active':''}`} onClick={() => setStatusFilter(st)}>{st}</button>
                            )}
                        </div>
                        <input className="clean-input" type="text" placeholder="Search proforma or client..." value={search} onChange={e => setSearch(e.target.value)}
                            style={{ width:220 }}/>
                    </div>
                </div>
                <div className="invoicing-table-responsive">
                    <table className="invoicing-data-table">
                        <thead><tr>
                            <th style={{ width:35, textAlign:'center' }}>#</th>
                            <th>Proforma No.</th>
                            <th>Date</th>
                            <th>Company</th>
                            <th>Customer Name</th>
                            <th style={{ textAlign:'right' }}>Amount (₹)</th>
                            <th style={{ textAlign:'center' }}>Ageing</th>
                            <th>Status</th>
                            <th>Final Tax Invoice</th>
                            <th>Remarks</th>
                        </tr></thead>
                        <tbody>
                            {filtered.map((p,i) => (
                                <tr key={p._id||i}>
                                    <td style={{ textAlign:'center', fontWeight:600, color:'#94a3b8' }}>{i+1}</td>
                                    <td><strong style={{ color:'var(--inv-primary)', fontFamily:'var(--inv-font-mono)', fontSize:'0.82rem' }}>{p.proforma_no}</strong></td>
                                    <td style={{ color:'var(--inv-text-muted)', fontSize:'0.82rem' }}>{p.proforma_date}</td>
                                    <td><span className="severity-pill" style={{ color:'#475569', background:'#f1f5f9', border:'1px solid #e2e8f0' }}>{p.company_name}</span></td>
                                    <td><strong>{p.customer_name}</strong></td>
                                    <td style={{ textAlign:'right' }}><strong style={{ fontSize:'0.88rem' }}>{fmt(p.amount)}</strong></td>
                                    <td style={{ textAlign:'center' }}>
                                        <span className={`severity-pill ${p.ageing_days>30?'severity-critical':p.ageing_days>15?'severity-high':'severity-low'}`}>
                                            {p.ageing_days} Days
                                        </span>
                                    </td>
                                    <td><span className={`status-pill ${p.conversion_status==='CONVERTED'?'status-converted':'status-pending'}`}>
                                        {p.conversion_status==='CONVERTED' ? '✅ Converted' : '⏳ Pending'}
                                    </span></td>
                                    <td>{p.final_invoice_no
                                        ? <><strong style={{ color:'var(--inv-success)' }}>{p.final_invoice_no}</strong><span style={{ fontSize:'0.72rem', color:'var(--inv-text-muted)', marginLeft:'4px' }}>({p.final_invoice_date})</span></>
                                        : <span style={{ color:'var(--inv-text-disabled)' }}>–</span>}
                                    </td>
                                    <td><span style={{ fontSize:'0.78rem', color:'var(--inv-text-muted)' }}>{p.remarks||'–'}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InvoicingProformaReport;
