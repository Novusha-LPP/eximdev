import React, { useState, useEffect } from 'react';
import axios from 'axios';

const getHeaders = () => {
  const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
  return {
    headers: {
      'Content-Type': 'application/json',
      'user-id': user._id || user.id || '',
      'username': user.username || '',
      'user-role': user.role || '',
    },
    withCredentials: true
  };
};

export default function CRMDashboard() {
  const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
  const role = user.role || '';
  const crmRole = user.crmRole || '';
  const isHOD = role === 'HOD' || role === 'Head_of_Department' || (typeof role === 'string' && (role.toLowerCase() === 'hod' || role.toLowerCase() === 'head_of_department'));
  const isCrmAdmin = crmRole === 'Admin' || (typeof crmRole === 'string' && crmRole.toLowerCase() === 'admin');
  const isSystemAdmin = role === 'Admin' || (typeof role === 'string' && role.toLowerCase() === 'admin');
  const isAdmin = (isSystemAdmin || isCrmAdmin) && !isHOD;
  const isRestricted = !isAdmin || isHOD;

  const [data, setData] = useState({
    weightedForecast: 0,
    pendingTasks: 0,
    leadStats: { total: 0, converted: 0, lost: 0, open: 0 },
    byStage: [],
    mtdDealsWon: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamBreakdowns, setTeamBreakdowns] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedVertical, setSelectedVertical] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');

  const uniqueVerticals = [...new Set(teams.map(t => t.businessVertical).filter(Boolean))];

  const fetchDashboard = async (teamId = selectedTeam, vertical = selectedVertical, periodVal = selectedPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${process.env.REACT_APP_API_STRING}/crm/reports/dashboard`;
      const params = {};
      if (teamId && teamId !== 'all') params.teamId = teamId;
      if (vertical && vertical !== 'all') params.businessVertical = vertical;

      const currentPeriod = new Date().toISOString().substring(0, 7);
      if (periodVal === 'this_month') {
        params.period = currentPeriod;
      } else if (periodVal === 'all') {
        params.period = 'all';
      } else {
        params.period = periodVal;
      }

      const res = await axios.get(url, { ...getHeaders(), params });

      if (res.data) {
        setData({
          weightedForecast: res.data.weightedForecast || 0,
          pendingTasks: res.data.pendingTasks || 0,
          leadStats: res.data.leadStats || { total: 0, converted: 0, lost: 0, open: 0 },
          byStage: res.data.byStage || [],
          mtdDealsWon: (res.data.byStage || []).find(s => s.stage === 'won')?.count || 0
        });
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamBreakdowns = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/reports/team-breakdown`, getHeaders());
      if (res.data?.success) {
        setTeamBreakdowns(res.data.teams || []);
      }
    } catch (err) {
      console.error('Failed to load team breakdowns:', err);
    }
  };

  useEffect(() => {
    const fetchTeamsData = async () => {
      try {
        let fetchedTeams = [];
        const resMy = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/teams/my-teams`, getHeaders());
        fetchedTeams = resMy.data || [];

        if (fetchedTeams.length === 0 || !isRestricted) {
          const resAll = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/teams`, getHeaders());
          fetchedTeams = resAll.data?.teams || resAll.data || fetchedTeams;
        }

        setTeams(fetchedTeams);
      } catch (err) {
        console.error('Failed to load user teams:', err);
      }
    };
    fetchTeamsData();
    fetchTeamBreakdowns();
  }, [isRestricted]);

  useEffect(() => {
    fetchDashboard(selectedTeam, selectedVertical, selectedPeriod);
  }, [selectedTeam, selectedVertical, selectedPeriod]);

  if (loading) return (
    <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', background: '#f8fafc', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>
        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>⏳ Loading Analytics...</div>
        <div style={{ fontSize: '13px', color: '#94a3b8' }}>Fetching real-time pipeline metrics</div>
      </div>
    </div>
  );

  const conversionRate = data.leadStats.conversionRate !== undefined
    ? data.leadStats.conversionRate
    : (data.leadStats.total > 0 ? Number(((data.leadStats.converted / data.leadStats.total) * 100).toFixed(1)) : 0);

  const totalPipelineVal = data.byStage.reduce((acc, curr) => acc + (curr.value || 0), 0);

  return (
    <div style={{ padding: '16px 20px', background: '#f8fafc', minHeight: '100vh', color: '#334155', fontFamily: 'Inter, sans-serif' }}>
      {/* Error Notification */}
      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#991b1b',
          padding: '8px 14px',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid #fca5a5',
          fontSize: '0.85rem'
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '16px' }}>×</button>
        </div>
      )}

      {/* Header & Filter Bar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px',
        background: '#ffffff',
        padding: '12px 18px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '24px', background: 'linear-gradient(180deg, #4f46e5, #8b5cf6)', borderRadius: '4px' }}></div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>Analytics Overview</h2>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Executive pipeline & sales breakdown</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Team Filter */}
          {(!isRestricted || teams.length > 1) && teams && teams.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Team:</span>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.8rem', color: '#334155', background: '#ffffff', fontWeight: 600, outline: 'none' }}
              >
                {!isRestricted && <option value="all">All Teams</option>}
                {teams.map(t => (
                  <option key={t._id} value={t._id}>{t.name || t.teamName}</option>
                ))}
              </select>
            </div>
          )}

          {/* Business Vertical Filter */}
          {(!isRestricted || uniqueVerticals.length > 1) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Vertical:</span>
              <select
                value={selectedVertical}
                onChange={(e) => setSelectedVertical(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.8rem', color: '#334155', background: '#ffffff', fontWeight: 600, outline: 'none' }}
              >
                {!isRestricted && <option value="all">All Verticals</option>}
                {isRestricted ? (
                  uniqueVerticals.map(v => <option key={v} value={v}>{v}</option>)
                ) : (
                  ['Paramount', 'Transportation', 'Freight Forwarding', 'Export', 'Import'].map(v => <option key={v} value={v}>{v}</option>)
                )}
              </select>
            </div>
          )}

          {/* Time Period Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Period:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.8rem', color: '#334155', background: '#ffffff', fontWeight: 600, outline: 'none' }}
            >
              <option value="this_month">This Month</option>
              <option value="all">All Time</option>
              <option value="2026-06">June 2026</option>
              <option value="2026-05">May 2026</option>
              <option value="2026-04">April 2026</option>
              <option value="2026-03">March 2026</option>
              <option value="2026-02">February 2026</option>
              <option value="2026-01">January 2026</option>
            </select>
          </div>
        </div>
      </header>

      {/* Compact KPI Cards (4 Cards Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Pipeline Forecast', value: `₹${(data.weightedForecast / 100000).toFixed(1)}L`, color: '#4f46e5', bg: '#eef2ff', icon: '📈', sub: 'Weighted value' },
          { label: 'Deals Won', value: data.mtdDealsWon, color: '#16a34a', bg: '#dcfce7', icon: '🏆', sub: selectedPeriod === 'this_month' ? 'This Month' : (selectedPeriod === 'all' ? 'All Time' : selectedPeriod) },
          { label: 'Conversion Rate', value: `${conversionRate}%`, color: '#d97706', bg: '#fef3c7', icon: '🎯', sub: 'Lead to Opportunity' },
          { label: 'Pending Tasks', value: data.pendingTasks, color: '#9333ea', bg: '#f3e8ff', icon: '📋', sub: 'Action items' }
        ].map((kpi, i) => (
          <div key={i} style={{
            padding: '14px 16px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.68rem', letterSpacing: '0.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>{kpi.label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: kpi.color, lineHeight: 1.1 }}>{kpi.value}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px' }}>{kpi.sub}</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Middle Row: Pipeline Distribution & Lead Funnel (Compact 2 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px', marginBottom: '16px' }}>
        {/* Pipeline Distribution */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Pipeline Distribution</h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', background: '#eef2ff', padding: '2px 8px', borderRadius: '6px' }}>
              Total: ₹{(totalPipelineVal / 100000).toFixed(1)}L
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '230px', overflowY: 'auto' }}>
            {data.byStage.map((item) => {
              const pct = totalPipelineVal > 0 ? Math.round(((item.value || 0) / totalPipelineVal) * 100) : 0;
              return (
                <div key={item.stage} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    <span style={{ textTransform: 'capitalize' }}>{item.stage} <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>({item.count} deals)</span></span>
                    <span style={{ fontWeight: 700, color: '#16a34a', fontFamily: 'monospace' }}>₹{((item.value || 0) / 100000).toFixed(1)}L ({pct}%)</span>
                  </div>
                  <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#4f46e5', borderRadius: '2px', transition: 'width 0.5s ease' }}></div>
                  </div>
                </div>
              );
            })}
            {data.byStage.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>No active opportunities in pipeline</div>
            )}
          </div>
        </div>

        {/* Lead Funnel */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Lead Funnel & Conversion</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '12px' }}>
            {/* Donut Chart */}
            <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0 }}>
              <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="60" cy="60" r="48" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                <circle cx="60" cy="60" r="48" fill="none" stroke="#4f46e5" strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${conversionRate * 3.015} ${301.5 - conversionRate * 3.015}`}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4f46e5', lineHeight: 1 }}>{conversionRate}%</div>
                <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700 }}>Rate</div>
              </div>
            </div>

            {/* Funnel Progress Line */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Pipeline Breakdown</div>
              {data.leadStats.total > 0 && (
                <div style={{ display: 'flex', height: '6px', borderRadius: '4px', overflow: 'hidden', background: '#f1f5f9', marginBottom: '8px' }}>
                  {data.leadStats.converted > 0 && <div style={{ width: `${(data.leadStats.converted / data.leadStats.total) * 100}%`, background: '#16a34a' }} />}
                  {data.leadStats.open > 0 && <div style={{ width: `${(data.leadStats.open / data.leadStats.total) * 100}%`, background: '#2563eb' }} />}
                  {data.leadStats.lost > 0 && <div style={{ width: `${(data.leadStats.lost / data.leadStats.total) * 100}%`, background: '#dc2626' }} />}
                </div>
              )}
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {data.leadStats.converted} Converted • {data.leadStats.open} Open • {data.leadStats.lost} Lost
              </div>
            </div>
          </div>

          {/* 4 Stat Chips */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { label: 'Total', value: data.leadStats.total, color: '#4f46e5', bg: '#eef2ff' },
              { label: 'Converted', value: data.leadStats.converted, color: '#16a34a', bg: '#dcfce7' },
              { label: 'Open', value: data.leadStats.open, color: '#2563eb', bg: '#dbeafe' },
              { label: 'Lost', value: data.leadStats.lost, color: '#dc2626', bg: '#fee2e2' },
            ].map((stat, i) => (
              <div key={i} style={{ padding: '8px 10px', background: stat.bg, borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team-Wise Performance Breakdown Table */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: '0 0 2px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🏢 Team-Wise Pipeline & Performance Breakdown
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
              Real-time summary of leads, open pipeline value, won deals, and total incentives per team
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', background: '#eef2ff', padding: '4px 10px', borderRadius: '6px' }}>
            {teamBreakdowns.length} Sales Teams
          </span>
        </div>

        {teamBreakdowns.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '1px dashed #e2e8f0', borderRadius: '8px' }}>
            No sales teams created yet. Manage your teams in the "Teams" tab.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>Team Name</th>
                  <th style={{ padding: '8px 10px' }}>Vertical</th>
                  <th style={{ padding: '8px 10px' }}>Manager</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Members</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Leads</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Deals</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Open Pipeline (₹)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Deals Won (₹)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Team Incentives (₹)</th>
                </tr>
              </thead>
              <tbody>
                {teamBreakdowns.map(t => (
                  <tr key={t.teamId} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 10px', fontWeight: 700, color: '#1e293b' }}>{t.teamName}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <span style={{ fontSize: '0.68rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>{t.businessVertical}</span>
                    </td>
                    <td style={{ padding: '10px 10px', color: '#475569' }}>{t.managerName}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>{t.memberCount}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: '#4f46e5' }}>{t.leadCount}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: '#0284c7' }}>{t.openDealCount}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>₹{(t.openPipelineValue / 100000).toFixed(2)}L</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>₹{(t.wonValue / 100000).toFixed(2)}L ({t.wonCount})</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: '#d97706' }}>₹{t.totalIncentive.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
