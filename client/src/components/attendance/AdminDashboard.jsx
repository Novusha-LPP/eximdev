import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers, FiCheckCircle, FiXCircle, FiCalendar, FiClock,
  FiSettings, FiChevronRight, FiBookOpen, FiFileText, FiGrid,
  FiRefreshCw, FiLogIn, FiLogOut, FiCheck, FiX,
  FiAlertCircle, FiSun, FiActivity
} from 'react-icons/fi';
import attendanceAPI from '../../api/attendance/attendance.api';
import masterAPI from '../../api/attendance/master.api';
import { API_BASE_URL } from './utils/constants';
import toast from 'react-hot-toast';
import './AdminDashboard.css';

/* -- utils -- */
const fmtTime = iso => iso
  ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
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
  ].slice(0, 7);

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
              {companies.length > 0 && (
                <select
                  className="ar-input-ctrl ar-select"
                  value={companyId}
                  onChange={e => { setCompanyId(e.target.value); load(e.target.value); }}
                  style={{ minWidth: 220 }}
                >
                  {companies.map(c => <option key={c._id} value={c._id}>{c.company_name}</option>)}
                </select>
              )}

          <div className="db-hero-right">
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
          <div className="stat-tile-sub">past grace period</div>
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

      {/* --- MAIN CONTENT --- */}
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

        </div>

        {/* -- RIGHT SIDEBAR -- */}
        <div className="db-right">

          {/* Pending Approvals */}
          <div className="db-card">
            <div className="db-card-header">
              <span className="db-card-title">
                <FiAlertCircle size={13} className="db-card-title-icon" style={{ color: '#c87f0a' }} />
                Pending Approvals
              </span>
              {pendingCount > 0
                ? <span className="db-card-badge dbb-amber">{pendingCount}</span>
                : <span className="db-card-badge dbb-green">All clear</span>
              }
            </div>
            <div className="approval-list">
              {allPending.length > 0 ? allPending.map((req, i) => (
                <div key={i} className={`approval-row ${req._kind === 'leave' ? 'ar-leave' : 'ar-reg'}`}>
                  <div className="approval-avatar">{(req.employeeName || '?')[0].toUpperCase()}</div>
                  <div className="approval-body">
                    <div className="approval-name">{req.employeeName}</div>
                    <div className="approval-meta">
                      <span className={`approval-kind ${req._kind === 'leave' ? 'ak-leave' : 'ak-reg'}`}>
                        {req._kind === 'leave' ? (req.leaveType || 'Leave') : 'Regularization'}
                      </span>
                      {req._kind === 'leave' && req.totalDays && (
                        req.is_half_day ? ` • Half Day (${formatSession(req.half_day_session)})` : ` • ${req.totalDays}d`
                      )}
                      {req._kind === 'reg' && req.date && ` • ${new Date(req.date).toLocaleDateString('en', { day: 'numeric', month: 'short' })}`}
                      {req.attachment_urls?.length > 0 && (
                        <a
                          href={`${API_BASE_URL.replace('/api', '')}/${req.attachment_urls[0]}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ marginLeft: 6, color: '#64748b' }}
                          title="View Document"
                        >
                          <FiFileText size={10} />
                        </a>
                      )}
                    </div>
                    <div className="approval-btns">
                      <button className="ab-approve" disabled={approving[req.id]}
                        onClick={() => handleApprove(req.id, req._kind === 'leave' ? 'leave' : 'regularization', 'approved')}>
                        <FiCheck size={10} /> Approve
                      </button>
                      <button className="ab-reject" disabled={approving[req.id]}
                        onClick={() => handleApprove(req.id, req._kind === 'leave' ? 'leave' : 'regularization', 'rejected')}>
                        <FiX size={10} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="db-empty-sm">
                  <FiCheckCircle size={22} style={{ color: '#b6e8d6' }} />
                  <p>No pending approvals ✨</p>
                </div>
              )}
            </div>
          </div>

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

          {/* Quick Actions */}
          <div className="db-card">
            <div className="db-card-header">
              <span className="db-card-title">Quick Actions</span>
            </div>
            <div className="action-grid">
              {quickActions.map((item, i) => (
                <button key={i} className="action-item" onClick={() => navigate(item.path)}>
                  <div className="action-icon">{item.icon}</div>
                  <div className="action-text">
                    <div className="action-label">{item.label}</div>
                    <div className="action-desc">{item.desc}</div>
                  </div>
                  <FiChevronRight className="action-arrow" size={13} />
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;
