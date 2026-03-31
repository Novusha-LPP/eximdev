import { useContext } from 'react';
import { UserContext } from '../../contexts/UserContext';
import React, { useState, useEffect } from 'react';
import {
  FiCalendar, FiClock, FiDownload, FiChevronLeft, FiChevronRight,
  FiSlash, FiUserCheck, FiUserMinus, FiAlertTriangle, FiSun, FiLogIn, FiLogOut
} from 'react-icons/fi';
import attendanceAPI from '../../api/attendance/attendance.api';
import { formatDate, formatTime12Hr, minutesToHours } from './utils/helpers';
import toast from 'react-hot-toast';
import './Attendance.css';

/* -- helpers -- */
const fmtH = h => h != null && h > 0
  ? `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2,'0')}m`
  : null;

const formatSession = (s) => (s === 'first_half' ? '1st Half' : '2nd Half');

const pct = (h, t = 9) => Math.min(100, Math.round(((h || 0) / t) * 100));

const rowClass = (r) => {
  if (!r.status || r.status === 'weekly_off' || r.status === 'holiday') return 'row-off';
  if (r.status === 'absent')   return 'row-absent';
  if (r.status === 'leave')    return 'row-leave';
  if (r.status === 'half_day') return 'row-half';
  if (r.is_late)               return 'row-late';
  return 'row-present';
};

const badgeClass = (r) => {
  if (r.status === 'half_day')                       return 'sbadge sbadge-half_day';
  if (r.is_late && r.status === 'present')           return 'sbadge sbadge-late';
  return `sbadge sbadge-${r.status || 'default'}`;
};

const badgeLabel = (r) => {
  if (r.status === 'half_day') return formatSession(r.half_day_session);
  if (r.is_late && r.status === 'present') return 'Late';
  return (r.status || ' ').replace('_', ' ');
};

/* -- Component -- */
const Attendance = () => {
  const { user } = useContext(UserContext);
  const now   = new Date();
  const dflt  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [loading,  setLoading]  = useState(true);
  const [all,      setAll]      = useState([]);
  const [rows,     setRows]     = useState([]);
  const [stats,    setStats]    = useState(null);
  const [selMonth, setSelMonth] = useState(dflt);
  const [filter,   setFilter]   = useState('all');
  const [page,     setPage]     = useState({ cur: 1, per: 25, total: 0 });

  useEffect(() => { load(); }, []);
  useEffect(() => { process(); }, [selMonth, filter, page.cur, all]);

  const load = async () => {
    try {
      setLoading(true);
      console.log('Loading attendance for employee:', user?.id || user?._id);
      const r = await attendanceAPI.getHistory({
        limit: 2000,
        employee_id: user?.id || user?._id,
      });
      const data = (r?.data || []).sort((a, b) => new Date(b.attendance_date) - new Date(a.attendance_date));
      console.log('Attendance data loaded:', data.length, 'records');
      setAll(data);
    } catch (err) { 
      console.error('Error loading attendance:', err);
      toast.error(err?.message || 'Failed to load attendance'); 
      setAll([]);
    }
    finally { setLoading(false); }
  };

  const process = () => {
    let f = [...all];
    if (selMonth) f = f.filter(r => r.attendance_date?.slice(0, 7) === selMonth);
    const mo = f;
    if (filter !== 'all') {
      f = filter === 'late' ? f.filter(r => r.is_late) : f.filter(r => r.status === filter);
    }

    const worked = mo.filter(r => r.total_work_hours > 0);
    setStats({
      present:  mo.filter(r => r.status === 'present').length,
      absent:   mo.filter(r => r.status === 'absent').length,
      late:     mo.filter(r => r.is_late).length,
      earlyIn:  mo.filter(r => r.is_early_in).length,
      earlyOut: mo.filter(r => r.is_early_exit).length,
      leave:    mo.filter(r => r.status === 'leave').length,
      half:     mo.filter(r => r.status === 'half_day').length,
      avg:      worked.length ? mo.reduce((s, r) => s + (r.total_work_hours || 0), 0) / worked.length : 0,
    });

    setPage(p => ({ ...p, total: f.length }));
    const s = (page.cur - 1) * page.per;
    setRows(f.slice(s, s + page.per));
  };

  const goMonth  = v => { setSelMonth(v); setPage(p => ({ ...p, cur: 1 })); };
  const goFilter = v => { setFilter(v);   setPage(p => ({ ...p, cur: 1 })); };
  const goPage   = n => { setPage(p => ({ ...p, cur: n })); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const totalPages = Math.ceil(page.total / page.per);
  const fmtMonth   = selMonth
    ? new Date(`${selMonth}-01`).toLocaleDateString('en', { month: 'long', year: 'numeric' })
    : '';

  const exportCSV = () => {
    const mo = all.filter(r => r.attendance_date?.slice(0, 7) === selMonth);
    const csv = [
      ['Date','Day','In','Out','Late By','Early In','Early Out','Hours','Status'],
      ...mo.map(r => [
        formatDate(r.attendance_date, 'dd MMM yyyy'),
        new Date(r.attendance_date).toLocaleDateString('en', { weekday: 'short' }),
        r.first_in   ? formatTime12Hr(r.first_in)  : '--',
        r.is_auto_punch_out ? 'Miss' : (r.last_out ? formatTime12Hr(r.last_out) : '--'),
        r.is_late      ? minutesToHours(r.late_by_minutes)    : '--',
        r.is_early_in  ? minutesToHours(r.early_in_minutes)   : '--',
        r.is_early_exit? minutesToHours(r.early_exit_minutes) : '--',
        fmtH(r.total_work_hours) || '--',
        badgeLabel(r),
      ]),
    ].map(r => r.join(',')).join('\n');
    Object.assign(document.createElement('a'), {
      href: 'data:text/csv,' + encodeURIComponent(csv),
      download: `attendance-${selMonth}.csv`,
    }).click();
  };

  const STATS = [
    { icon: FiUserCheck,     label: 'Present',   value: stats?.present  ?? ' ', c: 'g' },
    { icon: FiAlertTriangle, label: 'Late',       value: stats?.late     ?? ' ', c: 'a' },
    { icon: FiUserMinus,     label: 'Absent',     value: stats?.absent   ?? ' ', c: 'r' },
    { icon: FiSun,           label: 'On Leave',   value: stats?.leave    ?? ' ', c: 'p' },
    { icon: FiLogIn,         label: 'Early In',   value: stats?.earlyIn  ?? ' ', c: 'g' },
    { icon: FiLogOut,        label: 'Early Out',  value: stats?.earlyOut ?? ' ', c: 'r' },
    {
      icon: FiClock, label: 'Avg Hours', c: 'b',
      value: stats?.avg
        ? `${Math.floor(stats.avg)}h ${String(Math.round((stats.avg % 1) * 60)).padStart(2,'0')}m`
        : ' ',
    },
  ];

  return (
    <div className="attendance-page">

      {/* Header */}
      <div className="atn-hdr">
        <div>
          <div className="atn-title">My Attendance</div>
          <div className="atn-sub">Record for <strong>{fmtMonth}</strong></div>
        </div>
        <button className="sf-btn sf-btn-outline" onClick={exportCSV}>
          <FiDownload size={14} /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="atn-stats">
        {STATS.map((s, i) => (
          <div className="ast" key={i}>
            <div className={`ast-icon ${s.c}`}><s.icon size={14} /></div>
            <div className="ast-val">{s.value}</div>
            <div className="ast-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="atn-filters">
        <div className="atn-fl">
          <input
            type="month"
            value={selMonth}
            onChange={e => goMonth(e.target.value)}
            className="sf-input"
          />
          <select
            value={filter}
            onChange={e => goFilter(e.target.value)}
            className="sf-select"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="leave">Leave</option>
            <option value="half_day">Half Day</option>
            <option value="holiday">Holiday</option>
            <option value="weekly_off">Week Off</option>
          </select>
        </div>
        <div className="atn-fr">
          <strong>{rows.length}</strong> of <strong>{page.total}</strong> records
        </div>
      </div>

      {/* Table */}
      <div className="atn-card">
        {loading ? (
          <div className="atn-load"><div className="atn-spin" /></div>
        ) : (
          <>
            <div className="atn-scroll">
              <table className="atn-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Punch In</th>
                    <th>Punch Out</th>
                    <th>Adjustments</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? rows.map((r, i) => {
                    const p  = pct(r.total_work_hours);
                    const fc = p >= 90 ? '' : p >= 50 ? 'mid' : 'low';
                    const isMiss = r.is_auto_punch_out || (!r.last_out && r.first_in &&
                      new Date(r.attendance_date) < new Date().setHours(0, 0, 0, 0));

                    return (
                      <tr key={i} className={rowClass(r)}>

                        {/* Date */}
                        <td>
                          <div className="cell-date">
                            <span className="cell-date-main">
                              {formatDate(r.attendance_date, 'dd MMM yyyy')}
                            </span>
                            <span className="cell-date-day">
                              {new Date(r.attendance_date).toLocaleDateString('en', { weekday: 'long' })}
                            </span>
                          </div>
                        </td>

                        {/* Punch In */}
                        <td>
                          {r.first_in ? (
                            <span className="cell-time">
                              <FiLogIn size={11} />
                              {formatTime12Hr(r.first_in)}
                            </span>
                          ) : (
                            <span className="cell-dash"> </span>
                          )}
                          {r.is_late && r.status !== 'half_day' && (
                            <span className="late-tag">Late</span>
                          )}
                        </td>

                        {/* Punch Out */}
                        <td>
                          {isMiss ? (
                            <span className="cell-miss">Miss</span>
                          ) : r.last_out ? (
                            <span className="cell-time">
                              <FiLogOut size={11} />
                              {formatTime12Hr(r.last_out)}
                            </span>
                          ) : (
                            <span className="cell-dash"> </span>
                          )}
                        </td>

                        {/* Adjustments */}
                        <td>
                          {r.is_late || r.is_early_in || r.is_early_exit ? (
                            <div className="cell-metrics">
                              {r.is_late      && <span className="amt amt-late">? {minutesToHours(r.late_by_minutes)} late</span>}
                              {r.is_early_in  && <span className="amt amt-early-in">? {minutesToHours(r.early_in_minutes)} early in</span>}
                              {r.is_early_exit&& <span className="amt amt-early-out">? {minutesToHours(r.early_exit_minutes)} early out</span>}
                            </div>
                          ) : (
                            <span className="cell-dash"> </span>
                          )}
                        </td>

                        {/* Hours */}
                        <td>
                          {r.total_work_hours ? (
                            <div className="cell-hours">
                              <span className="cell-hours-val">{fmtH(r.total_work_hours)}</span>
                              <div className="hbar">
                                <div className={`hbar-fill ${fc}`} style={{ width: `${p}%` }} />
                              </div>
                            </div>
                          ) : (
                            <span className="cell-dash"> </span>
                          )}
                        </td>

                        {/* Status */}
                        <td>
                          <span className={badgeClass(r)}>{badgeLabel(r)}</span>
                        </td>

                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6}>
                        <div className="atn-empty">
                          <div className="atn-empty-ico"><FiSlash size={17} /></div>
                          <p>No records for this period</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="atn-pages">
                <span className="atn-pinfo">
                  Showing {(page.cur - 1) * page.per + 1} {Math.min(page.cur * page.per, page.total)} of {page.total}
                </span>
                <div className="atn-pnums">
                  <button
                    className="atn-pnum"
                    disabled={page.cur === 1}
                    onClick={() => goPage(page.cur - 1)}
                  >
                    <FiChevronLeft size={12} />
                  </button>

                  {(() => {
                    const range = [];
                    const delta = 2;
                    const left  = Math.max(2, page.cur - delta);
                    const right = Math.min(totalPages - 1, page.cur + delta);

                    range.push(1);
                    if (left > 2) range.push(' ');
                    for (let n = left; n <= right; n++) range.push(n);
                    if (right < totalPages - 1) range.push(' ');
                    if (totalPages > 1) range.push(totalPages);

                    return range.map((n, idx) =>
                      n === ' ' ? (
                        <span key={`e${idx}`} style={{ padding: '0 4px', color: '#9ca3af', fontSize: '.8125rem' }}> </span>
                      ) : (
                        <button
                          key={n}
                          className={`atn-pnum ${page.cur === n ? 'on' : ''}`}
                          onClick={() => goPage(n)}
                        >
                          {n}
                        </button>
                      )
                    );
                  })()}

                  <button
                    className="atn-pnum"
                    disabled={page.cur === totalPages}
                    onClick={() => goPage(page.cur + 1)}
                  >
                    <FiChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Attendance;


