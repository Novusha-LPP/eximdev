import React, { useEffect, useState, useCallback, useContext } from 'react';
import { useKyc } from './hooks/useKyc';
import { UserContext } from '../../contexts/UserContext';
import dayjs from 'dayjs';
import '../customerKyc/customerKyc.css';

export default function SuspectList({ onNavigate }) {
  const { user } = useContext(UserContext);
  const { getSuspects, deleteSuspect, submitSuspect, loading } = useKyc();
  const [data,   setData]   = useState([]);
  const [search, setSearch] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(() => {
    getSuspects().then(setData).catch(() => {});
  }, [getSuspects]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try { await deleteSuspect(id); load(); setConfirmId(null); } catch(_) {}
  };

  const handleSubmit = async (id) => {
    try { await submitSuspect(id); load(); setConfirmId(null); } catch(_) {}
  };

  const filtered = data.filter(r => {
    const t = search.toLowerCase();
    return !t || (r.name_of_individual||'').toLowerCase().includes(t) || (r.iec_no||'').toLowerCase().includes(t);
  });

  return (
    <div style={{ width: "100%", animation: "fadeIn 0.4s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--slate-900)", fontFamily: "var(--font-display)", margin: "0 0 0.5rem 0" }}>Suspects</h2>
          <p style={{ color: "var(--slate-500)", margin: 0 }}>{filtered.length} draft records</p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <div style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            background: "var(--surface-1)",
            border: "1px solid var(--slate-200)",
            borderRadius: "var(--radius-lg)",
            padding: "0.5rem 1rem",
            boxShadow: "var(--shadow-sm)",
            width: "280px"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--slate-400)", marginRight: "8px" }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "0.875rem", color: "var(--slate-700)" }}
              placeholder="Search name or IEC..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => onNavigate('addSuspect', null)}
            style={{
              background: "var(--primary-600)",
              color: "#fff",
              border: "none",
              padding: "0.6rem 1.25rem",
              borderRadius: "var(--radius-md)",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              boxShadow: "var(--shadow-md)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Suspect
          </button>
        </div>
      </div>

      <div style={{
        background: "var(--surface-1)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-md)",
        border: "1px solid rgba(0,0,0,0.05)",
        overflow: "hidden"
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem", fontFamily: "var(--font-body)" }}>
            <thead>
              <tr style={{ background: "var(--slate-50)", borderBottom: "1px solid var(--slate-200)" }}>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>#</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>Company / Individual</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>IEC No.</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>Category</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>Status</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>Created</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={{ textAlign:'center', padding:"3rem 1.5rem", color:'var(--slate-400)' }}>Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign:'center', padding:"3rem 1.5rem", color:'var(--slate-400)' }}>No draft suspects. Click "Add Suspect" to start.</td></tr>}
              {filtered.map((r, i) => (
                <tr key={r._id} style={{ borderBottom: "1px solid var(--slate-100)", transition: "background 0.2s ease" }} onMouseOver={e => e.currentTarget.style.background = "var(--slate-50)"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "1rem 1.5rem", color:"var(--slate-400)", fontWeight: 500 }}>{i+1}</td>
                  <td style={{ padding: "1rem 1.5rem", fontWeight:600 }}>
                    <button onClick={() => onNavigate('addSuspect', r)} style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', color: 'var(--blue)', fontWeight: 600, fontSize: '0.875rem' }} onMouseOver={e=>e.currentTarget.style.textDecoration="underline"} onMouseOut={e=>e.currentTarget.style.textDecoration="none"}>
                      {r.name_of_individual}
                    </button>
                  </td>
                  <td style={{ padding: "1rem 1.5rem", fontFamily:'monospace', color: "var(--slate-600)" }}>
                    <span style={{ padding: "4px 8px", background: "var(--slate-100)", border: "1px solid var(--slate-200)", borderRadius: "var(--radius-md)", fontSize: "0.75rem" }}>{r.iec_no}</span>
                  </td>
                  <td style={{ padding: "1rem 1.5rem", color:'var(--slate-600)' }}>{r.category}</td>
                  <td style={{ padding: "1rem 1.5rem" }}><span style={{ padding: "4px 8px", background: "var(--slate-100)", color: "var(--slate-600)", border: "1px solid var(--slate-200)", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 600 }}>{r.status}</span></td>
                  <td style={{ padding: "1rem 1.5rem", color:'var(--slate-400)' }}>{dayjs(r.createdAt).format('DD MMM YYYY')}</td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <div style={{ display:'flex', gap:"0.5rem" }}>
                      {confirmId === `submit_${r._id}` ? (
                        <>
                          <button onClick={() => handleSubmit(r._id)} style={{ background: "var(--success-light)", border: "1px solid var(--success)", padding: "4px 10px", borderRadius: "14px", fontSize: "0.75rem", fontWeight: 600, color: "var(--success)", cursor: "pointer" }}>Confirm</button>
                          <button onClick={() => setConfirmId(null)} style={{ background: "transparent", border: "1px solid var(--slate-200)", padding: "4px 10px", borderRadius: "14px", fontSize: "0.75rem", fontWeight: 600, color: "var(--slate-500)", cursor: "pointer" }}>Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmId(`submit_${r._id}`)} style={{ background: "transparent", border: "1px solid var(--success-light)", padding: "4px 10px", borderRadius: "14px", fontSize: "0.75rem", fontWeight: 600, color: "var(--success)", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e=>{e.currentTarget.style.background="var(--success-light)"}} onMouseOut={e=>{e.currentTarget.style.background="transparent"}}>Submit</button>
                      )}

                      {confirmId === `del_${r._id}` ? (
                        <>
                          <button onClick={() => handleDelete(r._id)} style={{ background: "var(--error-light)", border: "1px solid var(--error)", padding: "4px 10px", borderRadius: "14px", fontSize: "0.75rem", fontWeight: 600, color: "var(--error)", cursor: "pointer" }}>Delete</button>
                          <button onClick={() => setConfirmId(null)} style={{ background: "transparent", border: "1px solid var(--slate-200)", padding: "4px 10px", borderRadius: "14px", fontSize: "0.75rem", fontWeight: 600, color: "var(--slate-500)", cursor: "pointer" }}>Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmId(`del_${r._id}`)} style={{ background: "transparent", border: "1px solid var(--error-light)", padding: "4px 10px", borderRadius: "14px", fontSize: "0.75rem", fontWeight: 600, color: "var(--error)", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e=>{e.currentTarget.style.background="var(--error-light)"}} onMouseOut={e=>{e.currentTarget.style.background="transparent"}}>Del</button>
                      )}
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
}
