import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { TrendingUp, Award, Clock, CheckCircle2, DollarSign, Users, ChevronDown, ChevronUp, RefreshCw, Edit2, Save, X } from 'lucide-react';

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

const formatINR = (val) => {
  if (!val && val !== 0) return '₹0';
  return `₹${Number(val).toLocaleString('en-IN')}`;
};

const STATUS_CONFIG = {
  pending: { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
  approved: { bg: '#dcfce7', text: '#166534', label: 'Approved' },
  paid: { bg: '#dbeafe', text: '#1d4ed8', label: 'Paid' },
};

function StatCard({ icon: Icon, iconColor, iconBg, label, value, subLabel }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '16px', padding: '20px',
      border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'center', gap: '16px'
    }}>
      <div style={{ width: 48, height: 48, borderRadius: '12px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={22} color={iconColor} />
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: '2px 0' }}>{value}</div>
        {subLabel && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{subLabel}</div>}
      </div>
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
        <span>{label}</span>
        <span>{formatINR(value)}</span>
      </div>
      <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.6s ease' }}></div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{
      background: cfg.bg, color: cfg.text,
      padding: '3px 10px', borderRadius: '20px',
      fontSize: '0.72rem', fontWeight: 700
    }}>{cfg.label}</span>
  );
}

// ─── Employee / Personal View ──────────────────────────────────────────────────
function EmployeeView({ data, loading }) {
  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading your incentives…</div>;
  if (!data) return null;

  const { summary, incentives = [] } = data;
  const maxVal = Math.max(summary.pending, summary.approved, summary.paid, 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard icon={TrendingUp} iconColor="#4f46e5" iconBg="#ede9fe" label="Total Earned" value={formatINR(summary.total)} subLabel="All time" />
        <StatCard icon={Clock} iconColor="#d97706" iconBg="#fef3c7" label="Pending Approval" value={formatINR(summary.pending)} subLabel="Awaiting manager" />
        <StatCard icon={CheckCircle2} iconColor="#16a34a" iconBg="#dcfce7" label="Approved" value={formatINR(summary.approved)} subLabel="Cleared for payout" />
        <StatCard icon={DollarSign} iconColor="#0284c7" iconBg="#e0f2fe" label="Paid Out" value={formatINR(summary.paid)} subLabel="Received" />
      </div>

      {/* Bar Chart Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>Earnings Breakdown</h3>
          <MiniBar label="Paid" value={summary.paid} max={maxVal} color="#3b82f6" />
          <MiniBar label="Approved" value={summary.approved} max={maxVal} color="#22c55e" />
          <MiniBar label="Pending" value={summary.pending} max={maxVal} color="#f59e0b" />
        </div>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>Incentive Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
              <span>Total Deals Won</span><strong>{incentives.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
              <span>Avg Incentive / Deal</span>
              <strong>{incentives.length > 0 ? formatINR(Math.round(summary.total / incentives.length)) : '₹0'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
              <span>Pending Count</span>
              <strong>{incentives.filter(i => i.status === 'pending').length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
              <span>Incentive Rate</span><strong>2%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Incentive Table */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>My Incentive History</h3>
        {incentives.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
            No incentives yet. Win a deal to start earning!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}>Opportunity</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Deal Value</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Incentive</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Period</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {incentives.map(item => (
                  <tr key={item._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 600, color: '#334155' }}>{item.opportunityId?.name || '—'}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#475569' }}>{formatINR(item.dealValue)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#4f46e5' }}>{formatINR(item.incentiveAmount)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', color: '#94a3b8' }}>{item.payoutPeriod || '—'}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}><StatusBadge status={item.status} /></td>
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

// ─── Manager / Admin View ──────────────────────────────────────────────────────
function ManagerView({ data, loading, onStatusUpdate }) {
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [savingId, setSavingId] = useState(null);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading team incentives…</div>;
  if (!data) return null;

  const { stats, leaderboard = [], incentives = [] } = data;
  const pendingIncentives = incentives.filter(i => i.status === 'pending');
  const maxTotal = leaderboard.length > 0 ? leaderboard[0].total : 1;

  const handleSaveAmount = async (item) => {
    setSavingId(item._id);
    await onStatusUpdate(item._id, { incentiveAmount: parseFloat(editAmount) });
    setEditingId(null);
    setSavingId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard icon={Clock} iconColor="#d97706" iconBg="#fef3c7" label="Pending Payout" value={formatINR(stats.totalPending)} subLabel={`${incentives.filter(i => i.status === 'pending').length} cases`} />
        <StatCard icon={CheckCircle2} iconColor="#16a34a" iconBg="#dcfce7" label="Approved" value={formatINR(stats.totalApproved)} subLabel="Approved, not paid" />
        <StatCard icon={DollarSign} iconColor="#0284c7" iconBg="#e0f2fe" label="Total Paid" value={formatINR(stats.totalPaid)} subLabel="Disbursed" />
        <StatCard icon={TrendingUp} iconColor="#7c3aed" iconBg="#ede9fe" label="Total Liability" value={formatINR(stats.totalLiability)} subLabel="All incentives" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Leaderboard */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={16} color="#f59e0b" /> Team Leaderboard
          </h3>
          {leaderboard.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>No incentive data yet.</p>
          ) : (
            leaderboard.slice(0, 10).map((rep, idx) => (
              <div key={rep.userId} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                  background: idx === 0 ? '#fef3c7' : idx === 1 ? '#f1f5f9' : idx === 2 ? '#fff7ed' : '#f8fafc',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 800,
                  color: idx === 0 ? '#d97706' : idx === 1 ? '#64748b' : idx === 2 ? '#c2410c' : '#94a3b8',
                  border: `1px solid ${idx === 0 ? '#fde68a' : '#e2e8f0'}`
                }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>{rep.name}</div>
                  <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${(rep.total / maxTotal) * 100}%`, height: '100%', background: idx === 0 ? '#f59e0b' : '#4f46e5', borderRadius: '3px', transition: 'width 0.6s ease' }}></div>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4f46e5', minWidth: '70px', textAlign: 'right' }}>{formatINR(rep.total)}</div>
              </div>
            ))
          )}
        </div>

        {/* Distribution Chart */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>Status Distribution</h3>
          {[
            { label: 'Paid', value: stats.totalPaid, color: '#3b82f6', max: stats.totalLiability },
            { label: 'Approved', value: stats.totalApproved, color: '#22c55e', max: stats.totalLiability },
            { label: 'Pending', value: stats.totalPending, color: '#f59e0b', max: stats.totalLiability },
          ].map(item => (
            <MiniBar key={item.label} {...item} />
          ))}
          <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
              <span>Disbursement Rate</span>
              <strong style={{ color: '#3b82f6' }}>
                {stats.totalLiability > 0 ? `${Math.round((stats.totalPaid / stats.totalLiability) * 100)}%` : '0%'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approval Queue */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="#f59e0b" /> Pending Approvals ({pendingIncentives.length})
        </h3>
        {pendingIncentives.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
            ✅ All incentives have been processed.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}>Sales Rep</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}>Opportunity</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Deal Value</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Incentive</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Period</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingIncentives.map(item => (
                  <tr key={item._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 600, color: '#334155' }}>
                      {item.userId ? `${item.userId.first_name || ''} ${item.userId.last_name || ''}`.trim() || item.userId.username : '—'}
                    </td>
                    <td style={{ padding: '12px 8px', color: '#475569' }}>{item.opportunityId?.name || '—'}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#475569' }}>{formatINR(item.dealValue)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      {editingId === item._id ? (
                        <input
                          type="number"
                          value={editAmount}
                          onChange={e => setEditAmount(e.target.value)}
                          style={{ width: '90px', padding: '4px 6px', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'right' }}
                        />
                      ) : (
                        <span style={{ fontWeight: 700, color: '#4f46e5' }}>{formatINR(item.incentiveAmount)}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', color: '#94a3b8' }}>{item.payoutPeriod || '—'}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {editingId === item._id ? (
                          <>
                            <button
                              onClick={() => handleSaveAmount(item)}
                              disabled={savingId === item._id}
                              style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Save size={12} /> Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                            >
                              <X size={12} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditingId(item._id); setEditAmount(item.incentiveAmount); }}
                              style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => onStatusUpdate(item._id, { status: 'approved' })}
                              style={{ background: '#dcfce7', color: '#166534', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                            >
                              Approve
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Incentives Table */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} color="#4f46e5" /> All Incentives
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>Sales Rep</th>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>Opportunity</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Deal Value</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Incentive</th>
                <th style={{ padding: '10px 8px', textAlign: 'center' }}>Period</th>
                <th style={{ padding: '10px 8px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '10px 8px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {incentives.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No incentive records yet.</td></tr>
              ) : incentives.map(item => (
                <tr key={item._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 600, color: '#334155' }}>
                    {item.userId ? `${item.userId.first_name || ''} ${item.userId.last_name || ''}`.trim() || item.userId.username : '—'}
                  </td>
                  <td style={{ padding: '12px 8px', color: '#475569' }}>{item.opportunityId?.name || '—'}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', color: '#475569' }}>{formatINR(item.dealValue)}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#4f46e5' }}>{formatINR(item.incentiveAmount)}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', color: '#94a3b8' }}>{item.payoutPeriod || '—'}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}><StatusBadge status={item.status} /></td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    {item.status === 'approved' && (
                      <button
                        onClick={() => onStatusUpdate(item._id, { status: 'paid' })}
                        style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem' }}
                      >
                        Mark Paid
                      </button>
                    )}
                    {item.status === 'paid' && <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Closed</span>}
                    {item.status === 'pending' && (
                      <button
                        onClick={() => onStatusUpdate(item._id, { status: 'approved' })}
                        style={{ background: '#dcfce7', color: '#166534', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem' }}
                      >
                        Approve
                      </button>
                    )}
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

export default function SalesIncentiveDashboard() {
  const [myData, setMyData] = useState(null);
  const [managerData, setManagerData] = useState(null);
  const [myLoading, setMyLoading] = useState(false);
  const [managerLoading, setManagerLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('my');
  const [currentUser, setCurrentUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('all');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
    setCurrentUser(user);
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/teams`, getHeaders());
      setTeams(res.data.teams || []);
    } catch (err) {
      console.error('Failed to fetch teams in incentive dashboard:', err);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const isManagerOrAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

  const fetchMyData = useCallback(async () => {
    setMyLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/incentives/my`, getHeaders());
      setMyData(res.data);
    } catch (err) {
      console.error('Failed to fetch my incentives:', err);
    } finally {
      setMyLoading(false);
    }
  }, []);

  const fetchManagerData = useCallback(async () => {
    if (!isManagerOrAdmin) return;
    setManagerLoading(true);
    try {
      const endpoint = selectedTeamId && selectedTeamId !== 'all' 
        ? `${process.env.REACT_APP_API_STRING}/crm/incentives/all?teamId=${selectedTeamId}`
        : `${process.env.REACT_APP_API_STRING}/crm/incentives/all`;
      const res = await axios.get(endpoint, getHeaders());
      setManagerData(res.data);
    } catch (err) {
      console.error('Failed to fetch all incentives:', err);
    } finally {
      setManagerLoading(false);
    }
  }, [isManagerOrAdmin, selectedTeamId]);

  useEffect(() => {
    fetchMyData();
  }, [fetchMyData]);

  useEffect(() => {
    if (activeTab === 'team') fetchManagerData();
  }, [activeTab, fetchManagerData, selectedTeamId]);

  const handleStatusUpdate = async (id, updates) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_STRING}/crm/incentives/${id}/status`, updates, getHeaders());
      fetchManagerData();
      fetchMyData();
    } catch (err) {
      console.error('Failed to update incentive status:', err);
    }
  };

  const tabs = [
    { key: 'my', label: 'My Incentives' },
    ...(isManagerOrAdmin ? [{ key: 'team', label: 'Team Performance' }] : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#fff', padding: '20px 24px 0', borderRadius: '16px 16px 0 0', border: '1px solid #e2e8f0', borderBottom: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={22} color="#f59e0b" /> Sales Incentive Dashboard
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>Track your earnings and incentive pipeline</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {activeTab === 'team' && isManagerOrAdmin && (
              <select
                value={selectedTeamId}
                onChange={e => setSelectedTeamId(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, background: '#fff', color: '#334155' }}
              >
                <option value="all">All Teams</option>
                {teams.map(t => (
                  <option key={t._id} value={t._id}>{t.name || t.teamName}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => { fetchMyData(); if (activeTab === 'team') fetchManagerData(); }}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: activeTab === tab.key ? '#4f46e5' : 'transparent',
                color: activeTab === tab.key ? '#fff' : '#64748b',
                border: 'none', borderRadius: '8px 8px 0 0',
                padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '0 0 16px 16px', border: '1px solid #e2e8f0', borderTop: 'none' }}>
        {activeTab === 'my' && (
          <EmployeeView data={myData} loading={myLoading} />
        )}
        {activeTab === 'team' && isManagerOrAdmin && (
          <ManagerView data={managerData} loading={managerLoading} onStatusUpdate={handleStatusUpdate} />
        )}
      </div>
    </div>
  );
}
