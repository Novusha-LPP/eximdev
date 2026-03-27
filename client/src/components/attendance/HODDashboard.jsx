import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers, FiClock, FiCalendar, FiCheckCircle, FiFileText,
  FiChevronLeft, FiChevronRight, FiCheck, FiX, FiAlertCircle, FiTrendingUp, FiLogOut, FiLogIn,
  FiAlertTriangle, FiCheckSquare, FiArrowRight, FiRefreshCw, FiActivity, FiSunset, FiCoffee
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
const fmtTime = s => { if (!s) return '�'; const d = new Date(s); if (isNaN(d)) return s; let h = d.getHours(), m = String(d.getMinutes()).padStart(2,'0'), ap = h>=12?'PM':'AM'; h=h%12||12; return `${h}:${m} ${ap}`; };
const fmtLate = mins => { if (!mins) return ''; const m=parseInt(mins); if(m<60) return `${m}m late`; return `${Math.floor(m/60)}h ${m%60}m late`; };
const initials = (n='') => n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
const formatSession = (s) => (s === 'first_half' ? '1st Half' : '2nd Half');

const DOT_LABELS = { present:'P', absent:'A', late:'L', present_late:'L', present_early:'E', late_early:'LE', half_day:'�', leave:'LV', holiday:'H', weekly_off:'�', empty:'' };

const HODDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data,    setData]    = useState(null);
  const [personal, setPersonal] = useState(null);
  const [punching, setPunching] = useState(false);
  const [weekOff, setWeekOff] = useState(0);

  useEffect(() => { fetchData(); }, []);

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
    } finally {
      setPunching(false);
    }
  };

  const getWeekDays = (off=0) => {
    const today = new Date(), dow = today.getDay(), diff = dow===0?-6:1-dow;
    const mon = new Date(today); mon.setDate(today.getDate()+diff+off*7);
    return Array.from({length:7},(_,i)=>{ const d=new Date(mon); d.setDate(mon.getDate()+i); return d; });
  };

  const weekDays  = getWeekDays(weekOff);
  const weekRange = `${fmt(weekDays[0],'dd MMM')} � ${fmt(weekDays[6],'dd MMM yyyy')}`;
  const todayStr  = new Date().toDateString();

  const handleLeaveAction = async (id, status) => {
    try { await attendanceAPI.approveRequest('leave', id, status); toast.success(`Leave ${status}`); fetchData(); }
    catch { toast.error('Action failed'); }
  };

  if (loading) return (
    <div className="hod-page">
      <div className="hod-loading"><div className="hod-spin" /><span>Loading dashboard�</span></div>
    </div>
  );

  const { summary={}, pendingLeaves=[], pendingRegularization=[], teamCalendar=[], late=[], absent=[], halfDay=[] } = data||{};
  const leaveCount = pendingLeaves.length, regCount = pendingRegularization.length;

  const STATS = [
    { icon:'??', cls:'present', val:summary?.present  ??0, lbl:'Present',   pill:'Today', pillCls:'green' },
    { icon:'?', cls:'absent',  val:summary?.absent   ??0, lbl:'Absent',    pill:'Today', pillCls:'red'   },
    { icon:'?', cls:'late',    val:summary?.late     ??0, lbl:'Late In',   pill:'Today', pillCls:'amber' },
    { icon:'??', cls:'early',   val:summary?.earlyOut ??0, lbl:'Early Out', pill:'Today', pillCls:'amber' },
    { icon:'??', cls:'halfday', val:summary?.halfDay  ??0, lbl:'Half Day',  pill:'Today', pillCls:'grey'  },
    { icon:'???', cls:'leave',   val:summary?.onLeave  ??0, lbl:'On Leave',  pill:'Today', pillCls:'grey'  },
  ];

  return (
    <div className="hod-page">

      {/* HEADER */}
      <div className="hod-header">
        <div className="hod-header-left">
          <h1>?? Department Overview</h1>
          <p>Real-time attendance � Approvals � Analytics</p>
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
              className={`hod-punch-btn ${personal?.first_in && !personal?.last_out ? 'out' : 'in'}`}
              onClick={handlePersonalPunch}
              disabled={punching}
            >
              {personal?.first_in && !personal?.last_out ? <FiLogOut size={14}/> : <FiLogIn size={14}/>}
              {punching ? '...' : (personal?.first_in && !personal?.last_out ? 'Out' : 'In')}
            </button>
          </div>
          <span className="hod-date-pill">{fmt(new Date(),'EEEE, dd MMM yyyy')}</span>
          <button className="hod-btn refresh-btn" onClick={fetchData}><FiRefreshCw size={12}/></button>
        </div>
      </div>

      {/* STAT TILES */}
      <div className="hod-stats">
        {STATS.map((s,i) => (
          <div key={i} className="hod-stat">
            <div className="hod-stat-top">
              <div className={`hod-stat-icon ${s.cls}`} style={{fontSize:'1.125rem'}}>{s.icon}</div>
              <span className={`hod-stat-pill ${s.pillCls}`}>{s.pill}</span>
            </div>
            <div>
              <div className="hod-stat-val">{s.val}</div>
              <div className="hod-stat-lbl">{s.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN 2-COL GRID */}
      <div className="hod-grid">

        {/* LEFT */}
        <div className="hod-col-left">

          {/* Team Calendar */}
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
                      const isToday = d.toDateString()===todayStr;
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
                    <tr><td colSpan={8}><div className="hod-empty"><div className="hod-empty-icon">??</div><span>No team members found</span></div></td></tr>
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
                        const ds     = d.toISOString().split('T')[0];
                        const status = emp.attendance?.[ds]||'empty';
                        const lateBy = emp.attendance?.[`${ds}_late_by`];
                        const isWknd = d.getDay()===0||d.getDay()===6;
                        const isToday= d.toDateString()===todayStr;
                        const dotCls = isWknd?'weekend':(status||'empty');
                        let tip = status.replace(/_/g,' ');
                        if (status === 'half_day') {
                          const sess = emp.attendance?.[`${ds}_session`];
                          tip = `Half Day (${formatSession(sess)})`;
                        } else if (lateBy) {
                          tip = `${status.replace(/_/g,' ')} � ${fmtLate(lateBy)}`;
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

          {/* Late Today */}
          {late.length>0&&(
            <div className="hod-card">
              <div className="hod-card-head">
                <div className="hod-card-title">
                  ? Late Today
                  <span style={{fontSize:'.6875rem',fontWeight:600,padding:'2px 8px',borderRadius:'999px',background:'#fef4e0',color:'#92610a'}}>{late.length}</span>
                </div>
                <button className="hod-btn" onClick={()=>navigate('/hod/attendance')}>Report <FiArrowRight size={12}/></button>
              </div>
              <div className="hod-person-list">
                {late.map((emp,i)=>(
                  <div key={i} className="hod-person-row">
                    <div className="hod-person-av late">{initials(emp.name)}</div>
                    <div className="hod-person-info">
                      <div className="hod-person-name">{emp.name}</div>
                      <div className="hod-person-sub">Arrived {fmtTime(emp.inTime)}</div>
                    </div>
                    <span className="hod-late-badge">?? {fmtLate(emp.lateBy)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Half Day Today */}
          {halfDay.length>0&&(
            <div className="hod-card">
              <div className="hod-card-head">
                <div className="hod-card-title">
                  ?? Half Day Today
                  <span style={{fontSize:'.6875rem',fontWeight:600,padding:'2px 8px',borderRadius:'999px',background:'#e0f2fe',color:'#0369a1'}}>{halfDay.length}</span>
                </div>
              </div>
              <div className="hod-person-list">
                {halfDay.map((emp,i)=>(
                  <div key={i} className="hod-person-row">
                    <div className="hod-person-av halfday">{initials(emp.name)}</div>
                    <div className="hod-person-info">
                      <div className="hod-person-name">{emp.name}</div>
                      <div className="hod-person-sub">{emp.inTime ? `Punched ${fmtTime(emp.inTime)}` : 'Half Day Leave'}</div>
                    </div>
                    <span className="hod-half-chip">{emp.workHours ? `${emp.workHours.toFixed(1)}h logged` : 'Leave'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Absent Today */}
          {absent.length>0&&(
            <div className="hod-card">
              <div className="hod-card-head">
                <div className="hod-card-title">
                  ? Absent Today
                  <span style={{fontSize:'.6875rem',fontWeight:600,padding:'2px 8px',borderRadius:'999px',background:'#fdeaea',color:'#b53535'}}>{absent.length}</span>
                </div>
              </div>
              <div className="hod-person-list">
                {absent.map((emp,i)=>(
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
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="hod-col-right">

          {/* Quick Actions */}
          <div className="hod-card">
            <div className="hod-card-head">
              <div className="hod-card-title">? Quick Actions</div>
            </div>
            <div className="hod-shortcuts">
              {[
                { icon:<FiCheckSquare size={15}/>, title:'Leave Approvals', sub:`${leaveCount} pending request${leaveCount!==1?'s':''}`, path:'/hod/leave-approval', count:leaveCount },
                { icon:<FiFileText size={15}/>,    title:'Regularization',  sub:`${regCount} pending request${regCount!==1?'s':''}`,   path:'/hod/regularization-approval', count:regCount },
                { icon:<FiActivity size={15}/>,    title:'Team Attendance Report',sub:'Team attendance & analytics', path:'/hod/attendance', count:0 },
                { icon:<FiArrowRight size={15}/>,  title:'My Attendance Report',sub:'View my own punch history', path:'/attendance', count:0 },
                { icon:<FiCalendar size={15}/>,    title:'Apply My Leave', sub:'Submit your leave request',       path:'/leave', count:0 },
                { icon:<FiSunset size={15}/>,    title:'Holiday Calendar', sub:'View upcoming holidays',       path:'/hod/leave-approval', state:{tab:'holiday'}, count:0 },
              ].map((sc,i)=>(
                <div key={i} className="hod-shortcut" onClick={()=>navigate(sc.path,sc.state?{state:sc.state}:undefined)}>
                  <div className="hod-sc-icon">{sc.icon}</div>
                  <div className="hod-sc-body">
                    <div className="hod-sc-title">{sc.title}</div>
                    <div className="hod-sc-sub">{sc.sub}</div>
                  </div>
                  <div className="hod-sc-right">
                    {sc.count>0&&<span className="hod-sc-count">{sc.count}</span>}
                    <FiArrowRight size={13} className="hod-sc-arrow"/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Leaves */}
          <div className="hod-card">
            <div className="hod-card-head">
              <div>
                <div className="hod-card-title">??? Pending Leaves</div>
                <div className="hod-card-sub">{leaveCount} awaiting approval</div>
              </div>
              {leaveCount>0&&<button className="hod-btn" onClick={()=>navigate('/hod/leave-approval')}>All <FiArrowRight size={12}/></button>}
            </div>
            {leaveCount===0 ? (
              <div className="hod-empty"><div className="hod-empty-icon">?</div><span>All caught up!</span></div>
            ) : (
              <div className="hod-pending-list">
                {pendingLeaves.slice(0,4).map((req,i)=>(
                  <div key={i} className="hod-pending-row">
                    <div className="hod-pending-top">
                      <div className="hod-pending-av">{initials(req.employeeName)}</div>
                      <div className="hod-pending-info">
                        <div className="hod-pending-name">{req.employeeName}</div>
                        <div className="hod-pending-meta">
                          {req.leaveType} � {req.is_half_day ? `Half Day (${formatSession(req.half_day_session)})` : `${req.totalDays}d`} � {fmt(req.fromDate,'dd MMM')}�{fmt(req.toDate,'dd MMM')}
                          {req.attachment_urls?.length > 0 && (
                            <a 
                              href={`${API_BASE_URL.replace('/api', '')}/${req.attachment_urls[0]}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{marginLeft:8, color:'var(--t3)'}} 
                              title="View Document"
                            >
                              <FiFileText size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                      <span className="hod-pending-type leave">{req.leaveType}</span>
                    </div>
                    {req.reason&&<div className="hod-pending-reason">"{req.reason}"</div>}
                    <div className="hod-pending-acts">
                      <button className="hod-act approve" onClick={()=>handleLeaveAction(req.id,'approved')}><FiCheck size={12}/> Approve</button>
                      <button className="hod-act reject"  onClick={()=>handleLeaveAction(req.id,'rejected')}><FiX size={12}/> Reject</button>
                    </div>
                  </div>
                ))}
                {leaveCount>4&&<div style={{padding:'.75rem 1.125rem',textAlign:'center'}}><button className="hod-btn" onClick={()=>navigate('/hod/leave-approval')}>+{leaveCount-4} more � View All</button></div>}
              </div>
            )}
          </div>

          {/* Pending Regularizations */}
          {regCount>0&&(
            <div className="hod-card">
              <div className="hod-card-head">
                <div>
                  <div className="hod-card-title">?? Regularizations</div>
                  <div className="hod-card-sub">{regCount} pending</div>
                </div>
                <button className="hod-btn" onClick={()=>navigate('/hod/regularization-approval')}>All <FiArrowRight size={12}/></button>
              </div>
              <div className="hod-pending-list">
                {pendingRegularization.slice(0,3).map((req,i)=>(
                  <div key={i} className="hod-pending-row">
                    <div className="hod-pending-top">
                      <div className="hod-pending-av">{initials(req.employeeName)}</div>
                      <div className="hod-pending-info">
                        <div className="hod-pending-name">{req.employeeName}</div>
                        <div className="hod-pending-meta">{req.type?.replace(/_/g,' ')} � {fmt(req.date,'dd MMM yyyy')}</div>
                      </div>
                      <span className="hod-pending-type reg">Reg</span>
                    </div>
                    {req.reason&&<div className="hod-pending-reason">"{req.reason}"</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default HODDashboard;


