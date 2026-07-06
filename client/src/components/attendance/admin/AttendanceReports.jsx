import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import {
  FiCalendar, FiDownload, FiRefreshCw, FiSearch,
  FiChevronRight, FiChevronLeft, FiUsers, FiAlertCircle,
  FiFileText, FiClock, FiBarChart2, FiCheck, FiInfo, FiXCircle, FiCheckCircle
} from 'react-icons/fi';
import moment from 'moment';
import toast from 'react-hot-toast';
import attendanceAPI from '../../../api/attendance/attendance.api';
import masterAPI from '../../../api/attendance/master.api';
import { UserContext } from '../../../contexts/UserContext';
import './AttendanceReports.css';

// ── Helpers ──────────────────────────────────────────────
const roundLeave = (v) => Math.round(Number(v || 0) * 10) / 10;
const isPrivilegeLeave = (t = '') => { const l = String(t).toLowerCase(); return l.includes('privilege') || l.includes('earned') || l === 'el'; };
const isLwpLeave = (t = '') => { const l = String(t).toLowerCase(); return l.includes('lwp') || l.includes('without pay') || l === 'lop'; };
const isHalfDayLeave = (day) => Boolean(day?.is_half_day_leave || day?.is_half_day || day?.isHalfDayLeave);

const getPayrollPresentDays = (emp) => {
  if (!Array.isArray(emp.history) || emp.history.length === 0) return Number(emp.present || 0) + Number(emp.late || 0) + Number(emp.halfDay || 0);
  return roundLeave(emp.history.reduce((t, d) => {
    const s = String(d?.status || '').toLowerCase();
    const lt = d?.leaveType || d?.leave_type || '';
    if (s === 'present' || s === 'late' || s === 'weekly_off' || s === 'holiday') return t + 1;
    if (s === 'leave') return isPrivilegeLeave(lt) ? t + 1 : t;
    if (s === 'half_day') { if (isPrivilegeLeave(lt)) return t + 1; if (isLwpLeave(lt)) return t + 0.5; return t + 1; }
    return t;
  }, 0));
};

const getActualHalfDays = (emp) => {
  if (!Array.isArray(emp.history) || emp.history.length === 0) return Number(emp.halfDay || 0);
  return roundLeave(emp.history.reduce((t, d) => {
    const s = String(d?.status || '').toLowerCase();
    const lt = d?.leaveType || d?.leave_type || '';
    if (s === 'half_day' && !lt && !isHalfDayLeave(d)) return t + 1;
    return t;
  }, 0));
};

const getLeaveCountForReport = (emp) => {
  if (!Array.isArray(emp.history) || emp.history.length === 0) return Number(emp.leaves || 0);
  return roundLeave(emp.history.reduce((t, d) => {
    const s = String(d?.status || '').toLowerCase();
    const lt = d?.leaveType || d?.leave_type || '';
    if (s === 'leave') return t + (isHalfDayLeave(d) ? 0.5 : 1);
    if (s === 'half_day' && (lt || isHalfDayLeave(d))) return t + 0.5;
    return t;
  }, 0));
};

const getHalfDayLeaveCount = (emp) => {
  if (!Array.isArray(emp.history) || emp.history.length === 0) return 0;
  return roundLeave(emp.history.reduce((t, d) => {
    const s = String(d?.status || '').toLowerCase();
    const lt = d?.leaveType || d?.leave_type || '';
    if (s === 'half_day' && (lt || isHalfDayLeave(d))) return t + 1;
    if (s === 'leave' && isHalfDayLeave(d)) return t + 1;
    return t;
  }, 0));
};

const getFullDayLeaveCount = (emp) => {
  if (!Array.isArray(emp.history) || emp.history.length === 0) return Number(emp.leaves || 0);
  return roundLeave(emp.history.reduce((t, d) => {
    const s = String(d?.status || '').toLowerCase();
    if (s === 'leave' && !isHalfDayLeave(d)) return t + 1;
    return t;
  }, 0));
};

const getLeaveTakenDays = (emp, matcher) => {
  if (!Array.isArray(emp.history) || emp.history.length === 0) return 0;
  return roundLeave(emp.history.reduce((t, d) => {
    const s = String(d?.status || '').toLowerCase();
    const lt = d?.leaveType || d?.leave_type || '';
    if (!matcher(lt)) return t;
    if (s === 'leave') return t + (isHalfDayLeave(d) ? 0.5 : 1);
    if (s === 'half_day') return t + 0.5;
    return t;
  }, 0));
};

const getStatusCounts = (history) => {
  const c = { present: 0, absent: 0, leave: 0, half_day: 0, weekly_off: 0, holiday: 0, late: 0 };
  if (!Array.isArray(history)) return c;
  history.forEach(d => {
    const s = String(d?.status || '').toLowerCase();
    if (s === 'present') c.present++;
    else if (s === 'late' || s === 'present_late') { c.late++; c.present++; }
    else if (s === 'absent') c.absent++;
    else if (s === 'leave' || s === 'pending_leave') c.leave++;
    else if (s === 'half_day') c.half_day++;
    else if (s === 'weekly_off' || s === 'weekoff' || s === 'off') c.weekly_off++;
    else if (s === 'holiday') c.holiday++;
  });
  return c;
};

const formatDisplayStatus = (status) => {
  if (!status) return 'Present';
  const sl = status.toLowerCase();
  if (sl === 'half_day') return 'Half Day';
  if (sl === 'weekly_off' || sl === 'weekoff' || sl === 'off') return 'Weekly Off';
  if (sl === 'pending_leave') return 'Pending Leave';
  if (sl === 'present_late') return 'Late';
  if (sl === 'incomplete' || sl === 'missed_punch') return 'Incomplete';
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
};

const getStatusClass = (status) => {
  const sl = String(status || '').toLowerCase();
  if (sl === 'present') return 'present';
  if (sl === 'late' || sl === 'present_late') return 'late';
  if (sl === 'absent') return 'absent';
  if (sl === 'leave' || sl === 'pending_leave') return 'leave';
  if (sl === 'half_day') return 'half_day';
  if (sl === 'weekly_off' || sl === 'weekoff' || sl === 'off') return 'weekly_off';
  if (sl === 'holiday') return 'holiday';
  if (sl === 'incomplete' || sl === 'missed_punch') return 'incomplete';
  return 'default';
};

const enrichHistoryWithSundayOverride = (history) => {
  if (!Array.isArray(history)) return [];
  return history.map(d => {
    const isSunday = moment(d.date || d.attendance_date).day() === 0;
    if (isSunday) return { ...d, status: 'weekly_off' };
    return d;
  });
};

// ── Quick month list ─────────────────────────────────────
const getQuickMonths = () => {
  const months = [];
  const now = moment();
  for (let i = 0; i < 6; i++) {
    const m = moment().subtract(i, 'months');
    months.push({
      label: m.format('MMM YYYY'),
      start: m.startOf('month').format('YYYY-MM-DD'),
      end: m.endOf('month').format('YYYY-MM-DD'),
      isCurrent: m.isSame(now, 'month'),
    });
  }
  return months;
};

// ── Enrichment (leave balance) ───────────────────────────
const enrichReportWithLeaveBalance = async (data) => {
  try {
    const ids = data.map(e => e.id);
    if (ids.length === 0) return data;
    const res = await attendanceAPI.getLeaveBalances(ids);
    const privOpenMap = new Map(), privAvailMap = new Map(), privUsedMap = new Map(), lwpUsedMap = new Map();
    if (res?.data) {
      res.data.forEach(b => {
        const eid = b.employee_id;
        const lt = String(b.leave_type || b.leave_policy_id?.leave_type || b.name || '').toLowerCase();
        if (lt.includes('privilege') || lt.includes('earned') || lt === 'el') {
          privOpenMap.set(eid, Number(b.opening_balance || 0));
          privAvailMap.set(eid, Number(b.closing_balance || 0));
          privUsedMap.set(eid, Number(b.used || 0));
        } else if (lt.includes('lwp') || lt.includes('without pay') || lt === 'lop') {
          lwpUsedMap.set(eid, Number(b.used || 0));
        }
      });
    }
    return data.map(e => ({
      ...e,
      opening_balance: privOpenMap.get(e.id) || 0,
      available_balance: privAvailMap.get(e.id) || 0,
      privilege_taken: privUsedMap.get(e.id) || 0,
      lwp_taken: lwpUsedMap.get(e.id) || 0,
    }));
  } catch {
    return data.map(e => ({ ...e, opening_balance: 0, available_balance: 0, privilege_taken: 0, lwp_taken: 0 }));
  }
};

// ── Loading Skeleton ─────────────────────────────────────
const Skeleton = () => (
  <div className="atr-skeleton">
    <div className="atr-skel-row">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="atr-skel-card" style={{ flex: 1 }} />)}
    </div>
    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
      <div key={i} className="atr-skel-row">
        <div className="atr-skel-block" style={{ width: '25%' }} />
        <div className="atr-skel-block" style={{ width: '8%' }} />
        <div className="atr-skel-block" style={{ width: '8%' }} />
        <div className="atr-skel-block" style={{ width: '8%' }} />
        <div className="atr-skel-block" style={{ width: '8%' }} />
        <div className="atr-skel-block" style={{ width: '8%' }} />
        <div className="atr-skel-block" style={{ width: '10%' }} />
        <div className="atr-skel-block" style={{ width: '10%' }} />
      </div>
    ))}
  </div>
);

// ── Daily Log Sub-Table ──────────────────────────────────
const DailyLogTable = React.memo(({ history, shiftName }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [useHoursMinutes, setUseHoursMinutes] = useState(true);
  const sorted = useMemo(() =>
    [...(history || [])].sort((a, b) => new Date(a.date || a.attendance_date) - new Date(b.date || b.attendance_date)),
    [history]
  );
  let totalHours = 0;
  let daysWithHours = 0;

  const renderStatusBadge = (status) => {
    const sCls = getStatusClass(status);
    const text = formatDisplayStatus(status);
    const sl = String(status || '').toLowerCase();
    let icon = null;
    if (sl === 'present') {
      icon = <FiCheck size={12} style={{ marginRight: 6, strokeWidth: 3 }} />;
    } else if (sl === 'late' || sl === 'present_late') {
      icon = <FiClock size={12} style={{ marginRight: 6 }} />;
    } else if (sl === 'incomplete' || sl === 'missed_punch') {
      icon = <FiInfo size={12} style={{ marginRight: 6 }} />;
    } else if (sl === 'weekly_off' || sl === 'weekoff' || sl === 'off') {
      icon = <FiCalendar size={12} style={{ marginRight: 6 }} />;
    } else if (sl === 'absent') {
      icon = <FiXCircle size={12} style={{ marginRight: 6 }} />;
    } else if (sl === 'leave' || sl === 'pending_leave' || sl === 'holiday') {
      icon = <FiCalendar size={12} style={{ marginRight: 6 }} />;
    }
    return (
      <span className={`atr-status-pill ${sCls}`}>
        {icon}
        {text}
      </span>
    );
  };

  const formatHours = (val) => {
    if (val === null || val === undefined) return '—';
    if (!useHoursMinutes) {
      return `${val.toFixed(1)}h`;
    }
    const h = Math.floor(val);
    let m = Math.round((val - h) * 60);
    let displayH = h;
    if (m === 60) {
      displayH += 1;
      m = 0;
    }
    return `${displayH}h ${m}m`;
  };

  const getHoursMinutesText = (val) => {
    const h = Math.floor(val);
    let m = Math.round((val - h) * 60);
    let displayH = h;
    if (m === 60) {
      displayH += 1;
      m = 0;
    }
    const parts = [];
    if (displayH > 0) parts.push(`${displayH} hour${displayH === 1 ? '' : 's'}`);
    if (m > 0 || displayH === 0) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
    return parts.join(' ');
  };

  const getHoursMinutesCompact = (val) => {
    const h = Math.floor(val);
    let m = Math.round((val - h) * 60);
    let displayH = h;
    if (m === 60) {
      displayH += 1;
      m = 0;
    }
    return `${displayH}h ${m}m`;
  };

  return (
    <table className="atr-log-table">
      <thead>
        <tr>
          <th>DATE</th>
          <th>DAY</th>
          <th style={{ textAlign: 'left' }}>SHIFT</th>
          <th>STATUS</th>
          <th>IN TIME</th>
          <th>OUT TIME</th>
          <th>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span>HOURS</span>
              <button 
                onClick={() => setUseHoursMinutes(!useHoursMinutes)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '9px',
                  padding: '2px 4px',
                  fontWeight: '500'
                }}
              >
                {useHoursMinutes ? 'Decimal' : 'H:M'}
              </button>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((log, idx) => {
          const dt = moment(log.date || log.attendance_date);
          const sn = log.shift_id?.shift_name || shiftName || '';
          const st = log.shift_id?.start_time || '';
          const et = log.shift_id?.end_time || '';
          const shiftStr = sn ? (st && et ? `${sn} ${st}-${et}` : sn) : (st && et ? `${st}-${et}` : '—');
          const fdt = (v) => v ? moment(v).format('h:mm A') : '—';
          let wh = null;
          if (log.first_in && log.last_out) {
            const diff = moment(log.last_out).diff(moment(log.first_in), 'hours', true);
            if (diff >= 0 && diff < 24) { 
              wh = diff; 
              totalHours += diff; 
              const statusLower = String(log.status || '').toLowerCase();
              const isHalf = statusLower === 'half_day' || statusLower === 'leave';
              daysWithHours += isHalf ? 0.5 : 1;
            }
          }
          return (
            <tr key={idx} className={idx % 2 === 1 ? 'log-even' : ''}>
              <td>{dt.format('DD-MM-YYYY')}</td>
              <td>{dt.format('ddd')}</td>
              <td style={{ textAlign: 'left', fontSize: 11 }}>{shiftStr}</td>
              <td>{renderStatusBadge(log.status)}</td>
              <td>{fdt(log.first_in)}</td>
              <td>{fdt(log.last_out)}</td>
              <td>{wh !== null ? formatHours(wh) : '—'}</td>
            </tr>
          );
        })}
        {(() => {
          const avgHours = daysWithHours > 0 ? (totalHours / daysWithHours) : 0;
          return (
            <>
              <tr className="atr-log-total">
                <td colSpan={6} style={{ textAlign: 'right', fontWeight: 700 }}>Total Worked Hours</td>
                <td style={{ fontWeight: 700 }}>{formatHours(totalHours)}</td>
              </tr>
              <tr className="atr-log-total" style={{ borderTop: 'none' }}>
                <td colSpan={6} style={{ textAlign: 'right', fontWeight: 700, paddingTop: '4px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                    Average Worked Hours
                    <span 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        cursor: 'pointer', 
                        color: '#3b82f6',
                        verticalAlign: 'middle'
                      }} 
                      onClick={() => setShowPopup(!showPopup)}
                    >
                      <FiInfo size={13} />
                    </span>
                    {showPopup && (
                      <div 
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          right: '0',
                          transform: 'translateY(-8px)',
                          background: '#1e293b',
                          color: '#f8fafc',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -2px rgba(0,0,0,0.3)',
                          width: '280px',
                          fontSize: '12px',
                          textAlign: 'left',
                          zIndex: 999,
                          border: '1px solid #334155',
                          lineHeight: '1.6',
                          fontWeight: 'normal'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontSize: '13px' }}>
                          <span>Calculation Details</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setShowPopup(false); }} 
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, fontSize: '12px', fontWeight: 'bold' }}
                          >
                            ✕
                          </button>
                        </div>
                        <div style={{ color: '#cbd5e1', marginBottom: '8px' }}>
                          <strong>Formula:</strong> Total Hours / Days with logged hours
                        </div>
                        <div style={{ borderTop: '1px solid #334155', paddingTop: '8px', color: '#94a3b8', fontFamily: 'monospace' }}>
                          • Total Worked: <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{getHoursMinutesText(totalHours)}</span><br/>
                          • Logged Days: <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{daysWithHours} days</span><br/>
                          • Calculation: {getHoursMinutesCompact(totalHours)} ÷ {daysWithHours}<br/>
                          • Result: <span style={{ color: '#10b981', fontWeight: 'bold' }}>{getHoursMinutesText(avgHours)}/day</span>
                        </div>
                        <div 
                          style={{
                            position: 'absolute',
                            top: '100%',
                            right: '6px',
                            width: 0,
                            height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: '6px solid #1e293b'
                          }}
                        />
                      </div>
                    )}
                  </span>
                </td>
                <td style={{ fontWeight: 700, paddingTop: '4px' }}>
                  {useHoursMinutes ? `${getHoursMinutesCompact(avgHours)}/day` : `${avgHours.toFixed(1)}h/day`}
                </td>
              </tr>
            </>
          );
        })()}
      </tbody>
    </table>
  );
});

// ── Main Component ───────────────────────────────────────
const AttendanceReports = () => {
  const { user } = useContext(UserContext);
  const quickMonths = useMemo(() => getQuickMonths(), []);
  const currentMonthStart = moment().startOf('month').format('YYYY-MM-DD');
  const currentMonthEnd = moment().endOf('month').format('YYYY-MM-DD');

  // Filters
  const [startDate, setStartDate] = useState(currentMonthStart);
  const [endDate, setEndDate] = useState(currentMonthEnd);

  // Year and Month Dropdown Filter States
  const years = useMemo(() => {
    const currentYear = moment().year();
    return [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];
  }, []);

  const months = useMemo(() => [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' }
  ], []);

  const [selectedYear, setSelectedYear] = useState(moment(currentMonthStart).year());
  const [selectedMonth, setSelectedMonth] = useState(moment(currentMonthStart).month());

  // Sync dropdowns when startDate changes externally
  useEffect(() => {
    const mDate = moment(startDate);
    if (mDate.isValid()) {
      setSelectedYear(mDate.year());
      setSelectedMonth(mDate.month());
    }
  }, [startDate]);
  const [orgFilter, setOrgFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tableSearch, setTableSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [empTypeFilter, setEmpTypeFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [excelGrouping, setExcelGrouping] = useState('organization'); // 'organization', 'team', 'single'

  // Data
  const [reportData, setReportData] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Table state
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const isRabsDashboard = useMemo(() => {
    const userCompany = String(user?.company || '').toLowerCase();
    const userDept = String(user?.department || '').toLowerCase();
    if (userCompany.includes('rabs') || userDept.includes('rabs')) {
      return true;
    }
    const selectedOrgObj = organizations.find(o => String(o._id) === orgFilter);
    if (selectedOrgObj && String(selectedOrgObj.name || '').toLowerCase().includes('rabs')) {
      return true;
    }
    return false;
  }, [user, orgFilter, organizations]);

  const isRabsAdmin = useMemo(() => {
    const userCompany = String(user?.company || '').toLowerCase();
    const userDept = String(user?.department || '').toLowerCase();
    return userCompany.includes('rabs') || userDept.includes('rabs');
  }, [user]);

  const visibleOrganizations = useMemo(() => {
    if (isRabsAdmin) {
      return organizations.filter(o => String(o.name || '').toLowerCase().includes('rabs'));
    } else {
      // Regular Allowed Admin -> remove RABS
      return organizations.filter(o => !String(o.name || '').toLowerCase().includes('rabs'));
    }
  }, [organizations, isRabsAdmin]);

  const visibleTeams = useMemo(() => {
    if (isRabsAdmin) {
      return teams.filter(t => String(t.name || '').toLowerCase().includes('rabs'));
    } else {
      return teams.filter(t => !String(t.name || '').toLowerCase().includes('rabs'));
    }
  }, [teams, isRabsAdmin]);

  const categoriesList = useMemo(() => {
    const s = new Set([
      'Management',
      'Accountant',
      'Dispatch',
      'Helper',
      'Housekeeping',
      'HR',
      'Maintenance',
      'Operator',
      'Pantry',
      'Production',
      'QC Inspection',
      'Quality',
      'SPOC',
      'Tool',
      'Security'
    ]);
    reportData.forEach(e => {
      if (e.category) s.add(e.category);
    });
    return Array.from(s).sort();
  }, [reportData]);

  // Dynamic filter options derived from loaded dataset
  const departmentsList = useMemo(() => {
    const s = new Set();
    reportData.forEach(e => { if (e.department) s.add(e.department); });
    return Array.from(s).sort();
  }, [reportData]);

  const shiftsList = useMemo(() => {
    const s = new Set();
    reportData.forEach(e => {
      const name = e.shift_name || e.shift_id?.shift_name;
      if (name) s.add(name);
    });
    return Array.from(s).sort();
  }, [reportData]);

  const empTypesList = useMemo(() => {
    const s = new Set();
    reportData.forEach(e => { if (e.employment_type) s.add(e.employment_type); });
    return Array.from(s).sort();
  }, [reportData]);

  const managersList = useMemo(() => {
    const m = new Map();
    reportData.forEach(e => {
      if (e.hod_id) {
        const idStr = String(e.hod_id._id || e.hod_id);
        const name = e.hod_id.first_name ? `${e.hod_id.first_name} ${e.hod_id.last_name || ''}`.trim() : e.hod_id.username;
        if (name) m.set(idStr, name);
      }
    });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [reportData]);

  const teamNameByEmployee = useMemo(() => {
    const map = new Map();
    teams.forEach(team => {
      const teamName = team?.name || team?.team_name || team?.teamName || 'No Team';
      const teamMembers = [
        ...(Array.isArray(team?.members) ? team.members : []),
        ...(Array.isArray(team?.membersDetails) ? team.membersDetails : []),
      ];
      teamMembers.forEach(member => {
        [member?.userId, member?._id, member?.username].filter(Boolean).forEach(key => {
          const normalizedKey = String(key).toLowerCase();
          if (!map.has(normalizedKey)) {
            map.set(normalizedKey, teamName);
          }
        });
      });
    });
    return map;
  }, [teams]);

  const getEmployeeTeamName = useCallback((emp) => {
    const directTeamName = emp?.teamId?.name || emp?.team?.name || emp?.team_name || emp?.teamName || emp?.team;
    if (directTeamName) return directTeamName;
    const lookupKeys = [emp?.id, emp?._id, emp?.username].filter(Boolean).map(value => String(value).toLowerCase());
    for (const key of lookupKeys) {
      if (teamNameByEmployee.has(key)) {
        return teamNameByEmployee.get(key);
      }
    }
    return 'No Team';
  }, [teamNameByEmployee]);

  // ── Load dropdowns ─────────────────────────────────────
  useEffect(() => {
    const loadOrgs = async () => { try { const r = await masterAPI.getOrganizations(); setOrganizations(r?.data || []); } catch { /* ignore */ } };
    const loadTeams = async () => { try { const r = await masterAPI.getTeams(); setTeams(Array.isArray(r?.teams) ? r.teams : Array.isArray(r) ? r : []); } catch { /* ignore */ } };
    loadOrgs();
    loadTeams();
  }, []);

  // ── Fetch report data ──────────────────────────────────
  const fetchReport = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    setExpandedIds(new Set());
    try {
      const companyId = orgFilter !== 'all' ? orgFilter : 'all';
      const response = await attendanceAPI.getAdminAttendanceReport(startDate, endDate, undefined, companyId);
      let raw = response?.data || [];
      // Sunday override
      raw = raw.map(e => ({ ...e, history: enrichHistoryWithSundayOverride(e.history) }));
      // Enrich with leave balance
      const enriched = await enrichReportWithLeaveBalance(raw);
      setReportData(enriched);
      setLastRefreshed(new Date());
      setCurrentPage(1);
    } catch (err) {
      console.error('Report fetch failed:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load report');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, orgFilter]);

  // Auto-fetch on mount and filter change
  useEffect(() => { fetchReport(); }, [fetchReport]);

  // ── Process + filter data ──────────────────────────────
  const processedData = useMemo(() => {
    let data = reportData.map(emp => {
      const counts = getStatusCounts(emp.history);
      const present = getPayrollPresentDays(emp);
      const absent = emp.absent ?? counts.absent;
      const halfDay = getActualHalfDays(emp);
      const leaves = getLeaveCountForReport(emp);
      const halfDayLeaves = getHalfDayLeaveCount(emp);
      const fullDayLeaves = getFullDayLeaveCount(emp);
      const plTaken = getLeaveTakenDays(emp, isPrivilegeLeave);
      const lwpTaken = getLeaveTakenDays(emp, isLwpLeave);
      const openingBalance = roundLeave(emp.opening_balance || 0);
      const availableBalance = Math.max(0, roundLeave(openingBalance - plTaken));
      return {
        ...emp,
        _present: present,
        _absent: absent,
        _halfDay: halfDay,
        _leaves: leaves,
        _halfDayLeaves: halfDayLeaves,
        _fullDayLeaves: fullDayLeaves,
        _openingBalance: openingBalance,
        _plTaken: plTaken,
        _lwpTaken: lwpTaken,
        _availableBalance: availableBalance,
        _weeklyOff: counts.weekly_off,
        _holiday: counts.holiday,
        _late: counts.late,
        _avgHours: parseFloat(emp.avgHours || 0),
        _statusCounts: counts,
      };
    });

    // Filter report data based on RABS admin vs regular Allowed Admin
    if (isRabsAdmin) {
      data = data.filter(e => {
        const comp = String(e.company_name || '').toLowerCase();
        const dept = String(e.department || '').toLowerCase();
        return comp.includes('rabs') || dept.includes('rabs');
      });
    } else {
      // Regular Allowed Admin -> cannot view RABS data
      data = data.filter(e => {
        const comp = String(e.company_name || '').toLowerCase();
        const dept = String(e.department || '').toLowerCase();
        return !comp.includes('rabs') && !dept.includes('rabs');
      });
    }

    // Team or Category filter
    if (isRabsDashboard) {
      if (categoryFilter !== 'all') {
        data = data.filter(e => {
          const empCat = e.category || (e.is_operator === true ? 'Operator' : 'Management');
          return String(empCat).toLowerCase() === categoryFilter.toLowerCase();
        });
      }
    } else {
      if (teamFilter !== 'all') {
        const team = teams.find(t => String(t._id) === teamFilter);
        if (team) {
          const memberUsernames = new Set((team.members || []).map(m => (m.username || '').toLowerCase()));
          data = data.filter(e => memberUsernames.has((e.username || '').toLowerCase()));
        }
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      data = data.filter(e => {
        const sc = e._statusCounts;
        if (statusFilter === 'absent_heavy') return e._absent >= 3;
        if (statusFilter === 'late_heavy') return e._late >= 3;
        if (statusFilter === 'perfect') return e._absent === 0 && e._late === 0;
        if (statusFilter === 'on_leave') return e._leaves > 0;
        return true;
      });
    }

    // Shift filter
    if (shiftFilter !== 'all') {
      data = data.filter(e => {
        const sName = e.shift_name || e.shift_id?.shift_name;
        return sName === shiftFilter;
      });
    }

    // Employment type filter
    if (empTypeFilter !== 'all') {
      data = data.filter(e => e.employment_type === empTypeFilter);
    }

    // Manager filter
    if (managerFilter !== 'all') {
      data = data.filter(e => e.hod_id && String(e.hod_id._id || e.hod_id) === managerFilter);
    }

    // Department filter
    if (deptFilter !== 'all') {
      data = data.filter(e => e.department === deptFilter);
    }

    // Table Search
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      data = data.filter(e =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.username || '').toLowerCase().includes(q) ||
        (e.employee_code || '').toLowerCase().includes(q) ||
        (e.company_name || '').toLowerCase().includes(q)
      );
    }

    // Sort
    data.sort((a, b) => {
      let av = a[sortKey] ?? a['_' + sortKey] ?? '';
      let bv = b[sortKey] ?? b['_' + sortKey] ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [reportData, teamFilter, categoryFilter, isRabsDashboard, isRabsAdmin, teams, statusFilter, tableSearch, sortKey, sortDir, shiftFilter, empTypeFilter, managerFilter, deptFilter]);

  // ── Aggregate stats ────────────────────────────────────
  const stats = useMemo(() => {
    const s = { total: processedData.length, present: 0, absent: 0, leaves: 0, halfDay: 0, weeklyOff: 0, holiday: 0, late: 0, totalHours: 0 };
    processedData.forEach(e => {
      s.present += e._present;
      s.absent += e._absent;
      s.leaves += e._leaves;
      s.halfDay += e._halfDay;
      s.weeklyOff += e._weeklyOff;
      s.holiday += e._holiday;
      s.late += e._late;
      s.totalHours += e._avgHours;
    });
    s.avgAttendance = s.total > 0 ? roundLeave((s.present / (s.present + s.absent + s.leaves + s.halfDay * 0.5)) * 100) : 0;
    s.avgHoursPerDay = s.total > 0 ? roundLeave(s.totalHours / s.total) : 0;
    return s;
  }, [processedData]);

  // ── Pagination ─────────────────────────────────────────
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  // ── Sort handler ───────────────────────────────────────
  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // ── Expand/Collapse ────────────────────────────────────
  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Quick month select ─────────────────────────────────
  const selectMonth = (m) => {
    setStartDate(m.start);
    setEndDate(m.end);
  };

  // ── Export to Excel ────────────────────────────────────
  const handleExportExcel = async () => {
    if (processedData.length === 0) { toast.error('No data to export'); return; }
    const lt = toast.loading('Generating Excel report…');
    try {
      const ExcelJS = await import('exceljs');
      const { saveAs } = await import('file-saver');
      const wb = new ExcelJS.Workbook();
      wb.creator = 'AlVision Exim';
      
      const navy = { argb: 'FF1B365D' };
      const white = { argb: 'FFFFFFFF' };

      // Grouping based on selected excelGrouping
      const byGroup = {};
      if (excelGrouping === 'single') {
        byGroup['Attendance Report'] = processedData;
      } else if (excelGrouping === 'team') {
        processedData.forEach(e => {
          const team = getEmployeeTeamName(e);
          if (!byGroup[team]) byGroup[team] = [];
          byGroup[team].push(e);
        });
      } else {
        // Default: organization-wise
        processedData.forEach(e => {
          const co = (e.company_name || '').trim() || 'Unassigned';
          if (!byGroup[co]) byGroup[co] = [];
          byGroup[co].push(e);
        });
      }

      // Helper: style a header row
      const styleHeader = (row, bgArgb, textArgb = 'FFFFFFFF') => {
        row.eachCell(cell => {
          cell.font  = { bold: true, color: { argb: textArgb }, name: 'Arial', size: 10 };
          cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF94A3B8' } },
            left: { style: 'thin', color: { argb: 'FF94A3B8' } },
            bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
            right: { style: 'thin', color: { argb: 'FF94A3B8' } }
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        });
      };

      const roundLeave = (value) => Math.round(Number(value || 0) * 10) / 10;

      const STATUS_COLORS = {
        present : 'FF10b981',
        absent  : 'FFef4444',
        halfDay : 'FF3b82f6',
        leaves  : 'FF8b5cf6',
        pending : 'FFf97316',
      };

      Object.entries(byGroup).sort(([a], [b]) => a.localeCompare(b)).forEach(([groupName, employees]) => {
        const ws = wb.addWorksheet(groupName.substring(0, 31));

        // Set column properties/widths
        ws.columns = [
          { key: 'col1', width: 26 }, // Employee/Date
          { key: 'col2', width: 14 }, // Present/Day
          { key: 'col3', width: 32 }, // Absent/Shift
          { key: 'col4', width: 18 }, // HalfDay/Status
          { key: 'col5', width: 16 }, // InTime
          { key: 'col6', width: 16 }, // OutTime
          { key: 'col7', width: 16 }, // Total Hours / Complete Leaves
          { key: 'col8', width: 16 }, // Opening Balance
          { key: 'col9', width: 12 }, // PL Taken
          { key: 'col10', width: 12 }, // LWP Taken
          { key: 'col11', width: 18 }, // Available Balance
          { key: 'col12', width: 18 }  // Avg Hours/Day
        ];

        employees.forEach(emp => {
          const logs = emp.history || [];
          const empName = emp.name || emp.username || '';

          const r1 = ws.addRow(['---']);
          const r2 = ws.addRow([`Attendance Log — ${moment(startDate).format('MMMM YYYY')}`]);
          const r3 = ws.addRow([empName]);

          // Merge cells A to G for title blocks
          ws.mergeCells(r1.number, 1, r1.number, 7);
          ws.mergeCells(r2.number, 1, r2.number, 7);
          ws.mergeCells(r3.number, 1, r3.number, 7);

          // Style title rows
          const titleColor = 'FF1F385C'; // Premium Navy Blue
          [r1, r2, r3].forEach((row, rIdx) => {
            row.height = rIdx === 2 ? 26 : 22;
            row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: titleColor } };
            row.getCell(1).font = { bold: true, color: white, name: 'Arial', size: rIdx === 2 ? 11 : 10 };
            row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
          });

          // Summary Headers (Row 4)
          const COLS = ['Employee', 'Present', 'Absent', 'Half Day', 'Half Day Leaves', 'Full Day Leaves', 'Complete Leaves', 'Opening Balance', 'PL Taken', 'LWP Taken', 'Available Balance', 'Avg Hours/Day'];
          const sumHeaderRow = ws.addRow(COLS);
          sumHeaderRow.height = 22;
          styleHeader(sumHeaderRow, 'FF334155', 'FFFFFFFF'); // Slate gray

          // Summary Values (Row 5)
          const sumValRow = ws.addRow([
            empName,
            emp._present,
            emp._absent,
            emp._halfDay,
            emp._halfDayLeaves,
            emp._fullDayLeaves,
            emp._leaves,
            roundLeave(emp._openingBalance),
            roundLeave(emp._plTaken),
            roundLeave(emp._lwpTaken),
            roundLeave(emp._availableBalance),
            emp._avgHours ? emp._avgHours.toFixed(1) + 'h' : '0h'
          ]);
          sumValRow.height = 22;
          sumValRow.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
          sumValRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

          // Colour-code summary cells
          [[2, STATUS_COLORS.present], [3, STATUS_COLORS.absent], [4, STATUS_COLORS.halfDay],
           [5, STATUS_COLORS.leaves], [6, STATUS_COLORS.leaves], [7, STATUS_COLORS.leaves],
           [8, STATUS_COLORS.pending], [9, STATUS_COLORS.pending], [10, STATUS_COLORS.pending],
           [11, STATUS_COLORS.pending]]
          .forEach(([col, color]) => {
            const cell = sumValRow.getCell(col);
            cell.font = { bold: true, color: { argb: color }, name: 'Arial', size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          });
          sumValRow.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };

          // Border on summary cells
          sumValRow.eachCell(cell => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF94A3B8' } },
              left: { style: 'thin', color: { argb: 'FF94A3B8' } },
              bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
              right: { style: 'thin', color: { argb: 'FF94A3B8' } }
            };
          });

          // Blank row spacer (Row 6)
          ws.addRow([]);

          // Details Headers (Row 7)
          const detailCols = ['Date', 'Day', 'Shift', 'Status', 'In Time', 'Out Time', 'Total Hours'];
          const detailHeaderRow = ws.addRow(detailCols);
          detailHeaderRow.height = 22;
          styleHeader(detailHeaderRow, 'FF1E40AF', 'FFFFFFFF'); // Royal blue

          // Daily records logs (Row 8+)
          let empTotalHours = 0;
          const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));

          sortedLogs.forEach(log => {
            const sn = log.shift_id?.shift_name || emp.shift_id?.shift_name || '';
            const st = log.shift_id?.start_time || emp.shift_id?.start_time || '';
            const et = log.shift_id?.end_time || emp.shift_id?.end_time || '';
            const shiftStr = sn ? (st && et ? `${sn} ${st}–${et}` : sn) : '—';
            const fdt = v => v ? moment(v).format('h:mm A') : '';
            let wh = '';
            if (log.first_in && log.last_out) {
              const diff = moment(log.last_out).diff(moment(log.first_in), 'hours', true);
              if (diff > 0 && diff < 24) {
                wh = diff.toFixed(1) + ' hrs';
                empTotalHours += diff;
              }
            }

            const statusLabel = formatDisplayStatus(log.status);

            const dayRow = ws.addRow([
              moment(log.date).format('DD-MM-YYYY'),
              moment(log.date).format('ddd'),
              shiftStr,
              statusLabel,
              fdt(log.first_in),
              fdt(log.last_out),
              wh
            ]);
            dayRow.height = 20;

            // Center align all except Shift (Col 3)
            [1, 2, 4, 5, 6, 7].forEach(c => {
              dayRow.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
            });
            dayRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

            dayRow.eachCell(cell => {
              cell.font = { name: 'Arial', size: 10 };
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
              };
            });

            // Color code status label
            const sCell = dayRow.getCell(4);
            sCell.font = { bold: true, name: 'Arial', size: 10 };
            if (statusLabel === 'Present') sCell.font.color = { argb: 'FF10B981' };
            else if (statusLabel === 'Absent') sCell.font.color = { argb: 'FFEF4444' };
            else if (statusLabel === 'Half Day') sCell.font.color = { argb: 'FF3B82F6' };
            else if (statusLabel === 'Leave') sCell.font.color = { argb: 'FF8B5CF6' };
            else if (statusLabel === 'Weekly Off') sCell.font.color = { argb: 'FF64748B' };
            else if (statusLabel === 'Holiday') sCell.font.color = { argb: 'FFD97706' };
          });

          // Total worked hours row
          const totRow = ws.addRow([
            'Total Worked Hours',
            '', '', '', '', '',
            `${empTotalHours.toFixed(1)} hrs`
          ]);
          totRow.height = 22;
          totRow.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
          totRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
          totRow.getCell(7).font = { bold: true, name: 'Arial', size: 10 };
          totRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

          totRow.eachCell(cell => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF94A3B8' } },
              bottom: { style: 'thin', color: { argb: 'FF94A3B8' } }
            };
          });

          // Blank separator row before next employee
          ws.addRow([]);
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const fileName = `Attendance_Report_${moment(startDate).format('MMM_YYYY')}.xlsx`;
      saveAs(new Blob([buffer], { type: 'application/octet-stream' }), fileName);
      toast.dismiss(lt);
      toast.success(`Report exported: ${fileName}`);
    } catch (err) {
      console.error('Excel export failed:', err);
      toast.dismiss(lt);
      toast.error('Failed to export report');
    }
  };

  const handleExportIndividualExcel = async (emp) => {
    const lt = toast.loading(`Generating Excel report for ${emp.name || emp.username}…`);
    try {
      const ExcelJS = await import('exceljs');
      const { saveAs } = await import('file-saver');
      const wb = new ExcelJS.Workbook();
      wb.creator = 'AlVision Exim';
      
      const white = { argb: 'FFFFFFFF' };
      const ws = wb.addWorksheet((emp.name || emp.username || 'Attendance').substring(0, 31));

      // Style helper
      const styleHeader = (row, bgArgb, textArgb = 'FFFFFFFF') => {
        row.eachCell(cell => {
          cell.font  = { bold: true, color: { argb: textArgb }, name: 'Arial', size: 10 };
          cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF94A3B8' } },
            left: { style: 'thin', color: { argb: 'FF94A3B8' } },
            bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
            right: { style: 'thin', color: { argb: 'FF94A3B8' } }
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        });
      };

      const roundLeave = (value) => Math.round(Number(value || 0) * 10) / 10;

      const logs = emp.history || [];
      const empName = emp.name || emp.username || '';

      const r1 = ws.addRow(['---']);
      const r2 = ws.addRow([`Attendance Log — ${moment(startDate).format('MMMM YYYY')}`]);
      const r3 = ws.addRow([empName]);

      ws.mergeCells(r1.number, 1, r1.number, 12);
      ws.mergeCells(r2.number, 1, r2.number, 12);
      ws.mergeCells(r3.number, 1, r3.number, 12);

      const titleColor = 'FF1F385C';
      [r1, r2, r3].forEach((row, rIdx) => {
        row.height = rIdx === 2 ? 26 : 22;
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: titleColor } };
        row.getCell(1).font = { bold: true, color: white, name: 'Arial', size: rIdx === 2 ? 11 : 10 };
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Summary Headers (Row 4)
      const COLS = ['Employee', 'Present', 'Absent', 'Half Day', 'Half Day Leaves', 'Full Day Leaves', 'Complete Leaves', 'Opening Balance', 'PL Taken', 'LWP Taken', 'Available Balance', 'Avg Hours/Day'];
      
      ws.columns = [
        { key: 'col1', width: 26 },
        { key: 'col2', width: 14 },
        { key: 'col3', width: 32 },
        { key: 'col4', width: 18 },
        { key: 'col5', width: 16 },
        { key: 'col6', width: 16 },
        { key: 'col7', width: 16 },
        { key: 'col8', width: 16 },
        { key: 'col9', width: 12 },
        { key: 'col10', width: 12 },
        { key: 'col11', width: 18 },
        { key: 'col12', width: 18 }
      ];

      const sumHeaderRow = ws.addRow(COLS);
      sumHeaderRow.height = 22;
      styleHeader(sumHeaderRow, 'FF334155', 'FFFFFFFF');

      // Summary Values (Row 5)
      const sumValRow = ws.addRow([
        empName,
        emp._present,
        emp._absent,
        emp._halfDay,
        emp._halfDayLeaves,
        emp._fullDayLeaves,
        emp._leaves,
        roundLeave(emp._openingBalance),
        roundLeave(emp._plTaken),
        roundLeave(emp._lwpTaken),
        roundLeave(emp._availableBalance),
        emp._avgHours ? emp._avgHours.toFixed(1) + 'h' : '0h'
      ]);
      sumValRow.height = 22;
      sumValRow.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
      sumValRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

      const STATUS_COLORS = {
        present : 'FF10b981',
        absent  : 'FFef4444',
        halfDay : 'FF3b82f6',
        leaves  : 'FF8b5cf6',
        pending : 'FFf97316',
      };

      [[2, STATUS_COLORS.present], [3, STATUS_COLORS.absent], [4, STATUS_COLORS.halfDay],
       [5, STATUS_COLORS.leaves], [6, STATUS_COLORS.leaves], [7, STATUS_COLORS.leaves],
       [8, STATUS_COLORS.pending], [9, STATUS_COLORS.pending], [10, STATUS_COLORS.pending],
       [11, STATUS_COLORS.pending]]
      .forEach(([col, color]) => {
        const cell = sumValRow.getCell(col);
        cell.font = { bold: true, color: { argb: color }, name: 'Arial', size: 10 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      sumValRow.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };

      sumValRow.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF94A3B8' } },
          left: { style: 'thin', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
          right: { style: 'thin', color: { argb: 'FF94A3B8' } }
        };
      });

      ws.addRow([]);

      // Details Headers (Row 7)
      const detailCols = ['Date', 'Day', 'Shift', 'Status', 'In Time', 'Out Time', 'Total Hours'];
      const detailHeaderRow = ws.addRow(detailCols);
      detailHeaderRow.height = 22;
      styleHeader(detailHeaderRow, 'FF1E40AF', 'FFFFFFFF');

      let empTotalHours = 0;
      const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));

      sortedLogs.forEach(log => {
        const sn = log.shift_id?.shift_name || emp.shift_id?.shift_name || '';
        const st = log.shift_id?.start_time || emp.shift_id?.start_time || '';
        const et = log.shift_id?.end_time || emp.shift_id?.end_time || '';
        const shiftStr = sn ? (st && et ? `${sn} ${st}–${et}` : sn) : '—';
        const fdt = v => v ? moment(v).format('h:mm A') : '';
        let wh = '';
        if (log.first_in && log.last_out) {
          const diff = moment(log.last_out).diff(moment(log.first_in), 'hours', true);
          if (diff > 0 && diff < 24) {
            wh = diff.toFixed(1) + ' hrs';
            empTotalHours += diff;
          }
        }

        const statusLabel = formatDisplayStatus(log.status);

        const dayRow = ws.addRow([
          moment(log.date).format('DD-MM-YYYY'),
          moment(log.date).format('ddd'),
          shiftStr,
          statusLabel,
          fdt(log.first_in),
          fdt(log.last_out),
          wh
        ]);
        dayRow.height = 20;

        [1, 2, 4, 5, 6, 7].forEach(c => {
          dayRow.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
        });
        dayRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

        dayRow.eachCell(cell => {
          cell.font = { name: 'Arial', size: 10 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });

        const sCell = dayRow.getCell(4);
        sCell.font = { bold: true, name: 'Arial', size: 10 };
        if (statusLabel === 'Present') sCell.font.color = { argb: 'FF10B981' };
        else if (statusLabel === 'Absent') sCell.font.color = { argb: 'FFEF4444' };
        else if (statusLabel === 'Half Day') sCell.font.color = { argb: 'FF3B82F6' };
        else if (statusLabel === 'Leave') sCell.font.color = { argb: 'FF8B5CF6' };
        else if (statusLabel === 'Weekly Off') sCell.font.color = { argb: 'FF64748B' };
        else if (statusLabel === 'Holiday') sCell.font.color = { argb: 'FFD97706' };
      });

      const totRow = ws.addRow([
        'Total Worked Hours',
        '', '', '', '', '',
        `${empTotalHours.toFixed(1)} hrs`
      ]);
      totRow.height = 22;
      totRow.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
      totRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      totRow.getCell(7).font = { bold: true, name: 'Arial', size: 10 };
      totRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

      totRow.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'thin', color: { argb: 'FF94A3B8' } }
        };
      });

      const buf = await wb.xlsx.writeBuffer();
      const filename = `Attendance_${empName.replace(/\s+/g, '_')}_${moment(startDate).format('MMM_YYYY')}.xlsx`;
      saveAs(new Blob([buf]), filename);
      toast.dismiss(lt);
      toast.success('Excel generated successfully!');
    } catch (err) {
      console.error(err);
      toast.dismiss(lt);
      toast.error('Failed to export report');
    }
  };

  // ── Column definitions ─────────────────────────────────
  const columns = [
    { key: 'name', label: 'Employee', sortable: true },
    { key: '_present', label: 'Present', sortable: true, center: true, cls: 'metric-green' },
    { key: '_absent', label: 'Absent', sortable: true, center: true, cls: 'metric-red' },
    { key: '_halfDay', label: 'Half Day', sortable: true, center: true, cls: 'metric-blue' },
    { key: '_halfDayLeaves', label: 'HD Leaves', sortable: true, center: true, cls: 'metric-amber' },
    { key: '_fullDayLeaves', label: 'FD Leaves', sortable: true, center: true, cls: 'metric-amber' },
    { key: '_leaves', label: 'Total Leaves', sortable: true, center: true, cls: 'metric-purple' },
    { key: '_openingBalance', label: 'Opening Bal', sortable: true, center: true },
    { key: '_plTaken', label: 'PL Taken', sortable: true, center: true, cls: 'metric-amber' },
    { key: '_lwpTaken', label: 'LWP Taken', sortable: true, center: true, cls: 'metric-red' },
    { key: '_availableBalance', label: 'Avail Bal', sortable: true, center: true, cls: 'metric-green' },
    { key: '_avgHours', label: 'Avg Hrs', sortable: true, center: true },
    { key: 'action', label: 'Action', sortable: false, center: true },
  ];

  // ── Grand totals ───────────────────────────────────────
  const grandTotals = useMemo(() => {
    const t = { _present: 0, _absent: 0, _halfDay: 0, _halfDayLeaves: 0, _fullDayLeaves: 0, _leaves: 0, _openingBalance: 0, _plTaken: 0, _lwpTaken: 0, _availableBalance: 0, _avgHours: 0 };
    processedData.forEach(e => { Object.keys(t).forEach(k => { t[k] += Number(e[k] || 0); }); });
    if (processedData.length > 0) t._avgHours = roundLeave(t._avgHours / processedData.length);
    return t;
  }, [processedData]);

  // ── Render ─────────────────────────────────────────────
  const activeMonth = quickMonths.find(m => m.start === startDate && m.end === endDate);

  return (
    <div className="atr">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="atr-header">
        <div className="atr-header-left">
          <h1>Attendance Reports</h1>
          <div className="atr-header-meta">
            <span className="atr-period-badge">
              <FiCalendar size={12} />
              {moment(startDate).format('DD MMM')} — {moment(endDate).format('DD MMM YYYY')}
            </span>
            {lastRefreshed && (
              <span className="atr-refresh-ts">
                Last refreshed: {moment(lastRefreshed).format('h:mm:ss A')}
              </span>
            )}
          </div>
        </div>
        <div className="atr-header-actions">
          {/* Year select dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', marginRight: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', marginRight: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
              <FiCalendar size={13} />
              Year
            </span>
            <select
              value={selectedYear}
              onChange={(e) => {
                const yr = parseInt(e.target.value, 10);
                setSelectedYear(yr);
                setStartDate(moment().year(yr).month(selectedMonth).startOf('month').format('YYYY-MM-DD'));
                setEndDate(moment().year(yr).month(selectedMonth).endOf('month').format('YYYY-MM-DD'));
              }}
              className="atr-btn"
              style={{
                padding: '0 12px',
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#0f172a',
                outline: 'none',
                cursor: 'pointer',
                height: '34px'
              }}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Month select dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', marginRight: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', marginRight: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
              <FiCalendar size={13} />
              Month
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                const mn = parseInt(e.target.value, 10);
                setSelectedMonth(mn);
                setStartDate(moment().year(selectedYear).month(mn).startOf('month').format('YYYY-MM-DD'));
                setEndDate(moment().year(selectedYear).month(mn).endOf('month').format('YYYY-MM-DD'));
              }}
              className="atr-btn"
              style={{
                padding: '0 12px',
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#0f172a',
                outline: 'none',
                cursor: 'pointer',
                height: '34px'
              }}
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <select
            value={excelGrouping}
            onChange={e => setExcelGrouping(e.target.value)}
            className="atr-btn"
            style={{
              padding: '0 12px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#0f172a',
              outline: 'none',
              cursor: 'pointer',
              height: '34px',
              marginRight: '8px'
            }}
          >
            <option value="organization">Organization-wise</option>
            <option value="team">Team-wise</option>
            <option value="single">Single Sheet</option>
          </select>
          <button className="atr-btn" onClick={fetchReport} disabled={loading}>
            <FiRefreshCw size={14} className={loading ? 'atr-spin' : ''} />
            Refresh
          </button>
          <button className="atr-btn atr-btn-export" onClick={handleExportExcel} disabled={loading || processedData.length === 0}>
            <FiDownload size={14} />
            Export to Excel
          </button>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────── */}
      <div className="atr-filter-bar">
        <div className="atr-filter-row">
          <div className="atr-filter-group">
            <label>From Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="atr-filter-group">
            <label>To Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="atr-filter-group">
            <label>Organization</label>
            <select value={orgFilter} onChange={e => { setOrgFilter(e.target.value); setCurrentPage(1); }}>
              <option value="all">All Organizations</option>
              {visibleOrganizations.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
            </select>
          </div>
          {isRabsDashboard ? (
            <div className="atr-filter-group">
              <label>Category</label>
              <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}>
                <option value="all">All Categories</option>
                {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ) : (
            <div className="atr-filter-group">
              <label>Team</label>
              <select value={teamFilter} onChange={e => { setTeamFilter(e.target.value); setCurrentPage(1); }}>
                <option value="all">All Teams</option>
                {visibleTeams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
          )}
          
          <div className="atr-filter-group">
            <label>Shift</label>
            <select value={shiftFilter} onChange={e => { setShiftFilter(e.target.value); setCurrentPage(1); }}>
              <option value="all">All Shifts</option>
              {shiftsList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="atr-filter-group">
            <label>Employment Type</label>
            <select value={empTypeFilter} onChange={e => { setEmpTypeFilter(e.target.value); setCurrentPage(1); }}>
              <option value="all">All Types</option>
              {empTypesList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
         
          <div className="atr-filter-group">
            <label>Attendance Status</label>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
              <option value="all">All Statuses</option>
              <option value="absent_heavy">3+ Absences</option>
              <option value="late_heavy">3+ Late Marks</option>
              <option value="perfect">Perfect Attendance</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>
          <div className="atr-filter-actions">
            <button className="atr-btn" onClick={() => {
              setOrgFilter('all');
              setTeamFilter('all');
              setCategoryFilter('all');
              setStatusFilter('all');
              setTableSearch('');
              setStartDate(currentMonthStart);
              setEndDate(currentMonthEnd);
              setShiftFilter('all');
              setEmpTypeFilter('all');
              setManagerFilter('all');
              setDeptFilter('all');
              setCurrentPage(1);
            }}>
              Reset
            </button>
          </div>
        </div>

      </div>

      {/* ── Loading ─────────────────────────────────────── */}
      {loading && <Skeleton />}

      {/* ── Error State ─────────────────────────────────── */}
      {!loading && error && (
        <div className="atr-table-wrap">
          <div className="atr-error">
            <FiAlertCircle size={40} color="#b53535" />
            <div className="atr-error-title">Failed to load report</div>
            <div className="atr-error-sub">{error}</div>
            <button className="atr-btn atr-btn-primary" style={{ marginTop: 10 }} onClick={fetchReport}>
              <FiRefreshCw size={14} /> Try Again
            </button>
          </div>
        </div>
      )}

      {/* ── Data Loaded ─────────────────────────────────── */}
      {!loading && !error && (
        <>
          {/* Summary Cards */}
          <div className="atr-cards">
            <div className="atr-card slate">
              <div className="atr-card-icon-wrap">
                <FiUsers size={20} />
              </div>
              <div className="atr-card-body">
                <div className="atr-card-val">{stats.total}</div>
                <div className="atr-card-lbl">Total Employees</div>
                <div className="atr-card-sub">in current filters</div>
              </div>
            </div>
            <div className="atr-card green">
              <div className="atr-card-icon-wrap">
                <FiCheckCircle size={20} />
              </div>
              <div className="atr-card-body">
                <div className="atr-card-val">{roundLeave(stats.present)}</div>
                <div className="atr-card-lbl">Total Present</div>
                <div className="atr-card-sub">incl. weekly off & holidays</div>
              </div>
            </div>
            <div className="atr-card red">
              <div className="atr-card-icon-wrap">
                <FiXCircle size={20} />
              </div>
              <div className="atr-card-body">
                <div className="atr-card-val">{roundLeave(stats.absent)}</div>
                <div className="atr-card-lbl">Total Absent</div>
                <div className="atr-card-sub">unexcused absences</div>
              </div>
            </div>
            <div className="atr-card purple">
              <div className="atr-card-icon-wrap">
                <FiCalendar size={20} />
              </div>
              <div className="atr-card-body">
                <div className="atr-card-val">{roundLeave(stats.leaves)}</div>
                <div className="atr-card-lbl">Total Leaves</div>
                <div className="atr-card-sub">all types combined</div>
              </div>
            </div>
            <div className="atr-card blue">
              <div className="atr-card-icon-wrap">
                <FiClock size={20} />
              </div>
              <div className="atr-card-body">
                <div className="atr-card-val">{roundLeave(stats.halfDay)}</div>
                <div className="atr-card-lbl">Half Days</div>
                <div className="atr-card-sub">partial attendance</div>
              </div>
            </div>
            <div className="atr-card green">
              <div className="atr-card-icon-wrap">
                <FiCalendar size={20} />
              </div>
              <div className="atr-card-body">
                <div className="atr-card-val">{roundLeave(stats.weeklyOff)}</div>
                <div className="atr-card-lbl">Weekly Off</div>
                <div className="atr-card-sub">rest days</div>
              </div>
            </div>
            <div className="atr-card purple">
              <div className="atr-card-icon-wrap">
                <FiCalendar size={20} />
              </div>
              <div className="atr-card-body">
                <div className="atr-card-val">{roundLeave(stats.holiday)}</div>
                <div className="atr-card-lbl">Holidays</div>
                <div className="atr-card-sub">company holidays</div>
              </div>
            </div>
            <div className="atr-card amber">
              <div className="atr-card-icon-wrap">
                <FiClock size={20} />
              </div>
              <div className="atr-card-body">
                <div className="atr-card-val">{roundLeave(stats.late)}</div>
                <div className="atr-card-lbl">Late Marks</div>
                <div className="atr-card-sub">tardiness count</div>
              </div>
            </div>
            <div className="atr-card slate">
              <div className="atr-card-icon-wrap">
                <FiClock size={20} />
              </div>
              <div className="atr-card-body">
                <div className="atr-card-val">{stats.avgHoursPerDay}h</div>
                <div className="atr-card-lbl">Avg Hours/Day</div>
                <div className="atr-card-sub">across all employees</div>
              </div>
            </div>
            <div className="atr-card green">
              <div className="atr-card-icon-wrap">
                <FiBarChart2 size={20} />
              </div>
              <div className="atr-card-body">
                <div className="atr-card-val">{isFinite(stats.avgAttendance) ? stats.avgAttendance : 0}%</div>
                <div className="atr-card-lbl">Avg Attendance</div>
                <div className="atr-card-sub">attendance rate</div>
              </div>
            </div>
          </div>

          {/* Empty state */}
          {processedData.length === 0 ? (
            <div className="atr-table-wrap">
              <div className="atr-empty">
                <FiFileText size={40} />
                <div className="atr-empty-title">No attendance data found</div>
                <div className="atr-empty-sub">Try adjusting your date range or filters</div>
              </div>
            </div>
          ) : (
            /* Summary Table */
            <div className="atr-table-wrap">
              <div className="atr-table-toolbar">
                <div className="atr-table-toolbar-left">
                  <span className="atr-table-title">Employee Summary</span>
                  <span className="atr-table-count"><FiUsers size={10} /> {processedData.length}</span>
                </div>
                <div className="atr-table-search">
                  <FiSearch size={14} />
                  <input
                    placeholder="Search name, code, org…"
                    value={tableSearch}
                    onChange={e => { setTableSearch(e.target.value); setCurrentPage(1); }}
                  />
                </div>
              </div>

              <div className="atr-table-scroll">
                <table className="atr-table">
                  <thead>
                    <tr>
                      <th style={{ width: 30 }}></th>
                      {columns.map(col => (
                        <th
                          key={col.key}
                          className={`${col.sortable ? 'sortable' : ''} ${sortKey === col.key ? 'sorted' : ''} ${col.center ? 'center' : ''}`}
                          onClick={() => col.sortable && handleSort(col.key)}
                        >
                          {col.label}
                          {col.sortable && (
                            <span className="sort-icon">
                              {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((emp, idx) => {
                      const isExpanded = expandedIds.has(emp.id);
                      const initials = (emp.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                      return (
                        <React.Fragment key={emp.id}>
                          <tr
                            className={`clickable ${idx % 2 === 0 ? '' : 'even'} ${isExpanded ? 'expanded-parent' : ''}`}
                            onClick={() => toggleExpand(emp.id)}
                          >
                            <td>
                              <FiChevronRight size={14} className={`atr-expand-icon ${isExpanded ? 'open' : ''}`} />
                            </td>
                            <td>
                              <div className="atr-emp-cell">
                                <div className="atr-emp-avatar">{initials}</div>
                                <div>
                                  <div className="atr-emp-name">{emp.name || emp.username}</div>
                                  {emp.employee_code && <div className="atr-emp-code">{emp.employee_code}</div>}
                                  <div className="atr-emp-org">{emp.company_name || '—'}</div>
                                </div>
                              </div>
                            </td>
                            {columns.slice(1).map(col => (
                              <td key={col.key} className={`${col.center ? 'center' : ''} ${col.cls || ''}`}>
                                {col.key === 'action' ? (
                                  <button
                                    className="atr-btn atr-btn-export-row"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportIndividualExcel(emp);
                                    }}
                                    title="Export to Excel"
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      borderRadius: '4px',
                                      background: '#1e40af',
                                      color: '#fff',
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <FiDownload size={11} />
                                    Export
                                  </button>
                                ) : col.key === '_avgHours' ? (
                                  `${roundLeave(emp[col.key])}h`
                                ) : (
                                  roundLeave(emp[col.key])
                                )}
                              </td>
                            ))}
                          </tr>
                          {isExpanded && (
                            <tr className="atr-detail-row">
                              <td colSpan={columns.length + 1}>
                                <div className="atr-detail-wrap">
                                  {/* Employee info bar */}
                                  <div className="atr-emp-info-bar">
                                    <div className="atr-emp-info-item">
                                      <span className="atr-emp-info-label">Name</span>
                                      <span className="atr-emp-info-value">{emp.name || emp.username}</span>
                                    </div>
                                    {emp.employee_code && (
                                      <div className="atr-emp-info-item">
                                        <span className="atr-emp-info-label">Employee ID</span>
                                        <span className="atr-emp-info-value">{emp.employee_code}</span>
                                      </div>
                                    )}
                                    <div className="atr-emp-info-item">
                                      <span className="atr-emp-info-label">Organization</span>
                                      <span className="atr-emp-info-value">{emp.company_name || '—'}</span>
                                    </div>
                                    <div className="atr-emp-info-item">
                                      <span className="atr-emp-info-label">Team</span>
                                      <span className="atr-emp-info-value">{getEmployeeTeamName(emp)}</span>
                                    </div>
                                    {emp.department && (
                                      <div className="atr-emp-info-item">
                                        <span className="atr-emp-info-label">Department</span>
                                        <span className="atr-emp-info-value">{emp.department}</span>
                                      </div>
                                    )}
                                    {emp.designation && (
                                      <div className="atr-emp-info-item">
                                        <span className="atr-emp-info-label">Designation</span>
                                        <span className="atr-emp-info-value">{emp.designation}</span>
                                      </div>
                                    )}
                                    {(emp.shift_id?.shift_name || emp.shift_name) && (
                                      <div className="atr-emp-info-item">
                                        <span className="atr-emp-info-label">Shift</span>
                                        <span className="atr-emp-info-value">{emp.shift_id?.shift_name || emp.shift_name}</span>
                                      </div>
                                    )}
                                  </div>
                                  {/* Daily logs */}
                                  <DailyLogTable
                                    history={emp.history}
                                    shiftName={emp.shift_id?.shift_name || emp.shift_name || ''}
                                  />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  {/* Grand totals footer */}
                  <tfoot>
                    <tr>
                      <td></td>
                      <td style={{ textAlign: 'left' }}>Total ({processedData.length} employees)</td>
                      {columns.slice(1).map(col => (
                        <td key={col.key} className="center">
                          {col.key === 'action' ? (
                            ''
                          ) : col.key === '_avgHours' ? (
                            `${roundLeave(grandTotals[col.key])}h`
                          ) : (
                            roundLeave(grandTotals[col.key])
                          )}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagination */}
              <div className="atr-pagination">
                <div className="atr-pagination-info">
                  Showing {Math.min((currentPage - 1) * pageSize + 1, processedData.length)}–{Math.min(currentPage * pageSize, processedData.length)} of {processedData.length}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="atr-page-size">
                    <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
                      <option value={25}>25 / page</option>
                      <option value={50}>50 / page</option>
                      <option value={100}>100 / page</option>
                      <option value={200}>200 / page</option>
                    </select>
                  </div>
                  <div className="atr-pagination-controls">
                    <button className="atr-page-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage(1)}>
                      <FiChevronLeft size={12} /><FiChevronLeft size={12} style={{ marginLeft: -8 }} />
                    </button>
                    <button className="atr-page-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                      <FiChevronLeft size={14} />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) page = i + 1;
                      else if (currentPage <= 3) page = i + 1;
                      else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                      else page = currentPage - 2 + i;
                      return (
                        <button
                          key={page}
                          className={`atr-page-btn ${currentPage === page ? 'active' : ''}`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button className="atr-page-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                      <FiChevronRight size={14} />
                    </button>
                    <button className="atr-page-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)}>
                      <FiChevronRight size={12} /><FiChevronRight size={12} style={{ marginLeft: -8 }} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AttendanceReports;
