import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './InvoicingStyles.css';

const fmt = v => !v && v !== 0 ? '₹0' : '₹' + Number(v).toLocaleString('en-IN');

const InvoicingDailyGridReport = () => {
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Manual Edit Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editDate, setEditDate] = useState('');
    const [editCompanyKey, setEditCompanyKey] = useState('');
    const [editCompanyName, setEditCompanyName] = useState('');
    const [editSalesAmount, setEditSalesAmount] = useState(0);
    const [editCreditNotes, setEditCreditNotes] = useState(0);
    const [editReason, setEditReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [zeroAlert, setZeroAlert] = useState(false);

    const api = (process.env.REACT_APP_API_STRING || 'http://localhost:9006').replace(/\/api$/, '') + '/api';

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${api}/project-nucleus/invoicing/daily-grid`, {
                params: { month, year }, withCredentials: true });
            if (res.data?.success) setData(res.data);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
    }, [month, year]);

    const companies = data?.companies || [];
    const rows = data?.rows || [];
    const totals = data?.column_totals || {};
    const grand = data?.grand_total || 0;

    const filtered = rows.filter(r => r.date.includes(search) || r.day_name.toLowerCase().includes(search.toLowerCase()));

    const handleOpenEdit = (date, companyKey, companyName, currentVal) => {
        setEditDate(date);
        setEditCompanyKey(companyKey);
        setEditCompanyName(companyName);
        setEditSalesAmount(currentVal?.sales_amount || currentVal?.net_amount || 0);
        setEditCreditNotes(currentVal?.credit_notes || 0);
        setEditReason('');
        setZeroAlert(false);
        setEditModalOpen(true);
    };

    const handleSaveManualEdit = async (e) => {
        e.preventDefault();
        const salesNum = Number(editSalesAmount || 0);
        if (salesNum === 0 && !zeroAlert) {
            setZeroAlert(true);
            return;
        }

        setSaving(true);
        try {
            await axios.post(`${api}/project-nucleus/invoicing/daily-entry/edit`, {
                date: editDate,
                company_key: editCompanyKey,
                sales_amount: salesNum,
                credit_notes_amount: Number(editCreditNotes || 0),
                reason: editReason || 'Authorized manual adjustment'
            }, { withCredentials: true });

            setEditModalOpen(false);
            fetchData();
        } catch (err) {
            alert('Failed to save manual edit: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const exportCSV = () => {
        if (!rows.length) return;
        const h = ['Day','Date','Day Name','Status',...companies.map(c => c.display_name),'Daily Total (₹)'];
        const csv = [h.join(','), ...rows.map(r => {
            const vals = companies.map(c => r.company_values[c.company_key]?.net_amount || 0);
            return [r.day, r.date, r.day_name, r.is_off_day?`OFF (${r.off_day_reason})`:'WORKING', ...vals, r.daily_total].join(',');
        })].join('\n');
        const blob = new Blob([csv], { type:'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `Invoicing_Grid_${month+1}_${year}.csv`; a.click();
    };

    const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    if (loading && !data) {
        return (
            <div className="invoicing-container">
                <div className="inv-skeleton inv-skeleton-block" style={{ height:90, marginBottom:'1.75rem' }}/>
                <div className="inv-skeleton inv-skeleton-block" style={{ height:400 }}/>
            </div>
        );
    }

    return (
        <div className="invoicing-container">
            {/* Header */}
            <div className="invoicing-header-banner">
                <div className="invoicing-title-area">
                    <h2><span>📅</span> Daily Invoice Entry & Sales Matrix</h2>
                    <p>Automated date-wise and company-wise Tally sales ledger with authorized manual edit overrides and audit logging.</p>
                </div>
                <div className="invoicing-header-actions">
                    <span className="read-only-badge read-only-badge-live">🔒 Tally Live Sync</span>
                    <button className="invoicing-btn-secondary" onClick={exportCSV}>📥 Export CSV</button>
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
                <input className="clean-input" type="text" placeholder="Filter by date or day..." value={search} onChange={e => setSearch(e.target.value)}
                    style={{ width:220 }}/>
            </div>

            {/* Table Card */}
            <div className="invoicing-table-card inv-stagger-2">
                <div className="invoicing-table-header">
                    <h3><span>📊</span> {data?.meta?.month_name} {year} — Daily Invoiced Register</h3>
                    <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
                        <span className="off-day-badge">☀️/🏖️ OFF = Non-Working</span>
                        <div style={{
                            background:'var(--inv-primary-light)',
                            border:'1px solid var(--inv-primary-border)',
                            padding:'0.4rem 0.9rem',
                            borderRadius:8, fontWeight:800, color:'var(--inv-primary)', fontSize:'0.86rem',
                            fontFamily:'var(--inv-font-sans)'
                        }}>Grand Total: {fmt(grand)}</div>
                    </div>
                </div>

                <div className="invoicing-table-responsive" style={{ maxHeight:680, overflowY:'auto' }}>
                    <table className="invoicing-data-table">
                        <thead>
                            <tr>
                                <th style={{ width:40, textAlign:'center' }}>Day</th>
                                <th style={{ width:100 }}>Date</th>
                                <th style={{ width:95 }}>Day Name</th>
                                <th style={{ width:140 }}>Working Status</th>
                                {companies.map(c => <th key={c.company_key} style={{ textAlign:'right' }}>{c.display_name}</th>)}
                                <th style={{ textAlign:'right', background:'#f8fafc', color:'#4f46e5' }}>Daily Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(row => (
                                <tr key={row.date} className={row.is_off_day ? 'off-day-row' : ''}>
                                    <td style={{ textAlign:'center', fontWeight:600, color:'#94a3b8' }}>{row.day}</td>
                                    <td style={{ fontFamily:'var(--inv-font-mono)', fontSize:'0.82rem', fontWeight:600 }}>{row.date}</td>
                                    <td style={{ color:'var(--inv-text-secondary)', fontWeight:500 }}>{row.day_name}</td>
                                    <td>
                                        {row.is_off_day
                                            ? <span className="off-day-badge">{row.off_day_reason==='Sunday'?'☀️':'🏖️'} OFF ({row.off_day_reason||'Holiday'})</span>
                                            : <span style={{ color:'var(--inv-success)', fontWeight:700, fontSize:'0.78rem' }}>● Working</span>}
                                    </td>
                                    {companies.map(c => {
                                        const v = row.company_values[c.company_key] || {};
                                        const netVal = v.net_amount || 0;
                                        return (
                                            <td key={c.company_key}
                                                style={{ textAlign:'right', cursor:'pointer' }}
                                                title="Click to view details or edit (Authorized Users)"
                                                onClick={() => handleOpenEdit(row.date, c.company_key, c.display_name, v)}>
                                                {netVal > 0 ? (
                                                    <div>
                                                        <strong style={{ fontSize:'0.85rem', color: v.source === 'MANUAL' ? '#d97706' : '#0f172a' }}>
                                                            {fmt(netVal)}
                                                        </strong>
                                                        {v.source === 'MANUAL' && (
                                                            <span style={{ fontSize:'0.65rem', display:'block', color:'#d97706', fontWeight:700 }}>[MANUAL]</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ color:'#cbd5e1' }}>–</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td style={{ textAlign:'right', fontWeight:800, color:'#0f172a', background:'#f8fafc' }}>{fmt(row.daily_total)}</td>
                                </tr>
                            ))}
                            <tr className="total-row">
                                <td colSpan="4"><strong>MONTHLY TOTALS</strong></td>
                                {companies.map(c => <td key={c.company_key} style={{ textAlign:'right' }}><strong>{fmt(totals[c.company_key])}</strong></td>)}
                                <td style={{ textAlign:'right', color:'#4f46e5' }}><strong>{fmt(grand)}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manual Edit Modal */}
            {editModalOpen && (
                <div className="invoicing-modal-overlay" onClick={() => setEditModalOpen(false)}>
                    <div className="invoicing-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="invoicing-modal-header">
                            <h3>✏️ Manual Entry Adjustment</h3>
                            <button onClick={() => setEditModalOpen(false)} style={{ background:'transparent', border:'none', fontSize:'1.4rem', cursor:'pointer', color:'var(--inv-text-muted)' }}>×</button>
                        </div>
                        <form onSubmit={handleSaveManualEdit}>
                            <div className="invoicing-modal-body">
                                <div style={{ marginBottom:'1rem', padding:'0.75rem', background:'var(--inv-bg-subtle)', borderRadius:8 }}>
                                    <div style={{ fontSize:'0.8rem', color:'var(--inv-text-muted)' }}>Date: <strong style={{ color:'var(--inv-text-primary)' }}>{editDate}</strong></div>
                                    <div style={{ fontSize:'0.8rem', color:'var(--inv-text-muted)', marginTop:'0.2rem' }}>Unit: <strong style={{ color:'var(--inv-primary)' }}>{editCompanyName} ({editCompanyKey})</strong></div>
                                </div>

                                <div style={{ marginBottom:'1rem' }}>
                                    <label style={{ fontSize:'0.74rem', fontWeight:700, color:'var(--inv-text-muted)', textTransform:'uppercase', display:'block', marginBottom:'0.3rem' }}>
                                        Gross Sales Amount (₹)
                                    </label>
                                    <input className="clean-input" type="number" value={editSalesAmount} onChange={e => { setEditSalesAmount(e.target.value); setZeroAlert(false); }} style={{ width:'100%', fontSize:'1rem', fontWeight:700, boxSizing:'border-box' }} required />
                                </div>

                                <div style={{ marginBottom:'1rem' }}>
                                    <label style={{ fontSize:'0.74rem', fontWeight:700, color:'var(--inv-text-muted)', textTransform:'uppercase', display:'block', marginBottom:'0.3rem' }}>
                                        Credit Notes Amount (₹)
                                    </label>
                                    <input className="clean-input" type="number" value={editCreditNotes} onChange={e => setEditCreditNotes(e.target.value)} style={{ width:'100%', fontSize:'1rem', fontWeight:700, boxSizing:'border-box' }} />
                                </div>

                                <div style={{ marginBottom:'1rem' }}>
                                    <label style={{ fontSize:'0.74rem', fontWeight:700, color:'var(--inv-text-muted)', textTransform:'uppercase', display:'block', marginBottom:'0.3rem' }}>
                                        Reason for Manual Edit / Audit Note
                                    </label>
                                    <input className="clean-input" type="text" placeholder="e.g. Offline cash ledger adjustment, Tally correction" value={editReason} onChange={e => setEditReason(e.target.value)} style={{ width:'100%', boxSizing:'border-box' }} required />
                                </div>

                                {zeroAlert && (
                                    <div style={{ padding:'0.65rem', background:'var(--inv-warning-light)', border:'1px solid var(--inv-warning-border)', borderRadius:8, fontSize:'0.78rem', color:'var(--inv-warning-text)', marginBottom:'1rem' }}>
                                        ⚠️ <strong>Zero Entry Alert:</strong> You entered ₹0. Click Save again to confirm zero billing for this day.
                                    </div>
                                )}
                            </div>
                            <div className="invoicing-modal-footer">
                                <button type="button" className="invoicing-btn-secondary" onClick={() => setEditModalOpen(false)}>Cancel</button>
                                <button type="submit" className="invoicing-btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : '💾 Save Override & Audit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoicingDailyGridReport;
