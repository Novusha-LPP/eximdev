import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { 
  FiCheck, FiX, FiRefreshCw, FiFileText, FiFilter, FiSearch, FiXCircle, 
  FiCalendar, FiUsers, FiBriefcase, FiClock, FiMoreVertical, FiChevronLeft, FiChevronRight 
} from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../../contexts/UserContext';
import attendanceAPI from '../../api/attendance/attendance.api';
import leaveAPI from '../../api/attendance/leave.api';
import { formatAttendanceDate, formatDate } from './utils/helpers';
import { API_BASE_URL } from './utils/constants';
import toast from 'react-hot-toast';
import './ApprovalPages.css';
import LeavePolicyManagement from './admin/LeavePolicyManagement';
import HolidayManagement from './admin/HolidayManagement';
import LeaveBalanceManagement from './admin/LeaveBalanceManagement';

// ── Cancel eligibility (30-day cutoff) ───────────────────────────────────────
const CANCEL_CUTOFF_DAYS = 30;
const isHistoryEligibleForCancel = (req) => {
  if (!['pending', 'approved'].includes(req.status)) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CANCEL_CUTOFF_DAYS);
  return new Date(req.fromDate || req.from_date) >= cutoff;
};

// ── Inline Cancel Modal ───────────────────────────────────────────────────────
const ApCancelModal = ({ req, onClose, onDone }) => {
  const fromDate = req.fromDate || req.from_date;
  const toDate   = req.toDate   || req.to_date;
  const isMultiDay = !req.is_half_day && fromDate !== toDate;
  const [cancelType, setCancelType] = useState('full');
  const [cancelFrom, setCancelFrom] = useState(formatAttendanceDate(fromDate, 'yyyy-MM-dd'));
  const [cancelTo,   setCancelTo]   = useState(formatAttendanceDate(toDate,   'yyyy-MM-dd'));
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const origFrom   = new Date(fromDate);
  const origTo     = new Date(toDate);
  const totalRange = Math.round((origTo - origFrom) / 86400000) + 1;

  const previewDays = () => {
    if (cancelType === 'full' || req.is_half_day) return req.totalDays;
    const cf = new Date(cancelFrom), ct = new Date(cancelTo);
    if (isNaN(cf) || isNaN(ct) || cf > ct) return 0;
    const cr = Math.round((ct - cf) / 86400000) + 1;
    return Math.max(0.5, Math.round((cr / totalRange) * req.totalDays * 2) / 2);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        cancellation_reason: reason,
        cancel_type: (cancelType === 'partial' && isMultiDay) ? 'partial' : 'full',
      };
      if (payload.cancel_type === 'partial') { payload.cancel_from = cancelFrom; payload.cancel_to = cancelTo; }
      const res = await leaveAPI.cancelLeave(req.id, payload);
      toast.success(res.message || 'Leave cancelled');
      window.dispatchEvent(new CustomEvent('leave-balance-updated'));
      onDone();
    } catch (err) { toast.error(err?.message || 'Failed to cancel leave'); }
    finally { setSubmitting(false); }
  };

  const estDays = previewDays();

  return (
    <div className="ap-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ap-modal-card" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="ap-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiXCircle size={14} /> Cancel Leave
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: '.8125rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontWeight: 700 }}>{req.leaveType}</div>
          <div style={{ color: '#475569' }}>
            {formatAttendanceDate(fromDate, 'dd MMM yyyy')} - {formatAttendanceDate(toDate, 'dd MMM yyyy')} &bull; {req.is_half_day ? 'Half Day' : `${req.totalDays}d`}
          </div>
          <span className={`ap-status-badge ${req.status}`} style={{ alignSelf: 'flex-start', marginTop: 2 }}>
            {req.status?.charAt(0).toUpperCase() + req.status?.slice(1)}
          </span>
        </div>
        {isMultiDay && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 6 }}>Cancellation Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['full', 'partial'].map(t => (
                <button key={t} type="button" onClick={() => setCancelType(t)}
                  style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: '1.5px solid', cursor: 'pointer',
                    borderColor: cancelType === t ? '#3b82f6' : '#e2e8f0',
                    background: cancelType === t ? '#eff6ff' : '#fff',
                    color: cancelType === t ? '#1d4ed8' : '#374151',
                    fontWeight: cancelType === t ? 700 : 500, fontSize: '.8125rem' }}
                >
                  {t === 'full' ? 'Full Cancellation' : 'Partial Days'}
                </button>
              ))}
            </div>
          </div>
        )}
        {cancelType === 'partial' && isMultiDay && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 4 }}>From</label>
              <input type="date" value={cancelFrom}
                min={formatAttendanceDate(fromDate, 'yyyy-MM-dd')} max={formatAttendanceDate(toDate, 'yyyy-MM-dd')}
                onChange={e => setCancelFrom(e.target.value)}
                style={{ width: '100%', height: 34, borderRadius: 6, border: '1px solid #e5e7eb', padding: '0 8px', fontSize: '.8125rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 4 }}>To</label>
              <input type="date" value={cancelTo}
                min={cancelFrom || formatAttendanceDate(fromDate, 'yyyy-MM-dd')} max={formatAttendanceDate(toDate, 'yyyy-MM-dd')}
                onChange={e => setCancelTo(e.target.value)}
                style={{ width: '100%', height: 34, borderRadius: 6, border: '1px solid #e5e7eb', padding: '0 8px', fontSize: '.8125rem' }}
              />
            </div>
          </div>
        )}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: '.8125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#166534' }}>Days to be restored:</span>
          <strong style={{ color: '#15803d', fontSize: '1rem' }}>{estDays}d</strong>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 4 }}>Reason <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
          <textarea className="ap-modal-input" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for cancellation..." />
        </div>
        <div className="ap-modal-actions">
          <button className="ap-btn reject" onClick={onClose}><FiX size={13} /> Keep Leave</button>
          <button className="ap-btn approve" disabled={submitting} onClick={handleSubmit}>
            <FiXCircle size={13} /> {submitting ? 'Cancelling...' : 'Confirm Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

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
  stage_1_hod: 'HOD Approval',
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

const getMetaSequenceLabel = (req) => {
  const status = String(req?.status || '').toLowerCase();
  if (status.startsWith('pending_')) return status;
  if (req?.approvalStage === 'stage_1_hod') return 'pending_hod';
  if (req?.approvalStage === 'stage_2_shalini') return 'pending_shalini';
  if (req?.approvalStage === 'stage_3_final') return 'pending_final';
  return String(req?.approvalStageLabel || getStageLabel(req?.approvalStage) || 'pending').toLowerCase().replaceAll(' ', '_');
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

  const organizationName = raw.organizationName || raw.organization_name || raw.company_name || raw.company?.name || raw.company_id?.company_name || raw.companyId?.company_name || raw.employee_id?.company_id?.company_name || raw.employee_id?.company_name || 'General';
  return {
    ...raw,
    id: raw.id || raw._id,
    employeeName: raw.employeeName || raw.employee_name || 'Unknown',
    employeeId: raw.employeeId || raw.employee_id,
    teamName: raw.teamName || raw.team_name || null,
    organizationName,
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

  const isAdmin = isAdminRole(user?.role) || isAllowedUser(username);
  const isHOD = isHodRole(user?.role);
  const canManageAdminTools = isAdminRole(user?.role) && isAllowedUser(username);
  const [isAllowedAdmin, setIsAllowedAdmin] = useState(canManageAdminTools);

  const [activeTab, setActiveTab] = useState(location.state?.tab || 'approvals');
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, remark: '' });
  const [cancelModal, setCancelModal] = useState(null);

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [approvalsSearch, setApprovalsSearch] = useState('');
  const [groupBy, setGroupBy] = useState('none');

  const [totalHistory, setTotalHistory] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState('');
  const [historyMonth, setHistoryMonth] = useState('');
  const historyLimit = 20;

  const fetchRequests = useCallback(async (teamId = 'all', page = 1, search = '', month = '') => {
    try {
      setLoading(true);
      setError(null);
      let pendingLeaves = [];
      let processedLeaves = [];
      let total = 0;

      if (isAdmin) {
        const res = await attendanceAPI.getAdminLeaveRequests(teamId !== 'all' ? teamId : undefined, page, historyLimit, search, month);
        pendingLeaves = (res?.data?.pendingLeaves || []).map(normalizeLeaveRecord);
        processedLeaves = (res?.data?.recentProcessedLeaves || []).map(h => {
          const normalized = normalizeLeaveRecord(h);
          return { ...normalized, historyKey: `hist-${normalized.id}-${new Date(normalized.actionDate || Date.now()).getTime()}` };
        });
        total = res?.data?.totalHistory || 0;
        if (teams.length === 0 && res?.data?.teams?.length > 0) setTeams(res.data.teams);
        if (res?.data?.isAllowedAdmin !== undefined) setIsAllowedAdmin(res.data.isAllowedAdmin);
      } else {
        const res = await attendanceAPI.getHODDashboard();
        pendingLeaves = (res?.data?.pendingLeaves || []).map(normalizeLeaveRecord);
        processedLeaves = (res?.data?.recentProcessedLeaves || []).map(h => {
          const normalized = normalizeLeaveRecord(h);
          return { ...normalized, historyKey: `hist-${normalized.id}-${new Date(normalized.actionDate || Date.now()).getTime()}` };
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
      const filteredPending = dedupedPending.filter((record) => {
        if (!isAdmin || isAllowedUser(username)) return true;
        return String(record.employeeId || '') !== String(user?._id || '');
      });

      setRequests(filteredPending);
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

  useEffect(() => { fetchRequests(selectedTeam, 1, '', ''); }, []);

  useEffect(() => {
    if (activeTab !== 'history') return;
    const t = setTimeout(() => fetchRequests(selectedTeam, historyPage, historySearch, historyMonth), 500);
    return () => clearTimeout(t);
  }, [historySearch, historyMonth, historyPage, activeTab, selectedTeam]);

  const handleTeamChange = (e) => { const val = e.target.value; setSelectedTeam(val); fetchRequests(val, 1); };
  const handlePageChange = (newPage) => fetchRequests(selectedTeam, newPage);
  const handleHistoryCancel = (req) => setCancelModal(req);

  const handleDeleteHistory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this leave history record? This action cannot be undone.')) return;
    try {
      await attendanceAPI.deleteLeaveApplication(id);
      toast.success('History record deleted');
      fetchRequests(selectedTeam, historyPage);
    } catch (err) { toast.error(err.message || 'Failed to delete record'); }
  };

  const processAction = async (id, status, remark = '') => {
    const acted = requests.find(r => String(r.id) === String(id));
    if (!acted) return;
    setRequests(prev => prev.filter(r => String(r.id) !== String(id)));
    try {
      const response = await attendanceAPI.approveRequest('leave', id, status, remark);
      toast.success(response?.message || `Leave ${status}`);
      setHistory(h => h.some(r => String(r.id) === String(id)) ? h :
        [{ ...acted, status, actionDate: new Date().toISOString(), historyKey: `${id}-${Date.now()}`,
          approvedBy: status === 'approved' ? (user?.name || user?.username || 'You') : null,
          rejectedBy: status === 'rejected' ? (user?.name || user?.username || 'You') : null,
          decisionRemark: remark || '' }, ...h]);
    } catch {
      toast.error('Action failed');
      setRequests(prev => [acted, ...prev]);
    }
  };

  const handleAction = async (id, status) => {
    if (status === 'rejected') { setRejectModal({ open: true, id, remark: '' }); return; }
    await processAction(id, status);
  };

  const submitRejectAction = async () => {
    const remark = rejectModal.remark.trim();
    if (!remark) { toast.error('Rejection reason is required.'); return; }
    const rejectId = rejectModal.id;
    setRejectModal({ open: false, id: null, remark: '' });
    await processAction(rejectId, 'rejected', remark);
  };

  const filteredRequests = useMemo(() => requests.filter(r =>
    (r.employeeName || '').toLowerCase().includes(approvalsSearch.toLowerCase()) ||
    (r.leaveType || '').toLowerCase().includes(approvalsSearch.toLowerCase())
  ), [requests, approvalsSearch]);

  const getOrganization = useCallback((req) => req.organizationName || req.teamName || 'General', []);

  const groupedRequests = useMemo(() => {
    if (groupBy === 'none') return { 'All Requests': filteredRequests };
    const grouped = filteredRequests.reduce((acc, req) => {
      const org = getOrganization(req);
      if (!acc[org]) acc[org] = [];
      acc[org].push(req);
      return acc;
    }, {});
    return Object.keys(grouped).sort((a, b) => String(a).localeCompare(String(b))).reduce((acc, key) => {
      acc[key] = grouped[key];
      return acc;
    }, {});
  }, [filteredRequests, groupBy, getOrganization]);

  const filteredHistory = history.filter(h =>
    (h.employeeName || '').toLowerCase().includes(historySearch.toLowerCase()) ||
    (h.leaveType || '').toLowerCase().includes(historySearch.toLowerCase())
  );

  const TABS = useMemo(() => [
    { key: 'approvals', label: 'Leave Approvals', count: requests.length },
    { key: 'history', label: 'Leave History', count: 0 },
    ...(canManageAdminTools ? [{ key: 'policy', label: 'Leave Policy', count: 0 }] : []),
  ], [requests.length, canManageAdminTools]);

  if (loading && requests.length === 0) return (
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

  return (
    <div className="ap-page">
      <div className="ap-header">
        <div>
          <h1><FiCalendar size={28} style={{ color: '#1e293b' }} /> Leave &amp; Holidays</h1>
          <p>Manage leave requests, policies, and upcoming holidays</p>
        </div>
        <div className="ap-header-actions">
          {(activeTab === 'approvals' || activeTab === 'history') && (
            <>
              {activeTab === 'approvals' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 600 }}>
                  <FiUsers size={14} color="#64748b" />
                  <span style={{ color: '#64748b' }}>Group by</span>
                  <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}
                    style={{ border: 'none', background: 'transparent', fontWeight: '700', color: '#0f172a', cursor: 'pointer', outline: 'none' }}>
                    <option value="none">None</option>
                    <option value="organization">Team</option>
                  </select>
                </div>
              )}
              {(isAdmin || isHOD) && teams.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <FiFilter size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <select value={selectedTeam} onChange={handleTeamChange}
                    style={{ height: 40, border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0 12px 0 34px', fontSize: '13px', fontWeight: 600, background: '#fff', color: '#0f172a', cursor: 'pointer', minWidth: '140px' }}>
                    <option value="all">All Teams</option>
                    {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <button className="ap-icon-btn" style={{ height: 40, borderRadius: '12px', padding: '0 16px' }} onClick={() => fetchRequests(selectedTeam, historyPage)}>
                <FiRefreshCw size={14} /> Refresh
              </button>
            </>
          )}
        </div>
      </div>

      <div className="ap-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`ap-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
            {t.count > 0 && <span className="ap-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'balances' && isAllowedAdmin && <div className="animation-fade-in"><LeaveBalanceManagement /></div>}
      {activeTab === 'policy'   && isAllowedAdmin && <div className="animation-fade-in"><LeavePolicyManagement embedded readOnly /></div>}
      {activeTab === 'holiday'  && isAllowedAdmin && <div className="animation-fade-in"><HolidayManagement embedded readOnly /></div>}

      {activeTab === 'approvals' && (
        <div className="animation-fade-in">
          <div className="ap-card">
            <div className="ap-card-head">
              <div>
                <div className="ap-card-title">Pending Approvals</div>
                <div className="ap-card-sub">{requests.length} requests awaiting decision</div>
              </div>
              <div className="ap-search-wrap">
                <FiSearch size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input type="text" placeholder="Search request..." value={approvalsSearch}
                  onChange={(e) => setApprovalsSearch(e.target.value)} className="ap-search-input" />
              </div>
            </div>

            <div className="ap-list-header">
              <span>Employee</span>
              <span>Type &amp; Duration</span>
              <span>Date(s)</span>
              <span>Reason</span>
              <span>Meta</span>
              <span style={{ textAlign: 'right' }}>Action</span>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="ap-empty">
                <div className="ap-empty-icon" style={{ color: '#cbd5e1' }}><FiCheck size={48} /></div>
                <p style={{ fontWeight: 600, color: '#64748b' }}>All caught up! No pending requests.</p>
              </div>
            ) : (
              <div className="ap-request-list">
                {Object.keys(groupedRequests).map(group => (
                  <React.Fragment key={group}>
                    {groupBy !== 'none' && (
                      <div className="ap-org-section-header">
                        <span className="ap-org-name">{group}</span>
                        <span className="ap-org-count">{groupedRequests[group].length}</span>
                      </div>
                    )}
                    {groupedRequests[group].map(req => (
                      <div key={String(req.id)} className="ap-request-item">

                        {/* ── Col 1: Employee — avatar LEFT, name+team RIGHT stacked ── */}
                        <div className="ap-req-top">
                          <div className="ap-req-av">{initials(req.employeeName)}</div>
                          <div className="ap-req-info">
                            {/* Row 1: full name */}
                            <div className="ap-req-name">{req.employeeName}</div>
                            {/* Row 2: team name */}
                            <div className="ap-req-dept">{req.teamName || 'No Team'}</div>
                          </div>
                        </div>

                        {/* ── Col 2: Type & Duration ── */}
                        <div className="ap-col-type">
                          <span className="ap-badge purple" style={{ gap: 6 }}>
                            <FiClock size={10} /> {req.approvalStageLabel || 'HOD Approval'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                            <FiCalendar size={10} /> {req.is_half_day ? '0.5 Day' : `${req.totalDays} Day`}
                          </div>
                        </div>

                        {/* ── Col 3: Date(s) — date on top, "X days" pill below ── */}
                        <div className="ap-col-dates">
                          <span className="ap-date-val">{fmt(req.fromDate, 'dd MMM yyyy')}</span>
                          {fmt(req.fromDate, 'dd MMM yyyy') !== fmt(req.toDate, 'dd MMM yyyy') && (
                            <span className="ap-date-to">to {fmt(req.toDate, 'dd MMM yyyy')}</span>
                          )}
                          {/* Duration pill shown below the date */}
                          <span className="ap-date-dur">
                            <FiCalendar size={9} />
                            {req.is_half_day ? 'Half Day' : `${req.totalDays} Day${req.totalDays !== 1 ? 's' : ''}`}
                          </span>
                        </div>

                        {/* ── Col 4: Reason ── */}
                        <div className="ap-req-reason" title={req.reason}>
                          {req.reason ? `"${req.reason}"` : <span style={{ color: '#cbd5e1' }}>No reason provided</span>}
                        </div>

                        {/* ── Col 5: Meta ── */}
                        <div className="ap-req-meta">
                          {/* Row 1: leave type + team badge side by side */}
                          <div className="ap-req-meta-row">
                            <span className="ap-badge blue">{req.leaveType}</span>
                            <span className="ap-badge gray">{getMetaSequenceLabel(req)}</span>
                          </div>
                          {/* Row 2: next approver below */}
                          {req.currentApproverName && (
                            <span className="ap-badge green" style={{ fontSize: '10px' }}>
                              Next: {req.currentApproverName}
                            </span>
                          )}
                        </div>



                        {/* ── Col 7: Actions — Approve + Reject side by side ── */}
                        <div className="ap-req-actions" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          <button className="ap-btn-outline approve"
                            onClick={() => handleAction(req.id, 'approved')}
                            disabled={req.canAct === false}>
                            <FiCheck size={14} /> Approve
                          </button>
                          <button className="ap-btn-outline reject"
                            onClick={() => handleAction(req.id, 'rejected')}
                            disabled={req.canAct === false}>
                            <FiX size={14} /> Reject
                          </button>
                          <FiMoreVertical size={16} color="#94a3b8" style={{ cursor: 'pointer', marginLeft: 4 }} />
                        </div>

                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="animation-fade-in">
          <div className="ap-card">
            <div className="ap-card-head" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
              <div>
                <div className="ap-card-title">Leave History</div>
                <div className="ap-card-sub">Total {totalHistory} processed records</div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="ap-search-wrap" style={{ width: '240px' }}>
                  <FiSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input type="text" placeholder="Search employee..." value={historySearch}
                    onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                    className="ap-search-input" style={{ height: 38, paddingLeft: 36 }} />
                </div>
                <input type="month" value={historyMonth}
                  onChange={(e) => { setHistoryMonth(e.target.value); setHistoryPage(1); }}
                  style={{ height: 38, border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0 12px', fontSize: '13px', fontWeight: 600, background: '#fff' }} />
              </div>
            </div>

            <div className="ap-history-wrap">
              <table className="ap-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '10px 14px', borderRadius: '12px 0 0 0', color: '#0f172a', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Employee</th>
                    <th style={{ padding: '10px 12px', color: '#0f172a', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                    <th style={{ padding: '10px 12px', color: '#0f172a', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Duration</th>
                    <th style={{ padding: '10px 12px', color: '#0f172a', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Date Range</th>
                    <th style={{ padding: '10px 12px', color: '#0f172a', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                    <th style={{ padding: '10px 12px', color: '#0f172a', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Decision By</th>
                    <th style={{ padding: '10px 14px', borderRadius: '0 12px 0 0', textAlign: 'right', color: '#0f172a', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(req => (
                    <tr key={req.historyKey}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>{req.employeeName}</td>
                      <td style={{ padding: '10px 12px' }}><span className="ap-badge blue">{req.leaveType}</span></td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: '13px' }}>{req.is_half_day ? 'Half Day' : `${req.totalDays}d`}</td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: '#475569' }}>
                        {fmt(req.fromDate, 'dd MMM')} – {fmt(req.toDate, 'dd MMM')}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={`ap-status-badge ${req.status}`}>
                          {req.status === 'approved' ? <FiCheck size={10} /> : <FiX size={10} />} {req.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b' }}>
                        {req.status === 'approved' ? (req.approvedBy || '—') : (req.rejectedBy || '—')}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        {isHistoryEligibleForCancel(req) && (
                          <button className="ap-icon-btn" style={{ color: '#ef4444', border: 'none' }} onClick={() => setCancelModal(req)}>
                            <FiXCircle size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ap-pagination">
              <button className="ap-page-btn" disabled={historyPage === 1} onClick={() => handlePageChange(historyPage - 1)}>
                <FiChevronLeft size={18} />
              </button>
              {[...Array(Math.ceil(totalHistory / historyLimit) || 1)].map((_, i) => (
                <button key={i} className={`ap-page-btn ${historyPage === i + 1 ? 'active' : ''}`} onClick={() => handlePageChange(i + 1)}>
                  {i + 1}
                </button>
              ))}
              <button className="ap-page-btn" disabled={historyPage >= Math.ceil(totalHistory / historyLimit)} onClick={() => handlePageChange(historyPage + 1)}>
                <FiChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModal.open && (
        <div className="ap-modal-overlay" role="dialog" aria-modal="true" aria-label="Provide rejection reason">
          <div className="ap-modal-card">
            <div className="ap-modal-title">Provide rejection reason</div>
            <div className="ap-modal-sub">This reason is required to reject the leave request.</div>
            <textarea className="ap-modal-input" rows={4} value={rejectModal.remark}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, remark: e.target.value }))}
              placeholder="Type reason here..." />
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

      {cancelModal && (
        <ApCancelModal req={cancelModal} onClose={() => setCancelModal(null)}
          onDone={() => { setCancelModal(null); fetchRequests(selectedTeam, historyPage); }} />
      )}
    </div>
  );
};

export default LeaveApproval;