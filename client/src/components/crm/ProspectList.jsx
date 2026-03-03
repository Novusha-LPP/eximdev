import React, { useEffect, useState, useCallback, useContext } from 'react';
import { useKyc } from './hooks/useKyc';
import { UserContext } from '../../contexts/UserContext';
import dayjs from 'dayjs';
import '../customerKyc/customerKyc.css';

const FILTERS = ['All', 'Pending', 'Sent for revision'];

export default function ProspectList({ onNavigate }) {
  const { user } = useContext(UserContext);
  const { getProspects, approveProspect, revisionProspect, escalateProspect, hodApproveProspect, loading } = useKyc();
  const [data,   setData]   = useState([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState(null);
  const [remark,   setRemark]   = useState('');
  const isHod = user?.role === 'HOD';

  const load = useCallback(() => {
    const p = filter === 'All' ? undefined : filter;
    getProspects(p).then(setData).catch(() => {});
  }, [getProspects, filter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (record) => {
    try {
      if (isHod) await hodApproveProspect(record._id, user.username);
      else       await approveProspect(record._id, user.username);
      load();
    } catch(_) {}
  };

  const handleRemark = async () => {
    if (!remark.trim()) return;
    const [action, id] = actionId.split('_');
    try {
      if (action === 'revision')  await revisionProspect(id, remark);
      else if (action === 'escalate') await escalateProspect(id, remark);
      setActionId(null); setRemark(''); load();
    } catch(_) {}
  };

  const filtered = data.filter(r => {
    const t = search.toLowerCase();
    return !t || (r.name_of_individual||'').toLowerCase().includes(t) || (r.iec_no||'').toLowerCase().includes(t);
  });

  const days = (d) => Math.floor((Date.now() - new Date(d)) / 86400000);

  return (
    <div style={{ width: "100%", animation: "fadeIn 0.4s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--slate-900)", fontFamily: "var(--font-display)", margin: "0 0 0.5rem 0" }}>Prospects</h2>
          <p style={{ color: "var(--slate-500)", margin: 0 }}>{filtered.length} pending records</p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          
          <div style={{ display: "flex", background: "var(--slate-100)", borderRadius: "var(--radius-lg)", padding: "4px" }}>
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? "var(--surface-1)" : "transparent",
                  color: filter === f ? "var(--primary-700)" : "var(--slate-500)",
                  border: "none",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "var(--radius-md)",
                  fontWeight: filter === f ? 600 : 500,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  boxShadow: filter === f ? "var(--shadow-sm)" : "none",
                  transition: "all 0.2s ease"
                }}
              >
                {f}
              </button>
            ))}
          </div>

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
        </div>
      </div>

      {actionId && (
        <div style={{ background: "var(--surface-1)", borderRadius: "var(--radius-lg)", padding: "1.5rem", border: "1px solid var(--primary-200)", marginBottom: "1.5rem", boxShadow: "var(--shadow-md)" }}>
          <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--slate-800)" }}>
            {actionId.startsWith('revision') ? 'Reason for Revision' : 'Escalation Remarks'} (required)
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <textarea
              rows={2}
              style={{ flex: 1, fontSize: "0.875rem", padding: "0.75rem", border: "1px solid var(--slate-300)", borderRadius: "var(--radius-md)", outline: "none", resize: "vertical", fontFamily: "var(--font-body)" }}
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder="Enter comprehensive notes..."
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                onClick={handleRemark}
                style={{ background: "var(--primary-600)", color: "#fff", border: "none", padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              >
                Submit
              </button>
              <button 
                onClick={() => { setActionId(null); setRemark(''); }}
                style={{ background: "transparent", border: "1px solid var(--slate-300)", color: "var(--slate-600)", padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "var(--surface-1)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-md)", border: "1px solid rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem", fontFamily: "var(--font-body)" }}>
            <thead>
              <tr style={{ background: "var(--slate-50)", borderBottom: "1px solid var(--slate-200)" }}>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>#</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>Company / Individual</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>IEC No.</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>Approval</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>Days Pending</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>Submitted</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>Remarks</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--slate-500)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} style={{ textAlign:'center', padding:"3rem 1.5rem", color:'var(--slate-400)' }}>Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign:'center', padding:"3rem 1.5rem", color:'var(--slate-400)' }}>No prospects found.</td></tr>}
              {filtered.map((r, i) => {
                const d = days(r.updatedAt || r.createdAt);
                const isRevision = r.approval === 'Sent for revision';
                
                return (
                  <tr key={r._id} style={{ borderBottom: "1px solid var(--slate-100)", transition: "background 0.2s ease" }} onMouseOver={e => e.currentTarget.style.background = isRevision ? "var(--error-light)" : "var(--slate-50)"} onMouseOut={e => e.currentTarget.style.background = isRevision ? "var(--error-light)" : "transparent"}>
                    <td style={{ padding: "1rem 1.5rem", color:"var(--slate-400)", fontWeight: 500 }}>{i+1}</td>
                    <td style={{ padding: "1rem 1.5rem", fontWeight:600 }}>
                      <button onClick={() => onNavigate('editProspect', r)} style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', color: 'var(--blue)', fontWeight: 600, fontSize: '0.875rem' }} onMouseOver={e=>e.currentTarget.style.textDecoration="underline"} onMouseOut={e=>e.currentTarget.style.textDecoration="none"}>
                        {r.name_of_individual}
                      </button>
                    </td>
                    <td style={{ padding: "1rem 1.5rem", fontFamily:'monospace', color: "var(--slate-600)" }}>
                      <span style={{ padding: "4px 8px", background: "var(--slate-100)", border: "1px solid var(--slate-200)", borderRadius: "var(--radius-md)", fontSize: "0.75rem" }}>{r.iec_no}</span>
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <span style={{ padding: "4px 8px", background: isRevision ? "var(--error-light)" : "var(--warning-light)", color: isRevision ? "var(--error)" : "var(--warning)", border: `1px solid ${isRevision ? 'var(--error)' : 'var(--warning)'}`, borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 600 }}>{r.approval}</span>
                    </td>
                    <td style={{ padding: "1rem 1.5rem", fontWeight:600, color: d > 30 ? "var(--error)" : d > 14 ? "var(--warning)" : "var(--success)" }}>{d}d</td>
                    <td style={{ padding: "1rem 1.5rem", color:'var(--slate-400)' }}>{dayjs(r.updatedAt).format('DD MMM YYYY')}</td>
                    <td style={{ padding: "1rem 1.5rem", color:"var(--slate-500)", maxWidth: "160px" }}>
                       <span style={{ overflow:'hidden', textOverflow:'ellipsis', display:'block', whiteSpace:'nowrap' }}>{r.remarks || '—'}</span>
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ display:'flex', gap:"0.5rem", flexWrap: "wrap" }}>
                        {!isHod && (
                          <>
                            {isRevision && <button onClick={() => onNavigate('editProspect', r)} style={{ background: "transparent", border: "1px solid var(--info)", padding: "4px 10px", borderRadius: "14px", fontSize: "0.75rem", fontWeight: 600, color: "var(--info)", cursor: "pointer" }}>Edit</button>}
                            <button onClick={() => handleApprove(r)} style={{ background: "transparent", border: "1px solid var(--success)", padding: "4px 10px", borderRadius: "14px", fontSize: "0.75rem", fontWeight: 600, color: "var(--success)", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e=>{e.currentTarget.style.background="var(--success-light)"}} onMouseOut={e=>{e.currentTarget.style.background="transparent"}}>Approve</button>
                            <button onClick={() => { setActionId(`revision_${r._id}`); setRemark(''); }} style={{ background: "transparent", border: "1px solid var(--error)", padding: "4px 10px", borderRadius: "14px", fontSize: "0.75rem", fontWeight: 600, color: "var(--error)", cursor: "pointer" }}>Revise</button>
                            <button onClick={() => { setActionId(`escalate_${r._id}`); setRemark(''); }} style={{ background: "transparent", border: "1px solid var(--slate-400)", padding: "4px 10px", borderRadius: "14px", fontSize: "0.75rem", fontWeight: 600, color: "var(--slate-600)", cursor: "pointer" }}>Escalate</button>
                          </>
                        )}
                        {isHod && (
                          <button onClick={() => handleApprove(r)} style={{ background: "var(--success)", border: "none", padding: "4px 10px", borderRadius: "14px", fontSize: "0.75rem", fontWeight: 600, color: "#fff", cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>HOD Approve</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
