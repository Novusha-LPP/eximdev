import React, { useState, useEffect, useContext, useCallback } from 'react';
import { FiCheck, FiX, FiRefreshCw, FiFileText, FiFilter } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../../contexts/UserContext';
import attendanceAPI from '../../api/attendance/attendance.api';
import { formatDate } from './utils/helpers';
import { API_BASE_URL } from './utils/constants';
import toast from 'react-hot-toast';
import './ApprovalPages.css';
import LeavePolicyManagement from './admin/LeavePolicyManagement';
import HolidayManagement from './admin/HolidayManagement';

const initials = (n = '') => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
const fmt = (d, f) => { try { return formatDate(d, f); } catch { return d || '-'; } };
const formatSession = (s) => (s === 'first_half' ? '1st Half' : '2nd Half');

const LeaveApproval = () => {
  const location = useLocation();
  const { user } = useContext(UserContext);

  // Role detection — use EXIM roles from UserContext
  const isAdmin = user?.role === 'Admin' || user?.role === 'ADMIN';
  const isHOD = user?.role === 'Head_of_Department' || user?.role === 'HOD';

  const [activeTab, setActiveTab] = useState(location.state?.tab || 'approvals');
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Admin-only team filter state
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('all');

  const fetchRequests = useCallback(async (teamId = 'all') => {
    try {
      setLoading(true);
      setError(null);

      let pendingLeaves = [];
      let processedLeaves = [];

      if (isAdmin) {
        // Admin: use the dedicated admin endpoint with optional team filter
        const res = await attendanceAPI.getAdminLeaveRequests(teamId !== 'all' ? teamId : undefined);
        pendingLeaves = res?.data?.pendingLeaves || [];
        processedLeaves = (res?.data?.recentProcessedLeaves || []).map(h => ({
          ...h,
          historyKey: `hist-${h.id}-${new Date(h.actionDate).getTime()}`
        }));

        // Populate teams for filter dropdown (first load only)
        if (teams.length === 0 && res?.data?.teams?.length > 0) {
          setTeams(res.data.teams);
        }
      } else {
        // HOD: use the HOD dashboard endpoint — backend handles team scoping
        const res = await attendanceAPI.getHODDashboard();
        pendingLeaves = res?.data?.pendingLeaves || [];
        processedLeaves = (res?.data?.recentProcessedLeaves || []).map(h => ({
          ...h,
          historyKey: `hist-${h.id}-${new Date(h.actionDate).getTime()}`
        }));
      }

      const seen = new Set();
      setRequests(pendingLeaves.filter(r => {
        const k = String(r.id);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }));
      setHistory(processedLeaves);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load');
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, teams.length]);

  useEffect(() => { fetchRequests(selectedTeam); }, []);

  const handleTeamChange = (e) => {
    const val = e.target.value;
    setSelectedTeam(val);
    fetchRequests(val);
  };

  const handleAction = async (id, status) => {
    const acted = requests.find(r => String(r.id) === String(id));
    if (!acted) return;
    setRequests(prev => prev.filter(r => String(r.id) !== String(id)));
    try {
      await attendanceAPI.approveRequest('leave', id, status);
      toast.success(`Leave ${status}`);
      setHistory(h => h.some(r => String(r.id) === String(id)) ? h :
        [{ ...acted, status, actionDate: new Date().toISOString(), historyKey: `${id}-${Date.now()}` }, ...h]);
    } catch {
      toast.error('Action failed');
      setRequests(prev => [acted, ...prev]);
    }
  };

  if (loading) return (
    <div className="ap-page">
      <div className="ap-loading"><div className="ap-spin" /><span>Loading...</span></div>
    </div>
  );

  if (error) return (
    <div className="ap-page">
      <div className="ap-header"><div><h1>Leave &amp; Holidays</h1></div></div>
      <div className="ap-card">
        <div className="ap-empty">
          <div className="ap-empty-icon">!</div>
          <p style={{ color: '#b53535' }}>{error}</p>
          <button className="ap-icon-btn" onClick={() => fetchRequests(selectedTeam)} style={{ marginTop: 8 }}>
            <FiRefreshCw size={13} /> Retry
          </button>
        </div>
      </div>
    </div>
  );

  const TABS = [
    { key: 'approvals', label: 'Leave Approvals', count: requests.length },
    { key: 'policy', label: 'Leave Policy', count: 0 },
    { key: 'holiday', label: 'Holidays', count: 0 },
  ];

  return (
    <div className="ap-page">
      <div className="ap-header">
        <div>
          <h1>Leave &amp; Holidays</h1>
          <p>Manage leave requests, policies, and upcoming holidays</p>
        </div>
        <div className="ap-header-actions">
          {activeTab === 'approvals' && (
            <>
              {/* Team filter — Admin only */}
              {isAdmin && teams.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiFilter size={13} style={{ color: '#6b7280' }} />
                  <select
                    value={selectedTeam}
                    onChange={handleTeamChange}
                    style={{
                      height: 32,
                      border: '1px solid #e5e7eb',
                      borderRadius: 6,
                      padding: '0 10px',
                      fontSize: '.8125rem',
                      background: '#fff',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Teams</option>
                    {teams.map(t => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button className="ap-icon-btn" onClick={() => fetchRequests(selectedTeam)}>
                <FiRefreshCw size={13} /> Refresh
              </button>
            </>
          )}
        </div>
      </div>

      <div className="ap-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`ap-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
            {t.count > 0 && <span className="ap-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'policy' && <div className="animation-fade-in"><LeavePolicyManagement embedded readOnly /></div>}
      {activeTab === 'holiday' && <div className="animation-fade-in"><HolidayManagement embedded readOnly /></div>}

      {activeTab === 'approvals' && (
        <div className="animation-fade-in">

          {/* ── Pending Approvals ── */}
          <div className="ap-card">
            <div className="ap-card-head">
              <div>
                <div className="ap-card-title">Pending Approvals</div>
                <div className="ap-card-sub">
                  {requests.length} request{requests.length !== 1 ? 's' : ''} awaiting decision
                  {isAdmin && selectedTeam !== 'all' && (
                    <span style={{ marginLeft: 8, color: '#6b7280', fontWeight: 500 }}>
                      — {teams.find(t => t._id === selectedTeam)?.name || ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {requests.length === 0 ? (
              <div className="ap-empty">
                <div className="ap-empty-icon">&#10003;</div>
                <p>All caught up! No pending requests.</p>
              </div>
            ) : (
              <div className="ap-request-list">
                {requests.map(req => (
                  <div key={String(req.id)} className="ap-request-item">
                    <div className="ap-req-top">
                      <div className="ap-req-av">{initials(req.employeeName)}</div>
                      <div className="ap-req-info">
                        <div className="ap-req-name">{req.employeeName}</div>
                        <div className="ap-req-meta">
                          {req.is_half_day
                            ? `Half Day (${formatSession(req.half_day_session)})`
                            : `${req.totalDays} day${req.totalDays !== 1 ? 's' : ''} leave`}
                          {/* Show team badge for Admin */}
                          {isAdmin && req.teamName && (
                            <span style={{
                              marginLeft: 8,
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              borderRadius: 999,
                              padding: '1px 8px',
                              fontSize: '.6875rem',
                              fontWeight: 600
                            }}>
                              {req.teamName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ap-req-tags">
                        <span className="ap-badge leave">{req.leaveType}</span>
                        {req.attachment_urls && req.attachment_urls.length > 0 && (
                          <a
                            href={`${API_BASE_URL.replace('/api', '')}/${req.attachment_urls[0]}`}
                            target="_blank"
                            rel="noreferrer"
                            className="ap-badge doc"
                            style={{ background: '#f3f4f6', color: '#374151', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <FiFileText size={10} /> View Doc
                          </a>
                        )}
                        <span className="ap-badge days">{req.totalDays}d</span>
                        <span className="ap-badge pending">Pending</span>
                      </div>
                    </div>

                    <div className="ap-req-dates">
                      <div className="ap-date-block">
                        <span className="ap-date-lbl">From</span>
                        <span className="ap-date-val">{fmt(req.fromDate, 'dd MMM yyyy')}</span>
                      </div>
                      <span className="ap-date-arrow">&rarr;</span>
                      <div className="ap-date-block">
                        <span className="ap-date-lbl">To</span>
                        <span className="ap-date-val">{fmt(req.toDate, 'dd MMM yyyy')}</span>
                      </div>
                    </div>

                    {req.reason && <div className="ap-req-reason">"{req.reason}"</div>}

                    <div className="ap-req-actions">
                      <button className="ap-btn approve" onClick={() => handleAction(req.id, 'approved')}>
                        <FiCheck size={14} /> Approve
                      </button>
                      <button className="ap-btn reject" onClick={() => handleAction(req.id, 'rejected')}>
                        <FiX size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Action History ── */}
          {history.length > 0 && (
            <div className="ap-card">
              <div className="ap-card-head">
                <div>
                  <div className="ap-card-title">Action History</div>
                  <div className="ap-card-sub">Recently processed requests</div>
                </div>
              </div>
              <div className="ap-history-wrap">
                <table className="ap-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      {/* Team column — Admin only */}
                      {isAdmin && <th>Team</th>}
                      <th>Type</th>
                      <th>Days</th>
                      <th>Date Range</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(req => (
                      <tr key={req.historyKey}>
                        <td className="td-name">{req.employeeName}</td>
                        {isAdmin && (
                          <td>
                            {req.teamName
                              ? <span style={{ fontSize: '.75rem', color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '1px 8px' }}>{req.teamName}</span>
                              : <span style={{ color: '#9ca3af', fontSize: '.75rem' }}>—</span>
                            }
                          </td>
                        )}
                        <td>
                          {req.leaveType}
                          {req.attachment_urls && req.attachment_urls.length > 0 && (
                            <a
                              href={`${API_BASE_URL.replace('/api', '')}/${req.attachment_urls[0]}`}
                              target="_blank"
                              rel="noreferrer"
                              title="View Document"
                              style={{ marginLeft: 6, color: '#6b7280' }}
                            >
                              <FiFileText size={12} />
                            </a>
                          )}
                        </td>
                        <td className="td-mono">
                          {req.is_half_day ? `Half Day (${formatSession(req.half_day_session)})` : `${req.totalDays}d`}
                        </td>
                        <td className="td-mono">{fmt(req.fromDate, 'dd MMM')} &rarr; {fmt(req.toDate, 'dd MMM')}</td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reason}>
                          {req.reason || '-'}
                        </td>
                        <td>
                          <span className={`ap-status-badge ${req.status}`}>
                            {req.status === 'approved' ? <FiCheck size={10} /> : <FiX size={10} />}{' '}
                            {req.status?.charAt(0).toUpperCase() + req.status?.slice(1)}
                          </span>
                        </td>
                        <td className="td-dim">
                          {req.actionDate ? new Date(req.actionDate).toLocaleDateString('en', { day: 'numeric', month: 'short' }) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeaveApproval;
