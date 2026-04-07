import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers, FiClock, FiCalendar, FiCheckCircle, FiFileText,
  FiChevronLeft, FiChevronRight, FiCheck, FiX, FiAlertCircle,
  FiLogOut, FiLogIn, FiActivity, FiArrowRight, FiRefreshCw,
  FiAlertTriangle
} from 'react-icons/fi';
import attendanceAPI from '../../api/attendance/attendance.api';
import { API_BASE_URL } from './utils/constants';
import { formatDate } from './utils/helpers';
import toast from 'react-hot-toast';
import './HODDashboard.css';

/* --- utils --- */
const fmt = (date, f) => {
  const d = new Date(date);
  if (isNaN(d)) return '';
  const pad = n => String(n).padStart(2, '0');
  return f
    .replace('EEEE', d.toLocaleDateString('en', { weekday: 'long' }))
    .replace('ddd',  d.toLocaleDateString('en', { weekday: 'short' }))
    .replace('dd',   pad(d.getDate()))
    .replace('MMM',  d.toLocaleDateString('en', { month: 'short' }))
    .replace('yyyy', d.getFullYear());
};
const fmtTime = s => { if (!s) return '—'; const d = new Date(s); if (isNaN(d)) return s; let h = d.getHours(), m = String(d.getMinutes()).padStart(2,'0'), ap = h>=12?'PM':'AM'; h=h%12||12; return `${h}:${m} ${ap}`; };
const fmtLate = mins => { if (!mins) return ''; const m=parseInt(mins); if(m<60) return `${m}m late`; return `${Math.floor(m/60)}h ${m%60}m late`; };
const initials = (n='') => n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
const formatSession = (s) => (s === 'first_half' ? '1st Half' : '2nd Half');

const DOT_LABELS = { present:'P', absent:'A', late:'L', present_late:'L', present_early:'E', late_early:'LE', half_day:'½', leave:'LV', holiday:'HD', weekly_off:' ', empty:'' };

const HODDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading]       = useState(true);
  const [data, setData]             = useState(null);
  const [personal, setPersonal]     = useState(null);
  const [punching, setPunching]     = useState(false);
  const [weekOff, setWeekOff]       = useState(0);
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, remark: '', type: 'leave' });
  const [pendingTab, setPendingTab] = useState('leaves');
  const [todayTab, setTodayTab]     = useState('absent');
  const [exceptionsOpen, setExceptionsOpen] = useState(false);
  const exceptionsRef = useRef(null);

  useEffect(() => { fetchData(); }, []);

  // Close exceptions popover on outside click
  useEffect(() => {
    const handler = (e) => {
      if (exceptionsRef.current && !exceptionsRef.current.contains(e.target)) {
        setExceptionsOpen(false);
      }
    };
    if (exceptionsOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exceptionsOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [res, personalRes] = await Promise.all([
        attendanceAPI.getHODDashboard(),
        attendanceAPI.getTodayStatus().catch(() => null)
      ]);
      setData(res?.data || { summary:{}, absent:[], late:[], pendingLeaves:[], pendingRegularization:[], teamCalendar:[] });
      if (personalRes) setPersonal(personalRes);
    } catch {
      toast.error('Failed to load dashboard');
      setData({ summary:{}, absent:[], late:[], pendingLeaves:[], pendingRegularization:[], teamCalendar:[] });
    } finally { setLoading(false); }
  };

  const handlePersonalPunch = async () => {
    try {
      setPunching(true);
      const isIn = personal?.first_in && !personal?.last_out;
      await attendanceAPI.punch({ type: isIn ? 'OUT' : 'IN', method: 'WEB' });
      toast.success(`Punched ${isIn ? 'OUT' : 'IN'}`);
      fetchData();
    } catch (e) {
      toast.error(e?.message || 'Punch failed');
    } finally { setPunching(false); }
  };

  const getWeekDays = (off=0) => {
    const today = new Date(), dow = today.getDay(), diff = dow===0?-6:1-dow;
    const mon = new Date(today); mon.setDate(today.getDate()+diff+off*7);
    return Array.from({length:7},(_,i)=>{ const d=new Date(mon); d.setDate(mon.getDate()+i); return d; });
  };

  const weekDays  = getWeekDays(weekOff);
  const weekRange = `${fmt(weekDays[0],'dd MMM')} — ${fmt(weekDays[6],'dd MMM yyyy')}`;
  const dayKey    = d => new Date(d).toLocaleDateString('en-CA');
  const todayKey  = dayKey(new Date());

  const handleLeaveAction = async (id, status) => {
    if (status === 'rejected') {
      setRejectModal({ open: true, id, remark: '', type: 'leave' });
      return;
    }
    try {
      await attendanceAPI.approveRequest('leave', id, status, '');
      toast.success(`Leave ${status}`);
      fetchData();
    }
    catch { toast.error('Action failed'); }
  };

  const handleRegAction = async (id, status) => {
    if (status === 'rejected') {
      setRejectModal({ open: true, id, remark: '', type: 'regularization' });
      return;
    }
    try {
      await attendanceAPI.approveRequest('regularization', id, status, '');
      toast.success(`Regularization ${status}`);
      fetchData();
    } catch { toast.error('Action failed'); }
  };

  const submitRejectAction = async () => {
    const remark = rejectModal.remark.trim();
    if (!remark) {
      toast.error('Rejection reason is required.');
      return;
    }
    try {
      await attendanceAPI.approveRequest(rejectModal.type, rejectModal.id, 'rejected', remark);
      toast.success(`${rejectModal.type === 'leave' ? 'Leave' : 'Regularization'} rejected`);
      setRejectModal({ open: false, id: null, remark: '', type: 'leave' });
      fetchData();
    } catch {
      toast.error('Action failed');
    }
  };

  if (loading) return (
    <div className="hod-page">
      <div className="hod-loading"><div className="hod-spin" /><span>Loading dashboard...</span></div>
    </div>
  );

  const { summary={}, pendingLeaves=[], pendingRegularization=[], teamCalendar=[], late=[], absent=[], halfDay=[] } = data||{};
  const leaveCount = pendingLeaves.length, regCount = pendingRegularization.length;
  const totalPending = leaveCount + regCount;
  const exceptionsVal = (summary.earlyOut ?? 0) + (summary.halfDay ?? 0);

  const STATS = [
    { icon:'✅', cls:'present', val:summary?.present  ??0, lbl:'Present',    pill:'Today', pillCls:'green' },
    { icon:'❌', cls:'absent',  val:summary?.absent   ??0, lbl:'Absent',     pill:'Today', pillCls:'red'   },
    { icon:'🕒', cls:'late',    val:summary?.late     ??0, lbl:'Late In',    pill:'Today', pillCls:'amber' },
    { icon:'🌴', cls:'leave',   val:summary?.onLeave  ??0, lbl:'On Leave',   pill:'Today', pillCls:'grey'  },
    { icon:'⚠️', cls:'exceptions', val:exceptionsVal, lbl:'Exceptions', pill:'Click', pillCls:'amber', clickable:true },
  ];

  const isPersonalIn = personal?.first_in && !personal?.last_out;

  return (
    <div className="hod-page">

      {/* HEADER */}
      <div className="hod-header">
        <div className="hod-header-left">
          <h1>📊 Team Overview</h1>
          <p>Real-time attendance · Approvals · Analytics</p>
        </div>
        <div className="hod-header-right">
          <div className="hod-personal-punch">
            <div className="hod-punch-info">
              <span className="punch-label">My Status</span>
              <span className="punch-times">
                {personal?.first_in ? `${fmtTime(personal.first_in)} In` : 'Not In'}
              </span>
            </div>
            <button
              className={`hod-punch-btn ${isPersonalIn ? 'out' : 'in'}`}
              onClick={handlePersonalPunch}
              disabled={punching}
            >
              {isPersonalIn ? <FiLogOut size={14}/> : <FiLogIn size={14}/>}
              {punching ? '...' : (isPersonalIn ? 'Out' : 'In')}
            </button>
          </div>
          <span className="hod-date-pill">{fmt(new Date(),'EEEE, dd MMM yyyy')}</span>
          <button className="hod-btn refresh-btn" onClick={fetchData}><FiRefreshCw size={12}/></button>
        </div>
      </div>

      {/* STAT TILES — 5 tiles, last is clickable Exceptions */}
      <div className="hod-stats hod-stats-5">
        {STATS.map((s,i) => (
          <div
            key={i}
            className={`hod-stat${s.clickable ? ' hod-stat-clickable' : ''}`}
            onClick={s.clickable ? () => setExceptionsOpen(o => !o) : undefined}
            ref={s.clickable ? exceptionsRef : undefined}
            style={{ position: s.clickable ? 'relative' : undefined }}
          >
            <div className="hod-stat-top">
              <div className={`hod-stat-icon ${s.cls}`} style={{fontSize:'1.125rem'}}>{s.icon}</div>
              <span className={`hod-stat-pill ${s.pillCls}`}>{s.pill}</span>
            </div>
            <div>
              <div className="hod-stat-val">{s.val}</div>
              <div className="hod-stat-lbl">{s.lbl}</div>
            </div>

            {/* Exceptions breakdown popover */}
            {s.clickable && exceptionsOpen && (
              <div className="hod-exceptions-popover" onClick={e => e.stopPropagation()}>
                <div className="hod-exp-title">Exceptions Breakdown</div>
                <div className="hod-exp-row">
                  <span>🌅 Early Out</span>
                  <strong>{summary?.earlyOut ?? 0}</strong>
                </div>
                <div className="hod-exp-row">
                  <span>🌗 Half Day</span>
                  <strong>{summary?.halfDay ?? 0}</strong>
                </div>
                <div className="hod-exp-divider"/>
                <div className="hod-exp-row hod-exp-total">
                  <span>Total Exceptions</span>
                  <strong>{exceptionsVal}</strong>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* PENDING ACTIONS — full-width priority card */}
      {totalPending > 0 ? (
        <div className="hod-card hod-pending-card">
          <div className="hod-card-head">
            <div>
              <div className="hod-card-title">
                <FiAlertCircle size={15} style={{ color: '#c87f0a' }} />
                Pending Actions
              </div>
              <div className="hod-card-sub">{totalPending} item{totalPending !== 1 ? 's' : ''} awaiting your review</div>
            </div>
            <div className="hod-pending-tabs">
              <button
                className={`hod-ptab ${pendingTab === 'leaves' ? 'active' : ''}`}
                onClick={() => setPendingTab('leaves')}
              >
                🌴 Leaves
                {leaveCount > 0 && <span className="hod-tab-badge">{leaveCount}</span>}
              </button>
              <button
                className={`hod-ptab ${pendingTab === 'regs' ? 'active' : ''}`}
                onClick={() => setPendingTab('regs')}
              >
                📝 Regularizations
                {regCount > 0 && <span className="hod-tab-badge hod-tab-badge-purple">{regCount}</span>}
              </button>
            </div>
          </div>

          {/* Leaves tab */}
          {pendingTab === 'leaves' && (
            leaveCount === 0 ? (
              <div className="hod-empty"><div className="hod-empty-icon">✨</div><span>No pending leaves</span></div>
            ) : (
              <div className="hod-pending-list">
                {pendingLeaves.map((req, i) => (
                  <div key={i} className="hod-pending-row">
                    <div className="hod-pending-top">
                      <div className="hod-pending-av">{initials(req.employeeName)}</div>
                      <div className="hod-pending-info">
                        <div className="hod-pending-name">{req.employeeName}</div>
                        <div className="hod-pending-meta">
                          <span className="hod-meta-main">
                            {req.leaveType} · {req.is_half_day ? `Half Day (${formatSession(req.half_day_session)})` : `${req.totalDays}d`} · {fmt(req.fromDate,'dd MMM')} – {fmt(req.toDate,'dd MMM')}
                          </span>
                          {req.currentBalance && (
                            <span className="hod-meta-bal">
                              (Balance: <strong>{req.currentBalance.available}d</strong>)
                            </span>
                          )}
                          {req.attachment_urls?.length > 0 && (
                            <a
                              href={`${API_BASE_URL.replace('/api', '')}/${req.attachment_urls[0]}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hod-attachment-link"
                              title="View Document"
                            >
                              <FiFileText size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                      <span className="hod-pending-leave-type">{req.leaveType}</span>
                    </div>
                    {req.reason && <div className="hod-pending-reason">"{req.reason}"</div>}
                    <div className="hod-pending-acts">
                      <button className="hod-act approve" onClick={() => handleLeaveAction(req.id,'approved')}><FiCheck size={12}/> Approve</button>
                      <button className="hod-act reject"  onClick={() => handleLeaveAction(req.id,'rejected')}><FiX size={12}/> Reject</button>
                    </div>
                  </div>
                ))}
                {leaveCount > 5 && (
                  <div style={{padding:'.75rem 1.125rem',textAlign:'center'}}>
                    <button className="hod-btn" onClick={() => navigate('/attendance/hod/leave-approval')}>
                      View all {leaveCount} requests <FiArrowRight size={12}/>
                    </button>
                  </div>
                )}
              </div>
            )
          )}

          {/* Regularizations tab */}
          {pendingTab === 'regs' && (
            regCount === 0 ? (
              <div className="hod-empty"><div className="hod-empty-icon">✨</div><span>No pending regularizations</span></div>
            ) : (
              <div className="hod-pending-list">
                {pendingRegularization.map((req, i) => (
                  <div key={i} className="hod-pending-row">
                    <div className="hod-pending-top">
                      <div className="hod-pending-av">{initials(req.employeeName)}</div>
                      <div className="hod-pending-info">
                        <div className="hod-pending-name">{req.employeeName}</div>
                        <div className="hod-pending-meta">
                          <span className="hod-meta-main">
                            {req.type?.replace(/_/g,' ')} · {fmt(req.date,'dd MMM yyyy')}
                          </span>
                        </div>
                      </div>
                      <span className="hod-pending-type reg">Reg</span>
                    </div>
                    {req.reason && <div className="hod-pending-reason">"{req.reason}"</div>}
                    <div className="hod-pending-acts">
                      <button className="hod-act approve" onClick={() => handleRegAction(req.id || req._id, 'approved')}><FiCheck size={12}/> Approve</button>
                      <button className="hod-act reject"  onClick={() => handleRegAction(req.id || req._id, 'rejected')}><FiX size={12}/> Reject</button>
                    </div>
                  </div>
                ))}
                {regCount > 5 && (
                  <div style={{padding:'.75rem 1.125rem',textAlign:'center'}}>
                    <button className="hod-btn" onClick={() => navigate('/attendance/hod/regularization-approval')}>
                      View all {regCount} requests <FiArrowRight size={12}/>
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      ) : (
        <div className="hod-all-clear">
          <FiCheckCircle size={15} />
          All caught up — no pending approvals today!
        </div>
      )}

      {/* MAIN 2-COL GRID */}
      <div className="hod-main-grid">

        {/* LEFT — Team Calendar */}
        <div className="hod-main-left">
          <div className="hod-card">
            <div className="hod-card-head">
              <div>
                <div className="hod-card-title"><FiCalendar size={14}/> Team Availability</div>
                <div className="hod-card-sub">{weekRange}</div>
              </div>
              <div className="hod-week-nav">
                <button className="hod-week-btn" onClick={()=>setWeekOff(o=>o-1)}><FiChevronLeft size={14}/></button>
                <button className={`hod-week-btn ${weekOff===0?'active':''}`} onClick={()=>setWeekOff(0)}>Today</button>
                <button className="hod-week-btn" onClick={()=>setWeekOff(o=>o+1)}><FiChevronRight size={14}/></button>
              </div>
            </div>

            <div className="hod-cal-wrap">
              <table className="hod-cal-table">
                <thead>
                  <tr>
                    <th className="col-name">Member</th>
                    {weekDays.map((d,i) => {
                      const isToday = dayKey(d)===todayKey;
                      const isWknd  = d.getDay()===0||d.getDay()===6;
                      return (
                        <th key={i} className={`col-day ${isToday?'col-today':''}`} style={{opacity:isWknd&&!isToday?.55:1}}>
                          <div style={{lineHeight:1.3}}>
                            <div>{fmt(d,'ddd')}</div>
                            <div style={{fontFamily:'DM Mono,monospace',fontSize:'.5625rem',marginTop:1}}>{fmt(d,'dd MMM')}</div>
                            {isToday&&<div style={{fontSize:'.45rem',color:'#22c47a',marginTop:2,letterSpacing:'.3px'}}>TODAY</div>}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {teamCalendar.length===0 ? (
                    <tr><td colSpan={8}><div className="hod-empty"><div className="hod-empty-icon">👥</div><span>No team members found</span></div></td></tr>
                  ) : teamCalendar.map((emp,ei) => (
                    <tr key={ei}>
                      <td>
                        <div className="hod-emp-cell">
                          <div className="hod-emp-av">{initials(emp.name)}</div>
                          <div>
                            <div className="hod-emp-name">{emp.name}</div>
                            <div className="hod-emp-role">{emp.role||'Team Member'}</div>
                          </div>
                        </div>
                      </td>
                      {weekDays.map((d,di) => {
                        const ds     = dayKey(d);
                        const status = emp.attendance?.[ds]||'empty';
                        const lateBy = emp.attendance?.[`${ds}_late_by`];
                        const isWknd = d.getDay()===0||d.getDay()===6;
                        const isToday= ds===todayKey;
                        const dotCls = isWknd?'weekend':(status||'empty');
                        let tip = status.replace(/_/g,' ');
                        if (status === 'half_day') {
                          const sess = emp.attendance?.[`${ds}_session`];
                          tip = `Half Day (${formatSession(sess)})`;
                        } else if (lateBy) {
                          tip = `${status.replace(/_/g,' ')} · ${fmtLate(lateBy)}`;
                        }
                        return (
                          <td key={di} className={`hod-dot-cell${isToday?' td-today':''}`}>
                            <div className={`hod-dot ${dotCls}`} title={tip}>
                              {!isWknd&&DOT_LABELS[status]}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="hod-cal-legend">
              {[['Present','#22c47a'],['Late','#f59e3a'],['Absent','#e84040'],['Half Day','#4a90e8'],['Leave','#8b6be0'],['Holiday','#4a90e8'],['Week Off','#e4e7f0']].map(([l,c],i)=>(
                <span key={i}><span className="hod-leg-dot" style={{background:c}}/>{l}</span>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Today Alerts (tabbed) */}
        <div className="hod-main-right">
          <div className="hod-card">
            <div className="hod-card-head">
              <div className="hod-card-title">👥 Today's Alerts</div>
              <div className="hod-today-tabs">
                <button
                  className={`hod-ttab ${todayTab === 'absent' ? 'active' : ''}`}
                  onClick={() => setTodayTab('absent')}
                >
                  Absent
                  {absent.length > 0 && <span className="hod-ttab-badge hod-ttab-red">{absent.length}</span>}
                </button>
                <button
                  className={`hod-ttab ${todayTab === 'late' ? 'active' : ''}`}
                  onClick={() => setTodayTab('late')}
                >
                  Late
                  {late.length > 0 && <span className="hod-ttab-badge hod-ttab-amber">{late.length}</span>}
                </button>
                <button
                  className={`hod-ttab ${todayTab === 'halfday' ? 'active' : ''}`}
                  onClick={() => setTodayTab('halfday')}
                >
                  Half Day
                  {halfDay.length > 0 && <span className="hod-ttab-badge hod-ttab-blue">{halfDay.length}</span>}
                </button>
              </div>
            </div>

            {/* Absent Tab */}
            {todayTab === 'absent' && (
              absent.length === 0 ? (
                <div className="hod-empty"><div className="hod-empty-icon">🎉</div><span>Everyone's in today!</span></div>
              ) : (
                <div className="hod-person-list">
                  {absent.map((emp,i) => (
                    <div key={i} className="hod-person-row">
                      <div className="hod-person-av absent">{initials(emp.name)}</div>
                      <div className="hod-person-info">
                        <div className="hod-person-name">{emp.name}</div>
                        <div className="hod-person-sub">{emp.onLeave ? (emp.leaveType || 'On Leave') : (emp.role || 'Team Member')}</div>
                      </div>
                      <span className={`hod-absent-chip ${emp.onLeave?'leave':''}`}>{emp.onLeave ? 'On Leave' : 'Absent'}</span>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Late Tab */}
            {todayTab === 'late' && (
              late.length === 0 ? (
                <div className="hod-empty"><div className="hod-empty-icon">✅</div><span>No late arrivals today</span></div>
              ) : (
                <div className="hod-person-list">
                  {late.map((emp,i) => (
                    <div key={i} className="hod-person-row">
                      <div className="hod-person-av late">{initials(emp.name)}</div>
                      <div className="hod-person-info">
                        <div className="hod-person-name">{emp.name}</div>
                        <div className="hod-person-sub">Arrived {fmtTime(emp.inTime)}</div>
                      </div>
                      <span className="hod-late-badge">⚠️ {fmtLate(emp.lateBy)}</span>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Half Day Tab */}
            {todayTab === 'halfday' && (
              halfDay.length === 0 ? (
                <div className="hod-empty"><div className="hod-empty-icon">✨</div><span>No half days today</span></div>
              ) : (
                <div className="hod-person-list">
                  {halfDay.map((emp,i) => (
                    <div key={i} className="hod-person-row">
                      <div className="hod-person-av halfday">{initials(emp.name)}</div>
                      <div className="hod-person-info">
                        <div className="hod-person-name">{emp.name}</div>
                        <div className="hod-person-sub">{emp.inTime ? `Punched ${fmtTime(emp.inTime)}` : 'Half Day Leave'}</div>
                      </div>
                      <span className="hod-half-chip">{emp.workHours ? `${emp.workHours.toFixed(1)}h` : 'Leave'}</span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Quick navigation links (minimal, not a block) */}
          <div className="hod-quick-nav">
            <button className="hod-qnav-item" onClick={() => navigate('/attendance/hod/report')}>
              <FiActivity size={13} /> Team Report <FiChevronRight size={12} className="hod-qnav-arrow" />
            </button>
            <button className="hod-qnav-item" onClick={() => navigate('/attendance/my-attendance')}>
              <FiClock size={13} /> My Attendance <FiChevronRight size={12} className="hod-qnav-arrow" />
            </button>
            <button className="hod-qnav-item" onClick={() => navigate('/attendance/leave')}>
              <FiCalendar size={13} /> Apply My Leave <FiChevronRight size={12} className="hod-qnav-arrow" />
            </button>
          </div>
        </div>

      </div>

      {/* REJECT MODAL */}
      {rejectModal.open && (
        <div className="hod-modal-overlay" role="dialog" aria-modal="true" aria-label="Provide rejection reason">
          <div className="hod-modal-card">
            <div className="hod-modal-title">
              Rejection Reason Required
            </div>
            <div className="hod-modal-sub">
              Please provide a clear reason before rejecting this {rejectModal.type === 'leave' ? 'leave request' : 'regularization request'}.
            </div>
            <textarea
              className="hod-modal-input"
              rows={4}
              value={rejectModal.remark}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, remark: e.target.value }))}
              placeholder="Type rejection reason here..."
              maxLength={500}
            />
            <div className="hod-modal-char-count">{rejectModal.remark.length}/500</div>
            <div className="hod-modal-actions">
              <button className="hod-act reject" onClick={() => setRejectModal({ open: false, id: null, remark: '', type: 'leave' })}>
                <FiX size={12} /> Cancel
              </button>
              <button className="hod-act approve" onClick={submitRejectAction}>
                <FiCheck size={12} /> Submit Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HODDashboard;
