import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers, FiCheckCircle, FiXCircle, FiCalendar, FiClock,
  FiSettings, FiChevronRight, FiBookOpen, FiFileText, FiGrid,
  FiRefreshCw, FiLogIn, FiLogOut, FiCheck, FiX,
  FiAlertCircle, FiSun, FiActivity, FiLayers
} from 'react-icons/fi';
import attendanceAPI from '../../api/attendance/attendance.api';
import masterAPI from '../../api/attendance/master.api';
import { API_BASE_URL } from './utils/constants';
import toast from 'react-hot-toast';
import './AdminDashboard.css';

/* -- utils -- */
const fmtTime = iso =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
const fmtLate = mins => {
  const m = parseInt(mins || 0);
  return m < 60 ? `+${m}m` : `+${Math.floor(m / 60)}h ${m % 60}m`;
};

const HOLIDAY_EMOJIS = {
  holi: '🎨', diwali: '🪔', christmas: '🎄',
  'new year': '🎆', eid: '🌙', independence: '🇮🇳',
  republic: '🇮🇳', gandhi: '🏛️', navratri: '🕉️',
  pongal: '🍚', onam: '🥣'
};
const getHolidayEmoji = (name = '', type = '') => {
  const n = name.toLowerCase();
  const found = Object.entries(HOLIDAY_EMOJIS).find(([k]) => n.includes(k));
  return found ? found[1] : (type === 'national' ? '🏛️' : '📅');
};

const formatSession = (s) => (s === 'first_half' ? '1st Half' : '2nd Half');

/* ---------------------------------------------------
   MAIN
--------------------------------------------------- */
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [approving, setApproving] = useState({});
  const [myStatus, setMyStatus] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [data, setData] = useState({
    stats: { total: 0, present: 0, absent: 0, onLeave: 0, late: 0, trends: {} },
    absentToday: [], lateToday: [],
    pendingLeaves: [], pendingRegularization: [],
  });

  const quickActions = [
    { icon: <FiActivity size={14} />, label: 'Attendance Report', desc: 'Company-wide records & export', path: '/attendance/admin/attendance' },
    { icon: <FiCalendar size={14} />, label: 'Manage Holidays', desc: 'Configure public & optional', path: '/attendance/admin/holidays' },
    { icon: <FiClock size={14} />, label: 'Shift Management', desc: 'Timings, grace & week-offs', path: '/attendance/admin/shifts' },
    { icon: <FiBookOpen size={14} />, label: 'Leave Policies', desc: 'Quotas, accrual & rules', path: '/attendance/admin/leave-policies' },
    { icon: <FiSettings size={14} />, label: 'System Settings', desc: 'Company & security config', path: '/attendance/admin/settings' },
  ];

  const load = useCallback(async (selectedCompanyId) => {
    try {
      setLoading(true);
      const [dashRes, myRes, holRes] = await Promise.all([
        attendanceAPI.getAdminDashboard(selectedCompanyId ? { company_id: selectedCompanyId } : {}),
        attendanceAPI.getTodayStatus().catch(() => null),
        masterAPI.getHolidays({ limit: 5, company_id: selectedCompanyId }).catch(() => null),
      ]);
      if (dashRes?.success) setData(dashRes.data);
      if (myRes) setMyStatus(myRes);
      if (holRes?.data) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        setHolidays(
          holRes.data
            .filter(h => new Date(h.holiday_date) >= today)
            .sort((a, b) => new Date(a.holiday_date) - new Date(b.holiday_date))
            .slice(0, 4)
        );
      }
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  const loadCompanies = useCallback(async () => {
    try {
      const res = await masterAPI.getCompanies();
      const list = res?.data || [];
      setCompanies(list);
      if (!companyId && list.length > 0) {
        setCompanyId(list[0]._id);
        await load(list[0]._id);
        return;
      }
    } catch {
      // non-admins or fetch failure can ignore
    }
    await load(companyId);
  }, [companyId, load]);

  const handlePunch = async () => {
    try {
      setPunching(true);
      const isIn = myStatus?.isInSession ?? (myStatus?.first_in && !myStatus?.last_out);
      await attendanceAPI.punch({ type: isIn ? 'OUT' : 'IN', method: 'WEB' });
      toast.success(`Punched ${isIn ? 'OUT' : 'IN'}`);
      load();
    } catch (e) { toast.error(e?.message || 'Punch failed'); }
    finally { setPunching(false); }
  };

  const handleApprove = async (id, type, status) => {
    setApproving(p => ({ ...p, [id]: true }));
    try {
      await attendanceAPI.approveRequest(type, id, status);
      toast.success(status === 'approved' ? 'Approved' : 'Rejected');
      load();
    } catch { toast.error('Action failed'); }
    finally { setApproving(p => ({ ...p, [id]: false })); }
  };

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  if (loading) return (
    <div className="loading-state"><div className="spinner" /><p>Loading dashboard...</p></div>
  );

  const { stats = {}, absentToday = [], lateToday = [],
    pendingLeaves = [], pendingRegularization = [] } = data;

  const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
  const isIn = myStatus?.isInSession ?? (myStatus?.first_in && !myStatus?.last_out);
  const pendingCount = pendingLeaves.length + pendingRegularization.length;
  const allPending = [
    ...pendingLeaves.map(r => ({ ...r, _kind: 'leave' })),
    ...pendingRegularization.map(r => ({ ...r, _kind: 'reg' })),
  ];

  return (
    <div className="dashboard-container">

      {/* --- HERO BANNER --- */}
      <div className="db-hero">
        <div className="db-hero-top">
          <div>
            <h1 className="db-hero-title">Executive Dashboard</h1>
            <p className="db-hero-sub">
              {new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="db-hero-right">
            {companies.length > 0 && (
              <select
                className="db-company-select"
                value={companyId}
                onChange={e => { setCompanyId(e.target.value); load(e.target.value); }}
              >
                {companies.map(c => <option key={c._id} value={c._id}>{c.company_name}</option>)}
              </select>
            )}

            <div className="db-punch-widget">
              <div className="db-punch-times">
                <span className="db-punch-times-label">My Attendance</span>
                <div className="db-punch-times-row">
                  <span className={myStatus?.first_in ? 't-in' : ''}>
                    <FiLogIn size={10} /> {fmtTime(myStatus?.first_in)}
                  </span>
                  <span className={myStatus?.last_out ? 't-out' : ''}>
                    <FiLogOut size={10} /> {fmtTime(myStatus?.last_out)}
                  </span>
                </div>
              </div>
              <button
                className={`db-punch-btn ${isIn ? 'btn-out' : 'btn-in'}`}
                onClick={handlePunch} disabled={punching}
              >
                {isIn ? <FiLogOut size={13} /> : <FiLogIn size={13} />}
                {punching ? 'Please wait...' : isIn ? 'Punch Out' : 'Punch In'}
              </button>
            </div>

            <div
              className="db-rate-donut"
              style={{ '--rate': `${attendanceRate * 3.6}deg` }}
              title={`${attendanceRate}% attendance rate today`}
            >
              <div className="db-rate-inner">
                <span className="db-rate-val">{attendanceRate}%</span>
                <span className="db-rate-lbl">rate</span>
              </div>
            </div>

            <button className="db-hero-refresh" onClick={load} title="Refresh">
              <FiRefreshCw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* --- FLOATING STAT TILES --- */}
      <div className="db-stats-float">
        <div className="stat-tile st-present">
          <div className="stat-tile-header">
            <div className="stat-tile-icon"><FiCheckCircle size={15} /></div>
            <span className="stat-chip">Today</span>
          </div>
          <div className="stat-tile-value">{stats.present ?? 0}</div>
          <div className="stat-tile-label">Present</div>
          <div className="stat-tile-sub">of {stats.total ?? 0} employees</div>
        </div>

        <div className="stat-tile st-absent">
          <div className="stat-tile-header">
            <div className="stat-tile-icon"><FiXCircle size={15} /></div>
            <span className="stat-chip">Alert</span>
          </div>
          <div className="stat-tile-value">{stats.absent ?? 0}</div>
          <div className="stat-tile-label">Absent</div>
          <div className="stat-tile-sub">unexcused today</div>
        </div>

        <div className="stat-tile st-late">
          <div className="stat-tile-header">
            <div className="stat-tile-icon"><FiClock size={15} /></div>
            <span className="stat-chip">Watch</span>
          </div>
          <div className="stat-tile-value">{stats.late ?? 0}</div>
          <div className="stat-tile-label">Late In</div>
          <div className="stat-tile-sub">after shift start</div>
        </div>

        <div className="stat-tile st-leave">
          <div className="stat-tile-header">
            <div className="stat-tile-icon"><FiSun size={15} /></div>
            <span className="stat-chip">Approved</span>
          </div>
          <div className="stat-tile-value">{stats.onLeave ?? 0}</div>
          <div className="stat-tile-label">On Leave</div>
          <div className="stat-tile-sub">approved absences</div>
        </div>

        <div className="stat-tile st-total">
          <div className="stat-tile-header">
            <div className="stat-tile-icon"><FiUsers size={15} /></div>
            {pendingCount > 0
              ? <span className="stat-chip" style={{ background: '#fdf6e8', color: '#c87f0a', border: '1px solid #fde5aa' }}>{pendingCount} pending</span>
              : <span className="stat-chip">All good</span>
            }
          </div>
          <div className="stat-tile-value">{stats.total ?? 0}</div>
          <div className="stat-tile-label">Total Employees</div>
          <div className="stat-tile-sub">across all teams</div>
        </div>
      </div>

      {/* --- SECTION NAVIGATION TABS --- */}
      <div className="db-section-nav">
        <div className="db-section-nav-inner">
          <button
            className={`db-snav-tab ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveSection('overview')}
          >
            <FiGrid size={13} />
            Overview
          </button>
          <button
            className={`db-snav-tab ${activeSection === 'approvals' ? 'active' : ''}`}
            onClick={() => setActiveSection('approvals')}
          >
            <FiAlertCircle size={13} />
            Approvals
            {pendingCount > 0 && <span className="db-snav-badge">{pendingCount}</span>}
          </button>
          <button
            className={`db-snav-tab ${activeSection === 'tools' ? 'active' : ''}`}
            onClick={() => setActiveSection('tools')}
          >
            <FiLayers size={13} />
            Quick Tools
          </button>
        </div>
      </div>

      {/* ====== OVERVIEW SECTION ====== */}
      {activeSection === 'overview' && (
        <div className="db-content">

          {/* -- LEFT -- */}
          <div className="db-left">

            {/* Absent Today */}
            <div className="db-card">
              <div className="db-card-header">
                <span className="db-card-title">
                  <FiXCircle size={13} className="db-card-title-icon" style={{ color: '#d63031' }} />
                  Absent Today
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {absentToday.length > 0 && <span className="db-card-badge dbb-red">{absentToday.length} absent</span>}
                  <button className="db-view-all" onClick={() => navigate('/attendance/admin/attendance', { state: { companyId } })}>
                    View all <FiChevronRight size={12} />
                  </button>
                </div>
              </div>
              <div className="absent-list">
                {absentToday.length > 0 ? absentToday.slice(0, 7).map((emp, i) => (
                  <div key={i} className="absent-row">
                    <div className="absent-avatar">{(emp.name || '?')[0].toUpperCase()}</div>
                    <div className="absent-info">
                      <div className="absent-name">{emp.name}</div>
                      <div className="absent-dept">Team Member</div>
                    </div>
                    <span className={`absent-tag ${emp.status === 'leave' ? 'on-leave' : ''}`}>
                      {emp.status === 'leave' ? 'On Leave' : 'Absent'}
                    </span>
                  </div>
                )) : (
                  <div className="db-empty">
                    <FiCheckCircle size={32} style={{ color: '#b6e8d6' }} />
                    <p>Full house today! 🎉</p>
                    <span>No unexplained absences – great attendance.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Late Arrivals */}
            {lateToday.length > 0 && (
              <div className="db-card">
                <div className="db-card-header">
                  <span className="db-card-title">
                    <FiClock size={13} className="db-card-title-icon" style={{ color: '#c87f0a' }} />
                    Late Arrivals Today
                  </span>
                  <span className="db-card-badge dbb-amber">{lateToday.length}</span>
                </div>
                <div className="late-grid-list">
                  {lateToday.slice(0, 6).map((emp, i) => (
                    <div key={i} className="late-row">
                      <div className="late-avatar">{(emp.name || '?')[0].toUpperCase()}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="late-name">{emp.name}</div>
                        <div className="late-meta">In: {fmtTime(emp.inTime || emp.first_in)}</div>
                      </div>
                      <span className="late-badge">{fmtLate(emp.lateBy || emp.late_by)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Approvals — compact inline preview */}
            {pendingCount > 0 && (
              <div className="db-card db-approvals-hint" onClick={() => setActiveSection('approvals')} style={{ cursor: 'pointer' }}>
                <div className="db-card-header">
                  <span className="db-card-title">
                    <FiAlertCircle size={13} className="db-card-title-icon" style={{ color: '#c87f0a' }} />
                    Pending Approvals
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="db-card-badge dbb-amber">{pendingCount} awaiting</span>
                    <button className="db-view-all" onClick={e => { e.stopPropagation(); setActiveSection('approvals'); }}>
                      Review <FiChevronRight size={12} />
                    </button>
                  </div>
                </div>
                <div className="db-approvals-preview">
                  {allPending.slice(0, 4).map((req, i) => (
                    <div key={i} className="db-appr-preview-row">
                      <div className="db-appr-avatar">{(req.employeeName || '?')[0].toUpperCase()}</div>
                      <div className="db-appr-preview-info">
                        <span className="db-appr-name">{req.employeeName}</span>
                        <span className={`db-appr-kind-pill ${req._kind}`}>
                          {req._kind === 'leave' ? (req.leaveType || 'Leave') : 'Regularization'}
                        </span>
                      </div>
                      <div className="db-appr-preview-actions" onClick={e => e.stopPropagation()}>
                        <button className="ab-approve" disabled={approving[req.id]}
                          onClick={() => handleApprove(req.id, req._kind === 'leave' ? 'leave' : 'regularization', 'approved')}>
                          <FiCheck size={10} />
                        </button>
                        <button className="ab-reject" disabled={approving[req.id]}
                          onClick={() => handleApprove(req.id, req._kind === 'leave' ? 'leave' : 'regularization', 'rejected')}>
                          <FiX size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {allPending.length > 4 && (
                    <div className="db-appr-preview-more">
                      +{allPending.length - 4} more — click to review all
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* -- RIGHT SIDEBAR -- */}
          <div className="db-right">

            {/* Upcoming Holidays */}
            <div className="db-card">
              <div className="db-card-header">
                <span className="db-card-title">
                  <FiCalendar size={13} className="db-card-title-icon" />
                  Upcoming Holidays
                </span>
                <button className="db-view-all" onClick={() => navigate('/attendance/admin/holidays')}>
                  Manage <FiChevronRight size={12} />
                </button>
              </div>
              <div className="holiday-list">
                {holidays.length > 0 ? holidays.map((h, i) => {
                  const d = new Date(h.holiday_date);
                  const type = h.holiday_type || 'national';
                  return (
                    <div key={i} className="holiday-row">
                      <div className={`holiday-cal ht-${type}`}>
                        <span className="hc-mon">{d.toLocaleString('default', { month: 'short' })}</span>
                        <span className="hc-day">{d.getDate()}</span>
                      </div>
                      <div className="holiday-info">
                        <div className="holiday-name">{getHolidayEmoji(h.holiday_name, type)} {h.holiday_name}</div>
                        <div className="holiday-sub">{d.toLocaleString('default', { weekday: 'long' })}</div>
                      </div>
                      <span className={`holiday-pill hp-${type}`}>{type}</span>
                    </div>
                  );
                }) : (
                  <div className="db-empty-sm">
                    <FiCalendar size={20} style={{ color: '#e4eaf2' }} />
                    <p>No upcoming holidays</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ====== APPROVALS SECTION ====== */}
      {activeSection === 'approvals' && (
        <div className="db-content-approvals">
          <div className="db-card db-approvals-card">
            <div className="db-card-header">
              <span className="db-card-title">
                <FiAlertCircle size={13} className="db-card-title-icon" style={{ color: '#c87f0a' }} />
                Pending Approvals
                {pendingCount > 0 && (
                  <span className="db-card-badge dbb-amber" style={{ marginLeft: 8 }}>
                    {pendingCount} awaiting
                  </span>
                )}
              </span>
              <button className="db-view-all" onClick={() => navigate('/attendance/hod/leave-approval')}>
                Full Approvals Page <FiChevronRight size={12} />
              </button>
            </div>

            {allPending.length === 0 ? (
              <div className="db-empty">
                <FiCheckCircle size={40} style={{ color: '#b6e8d6' }} />
                <p>All caught up! ✨</p>
                <span>No pending leave or regularization requests.</span>
              </div>
            ) : (
              <div className="db-approvals-grid">
                {allPending.map((req, i) => (
                  <div key={i} className={`db-approval-item ${req._kind}`}>
                    <div className="db-appr-header">
                      <div className="db-appr-avatar">{(req.employeeName || '?')[0].toUpperCase()}</div>
                      <div className="db-appr-info">
                        <div className="db-appr-name">{req.employeeName}</div>
                        <div className="db-appr-meta">
                          <span className={`db-appr-kind-pill ${req._kind}`}>
                            {req._kind === 'leave' ? (req.leaveType || 'Leave') : 'Regularization'}
                          </span>
                          <span className="db-appr-detail">
                            {req._kind === 'leave' && req.totalDays && (
                              req.is_half_day
                                ? `Half Day (${formatSession(req.half_day_session)})`
                                : `${req.totalDays} day${req.totalDays > 1 ? 's' : ''}`
                            )}
                            {req._kind === 'reg' && req.date && (
                              new Date(req.date).toLocaleDateString('en', { day: 'numeric', month: 'short' })
                            )}
                          </span>
                        </div>
                      </div>
                      {req.attachment_urls?.length > 0 && (
                        <a
                          href={`${API_BASE_URL.replace('/api', '')}/${req.attachment_urls[0]}`}
                          target="_blank"
                          rel="noreferrer"
                          title="View Document"
                          className="db-appr-doc-link"
                          onClick={e => e.stopPropagation()}
                        >
                          <FiFileText size={13} />
                        </a>
                      )}
                    </div>
                    {req.reason && (
                      <div className="db-appr-reason">"{req.reason}"</div>
                    )}
                    <div className="db-appr-actions">
                      <button
                        className="ab-approve"
                        disabled={approving[req.id]}
                        onClick={() => handleApprove(req.id, req._kind === 'leave' ? 'leave' : 'regularization', 'approved')}
                      >
                        <FiCheck size={11} /> Approve
                      </button>
                      <button
                        className="ab-reject"
                        disabled={approving[req.id]}
                        onClick={() => handleApprove(req.id, req._kind === 'leave' ? 'leave' : 'regularization', 'rejected')}
                      >
                        <FiX size={11} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== QUICK TOOLS SECTION ====== */}
      {activeSection === 'tools' && (
        <div className="db-content-tools">
          <div className="db-tools-header">
            <h2 className="db-tools-title">Administration Tools</h2>
            <p className="db-tools-sub">Configure company settings, policies, and manage employee data.</p>
          </div>
          <div className="db-tools-grid">
            {[
              { icon: <FiActivity size={20} />, label: 'Attendance Report', desc: 'View and export company-wide daily & monthly attendance records. Identify anomalies and adjust records.', path: '/attendance/admin/attendance', color: 'blue' },
              { icon: <FiCalendar size={20} />, label: 'Manage Holidays', desc: 'Configure national and optional public holidays for the company calendar.', path: '/attendance/admin/holidays', color: 'teal' },
              { icon: <FiClock size={20} />, label: 'Shift Management', desc: 'Define shift timings, grace periods, and auto-punch-out rules.', path: '/attendance/admin/shifts', color: 'purple' },
              { icon: <FiBookOpen size={20} />, label: 'Week-Off Policies', desc: 'Configure weekly day-off rules for teams and designations.', path: '/attendance/admin/weekoff-policies', color: 'amber' },
              { icon: <FiFileText size={20} />, label: 'Leave Policies', desc: 'Set up leave types, annual quotas, accrual rules, and carry-forward limits.', path: '/attendance/admin/leave-policies', color: 'green' },
              { icon: <FiUsers size={20} />, label: 'Teams', desc: 'Manage team structures and assign HODs for leave approval workflows.', path: '/attendance/teams', color: 'navy' },
              { icon: <FiSettings size={20} />, label: 'System Settings', desc: 'Company profile, attendance configuration, and security rules.', path: '/attendance/admin/settings', color: 'slate' },
            ].map((tool, i) => (
              <button key={i} className={`db-tool-card db-tool-${tool.color}`} onClick={() => navigate(tool.path)}>
                <div className="db-tool-icon">{tool.icon}</div>
                <div className="db-tool-body">
                  <div className="db-tool-label">{tool.label}</div>
                  <div className="db-tool-desc">{tool.desc}</div>
                </div>
                <FiChevronRight className="db-tool-arrow" size={16} />
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
