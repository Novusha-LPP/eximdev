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

  useEffect(() => {
    const fetchMyTeams = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/teams/my-teams`, getHeaders());
        const fetchedTeams = res.data || [];
        setTeams(fetchedTeams);
        if (isRestricted) {
          const verticals = [...new Set(fetchedTeams.map(t => t.businessVertical).filter(Boolean))];
          if (fetchedTeams.length > 0) {
            setSelectedTeam(fetchedTeams[0]._id);
          }
          if (verticals.length > 0) {
            setSelectedVertical(verticals[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load user teams:', err);
      }
    };
    fetchMyTeams();
  }, [isRestricted]);

  useEffect(() => {
    if (isRestricted && teams.length > 0 && selectedTeam === 'all') {
      return;
    }
    const verticals = [...new Set(teams.map(t => t.businessVertical).filter(Boolean))];
    if (isRestricted && verticals.length > 0 && selectedVertical === 'all') {
      return;
    }
    fetchDashboard(selectedTeam, selectedVertical, selectedPeriod);
  }, [selectedTeam, selectedVertical, selectedPeriod, teams, isRestricted]);

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>
        <div style={{ fontSize: '18px', marginBottom: '12px' }}>⏳ Loading Analytics...</div>
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>Fetching your CRM metrics</div>
      </div>
    </div>
  );

  // Conversion % = Converted (Actual Won Deals) / Total Leads
  const conversionRate = data.leadStats.conversionRate !== undefined
    ? data.leadStats.conversionRate
    : (data.leadStats.total > 0 ? Number(((data.leadStats.converted / data.leadStats.total) * 100).toFixed(1)) : 0);

  return (
    <div style={{ padding: '32px', background: '#f8fafc', minHeight: '100vh', color: '#334155', fontFamily: 'Inter, sans-serif' }}>
      {/* Error notification */}
      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid #fca5a5'
        }}>
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '18px' }}
          >×</button>
        </div>
      )}

      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 800,
          margin: 0,
          color: '#0f172a'
        }}>Analytics Overview</h1>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* Team Filter */}
          {(!isRestricted || teams.length > 1) && teams && teams.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Team:</span>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                style={{
                  padding: '8px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  color: '#334155',
                  background: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {!isRestricted && <option value="all">All Teams</option>}
                {teams.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Business Vertical Filter */}
          {(!isRestricted || uniqueVerticals.length > 1) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Vertical:</span>
              <select
                value={selectedVertical}
                onChange={(e) => setSelectedVertical(e.target.value)}
                style={{
                  padding: '8px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  color: '#334155',
                  background: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {!isRestricted && <option value="all">All Verticals</option>}
                {isRestricted ? (
                  uniqueVerticals.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))
                ) : (
                  ['Paramount', 'Transportation', 'Freight Forwarding', 'Export', 'Import'].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Time Period Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Period:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{
                padding: '8px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '0.85rem',
                color: '#334155',
                background: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
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

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'PIPELINE VALUE', value: `₹${(data.weightedForecast / 100000).toFixed(1)}L`, color: '#4f46e5', sub: 'Weighted Forecast' },
          { label: 'DEALS WON', value: data.mtdDealsWon, color: '#10b981', sub: selectedPeriod === 'this_month' ? 'Closed Won (This Month)' : (selectedPeriod === 'all' ? 'Closed Won (All Time)' : `Closed Won (${selectedPeriod})`) },
          { label: 'CONVERSION RATE', value: `${conversionRate}%`, color: '#f59e0b', sub: 'Lead to Opportunity' },
          { label: 'PENDING TASKS', value: data.pendingTasks, color: '#8b5cf6', sub: 'Action Required' }
        ].map((kpi, i) => (
          <div key={i} style={{
            padding: '24px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              fontSize: '10px',
              letterSpacing: '1px',
              color: '#64748b',
              marginBottom: '10px',
              textTransform: 'uppercase',
              fontWeight: 700
            }}>{kpi.label}</div>
            <div style={{
              fontSize: '28px',
              fontWeight: 800,
              color: kpi.color,
              letterSpacing: '-1px'
            }}>{kpi.value}</div>
            <div style={{
              fontSize: '11px',
              color: '#94a3b8',
              marginTop: '6px'
            }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        {/* Pipeline Health */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#0f172a' }}>Pipeline Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.byStage.map((item, i) => (
              <div key={item.stage} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '4px', background: '#3b82f6' }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', textTransform: 'capitalize' }}>{item.stage}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{item.count} deals</div>
                </div>
                <div style={{ fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>₹{(item.value / 100000).toFixed(1)}L</div>
              </div>
            ))}
            {data.byStage.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '8px' }}>
                No active opportunities in pipeline
              </div>
            )}
          </div>
        </div>

        {/* Lead Stats */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#0f172a' }}>Lead Funnel</h3>

          {/* Circular Progress Ring */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
            <div style={{ position: 'relative', width: '160px', height: '160px' }}>
              <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle cx="60" cy="60" r="52" fill="none" stroke="url(#convGrad)" strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${conversionRate * 3.267} ${326.7 - conversionRate * 3.267}`}
                />
                <defs>
                  <linearGradient id="convGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '36px', fontWeight: 800, color: '#4f46e5', lineHeight: 1 }}>{conversionRate}%</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '4px' }}>Conversion</div>
              </div>
            </div>
          </div>

          {/* Segmented Progress Bar */}
          {data.leadStats.total > 0 && (
            <div style={{ display: 'flex', height: '8px', borderRadius: '99px', overflow: 'hidden', marginBottom: '24px', background: '#f1f5f9' }}>
              {data.leadStats.converted > 0 && (
                <div style={{ width: `${(data.leadStats.converted / data.leadStats.total) * 100}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', transition: 'width 0.5s ease' }} />
              )}
              {data.leadStats.open > 0 && (
                <div style={{ width: `${(data.leadStats.open / data.leadStats.total) * 100}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', transition: 'width 0.5s ease' }} />
              )}
              {data.leadStats.lost > 0 && (
                <div style={{ width: `${(data.leadStats.lost / data.leadStats.total) * 100}%`, background: 'linear-gradient(90deg, #ef4444, #f87171)', transition: 'width 0.5s ease' }} />
              )}
            </div>
          )}

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {[
              { label: 'Total Leads', value: data.leadStats.total, color: '#4f46e5', bg: '#eef2ff', icon: '📊' },
              { label: 'Converted', value: data.leadStats.converted, color: '#10b981', bg: '#ecfdf5', icon: '✅' },
              { label: 'Lost', value: data.leadStats.lost, color: '#ef4444', bg: '#fef2f2', icon: '❌' },
              { label: 'Open', value: data.leadStats.open, color: '#3b82f6', bg: '#eff6ff', icon: '🔵' },
            ].map((stat, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                background: stat.bg,
                borderRadius: '10px',
                border: `1px solid ${stat.bg}`,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                cursor: 'default'
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ fontSize: '22px', lineHeight: 1 }}>{stat.icon}</div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: stat.color, lineHeight: 1.2 }}>{stat.value}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
