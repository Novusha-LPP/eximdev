import React, { useEffect, useState, useCallback } from 'react';
import { useKyc } from './hooks/useKyc';
import dayjs from 'dayjs';
import '../customerKyc/customerKyc.css';

const CATEGORIES = ['All', 'Individual/ Proprietary Firm', 'Partnership Firm', 'Company', 'Trust Foundations'];

export default function CustomerList({ onNavigate }) {
  const { getCustomers, loading } = useKyc();
  const [data,     setData]     = useState([]);
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('All');

  const load = useCallback(() => {
    const params = {};
    if (category !== 'All') params.category = category;
    if (search) params.search = search;
    getCustomers(params).then(setData).catch(() => {});
  }, [getCustomers, category, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ width: "100%", animation: "fadeIn 0.4s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--slate-900)", fontFamily: "var(--font-display)", margin: "0 0 0.5rem 0" }}>Customers</h2>
          <p style={{ color: "var(--slate-500)", margin: 0 }}>{data.length} approved KYC records</p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          
          <div style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            background: "var(--surface-1)",
            border: "1px solid var(--slate-200)",
            borderRadius: "var(--radius-lg)",
            padding: "0.2rem 1rem",
            boxShadow: "var(--shadow-sm)",
          }}>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: "0.875rem", color: "var(--slate-700)", cursor: "pointer", appearance: "none", paddingRight: "1.5rem" }}
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: "0.5rem", pointerEvents: "none", color: "var(--slate-500)" }}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>

          <div style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            background: "var(--surface-1)",
            border: "1px solid var(--slate-200)",
            borderRadius: "var(--radius-lg)",
            padding: "0.4rem 1rem",
            boxShadow: "var(--shadow-sm)",
            width: "280px"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--slate-400)", marginRight: "8px" }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "0.875rem", color: "var(--slate-700)" }}
              placeholder="Search IEC, Name, PAN..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
            />
          </div>
          <button 
            onClick={load}
            style={{ background: "var(--slate-800)", color: "white", padding: "0.4rem 1.25rem", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", transition: "background 0.2s" }}
            onMouseOver={e=>e.currentTarget.style.background="var(--slate-900)"}
            onMouseOut={e=>e.currentTarget.style.background="var(--slate-800)"}
          >
            Search
          </button>
        </div>
      </div>

      <div style={{ background: "var(--surface-1)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-md)", border: "1px solid rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem", fontFamily: "var(--font-body)" }}>
            <thead>
              <tr style={{ background: "var(--slate-50)", borderBottom: "1px solid var(--slate-200)" }}>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>#</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>Company / Individual</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>IEC No.</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>PAN</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>Category</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>Approval</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>Approved By</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>Credit Limit</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} style={{ textAlign:'center', padding:"3rem 1.5rem", color:'var(--slate-400)' }}>Loading...</td></tr>}
              {!loading && data.length === 0 && <tr><td colSpan={10} style={{ textAlign:'center', padding:"3rem 1.5rem", color:'var(--slate-400)' }}>No approved customers found.</td></tr>}
              {data.map((r, i) => (
                <tr key={r._id} style={{ borderBottom: "1px solid var(--slate-100)", transition: "background 0.2s ease" }} onMouseOver={e => e.currentTarget.style.background = "var(--slate-50)"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "1rem 1.5rem", color:"var(--slate-400)", fontWeight: 500 }}>{i+1}</td>
                  <td style={{ padding: "1rem 1.5rem", fontWeight:600 }}>
                    <button onClick={() => onNavigate('completeCustomer', r)} style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', color: 'var(--blue)', fontWeight: 600, fontSize: '0.875rem' }} onMouseOver={e=>e.currentTarget.style.textDecoration="underline"} onMouseOut={e=>e.currentTarget.style.textDecoration="none"}>
                      {r.name_of_individual}
                    </button>
                  </td>
                  <td style={{ padding: "1rem 1.5rem", fontFamily:'monospace', color: "var(--slate-600)" }}>
                    <span style={{ padding: "4px 8px", background: "var(--slate-100)", border: "1px solid var(--slate-200)", borderRadius: "var(--radius-md)", fontSize: "0.75rem" }}>{r.iec_no}</span>
                  </td>
                  <td style={{ padding: "1rem 1.5rem", fontFamily:'monospace', color: "var(--slate-600)" }}>{r.pan_no || '—'}</td>
                  <td style={{ padding: "1rem 1.5rem", color:'var(--slate-600)' }}>{r.category}</td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <span style={{ padding: "4px 8px", background: r.approval === 'Approved by HOD' ? "var(--primary-100)" : "var(--success-light)", color: r.approval === 'Approved by HOD' ? "var(--primary-700)" : "var(--success)", border: `1px solid ${r.approval === 'Approved by HOD' ? 'var(--primary-300)' : 'var(--success)'}`, borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 600 }}>
                      {r.approval}
                    </span>
                  </td>
                  <td style={{ padding: "1rem 1.5rem", color:'var(--slate-600)' }}>{r.approved_by || '—'}</td>
                  <td style={{ padding: "1rem 1.5rem", fontWeight:600, color: "var(--slate-800)" }}>
                    {r.outstanding_limit ? `INR ${Number(r.outstanding_limit).toLocaleString()}` : '—'}
                  </td>
                  <td style={{ padding: "1rem 1.5rem", color:'var(--slate-400)' }}>{dayjs(r.updatedAt).format('DD MMM YY')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
