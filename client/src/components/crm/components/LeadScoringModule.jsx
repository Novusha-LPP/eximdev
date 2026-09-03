import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { message, Modal } from 'antd';
import { TrendingUp, Filter, Download } from 'lucide-react';

export default function LeadScoringModule() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, A, B, C, D
  const [dashboardStats, setDashboardStats] = useState({
    byGrade: [],
    qualified: []
  });
  
  const getHeaders = () => {
    const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
    return {
      headers: {
        'Content-Type': 'application/json',
        'user-id': user._id || user.id || '',
        'username': user.username || '',
        'user-role': user.role || '',
        'Authorization': user.token ? `Bearer ${user.token}` : undefined
      },
      withCredentials: true
    };
  };

  const fetchScores = async () => {
    try {
      setLoading(true);
      const query = filter !== 'all' ? `?grade=${filter}` : '';
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/lead-scoring/scores${query}`,
        getHeaders()
      );
      setScores(res.data?.scores || []);
    } catch (err) {
      setScores([]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/lead-scoring/scores/dashboard/stats`,
        getHeaders()
      );
      if (res.data) {
        setDashboardStats(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchScores();
    fetchDashboardStats();
  }, [filter]);

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A':
        return { bg: '#dcfce7', color: '#166534', label: 'Excellent' };
      case 'B':
        return { bg: '#dbeafe', color: '#1e40af', label: 'Good' };
      case 'C':
        return { bg: '#fef3c7', color: '#92400e', label: 'Fair' };
      case 'D':
        return { bg: '#fee2e2', color: '#991b1b', label: 'Poor' };
      default:
        return { bg: '#f3f4f6', color: '#374151', label: 'Ungraded' };
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const autoQualifyLeads = async () => {
    Modal.confirm({
      title: 'Auto-Qualify Leads',
      content: 'Auto-qualify leads with score >= 70. This action cannot be undone.',
      okText: 'Proceed',
      okType: 'primary',
      async onOk() {
        try {
          const res = await axios.post(
            `${process.env.REACT_APP_API_STRING}/crm/leads/auto-qualify`,
            { minScoreForQualification: 70 },
            getHeaders()
          );
          message.success(res.data.message);
          fetchScores();
        } catch (error) {
          message.error('Failed to auto-qualify leads');
        }
      }
    });
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading lead scores...</div>;

  return (
    <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontWeight: 700, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={24} style={{ color: '#4f46e5' }} />
            Lead Scoring & Qualification
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Automatically qualify leads based on scoring</span>
        </div>
        <button
          onClick={autoQualifyLeads}
          style={{
            background: '#10b981',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <TrendingUp size={16} /> Auto-Qualify
        </button>
      </div>

      {/* Dashboard Stats */}
      {dashboardStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '2rem' }}>
          {[
            { label: 'Grade A (Excellent)', value: dashboardStats.byGrade?.find(g => g._id === 'A')?.count || 0, color: '#10b981' },
            { label: 'Grade B (Good)', value: dashboardStats.byGrade?.find(g => g._id === 'B')?.count || 0, color: '#3b82f6' },
            { label: 'Grade C (Fair)', value: dashboardStats.byGrade?.find(g => g._id === 'C')?.count || 0, color: '#f59e0b' },
            { label: 'Qualified Leads', value: dashboardStats.qualified?.[0]?.count || 0, color: '#8b5cf6' }
          ].map((stat, idx) => (
            <div key={idx} style={{
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '10px',
              border: `1px solid #e2e8f0`,
              borderLeft: `4px solid ${stat.color}`
            }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>{stat.label}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', alignItems: 'center' }}>
        <Filter size={18} style={{ color: '#64748b' }} />
        {['all', 'A', 'B', 'C', 'D'].map(grade => (
          <button
            key={grade}
            onClick={() => setFilter(grade)}
            style={{
              padding: '8px 16px',
              border: '1px solid #e2e8f0',
              background: filter === grade ? '#4f46e5' : 'white',
              color: filter === grade ? 'white' : '#475569',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            {grade === 'all' ? 'All Leads' : `Grade ${grade}`}
          </button>
        ))}
      </div>

      {/* Scores Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '16px 12px' }}>Lead Name</th>
              <th style={{ padding: '16px 12px' }}>Email</th>
              <th style={{ padding: '16px 12px' }}>Company</th>
              <th style={{ padding: '16px 12px' }}>Score</th>
              <th style={{ padding: '16px 12px' }}>Grade</th>
              <th style={{ padding: '16px 12px' }}>Qualified</th>
              <th style={{ padding: '16px 12px' }}>Factors</th>
            </tr>
          </thead>
          <tbody>
            {scores.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No scores found.</td></tr>
            ) : scores.map(score => {
              const gradeInfo = getGradeColor(score.grade);
              return (
                <tr key={score._id} style={{ borderBottom: '1px solid #f1f5f9' }} onMouseEnter={e => e.currentTarget.style.background = '#fafafa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '16px 12px', fontWeight: 600, color: '#334155' }}>
                    {[score.leadId?.firstName, score.leadId?.lastName].filter(Boolean).join(' ') || 'N/A'}
                  </td>
                  <td style={{ padding: '16px 12px', color: '#475569' }}>
                    {score.leadId?.email ? <a href={`mailto:${score.leadId.email}`} style={{ color: '#4f46e5' }}>{score.leadId.email}</a> : 'N/A'}
                  </td>
                  <td style={{ padding: '16px 12px', color: '#475569' }}>{score.leadId?.company || 'N/A'}</td>
                  <td style={{ padding: '16px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: getScoreColor(score.totalScore),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.9rem'
                      }}>
                        {score.totalScore}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        <div>Activity: {score.activityScore}</div>
                        <div>Source: {score.sourceScore}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <span style={{
                      background: gradeInfo.bg,
                      color: gradeInfo.color,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}>
                      {score.grade}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <span style={{
                      background: score.isQualified ? '#dcfce7' : '#fee2e2',
                      color: score.isQualified ? '#166534' : '#991b1b',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}>
                      {score.isQualified ? '✓ Yes' : '✗ No'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px', color: '#475569', fontSize: '0.8rem' }}>
                    {score.rulesApplied?.slice(0, 2).join(', ') || 'Default'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Score Breakdown Legend */}
      <div style={{ marginTop: '2rem', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#1e293b', fontWeight: 700 }}>Score Breakdown</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', fontSize: '0.85rem' }}>
          <div>
            <span style={{ fontWeight: 600, color: '#166534' }}>Grade A:</span>
            <span style={{ color: '#64748b' }}> Score 80-100 (Excellent)</span>
          </div>
          <div>
            <span style={{ fontWeight: 600, color: '#1e40af' }}>Grade B:</span>
            <span style={{ color: '#64748b' }}> Score 60-79 (Good)</span>
          </div>
          <div>
            <span style={{ fontWeight: 600, color: '#92400e' }}>Grade C:</span>
            <span style={{ color: '#64748b' }}> Score 40-59 (Fair)</span>
          </div>
          <div>
            <span style={{ fontWeight: 600, color: '#991b1b' }}>Grade D:</span>
            <span style={{ color: '#64748b' }}> Score 0-39 (Poor)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
