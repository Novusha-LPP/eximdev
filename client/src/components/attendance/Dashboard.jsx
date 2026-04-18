import { useContext } from 'react';
import { UserContext } from '../../contexts/UserContext';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiLogIn, FiLogOut, FiRefreshCw, FiArrowRight,
  FiCalendar, FiCheckSquare, FiFileText, FiActivity,
  FiCheck, FiX, FiSettings, FiBookOpen, FiClock, FiUsers,
  FiCheckCircle, FiXCircle, FiSun,
  FiChevronLeft, FiChevronRight,
} from 'react-icons/fi';
import Badge from './common/Badge';
import attendanceAPI from '../../api/attendance/attendance.api';
import leaveAPI from '../../api/attendance/leave.api';
import masterAPI from '../../api/attendance/master.api';
import { formatDate, getStatusVariant, minutesToHours, isToday } from './utils/helpers';
import toast from 'react-hot-toast';
import AdminAnalyticsTab from './AdminAnalyticsTab';
import './Dashboard.css';

/* -- Constants -- */
const AUTHORIZED_DASHBOARD_ADMINS = new Set([
  'shalini_arun', 'manu_pillai', 'suraj_rajan', 'rajan_aranamkatte', 'uday_zope'
]);

/* -- Helpers -- */
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const fmtTime = iso => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  let h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0'), ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
};

const fmtLate = mins => {
  const m = parseInt(mins || 0);
  return m < 60 ? `+${m}m late` : `+${Math.floor(m / 60)}h ${m % 60}m late`;
};

const initials = (n = '') => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);


const getHolidayEmoji = (name = '', type = '') => {
  const n = (name + type).toLowerCase();
  if (n.includes('diwali')) return '🪔';
  if (n.includes('holi')) return '🎨';
  if (n.includes('eid')) return '🌙';
  if (n.includes('christmas')) return '🎄';
  if (n.includes('new year')) return '🎆';
  if (n.includes('independence') || n.includes('republic')) return '🇮🇳';
  if (type === 'national') return '🏛️';
  return '📅';
};

const LEAVE_ICONS = [
  { keys: ['casual', 'cl'], emoji: '🍃', color: '#3b82f6' },
  { keys: ['sick', 'sl', 'medical'], emoji: '🤒', color: '#10b981' },
  { keys: ['earned', 'el', 'annual'], emoji: '⭐', color: '#8b5cf6' },
  { keys: ['comp', 'co'], emoji: '🎁', color: '#f59e0b' },
  { keys: ['wfh', 'work from'], emoji: '🏠', color: '#06b6d4' },
  { keys: ['lwp'], emoji: '⏳', color: '#9ca3af' },
];
const getLeaveIcon = (name = '') => {
  const n = name.toLowerCase();
  return LEAVE_ICONS.find(c => c.keys.some(k => n.includes(k))) || { emoji: '📝', color: '#9ca3af' };
};

const formatSession = (s) => {
  if (!s) return '';
  return s === 'first_half' ? '1st Half' : '2nd Half';
};

const calClass = (rec, isCurrentDay, punchStatus) => {
  if (!rec) return '';
  if (rec.status === 'half_day') return 'half_day';
  if (isCurrentDay && (punchStatus?.status === 'Checked In' || punchStatus?.status === 'Checked Out')) {
    return rec?.isLate ? 'late' : 'present';
  }
  if (rec.status === 'present') return rec.isLate ? 'late' : 'present';
  return { absent: 'absent', holiday: 'holiday', weekly_off: 'off', leave: 'leave' }[rec.status] || '';
};

const DOT_MAP = { present: 'P', absent: 'A', late: 'L', present_late: 'L', half_day: '½', leave: 'LV', holiday: 'HD', weekly_off: 'O', empty: '' };

/* ------------------------------------------
   UNIFIED DASHBOARD – All Roles
------------------------------------------ */
export default function Dashboard() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const normalizeRole = (r) => String(r || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  const nRole = normalizeRole(user?.role);
  const isAdmin = nRole === 'ADMIN';
  const isHOD = nRole === 'HOD' || nRole === 'HEADOFDEPARTMENT';
  const isManager = isAdmin || isHOD;

  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [approving, setApproving] = useState({});
  const [dash, setDash] = useState(null);
  const [balances, setBalances] = useState([]);
  const [mgmtData, setMgmtData] = useState(null);
  const [todayTab, setTodayTab] = useState('absent');
  const [holidays, setHolidays] = useState([]);
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDetail, setDayDetail] = useState(null);
  const [liveTimer, setLiveTimer] = useState('0h 00m 00s');

  // Adhoc Admin Tabs
  const [activeTab, setActiveTab] = useState('calendar');
  const [adminData, setAdminData] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminDate, setAdminDate] = useState(new Date().toISOString().split('T')[0]);
  const [adminCompanyId, setAdminCompanyId] = useState('');
  const [companies, setCompanies] = useState([]);

  const username = String(user?.username || '').toLowerCase();
  const isAuthorizedAdmin = AUTHORIZED_DASHBOARD_ADMINS.has(username);
  const [weekOff, setWeekOff] = useState(0);

  /* -- Fetch -- */
  const load = useCallback(async (mo, yr) => {
    try {
      setLoading(true);
      const base = [
        attendanceAPI.getDashboardData(mo, yr),
        leaveAPI.getBalance().catch(() => ({ data: [] })),
      ];

      if (isAdmin) {
        base.push(attendanceAPI.getAdminDashboard().catch(() => null));
        base.push(masterAPI.getHolidays({ limit: 5 }).catch(() => null));
      } else if (isHOD) {
        base.push(attendanceAPI.getHODDashboard().catch(() => null));
      }

      const [dashRes, balRes, extraRes, holRes] = await Promise.all(base);

      if (dashRes) setDash(dashRes);
      setBalances(balRes?.data || []);

      if (isAdmin && extraRes?.success) {
        setMgmtData(extraRes.data);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        setHolidays(
          (holRes?.data || [])
            .filter(h => new Date(h.holiday_date) >= today)
            .sort((a, b) => new Date(a.holiday_date) - new Date(b.holiday_date))
            .slice(0, 4)
        );
      }
      if (isHOD && extraRes?.data) setMgmtData(extraRes.data);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }, [isAdmin, isHOD]);

  // Fetch companies for admin filtering
  useEffect(() => {
    if (isAuthorizedAdmin) {
      masterAPI.getCompanies().then(res => {
        if (res?.success) setCompanies(res.data || []);
      }).catch(err => console.error('Failed to load companies', err));
    }
  }, [isAuthorizedAdmin]);

  useEffect(() => { load(month.getMonth() + 1, month.getFullYear()); }, [month]);

  const loadAdminData = useCallback(async (date, companyId) => {
    if (!isAuthorizedAdmin) return;
    try {
      setAdminLoading(true);
      const res = await attendanceAPI.getAdminDashboard({ 
        date, 
        company_id: companyId || undefined 
      });
      if (res?.success) setAdminData(res.data);
    } catch { 
      toast.error('Failed to load admin analytics'); 
    } finally { 
      setAdminLoading(false); 
    }
  }, [isAuthorizedAdmin]);

  useEffect(() => {
    if (activeTab === 'daily' && isAuthorizedAdmin) {
      loadAdminData(adminDate, adminCompanyId);
    }
  }, [activeTab, adminDate, adminCompanyId, isAuthorizedAdmin, loadAdminData]);

  useEffect(() => {
    const h = () => load(month.getMonth() + 1, month.getFullYear());
    window.addEventListener('attendance-updated', h);
    window.addEventListener('leave-balance-updated', h);
    return () => {
      window.removeEventListener('attendance-updated', h);
      window.removeEventListener('leave-balance-updated', h);
    };
  }, [month, load]);

  /* Live timer */
  useEffect(() => {
    let iv;
    const ps = dash?.punchStatus;
    if (ps?.action === 'OUT' && ps.sessionStartTime) {
      const tick = () => {
        const total = Math.round((ps.previousSessionsHours || 0) * 3600) +
          Math.floor((Date.now() - new Date(ps.sessionStartTime)) / 1000);
        const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
        setLiveTimer(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
      };
      tick(); iv = setInterval(tick, 1000);
    } else { setLiveTimer(ps?.workHours || '0h 00m 00s'); }
    return () => clearInterval(iv);
  }, [dash]);

  /* -- Punch -- */
  const handlePunch = async () => {
    try {
      setPunching(true);
      let location = null;
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch { }
      const type = dash?.punchStatus?.action || 'IN';
      const r = await attendanceAPI.punch({ type, method: 'WEB', location });
      if (r?.message) {
        toast.success(r.message);
        if (r?.warning?.message) toast.info(r.warning.message);
        if (r?.info?.message) toast.info(r.info.message);
        load(month.getMonth() + 1, month.getFullYear());
        window.dispatchEvent(new CustomEvent('attendance-updated'));
      }
    } catch (e) { toast.error(e?.message || 'Action failed'); }
    finally { setPunching(false); }
  };

  /* -- Approve -- */
  const handleApprove = async (id, kind, status) => {
    setApproving(p => ({ ...p, [id]: true }));
    try {
      await attendanceAPI.approveRequest(kind === 'leave' ? 'leave' : 'regularization', id, status);
      toast.success(status === 'approved' ? 'Approved' : 'Rejected');
      load(month.getMonth() + 1, month.getFullYear());
    } catch { toast.error('Action failed'); }
    finally { setApproving(p => ({ ...p, [id]: false })); }
  };

  /* -- Calendar -- */
  const getCalDays = () => {
    const y = month.getFullYear(), mo = month.getMonth();
    let fd = new Date(y, mo, 1).getDay();
    fd = fd === 0 ? 6 : fd - 1;
    const total = new Date(y, mo + 1, 0).getDate();
    return [...Array(fd).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  };

  const getCalRecord = day => {
    if (!day || !dash?.calendar) return null;
    const y = month.getFullYear(), m = String(month.getMonth() + 1).padStart(2, '0');
    return dash.calendar[`${y}-${m}-${String(day).padStart(2, '0')}`] || null;
  };

  const openDay = day => {
    if (!day) return;
    const y = month.getFullYear(), m = String(month.getMonth() + 1).padStart(2, '0');
    const ds = `${y}-${m}-${String(day).padStart(2, '0')}`;
    const rec = dash?.calendar?.[ds];
    let status = rec?.status || 'No Data';
    if (rec?.status === 'present') {
      if (rec.isLate && rec.isEarlyExit) status = 'Present (Late & Early Exit)';
      else if (rec.isLate) status = 'Present (Late)';
      else if (rec.isEarlyExit) status = 'Present (Early Exit)';
    } else if (rec?.status === 'half_day') {
      status = rec?.half_day_session
        ? `Half Day (${formatSession(rec.half_day_session)})`
        : 'Half Day';
    }
    setSelectedDay(ds);
    setDayDetail(rec ? { ...rec, status } : { status: 'No Data', hours: '0h 0m' });
  };

  /* -- Team calendar -- */
  const getWeekDays = (off = 0) => {
    const today = new Date(), dow = today.getDay(), diff = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(today); mon.setDate(today.getDate() + diff + off * 7);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
  };
  const weekDays = getWeekDays(weekOff);
  const todayStr = new Date().toDateString();

  /* -- Loading -- */
  if (loading && !dash) return (
    <div className="db-loading"><div className="db-spin" /><p>Loading...</p></div>
  );

  /* -- Derived -- */
  const ps = dash?.punchStatus;
  const ms = dash?.monthStats;
  const isIn = ps?.action === 'OUT';
  const displayName = user?.first_name 
    ? `${user.first_name} ${user.last_name || ''}`.trim() 
    : (user?.name || 'there');
  const monthName = month.toLocaleString('default', { month: 'long', year: 'numeric' });

  const showMiss = !ps?.lastOut && ps?.firstIn && !isToday(ps?.date);

  /* Management data */
  const stats = mgmtData?.stats || mgmtData?.summary || dash?.mgmtSnapshot || {};
  const pendingLeaves = mgmtData?.pendingLeaves || [];
  const pendingRegs = mgmtData?.pendingRegularization || [];
  const teamCalendar = mgmtData?.teamCalendar || mgmtData?.teamAvailability || [];
  const absentList = mgmtData?.absentToday || mgmtData?.absent || [];
  const lateList = mgmtData?.lateToday || mgmtData?.late || [];
  const onLeaveList = mgmtData?.onLeaveToday || []; 
  
  const allPending = [
    ...pendingLeaves.map(r => ({ ...r, _kind: 'leave' })),
    ...pendingRegs.map(r => ({ ...r, _kind: 'reg' })),
  ];

  const upcomingHolidays = (dash?.upcomingHolidays || []).slice(0, 4);

  /* -- Role-aware stat tiles -- */
  const personalTiles = [
    { cls: 'green', val: ms?.present ?? 0, lbl: 'Days Present', sub: `of ${ms?.workingDays ?? 0} working days` },
    { cls: 'blue', val: balances.reduce((s, b) => s + (b.available || b.balance || 0), 0), lbl: 'Leave Balance', sub: `${balances.reduce((s, b) => s + (b.used ?? 0), 0)} used this month` },
    { cls: 'amber', val: ms?.late ?? 0, lbl: 'Late Arrivals', sub: ms?.avgLateMinutes ? `avg ${ms.avgLateMinutes} min late` : 'this month' },
    { cls: 'gray', val: ms?.weeklyAvgHours ? `${Math.floor(ms.weeklyAvgHours)}h${Math.floor((ms.weeklyAvgHours % 1) * 60)}m` : '-', lbl: 'Weekly Avg Hours', sub: 'based on days worked' },
  ];

  const managerTiles = [
    { cls: 'green', val: stats.present ?? 0, lbl: 'Present Today', sub: `of ${stats.total ?? '—'} ${isAdmin ? 'employees' : 'team members'}` },
    { cls: 'red', val: stats.absent ?? 0, lbl: 'Absent Today', sub: 'unexcused absences' },
    { cls: 'amber', val: stats.late ?? 0, lbl: 'Late Arrivals', sub: 'after shift start' },
    { cls: 'blue', val: stats.onLeave ?? stats.onLeaveCount ?? 0, lbl: 'On Leave', sub: 'approved leaves' },
  ];

  /* -- Quick actions -- */
  const hodActions = [
    { icon: <FiCheckSquare size={14} />, lbl: 'Leave Approvals', sub: `${pendingLeaves.length} pending`, path: '/attendance/hod/leave-approval', count: pendingLeaves.length },
    { icon: <FiFileText size={14} />, lbl: 'Regularizations', sub: `${pendingRegs.length} pending`, path: '/attendance/hod/regularization-approval', count: pendingRegs.length },
    { icon: <FiActivity size={14} />, lbl: 'Team Report', sub: 'Attendance & analytics', path: '/attendance/hod/report', count: 0 },
    { icon: <FiCalendar size={14} />, lbl: 'Apply My Leave', sub: 'Submit a leave request', path: '/attendance/leave', count: 0 },
  ];

  const adminActions = [
    { icon: <FiActivity size={14} />, lbl: 'Attendance Report', sub: 'Company-wide records', path: '/attendance/admin/attendance' },
    { icon: <FiCalendar size={14} />, lbl: 'Manage Holidays', sub: 'Add or edit holidays', path: '/attendance/admin/holidays' },
    { icon: <FiClock size={14} />, lbl: 'Shift Management', sub: 'Reference timings & hour thresholds', path: '/attendance/admin/shifts' },
    { icon: <FiBookOpen size={14} />, lbl: 'Leave Policies', sub: 'Quotas & accrual rules', path: '/attendance/admin/leave-policies' },
    { icon: <FiSettings size={14} />, lbl: 'System Settings', sub: 'Company configuration', path: '/attendance/admin/settings' },
  ];

  const employeeActions = [
    { icon: <FiFileText size={14} />, lbl: 'Apply Leave', sub: 'Submit a leave request', path: '/attendance/leave', count: 0 },
    { icon: <FiActivity size={14} />, lbl: 'My Attendance', sub: 'View full punch history', path: '/attendance/my-attendance', count: 0 },
    { icon: <FiCalendar size={14} />, lbl: 'Holiday Calendar', sub: 'View upcoming holidays', path: '/attendance/holiday-calendar', count: 0 },
  ];

  return (
    <div className="db">

      {/* -- HERO -- */}
      <div className="db-hero">
        <div className="db-hero-inner">
          <div>
            <h1>{`${greeting()}, ${displayName}`}</h1>
            <p>{new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="punch-widget">
            <div className="punch-times">
              <span className="punch-label">Today</span>
              <div className="punch-row">
                <span className={ps?.firstIn ? 'in' : ''}>
                  <FiLogIn size={10} /> {fmtTime(ps?.firstIn)}
                </span>
                <span className={ps?.lastOut ? 'out' : ''}>
                  <FiLogOut size={10} /> {showMiss ? 'Miss' : fmtTime(ps?.lastOut)}
                </span>
              </div>
            </div>
            <button
              className={`punch-cta ${isIn ? 'out' : 'in'}`}
              onClick={handlePunch}
              disabled={punching}
            >
              {isIn ? <FiLogOut size={13} /> : <FiLogIn size={13} />}
              {punching ? '...' : isIn ? 'Punch Out' : 'Punch In'}
            </button>
          </div>
        </div>
      </div>

      {/* -- STAT TILES -- */}
      <div className="db-tiles-wrap">
        <div className="db-tiles">
          {(isManager ? managerTiles : personalTiles).map((t, i) => (
            <div key={i} className={`tile ${t.cls}`}>
              <div className="tile-val">{t.val}</div>
              <div className="tile-lbl">{t.lbl}</div>
              <div className="tile-sub">{t.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* -- BODY -- */}
      <div className={`db-body ${activeTab === 'daily' ? 'full-width' : ''}`}>

        {/* -- LEFT / MAIN -- */}
        <div className="db-main">

          {/* Personal punch card – compact for managers */}
          <div className="ph-card">
            <div className="ph-top">
              <div>
                <div className={`ph-status ${isIn ? 'on' : 'off'}`}>
                  <span className="ph-dot" />
                  <span className="ph-status-text">{isIn ? 'Clocked in' : 'Not clocked in'}</span>
                </div>
                <div className="ph-greeting">{ps?.shiftName || 'General Shift'}</div>
                {ps?.shiftTime && <div className="ph-shift">{ps.shiftTime}</div>}
                <div className="ph-timer">{liveTimer}</div>
                <div className="ph-timer-lbl">Time logged today</div>
                <div className="ph-meta">
                  <div className="ph-meta-item">
                    <span className="ph-meta-key">Punched In</span>
                    <span className="ph-meta-val">{ps?.firstIn ? fmtTime(ps.firstIn) : '-'}</span>
                  </div>
                  <div className="ph-meta-item">
                    <span className="ph-meta-key">Punched Out</span>
                    <span className={`ph-meta-val ${showMiss ? 'red' : ''}`}>
                      {showMiss ? 'Miss' : ps?.lastOut ? fmtTime(ps.lastOut) : '-'}
                    </span>
                  </div>
                  <div className="ph-meta-item">
                    <span className="ph-meta-key">Status</span>
                    <span className={`ph-meta-val ${isIn ? 'green' : ''}`}>{ps?.status || '-'}</span>
                  </div>
                  {ps?.isLate && (
                    <div className="ph-meta-item">
                      <span className="ph-meta-key">Late By</span>
                      <span className="ph-meta-val amber">{minutesToHours(ps.lateByMinutes)}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                className={`ph-ring ${isIn ? 'out' : ''}`}
                onClick={handlePunch}
                disabled={punching}
              >
                {isIn
                  ? <FiLogOut size={22} color="#ef4444" />
                  : <FiLogIn size={22} color="#10b981" />
                }
                <span className="ph-ring-lbl">{punching ? '...' : isIn ? 'Out' : 'In'}</span>
              </button>
            </div>
          </div>

          {/* -- MANAGER: Overview strip -- */}
          {isManager && !isAuthorizedAdmin && (
            <div className="card insight-mini">
              <div className="card-head">
                <span className="card-title">{isAdmin ? 'Company Overview' : 'Team Overview'}</span>
                <button className="card-link" onClick={() => navigate(isAdmin ? '/attendance/admin/attendance' : '/attendance/hod/report')}>
                  Full report <FiArrowRight size={12} />
                </button>
              </div>
              <div className="insight-mini-grid">
                <div className="insight-mini-item green">
                  <div className="insight-mini-icon"><FiCheckCircle size={14} /></div>
                  <div className="insight-mini-body">
                    <span className="insight-mini-val">{stats.present ?? 0}</span>
                    <span className="insight-mini-lbl">Present</span>
                  </div>
                </div>
                <div className="insight-mini-item red">
                  <div className="insight-mini-icon"><FiXCircle size={14} /></div>
                  <div className="insight-mini-body">
                    <span className="insight-mini-val">{stats.absent ?? 0}</span>
                    <span className="insight-mini-lbl">Absent</span>
                  </div>
                </div>
                <div className="insight-mini-item amber">
                  <div className="insight-mini-icon"><FiClock size={14} /></div>
                  <div className="insight-mini-body">
                    <span className="insight-mini-val">{stats.late ?? 0}</span>
                    <span className="insight-mini-lbl">Late</span>
                  </div>
                </div>
                <div className="insight-mini-item blue">
                  <div className="insight-mini-icon"><FiSun size={14} /></div>
                  <div className="insight-mini-body">
                    <span className="insight-mini-val">{stats.onLeave ?? stats.onLeaveCount ?? 0}</span>
                    <span className="insight-mini-lbl">On Leave</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* -- EMPLOYEE: Personal stat tiles below calendar for managers -- */}
          {isManager && (
            <div className="card">
              <div className="card-head">
                <span className="card-title">My Monthly Summary</span>
              </div>
              <div className="personal-stats-row">
                {personalTiles.map((t, i) => (
                  <div key={i} className={`personal-stat ${t.cls}`}>
                    <div className="personal-stat-val">{t.val}</div>
                    <div className="personal-stat-lbl">{t.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAuthorizedAdmin && (
            <div className="db-main-tabs">
              <button 
                className={`db-main-tab ${activeTab === 'calendar' ? 'active' : ''}`}
                onClick={() => setActiveTab('calendar')}
              >
                <FiCalendar /> My Dashboard
              </button>
              <button 
                className={`db-main-tab ${activeTab === 'daily' ? 'active' : ''}`}
                onClick={() => setActiveTab('daily')}
              >
                <FiActivity /> Daily Summary
              </button>
            </div>
          )}

          {activeTab === 'calendar' ? (
            <>
          {/* -- MANAGER: Today's Alerts (Late / Absent) -- */}
          {isManager && !isAuthorizedAdmin && (
            <div className="card">
              <div className="card-head">
                <span className="card-title">Today's Alerts</span>
                <div className="db-tabs-mini">
                  <button 
                    className={`db-tab-mini ${todayTab === 'absent' ? 'active' : ''}`}
                    onClick={() => setTodayTab('absent')}
                  >
                    Absent {absentList.length > 0 && <span className="tab-count-red">{absentList.length}</span>}
                  </button>
                  <button 
                    className={`db-tab-mini ${todayTab === 'late' ? 'active' : ''}`}
                    onClick={() => setTodayTab('late')}
                  >
                    Late {lateList.length > 0 && <span className="tab-count-amber">{lateList.length}</span>}
                  </button>
                </div>
              </div>
              
              <div className="db-alerts-list">
                {todayTab === 'absent' && (
                  absentList.length === 0 ? (
                    <div className="empty-msg">No one is absent today! 🎉</div>
                  ) : absentList.map((emp, i) => (
                    <div key={i} className="absent-emp-row">
                      <div className="absent-emp-av">{(emp.name || '?')[0].toUpperCase()}</div>
                      <div className="absent-emp-info">
                        <div className="absent-emp-name">{emp.name}</div>
                        <div className="absent-emp-dept">{emp.status === 'leave' ? 'On Leave' : 'Absent'}</div>
                      </div>
                      <span className={`absent-emp-tag ${emp.status === 'leave' ? 'on-leave' : ''}`}>
                        {emp.status === 'leave' ? 'On Leave' : 'Absent'}
                      </span>
                    </div>
                  ))
                )}
                
                {todayTab === 'late' && (
                  lateList.length === 0 ? (
                    <div className="empty-msg">No late arrivals reported.</div>
                  ) : lateList.map((emp, i) => {
                     const lMins = emp.late_by ?? emp.lateBy ?? 0;
                     const iTime = emp.first_in ?? emp.inTime;
                     return (
                        <div key={i} className="absent-emp-row">
                          <div className="absent-emp-av late">{(emp.name || '?')[0].toUpperCase()}</div>
                          <div className="absent-emp-info">
                            <div className="absent-emp-name">{emp.name}</div>
                            <div className="absent-emp-dept">{iTime ? `Arrived ${fmtTime(iTime)}` : 'Logged Late'}</div>
                          </div>
                          <span className="absent-emp-tag late">
                            +{lMins}m
                          </span>
                        </div>
                     );
                  })
                )}
              </div>
            </div>
          )}

          {/* -- HOD only: Team calendar -- */}
          {isHOD && (
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Team Availability</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--ink4)', marginTop: 2 }}>
                    {weekDays[0].toLocaleDateString('en', { day: 'numeric', month: 'short' })} –{' '}
                    {weekDays[6].toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div className="week-nav">
                  <button className="week-btn" onClick={() => setWeekOff(o => o - 1)}><FiChevronLeft size={13} /></button>
                  <button className={`week-btn${weekOff === 0 ? ' current' : ''}`} onClick={() => setWeekOff(0)}>Today</button>
                  <button className="week-btn" onClick={() => setWeekOff(o => o + 1)}><FiChevronRight size={13} /></button>
                </div>
              </div>
              <div className="team-cal">
                <table className="team-table">
                  <thead>
                    <tr>
                      <th className="name-col">Member</th>
                      {weekDays.map((d, i) => {
                        const isT = d.toDateString() === todayStr;
                        const isW = d.getDay() === 0 || d.getDay() === 6;
                        return (
                          <th key={i} className={isT ? 'today-col' : ''} style={{ opacity: isW && !isT ? .5 : 1 }}>
                            <div>{d.toLocaleDateString('en', { weekday: 'short' })}</div>
                            <div style={{ fontSize: '.5rem', fontFamily: 'JetBrains Mono,monospace', marginTop: 1, opacity: .7 }}>
                              {d.toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {teamCalendar.length === 0
                      ? <tr><td colSpan={8}><div className="empty-msg">No team members found</div></td></tr>
                      : teamCalendar.map((emp, ei) => (
                        <tr key={ei}>
                          <td>
                            <div className="emp-cell">
                              <div className="emp-av">{initials(emp.name)}</div>
                              <div>
                                <div className="emp-name">{emp.name}</div>
                                <div className="emp-role">{emp.role || 'Team Member'}</div>
                              </div>
                            </div>
                          </td>
                          {weekDays.map((d, di) => {
                            const ds = d.toISOString().split('T')[0];
                            let status = emp.attendance?.[ds] || 'empty';
                            const isW = d.getDay() === 0 || d.getDay() === 6;
                            const isT = d.toDateString() === todayStr;
                            
                            if (status === 'empty' && !isW && d <= new Date()) {
                                status = 'absent';
                            }
                            
                            return (
                              <td key={di} className={isT ? 'today-col' : ''}>
                                <div className={`status-dot sd-${isW ? 'weekend' : status}`} title={status === 'empty' ? 'No Data' : status.replace(/_/g, ' ')}>
                                  {!isW && DOT_MAP[status]}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
              <div className="team-legend">
                {[
                  ['Present', '#10b981'],
                  ['Late', '#f59e0b'],
                  ['Absent', '#ef4444'],
                  ['Leave', '#8b5cf6'],
                  ['Half Day', '#0369a1'],
                  ['Off', '#e5e7eb']
                ].map(([l, c]) => (
                  <span key={l}><span className="tl-dot" style={{ background: c }} />{l}</span>
                ))}
              </div>
            </div>
          )}

          {/* -- Attendance calendar – ALL ROLES -- */}
          <div className="card cal-card">
            <div className="card-head">
              <span className="card-title">Attendance Calendar</span>
              <button className="card-link" onClick={() => navigate('/attendance/my-attendance')}>
                Full report <FiArrowRight size={12} />
              </button>
            </div>
            <div className="cal-nav">
              <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
              <span>{monthName}</span>
              <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
            </div>
            <div className="cal-grid">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <div key={d} className="cal-dname">{d}</div>)}
              {getCalDays().map((day, i) => {
                const rec = getCalRecord(day);
                const isTd = day && month.getMonth() === new Date().getMonth() && month.getFullYear() === new Date().getFullYear() && day === new Date().getDate();
                let cls = calClass(rec, isTd, dash?.punchStatus);

                if (day && !rec) {
                  const dObj = new Date(month.getFullYear(), month.getMonth(), day);
                  const dow = dObj.getDay();
                  const offDays = dash?.punchStatus?.weeklyOffDays || [0, 6];
                  if (offDays.includes(dow)) {
                      cls = 'off';
                  } else if (dObj <= new Date()) {
                      cls = 'absent';
                  }
                }

                return (
                  <div
                    key={i}
                    className={`cal-day ${cls} ${isTd ? 'today' : ''} ${!day ? 'empty' : ''}`}
                    onClick={() => openDay(day)}
                  >
                    {day}
                    {rec?.status === 'half_day' && <span style={{ position: 'absolute', bottom: 2, right: 4, fontSize: '8px', fontWeight: 800, color: 'inherit', opacity: 0.8 }}>½</span>}
                    {rec?.status === 'holiday' && <span style={{ position: 'absolute', bottom: 2, right: 4, fontSize: '8px', fontWeight: 800, color: 'inherit', opacity: 0.8 }}>HD</span>}
                  </div>
                );
              })}
            </div>
            <div className="cal-legend">
              {[
                ['Present', '#10b981'],
                ['Late', '#f59e0b'],
                ['Absent', '#ef4444'],
                ['Leave', '#8b5cf6'],
                ['Half Day', '#0369a1'],
                ['Weekly Off', '#cbd5e1'],
                ['Holiday', '#e0e7ff']
              ].map(([l, c]) => (
                <span key={l}><span className="cal-ldot" style={{ background: c }} />{l}</span>
              ))}
            </div>
          </div>
            </>
          ) : (
            <AdminAnalyticsTab 
              data={adminData} 
              loading={adminLoading}
              currentDate={adminDate}
              onDateChange={setAdminDate}
              companies={companies}
              selectedCompanyId={adminCompanyId}
              onCompanyChange={setAdminCompanyId}
            />
          )}
        </div>

        {/* -- RIGHT SIDEBAR -- */}
        <div className="db-side">

          {/* Pending approvals – HOD & Admin */}
          {isManager && (
            <div className="card clickable-card" onClick={() => navigate(isHOD ? '/attendance/hod/leave-approval' : '/attendance/admin/attendance')}>
              <div className="card-head">
                <span className="card-title">Pending Approvals</span>
                {allPending.length > 0
                  ? <span className="card-badge badge-amber">{allPending.length}</span>
                  : <span className="card-badge badge-green">All clear</span>
                }
              </div>
              {allPending.length === 0 ? (
                <div className="empty-msg">Nothing pending right now! ✨</div>
              ) : allPending.slice(0, 6).map((req, i) => (
                <div key={i} className="approval-row">
                  <div className="approval-av">{(req.employeeName || '?')[0]}</div>
                  <div className="approval-body">
                    <div className="approval-name">{req.employeeName}</div>
                    <div className="approval-meta">
                      {req._kind === 'leave' ? (req.leaveType || 'Leave') : 'Regularization'}
                      {req._kind === 'leave' && req.totalDays ? (
                        req.is_half_day ? ` • Half Day (${formatSession(req.half_day_session)})` : ` • ${req.totalDays} day${req.totalDays > 1 ? 's' : ''}`
                      ) : ''}
                      {req._kind === 'reg' && req.date ? ` • ${new Date(req.date).toLocaleDateString('en', { day: 'numeric', month: 'short' })}` : ''}
                    </div>
                    <div className="approval-actions">
                      <button
                        className="act approve"
                        disabled={approving[req.id]}
                        onClick={() => handleApprove(req.id, req._kind, 'approved')}
                      >
                        <FiCheck size={10} /> Approve
                      </button>
                      <button
                        className="act reject"
                        disabled={approving[req.id]}
                        onClick={() => handleApprove(req.id, req._kind, 'rejected')}
                      >
                        <FiX size={10} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {allPending.length > 6 && (
                <div style={{ padding: '.75rem 1.25rem', borderTop: '1px solid var(--border)' }}>
                  <button className="card-link" onClick={() => navigate(isHOD ? '/attendance/hod/leave-approval' : '/attendance/admin/attendance')}>
                    +{allPending.length - 6} more <FiArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Leave balance – all roles */}
          <div className="card">
            <div className="card-head">
              <span className="card-title">Leave Balance</span>
              <button className="card-link" onClick={() => navigate('/attendance/leave')}>
                Apply leave <FiArrowRight size={12} />
              </button>
            </div>
            {balances.length === 0
              ? <div className="empty-msg">No leave data</div>
              : balances.slice(0, 5).map((b, i) => {
                const available = b.available || b.balance || 0;
                const used = b.used ?? 0;
                const total = b.total || b.annual_quota || 1;
                const pct = Math.min(100, (used / total) * 100);
                const icon = getLeaveIcon(b.name || b.leave_type || '');
                const countCls = available === 0 ? 'zero' : available <= 2 ? 'low' : '';
                return (
                  <div key={i} className="leave-row">
                    <span className="leave-emoji">{icon.emoji}</span>
                    <div className="leave-info">
                      <div className="leave-name">{b.name || b.leave_type}</div>
                      <div className="leave-sub">{used} used{b.pending > 0 ? ` • ${b.pending} pending` : ''}</div>
                      <div className="leave-bar">
                        <div className="leave-fill" style={{ width: `${pct}%`, background: icon.color }} />
                      </div>
                    </div>
                    <div className={`leave-count ${countCls}`}>
                      {available}
                    </div>
                  </div>
                );
              })
            }
          </div>

          {/* Upcoming holidays – and manual refresh */}
          {!isAuthorizedAdmin && (
            <div className="card">
              <div className="card-head">
                <span className="card-title">Upcoming Holidays</span>
                {isAdmin && (
                  <button className="card-link" onClick={() => navigate('/attendance/admin/holidays')}>
                    Manage <FiArrowRight size={12} />
                  </button>
                )}
              </div>
            {(isAdmin ? holidays : upcomingHolidays).length === 0 ? (
              <div className="empty-msg">No upcoming holidays</div>
            ) : (isAdmin ? holidays : upcomingHolidays).map((h, i) => {
              const d = new Date(h.holiday_date || h.date);
              const name = h.holiday_name || h.name || '';
              const type = h.holiday_type || h.type || 'national';
              return (
                <div key={i} className="upcoming-row">
                  <div className="upcoming-badge">
                    <span className="upcoming-month">{d.toLocaleString('default', { month: 'short' })}</span>
                    <span className="upcoming-day">{d.getDate()}</span>
                  </div>
                  <div>
                    <div className="upcoming-name">{getHolidayEmoji(name, type)} {name}</div>
                    <div className="upcoming-sub">{d.toLocaleString('default', { weekday: 'long' })}</div>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {/* Quick actions – role-specific */}
          {!isAuthorizedAdmin && (
            <div className="card">
              <div className="card-head">
                <span className="card-title">Quick Actions</span>
              </div>
            {(isAdmin ? adminActions : isHOD ? hodActions : employeeActions).map((item, i) => (
              <button key={i} className="qa-item" onClick={() => navigate(item.path)}>
                <div className="qa-icon">{item.icon}</div>
                <div className="qa-text">
                  <div className="qa-lbl">{item.lbl}</div>
                  {item.sub && <div className="qa-sub">{item.sub}</div>}
                </div>
                {item.count > 0 && <span className="qa-count">{item.count}</span>}
                <FiChevronRight className="qa-arrow" size={13} />
              </button>
            ))}
          </div>
          )}

        </div>
      </div>

      {/* -- DAY DETAIL MODAL -- */}
      {selectedDay && (
        <div className="attendance-modal-backdrop" onClick={() => setSelectedDay(null)}>
          <div className="attendance-modal" onClick={e => e.stopPropagation()}>
            <div className="attendance-modal-header">
              <FiCalendar size={16} color="rgba(255,255,255,.6)" />
              <div>
                <h3>Day Details</h3>
                <p>{formatDate(selectedDay, 'EEEE, dd MMM yyyy')}</p>
              </div>
              <button className="attendance-modal-close" onClick={() => setSelectedDay(null)}>
                <FiX size={12} />
              </button>
            </div>
            <div className="attendance-modal-body">
              <div className="attendance-modal-row">
                <span>Status</span>
                <Badge variant={getStatusVariant(dayDetail?.is_half_day ? 'half_day' : dayDetail?.status)}>
                  {dayDetail?.is_half_day
                    ? (dayDetail?.half_day_session ? `Half Day (${formatSession(dayDetail.half_day_session)})` : 'Half Day')
                    : (dayDetail?.status ? String(dayDetail.status).replace(/_/g, ' ') : 'No Data')}
                </Badge>
              </div>
              <div className="attendance-modal-row">
                <span>Duration</span>
                <strong>
                  {typeof dayDetail?.hours === 'number'
                    ? `${Math.floor(dayDetail.hours)}h ${Math.round((dayDetail.hours % 1) * 60)}m`
                    : (dayDetail?.hours || '-')}
                </strong>
              </div>
              {dayDetail?.isLate && (
                <div className="attendance-modal-row">
                  <span>Late By</span>
                  <strong style={{ color: 'var(--amber-text)' }}>{minutesToHours(dayDetail.lateByMinutes)}</strong>
                </div>
              )}
              <div className="time-boxes">
                <div className="time-box">
                  <span>Check In</span>
                  <strong>{dayDetail?.inTime ? fmtTime(dayDetail.inTime) : '-'}</strong>
                </div>
                <div className="time-box">
                  <span>Check Out</span>
                  <strong style={!dayDetail?.outTime && dayDetail?.inTime ? { color: 'var(--red-text)' } : {}}>
                    {(!dayDetail?.outTime && dayDetail?.inTime) ? 'Miss' : dayDetail?.outTime ? fmtTime(dayDetail.outTime) : '-'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
