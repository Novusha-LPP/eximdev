import React, { useState, useEffect, useMemo, useCallback, useContext, memo } from 'react';
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

const formatHoursMinutes = (val, fallback = '—') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '—' || trimmed === '-') return fallback;
    if (trimmed.includes('h') && trimmed.includes('m')) return trimmed;
    if (trimmed.endsWith('h') && !trimmed.includes('m')) {
      const parsedNum = parseFloat(trimmed);
      if (!isNaN(parsedNum)) {
        const totalMinutes = Math.round(parsedNum * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h}h ${m}m`;
      }
    }
    const num = parseFloat(trimmed);
    if (isNaN(num)) return trimmed;
    val = num;
  }
  const num = Number(val);
  if (isNaN(num)) return fallback;
  if (num === 0) return '0h 0m';
  if (num < 0) return fallback;
  const totalMinutes = Math.round(num * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
};

const isPrivilegeLeave = (t = '') => { const l = String(t || '').toLowerCase(); return l.includes('privilege') || l.includes('earned') || l === 'el' || l === 'pl'; };
const isLwpLeave = (t = '') => { const l = String(t || '').toLowerCase(); return l.includes('lwp') || l.includes('without pay') || l.includes('unpaid') || l === 'lop'; };
const isHalfDayLeave = (day) => {
  if (day?.is_half_day_leave || day?.isHalfDayLeave) return true;
  const s = String(day?.status || '').toLowerCase();
  const lt = String(day?.leaveType || day?.leave_type || day?.leaveReason || '').trim();
  let workHours = 0;
  if (day?.total_work_hours !== null && day?.total_work_hours !== undefined && Number(day.total_work_hours) > 0) {
    workHours = Number(day.total_work_hours);
  } else if (day?.first_in && day?.last_out) {
    workHours = moment(day.last_out).diff(moment(day.first_in), 'hours', true);
  }
  if (day?.is_half_day && (lt || s === 'leave' || workHours < 4)) return true;
  if (s === 'half_day' && (lt || workHours < 4)) return true;
  return false;
};

// Full days present (count of >= 8h or marked present/late, plus 0.5 for half days)
const getPresentDaysForReport = (emp) => {
  const actualHalfDays = getActualHalfDays(emp);
  if (!Array.isArray(emp.history) || emp.history.length === 0) {
    return roundLeave(Number(emp.present || 0) + (actualHalfDays * 0.5));
  }
  const fullPresent = emp.history.filter((d) => {
    const s = String(d?.status || '').toLowerCase();
    if (s === 'none' || s === '' || s === 'future') return false;
    if (s === 'weekly_off' || s === 'weekoff' || s === 'off' || s === 'holiday' || s === 'leave') return false;
    if (isHalfDayLeave(d)) return false;

    let workHours = 0;
    if (d?.total_work_hours !== null && d?.total_work_hours !== undefined && Number(d.total_work_hours) > 0) {
      workHours = Number(d.total_work_hours);
    } else if (d?.first_in && d?.last_out) {
      workHours = moment(d.last_out).diff(moment(d.first_in), 'hours', true);
    }

    if ((s === 'present' || s === 'late' || s === 'present_late' || s === 'on_duty') && !d?.is_half_day && s !== 'half_day') return true;
    if (s === 'half_day' || d?.is_half_day) return false;
    if (workHours >= 8) return true;
    if (workHours >= 4) return false; // Half day
    return false;
  }).length;
  const halfDayLeavesWorked = emp.history.filter((d) => {
    if (!isHalfDayLeave(d)) return false;
    const workHours = Number(d?.total_work_hours || 0);
    return workHours > 0 || Boolean(d?.first_in);
  }).length;
  return roundLeave(fullPresent + (actualHalfDays * 0.5) + (halfDayLeavesWorked * 0.5));
};

// Half day worked count (worked 4h-8h without taking leave from quota)
const getActualHalfDays = (emp) => {
  if (!Array.isArray(emp.history) || emp.history.length === 0) return Number(emp.halfDay || 0);
  return emp.history.filter((d) => {
    const s = String(d?.status || '').toLowerCase();
    if (s === 'none' || s === '' || s === 'future') return false;
    if (s === 'weekly_off' || s === 'weekoff' || s === 'off' || s === 'holiday' || s === 'leave') return false;
    if (isHalfDayLeave(d)) return false;

    if ((s === 'present' || s === 'late' || s === 'present_late' || s === 'on_duty') && !d?.is_half_day && s !== 'half_day') return false;
    if (s === 'half_day' || d?.is_half_day) return true;

    let workHours = 0;
    if (d?.total_work_hours !== null && d?.total_work_hours !== undefined && Number(d.total_work_hours) > 0) {
      workHours = Number(d.total_work_hours);
    } else if (d?.first_in && d?.last_out) {
      workHours = moment(d.last_out).diff(moment(d.first_in), 'hours', true);
    }

    if (workHours >= 8) return false;
    if (workHours >= 4) return true;
    return false;
  }).length;
};

const getHalfDayLeaveCount = (emp) => {
  if (!Array.isArray(emp.history) || emp.history.length === 0) return 0;
  return emp.history.filter((d) => isHalfDayLeave(d)).length;
};

const getFullDayLeaveCount = (emp) => {
  if (!Array.isArray(emp.history) || emp.history.length === 0) return Number(emp.leaves || 0);
  return emp.history.filter((d) => {
    const s = String(d?.status || '').toLowerCase();
    const isHalfLeave = isHalfDayLeave(d);
    return (s === 'leave' || s === 'pending_leave') && !isHalfLeave;
  }).length;
};

// Absent days (unauthorized/unexcused absence with <4h worked and NO approved leave + 0.5 per half day)
const getAbsentDaysForReport = (emp) => {
  const actualHalfDays = getActualHalfDays(emp);
  if (!Array.isArray(emp.history) || emp.history.length === 0) {
    return roundLeave(Number(emp.absent || 0) + (actualHalfDays * 0.5));
  }
  const fullAbsent = emp.history.filter((d) => {
    const s = String(d?.status || '').toLowerCase();
    const lt = String(d?.leaveType || d?.leave_type || d?.leaveReason || '').trim();
    const isHalfLeave = isHalfDayLeave(d);

    // If future date or status is 'none', it is NOT absent
    if (s === 'none' || s === '' || s === 'future') return false;
    if (d?.date && moment(d.date).isAfter(moment().endOf('day'))) return false;

    // If it is weekly off or holiday, it is not absent
    if (s === 'weekly_off' || s === 'weekoff' || s === 'off' || s === 'holiday') return false;

    // If it is an approved leave (PL, LWP, CL, SL, etc.), it is NOT absent
    if (s === 'leave' || s === 'pending_leave' || isHalfLeave || lt) return false;

    let workHours = 0;
    if (d?.total_work_hours !== null && d?.total_work_hours !== undefined && Number(d.total_work_hours) > 0) {
      workHours = Number(d.total_work_hours);
    } else if (d?.first_in && d?.last_out) {
      workHours = moment(d.last_out).diff(moment(d.first_in), 'hours', true);
    }

    if (workHours >= 4) return false;
    if (s === 'present' || s === 'late' || s === 'present_late' || s === 'half_day' || s === 'on_duty') return false;
    return s === 'absent' || (!s && workHours < 4);
  }).length;
  return roundLeave(fullAbsent + (actualHalfDays * 0.5));
};

const getWeekOffCount = (emp) => {
  if (!Array.isArray(emp.history) || emp.history.length === 0) return Number(emp.weekOff || 0);
  return emp.history.filter((d) => {
    const s = String(d?.status || '').toLowerCase();
    return s === 'weekly_off' || s === 'weekoff' || s === 'off';
  }).length;
};

const getHolidayCount = (emp) => {
  if (!Array.isArray(emp.history) || emp.history.length === 0) return Number(emp.holiday || 0);
  return emp.history.filter((d) => {
    const s = String(d?.status || '').toLowerCase();
    return s === 'holiday';
  }).length;
};

const getTotalWeekOffAndHoliday = (emp) => {
  return getWeekOffCount(emp) + getHolidayCount(emp);
};

const getTotalWorkingDays = (emp) => {
  const presentDays = getPresentDaysForReport(emp);
  const { plTaken } = calculateEmployeeLeaveBreakdown(emp);
  const holidayCount = getHolidayCount(emp);
  const weekOffCount = getWeekOffCount(emp);
  return roundLeave(presentDays + plTaken + holidayCount + weekOffCount);
};

// Complete leaves = sum of [Full Day Leaves] + (0.5 * [Half Day Leaves])
const getLeaveCountForReport = (emp) => {
  const halfDayLeaves = getHalfDayLeaveCount(emp);
  const fullDayLeaves = getFullDayLeaveCount(emp);
  return roundLeave(fullDayLeaves + (halfDayLeaves * 0.5));
};

// Calculate exact PL Taken, LWP Taken, Available Balance
const calculateEmployeeLeaveBreakdown = (emp) => {
  const openingBalance = roundLeave(Number(emp.opening_balance || 0));
  const completeLeaves = getLeaveCountForReport(emp);

  if (!Array.isArray(emp.history) || emp.history.length === 0) {
    const plTaken = roundLeave(Math.min(openingBalance, completeLeaves));
    const lwpTaken = roundLeave(Math.max(0, completeLeaves - openingBalance));
    const availableBalance = roundLeave(Math.max(0, openingBalance - plTaken));
    return { openingBalance, plTaken, lwpTaken, availableBalance };
  }

  let explicitLwp = 0;
  let explicitPl = 0;

  emp.history.forEach((d) => {
    const s = String(d?.status || '').toLowerCase();
    const lt = String(d?.leaveType || d?.leave_type || d?.leaveReason || '').trim();
    const isHalfLeave = isHalfDayLeave(d);

    if (s === 'weekly_off' || s === 'weekoff' || s === 'off' || s === 'holiday') return;

    if (isHalfLeave || (s === 'half_day' && lt)) {
      if (isLwpLeave(lt)) {
        explicitLwp += 0.5;
      } else {
        explicitPl += 0.5;
      }
    } else if (s === 'leave' || s === 'pending_leave') {
      if (isLwpLeave(lt)) {
        explicitLwp += 1.0;
      } else {
        explicitPl += 1.0;
      }
    }
  });

  const plTaken = roundLeave(Math.min(openingBalance, explicitPl));
  const lwpTaken = roundLeave(explicitLwp + Math.max(0, explicitPl - openingBalance));
  const availableBalance = roundLeave(Math.max(0, openingBalance - plTaken));

  return { openingBalance, plTaken, lwpTaken, availableBalance };
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

const formatLeaveStatusLabel = (log, workHours = 0) => {
  const statusLower = String(log?.status || '').toLowerCase();
  const leaveType = String(log?.leaveType || log?.leave_type || log?.leave?.leave_type || log?.leaveReason || '').trim();
  const lLower = leaveType.toLowerCase();

  let leaveCode = 'PL';
  if (isLwpLeave(leaveType)) leaveCode = 'LWP';
  else if (isPrivilegeLeave(leaveType)) leaveCode = 'PL';
  else if (lLower.includes('casual') || lLower === 'cl') leaveCode = 'CL';
  else if (lLower.includes('sick') || lLower === 'sl') leaveCode = 'SL';
  else if (lLower.includes('comp') || lLower === 'co') leaveCode = 'Comp Off';
  else if (leaveType) leaveCode = leaveType.toUpperCase();

  if (statusLower === 'weekly_off' || statusLower === 'weekoff' || statusLower === 'off') return 'Weekly Off';
  if (statusLower === 'holiday') return 'Holiday';
  const isHalfLeave = isHalfDayLeave(log);
  if ((statusLower === 'leave' || statusLower === 'pending_leave') && !isHalfLeave) {
    return leaveCode;
  }
  if (isHalfLeave) {
    return `Half Day (${leaveCode})`;
  }
  if ((statusLower === 'present' || statusLower === 'late' || statusLower === 'present_late' || statusLower === 'on_duty') && !log?.is_half_day && statusLower !== 'half_day') {
    return 'Present';
  }
  if (statusLower === 'half_day' || log?.is_half_day) {
    return 'Half Day';
  }
  if (workHours >= 8 || (workHours === 0 && !log?.first_in && (statusLower === 'present' || statusLower === 'late' || statusLower === 'present_late'))) return 'Present';
  if (workHours >= 4) {
    return 'Half Day';
  }
  if (statusLower === 'incomplete' || statusLower === 'missed_punch') return 'Missed Punch';
  return 'Absent';
};

const formatDisplayStatus = (status, workHours = 0) => {
  if (!status) return workHours >= 8 ? 'Present' : (workHours >= 4 ? 'Half Day' : 'Absent');
  const sl = String(status).toLowerCase();
  if (sl === 'weekly_off' || sl === 'weekoff' || sl === 'off') return 'Weekly Off';
  if (sl === 'holiday') return 'Holiday';
  if (sl === 'leave' || sl === 'pending_leave') return 'Leave';
  if (sl === 'incomplete' || sl === 'missed_punch') return 'Incomplete';
  if (workHours >= 8 || sl === 'present' || sl === 'late' || sl === 'present_late') return 'Present';
  if (workHours >= 4 || sl === 'half_day') return 'Half Day';
  return 'Absent';
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
  return history;
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
const enrichReportWithLeaveBalance = async (data, startDate, endDate) => {
  try {
    const ids = data.map(e => e.id || e._id).filter(Boolean);
    if (ids.length === 0) return data;
    const res = await attendanceAPI.getLeaveBalances(ids, startDate, endDate);
    const privOpenMap = new Map(), privAvailMap = new Map(), privUsedMap = new Map(), lwpUsedMap = new Map();
    if (res?.data) {
      res.data.forEach(b => {
        const eid = String(b.employee_id?._id || b.employee_id || '');
        const lt = String(b.leave_type || b.leave_policy_id?.leave_type || b.name || '').toLowerCase();
        if (lt.includes('privilege') || lt.includes('earned') || lt === 'el' || lt === 'pl' || lt.includes('casual') || lt.includes('paid') || lt === 'cl') {
          privOpenMap.set(eid, Number(b.opening_balance || 0));
          privAvailMap.set(eid, Number(b.closing_balance || 0));
          privUsedMap.set(eid, Number(b.used || 0));
        } else if (lt.includes('lwp') || lt.includes('without pay') || lt === 'lop' || lt.includes('unpaid')) {
          lwpUsedMap.set(eid, Number(b.used || 0));
        }
      });
    }
    return data.map(e => {
      const eid = String(e.id || e._id || '');
      const openBal = privOpenMap.has(eid) ? privOpenMap.get(eid) : Number(e.opening_balance || 0);
      const availBal = privAvailMap.has(eid) ? privAvailMap.get(eid) : Number(e.available_balance || 0);
      const privTaken = privUsedMap.has(eid) ? privUsedMap.get(eid) : Number(e.privilege_taken || 0);
      const lwpTaken = lwpUsedMap.has(eid) ? lwpUsedMap.get(eid) : Number(e.lwp_taken || 0);
      return {
        ...e,
        opening_balance: openBal,
        available_balance: availBal,
        privilege_taken: privTaken,
        lwp_taken: lwpTaken,
      };
    });
  } catch (err) {
    console.error('Leave balance enrichment failed:', err);
    return data;
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

// Calculate accurate worked hours and days with hours for an employee
const calculateEmployeeWorkStats = (emp) => {
  let totalHours = 0;
  let daysWithHours = 0;

  if (Array.isArray(emp?.history) && emp.history.length > 0) {
    emp.history.forEach(day => {
      let workHoursNum = 0;
      if (day?.total_work_hours !== null && day?.total_work_hours !== undefined && Number(day.total_work_hours) > 0) {
        workHoursNum = Number(day.total_work_hours);
      } else if (day?.first_in && day?.last_out) {
        const diff = moment(day.last_out).diff(moment(day.first_in), 'hours', true);
        if (diff > 0 && diff < 24) workHoursNum = diff;
      }
      if (workHoursNum > 0 && workHoursNum < 24) {
        totalHours += workHoursNum;
        const statusLower = String(day?.status || '').toLowerCase();
        const isHalf = statusLower === 'half_day' || isHalfDayLeave(day);
        daysWithHours += isHalf ? 0.5 : 1;
      }
    });
  } else if (emp?.raw_total_hours !== undefined && emp?.raw_total_present_days !== undefined && Number(emp?.raw_total_present_days) > 0) {
    totalHours = Number(emp.raw_total_hours || 0);
    daysWithHours = Number(emp.raw_total_present_days || 0);
  } else if (typeof emp?.avgHours === 'string' && emp.avgHours.includes('h')) {
    const match = emp.avgHours.match(/(\d+)\s*h(?:\s*(\d+)\s*m)?/);
    if (match) {
      const h = parseInt(match[1], 10) || 0;
      const m = parseInt(match[2], 10) || 0;
      const dec = h + (m / 60);
      const present = Number(emp.present || 0);
      totalHours = dec * present;
      daysWithHours = present;
    }
  }

  const avgHours = daysWithHours > 0 ? (totalHours / daysWithHours) : 0;
  return {
    totalWorkedHours: roundLeave(totalHours),
    daysWithHours,
    avgHours: roundLeave(avgHours),
  };
};

const DailyLogTable = memo(({ history, shiftName, openingBalance }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [useHoursMinutes, setUseHoursMinutes] = useState(true);
  const sorted = useMemo(() =>
    [...(history || [])].sort((a, b) => new Date(a.date || a.attendance_date) - new Date(b.date || b.attendance_date)),
    [history]
  );

  const { enrichedHistory, totalHours, daysWithHours } = useMemo(() => {
    let runningPl = Number(openingBalance || 0);
    let totHours = 0;
    let daysH = 0;

    const list = sorted.map((log) => {
      let workHours = null;
      let workHoursNum = 0;
      if (log?.total_work_hours !== null && log?.total_work_hours !== undefined && Number(log.total_work_hours) > 0) {
        workHoursNum = Number(log.total_work_hours);
      } else if (log?.first_in && log?.last_out) {
        const diff = moment(log.last_out).diff(moment(log.first_in), 'hours', true);
        if (diff > 0 && diff < 24) workHoursNum = diff;
      }
      if (workHoursNum > 0 && workHoursNum < 24) {
        workHours = workHoursNum;
        totHours += workHoursNum;
        const statusLower = String(log?.status || '').toLowerCase();
        const isHalf = statusLower === 'half_day' || isHalfDayLeave(log);
        daysH += isHalf ? 0.5 : 1;
      }

      const statusLower = String(log?.status || '').toLowerCase();
      const leaveType = String(log?.leaveType || log?.leave_type || log?.leave?.leave_type || log?.leaveReason || '').trim();
      const isHalfLeave = isHalfDayLeave(log);

      let allocatedStatus = null;

      if (statusLower === 'weekly_off' || statusLower === 'weekoff' || statusLower === 'off') {
        allocatedStatus = 'Weekly Off';
      } else if (statusLower === 'holiday') {
        allocatedStatus = 'Holiday';
      } else if (isHalfLeave) {
        if (isLwpLeave(leaveType)) {
          allocatedStatus = 'Half Day (LWP)';
        } else if (runningPl >= 0.5) {
          runningPl = roundLeave(runningPl - 0.5);
          allocatedStatus = 'Half Day (PL)';
        } else {
          allocatedStatus = 'Half Day (LWP)';
        }
      } else if (statusLower === 'leave' || statusLower === 'pending_leave') {
        if (isLwpLeave(leaveType)) {
          allocatedStatus = 'LWP';
        } else if (runningPl >= 1.0) {
          runningPl = roundLeave(runningPl - 1.0);
          allocatedStatus = 'PL';
        } else if (runningPl === 0.5) {
          runningPl = 0;
          allocatedStatus = 'PL (0.5) / LWP (0.5)';
        } else {
          allocatedStatus = 'LWP';
        }
      } else if ((statusLower === 'present' || statusLower === 'late' || statusLower === 'present_late' || statusLower === 'on_duty') && !log?.is_half_day && statusLower !== 'half_day') {
        allocatedStatus = 'Present';
      } else if (statusLower === 'half_day' || log?.is_half_day) {
        allocatedStatus = 'Half Day';
      } else if (workHoursNum >= 8 || (workHoursNum === 0 && !log?.first_in && (statusLower === 'present' || statusLower === 'late' || statusLower === 'present_late'))) {
        allocatedStatus = 'Present';
      } else if (workHoursNum >= 4) {
        allocatedStatus = 'Half Day';
      } else if (statusLower === 'incomplete' || statusLower === 'missed_punch') {
        allocatedStatus = 'Missed Punch';
      } else {
        allocatedStatus = 'Absent';
      }

      return {
        ...log,
        workHours,
        workHoursNum,
        statusLabel: allocatedStatus
      };
    });

    return { enrichedHistory: list, totalHours: totHours, daysWithHours: daysH };
  }, [sorted, openingBalance]);

  const renderStatusBadge = (log) => {
    const text = log.statusLabel || formatLeaveStatusLabel(log, log.workHoursNum || 0);
    const sCls = getStatusClass(text);
    const sl = String(text || '').toLowerCase();
    let icon = null;
    if (sl === 'present') {
      icon = <FiCheck size={12} style={{ marginRight: 6, strokeWidth: 3 }} />;
    } else if (sl === 'late' || sl === 'present_late') {
      icon = <FiClock size={12} style={{ marginRight: 6 }} />;
    } else if (sl === 'incomplete' || sl === 'missed_punch' || sl === 'missed punch') {
      icon = <FiInfo size={12} style={{ marginRight: 6 }} />;
    } else if (sl === 'weekly off' || sl === 'weekly_off' || sl === 'weekoff' || sl === 'off') {
      icon = <FiCalendar size={12} style={{ marginRight: 6 }} />;
    } else if (sl === 'absent') {
      icon = <FiXCircle size={12} style={{ marginRight: 6 }} />;
    } else if (sl === 'pl' || sl === 'lwp' || sl.startsWith('half day') || sl.includes('lwp') || sl === 'leave' || sl === 'pending_leave' || sl === 'holiday') {
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
    return formatHoursMinutes(val);
  };

  const getHoursMinutesText = (val) => {
    const num = Number(val || 0);
    const totalMinutes = Math.round(num * 60);
    const displayH = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const parts = [];
    if (displayH > 0) parts.push(`${displayH} hour${displayH === 1 ? '' : 's'}`);
    if (m > 0 || displayH === 0) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
    return parts.join(' ');
  };

  const getHoursMinutesCompact = (val) => {
    return formatHoursMinutes(val);
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
        {enrichedHistory.map((log, idx) => {
          const dt = moment(log.date || log.attendance_date);
          const sn = log.shift_id?.shift_name || shiftName || '';
          const st = log.shift_id?.start_time || '';
          const et = log.shift_id?.end_time || '';
          const shiftStr = sn ? (st && et ? `${sn} ${st}-${et}` : sn) : (st && et ? `${st}-${et}` : '—');
          const fdt = (v) => v ? moment(v).format('h:mm A') : '—';
          const wh = log.workHours !== null && log.workHours !== undefined ? log.workHours : null;
          return (
            <tr key={idx} className={idx % 2 === 1 ? 'log-even' : ''}>
              <td>{dt.format('DD-MM-YYYY')}</td>
              <td>{dt.format('ddd')}</td>
              <td style={{ textAlign: 'left', fontSize: 11 }}>{shiftStr}</td>
              <td>{renderStatusBadge(log)}</td>
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
                  {`${formatHoursMinutes(avgHours)}/day`}
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
    const maxYear = Math.max(currentYear + 1, 2037);
    const list = [];
    for (let y = 2024; y <= maxYear; y++) {
      list.push(y);
    }
    return list.reverse();
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
      const enriched = await enrichReportWithLeaveBalance(raw, startDate, endDate);
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
      const present = getPresentDaysForReport(emp);
      const absent = getAbsentDaysForReport(emp);
      const leaves = getLeaveCountForReport(emp);
      const halfDayLeaves = getHalfDayLeaveCount(emp);
      const fullDayLeaves = getFullDayLeaveCount(emp);
      const { openingBalance, plTaken, lwpTaken, availableBalance } = calculateEmployeeLeaveBreakdown(emp);
      const weekOff = getWeekOffCount(emp);
      const holiday = getHolidayCount(emp);
      const totalWeekOffAndHoliday = getTotalWeekOffAndHoliday(emp);
      const totalWorkingDays = getTotalWorkingDays(emp);
      const { totalWorkedHours, daysWithHours, avgHours } = calculateEmployeeWorkStats(emp);
      return {
        ...emp,
        _present: present,
        _absent: absent,
        _totalWeekOffAndHoliday: totalWeekOffAndHoliday,
        _totalWorkingDays: totalWorkingDays,
        _leaves: leaves,
        _halfDayLeaves: halfDayLeaves,
        _fullDayLeaves: fullDayLeaves,
        _openingBalance: openingBalance,
        _plTaken: plTaken,
        _lwpTaken: lwpTaken,
        _availableBalance: availableBalance,
        _weeklyOff: weekOff,
        _holiday: holiday,
        _late: counts.late,
        _totalWorkedHours: totalWorkedHours,
        _daysWithHours: daysWithHours,
        _avgHours: avgHours,
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
    const s = { total: processedData.length, present: 0, absent: 0, leaves: 0, halfDay: 0, weeklyOff: 0, holiday: 0, late: 0, totalHours: 0, totalDaysWithHours: 0 };
    let empsWithHours = 0;
    let sumEmpAvgHours = 0;
    processedData.forEach(e => {
      s.present += e._present;
      s.absent += e._absent;
      s.leaves += e._leaves;
      s.halfDay += e._halfDay;
      s.weeklyOff += e._weeklyOff;
      s.holiday += e._holiday;
      s.late += e._late;
      s.totalHours += Number(e._totalWorkedHours || 0);
      s.totalDaysWithHours += Number(e._daysWithHours || 0);
      if (e._avgHours > 0) {
        empsWithHours++;
        sumEmpAvgHours += e._avgHours;
      }
    });
    s.avgAttendance = s.total > 0 && (s.present + s.absent + s.leaves) > 0 ? roundLeave((s.present / (s.present + s.absent + s.leaves)) * 100) : 0;
    s.avgHoursPerDay = s.totalDaysWithHours > 0 ? roundLeave(s.totalHours / s.totalDaysWithHours) : (empsWithHours > 0 ? roundLeave(sumEmpAvgHours / empsWithHours) : 0);
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
          const rawCo = (e.company_name || '').trim();
          const co = (!rawCo || rawCo === '---' || rawCo === '—' || rawCo === '--' || rawCo === '-') ? 'Unassigned' : rawCo;
          if (!byGroup[co]) byGroup[co] = [];
          byGroup[co].push(e);
        });
      }

      // Helper: style a header row
      const styleHeader = (row, bgArgb, textArgb = 'FFFFFFFF') => {
        row.eachCell(cell => {
          cell.font = { bold: true, color: { argb: textArgb }, name: 'Segoe UI', size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
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

      // Executive palette
      const METRIC_STYLES = {
        present:     { bg: 'FFECFDF5', fg: 'FF047857', bd: 'FFA7F3D0' },
        absent:      { bg: 'FFFEF2F2', fg: 'FFB91C1C', bd: 'FFFECACA' },
        totWorking:  { bg: 'FFF0FDF4', fg: 'FF166534', bd: 'FFBBF7D0' },
        hdLeaves:    { bg: 'FFF5F3FF', fg: 'FF6D28D9', bd: 'FFDDD6FE' },
        fdLeaves:    { bg: 'FFEEF2FF', fg: 'FF4338CA', bd: 'FFC7D2FE' },
        compLeaves:  { bg: 'FFFAF5FF', fg: 'FF7E22CE', bd: 'FFE9D5FF' },
        weekOff:     { bg: 'FFF8FAFC', fg: 'FF475569', bd: 'FFE2E8F0' },
        holiday:     { bg: 'FFFEFCE8', fg: 'FFA16207', bd: 'FFFEF08A' },
        openBal:     { bg: 'FFFFFBEB', fg: 'FFB45309', bd: 'FFFDE68A' },
        plTaken:     { bg: 'FFFFF7ED', fg: 'FFC2410C', bd: 'FFFED7AA' },
        lwpTaken:    { bg: 'FFFEF2F2', fg: 'FF991B1B', bd: 'FFFECACA' },
        availBal:    { bg: 'FFF0FDF4', fg: 'FF15803D', bd: 'FFBBF7D0' },
        avgHours:    { bg: 'FFF1F5F9', fg: 'FF334155', bd: 'FFE2E8F0' },
      };

      Object.entries(byGroup).sort(([a], [b]) => a.localeCompare(b)).forEach(([groupName, employees]) => {
        const ws = wb.addWorksheet(groupName.substring(0, 31));
        ws.views = [{ showGridLines: true }];

        // Set column properties/widths
        ws.columns = [
          { key: 'col1', width: 28 }, // Employee/Date
          { key: 'col2', width: 20 }, // Total Working Days
          { key: 'col3', width: 13 }, // Present/Day
          { key: 'col4', width: 13 }, // Absent/Shift
          { key: 'col5', width: 18 }, // HalfDayLeaves / InTime
          { key: 'col6', width: 18 }, // FullDayLeaves / OutTime
          { key: 'col7', width: 18 }, // CompleteLeaves (Total PL Taken) / TotalHours
          { key: 'col8', width: 14 }, // LWP Taken
          { key: 'col9', width: 14 }, // Week Off
          { key: 'col10', width: 14 }, // Holiday
          { key: 'col11', width: 6 },  // Spacer 1
          { key: 'col12', width: 6 }, // Spacer 2
          { key: 'col13', width: 28 }, // OpeningBalance / Late In/Out
          { key: 'col14', width: 14 }, // PL Taken
          { key: 'col15', width: 18 }, // Available Balance
          { key: 'col16', width: 18 }  // Avg Hours/Day
        ];

        // ── 1. Master Title Block at Top of Sheet ───────────────────────
        const r1 = ws.addRow([`${groupName.toUpperCase()} — ATTENDANCE & LEAVE REGISTER`]);
        const r2 = ws.addRow([`Period: ${moment(startDate).format('DD MMM YYYY')} to ${moment(endDate).format('DD MMM YYYY')}   |   Generated on: ${moment().format('DD-MMM-YYYY HH:mm')}   |   Staff Count: ${employees.length}`]);
        
        ws.mergeCells(r1.number, 1, r1.number, 16);
        ws.mergeCells(r2.number, 1, r2.number, 16);

        r1.height = 30;
        r1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Midnight slate
        r1.getCell(1).font = { bold: true, color: white, name: 'Segoe UI', size: 13 };
        r1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

        r2.height = 22;
        r2.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Slate
        r2.getCell(1).font = { color: { argb: 'FFE2E8F0' }, name: 'Segoe UI', size: 9.5, italic: true };
        r2.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

        ws.addRow([]); // Blank spacer

        // ── 2. Master Summary Table (All Employees) ───────────────────
        const openBalHeader = `${moment(startDate).isValid() ? moment(startDate).format('MMMM') : moment().format('MMMM')} Opening Balance`;
        const COLS = ['Employee', 'Total Working Days', 'Present', 'Absent', 'Half Day PL', 'Full Day PL', 'Total PL Taken', 'LWP Taken', 'Week Off', 'Holiday', '', '', openBalHeader, 'PL Taken', 'Available Balance', 'Avg Hours/Day'];
        const sumHeaderRow = ws.addRow(COLS);
        sumHeaderRow.height = 26;
        styleHeader(sumHeaderRow, 'FF0F172A', 'FFFFFFFF');

        let grandPresent = 0, grandAbsent = 0, grandWeekOff = 0, grandHoliday = 0, grandTotalWorkingDays = 0;
        let grandHdLeaves = 0, grandFdLeaves = 0, grandCompLeaves = 0;
        let grandOpenBal = 0, grandPlTaken = 0, grandLwpTaken = 0, grandAvailBal = 0;
        let grandTotalHours = 0, grandPresentDays = 0;

        employees.forEach((emp, idx) => {
          const empName = emp.name || emp.username || '';
          const isOdd = idx % 2 === 1;
          const rowBg = isOdd ? 'FFF8FAFC' : 'FFFFFFFF';

          const openB = roundLeave(emp._openingBalance);
          const plT = roundLeave(emp._plTaken);
          const lwpT = roundLeave(emp._lwpTaken);
          const availB = roundLeave(emp._availableBalance);
          const workingDays = roundLeave(emp._totalWorkingDays);
          const weeklyOff = roundLeave(emp._weeklyOff);
          const holiday = roundLeave(emp._holiday);

          grandPresent += Number(emp._present || 0);
          grandAbsent += Number(emp._absent || 0);
          grandWeekOff += Number(weeklyOff || 0);
          grandHoliday += Number(holiday || 0);
          grandTotalWorkingDays += Number(workingDays || 0);
          grandHdLeaves += Number(emp._halfDayLeaves || 0);
          grandFdLeaves += Number(emp._fullDayLeaves || 0);
          grandCompLeaves += Number(emp._leaves || 0);
          grandOpenBal += openB;
          grandPlTaken += plT;
          grandLwpTaken += lwpT;
          grandAvailBal += availB;
          grandTotalHours += Number(emp._totalWorkedHours || emp.raw_total_hours || 0);
          grandPresentDays += Number(emp._daysWithHours || emp.raw_total_present_days || 0);

          const sumValRow = ws.addRow([
            empName,
            workingDays,
            emp._present,
            emp._absent,
            emp._halfDayLeaves,
            emp._fullDayLeaves,
            emp._leaves,
            lwpT,
            weeklyOff,
            holiday,
            '',
            '',
            openB,
            plT,
            availB,
            formatHoursMinutes(emp._avgHours)
          ]);
          sumValRow.height = 22;

          // Employee Name Cell
          const nameCell = sumValRow.getCell(1);
          nameCell.font = { bold: true, name: 'Segoe UI', size: 10, color: { argb: 'FF0F172A' } };
          nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          nameCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

          // Metric cells with soft tinted backgrounds & rich colored numbers
          const metricConfigs = [
            [2, METRIC_STYLES.totWorking],
            [3, METRIC_STYLES.present],
            [4, METRIC_STYLES.absent],
            [5, METRIC_STYLES.hdLeaves],
            [6, METRIC_STYLES.fdLeaves],
            [7, METRIC_STYLES.compLeaves],
            [8, METRIC_STYLES.lwpTaken],
            [9, METRIC_STYLES.weekOff],
            [10, METRIC_STYLES.holiday],
            [13, METRIC_STYLES.openBal],
            [14, METRIC_STYLES.plTaken],
            [15, METRIC_STYLES.availBal],
          ];

          metricConfigs.forEach(([col, style]) => {
            const cell = sumValRow.getCell(col);
            cell.font = { bold: true, color: { argb: style.fg }, name: 'Segoe UI', size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.bg } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          });

          // Avg hours cell
          const avgCell = sumValRow.getCell(16);
          avgCell.font = { name: 'Segoe UI', size: 10, color: { argb: METRIC_STYLES.avgHours.fg } };
          avgCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: METRIC_STYLES.avgHours.bg } };
          avgCell.alignment = { horizontal: 'center', vertical: 'middle' };
          avgCell.alignment = { horizontal: 'center', vertical: 'middle' };

          // Borders for all cells in the row
          sumValRow.eachCell(cell => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
          });
        });

        // ── 3. Blank Separator Rows ─────────────────────────────────────
        ws.addRow([]);
        ws.addRow([]);

        // ── 4. Detailed Daily Logs Section for Each Employee ────────────
        employees.forEach(emp => {
          const logs = emp.history || [];
          const empName = emp.name || emp.username || '';

          const empHeaderRow = ws.addRow([`DAILY LOGS: ${empName.toUpperCase()}`]);
          empHeaderRow.height = 26;
          ws.mergeCells(empHeaderRow.number, 1, empHeaderRow.number, 8);
          const empCell = empHeaderRow.getCell(1);
          empCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Deep Indigo
          empCell.font = { bold: true, color: white, name: 'Segoe UI', size: 11 };
          empCell.alignment = { horizontal: 'center', vertical: 'middle' };

          const detailCols = ['Date', 'Day', 'Shift', 'Status', 'In Time', 'Out Time', 'Total Hours', 'Late In / Early Out'];
          const detailHeaderRow = ws.addRow(detailCols);
          detailHeaderRow.height = 22;
          styleHeader(detailHeaderRow, 'FF334155', 'FFFFFFFF'); // Slate Header

          let empTotalHours = 0;
          let runningPl = Number(emp._openingBalance ?? emp.opening_balance ?? 0);
          const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));

          sortedLogs.forEach((log, logIdx) => {
            const sn = log.shift_id?.shift_name || emp.shift_id?.shift_name || '';
            const st = log.shift_id?.start_time || emp.shift_id?.start_time || '';
            const et = log.shift_id?.end_time || emp.shift_id?.end_time || '';
            const shiftStr = sn ? (st && et ? `${sn} ${st}–${et}` : sn) : '—';
            const fdt = v => v ? moment(v).format('h:mm A') : '';
            let wh = '';
            let workHoursNum = 0;
            const computedDiff = (log.first_in && log.last_out) ? moment(log.last_out).diff(moment(log.first_in), 'hours', true) : 0;
            if (log.total_work_hours !== null && log.total_work_hours !== undefined && Number(log.total_work_hours) > 0) {
              workHoursNum = Number(log.total_work_hours);
            } else if (computedDiff > 0 && computedDiff < 24) {
              workHoursNum = computedDiff;
            }
            if (workHoursNum > 0 && workHoursNum < 24) {
              wh = formatHoursMinutes(workHoursNum);
              empTotalHours += workHoursNum;
            }

            const dt = moment(log.date);
            const statusLower = String(log?.status || '').toLowerCase();
            const leaveType = String(log?.leaveType || log?.leave_type || log?.leave?.leave_type || log?.leaveReason || '').trim();
            const isHalfLeave = isHalfDayLeave(log);

            let statusLabel = null;
            if (statusLower === 'weekly_off' || statusLower === 'weekoff' || statusLower === 'off') {
              statusLabel = 'Weekly Off';
            } else if (statusLower === 'holiday') {
              statusLabel = 'Holiday';
            } else if (isHalfLeave) {
              if (isLwpLeave(leaveType)) {
                statusLabel = 'Half Day (LWP)';
              } else if (runningPl >= 0.5) {
                runningPl = roundLeave(runningPl - 0.5);
                statusLabel = 'Half Day (PL)';
              } else {
                statusLabel = 'Half Day (LWP)';
              }
            } else if (statusLower === 'leave' || statusLower === 'pending_leave') {
              if (isLwpLeave(leaveType)) {
                statusLabel = 'LWP';
              } else if (runningPl >= 1.0) {
                runningPl = roundLeave(runningPl - 1.0);
                statusLabel = 'PL';
              } else if (runningPl === 0.5) {
                runningPl = 0;
                statusLabel = 'PL (0.5) / LWP (0.5)';
              } else {
                statusLabel = 'LWP';
              }
            } else if ((statusLower === 'present' || statusLower === 'late' || statusLower === 'present_late' || statusLower === 'on_duty') && !log?.is_half_day && statusLower !== 'half_day') {
              statusLabel = 'Present';
            } else if (statusLower === 'half_day' || log?.is_half_day) {
              statusLabel = 'Half Day';
            } else if (workHoursNum >= 8 || (workHoursNum === 0 && !log?.first_in && (statusLower === 'present' || statusLower === 'late' || statusLower === 'present_late'))) {
              statusLabel = 'Present';
            } else if (workHoursNum >= 4) {
              statusLabel = 'Half Day';
            } else if (statusLower === 'incomplete' || statusLower === 'missed_punch') {
              statusLabel = 'Missed Punch';
            } else {
              statusLabel = 'Absent';
            }

            let timingRemarks = '—';
            const lateText = (log.is_late || (log.late_by_minutes > 0)) ? `Late In (${log.late_by_minutes || 0}m)` : '';
            const earlyText = (log.is_early_exit || (log.early_exit_minutes > 0)) ? `Early Out (${log.early_exit_minutes || 0}m)` : '';
            if (lateText && earlyText) {
              timingRemarks = `${lateText}, ${earlyText}`;
            } else if (lateText) {
              timingRemarks = lateText;
            } else if (earlyText) {
              timingRemarks = earlyText;
            } else if (log.first_in || log.last_out || workHoursNum > 0) {
              timingRemarks = 'On Time';
            }

            const isLogOdd = logIdx % 2 === 1;
            const logRowBg = isLogOdd ? 'FFF8FAFC' : 'FFFFFFFF';

            const dayRow = ws.addRow([
              dt.format('DD-MM-YYYY'),
              dt.format('ddd'),
              shiftStr,
              statusLabel,
              fdt(log.first_in),
              fdt(log.last_out),
              wh,
              timingRemarks
            ]);
            dayRow.height = 20;

            [1, 2, 4, 5, 6, 7, 8].forEach(c => {
              dayRow.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
            });
            dayRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

            dayRow.eachCell(cell => {
              cell.font = { name: 'Segoe UI', size: 10 };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: logRowBg } };
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
              };
            });

            // Color code status label
            const sCell = dayRow.getCell(4);
            sCell.font = { bold: true, name: 'Segoe UI', size: 10 };
            if (statusLabel === 'Present') {
              sCell.font.color = { argb: 'FF047857' };
              sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
            } else if (statusLabel === 'Absent') {
              sCell.font.color = { argb: 'FFB91C1C' };
              sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
            } else if (statusLabel === 'PL' || statusLabel === 'Leave') {
              sCell.font.color = { argb: 'FF7E22CE' };
              sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF5FF' } };
            } else if (statusLabel === 'LWP') {
              sCell.font.color = { argb: 'FFC2410C' };
              sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
            } else if (statusLabel.startsWith('Half Day')) {
              sCell.font.color = { argb: 'FF1D4ED8' };
              sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
            } else if (statusLabel === 'Weekly Off') {
              sCell.font.color = { argb: 'FF64748B' };
            } else if (statusLabel === 'Holiday') {
              sCell.font.color = { argb: 'FFD97706' };
              sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
            }

            // Color code Late In / Early Out
            const tCell = dayRow.getCell(8);
            tCell.font = { name: 'Segoe UI', size: 10, bold: timingRemarks !== '—' && timingRemarks !== 'On Time' };
            if (lateText || earlyText) tCell.font.color = { argb: 'FFD97706' };
            else if (timingRemarks === 'On Time') tCell.font.color = { argb: 'FF059669' };
          });

          // Total worked hours row
          const totEmpRow = ws.addRow([
            'Total Worked Hours',
            '', '', '', '', '',
            formatHoursMinutes(empTotalHours),
            ''
          ]);
          totEmpRow.height = 22;
          ws.mergeCells(`A${totEmpRow.number}:F${totEmpRow.number}`);
          for (let c = 1; c <= 8; c++) {
            const cell = totEmpRow.getCell(c);
            cell.font = { bold: true, name: 'Segoe UI', size: 10, color: { argb: 'FF0F172A' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF94A3B8' } },
              bottom: { style: 'thin', color: { argb: 'FF94A3B8' } }
            };
            if (c === 1) cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
            else if (c === 7) cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }

          // Blank separator row before next employee
          ws.addRow([]);
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const fileName = `AttendanceReport_${startDate}_to_${endDate}.xlsx`;
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
      ws.views = [{ showGridLines: true }];

      // Style helper
      const styleHeader = (row, bgArgb, textArgb = 'FFFFFFFF') => {
        row.eachCell(cell => {
          cell.font  = { bold: true, color: { argb: textArgb }, name: 'Segoe UI', size: 10 };
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

      const r1 = ws.addRow([`${empName.toUpperCase()} — ATTENDANCE & LEAVE REPORT`]);
      const r2 = ws.addRow([`Period: ${moment(startDate).format('DD MMM YYYY')} to ${moment(endDate).format('DD MMM YYYY')}   |   Generated on: ${moment().format('DD-MMM-YYYY HH:mm')}`]);

      ws.mergeCells(r1.number, 1, r1.number, 16);
      ws.mergeCells(r2.number, 1, r2.number, 16);

      r1.height = 28;
      r1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      r1.getCell(1).font = { bold: true, color: white, name: 'Segoe UI', size: 12 };
      r1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      r2.height = 20;
      r2.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      r2.getCell(1).font = { color: { argb: 'FFE2E8F0' }, name: 'Segoe UI', size: 9.5, italic: true };
      r2.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      ws.addRow([]); // Spacer

      // Summary Headers (Row 4)
      const openBalHeader = `${moment(startDate).isValid() ? moment(startDate).format('MMMM') : moment().format('MMMM')} Opening Balance`;
      const COLS = ['Employee', 'Total Working Days', 'Present', 'Absent', 'Half Day PL', 'Full Day PL', 'Total PL Taken', 'LWP Taken', 'Week Off', 'Holiday', '', '', openBalHeader, 'PL Taken', 'Available Balance', 'Avg Hours/Day'];
      
      ws.columns = [
        { key: 'col1', width: 28 },
        { key: 'col2', width: 20 },
        { key: 'col3', width: 13 },
        { key: 'col4', width: 13 },
        { key: 'col5', width: 18 },
        { key: 'col6', width: 18 },
        { key: 'col7', width: 18 },
        { key: 'col8', width: 14 },
        { key: 'col9', width: 14 },
        { key: 'col10', width: 14 },
        { key: 'col11', width: 6 },
        { key: 'col12', width: 6 },
        { key: 'col13', width: 28 },
        { key: 'col14', width: 14 },
        { key: 'col15', width: 18 },
        { key: 'col16', width: 18 }
      ];

      const sumHeaderRow = ws.addRow(COLS);
      sumHeaderRow.height = 26;
      styleHeader(sumHeaderRow, 'FF0F172A', 'FFFFFFFF');

      // Summary Values (Row 5)
      const sumValRow = ws.addRow([
        empName,
        roundLeave(emp._totalWorkingDays),
        emp._present,
        emp._absent,
        emp._halfDayLeaves,
        emp._fullDayLeaves,
        emp._leaves,
        roundLeave(emp._lwpTaken),
        roundLeave(emp._weeklyOff),
        roundLeave(emp._holiday),
        '',
        '',
        roundLeave(emp._openingBalance),
        roundLeave(emp._plTaken),
        roundLeave(emp._availableBalance),
        formatHoursMinutes(emp._avgHours)
      ]);
      sumValRow.height = 22;
      sumValRow.getCell(1).font = { bold: true, name: 'Segoe UI', size: 10 };
      sumValRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      const METRIC_STYLES = {
        present:     { bg: 'FFECFDF5', fg: 'FF047857' },
        absent:      { bg: 'FFFEF2F2', fg: 'FFB91C1C' },
        totWorking:  { bg: 'FFF0FDF4', fg: 'FF166534' },
        hdLeaves:    { bg: 'FFF5F3FF', fg: 'FF6D28D9' },
        fdLeaves:    { bg: 'FFEEF2FF', fg: 'FF4338CA' },
        compLeaves:  { bg: 'FFFAF5FF', fg: 'FF7E22CE' },
        weekOff:     { bg: 'FFF8FAFC', fg: 'FF475569' },
        holiday:     { bg: 'FFFEFCE8', fg: 'FFA16207' },
        openBal:     { bg: 'FFFFFBEB', fg: 'FFB45309' },
        plTaken:     { bg: 'FFFFF7ED', fg: 'FFC2410C' },
        lwpTaken:    { bg: 'FFFEF2F2', fg: 'FF991B1B' },
        availBal:    { bg: 'FFF0FDF4', fg: 'FF15803D' },
        avgHours:    { bg: 'FFF1F5F9', fg: 'FF334155' },
      };

      [[2, METRIC_STYLES.totWorking], [3, METRIC_STYLES.present], [4, METRIC_STYLES.absent],
       [5, METRIC_STYLES.hdLeaves], [6, METRIC_STYLES.fdLeaves], [7, METRIC_STYLES.compLeaves],
       [8, METRIC_STYLES.lwpTaken],
       [9, METRIC_STYLES.weekOff], [10, METRIC_STYLES.holiday],
       [13, METRIC_STYLES.openBal], [14, METRIC_STYLES.plTaken],
       [15, METRIC_STYLES.availBal]]
      .forEach(([col, style]) => {
        const cell = sumValRow.getCell(col);
        cell.font = { bold: true, color: { argb: style.fg }, name: 'Segoe UI', size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.bg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      sumValRow.getCell(16).alignment = { horizontal: 'center', vertical: 'middle' };
      sumValRow.getCell(16).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: METRIC_STYLES.avgHours.bg } };

      sumValRow.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });

      ws.addRow([]); // Spacer
      ws.addRow([]);

      // Details Headers (Row 7)
      const detailCols = ['Date', 'Day', 'Shift', 'Status', 'In Time', 'Out Time', 'Total Hours', 'Late In / Early Out'];
      const detailHeaderRow = ws.addRow(detailCols);
      detailHeaderRow.height = 22;
      styleHeader(detailHeaderRow, 'FF334155', 'FFFFFFFF');

      let empTotalHours = 0;
      let runningPl = Number(emp._openingBalance ?? emp.opening_balance ?? 0);
      const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));

      sortedLogs.forEach((log, logIdx) => {
        const sn = log.shift_id?.shift_name || emp.shift_id?.shift_name || '';
        const st = log.shift_id?.start_time || emp.shift_id?.start_time || '';
        const et = log.shift_id?.end_time || emp.shift_id?.end_time || '';
        const shiftStr = sn ? (st && et ? `${sn} ${st}–${et}` : sn) : '—';
        const fdt = v => v ? moment(v).format('h:mm A') : '';
        let wh = '';
        let workHoursNum = 0;
        const computedDiff = (log.first_in && log.last_out) ? moment(log.last_out).diff(moment(log.first_in), 'hours', true) : 0;
        if (log.total_work_hours !== null && log.total_work_hours !== undefined && Number(log.total_work_hours) > 0) {
          workHoursNum = Number(log.total_work_hours);
        } else if (computedDiff > 0 && computedDiff < 24) {
          workHoursNum = computedDiff;
        }
        if (workHoursNum > 0 && workHoursNum < 24) {
          wh = formatHoursMinutes(workHoursNum);
          empTotalHours += workHoursNum;
        }

        const statusLower = String(log?.status || '').toLowerCase();
        const leaveType = String(log?.leaveType || log?.leave_type || log?.leave?.leave_type || log?.leaveReason || '').trim();
        const isHalfLeave = isHalfDayLeave(log);

        let statusLabel = null;
        if (statusLower === 'weekly_off' || statusLower === 'weekoff' || statusLower === 'off') {
          statusLabel = 'Weekly Off';
        } else if (statusLower === 'holiday') {
          statusLabel = 'Holiday';
        } else if (isHalfLeave) {
          if (isLwpLeave(leaveType)) {
            statusLabel = 'Half Day (LWP)';
          } else if (runningPl >= 0.5) {
            runningPl = roundLeave(runningPl - 0.5);
            statusLabel = 'Half Day (PL)';
          } else {
            statusLabel = 'Half Day (LWP)';
          }
        } else if (statusLower === 'leave' || statusLower === 'pending_leave') {
          if (isLwpLeave(leaveType)) {
            statusLabel = 'LWP';
          } else if (runningPl >= 1.0) {
            runningPl = roundLeave(runningPl - 1.0);
            statusLabel = 'PL';
          } else if (runningPl === 0.5) {
            runningPl = 0;
            statusLabel = 'PL (0.5) / LWP (0.5)';
          } else {
            statusLabel = 'LWP';
          }
        } else if ((statusLower === 'present' || statusLower === 'late' || statusLower === 'present_late' || statusLower === 'on_duty') && !log?.is_half_day && statusLower !== 'half_day') {
          statusLabel = 'Present';
        } else if (statusLower === 'half_day' || log?.is_half_day) {
          statusLabel = 'Half Day';
        } else if (workHoursNum >= 8 || (workHoursNum === 0 && !log?.first_in && (statusLower === 'present' || statusLower === 'late' || statusLower === 'present_late'))) {
          statusLabel = 'Present';
        } else if (workHoursNum >= 4) {
          statusLabel = 'Half Day';
        } else if (statusLower === 'incomplete' || statusLower === 'missed_punch') {
          statusLabel = 'Missed Punch';
        } else {
          statusLabel = 'Absent';
        }

        let timingRemarks = '—';
        const lateText = (log.is_late || (log.late_by_minutes > 0)) ? `Late In (${log.late_by_minutes || 0}m)` : '';
        const earlyText = (log.is_early_exit || (log.early_exit_minutes > 0)) ? `Early Out (${log.early_exit_minutes || 0}m)` : '';
        if (lateText && earlyText) {
          timingRemarks = `${lateText}, ${earlyText}`;
        } else if (lateText) {
          timingRemarks = lateText;
        } else if (earlyText) {
          timingRemarks = earlyText;
        } else if (log.first_in || log.last_out || workHoursNum > 0) {
          timingRemarks = 'On Time';
        }

        const isLogOdd = logIdx % 2 === 1;
        const logRowBg = isLogOdd ? 'FFF8FAFC' : 'FFFFFFFF';

        const dayRow = ws.addRow([
          moment(log.date).format('DD-MM-YYYY'),
          moment(log.date).format('ddd'),
          shiftStr,
          statusLabel,
          fdt(log.first_in),
          fdt(log.last_out),
          wh,
          timingRemarks
        ]);
        dayRow.height = 20;

        [1, 2, 4, 5, 6, 7, 8].forEach(c => {
          dayRow.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
        });
        dayRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

        dayRow.eachCell(cell => {
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: logRowBg } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });

        // Color code status label
        const sCell = dayRow.getCell(4);
        sCell.font = { bold: true, name: 'Segoe UI', size: 10 };
        if (statusLabel === 'Present') {
          sCell.font.color = { argb: 'FF047857' };
          sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
        } else if (statusLabel === 'Absent') {
          sCell.font.color = { argb: 'FFB91C1C' };
          sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
        } else if (statusLabel === 'PL' || statusLabel === 'Leave') {
          sCell.font.color = { argb: 'FF7E22CE' };
          sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF5FF' } };
        } else if (statusLabel === 'LWP') {
          sCell.font.color = { argb: 'FFC2410C' };
          sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
        } else if (statusLabel.startsWith('Half Day')) {
          sCell.font.color = { argb: 'FF1D4ED8' };
          sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
        } else if (statusLabel === 'Weekly Off') {
          sCell.font.color = { argb: 'FF64748B' };
        } else if (statusLabel === 'Holiday') {
          sCell.font.color = { argb: 'FFD97706' };
          sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
        }

        // Color code Late In / Early Out
        const tCell = dayRow.getCell(8);
        tCell.font = { name: 'Segoe UI', size: 10, bold: timingRemarks !== '—' && timingRemarks !== 'On Time' };
        if (lateText || earlyText) tCell.font.color = { argb: 'FFD97706' };
        else if (timingRemarks === 'On Time') tCell.font.color = { argb: 'FF059669' };
      });

      const totRow = ws.addRow([
        'Total Worked Hours',
        '', '', '', '', '',
        formatHoursMinutes(empTotalHours),
        ''
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
  const currentMonthName = moment(startDate).isValid() ? moment(startDate).format('MMMM') : moment().format('MMMM');

  const columns = [
    { key: 'name', label: 'Employee', sortable: true },
    { key: '_totalWorkingDays', label: 'Total Working Days', sortable: true, center: true, cls: 'atr-pill-total-work' },
    { key: '_present', label: 'Present', sortable: true, center: true, cls: 'atr-pill-present' },
    { key: '_absent', label: 'Absent', sortable: true, center: true, cls: 'atr-pill-absent' },
    { key: '_halfDayLeaves', label: 'Half Day PL', sortable: true, center: true, cls: 'atr-pill-hdleaves' },
    { key: '_fullDayLeaves', label: 'Full Day PL', sortable: true, center: true, cls: 'atr-pill-fdleaves' },
    { key: '_leaves', label: 'Total PL Taken', sortable: true, center: true, cls: 'atr-pill-complete' },
    { key: '_lwpTaken', label: 'LWP Taken', sortable: true, center: true, cls: 'atr-pill-lwptaken' },
    { key: '_weeklyOff', label: 'Week Off', sortable: true, center: true, cls: 'atr-pill-weekoff' },
    { key: '_holiday', label: 'Holiday', sortable: true, center: true, cls: 'atr-pill-holiday' },
    { key: '_spacer1', label: '', sortable: false, center: true, isSpacer: true },
    { key: '_spacer2', label: '', sortable: false, center: true, isSpacer: true },
    { key: '_openingBalance', label: `${currentMonthName} Opening Balance`, sortable: true, center: true, cls: 'atr-pill-opening' },
    { key: '_plTaken', label: 'PL Taken', sortable: true, center: true, cls: 'atr-pill-pltaken' },
    { key: '_availableBalance', label: 'Available Balance', sortable: true, center: true, cls: 'atr-pill-avail' },
    { key: '_avgHours', label: 'Avg Hours/Day', sortable: true, center: true, cls: 'atr-pill-hours' },
    { key: 'action', label: 'Action', sortable: false, center: true },
  ];

  // ── Grand totals ───────────────────────────────────────
  const grandTotals = useMemo(() => {
    const t = { _totalWorkingDays: 0, _present: 0, _absent: 0, _halfDayLeaves: 0, _fullDayLeaves: 0, _leaves: 0, _lwpTaken: 0, _weeklyOff: 0, _holiday: 0, _openingBalance: 0, _plTaken: 0, _availableBalance: 0, _avgHours: 0 };
    let totH = 0;
    let totD = 0;
    let empsWithH = 0;
    let sumAvgH = 0;
    processedData.forEach(e => {
      Object.keys(t).forEach(k => {
        if (k !== '_avgHours') {
          t[k] += Number(e[k] || 0);
        }
      });
      totH += Number(e._totalWorkedHours || 0);
      totD += Number(e._daysWithHours || 0);
      if (e._avgHours > 0) {
        empsWithH++;
        sumAvgH += e._avgHours;
      }
    });
    t._avgHours = totD > 0 ? roundLeave(totH / totD) : (empsWithH > 0 ? roundLeave(sumAvgH / empsWithH) : 0);
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
                <div className="atr-card-val">{formatHoursMinutes(stats.avgHoursPerDay)}</div>
                <div className="atr-card-lbl">Avg Hours/Day</div>
                <div className="atr-card-sub">{formatHoursMinutes(stats.totalHours)} total worked</div>
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
                          className={`${col.sortable ? 'sortable' : ''} ${sortKey === col.key ? 'sorted' : ''} ${col.center ? 'center' : ''} ${col.isSpacer ? 'atr-col-spacer' : ''}`}
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
                              <td key={col.key} className={`${col.center ? 'center' : ''} ${col.isSpacer ? 'atr-col-spacer' : ''}`}>
                                {col.isSpacer ? (
                                  null
                                ) : col.key === 'action' ? (
                                  <button
                                    className="atr-btn atr-btn-export-row"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportIndividualExcel(emp);
                                    }}
                                    title="Export to Excel"
                                  >
                                    <FiDownload size={12} />
                                    Export
                                  </button>
                                ) : col.key === '_avgHours' ? (
                                  <span className="atr-cell-pill atr-pill-hours" title={`Total Worked: ${formatHoursMinutes(emp._totalWorkedHours)} across ${emp._daysWithHours || 0} days`}>
                                    {formatHoursMinutes(emp[col.key])}
                                  </span>
                                ) : (
                                  <span className={`atr-cell-pill ${col.cls || ''}`}>
                                    {roundLeave(emp[col.key])}
                                  </span>
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
                                    openingBalance={emp.opening_balance || 0}
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
                    <tr className="atr-totals-row">
                      <td></td>
                      <td style={{ textAlign: 'left', fontWeight: 800 }}>Total ({processedData.length} employees)</td>
                      {columns.slice(1).map(col => (
                        <td key={col.key} className={`center ${col.isSpacer ? 'atr-col-spacer' : ''}`}>
                          {col.isSpacer || col.key === 'action' ? (
                            ''
                          ) : col.key === '_avgHours' ? (
                            <span className="atr-cell-pill atr-pill-hours total-pill" title={`Total Worked: ${formatHoursMinutes(stats.totalHours)}`}>
                              {formatHoursMinutes(grandTotals[col.key])}
                            </span>
                          ) : (
                            <span className={`atr-cell-pill ${col.cls || ''} total-pill`}>
                              {roundLeave(grandTotals[col.key])}
                            </span>
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
