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
import LeaveBalanceManagement from './admin/LeaveBalanceManagement';

const initials = (n = '') => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
const fmt = (d, f) => { try { return formatDate(d, f); } catch { return d || '-'; } };
const formatSession = (s) => (s === 'first_half' ? '1st Half' : '2nd Half');
const ALLOWED_USERNAMES = new Set(['shalini_arun', 'manu_pillai', 'suraj_rajan', 'rajan_aranamkatte', 'uday_zope']);
const normalizeRole = (role) => String(role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
const isAdminRole = (role) => normalizeRole(role) === 'ADMIN';
const isAllowedUser = (username) => ALLOWED_USERNAMES.has(String(username || '').toLowerCase());
const isHodRole = (role) => {
  const n = normalizeRole(role);
  return n === 'HOD' || n === 'HEADOFDEPARTMENT';
};

const STAGE_LABELS = {
  stage_1_hod: 'Team HOD',
  stage_2_shalini: 'shalini_arun',
  stage_3_final: 'Final approver'
};

const getStageLabel = (stage) => STAGE_LABELS[stage] || (stage ? stage.replaceAll('_', ' ') : 'Pending');

const getRequestStatusLabel = (req) => {
  if (req?.status === 'approved') return 'Approved';
  if (req?.status === 'rejected') return 'Rejected';

  if (req?.approvalStage === 'stage_1_hod') return 'Pending - needs HOD approval first';
  if (req?.approvalStage === 'stage_2_shalini') return 'Pending - needs Shalini Arun approval first';
  if (req?.approvalStage === 'stage_3_final') return 'Pending approval from final approver';

  if (req?.pendingRemark) return req.pendingRemark;

  if (Array.isArray(req?.approvalTrail) && req.approvalTrail.length > 0) {
    return req.approvalTrail.join(' • ');
  }

  return 'Pending approval';
};

const normalizeLeaveRecord = (raw = {}) => {
  const stage = raw.approvalStage || raw.approval_stage || (raw.status === 'pending' ? 'stage_1_hod' : null);
  const stageLabel = raw.approvalStageLabel || raw.approval_stage_label || (stage ? getStageLabel(stage) : null);
  const trail = Array.isArray(raw.approvalTrail)
    ? raw.approvalTrail
    : (Array.isArray(raw.approval_trail) ? raw.approval_trail : []);

  let canAct = raw.canAct;
  if (typeof canAct !== 'boolean') {
    canAct = typeof raw.can_act === 'boolean' ? raw.can_act : (raw.status === 'pending');
  }

  return {
    ...raw,
    id: raw.id || raw._id,
    employeeName: raw.employeeName || raw.employee_name || 'Unknown',
    employeeId: raw.employeeId || raw.employee_id,
    teamName: raw.teamName || raw.team_name || null,
    leaveType: raw.leaveType || raw.leave_type || 'Unknown',
    fromDate: raw.fromDate || raw.from_date,
    toDate: raw.toDate || raw.to_date,
    totalDays: raw.totalDays ?? raw.total_days ?? 0,
    is_half_day: raw.is_half_day ?? false,
    half_day_session: raw.half_day_session || null,
    attachment_urls: raw.attachment_urls || [],
    status: raw.status || raw.approval_status || 'pending',
    approvalStage: stage,
    approvalStageLabel: stageLabel,
    approvalTrail: trail,
    canAct,
    pendingRemark: raw.pendingRemark || raw.pending_remark || null,
    currentApproverName: raw.currentApproverName || raw.current_approver_name || null,
    currentApproverRole: raw.currentApproverRole || raw.current_approver_role || null,
    currentApproverUsername: raw.currentApproverUsername || raw.current_approver_username || null,
    approvedBy: raw.approvedBy || raw.approved_by || null,
    rejectedBy: raw.rejectedBy || raw.rejected_by || null,
    approverRole: raw.approverRole || raw.approver_role || null,
    decisionRemark: raw.decisionRemark || raw.decision_remark || null,
    rejectionReason: raw.rejectionReason || raw.rejection_reason || null,
    actionDate: raw.actionDate || raw.action_date || raw.updatedAt || raw.updated_at || null
  };
};

const LeaveApproval = () => {
  const location = useLocation();
  const { user } = useContext(UserContext);
  const username = String(user?.username || '').toLowerCase();

  // Role detection — admin queue can be used by allowlisted approvers too
  const isAdmin = isAdminRole(user?.role) || isAllowedUser(username);
  const isHOD = isHodRole(user?.role);
  const canManageAdminTools = isAdminRole(user?.role) && isAllowedUser(username);
  // Initial local check, but will be synced with backend for consistency
  const [isAllowedAdmin, setIsAllowedAdmin] = useState(canManageAdminTools);

  const [activeTab, setActiveTab] = useState(location.state?.tab || 'approvals');
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, remark: '' });

  // Admin-only team filter state
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('all');

  // History & Pagination state
  const [totalHistory, setTotalHistory] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState('');
  const historyLimit = 20;

  const fetchRequests = useCallback(async (teamId = 'all', page = 1) => {
    try {
      setLoading(true);
      setError(null);

      let pendingLeaves = [];
      let processedLeaves = [];
      let total = 0;

      if (isAdmin) {
        // Admin: use the dedicated admin endpoint with optional team filter and pagination
        const res = await attendanceAPI.getAdminLeaveRequests(teamId !== 'all' ? teamId : undefined, page, historyLimit);
        console.log('[LeaveApproval] Admin queue response:', res?.data);
        pendingLeaves = (res?.data?.pendingLeaves || []).map(normalizeLeaveRecord);
        processedLeaves = (res?.data?.recentProcessedLeaves || []).map(h => {
          const normalized = normalizeLeaveRecord(h);
          return {
            ...normalized,
            historyKey: `hist-${normalized.id}-${new Date(normalized.actionDate || Date.now()).getTime()}`
          };
        });
        total = res?.data?.totalHistory || 0;

        // Populate teams for filter dropdown (first load only)
        if (teams.length === 0 && res?.data?.teams?.length > 0) {
          setTeams(res.data.teams);
        }

        // Sync allowed admin status from backend
        if (res?.data?.isAllowedAdmin !== undefined) {
          setIsAllowedAdmin(res.data.isAllowedAdmin);
        }
      } else {
        // HOD: use the HOD dashboard endpoint — backend handles team scoping
        // Note: For HOD, we might want to implement separate pagination later if needed.
        const res = await attendanceAPI.getHODDashboard();
        console.log('[LeaveApproval] HOD dashboard response:', res?.data);
        pendingLeaves = (res?.data?.pendingLeaves || []).map(normalizeLeaveRecord);
        processedLeaves = (res?.data?.recentProcessedLeaves || []).map(h => {
          const normalized = normalizeLeaveRecord(h);
          return {
            ...normalized,
            historyKey: `hist-${normalized.id}-${new Date(normalized.actionDate || Date.now()).getTime()}`
          };
        });
        total = processedLeaves.length;
      }

      const seen = new Set();
      const dedupedPending = pendingLeaves.filter(r => {
        const k = String(r.id);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      setRequests(dedupedPending);
      console.log('[LeaveApproval] Pending requests after dedupe:', dedupedPending.map(r => ({
        id: r.id,
        status: r.status,
        approvalStage: r.approvalStage,
        pendingRemark: r.pendingRemark,
        approvalTrail: r.approvalTrail,
        canAct: r.canAct,
        approvalDebug: r.approvalDebug
      })));
      setHistory(processedLeaves);
      setTotalHistory(total);
      setHistoryPage(page);
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
    fetchRequests(val, 1);
  };

  const handlePageChange = (newPage) => {
    fetchRequests(selectedTeam, newPage);
  };

  const handleDeleteHistory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this leave history record? This action cannot be undone.')) return;
    try {
      await attendanceAPI.deleteLeaveApplication(id);
      toast.success('History record deleted');
      fetchRequests(selectedTeam, historyPage);
    } catch (err) {
      toast.error(err.message || 'Failed to delete record');
    }
  };

  const processAction = async (id, status, remark = '') => {
    const acted = requests.find(r => String(r.id) === String(id));
    if (!acted) return;
    setRequests(prev => prev.filter(r => String(r.id) !== String(id)));
    try {
      const response = await attendanceAPI.approveRequest('leave', id, status, remark);
      console.log('[LeaveApproval] approveRequest response:', { id, status, remark, response });
      toast.success(response?.message || `Leave ${status}`);
      setHistory(h => h.some(r => String(r.id) === String(id)) ? h :
        [{
          ...acted,
          status,
          actionDate: new Date().toISOString(),
          historyKey: `${id}-${Date.now()}`,
          approvedBy: status === 'approved' ? (user?.name || user?.username || 'You') : null,
          rejectedBy: status === 'rejected' ? (user?.name || user?.username || 'You') : null,
          decisionRemark: remark || ''
        }, ...h]);
    } catch {
      toast.error('Action failed');
      setRequests(prev => [acted, ...prev]);
    }
  };

  const handleAction = async (id, status) => {
    if (status === 'rejected') {
      setRejectModal({ open: true, id, remark: '' });
      return;
    }
    await processAction(id, status);
  };

  const submitRejectAction = async () => {
    const remark = rejectModal.remark.trim();
    if (!remark) {
      toast.error('Rejection reason is required.');
      return;
    }

    const rejectId = rejectModal.id;
    setRejectModal({ open: false, id: null, remark: '' });
    await processAction(rejectId, 'rejected', remark);
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
    { key: 'history', label: 'Leave History', count: 0 },
    ...(canManageAdminTools ? [{ key: 'balances', label: 'Leave Balances', count: 0 }] : []),
    ...(canManageAdminTools ? [{ key: 'policy', label: 'Leave Policy', count: 0 }] : []),
    ...(canManageAdminTools ? [{ key: 'holiday', label: 'Holidays', count: 0 }] : []),
  ];

  const filteredHistory = history.filter(h =>
    h.employeeName.toLowerCase().includes(historySearch.toLowerCase()) ||
    h.leaveType.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="ap-page">
      <div className="ap-header">
        <div>
          <h1>Leave &amp; Holidays</h1>
          <p>Manage leave requests, policies, and upcoming holidays</p>
        </div>
        <div className="ap-header-actions">
          {(activeTab === 'approvals' || activeTab === 'history') && (
            <>
              {/* Team filter — Only for Allowed Admins */}
              {isAllowedAdmin && teams.length > 0 && (
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
              <button className="ap-icon-btn" onClick={() => fetchRequests(selectedTeam, historyPage)}>
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

      {activeTab === 'balances' && isAllowedAdmin && <div className="animation-fade-in"><LeaveBalanceManagement /></div>}
      {activeTab === 'policy' && isAllowedAdmin && <div className="animation-fade-in"><LeavePolicyManagement embedded readOnly /></div>}
      {activeTab === 'holiday' && isAllowedAdmin && <div className="animation-fade-in"><HolidayManagement embedded readOnly /></div>}

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
                    {req.canAct === false && (
                      <div className="ap-locked-hint">
                        {req.pendingRemark || 'You cannot approve this at the current stage.'}
                      </div>
                    )}
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
                        {req.approvalStageLabel && (
                          <span className="ap-badge pending" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                            {req.approvalStageLabel}
                          </span>
                        )}
                        {req.currentApproverName && (
                          <span className="ap-badge pending" style={{ background: '#ecfdf5', color: '#047857' }}>
                            Next: {req.currentApproverName}
                          </span>
                        )}
                        {!req.currentApproverName && req.approvalStage && (
                          <span className="ap-badge pending" style={{ background: '#f1f5f9', color: '#475569' }}>
                            Next: {getStageLabel(req.approvalStage)}
                          </span>
                        )}
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

                    <div style={{ marginTop: 8, fontSize: '.75rem', color: '#475569', fontWeight: 700 }}>
                      {getRequestStatusLabel(req)}
                    </div>

                    {Array.isArray(req.approvalTrail) && req.approvalTrail.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {req.approvalTrail.map((trailItem, idx) => (
                          <span
                            key={`${req.id}-trail-${idx}`}
                            className="ap-badge pending"
                            style={{ background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0' }}
                          >
                            {trailItem}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="ap-req-actions">
                      <button
                        className="ap-btn approve"
                        onClick={() => handleAction(req.id, 'approved')}
                        disabled={req.canAct === false}
                        title={req.canAct === false ? (req.pendingRemark || 'Not actionable at this stage') : 'Approve'}
                        style={req.canAct === false ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                      >
                        <FiCheck size={14} /> Approve
                      </button>
                      <button
                        className="ap-btn reject"
                        onClick={() => handleAction(req.id, 'rejected')}
                        disabled={req.canAct === false}
                        title={req.canAct === false ? (req.pendingRemark || 'Not actionable at this stage') : 'Reject'}
                        style={req.canAct === false ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                      >
                        <FiX size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Action History section removed from approvals tab ── */}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="animation-fade-in">
          <div className="ap-card">
            <div className="ap-card-head" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div className="ap-card-title">Leave History</div>
                <div className="ap-card-sub">
                  Total {totalHistory} processed records
                  {selectedTeam !== 'all' && (
                    <span style={{ marginLeft: 8, color: '#6b7280', fontWeight: 500 }}>
                      — {teams.find(t => t._id === selectedTeam)?.name || ''}
                    </span>
                  )}
                  {!isAllowedAdmin && teams.length === 1 && (
                    <span style={{ marginLeft: 8, color: '#10b981', fontWeight: 600 }}>
                      (Team: {teams[0].name})
                    </span>
                  )}
                </div>
              </div>
              <div className="ap-search-wrap">
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="ap-search-input"
                />
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="ap-empty">
                <p>No history records found.</p>
              </div>
            ) : (
              <>
                <div className="ap-history-wrap">
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Team</th>
                        <th>Type</th>
                        <th>Days</th>
                        <th>Date Range</th>
                        <th>Status</th>
                        <th>Approved/Rejected By</th>
                        <th>Stage / Next</th>
                        <th>Remark</th>
                        <th>Processed On</th>
                        {isAllowedAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map(req => (
                        <tr key={req.historyKey}>
                          <td className="td-name">{req.employeeName}</td>
                          <td>
                            {req.teamName
                              ? <span className="ap-badge-team">{req.teamName}</span>
                              : <span className="ap-text-dim">—</span>
                            }
                          </td>
                          <td>{req.leaveType}</td>
                          <td className="td-mono">
                            {req.is_half_day ? `Half Day (${formatSession(req.half_day_session)})` : `${req.totalDays}d`}
                          </td>
                          <td className="td-mono">{fmt(req.fromDate, 'dd MMM')} &rarr; {fmt(req.toDate, 'dd MMM')}</td>
                          <td>
                            <span className={`ap-status-badge ${req.status}`}>
                              {req.status === 'approved' ? <FiCheck size={10} /> : <FiX size={10} />}{' '}
                              {req.status?.charAt(0).toUpperCase() + req.status?.slice(1)}
                            </span>
                          </td>
                          <td className="td-dim">
                            {req.status === 'approved'
                              ? (req.approvedBy || '—')
                              : req.status === 'rejected'
                                ? (req.rejectedBy || '—')
                                : '—'}
                          </td>
                          <td className="td-dim">
                            {req.approvalStageLabel || getStageLabel(req.approvalStage)}
                            {req.currentApproverName ? ` • ${req.currentApproverName}` : ''}
                          </td>
                          <td className="td-dim" title={req.decisionRemark || req.rejectionReason || ''}>
                            {(req.decisionRemark || req.rejectionReason || '—')}
                          </td>
                          <td className="td-dim">
                            {req.actionDate ? new Date(req.actionDate).toLocaleDateString('en', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
                          </td>
                          {isAllowedAdmin && (
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="ap-icon-btn delete"
                                onClick={() => handleDeleteHistory(req.id)}
                                title="Delete Record"
                                style={{ color: '#ef4444' }}
                              >
                                <FiX size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="ap-pagination">
                  <button
                    disabled={historyPage === 1}
                    onClick={() => handlePageChange(historyPage - 1)}
                    className="ap-page-btn"
                  >
                    Previous
                  </button>
                  <span className="ap-page-info">
                    Page {historyPage} of {Math.ceil(totalHistory / historyLimit) || 1}
                  </span>
                  <button
                    disabled={historyPage >= Math.ceil(totalHistory / historyLimit)}
                    onClick={() => handlePageChange(historyPage + 1)}
                    className="ap-page-btn"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {rejectModal.open && (
        <div className="ap-modal-overlay" role="dialog" aria-modal="true" aria-label="Provide rejection reason">
          <div className="ap-modal-card">
            <div className="ap-modal-title">Provide rejection reason</div>
            <div className="ap-modal-sub">This reason is required to reject the leave request.</div>
            <textarea
              className="ap-modal-input"
              rows={4}
              value={rejectModal.remark}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, remark: e.target.value }))}
              placeholder="Type reason here..."
            />
            <div className="ap-modal-actions">
              <button className="ap-btn reject" onClick={() => setRejectModal({ open: false, id: null, remark: '' })}>
                <FiX size={14} /> Cancel
              </button>
              <button className="ap-btn approve" onClick={submitRejectAction}>
                <FiCheck size={14} /> Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveApproval;
