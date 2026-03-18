import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function CRMDashboard() {
  const [data, setData] = useState({ 
    weightedForecast: 0, 
    pendingTasks: 0, 
    leadStats: { total: 0, converted: 0 }, 
    pipelineHealth: [],
    mtdDealsWon: 23,
    winRate: 34,
    quotaAttained: 78
  });
  const [loading, setLoading] = useState(true);

  const dummyData = {
    weightedForecast: 2850000,
    pendingTasks: 12,
    leadStats: { total: 48, converted: 12, conversionRate: 25 },
    pipelineHealth: [
      { stage: 'Lead', count: 15, value: 450000 },
      { stage: 'Qualified', count: 12, value: 380000 },
      { stage: 'Opportunity', count: 8, value: 520000 },
      { stage: 'Proposal', count: 6, value: 650000 },
      { stage: 'Negotiation', count: 5, value: 850000 }
    ],
    mtdDealsWon: 23,
    winRate: 68,
    quotaAttained: 89
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/reports/dashboard`, { withCredentials: true });
        if (res.data && Object.keys(res.data).length > 0) {
          setData(prev => ({ ...prev, ...res.data }));
        } else {
          setData(prev => ({ ...prev, ...dummyData }));
        }
      } catch (err) {
        setData(prev => ({ ...prev, ...dummyData }));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', minHeight: '100vh' }}>
      Loading Analytics...
    </div>
  );

  return (
    <div style={{ padding: '32px', background: '#f8fafc', minHeight: '100vh', color: '#334155', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ marginBottom: '40px' }}>
        <div style={{ 
          fontFamily: 'monospace', 
          fontSize: '11px', 
          letterSpacing: '2px', 
          color: '#4f46e5', 
          marginBottom: '12px' 
        }}>DASHBOARD & REPORTING</div>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 800, 
          letterSpacing: '-1px',
          margin: 0,
          color: '#0f172a'
        }}>Analytics Overview</h1>
      </header>
      
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'PIPELINE VALUE', value: `₹${(data.weightedForecast / 100000).toFixed(1)}L`, delta: '↑ 12.4% vs last month', color: '#4f46e5' },
          { label: 'DEALS WON (MTD)', value: data.mtdDealsWon, delta: '↑ 5 vs target', color: '#10b981' },
          { label: 'WIN RATE', value: `${data.winRate}%`, delta: '↓ 2% vs last month', color: '#f59e0b' },
          { label: 'QUOTA ATTAINED', value: `${data.quotaAttained}%`, delta: '↑ On track', color: '#8b5cf6' }
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
              color: kpi.delta.includes('↑') ? '#10b981' : '#ef4444', 
              marginTop: '6px'
            }}>{kpi.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        {/* Pipeline Health */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#0f172a' }}>Pipeline Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.pipelineHealth.map((stage, i) => (
              <div key={stage._id} style={{ 
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
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>{stage._id}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{stage.count} deals</div>
                </div>
                <div style={{ fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>₹{(stage.totalValue / 100000).toFixed(1)}L</div>
              </div>
            ))}
            {data.pipelineHealth.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '8px' }}>
                No active opportunities in pipeline
              </div>
            )}
          </div>
        </div>

        {/* Lead Stats */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#0f172a' }}>Lead Funnel</h3>
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '48px', fontWeight: 800, color: '#4f46e5' }}>
              {data.leadStats.total > 0 ? Math.round((data.leadStats.converted / data.leadStats.total) * 100) : 0}%
            </div>
            <div style={{ color: '#64748b', fontSize: '13px', marginTop: '8px', fontWeight: 600 }}>Conversion Rate</div>
            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center', gap: '48px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>{data.leadStats.total}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>TOTAL LEADS</div>
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>{data.leadStats.converted}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>CONVERTED</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
