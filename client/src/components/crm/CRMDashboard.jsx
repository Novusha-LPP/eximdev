import React, { useEffect, useState } from 'react';
import { useKyc } from './hooks/useKyc';
import '../customerKyc/customerKyc.css';

const STAGE_COLORS = {
  Suspects:  { text: 'var(--slate-500)',  bg: 'var(--slate-100)',  border: 'var(--slate-300)' },
  Prospects: { text: 'var(--warning)',    bg: 'var(--warning-light)',     border: 'var(--warning)' },
  Customers: { text: 'var(--success)',    bg: 'var(--success-light)',     border: 'var(--success)' },
  Stagnant:  { text: 'var(--error)',      bg: 'var(--error-light)',       border: 'var(--error)' },
};

export default function CRMDashboard() {
  const { getStats, loading } = useKyc();
  const [stats, setStats] = useState({ suspects: 0, prospects: 0, customers: 0, stagnant: 0 });

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  const cards = [
    { title: 'Suspects',  sub: 'Draft applications',   value: stats.suspects,  key: 'Suspects'  },
    { title: 'Prospects', sub: 'Pending approval',      value: stats.prospects, key: 'Prospects' },
    { title: 'Customers', sub: 'Approved KYCs',         value: stats.customers, key: 'Customers' },
    { title: 'Stagnant',  sub: 'Pending > 30 days',    value: stats.stagnant,  key: 'Stagnant'  },
  ];

  if (loading) return <div style={{ padding: "2rem", color: "var(--slate-500)" }}>Loading Dashboard...</div>;

  return (
    <div style={{ width: "100%", animation: "fadeIn 0.4s ease-out" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--slate-900)", fontFamily: "var(--font-display)", margin: "0 0 0.5rem 0" }}>CRM Overview</h2>
        <p style={{ color: "var(--slate-500)", margin: 0 }}>Pipeline health at a glance</p>
      </div>

      {stats.stagnant > 0 && (
        <div style={{
          background: "var(--error-light)",
          border: "1px solid var(--error)",
          color: "var(--error)",
          padding: "1rem 1.5rem",
          borderRadius: "var(--radius-lg)",
          marginBottom: "2rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          boxShadow: "var(--shadow-sm)"
        }}>
          <span style={{ fontWeight: 800, fontSize: "1.2rem" }}>!</span>
          <span style={{ fontWeight: 600 }}>{stats.stagnant} prospect(s) have been pending for more than 30 days.</span>
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "1.5rem",
        marginBottom: "2rem"
      }}>
        {cards.map(c => {
          const col = STAGE_COLORS[c.key];
          return (
            <div
              key={c.key}
              className="premium-card"
              style={{
                background: "var(--surface-1)",
                borderRadius: "var(--radius-xl)",
                padding: "1.5rem",
                boxShadow: "var(--shadow-md)",
                border: "1px solid rgba(0,0,0,0.05)",
                borderTop: `4px solid ${col.border}`,
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem"
              }}
            >
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--slate-600)", fontFamily: "var(--font-display)" }}>{c.title}</div>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, color: col.text, fontFamily: "var(--font-display)", lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: "0.875rem", color: "var(--slate-400)" }}>{c.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Bar chart */}
      <div style={{
          background: "var(--surface-1)",
          borderRadius: "var(--radius-xl)",
          padding: "2rem",
          boxShadow: "var(--shadow-md)",
          border: "1px solid rgba(0,0,0,0.05)",
      }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--slate-800)", fontFamily: "var(--font-display)", marginBottom: "1.5rem" }}>Stage Breakdown</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {cards.filter(c => c.key !== 'Stagnant').map((c, i) => {
            const col = STAGE_COLORS[c.key];
            const maxV = Math.max(stats.suspects, stats.prospects, stats.customers, 1);
            const w    = Math.max(4, Math.round(c.value / maxV * 100));
            return (
              <div key={c.key}>
                <div style={{ display:'flex', alignItems:'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--slate-400)" }}>0{i+1}</span>
                    <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--slate-700)", fontFamily: "var(--font-display)" }}>{c.title}</span>
                  </div>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: col.text }}>{c.value} <span style={{ fontSize: "0.75rem", color: "var(--slate-400)", fontWeight: 500 }}>records</span></span>
                </div>
                <div style={{ height: "12px", background: "var(--slate-100)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${w}%`, background: col.text, borderRadius: "var(--radius-xl)", transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
