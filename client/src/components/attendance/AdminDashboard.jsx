import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers, FiCheckCircle, FiXCircle, FiCalendar, FiClock,
  FiRefreshCw, FiLogIn, FiLogOut, FiSun,
  FiChevronLeft, FiChevronRight, FiActivity, FiCheck, FiX
} from 'react-icons/fi';
import { UserContext } from '../../contexts/UserContext';
import attendanceAPI from '../../api/attendance/attendance.api';
import masterAPI from '../../api/attendance/master.api';
import { isToday } from './utils/helpers';
import toast from 'react-hot-toast';
import AdminAnalyticsTab from './AdminAnalyticsTab';
import './AdminDashboard.css';

/* ── Constants ── */
const ALLOWED_USERNAMES = new Set([
  'shalini_arun', 'manu_pillai', 'suraj_rajan', 'rajan_aranamkatte', 'uday_zope'
]);

/* ── Helpers ── */
const fmtTime = iso =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

const fmtDate = d => {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const toYMD = d => {
  const pd = typeof d === 'string' ? new Date(d) : d;
  const y = pd.getFullYear(), m = String(pd.getMonth() + 1).padStart(2, '0'), dy = String(pd.getDate()).padStart(2, '0');
  return `${y}-${m}-${dy}`;
};

const calClass = (rec, isTd) => {
  if (!rec) return '';
  if (rec.status === 'half_day') return 'half_day';
  if (rec.status === 'present') return rec.isLate ? 'late' : 'present';
  return { absent: 'absent', holiday: 'holiday', weekly_off: 'off', leave: 'leave' }[rec.status] || '';
};

const LEAVE_STAGE_LABELS = {
  stage_1_hod: 'HOD',
  stage_2_shalini: 'Shalini',
  stage_3_final: 'Final',
};

const LeaveStageChip = ({ status, stage }) => {
  if (status === 'approved') return <span className="adb-leave-chip approved">Approved</span>;
  if (status === 'rejected') return <span className="adb-leave-chip rejected">Rejected</span>;
  if (status === 'pending') return <span className="adb-leave-chip pending">{LEAVE_STAGE_LABELS[stage] || 'Pending'}</span>;
  return null;
};

/* ══ Main Component ══════════════════════════════════════════════════ */
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const username = String(user?.username || '').toLowerCase();
  const isAllowedAdmin = ALLOWED_USERNAMES.has(username);

  /* ── State ── */
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [approving, setApproving] = useState({});
  const [myStatus, setMyStatus] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [activeTab, setActiveTab] = useState('calendar'); 

  const [data, setData] = useState({
    stats: { total: 0, present: 0, absent: 0, onLeave: 0, late: 0 },
    pendingLeaves: [],
    pendingRegularization: []
  });

  const [calMonth, setCalMonth] = useState(new Date());
  const [calData, setCalData] = useState(null);
  const [calLoading, setCalLoading] = useState(false);
  const [liveTimer, setLiveTimer] = useState('0h 00m 00s');

  const [dailyDate, setDailyDate] = useState(toYMD(new Date()));
  const [dailySummary, setDailySummary] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  /* ── Data Loading ── */
  const loadStats = useCallback(async (cid) => {
    try {
      setLoading(true);
      const [dashRes, myRes] = await Promise.all([
        attendanceAPI.getAdminDashboard(cid ? { company_id: cid } : {}),
        attendanceAPI.getTodayStatus().catch(() => null),
      ]);
      if (dashRes?.success) setData(dashRes.data);
      if (myRes) setMyStatus(myRes);
    } catch { toast.error('Failed to load stats'); }
    finally { setLoading(false); }
  }, []);

  const loadCompanies = useCallback(async () => {
    try {
      const res = await masterAPI.getCompanies();
      const list = res?.data || [];
      setCompanies(list);
      if (list.length > 0) {
        setCompanyId(list[0]._id);
        await loadStats(list[0]._id);
      } else await loadStats('');
    } catch { await loadStats(''); }
  }, [loadStats]);

  const loadCalendar = useCallback(async (mo, yr) => {
    try {
      setCalLoading(true);
      const res = await attendanceAPI.getDashboardData(mo, yr);
      setCalData(res);
    } catch { toast.error('Failed to load calendar'); }
    finally { setCalLoading(false); }
  }, []);

  const loadDailySummary = useCallback(async (date, cid) => {
    if (!isAllowedAdmin) return;
    try {
      setDailyLoading(true);
      const res = await attendanceAPI.getAdminDashboard({ company_id: cid, date });
      const present = res?.data?.presentToday || [];
      const absent = res?.data?.absentToday || [];
      const late = res?.data?.lateToday || [];
      const onLeave = res?.data?.onLeaveToday || [];
      
      const map = new Map();
      const add = (e, s) => {
        const id = e.employeeId || e.id || e.name;
        if (!map.has(id)) map.set(id, { name: e.employeeName || e.name, in: e.first_in, out: e.last_out, status: s, late: e.late_by || 0 });
      };
      present.forEach(e => add(e, 'present'));
      late.forEach(e => add(e, 'late'));
      onLeave.forEach(e => add(e, 'leave'));
      absent.forEach(e => add(e, 'absent'));
      
      setDailySummary(Array.from(map.values()));
    } catch { setDailySummary([]); }
    finally { setDailyLoading(false); }
  }, [isAllowedAdmin]);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);
  useEffect(() => { loadCalendar(calMonth.getMonth() + 1, calMonth.getFullYear()); }, [calMonth, loadCalendar]);
  useEffect(() => { if (activeTab === 'daily') loadDailySummary(dailyDate, companyId); }, [activeTab, dailyDate, companyId, loadDailySummary]);

  /* Timer */
  useEffect(() => {
    let iv;
    const ps = myStatus;
    if (ps?.isInSession && ps?.sessionStartTime) {
      const tick = () => {
        const total = Math.round((ps.previousSessionsHours || 0) * 3600) + Math.floor((Date.now() - new Date(ps.sessionStartTime)) / 1000);
        const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
        setLiveTimer(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
      };
      tick(); iv = setInterval(tick, 1000);
    } else setLiveTimer(ps?.workHours || '0h 00m 00s');
    return () => clearInterval(iv);
  }, [myStatus]);

  /* Actions */
  const handlePunch = async () => {
    try {
      setPunching(true);
      const isIn = myStatus?.isInSession || (myStatus?.first_in && !myStatus?.last_out);
      await attendanceAPI.punch({ type: isIn ? 'OUT' : 'IN', method: 'WEB' });
      toast.success('Punched successfully');
      loadStats(companyId);
      loadCalendar(calMonth.getMonth() + 1, calMonth.getFullYear());
    } catch (e) { toast.error(e?.message || 'Punch failed'); }
    finally { setPunching(false); }
  };

  const handleAction = async (id, kind, status) => {
    setApproving(p => ({ ...p, [id]: true }));
    try {
      await attendanceAPI.approveRequest(kind === 'leave' ? 'leave' : 'regularization', id, status);
      toast.success(status === 'approved' ? 'Approved' : 'Rejected');
      loadStats(companyId);
    } catch { toast.error('Action failed'); }
    finally { setApproving(p => ({ ...p, [id]: false })); }
  };

  /* Calendar */
  const getDays = () => {
    const y = calMonth.getFullYear(), mo = calMonth.getMonth();
    let fd = new Date(y, mo, 1).getDay();
    fd = fd === 0 ? 6 : fd - 1;
    const total = new Date(y, mo + 1, 0).getDate();
    return [...Array(fd).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  };

  if (loading && !data.stats.total) return <div className="loading-state">Loading...</div>;

  const { stats, pendingLeaves, pendingRegularization } = data;
  const allPending = [...pendingLeaves.map(r => ({ ...r, _kind: 'leave' })), ...pendingRegularization.map(r => ({ ...r, _kind: 'reg' }))];
  const isIn = myStatus?.isInSession || (myStatus?.first_in && !myStatus?.last_out);
  const showMiss = !myStatus?.last_out && myStatus?.first_in && !isToday(myStatus?.date);
  
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="dashboard-container">
      <div className="adb-header">
        <div className="adb-header-inner">
          <div>
            <h1 className="adb-title">{getGreeting()}, {user?.first_name || 'Admin'}</h1>
            <p className="adb-subtitle">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          
          <div className="adb-header-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="adb-today-widget">
               <div className="adb-tw-info">
                  <div className="adb-tw-label">Today</div>
                  <div className="adb-tw-times">
                    <span className="adb-tw-in"><FiLogIn size={12} /> {fmtTime(myStatus?.first_in)}</span>
                    <span className="adb-tw-out">{fmtTime(myStatus?.last_out)}</span>
                  </div>
               </div>
               <button className={`adb-tw-btn ${!isIn ? 'in' : ''}`} onClick={handlePunch} disabled={punching}>
                 {isIn ? <FiLogOut /> : <FiLogIn />}
                 {punching ? '...' : isIn ? 'Punch Out' : 'Punch In'}
               </button>
            </div>
            
            <button className="db-hero-refresh" style={{ color: '#94a3b8' }} onClick={() => loadStats(companyId)}><FiRefreshCw size={13} /></button>
          </div>
        </div>
      </div>

      <div className="adb-content-grid">
        <div className="adb-main-column">
          <div className="adb-stats-grid">
            <div className="adb-stat-card"><div className="adb-stat-val">{calData?.monthStats?.present || 0}</div><div className="adb-stat-lbl">Days Present</div><div className="adb-stat-sub">OF {calData?.monthStats?.workingDays || 0} WORKING DAYS</div></div>
            <div className="adb-stat-card"><div className="adb-stat-val">28</div><div className="adb-stat-lbl">Leave Balance</div><div className="adb-stat-sub">0 USED THIS MONTH</div></div>
            <div className="adb-stat-card"><div className="adb-stat-val">{calData?.monthStats?.late || 0}</div><div className="adb-stat-lbl">Late Arrivals</div><div className="adb-stat-sub">THIS MONTH</div></div>
            <div className="adb-stat-card"><div className="adb-stat-val">{(calData?.monthStats?.workingDays || '—')}</div><div className="adb-stat-lbl">Weekly Avg Hours</div><div className="adb-stat-sub">BASED ON DAYS WORKED</div></div>
          </div>

          <div className="adb-tab-bar">
            <button className={`adb-tab ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}><FiCalendar /> My Attendance</button>
            {isAllowedAdmin && <button className={`adb-tab ${activeTab === 'daily' ? 'active' : ''}`} onClick={() => setActiveTab('daily')}><FiActivity /> Daily Summary</button>}
            {isAllowedAdmin && <button className={`adb-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}><FiUsers /> Analytics</button>}
          </div>

          {activeTab === 'calendar' ? (
            <div className="adb-tab-content-wrap">

              <div className="adb-cal-wrapper">
                <div className="adb-cal-header">
                  <button className="adb-cal-nav" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}><FiChevronLeft /></button>
                  <div className="adb-cal-month">{calMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                  <button className="adb-cal-nav" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}><FiChevronRight /></button>
                </div>
                {calLoading ? <div className="adb-cal-loading">Loading...</div> : (
                  <div className="adb-cal-grid">
                    {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <div key={d} className="adb-cal-dname">{d}</div>)}
                    {getDays().map((day, i) => {
                      const rec = day ? (calData?.calendar?.[`${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`]) : null;
                      const isTd = day && isToday(new Date(calMonth.getFullYear(), calMonth.getMonth(), day));
                      return <div key={i} className={`adb-cal-day ${calClass(rec, isTd)} ${isTd ? 'today' : ''} ${!day ? 'empty' : ''}`}>{day}</div>;
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'daily' ? (
            <div className="adb-daily-wrap">
               <div className="adb-daily-toolbar" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                 {companies.length > 0 && (
                    <select 
                      className="db-company-select" 
                      style={{ padding: '8px 12px', border: '1px solid var(--adb-border)', borderRadius: '8px' }} 
                      value={companyId} 
                      onChange={e => { setCompanyId(e.target.value); loadStats(e.target.value); }}
                    >
                      {companies.map(c => <option key={c._id} value={c._id}>{c.company_name}</option>)}
                    </select>
                  )}
                  <input type="date" className="adb-daily-date" style={{ padding: '8px 12px', border: '1px solid var(--adb-border)', borderRadius: '8px' }} value={dailyDate} max={toYMD(new Date())} onChange={e => setDailyDate(e.target.value)} />
               </div>
               <div className="adb-daily-table-wrap">
                  <table className="adb-daily-table">
                    <thead><tr><th>#</th><th>Employee</th><th>Status</th><th>In</th><th>Out</th><th>Late</th></tr></thead>
                    <tbody>
                      {dailySummary.map((e, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{e.name}</td>
                          <td><span className={`adb-status-pill adb-s-${e.status}`}>{e.status}</span></td>
                          <td>{fmtTime(e.in)}</td>
                          <td>{fmtTime(e.out)}</td>
                          <td>{e.late}m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          ) : activeTab === 'analytics' ? (
            <AdminAnalyticsTab data={{
              stats: {
                present: dailySummary.filter(e => e.status === 'present' || e.status === 'late').length,
                absent: dailySummary.filter(e => e.status === 'absent').length,
                onLeave: dailySummary.filter(e => e.status === 'leave').length,
              },
              pendingLeaves,
              pendingRegularization,
              dailySummary
            }} />
          ) : null}
        </div>

        <div className="adb-side-column">
          <div className="ph-card restored">
            <div className="ph-top">
              <div style={{ flex: 1 }}>
                <div className="adb-tw-label" style={{ marginBottom: '8px', color: 'var(--adb-ink-2)' }}>My Status</div>
                <div className={`ph-status ${isIn ? 'on' : 'off'}`}><span className="ph-dot" />{isIn ? 'Currently Clocked in' : 'Not clocked in'}</div>
                <div className="ph-timer" style={{ fontSize: '1.5rem' }}>{liveTimer}</div>
                <div className="ph-timer-lbl">Hours Logged Today</div>
                <div className="ph-meta" style={{ gap: '1rem', marginTop: '0.75rem' }}>
                  <div className="ph-meta-item"><span className="ph-meta-key">Shift Start</span><span className="ph-meta-val">{fmtTime(myStatus?.first_in)}</span></div>
                  <div className="ph-meta-item"><span className="ph-meta-key">Total Break</span><span className="ph-meta-val">0h 00m</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="adb-sidebar-card">
            <div className="adb-side-card-head"><span className="adb-side-card-title">Pending Approvals</span>{allPending.length > 0 && <span className="adb-side-badge">{allPending.length}</span>}</div>
            <div className="adb-approvals-list">
              {allPending.length === 0 ? <div className="adb-side-empty"><FiCheckCircle size={28} /> All clear!</div> : allPending.slice(0, 8).map((req, i) => (
                <div key={i} className="adb-approval-row">
                  <div className="adb-appr-av">{req.employeeName?.[0]}</div>
                  <div className="adb-appr-body">
                    <div className="adb-appr-name">{req.employeeName}</div>
                    <div className="adb-appr-meta">{req._kind === 'leave' ? req.leaveType : 'Regularization'} • {req.totalDays || fmtDate(req.date)}</div>
                    <div className="adb-appr-actions">
                      <button className="act-appr approve" onClick={() => handleAction(req.id, req._kind, 'approved')} disabled={approving[req.id]}><FiCheck /> Approve</button>
                      <button className="act-appr reject" onClick={() => handleAction(req.id, req._kind, 'rejected')} disabled={approving[req.id]}><FiX /> Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
